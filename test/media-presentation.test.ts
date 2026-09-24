import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const THEME = "../app/assets/css/theme.css";

const ROLES = [
  ["hero", "4 / 3"],
  ["service", "3 / 2"],
  ["area", "16 / 9"],
  ["article", "2 / 1"],
] as const;

describe("R2.16B1 media presentation contracts", () => {
  it("declares one ratio per public media role", async () => {
    const theme = await source(THEME);
    for (const [role, ratio] of ROLES) {
      expect(theme).toContain(`--theme-media-ratio-${role}: ${ratio};`);
      expect(theme).toContain(`.moving-media-image--${role} {`);
      expect(theme).toContain(`--theme-media-ratio: var(--theme-media-ratio-${role});`);
    }
  });

  it("reserves the role's space before the file arrives and crops into it", async () => {
    const theme = await source(THEME);
    const primitive = theme.match(/\.theme-media-image,\n\.moving-media-image \{[^}]*\}/u)?.[0] ?? "";
    expect(primitive).toContain("aspect-ratio: var(--theme-media-ratio, var(--theme-media-ratio-service));");
    expect(primitive).toContain("object-fit: cover;");
    expect(primitive).toContain("object-position: var(--theme-media-position);");
    // A quiet product surface rather than a hole while the image is in flight.
    expect(primitive).toContain("background: var(--theme-surface-field);");
  });

  it("keeps aspect ratio a property of the primitive alone", async () => {
    const theme = await source(THEME);
    const declarations = (theme.match(/aspect-ratio:[^;]+;/gu) ?? [])
      .filter((line) => !line.includes("--theme-media-ratio"));
    // The only remaining literals are the decorative signal squares on the hero
    // and assurance frames, which are not images.
    expect(new Set(declarations)).toEqual(new Set(["aspect-ratio: 1;"]));
  });

  it("gives each role its ratio at every width, so a contract stays a contract", async () => {
    const theme = await source(THEME);
    for (const [role] of ROLES) {
      expect(theme.match(new RegExp(`--theme-media-ratio-${role}:`, "gu")) ?? []).toHaveLength(1);
    }
  });

  it("binds the three roles the current content shape can supply", async () => {
    for (const [file, role] of [
      ["../app/components/content/moving-home/MovingHero.vue", "hero"],
      ["../app/components/content/MovingServiceRenderer.vue", "service"],
      ["../app/components/content/MovingLocationRenderer.vue", "area"],
    ] as const) {
      const renderer = await source(file);
      expect(renderer).toContain(`class="moving-media-image moving-media-image--${role}"`);
    }
  });

  it("keeps alt, dimensions and loading priority content-owned and intact", async () => {
    for (const file of [
      "../app/components/content/moving-home/MovingHero.vue",
      "../app/components/content/MovingServiceRenderer.vue",
      "../app/components/content/MovingLocationRenderer.vue",
      "../app/components/content/moving-home/MovingAssurance.vue",
    ]) {
      const renderer = await source(file);
      expect(renderer).toMatch(/:alt="[a-z.]*media\.alt"/u);
      expect(renderer).toMatch(/:width="[a-z.]*media\.width"/u);
      expect(renderer).toMatch(/:height="[a-z.]*media\.height"/u);
      expect(renderer).toContain('decoding="async"');
    }
    const hero = await source("../app/components/content/moving-home/MovingHero.vue");
    expect(hero).toContain('fetchpriority="high"');
    expect(hero).not.toContain('loading="lazy"');
    const assurance = await source("../app/components/content/moving-home/MovingAssurance.vue");
    expect(assurance).toContain('loading="lazy"');
    expect(assurance).not.toContain("fetchpriority");
  });

  it("lays every image out without JavaScript or a loader wrapper", async () => {
    const renderers = await Promise.all([
      "../app/components/content/moving-home/MovingHero.vue",
      "../app/components/content/MovingServiceRenderer.vue",
      "../app/components/content/MovingLocationRenderer.vue",
      "../app/components/content/SitePageRenderer.vue",
    ].map(source));
    const combined = renderers.join("\n");
    expect(combined).toMatch(/<img/u);
    for (const forbidden of ["NuxtImg", "nuxt-img", "IntersectionObserver", "onMounted", "ResizeObserver", ":style="]) {
      expect(combined).not.toContain(forbidden);
    }
  });

  it("answers absent optional media with a type composition, not a placeholder box", async () => {
    const theme = await source(THEME);
    const location = await source("../app/components/content/MovingLocationRenderer.vue");
    // No figure is rendered at all when content carries no image, and the copy
    // claims the freed columns instead of leaving a grey rectangle behind.
    expect(location).toContain('v-if="page.hero.media"');
    expect(theme).toContain(".moving-location-hero--without-media .moving-inner-hero__copy");
    expect(theme).toContain(".moving-inner-hero:not(:has(.moving-inner-hero__media)) .moving-inner-hero__copy");
    expect(theme).toContain(".moving-collection-hero--without-media .moving-collection-hero__copy");
  });

  it("keeps the zero-radius material system intact", async () => {
    const theme = await source(THEME);
    expect(theme).toContain("--theme-radius: 0;");
    const radii = (theme.match(/border-radius:[^;]+;/gu) ?? [])
      .map((line) => line.replace(/border-radius:\s*/u, "").replace(";", "").trim());
    for (const value of radii) {
      expect(["0", "var(--theme-radius)"]).toContain(value);
    }
  });

  it("changes no media persistence, public API or content shape", async () => {
    const media = await source("../shared/content/media.ts");
    expect(media).toContain("readonly assetId: string;");
    expect(media).toContain("readonly alt: string;");
    expect(media).not.toMatch(/ratio|role|crop|focal/iu);
    const article = await source("../shared/content/moving-article.ts");
    // R2.16B3 activated the article cover role. It is Moving-owned, optional and
    // built from the same shared media reference every other type uses.
    expect(article).toContain("readonly coverMedia?: ContentMediaReference;");
    expect(article).toContain("projectContentMediaReference");
    expect(article).not.toMatch(/https?:\/\/|\.jpe?g|\.png|\.webp/iu);
  });
});

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
