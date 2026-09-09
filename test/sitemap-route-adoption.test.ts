import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(
  readFileSync(new URL("../application/sitemap-routes.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

describe("Moving fixed sitemap route adoption", () => {
  it("declares exactly the application-owned Articles archive route", () => {
    expect(Object.keys(manifest).sort()).toEqual(["routes", "version"]);
    expect(manifest.version).toBe(1);
    expect(manifest.routes).toEqual([{ path: "/articles" }]);
    expect(Object.keys((manifest.routes as Array<Record<string, unknown>>)[0]!).sort()).toEqual(["path"]);
  });

  it("keeps the archive application-owned and Article details resource-backed", () => {
    const archivePage = source("../app/pages/articles/index.vue");
    const archiveProjection = source("../server/articles/archive.ts");
    const catchAllPage = source("../app/pages/[...slug].vue");
    const publicPageRoute = source("../server/public-page/route.ts");

    expect(archivePage).toContain("/api/_movecore/articles");
    expect(archivePage).toContain('absolutePublicUrl(config.public.siteUrl, "/articles")');
    expect(archiveProjection).toContain('type: "moving.article"');
    expect(archiveProjection).toContain("client.listContent");
    expect(archiveProjection).not.toMatch(/resolvePage|UrlResource/u);
    expect(catchAllPage).toContain("<PublicPageRoute />");
    expect(publicPageRoute).toContain("resolver.resolvePage(path)");
    expect(publicPageRoute).toContain('result.page.content.type === "moving.article"');
  });
});

function source(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}
