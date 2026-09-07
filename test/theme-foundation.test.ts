import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("R2.1 moving theme foundation", () => {
  it("uses a dedicated product identity and semantic theme stylesheet", async () => {
    const packageJson = JSON.parse(await source("../package.json"));
    const nuxtConfig = await source("../nuxt.config.ts");
    const theme = await source("../app/assets/css/theme.css");

    expect(packageJson.name).toBe("movecore-moving-theme");
    expect(packageJson.description).toContain("Moving & Logistics Theme");
    expect(nuxtConfig).toContain('"~/assets/css/theme.css"');
    expect(nuxtConfig).toContain("devtools: { enabled: false }");
    for (const token of [
      "--theme-canvas",
      "--theme-surface",
      "--theme-ink",
      "--theme-ink-muted",
      "--theme-rule",
      "--theme-signal",
      "--theme-signal-strong",
    ]) expect(theme).toContain(token);
  });

  it("keeps one semantic page H1 and avoids unsafe visual injection", async () => {
    const primarySources = await Promise.all([
      source("../app/components/content/SitePageRenderer.vue"),
      source("../app/components/PublicNavigation.vue"),
      source("../app/components/PublicNavigationTree.vue"),
      source("../app/layouts/default.vue"),
    ]);
    expect((primarySources[0]?.match(/<h1(?:\s|>)/gu) ?? [])).toHaveLength(1);
    const combined = primarySources.join("\n");
    for (const prohibited of ["v-html", "<iframe", "<component", "JSON.stringify", "<pre"]) {
      expect(combined).not.toContain(prohibited);
    }
  });

  it("keeps the application content boundary on the approved moving product types", async () => {
    const manifest = JSON.parse(await source("../application/editor-profiles.json"));
    expect(manifest.profiles.map((profile: { contentType: string }) => profile.contentType))
      .toEqual([
        "site.page",
        "moving.home",
        "moving.service",
        "moving.location",
        "moving.services",
        "moving.areas",
        "moving.faq",
        "moving.testimonials",
        "moving.quote",
        "moving.contact",
        "moving.article",
      ]);
    expect(JSON.stringify(manifest)).not.toMatch(/moving\.(?:blog|category|city|district|neighborhood)/u);
  });

  it("keeps the offline demo deterministic and moving-specific", async () => {
    const mock = await source("../scripts/mock-core.mjs");
    const home = await source("../application/examples/moving-home.json");
    for (const copy of [
      "Northline Moving",
      "2026-08-30T00:00:00.000Z",
    ]) expect(mock).toContain(copy);
    for (const copy of [
      "Residential & commercial moving",
      "Moving handled with care, from door to door.",
      "Care at every handoff",
      "Start with a clear moving plan.",
    ]) expect(home).toContain(copy);
    expect(mock).not.toMatch(/https:\/\/(?:images|fonts|cdn)\./u);
  });

  it("declares explicit responsive and reduced-motion behavior", async () => {
    const theme = await source("../app/assets/css/theme.css");
    expect(theme).toContain("@media (max-width: 67.9375rem)");
    expect(theme).toContain("@media (max-width: 47.9375rem)");
    expect(theme).toContain("prefers-reduced-motion: reduce");
    expect(theme).toContain("overflow-x: clip");
  });
});

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
