import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const sectionComponents = [
  "MovingHero",
  "MovingProof",
  "MovingServices",
  "MovingProcess",
  "MovingAssurance",
  "MovingServiceAreas",
  "MovingFinalAction",
] as const;

describe("R2.3 moving homepage presentation", () => {
  it("composes seven domain-specific components without a dynamic block registry", async () => {
    const renderer = await source("../app/components/content/MovingHomeRenderer.vue");
    for (const name of sectionComponents) {
      expect(renderer).toContain(`import ${name}`);
      expect(renderer).toContain(`<${name}`);
    }
    expect(renderer).not.toMatch(/BlockRenderer|component\s*:is|sectionRegistry|componentMap/u);
  });

  it("keeps presentational components on typed slices with no transport or parsing work", async () => {
    const sources = await Promise.all(sectionComponents.map((name) =>
      source(`../app/components/content/moving-home/${name}.vue`)));
    const combined = sources.join("\n");
    expect(combined).toContain("~~/shared/content/moving-home");
    for (const forbidden of [
      "$fetch", "useFetch", "useAsyncData", "parseMovingHomePayload", "NUXT_CORE", "prisma", "database",
    ]) expect(combined).not.toContain(forbidden);
  });

  it("preserves the approved R2.1 palette and sharp, shadow-free visual language", async () => {
    const theme = await source("../app/assets/css/theme.css");
    for (const token of [
      "--theme-canvas: #f0f0ea",
      "--theme-surface: #faf9f4",
      "--theme-ink: #19302c",
      "--theme-signal: #c94f2c",
      "--theme-signal-strong: #963216",
      "--theme-signal-soft: #e9a46e",
    ]) expect(theme).toContain(token);
    const movingRules = theme.slice(theme.indexOf(".moving-home"), theme.indexOf(".moving-conversion"));
    expect(movingRules).not.toMatch(/border-radius|linear-gradient|radial-gradient|drop-shadow/u);
  });

  it("prioritizes hero media and lazily loads only below-fold assurance media", async () => {
    const hero = await source("../app/components/content/moving-home/MovingHero.vue");
    const assurance = await source("../app/components/content/moving-home/MovingAssurance.vue");
    expect(hero).toContain('fetchpriority="high"');
    expect(hero).not.toContain('loading="lazy"');
    expect(assurance).toContain('loading="lazy"');
    expect(hero).toContain(":width=");
    expect(hero).toContain(":height=");
    expect(assurance).toContain(":width=");
    expect(assurance).toContain(":height=");
  });

  it("defines intentional desktop, tablet, mobile, and narrow-action fallbacks", async () => {
    const theme = await source("../app/assets/css/theme.css");
    for (const evidence of [
      "box-sizing: border-box",
      "grid-template-columns: repeat(12, minmax(0, 1fr))",
      "@media (max-width: 67.9375rem)",
      "@media (max-width: 47.9375rem)",
      "@media (max-width: 30rem)",
      ".moving-actions .moving-action-link",
    ]) expect(theme).toContain(evidence);
  });

  it("documents the final-photo brief while keeping deterministic fixtures temporary", async () => {
    const readme = await source("../README.md");
    for (const evidence of [
      "R2 commercial photography direction",
      "deterministic SVG fixtures are temporary",
      "real moving crews",
      "natural daylight",
      "protective packing",
      "AI-looking anatomy",
    ]) expect(readme).toContain(evidence);
  });
});

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
