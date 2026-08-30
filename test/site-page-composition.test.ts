import { describe, expect, it, vi } from "vitest";
import type {
  PublicMediaProjection,
  PublicPageProjection,
} from "../server/core/contracts";
import { CoreClientError } from "../server/core/errors";
import {
  composeSitePage,
  PublicApplicationContentError,
} from "../server/public-page/application-content";
import { publicPageHttpFailure } from "../server/public-page/route";

const image = {
  assetId: "asset:hero",
  kind: "image",
  original: {
    mimeType: "image/webp",
    format: "webp",
    byteSize: 1234,
    publicUrl: "https://cdn.example.test/hero.webp",
    width: 1200,
    height: 800,
    aspectRatio: 1.5,
  },
  variants: [],
} satisfies PublicMediaProjection;

describe("site.page media composition", () => {
  it("dispatches site.page and performs no media request when none is referenced", async () => {
    const getMedia = vi.fn();
    const result = await composeSitePage(page({ title: "No media" }), { getMedia });
    expect(result).toEqual({ title: "No media", sections: [] });
    expect(getMedia).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(/payload|revisionId|publishedAt/u);
  });

  it("resolves hero media to a narrow public image projection", async () => {
    const result = await composeSitePage(page({
      title: "Hero",
      heroMedia: { assetId: "asset:hero", alt: "Authored hero alt" },
    }), { getMedia: async () => ({
      ...image,
      storageKey: "private/storage",
      contentHash: "private-hash",
    }) });

    expect(result.heroMedia).toEqual({
      assetId: "asset:hero",
      alt: "Authored hero alt",
      publicUrl: "https://cdn.example.test/hero.webp",
      width: 1200,
      height: 800,
    });
    expect(JSON.stringify(result)).not.toMatch(/storageKey|contentHash|byteSize|mimeType|variants/u);
  });

  it("composes section media into the matching section", async () => {
    const result = await composeSitePage(page({
      title: "Section",
      sections: [{
        heading: "With media",
        media: { assetId: "asset:hero", alt: "Section alt" },
      }],
    }), { getMedia: async () => image });
    expect(result.sections[0]?.media?.alt).toBe("Section alt");
    expect(result.sections[0]?.media?.publicUrl).toBe(image.original.publicUrl);
  });

  it("deduplicates a shared hero and section asset", async () => {
    const getMedia = vi.fn(async () => image);
    const result = await composeSitePage(page({
      title: "Shared",
      heroMedia: { assetId: "asset:hero", alt: "Hero alt" },
      sections: [{
        heading: "Section",
        media: { assetId: "asset:hero", alt: "Different contextual alt" },
      }],
    }), { getMedia });
    expect(getMedia).toHaveBeenCalledOnce();
    expect(getMedia).toHaveBeenCalledWith("asset:hero");
    expect(result.heroMedia?.alt).toBe("Hero alt");
    expect(result.sections[0]?.media?.alt).toBe("Different contextual alt");
  });

  it.each([
    ["missing media", async () => null],
    ["non-image media", async () => ({ ...image, kind: "document" } as PublicMediaProjection)],
  ])("maps %s to sanitized local application failure", async (_case, getMedia) => {
    const operation = composeSitePage(page({
      title: "Broken",
      heroMedia: { assetId: "asset:private-value", alt: "Alt" },
    }), { getMedia });
    await expect(operation).rejects.toBeInstanceOf(PublicApplicationContentError);
    await operation.catch((error: unknown) => {
      const failure = publicPageHttpFailure(error);
      expect(failure).toEqual({ statusCode: 500, statusMessage: "Public page content is invalid" });
      expect(JSON.stringify(failure)).not.toContain("asset:private-value");
    });
  });

  it.each([
    [new CoreClientError("protocol"), 502],
    [new CoreClientError("unavailable"), 503],
    [new CoreClientError("network"), 503],
    [new CoreClientError("timeout"), 503],
  ] as const)("preserves a Core media failure as HTTP %i", async (error, statusCode) => {
    await expect(composeSitePage(page({
      title: "Infrastructure",
      heroMedia: { assetId: "asset:hero", alt: "Alt" },
    }), { getMedia: async () => { throw error; } })).rejects.toBe(error);
    expect(publicPageHttpFailure(error).statusCode).toBe(statusCode);
  });

  it("rejects unsupported published content types without parsing or media reads", async () => {
    const getMedia = vi.fn();
    await expect(composeSitePage({
      ...page({ title: "Unsupported" }),
      content: { ...page({ title: "Unsupported" }).content, type: "something.else" },
    }, { getMedia })).rejects.toBeInstanceOf(PublicApplicationContentError);
    expect(getMedia).not.toHaveBeenCalled();
  });

  it("rejects an invalid site.page payload as local application content", async () => {
    await expect(composeSitePage(page({ intro: "No title" }), {
      getMedia: async () => image,
    })).rejects.toBeInstanceOf(PublicApplicationContentError);
  });
});

function page(payload: unknown): PublicPageProjection {
  return {
    resource: { type: "content", id: "page:test" },
    content: {
      contentId: "page:test",
      type: "site.page",
      revisionId: "revision:test:1",
      revisionNumber: 1,
      payload: payload as PublicPageProjection["content"]["payload"],
      publishedAt: "2026-08-30T00:00:00.000Z",
    },
    seo: {
      title: "Core SEO Title",
      description: "Core SEO Description",
      canonicalPath: "/test",
      index: true,
      follow: true,
    },
  };
}
