import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { parsePublicContent, type PublicPageProjection } from "../server/core/contracts";
import { CoreClientError } from "../server/core/errors";
import {
  PublicApplicationContentError,
} from "../server/public-page/application-content";
import {
  publicPageHttpFailure,
  resolvePublicPageRoute,
} from "../server/public-page/route";
import { publicPathname } from "../shared/page-route";

const page = {
  resource: { type: "page", id: "home" },
  content: {
    contentId: "content-home",
    type: "site.page",
    revisionId: "revision-1",
    revisionNumber: 1,
    payload: { title: "Core SSR Proof" },
    publishedAt: "2026-08-30T00:00:00.000Z",
  },
  seo: {
    title: "Home",
    canonicalPath: "/",
    index: true,
    follow: true,
  },
} satisfies PublicPageProjection;

describe("public page application route", () => {
  it("returns composed site.page content without an unnecessary media request", async () => {
    const resolvePage = vi.fn(async () => ({ kind: "page", page } as const));
    const getMedia = vi.fn();

    const result = await resolvePublicPageRoute("/a/b/c", { resolvePage, getMedia });

    expect(resolvePage).toHaveBeenCalledOnce();
    expect(resolvePage).toHaveBeenCalledWith("/a/b/c");
    expect(getMedia).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: "page",
      page: { type: "site.page", seo: page.seo, content: { title: "Core SSR Proof", sections: [] } },
    });
  });

  it("dispatches moving.home by published content type without coupling it to the root path", async () => {
    const payload: unknown = JSON.parse(await readFile(
      new URL("../application/examples/moving-home.json", import.meta.url),
      "utf8",
    ));
    const movingPage: PublicPageProjection = {
      ...page,
      content: { ...page.content, type: "moving.home", payload },
      seo: { ...page.seo, canonicalPath: "/campaign/moving" },
    };
    const resolvePage = vi.fn(async () => ({ kind: "page", page: movingPage } as const));
    const getMedia = vi.fn(async (assetId: string) => ({
      assetId,
      kind: "image" as const,
      original: {
        mimeType: "image/webp",
        format: "webp",
        byteSize: 1,
        publicUrl: `https://cdn.example.test/${encodeURIComponent(assetId)}.webp`,
      },
      variants: [],
    }));

    const result = await resolvePublicPageRoute("/campaign/moving", { resolvePage, getMedia });
    expect(resolvePage).toHaveBeenCalledWith("/campaign/moving");
    expect(result).toMatchObject({
      kind: "page",
      page: {
        type: "moving.home",
        seo: { canonicalPath: "/campaign/moving" },
        content: { hero: { title: "Moving handled with care, from door to door." } },
      },
    });
  });

  it.each([
    ["moving.service", "moving-service.json", "/flat-service", "A room-by-room plan for moving home."],
    ["moving.location", "moving-location.json", "/campaign/local-support", "Moving support shaped around practical local access."],
    ["moving.services", "moving-services.json", "/portfolio", "Practical support for every stage of a move."],
    ["moving.areas", "moving-areas.json", "/coverage", "Local moves planned around real access."],
    ["moving.faq", "moving-faq.json", "/questions", "Clear answers before moving day."],
    ["moving.testimonials", "moving-testimonials.json", "/customer-stories", "What a well-planned move feels like."],
  ] as const)(
    "dispatches %s at an arbitrary Core-resolved canonical path",
    async (contentType, fixture, canonicalPath, visibleTitle) => {
      const payload: unknown = JSON.parse(await readFile(
        new URL(`../application/examples/${fixture}`, import.meta.url), "utf8",
      ));
      const publishedPage: PublicPageProjection = {
        ...page,
        content: { ...page.content, type: contentType, payload },
        seo: { ...page.seo, title: "A deliberately different SEO title", canonicalPath },
      };
      const resolvePage = vi.fn(async () => ({ kind: "page", page: publishedPage } as const));
      const getMedia = vi.fn(async (assetId: string) => ({
        assetId,
        kind: "image" as const,
        original: {
          mimeType: "image/webp",
          format: "webp",
          byteSize: 1,
          publicUrl: `https://cdn.example.test/${encodeURIComponent(assetId)}.webp`,
        },
        variants: [],
      }));

      const result = await resolvePublicPageRoute(canonicalPath, { resolvePage, getMedia });
      expect(resolvePage).toHaveBeenCalledWith(canonicalPath);
      expect(result).toMatchObject({
        kind: "page",
        page: {
          type: contentType,
          seo: { title: "A deliberately different SEO title", canonicalPath },
          content: { hero: { title: visibleTitle } },
        },
      });
    },
  );

  it("rejects unsupported published types without media reads", async () => {
    const getMedia = vi.fn();
    await expect(resolvePublicPageRoute("/unsupported", {
      getMedia,
      resolvePage: async () => ({
        kind: "page",
        page: { ...page, content: { ...page.content, type: "something.else" } },
      }),
    })).rejects.toBeInstanceOf(PublicApplicationContentError);
    expect(getMedia).not.toHaveBeenCalled();
  });

  it("dispatches moving.article at its Core-resolved canonical path without media reads", async () => {
    const getMedia = vi.fn();
    const articlePage: PublicPageProjection = {
      ...page,
      content: {
        ...page.content,
        type: "moving.article",
        payload: {
          title: "A useful moving guide",
          excerpt: "Practical context before moving day.",
          body: [{ heading: "Prepare", paragraphs: [{ text: "Confirm access." }] }],
        },
      },
      seo: { canonicalPath: "/advice/access", index: true, follow: true },
    };
    const result = await resolvePublicPageRoute("/advice/access", {
      getMedia,
      resolvePage: async () => ({ kind: "page", page: articlePage }),
    });
    expect(result).toMatchObject({
      kind: "page",
      page: {
        type: "moving.article",
        seo: { canonicalPath: "/advice/access" },
        content: { title: "A useful moving guide", publishedAt: page.content.publishedAt },
      },
    });
    expect(getMedia).not.toHaveBeenCalled();
  });

  it.each([
    [301, "/new"],
    [302, "/temporary-target"],
  ] as const)("preserves a %i redirect", async (status, to) => {
    const result = await resolvePublicPageRoute("/old", {
      getMedia: async () => null,
      resolvePage: async () => ({
        kind: "redirect",
        from: "/old",
        to,
        location: to,
        status,
      }),
    });

    expect(result).toEqual({ kind: "redirect", to, status });
  });

  it("keeps not-found distinct", async () => {
    await expect(resolvePublicPageRoute("/missing", {
      getMedia: async () => null,
      resolvePage: async () => ({ kind: "not-found" }),
    })).resolves.toEqual({ kind: "not-found" });
  });

  it.each([
    [new CoreClientError("invalid-request"), 400],
    [new CoreClientError("protocol"), 502],
    [new CoreClientError("unavailable"), 503],
    [new CoreClientError("network"), 503],
    [new CoreClientError("timeout"), 503],
    [new CoreClientError("invalid-request", { code: "invalid_configuration" }), 503],
    [new PublicApplicationContentError(), 500],
  ] as const)("maps Core failures to sanitized HTTP status %i", (error, statusCode) => {
    const failure = publicPageHttpFailure(error);
    expect(failure.statusCode).toBe(statusCode);
    expect(failure.statusMessage).not.toMatch(/Core URL|NUXT_|database|stack/iu);
  });

  it("uses route.path and excludes the browser query string", () => {
    expect(publicPathname({
      path: "/example",
      fullPath: "/example?utm_source=test",
    })).toBe("/example");
  });

  it("forwards a nested pathname unchanged", () => {
    expect(publicPathname({ path: "/a/b/c" })).toBe("/a/b/c");
  });

  it("copies hostile JSON keys without mutating object prototypes", () => {
    const payload: unknown = JSON.parse('{"__proto__":{"polluted":true},"title":"Safe"}');
    const content = parsePublicContent({
      ...page.content,
      payload,
    });

    expect(Object.prototype.hasOwnProperty.call(content.payload, "__proto__")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted")).toBe(false);
  });
});
