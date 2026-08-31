import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const componentPaths = [
  "../app/components/content/MovingHomeRenderer.vue",
  "../app/components/content/moving-home/MovingHero.vue",
  "../app/components/content/moving-home/MovingProof.vue",
  "../app/components/content/moving-home/MovingServices.vue",
  "../app/components/content/moving-home/MovingProcess.vue",
  "../app/components/content/moving-home/MovingAssurance.vue",
  "../app/components/content/moving-home/MovingServiceAreas.vue",
  "../app/components/content/moving-home/MovingFinalAction.vue",
] as const;

describe("moving.home commercial renderer", () => {
  it("uses one H1, sequential section headings, and semantic lists for every collection", async () => {
    const sources = await Promise.all(componentPaths.map(source));
    const renderer = sources[0] ?? "";
    const combined = sources.join("\n");
    expect((combined.match(/<h1(?:\s|>)/gu) ?? [])).toHaveLength(1);
    expect((combined.match(/<h2(?:\s|>)/gu) ?? [])).toHaveLength(5);
    for (const evidence of [
      "<main", "<header", "<ul", "<ol", "<section", "<h3",
      "page.proof", "page.services", "page.process", "page.assurance",
      "page.serviceAreas", "page.finalAction", "section.steps", "section.points", "section.areas",
    ]) expect(combined).toContain(evidence);
    expect(renderer.indexOf("<MovingProcess")).toBeLessThan(renderer.indexOf("<MovingAssurance"));
  });

  it("keeps authored data out of executable HTML, styles, component names, and targets", async () => {
    const renderers = await Promise.all(componentPaths.map(source));
    const action = await source("../app/components/content/PublicActionLink.vue");
    const combined = `${renderers.join("\n")}\n${action}`;
    for (const forbidden of [
      "v-html", "<component", ":is=", ":class=", ":style=", "target=", "JSON.stringify", "<pre",
    ]) expect(combined).not.toContain(forbidden);
    expect(action).toContain("<NuxtLink");
    expect(action).toContain("<a v-else");
    expect(action).toContain(":href=\"action.href\"");
  });

  it("adds responsive presentation rules and no homepage animation", async () => {
    const theme = await source("../app/assets/css/theme.css");
    expect(theme).toContain(".moving-home__section");
    expect(theme).toContain(".moving-assurance");
    expect(theme).toContain("@media (max-width: 67.9375rem)");
    expect(theme).toContain("@media (max-width: 47.9375rem)");
    const movingRules = theme.slice(theme.indexOf(".moving-home"), theme.indexOf(".theme-error"));
    expect(movingRules).not.toMatch(/animation|@keyframes/u);
  });
});

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
