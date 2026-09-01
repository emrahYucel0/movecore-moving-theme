import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import type { PublicPageProjection } from "../server/core/contracts";
import {
  composeMovingAreas,
  composeMovingFaq,
  composeMovingServices,
  composeMovingTestimonials,
  PublicApplicationContentError,
} from "../server/public-page/application-content";

describe("commercial collection composition", () => {
  it("resolves and deduplicates authored services media with immutable image projections", async () => {
    const payload = await fixture("moving-services.json");
    const getMedia = vi.fn(media);
    const content = await composeMovingServices(page("moving.services", payload, "/services"), { getMedia });

    expect(getMedia.mock.calls.map(([assetId]) => assetId).sort()).toEqual([
      "asset:demo-hero", "asset:demo-process", "asset:demo-section",
    ]);
    expect(content.hero.media).toMatchObject({ publicUrl: expect.stringContaining("asset%3Ademo-hero"), width: 1200, height: 800 });
    expect(content.portfolio.items[0]?.media).toMatchObject({ alt: "Packed box being handled with care" });
    expect(Object.isFrozen(content)).toBe(true);
    expect(Object.isFrozen(content.portfolio.items)).toBe(true);
  });

  it.each([
    ["moving.areas", "moving-areas.json", "/areas", composeMovingAreas],
    ["moving.faq", "moving-faq.json", "/faq", composeMovingFaq],
    ["moving.testimonials", "moving-testimonials.json", "/testimonials", composeMovingTestimonials],
  ] as const)("composes %s without media reads when optional hero media is absent", async (type, name, path, compose) => {
    const getMedia = vi.fn(media);
    const content = await compose(page(type, await fixture(name), path), { getMedia });
    expect(getMedia).not.toHaveBeenCalled();
    expect(content.hero.media).toBeUndefined();
    expect(Object.isFrozen(content)).toBe(true);
  });

  it("sanitizes malformed collection payloads at the application boundary", async () => {
    const invalid = page("moving.faq", { items: [] }, "/faq");
    await expect(composeMovingFaq(invalid, { getMedia: vi.fn(media) }))
      .rejects.toBeInstanceOf(PublicApplicationContentError);
  });

  it("fails closed when a referenced collection image is missing or not an image", async () => {
    const services = page("moving.services", await fixture("moving-services.json"), "/services");
    await expect(composeMovingServices(services, { getMedia: async () => null }))
      .rejects.toBeInstanceOf(PublicApplicationContentError);
    await expect(composeMovingServices(services, {
      getMedia: async (assetId) => ({
        assetId,
        kind: "document",
        original: {
          mimeType: "application/pdf", format: "pdf", byteSize: 10, publicUrl: "https://cdn.example.test/file.pdf",
        },
        variants: [],
      }),
    })).rejects.toBeInstanceOf(PublicApplicationContentError);
  });
});

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(`../application/examples/${name}`, import.meta.url), "utf8"));
}

function page(type: string, payload: unknown, canonicalPath: string): PublicPageProjection {
  return {
    resource: { type: "content", id: `page:${canonicalPath}` },
    content: {
      contentId: `page:${canonicalPath}`,
      type,
      revisionId: `revision:${canonicalPath}:1`,
      revisionNumber: 1,
      payload,
      publishedAt: "2026-08-30T00:00:00.000Z",
    },
    seo: { title: "Collection", canonicalPath, index: true, follow: true },
  };
}

async function media(assetId: string) {
  return {
    assetId,
    kind: "image" as const,
    original: {
      mimeType: "image/webp",
      format: "webp",
      byteSize: 10,
      publicUrl: `https://cdn.example.test/${encodeURIComponent(assetId)}.webp`,
      width: 1200,
      height: 800,
      aspectRatio: 1.5,
    },
    variants: [],
  };
}
