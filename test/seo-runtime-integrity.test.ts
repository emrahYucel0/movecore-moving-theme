import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import type { PublicPageProjection } from "../server/core/contracts";
import { resolvePublicPageRoute } from "../server/public-page/route";
import { createMovingRobotsText } from "../server/robots/text";
import { articleArchiveCanonicalUrl } from "../shared/article-archive-seo";
import type { PublicApplicationPage } from "../shared/page-route";
import {
  composeMovingPageSeo,
  MOVING_FALLBACK_DESCRIPTION_MAX_LENGTH,
  MOVING_FALLBACK_TITLE_MAX_LENGTH,
} from "../shared/moving-page-seo";
import { PublicSiteConfigurationError } from "../shared/public-site-url";

const PUBLISHED_AT = "2026-09-12T00:00:00.000Z";

const fallbackCases = [
  ["moving.home", "moving-home.json", "Moving handled with care, from door to door.", "A planned moving service for homes and businesses, with careful packing, coordinated transport and a clear handoff at every stage."],
  ["moving.service", "moving-service.json", "A room-by-room plan for moving home.", "Coordinate packing, access, transport and placement through one clear moving sequence."],
  ["moving.location", "moving-location.json", "Moving support shaped around practical local access.", "Plan building entry, loading coordination and destination handoff for a move within North District."],
  ["moving.services", "moving-services.json", "Practical support for every stage of a move.", "Choose a complete moving plan or focused help for a workplace transition, with clear scope and careful handling."],
  ["moving.areas", "moving-areas.json", "Local moves planned around real access.", "Explore the areas we serve and the practical property, parking and timing details that can shape moving day."],
  ["moving.faq", "moving-faq.json", "Clear answers before moving day.", "Understand planning, packing, access and handoff before choosing the scope of your move."],
  ["moving.testimonials", "moving-testimonials.json", "What a well-planned move feels like.", "Editorial customer stories about communication, careful handling and a clear handoff."],
  ["moving.quote", "moving-quote.json", "Tell us what needs to move and where it needs to go.", "Share the practical details your moving team needs for a useful first conversation. This is a quote request, not an instant price calculation."],
  ["moving.contact", "moving-contact.json", "Start a straightforward conversation with the moving team.", "Use the direct details below or send a short message. For a move-specific estimate, the quote request captures the most useful planning information."],
  ["moving.article", "moving-article-access.json", "How to prepare access before moving day", "A practical access check helps the moving team arrive with the right plan, protect shared spaces and keep handover time under control."],
] as const;

describe("Moving resource SEO presentation", () => {
  it("uses generic page title and intro when explicit Core SEO is absent", async () => {
    const page = await composedPage("site.page", {
      title: "A buyer-authored company page",
      intro: "A concise buyer-authored introduction.",
      sections: [],
    });

    expect(composeMovingPageSeo(page)).toEqual({
      title: "A buyer-authored company page",
      description: "A concise buyer-authored introduction.",
    });
  });

  it.each(fallbackCases)(
    "uses the canonical visible identity and summary for %s",
    async (type, fixture, title, description) => {
      const payload = JSON.parse(await readFile(
        new URL(`../application/examples/${fixture}`, import.meta.url),
        "utf8",
      )) as unknown;
      const page = await composedPage(type, payload);

      const result = composeMovingPageSeo(page);

      expect(result).toEqual({ title, description });
      expect([...result.title].length).toBeLessThanOrEqual(MOVING_FALLBACK_TITLE_MAX_LENGTH);
      expect([...(result.description ?? "")].length)
        .toBeLessThanOrEqual(MOVING_FALLBACK_DESCRIPTION_MAX_LENGTH);
    },
  );

  it("keeps description absent when a site.page has no authored concise summary", async () => {
    const page = await composedPage("site.page", { title: "A useful page", sections: [] });
    expect(composeMovingPageSeo(page)).toEqual({ title: "A useful page" });
  });

  it("changes fallback metadata when buyer-authored content changes", async () => {
    const payload = JSON.parse(await readFile(
      new URL("../application/examples/moving-service.json", import.meta.url),
      "utf8",
    )) as { hero: { title: string; intro: string } };
    payload.hero.title = "Buyer-renamed careful apartment move";
    payload.hero.intro = "Buyer-authored access and handoff summary.";

    const page = await composedPage("moving.service", payload);

    expect(composeMovingPageSeo(page)).toEqual({
      title: "Buyer-renamed careful apartment move",
      description: "Buyer-authored access and handoff summary.",
    });
  });

  it("always gives valid explicit Core SEO precedence over application fallback", async () => {
    const page = await composedPage(
      "site.page",
      { title: "Visible buyer title", intro: "Visible buyer introduction.", sections: [] },
      { title: "Explicit Core SEO title", description: "Explicit Core SEO description." },
    );

    expect(composeMovingPageSeo(page)).toEqual({
      title: "Explicit Core SEO title",
      description: "Explicit Core SEO description.",
    });
  });

  it("normalizes and bounds fallback text without exposing an internal identity", async () => {
    const original = await composedPage("site.page", {
      title: "Buyer title",
      intro: "Buyer summary.",
      sections: [],
    });
    if (original.type !== "site.page") throw new Error("Expected a site.page.");
    const page: PublicApplicationPage = {
      ...original,
      content: {
        ...original.content,
        title: `  Buyer   title ${"x".repeat(180)}  `,
        intro: `  Buyer\nsummary ${"detail ".repeat(80)}  `,
      },
    };

    const result = composeMovingPageSeo(page);

    expect(result.title).toMatch(/^Buyer title/u);
    expect(result.title).not.toMatch(/site\.page|content-|revision-/u);
    expect([...result.title].length).toBeLessThanOrEqual(MOVING_FALLBACK_TITLE_MAX_LENGTH);
    expect([...(result.description ?? "")].length)
      .toBeLessThanOrEqual(MOVING_FALLBACK_DESCRIPTION_MAX_LENGTH);
  });
});

