import { describe, expect, it, vi } from "vitest";
import type { PublicMediaProjection, PublicPageProjection } from "../server/core/contracts";
import { CoreClientError } from "../server/core/errors";
import {
  composeMovingLocation,
  composeMovingService,
  PublicApplicationContentError,
} from "../server/public-page/application-content";
import { publicPageHttpFailure } from "../server/public-page/route";

const heroImage = image("asset:hero", "https://cdn.example.test/inner-hero.webp");

describe.each([
  ["moving.service", composeMovingService, servicePayload],
  ["moving.location", composeMovingLocation, locationPayload],
] as const)("%s media composition", (contentType, compose, payloadFactory) => {
  it("resolves valid hero media once into the narrow public view model", async () => {
    const getMedia = vi.fn(async () => heroImage);
    const result = await compose(page(contentType, payloadFactory()), { getMedia });
    expect(getMedia).toHaveBeenCalledOnce();
    expect(getMedia).toHaveBeenCalledWith("asset:hero");
    expect(result.hero.media).toEqual({
      assetId: "asset:hero",
      alt: "Authored hero alt",
      publicUrl: "https://cdn.example.test/inner-hero.webp",
      width: 1200,
      height: 800,
    });
    expect(JSON.stringify(result)).not.toMatch(/payload|revisionId|publishedAt|storageKey|contentHash|byteSize|mimeType|variants/u);
  });

  it("does not request Core media when optional hero media is absent", async () => {
    const payload = payloadFactory();
    delete record(payload.hero)["media"];
    const getMedia = vi.fn();
    const result = await compose(page(contentType, payload), { getMedia });
    expect(getMedia).not.toHaveBeenCalled();
    expect(result.hero.media).toBeUndefined();
  });

  it.each([
    ["missing", async () => null],
    ["non-image", async () => ({ ...heroImage, kind: "document" })],
  ])("fails closed with sanitized 500 for %s media", async (_case, getMedia) => {
    const operation = compose(page(contentType, payloadFactory()), {
      getMedia: getMedia as () => Promise<PublicMediaProjection | null>,
    });
    await expect(operation).rejects.toBeInstanceOf(PublicApplicationContentError);
    await operation.catch((error: unknown) => {
      expect(publicPageHttpFailure(error)).toEqual({
        statusCode: 500,
        statusMessage: "Public page content is invalid",
      });
    });
  });

  it.each([
    [new CoreClientError("protocol"), 502],
    [new CoreClientError("unavailable"), 503],
    [new CoreClientError("network"), 503],
    [new CoreClientError("timeout"), 503],
  ] as const)("preserves Core media failure as HTTP %i", async (error, statusCode) => {
    const operation = compose(page(contentType, payloadFactory()), {
      getMedia: async () => { throw error; },
    });
    await expect(operation).rejects.toBe(error);
    expect(publicPageHttpFailure(error).statusCode).toBe(statusCode);
  });
});

function servicePayload() {
  return {
    hero: {
      title: "Visible Service H1",
      intro: "Service introduction.",
      media: { assetId: "asset:hero", alt: "Authored hero alt" },
      primaryAction: { label: "Plan", href: "/about" },
    },
    overview: { title: "Overview", body: "Overview body.", points: [{ text: "One" }, { text: "Two" }] },
    included: {
      title: "Included",
      items: [
        { title: "One" }, { title: "Two" }, { title: "Three" },
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
    relatedServices: {
      title: "Related",
      items: [
        { title: "Home", href: "/services/home-moving" },
        { title: "Office", href: "/services/office-relocation" },
      ],
    },
    finalAction: { title: "Start", primaryAction: { label: "Plan", href: "/about" } },
  };
}

function locationPayload() {
  return {
    hero: {
      title: "Visible Location H1",
      intro: "Location introduction.",
      media: { assetId: "asset:hero", alt: "Authored hero alt" },
    },
    overview: { title: "Overview", body: "Overview body.", highlights: [{ text: "One" }, { text: "Two" }] },
    services: {
      title: "Services",
      items: [
        { title: "Home", href: "/services/home-moving" },
        { title: "Office", href: "/services/office-relocation" },
      ],
    },
    localDetails: {
      title: "Details",
      body: "Details body.",
      items: [
        { title: "Access", description: "Access planning." },
        { title: "Handoff", description: "Handoff planning." },
      ],
    },
    nearbyAreas: {
      title: "Nearby",
      items: [
        { label: "North", href: "/areas/north-district" },
        { label: "Riverside", href: "/areas/riverside" },
      ],
    },
    finalAction: { title: "Start", primaryAction: { label: "Plan", href: "/about" } },
  };
}

function page(type: "moving.service" | "moving.location", payload: unknown): PublicPageProjection {
  return {
    resource: { type: "content", id: `content:${type}` },
    content: {
      contentId: `content:${type}`,
      type,
      revisionId: `revision:${type}:1`,
      revisionNumber: 1,
      payload: payload as PublicPageProjection["content"]["payload"],
      publishedAt: "2026-08-30T00:00:00.000Z",
    },
    seo: {
      title: "Core-owned SEO title",
      description: "Core-owned SEO description",
      canonicalPath: "/arbitrary-canonical-path",
      index: true,
      follow: true,
    },
  };
}

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

function record(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}
