import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("moving.home neutral structural renderer", () => {
  it("uses one H1, sequential section headings, and semantic lists for every collection", async () => {
    const renderer = await source("../app/components/content/MovingHomeRenderer.vue");
    expect((renderer.match(/<h1(?:\s|>)/gu) ?? [])).toHaveLength(1);
    expect((renderer.match(/<h2(?:\s|>)/gu) ?? [])).toHaveLength(5);
    for (const evidence of [
      "<main", "<header", "<ul", "<ol", "<section", "<h3",
      "page.proof", "page.services.items", "page.process.steps", "page.assurance.points",
      "page.serviceAreas.areas", "page.finalAction",
    ]) expect(renderer).toContain(evidence);
    expect(renderer.indexOf("page.process.steps")).toBeLessThan(renderer.indexOf("page.assurance.points"));
  });

  it("keeps authored data out of executable HTML, styles, component names, and targets", async () => {
    const renderer = await source("../app/components/content/MovingHomeRenderer.vue");
    const action = await source("../app/components/content/PublicActionLink.vue");
    const combined = `${renderer}\n${action}`;
    for (const forbidden of [
      "v-html", "<component", ":is=", ":class=", ":style=", "target=", "JSON.stringify", "<pre",
    ]) expect(combined).not.toContain(forbidden);
    expect(action).toContain("<NuxtLink");
    expect(action).toContain("<a v-else");
    expect(action).toContain(":href=\"action.href\"");
  });

  it("adds only responsive structural rules and no homepage animation", async () => {
    const theme = await source("../app/assets/css/theme.css");
    expect(theme).toContain(".moving-home__section");
    expect(theme).toContain(".moving-assurance");
    expect(theme).toContain("@media (max-width: 67.9375rem)");
    expect(theme).toContain("@media (max-width: 47.9375rem)");
    const movingRules = theme.slice(theme.indexOf(".moving-actions"), theme.indexOf(".theme-error"));
    expect(movingRules).not.toMatch(/animation|@keyframes/u);
  });
});

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