describe("Article archive canonical identity", () => {
  it("keeps the first page canonical clean", () => {
    expect(articleArchiveCanonicalUrl("https://public.example.test/"))
      .toBe("https://public.example.test/articles");
  });

  it("retains only the deterministic opaque cursor with canonical URL encoding", () => {
    expect(articleArchiveCanonicalUrl(
      "https://public.example.test",
      "article:cursor/with space+value",
    )).toBe("https://public.example.test/articles?after=article%3Acursor%2Fwith+space%2Bvalue");
  });
});

describe("Moving robots text", () => {
  it("allows public content, blocks internal APIs, and declares exactly one public sitemap", () => {
    const result = createMovingRobotsText("https://public.example.test/");
    expect(result).toBe([
      "User-agent: *",
      "Disallow: /api/",
      "Sitemap: https://public.example.test/sitemap.xml",
      "",
    ].join("\n"));
    expect(result.match(/^Sitemap:/gmu)).toHaveLength(1);
    expect(result).not.toMatch(/Core|admin|localhost|_nuxt/iu);
  });

  it.each(["", "http://public.example.test/path", "ftp://public.example.test"])(
    "rejects invalid public origin %s",
    (siteUrl) => {
      expect(() => createMovingRobotsText(siteUrl)).toThrow(PublicSiteConfigurationError);
    },
  );
});

async function composedPage(
  type: PublicPageProjection["content"]["type"],
  payload: unknown,
  explicitSeo: Readonly<{ readonly title?: string; readonly description?: string }> = {},
): Promise<PublicApplicationPage> {
  const projection: PublicPageProjection = {
    resource: { type: "content", id: `content-${type}` },
    content: {
      contentId: `content-${type}`,
      type,
      revisionId: `revision-${type}`,
      revisionNumber: 1,
      payload: payload as PublicPageProjection["content"]["payload"],
      publishedAt: PUBLISHED_AT,
    },
    seo: {
      canonicalPath: "/buyer-page",
      index: true,
      follow: true,
      ...explicitSeo,
    },
  };
  const result = await resolvePublicPageRoute(
    "/buyer-page",
    {
      resolvePage: vi.fn(async () => ({ kind: "page", page: projection })),
      getMedia: vi.fn(async (assetId: string) => ({
        assetId,
        kind: "image" as const,
        original: {
          mimeType: "image/webp",
          format: "webp",
          byteSize: 1,
          publicUrl: `https://cdn.example.test/${encodeURIComponent(assetId)}.webp`,
        },
        variants: [],
      })),
    },
    "A".repeat(43),
  );
  if (result.kind !== "page") throw new Error("Expected a composed public page.");
  return result.page;
}
