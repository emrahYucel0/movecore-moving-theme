import { describe, expect, it, vi } from "vitest";
import type { PublicMediaProjection, PublicPageProjection } from "../server/core/contracts";
import { CoreClientError } from "../server/core/errors";
import {
  composeMovingHome,
  PublicApplicationContentError,
} from "../server/public-page/application-content";
import { publicPageHttpFailure } from "../server/public-page/route";

const heroImage = image("asset:hero", "https://cdn.example.test/hero.webp");
const assuranceImage = image("asset:assurance", "https://cdn.example.test/assurance.webp");

describe("moving.home media composition", () => {
  it("resolves hero and assurance images in parallel into a narrow render model", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const getMedia = vi.fn(async (assetId: string) => {
      await gate;
      return assetId === "asset:hero" ? heroImage : assuranceImage;
    });

    const operation = composeMovingHome(page(payload()), { getMedia });
    await vi.waitFor(() => expect(getMedia).toHaveBeenCalledTimes(2));
    expect(getMedia.mock.calls.map(([assetId]) => assetId).sort()).toEqual([
      "asset:assurance", "asset:hero",
    ]);
    release?.();
    const result = await operation;

    expect(result.hero.media).toEqual({
      assetId: "asset:hero",
      alt: "Hero alt",
      publicUrl: "https://cdn.example.test/hero.webp",
      width: 1200,
      height: 800,
    });
    expect(result.assurance.media?.publicUrl).toBe("https://cdn.example.test/assurance.webp");
    expect(result.assurance.points).toEqual(["Point 1", "Point 2"]);
    expect(JSON.stringify(result)).not.toMatch(/payload|revisionId|publishedAt|storageKey|contentHash|byteSize|mimeType|variants/u);
  });

  it("does not request optional assurance media when it is absent", async () => {
    const input = payload();
    delete input.assurance.media;
    const getMedia = vi.fn(async () => heroImage);
    const result = await composeMovingHome(page(input), { getMedia });
    expect(getMedia).toHaveBeenCalledOnce();
    expect(getMedia).toHaveBeenCalledWith("asset:hero");
    expect(result.assurance.media).toBeUndefined();
  });

  it("deduplicates a shared hero and assurance asset while preserving contextual alt text", async () => {
    const input = payload();
    input.assurance.media = { assetId: "asset:hero", alt: "Assurance context" };
    const getMedia = vi.fn(async () => heroImage);
    const result = await composeMovingHome(page(input), { getMedia });
    expect(getMedia).toHaveBeenCalledOnce();
    expect(result.hero.media.alt).toBe("Hero alt");
    expect(result.assurance.media?.alt).toBe("Assurance context");
  });

  it.each([
    ["hero missing", "asset:hero", async () => null],
    ["assurance missing", "asset:assurance", async (assetId: string) => assetId === "asset:hero" ? heroImage : null],
    ["hero non-image", "asset:hero", async () => ({ ...heroImage, kind: "document" } as PublicMediaProjection)],
  ])("fails closed with sanitized 500 when %s", async (_case, _assetId, getMedia) => {
    const operation = composeMovingHome(page(payload()), { getMedia });
    await expect(operation).rejects.toBeInstanceOf(PublicApplicationContentError);
    await operation.catch((error: unknown) => {
      const failure = publicPageHttpFailure(error);
      expect(failure).toEqual({ statusCode: 500, statusMessage: "Public page content is invalid" });
      expect(JSON.stringify(failure)).not.toMatch(/asset:hero|asset:assurance/u);
    });
  });

  it.each([
    [new CoreClientError("protocol"), 502],
    [new CoreClientError("unavailable"), 503],
    [new CoreClientError("network"), 503],
    [new CoreClientError("timeout"), 503],
  ] as const)("preserves a Core media failure as HTTP %i", async (error, statusCode) => {
    const operation = composeMovingHome(page(payload()), {
      getMedia: async () => { throw error; },
    });
    await expect(operation).rejects.toBe(error);
    expect(publicPageHttpFailure(error).statusCode).toBe(statusCode);
  });

  it("rejects the wrong content type before parsing or media reads", async () => {
    const getMedia = vi.fn();
    await expect(composeMovingHome({
      ...page(payload()),
      content: { ...page(payload()).content, type: "site.page" },
    }, { getMedia })).rejects.toBeInstanceOf(PublicApplicationContentError);
    expect(getMedia).not.toHaveBeenCalled();
  });

  it("rejects an invalid moving.home payload before media reads", async () => {
    const getMedia = vi.fn();
    await expect(composeMovingHome(page({ hero: {} }), { getMedia }))
      .rejects.toBeInstanceOf(PublicApplicationContentError);
    expect(getMedia).not.toHaveBeenCalled();
  });
});

function image(assetId: string, publicUrl: string): PublicMediaProjection {
  return {
    assetId,
    kind: "image",
    original: {
      mimeType: "image/webp",
      format: "webp",
      byteSize: 1_234,
      publicUrl,
      width: 1200,
      height: 800,
      aspectRatio: 1.5,
    },
    variants: [],
  };
}

function payload() {
  return {
    hero: {
      title: "Move clearly",
      intro: "A planned move.",
      media: { assetId: "asset:hero", alt: "Hero alt" },
      primaryAction: { label: "Plan", href: "/about" },
    },
    proof: [
      { value: "Planned", label: "Every move" },
      { value: "Clear", label: "Every handoff" },
    ],
    services: {
      title: "Services",
      items: [
        { title: "Home", description: "Home moving.", href: "/about" },
        { title: "Office", description: "Office moving.", href: "/about" },
        { title: "Packing", description: "Packing support.", href: "/about" },
      ],
    },
    process: {
      title: "Process",
      steps: [
        { title: "Plan", description: "Plan." },
        { title: "Move", description: "Move." },
        { title: "Place", description: "Place." },
      ],
    },
    assurance: {
      title: "Care",
      body: "Careful handling.",
      media: { assetId: "asset:assurance", alt: "Assurance alt" },
      points: [{ text: "Point 1" }, { text: "Point 2" }],
    },
    serviceAreas: {
      title: "Areas",
      areas: [
        { label: "Area 1", href: "/about" },
        { label: "Area 2", href: "/about" },
        { label: "Area 3", href: "/about" },
      ],
    },
    finalAction: {
      title: "Start",
      primaryAction: { label: "Plan", href: "/about" },
    },
  };
}

function page(contentPayload: unknown): PublicPageProjection {
  return {
    resource: { type: "content", id: "moving:home" },
    content: {
      contentId: "moving:home",
      type: "moving.home",
      revisionId: "revision:moving:home:1",
      revisionNumber: 1,
      payload: contentPayload as PublicPageProjection["content"]["payload"],
      publishedAt: "2026-08-30T00:00:00.000Z",
    },
    seo: {
      title: "Core SEO Title",
      description: "Core SEO Description",
      canonicalPath: "/",
      index: true,
      follow: true,
    },
  };
}
