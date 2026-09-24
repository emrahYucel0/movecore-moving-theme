import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseMovingArticlePayload } from "../shared/content/moving-article";

const THEME = "../app/assets/css/theme.css";
const SERVICE = "../app/components/content/MovingServiceRenderer.vue";
const LOCATION = "../app/components/content/MovingLocationRenderer.vue";
const ARTICLE = "../app/components/content/MovingArticleRenderer.vue";
const QUOTE = "../app/components/content/MovingQuoteRenderer.vue";
const CONTACT = "../app/components/content/MovingContactRenderer.vue";

const article = (extra: Record<string, unknown> = {}) => ({
  title: "Moving an office",
  excerpt: "What changes when a workplace moves.",
  body: [{ heading: "Plan", paragraphs: [{ text: "Agree the sequence first." }] }],
  ...extra,
});

describe("R2.16B3 article cover contract", () => {
  it("accepts an article published before the cover existed", () => {
    const parsed = parseMovingArticlePayload(article());
    expect(parsed.coverMedia).toBeUndefined();
    expect(parsed.title).toBe("Moving an office");
    expect(Object.hasOwn(parsed, "coverMedia")).toBe(false);
  });

  it("accepts an article that carries one", () => {
    const parsed = parseMovingArticlePayload(article({
      coverMedia: { assetId: "asset:cover", alt: "A removals van at the kerb" },
    }));
    expect(parsed.coverMedia).toEqual({ assetId: "asset:cover", alt: "A removals van at the kerb" });
  });

  it("rejects a malformed cover rather than dropping it silently", () => {
    for (const cover of [
      { assetId: "asset:cover" },
      { alt: "No asset" },
      { assetId: "asset:cover", alt: "" },
      { assetId: "", alt: "Empty asset" },
      "asset:cover",
      [],
    ]) {
      expect(() => parseMovingArticlePayload(article({ coverMedia: cover }))).toThrow();
    }
  });

  it("uses the same media reference shape as every other content type", async () => {
    const source = await readSource("../shared/content/moving-article.ts");
    expect(source).toContain("projectContentMediaReference");
    expect(source).toContain("readonly coverMedia?: ContentMediaReference;");
    // One media schema for the whole application, not a second one for articles.
    expect(source).not.toMatch(/interface\s+\w*(?:Cover|Image)\w*\s*\{/u);
  });

  it("resolves the cover through the shared media resolver, adding no Core dependency", async () => {
    const composition = await readSource("../server/public-page/application-content.ts");
    expect(composition).toContain("export async function composeMovingArticle(");
    expect(composition).toContain("resolveReferencedMedia(movingArticleAssetIds(content), client)");
    const route = await readSource("../server/public-page/route.ts");
    expect(route).toContain("await composeMovingArticle(result.page, resolver)");
  });

  it("keeps the cover optional and Moving-owned in the editor profile", async () => {
    const manifest = JSON.parse(await readSource("../application/editor-profiles.json"));
    const profile = manifest.profiles.find((entry: { contentType: string }) =>
      entry.contentType === "moving.article");
    const cover = profile.fields.find((entry: { key: string }) => entry.key === "coverMedia");
    expect(cover.required).toBe(false);
    expect(cover.kind).toBe("group");
    expect(cover.fields.map((entry: { key: string }) => entry.key)).toEqual(["assetId", "alt"]);
    expect(cover.fields[0].kind).toBe("media");
  });
});

describe("R2.16B3 article presentation", () => {
  it("renders the cover through the 2:1 media role and only when content has one", async () => {
    const renderer = await readSource(ARTICLE);
    expect(renderer).toContain('<figure v-if="page.coverMedia" class="moving-article-cover">');
    expect(renderer).toContain('class="moving-media-image moving-media-image--article"');
    expect(renderer).toContain(':alt="page.coverMedia.alt"');
    expect(renderer).toContain(':width="page.coverMedia.width"');
    expect(renderer).toContain(':height="page.coverMedia.height"');
    // Below the standfirst, so it is not a priority image.
    expect(renderer).toContain('loading="lazy"');
    expect(renderer).not.toContain("fetchpriority");
    expect(renderer).not.toMatch(/https?:\/\/|\.jpe?g|\.png|\.webp/iu);
  });

  it("leaves no empty band when an article has no cover", async () => {
    const theme = await readSource(THEME);
    // The hero's own closing rule separates hero from body, so the first
    // section must not draw a second rule across an empty gap.
    expect(theme).toContain(".moving-article-body > .moving-article-section:first-child");
    const first = theme.match(/\.moving-article-body > \.moving-article-section:first-child \{[^}]*\}/u)?.[0] ?? "";
    expect(first).toContain("border-top: 0;");
    expect(first).toContain("padding-top: 0;");
    // No placeholder is styled for the absent case.
    expect(theme).not.toMatch(/\.moving-article-cover[^{]*\{[^}]*content: "/u);
  });

  it("closes the article with the site's own final action rather than the footer", async () => {
    const renderer = await readSource(ARTICLE);
    expect(renderer).toContain("import MovingFinalAction from");
    expect(renderer).toContain('<MovingFinalAction :section="articleAction" />');
    expect(renderer).toContain('href: "/quote"');
    expect(renderer).toContain('href: "/contact"');
    // Existing public routes only, and no claim about the business.
    expect(renderer).not.toMatch(/\b(?:guaranteed?|fastest|cheapest|award|rated)\b|\d+\s*(?:years|moves|customers)/iu);
    expect(renderer.indexOf("<MovingFinalAction")).toBeGreaterThan(renderer.indexOf("moving-article-footer"));
  });
});

describe("R2.16B3 service detail", () => {
  it("keeps the authored body order and final action untouched", async () => {
    const renderer = await readSource(SERVICE);
    const order = ["moving-service-hero", "moving-service-overview", "moving-service-included",
      "moving-service-process", "moving-related-services", "<MovingFinalAction"];
    const positions = order.map((name) => renderer.indexOf(name));
    expect(positions.every((value) => value > 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(renderer).toContain('v-for="item in page.relatedServices.items"');
    expect(renderer).toContain('<MovingFinalAction :section="page.finalAction" />');
  });

  it("renders whatever photograph the record carries, through the 3:2 role", async () => {
    const renderer = await readSource(SERVICE);
    expect(renderer).toContain('v-if="page.hero.media"');
    expect(renderer).toContain('class="moving-media-image moving-media-image--service"');
    expect(renderer).toContain(':src="page.hero.media.publicUrl"');
    expect(renderer).toContain('fetchpriority="high"');
    // Nothing pins a particular image to a particular service.
    expect(renderer).not.toMatch(/https?:\/\/|\.jpe?g|\.png|home-moving|office-relocation/iu);
    const theme = await readSource(THEME);
    expect(theme).not.toMatch(/\.moving-service-hero[^{]*\{[^}]*background-image/u);
  });

  it("gives the service hero its own ruled variant of the shared inner hero", async () => {
    const theme = await readSource(THEME);
    const variant = theme.match(/\n\.moving-service-hero \{[^}]*\}/u)?.[0] ?? "";
    expect(variant).toContain("align-items: start;");
    const media = theme.match(/\.moving-service-hero \.moving-inner-hero__media \{[^}]*\}/u)?.[0] ?? "";
    expect(media).toContain("margin-right: calc(var(--theme-gutter) * -1);");
    expect(media).toContain("border-right: 0;");
    // Still built on the shared foundation rather than a separate hero.
    expect(await readSource(SERVICE)).toContain('class="moving-inner-hero moving-service-hero"');
  });
});

describe("R2.16B3 area detail", () => {
  it("composes the hero as identity, environment and access note", async () => {
    const renderer = await readSource(LOCATION);
    expect(renderer).toContain('class="moving-inner-hero moving-location-hero"');
    expect(renderer).toContain('<p class="moving-location-hero__note">{{ page.hero.intro }}</p>');
    expect(renderer).toContain('class="moving-media-image moving-media-image--area"');
    const theme = await readSource(THEME);
    const copy = theme.match(/\.moving-location-hero \.moving-inner-hero__copy \{[^}]*\}/u)?.[0] ?? "";
    expect(copy).toContain("grid-row: 1 / span 2;");
    const media = theme.match(/\n\.moving-location-hero__media \{[^}]*\}/u)?.[0] ?? "";
    expect(media).toContain("grid-column: 7 / -1;");
  });

  it("keeps the no-media state authored rather than merely safe", async () => {
    const renderer = await readSource(LOCATION);
    expect(renderer).toContain("'moving-location-hero--without-media': page.hero.media === undefined");
    expect(renderer).toContain('<figure v-if="page.hero.media"');
    const theme = await readSource(THEME);
    // The closing rule runs the full measure instead of stopping where a
    // photograph would have begun.
    const rule = theme.match(/\.moving-location-hero--without-media::after \{[^}]*\}/u)?.[0] ?? "";
    expect(rule).toContain("grid-column: 1 / -1;");
    expect(rule).toContain("border-top: 1px solid var(--theme-ink);");
    // And no placeholder box is drawn.
    expect(theme).not.toMatch(/\.moving-location-hero--without-media[^{]*\{[^}]*background-image/u);
  });

  it("still excludes the current page from nearby areas and invents no place", async () => {
    const renderer = await readSource(LOCATION);
    expect(renderer).toContain("withoutSelfLinks(");
    expect(renderer).toContain("publicPathname(route)");
    expect(renderer).toContain('v-if="nearbyAreas.length > 0"');
    expect(renderer).not.toMatch(/riverside|north-district|harbour|eastgate/iu);
    const theme = await readSource(THEME);
    expect(theme).not.toMatch(/riverside|north-district/iu);
  });
});

describe("R2.16B3 quote and contact", () => {
  it("fills the quote hero with the expectation record the content already carries", async () => {
    const renderer = await readSource(QUOTE);
    expect(renderer).toContain('class="moving-conversion__record"');
    expect(renderer).toContain("{{ page.reassurance.title }}");
    expect(renderer).toContain('v-for="point in page.reassurance.points"');
    // Promoted, not duplicated: it appears once.
    expect(renderer.match(/page\.reassurance\.points/gu) ?? []).toHaveLength(1);
    // The optional planning block no longer leaves an empty aside behind.
    expect(renderer).toContain('<aside v-if="page.planning"');
  });

  it("builds the contact dispatch record from the business projection", async () => {
    const renderer = await readSource(CONTACT);
    expect(renderer).toContain('class="moving-conversion__record moving-contact__dispatch"');
    expect(renderer).toContain(':href="site.business.primaryPhone.href"');
    expect(renderer).toContain('v-if="site.business.whatsapp"');
    // Nothing hardcoded, and each value appears once across the page.
    expect(renderer).not.toMatch(/tel:\+?[0-9]|@example|\+\d[\d\s-]{6,}/u);
    for (const path of ["site.business.primaryPhone.href", "site.business.whatsapp.href",
      "site.business.email.href"]) {
      expect(renderer.match(new RegExp(path.replace(/\./gu, "\\."), "gu")) ?? []).toHaveLength(1);
    }
    // The address appears twice by design: once as its own guard, once as the
    // value that guard protects.
    expect(renderer.match(/site\.business\.address/gu) ?? []).toHaveLength(2);
    // A missing optional value omits its row rather than showing a blank label.
    for (const guard of ['v-if="site.business.email"', 'v-if="site.business.address"',
      'v-if="site.business.openingHours.length > 0"']) {
      expect(renderer).toContain(guard);
    }
  });

  it("leaves both submission forms and their contracts alone", async () => {
    const quote = await readSource(QUOTE);
    const contact = await readSource(CONTACT);
    expect(quote).toContain('action="/api/moving/quote"');
    expect(contact).toContain('action="/api/moving/contact"');
    for (const renderer of [quote, contact]) {
      expect(renderer).toContain('method="post"');
      expect(renderer).toContain('enctype="application/x-www-form-urlencoded"');
      expect(renderer).toContain('name="requestToken"');
      expect(renderer).toContain('name="privacyAcknowledged"');
      expect(renderer).not.toMatch(/onMounted|addEventListener|@submit|v-model/u);
    }
    expect(quote.match(/<input |<select |<textarea /gu) ?? []).toHaveLength(15);
  });

  it("keeps the conversion heroes type-and-record, never photographic", async () => {
    const theme = await readSource(THEME);
    const record = theme.match(/\n\.moving-conversion__record \{[^}]*\}/u)?.[0] ?? "";
    expect(record).toContain("grid-column: 9 / -1;");
    expect(record).toContain("border-top: 1px solid var(--theme-ink);");
    const quote = await readSource(QUOTE);
    const contact = await readSource(CONTACT);
    for (const renderer of [quote, contact]) expect(renderer).not.toContain("<img");
  });
});

