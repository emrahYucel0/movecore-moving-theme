import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const THEME = "../app/assets/css/theme.css";
const HERO = "../app/components/content/moving-home/MovingHero.vue";
const AREAS = "../app/components/content/moving-home/MovingServiceAreas.vue";

describe("R2.16B2 homepage hero", () => {
  it("leads with the content-owned photograph through the media primitive", async () => {
    const hero = await source(HERO);
    expect(hero).toContain('class="moving-media-image moving-media-image--hero"');
    expect(hero).toContain(':src="hero.media.publicUrl"');
    expect(hero).toContain('fetchpriority="high"');
    // No production image path may be pinned into the component.
    expect(hero).not.toMatch(/https?:\/\/|\.jpe?g|\.png|\.webp|\/images\//iu);
  });

  it("lets the photograph run past the document margin without leaving the page", async () => {
    const theme = await source(THEME);
    const media = theme.match(/\.moving-hero__media \{[^}]*\}/u)?.[0] ?? "";
    expect(media).toContain("margin: 0 calc(var(--theme-gutter) * -1) 0 0;");
    // The frame is drawn on the three sides that stay on the page.
    expect(media).toContain("border: 1px solid var(--theme-rule);");
    expect(media).toContain("border-right: 0;");
    // The page still clips, so the bleed can never become overflow.
    expect(theme).toMatch(/\.moving-home \{\n\s*overflow: clip;/u);
  });

  it("stays composed when content carries no hero media", async () => {
    const hero = await source(HERO);
    const theme = await source(THEME);
    expect(hero).toContain("'moving-hero--without-media': !hero.media");
    expect(hero).toContain('<figure v-if="hero.media"');
    // The copy claims the freed columns; no placeholder box is rendered.
    const fallback = theme.match(/\.moving-hero--without-media \.moving-hero__copy \{[^}]*\}/u)?.[0] ?? "";
    expect(fallback).toContain("grid-column: 1 / span 8;");
    expect(theme).not.toMatch(/\.moving-hero__media[^{]*\{[^}]*content: "[^"]+"/u);
  });

  it("stops bleeding once the grid is a single column", async () => {
    const theme = await source(THEME);
    const mobile = theme.slice(theme.indexOf("@media (max-width: 67.9375rem)"));
    const heroMobile = mobile.match(/\n {2}\.moving-hero__media \{[^}]*margin-right[^}]*\}/u)?.[0] ?? "";
    expect(heroMobile).toContain("margin-right: 0;");
    expect(heroMobile).toContain("border-right: 1px solid var(--theme-rule);");
    const assuranceMobile = mobile.match(/\n {2}\.moving-assurance__media \{[^}]*margin-left[^}]*\}/u)?.[0] ?? "";
    expect(assuranceMobile).toContain("margin-left: 0;");
    expect(assuranceMobile).toContain("border-left: 1px solid var(--theme-rule);");
  });
});

describe("R2.16B2 proof strip", () => {
  it("reads as a record band rather than three cards", async () => {
    const theme = await source(THEME);
    const item = theme.match(/\.moving-proof__list li \{[^}]*\}/u)?.[0] ?? "";
    // Rule-separated cells, never a filled rounded block.
    expect(item).toContain("border-right: 1px solid var(--theme-rule);");
    expect(item).not.toMatch(/border-radius|box-shadow|background:/u);
    const claim = theme.match(/\.moving-proof__list strong \{[^}]*\}/u)?.[0] ?? "";
    expect(claim).toContain("font-family: var(--theme-font-display);");
    const label = theme.match(/\.moving-proof__list span \{[^}]*\}/u)?.[0] ?? "";
    expect(label).toContain("font-family: var(--theme-font-mono);");
    expect(label).toContain("border-top: 1px solid var(--theme-rule);");
  });

  it("invents no proof the content does not carry", async () => {
    const proof = await source("../app/components/content/moving-home/MovingProof.vue");
    expect(proof).toContain("{{ item.value }}");
    expect(proof).toContain("{{ item.label }}");
    // Nothing numeric or evidential is manufactured in the component or CSS.
    expect(proof).not.toMatch(/\d{2,}|years|rated|reviews|insured|customers/iu);
    const theme = await source(THEME);
    const proofRules = theme.slice(theme.indexOf(".moving-proof"), theme.indexOf(".moving-home__section {"));
    expect(proofRules).not.toMatch(/content: "[^"]*[0-9A-Za-z]{2}/u);
  });
});

describe("R2.16B2 composition A: photographic field", () => {
  it("gives assurance a field that breaks the margin and a record column", async () => {
    const theme = await source(THEME);
    const media = theme.match(/\.moving-assurance__media \{[^}]*\}/u)?.[0] ?? "";
    expect(media).toContain("margin: 0 0 0 calc(var(--theme-gutter) * -1);");
    expect(media).toContain("border-left: 0;");
    expect(media).toContain("grid-column: 1 / span 7;");
    const copy = theme.match(/\.moving-assurance__copy \{[^}]*\}/u)?.[0] ?? "";
    expect(copy).toContain("grid-column: 9 / -1;");
    // The field is wide, and it still comes from the shared ratio tokens.
    expect(theme).toContain("--theme-media-ratio: var(--theme-media-ratio-service);");
  });

  it("turns the guarantees into a ledger instead of a two-by-two block", async () => {
    const theme = await source(THEME);
    const list = theme.match(/\n\.moving-point-list \{[^}]*\}/u)?.[0] ?? "";
    expect(list).toContain("grid-template-columns: minmax(0, 1fr);");
    expect(list).toContain("counter-reset: moving-point;");
    const item = theme.match(/\n\.moving-point-list li \{[^}]*\}/u)?.[0] ?? "";
    expect(item).toContain("border-bottom: 1px solid var(--theme-rule);");
    expect(item).not.toMatch(/border-radius|box-shadow/u);
    const assurance = await source("../app/components/content/moving-home/MovingAssurance.vue");
    // Presentation only: the guarantees are still exactly the authored points.
    expect(assurance).toContain('v-for="point in section.points"');
    expect(assurance).toContain("{{ point }}");
  });
});

