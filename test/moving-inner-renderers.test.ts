import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe.each([
  ["service", "../app/components/content/MovingServiceRenderer.vue"],
  ["location", "../app/components/content/MovingLocationRenderer.vue"],
] as const)("moving %s renderer", (_kind, path) => {
  it("renders one H1, a logical H2 hierarchy, semantic collections, and native links", async () => {
    const renderer = await source(path);
    const finalAction = await source("../app/components/content/moving-home/MovingFinalAction.vue");
    const combined = `${renderer}\n${finalAction}`;
    expect((combined.match(/<h1(?:\s|>)/gu) ?? [])).toHaveLength(1);
    expect((combined.match(/<h2(?:\s|>)/gu) ?? [])).toHaveLength(5);
    for (const evidence of ["<main", "<article", "<header", "<section", "<h3", "<ul", "<ol", "PublicActionLink"] ) {
      expect(combined).toContain(evidence);
    }
    for (const forbidden of ["v-html", "<component", ":is=", ":style=", "target=", "<iframe"]) {
      expect(combined).not.toContain(forbidden);
    }
  });

  it("keeps media authored, dimensioned, high priority, and optional", async () => {
    const renderer = await source(path);
    expect(renderer).toContain("v-if=\"page.hero.media\"");
    expect(renderer).toContain(":alt=\"page.hero.media.alt\"");
    expect(renderer).toContain(":width=\"page.hero.media.width\"");
    expect(renderer).toContain(":height=\"page.hero.media.height\"");
    expect(renderer).toContain('fetchpriority="high"');
    expect(renderer).not.toContain("$fetch");
  });

  if (_kind === "location") {
    it("exposes an application-owned no-media location hero state", async () => {
      const renderer = await source(path);
      expect(renderer).toContain("'moving-location-hero--without-media': page.hero.media === undefined");
      const theme = await source("../app/assets/css/theme.css");
      expect(theme).toContain(".moving-inner-hero.moving-location-hero--without-media");
    });
  }
});

describe("R2.4 explicit presentation dispatch", () => {
  it("keeps all four renderers explicit without a CMS-driven registry", async () => {
    const route = await source("../app/components/PublicPageRoute.vue");
    for (const [type, renderer] of [
      ["site.page", "SitePageRenderer"],
      ["moving.home", "MovingHomeRenderer"],
      ["moving.service", "MovingServiceRenderer"],
      ["moving.location", "MovingLocationRenderer"],
    ]) {
      expect(route).toContain(`page?.type === '${type}'`);
      expect(route).toContain(`<${renderer}`);
    }
    expect(route).not.toMatch(/component\s*:is|componentMap|rendererRegistry|dynamic/u);
  });

  it("defines distinct responsive inner-page systems with no animation layer", async () => {
    const theme = await source("../app/assets/css/theme.css");
    for (const evidence of [
      ".moving-service-included", ".moving-service-process", ".moving-related-services",
      ".moving-location-services", ".moving-local-details", ".moving-nearby-areas",
      ".moving-location-hero--without-media", "@media (max-width: 67.9375rem)",
      "@media (max-width: 47.9375rem)", "@media (max-width: 30rem)",
    ]) expect(theme).toContain(evidence);
    const rules = theme.slice(theme.indexOf(".moving-inner"), theme.indexOf(".theme-error"));
    expect(rules).not.toMatch(/animation|@keyframes|gradient|border-radius|box-shadow/u);
  });
});

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