describe("R2.16B3 interaction targets", () => {
  it("gives standalone controls a 44px box without enlarging their type", async () => {
    const theme = await readSource(THEME);
    for (const selector of [
      /\.theme-footer__primary-phone \{[^}]*\}/u,
      /\n\.theme-nav-link \{[^}]*\}/u,
      /\.moving-contact__quote-link \{[^}]*\}/u,
      /\.moving-contact__details dd a \{[^}]*\}/u,
    ]) {
      const rule = theme.match(selector)?.[0] ?? "";
      expect(rule).toContain("min-height: 2.75rem;");
      expect(rule).toContain("display: inline-flex;");
      expect(rule).not.toMatch(/font-size:\s*(?:[3-9]|\d\d)/u);
    }
    expect(theme.match(/\n\.theme-nav-link \{[^}]*\}/u)?.[0]).toContain("min-width: 2.75rem;");
  });

  it("leaves inline prose links as readable text", async () => {
    const theme = await readSource(THEME);
    // The consent link lives inside a sentence; blockifying it would break the
    // line. It gets spacing and a visible treatment instead.
    const privacy = theme.match(/\.moving-privacy-field \{[^}]*\}/u)?.[0] ?? "";
    expect(privacy).toContain("line-height: 1.55;");
    const links = theme.match(/\.moving-privacy-field a,[^{]*\{[^}]*\}/u)?.[0] ?? "";
    expect(links).toContain("var(--theme-signal-strong)");
    expect(links).not.toContain("min-height");
  });
});

async function readSource(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
