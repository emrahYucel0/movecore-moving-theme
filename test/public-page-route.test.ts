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
      page: { seo: page.seo, content: { title: "Core SSR Proof", sections: [] } },
    });
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
