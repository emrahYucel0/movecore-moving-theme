import { describe, expect, it, vi } from "vitest";
import { CoreClientError } from "../server/core/errors";
import { createPublicSitemapXml } from "../server/sitemap/xml";
import {
  absolutePublicUrl,
  parsePublicSiteOrigin,
  PublicSiteConfigurationError,
} from "../shared/public-site-url";
import { robotsDirective } from "../shared/public-seo";

describe("public SEO helpers", () => {
  it.each([
    [true, true, "index,follow"],
    [false, true, "noindex,follow"],
    [true, false, "index,nofollow"],
    [false, false, "noindex,nofollow"],
  ] as const)("maps index=%s follow=%s", (index, follow, expected) => {
    expect(robotsDirective(index, follow)).toBe(expected);
  });

  it.each([
    "ftp://example.test",
    "https://user:pass@example.test",
    "https://example.test/path",
    "https://example.test?query=x",
    "https://example.test/#fragment",
    "",
  ])("rejects invalid public site origin %s", (value) => {
    expect(() => parsePublicSiteOrigin(value)).toThrow(PublicSiteConfigurationError);
  });

  it("normalizes the public site origin and uses the Core canonical path", () => {
    expect(parsePublicSiteOrigin(" https://example.test/ ")).toBe("https://example.test");
    expect(absolutePublicUrl("https://example.test", "/canonical-page")).toBe(
      "https://example.test/canonical-page",
    );
  });

  it("rejects a network-path canonical override", () => {
    expect(() => absolutePublicUrl("https://example.test", "//attacker.test/path"))
      .toThrow(PublicSiteConfigurationError);
  });
});

describe("public sitemap XML", () => {
  it("renders absolute root and nested URLs, optional lastmod, and XML escaping", async () => {
    const listSitemap = vi.fn(async () => ({
      items: [
        { path: "/", lastModified: "2026-08-30T00:00:00.000Z" },
        { path: "/services/moving" },
        { path: "/a&b", lastModified: "2026&08" },
      ],
    }));

    const xml = await createPublicSitemapXml("https://example.test", { listSitemap });

    expect(listSitemap).toHaveBeenCalledWith({ limit: 100 });
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://example.test/</loc>");
    expect(xml).toContain("<loc>https://example.test/services/moving</loc>");
    expect(xml).toContain("<loc>https://example.test/a&amp;b</loc>");
    expect(xml).toContain("<lastmod>2026-08-30T00:00:00.000Z</lastmod>");
    expect(xml).toContain("<lastmod>2026&amp;08</lastmod>");
    expect(xml).not.toMatch(/changefreq|priority/u);
  });

  it("follows every Core sitemap cursor", async () => {
    const listSitemap = vi.fn()
      .mockResolvedValueOnce({ items: [{ path: "/a" }], nextAfter: "/b" })
      .mockResolvedValueOnce({ items: [{ path: "/b" }] });

    const xml = await createPublicSitemapXml("https://example.test", { listSitemap });

    expect(listSitemap).toHaveBeenNthCalledWith(1, { limit: 100 });
    expect(listSitemap).toHaveBeenNthCalledWith(2, { limit: 100, after: "/b" });
    expect(xml).toContain("https://example.test/a");
    expect(xml).toContain("https://example.test/b");
  });

  it("fails safely when Core repeats a pagination cursor", async () => {
    const listSitemap = vi.fn(async () => ({
      items: [{ path: "/a" }],
      nextAfter: "/repeat",
    }));

    await expect(createPublicSitemapXml("https://example.test", { listSitemap }))
      .rejects.toMatchObject({ kind: "protocol", code: "invalid_sitemap_pagination" });
    expect(listSitemap).toHaveBeenCalledTimes(2);
  });

  it.each(["unavailable", "network", "timeout", "protocol"] as const)(
    "does not convert a Core %s failure into an empty sitemap",
    async (kind) => {
      const failure = new CoreClientError(kind);
      await expect(createPublicSitemapXml("https://example.test", {
        listSitemap: async () => { throw failure; },
      })).rejects.toBe(failure);
    },
  );

  it("requires a valid public site origin", async () => {
    await expect(createPublicSitemapXml("", {
      listSitemap: async () => ({ items: [] }),
    })).rejects.toBeInstanceOf(PublicSiteConfigurationError);
  });
});
