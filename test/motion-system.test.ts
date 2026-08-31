import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("R2.5 progressive motion and route performance", () => {
  it("keeps motion CSS-only, progressive, compositor-friendly, and reducible", async () => {
    const theme = await source("../app/assets/css/theme.css");
    for (const evidence of [
      "--motion-fast",
      "--motion-base",
      "--motion-ease-standard",
      "@supports (animation-timeline: view())",
      "@media (prefers-reduced-motion: no-preference)",
      "@media (prefers-reduced-motion: reduce)",
      "animation: none !important",
      "moving-sequence-progress",
    ]) expect(theme).toContain(evidence);

    const movingRules = theme.slice(theme.indexOf(".moving-home"), theme.indexOf(".theme-error"));
    expect(movingRules).not.toMatch(/scroll-snap|scroll-behavior:\s*smooth|will-change/u);
    expect(movingRules.match(/@keyframes moving-/gu)).toHaveLength(5);
    expect(movingRules).not.toContain("opacity: 0");
  });

  it("keeps the measured simpler eager dispatch over an unhelpful async boundary", async () => {
    const route = await source("../app/components/PublicPageRoute.vue");
    for (const renderer of [
      "SitePageRenderer",
      "MovingHomeRenderer",
      "MovingServiceRenderer",
      "MovingLocationRenderer",
    ]) {
      expect(route).toContain(`import ${renderer} from`);
    }
    expect(route).not.toContain("defineAsyncComponent");
    expect(route).not.toMatch(/<component|:is=|componentMap|rendererRegistry/u);
  });

  it("adds no motion, browser automation, or performance SDK dependency", async () => {
    const packageJson = JSON.parse(await source("../package.json"));
    const dependencies = JSON.stringify({
      dependencies: packageJson.dependencies,
      devDependencies: packageJson.devDependencies,
    });
    expect(dependencies).not.toMatch(/gsap|scrolltrigger|lenis|puppeteer|playwright|lighthouse|web-vitals/iu);
  });

  it("keeps the interaction-free production theme hydrationless without changing development", async () => {
    const nuxtConfig = await source("../nuxt.config.ts");
    expect(nuxtConfig).toContain('features: { noScripts: "production" }');
    expect(nuxtConfig).toContain("ssr: true");
  });
});

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