describe("R2.16B2 composition B: editorial record", () => {
  it("puts the statement, a metadata rail and a full-width register on one grid", async () => {
    const theme = await source(THEME);
    const areas = await source(AREAS);
    expect(theme).toContain(".moving-service-areas__note");
    const heading = theme.match(/\.moving-service-areas__heading \{[^}]*\}/u)?.[0] ?? "";
    expect(heading).toContain("grid-column: 1 / span 7;");
    const note = theme.match(/\.moving-service-areas__note \{[^}]*\}/u)?.[0] ?? "";
    expect(note).toContain("grid-column: 9 / -1;");
    expect(note).toContain("border-top: 1px solid var(--theme-rule);");
    // The note is a sibling of the heading, so it can occupy its own column.
    expect(areas).toContain('<p v-if="section.intro" class="moving-service-areas__note">');
    expect(areas.indexOf("moving-service-areas__note")).toBeGreaterThan(areas.indexOf("moving-areas-title"));
  });

  it("fills its band at any number of areas and never becomes a card grid", async () => {
    const theme = await source(THEME);
    // `.moving-area-list` also closes the shared margin/padding reset group, so
    // match the rule that actually lays the register out.
    const list = theme.match(/\n\.moving-area-list \{[^}]*grid-column[^}]*\}/u)?.[0] ?? "";
    expect(list).toContain("grid-column: 1 / -1;");
    // auto-fit collapses the tracks it does not need, so two areas still fill
    // the band and twelve stay compact.
    expect(list).toContain("grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));");
    expect(list).toContain("counter-reset: moving-area;");
    const item = theme.match(/\n\.moving-area-list li \{[^}]*\}/u)?.[0] ?? "";
    expect(item).toContain("border-bottom: 1px solid var(--theme-rule);");
    expect(item).not.toMatch(/border-radius|box-shadow|background:/u);
    // Records are indexed by position, never by an invented statistic.
    expect(theme).toContain('content: counter(moving-area, decimal-leading-zero);');
  });

  it("renders whatever areas the content carries, and nothing else", async () => {
    const areas = await source(AREAS);
    expect(areas).toContain('v-for="area in section.areas"');
    expect(areas).toContain('<PublicActionLink :action="area" />');
    expect(areas).not.toMatch(/riverside|north-district|slice\(|filter\(|\.length\s*[<>]/iu);
  });
});

describe("R2.16B2 homepage rhythm and boundaries", () => {
  it("keeps the audited section order intact", async () => {
    const renderer = await source("../app/components/content/MovingHomeRenderer.vue");
    const order = [
      "MovingHero", "MovingProof", "MovingServices", "MovingProcess", "MovingAssurance",
      "MovingTestimonialCollection", "MovingServiceAreas", "MovingFaqCollection", "MovingFinalAction",
    ];
    const positions = order.map((name) => renderer.indexOf(`<${name}`));
    expect(positions.every((value) => value > 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("separates the two list sections by surface rather than by restyling either", async () => {
    const theme = await source(THEME);
    const process = theme.match(/\.moving-process-section \{[^}]*\}/u)?.[0] ?? "";
    expect(process).toContain("background: var(--theme-surface);");
    // The numbered editorial list and the staged sequence are both untouched.
    expect(theme).toContain(".moving-service-index li::before");
    expect(theme).toContain(".moving-process li::before");
    expect(theme).toContain(".moving-process::after");
  });

  it("leaves the shared collection components alone for their own pages", async () => {
    const testimonials = await source("../app/components/content/moving-commercial/MovingTestimonialCollection.vue");
    const faq = await source("../app/components/content/moving-commercial/MovingFaqCollection.vue");
    for (const component of [testimonials, faq]) {
      expect(component).not.toContain("moving-home");
      expect(component).not.toMatch(/avatar|logo|rating|stars|verified/iu);
    }
    // Testimonials still present exactly what the content carries.
    expect(testimonials).toContain("{{ section.featured.quote }}");
    expect(testimonials).toContain("{{ section.featured.customerName }}");
  });

  it("adds no photography, dependency or client script to the product", async () => {
    const packageJson = JSON.parse(await source("../package.json"));
    expect(Object.keys(packageJson.dependencies)).toEqual(["nuxt", "vue", "vue-router"]);
    expect(await source("../nuxt.config.ts")).toContain('features: { noScripts: "production" }');
    const theme = await source(THEME);
    // No image may be referenced from CSS; media is content-owned.
    expect(theme).not.toMatch(/url\((?!["']?\/fonts\/)/u);
    for (const component of [HERO, AREAS, "../app/components/content/moving-home/MovingAssurance.vue"]) {
      const text = await source(component);
      expect(text).not.toMatch(/onMounted|addEventListener|IntersectionObserver|\$fetch/u);
    }
  });
});

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
