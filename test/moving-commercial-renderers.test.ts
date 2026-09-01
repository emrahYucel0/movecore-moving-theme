import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const renderers = [
  ["services", "../app/components/content/MovingServicesRenderer.vue"],
  ["areas", "../app/components/content/MovingAreasRenderer.vue"],
  ["faq", "../app/components/content/MovingFaqRenderer.vue"],
  ["testimonials", "../app/components/content/MovingTestimonialsRenderer.vue"],
] as const;

describe.each(renderers)("moving %s collection renderer", (_kind, path) => {
  it("uses an explicit typed renderer with one shared H1 and semantic section hierarchy", async () => {
    const renderer = await source(path);
    const hero = await source("../app/components/content/moving-commercial/MovingCollectionHero.vue");
    const finalAction = await source("../app/components/content/moving-home/MovingFinalAction.vue");
    const combined = `${renderer}\n${hero}\n${finalAction}`;
    expect((combined.match(/<h1(?:\s|>)/gu) ?? [])).toHaveLength(1);
    expect(combined).toContain("<h2");
    expect(combined).toContain("<main");
    expect(combined).toContain("<article");
    expect(combined).toContain("<section");
    expect(combined).toContain("aria-labelledby");
    for (const forbidden of ["v-html", "<component", ":is=", "v-bind=\"page", "target=", "<iframe"]) {
      expect(combined).not.toContain(forbidden);
    }
  });
});

describe("commercial collection semantics", () => {
  it("renders services with authored safe links and optional lazy, dimensioned item media", async () => {
    const renderer = await source("../app/components/content/MovingServicesRenderer.vue");
    expect(renderer).toContain("PublicActionLink");
    expect(renderer).toContain("v-if=\"service.media\"");
    expect(renderer).toContain(":alt=\"service.media.alt\"");
    expect(renderer).toContain(":width=\"service.media.width\"");
    expect(renderer).toContain(":height=\"service.media.height\"");
    expect(renderer).toContain("loading=\"lazy\"");
    expect(renderer).toContain("<h3>");
  });

  it("renders areas as curated contextual links without a map or generated geography", async () => {
    const renderer = await source("../app/components/content/MovingAreasRenderer.vue");
    expect(renderer).toContain("page.coverage.items");
    expect(renderer).toContain("PublicActionLink");
    expect(renderer).not.toMatch(/map|latitude|longitude|geocode/iu);
  });

  it("keeps FAQ fully server-rendered and readable without an accordion script", async () => {
    const renderer = await source("../app/components/content/MovingFaqRenderer.vue");
    const collection = await source("../app/components/content/moving-commercial/MovingFaqCollection.vue");
    for (const text of [renderer, collection]) {
      expect(text).toContain("item.question");
      expect(text).toContain("item.answer");
      expect(text).not.toMatch(/@click|v-html|accordion|client-only/iu);
    }
  });

  it("uses semantic editorial quotes without ratings, platform badges or carousel code", async () => {
    const renderer = await source("../app/components/content/MovingTestimonialsRenderer.vue");
    const collection = await source("../app/components/content/moving-commercial/MovingTestimonialCollection.vue");
    const combined = `${renderer}\n${collection}`;
    expect(combined).toContain("<blockquote");
    expect(combined).toContain("customerName");
    expect(combined).toContain("serviceLabel");
    expect(combined).not.toMatch(/rating|stars?|Google|Trustpilot|Yelp|carousel/iu);
  });

  it("keeps homepage proof and FAQ sections optional", async () => {
    const renderer = await source("../app/components/content/MovingHomeRenderer.vue");
    expect(renderer).toContain("v-if=\"page.customerProof\"");
    expect(renderer).toContain("v-if=\"page.frequentQuestions\"");
    expect(renderer).toContain("MovingTestimonialCollection");
    expect(renderer).toContain("MovingFaqCollection");
  });

  it("dispatches every collection renderer explicitly without a dynamic registry", async () => {
    const route = await source("../app/components/PublicPageRoute.vue");
    for (const [type, renderer] of [
      ["moving.services", "MovingServicesRenderer"],
      ["moving.areas", "MovingAreasRenderer"],
      ["moving.faq", "MovingFaqRenderer"],
      ["moving.testimonials", "MovingTestimonialsRenderer"],
    ]) {
      expect(route).toContain(`page?.type === '${type}'`);
      expect(route).toContain(`<${renderer}`);
    }
    expect(route).not.toMatch(/component\s*:is|rendererRegistry|componentMap/iu);
  });
});

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
