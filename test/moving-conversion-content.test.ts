import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  MovingContactContractError,
  MovingQuoteContractError,
  parseMovingContactPayload,
  parseMovingQuotePayload,
} from "../shared/content/moving-conversion";

describe("R2.9B conversion page content", () => {
  it("keeps quote and contact fixtures inside bounded messaging contracts", async () => {
    const quote = parseMovingQuotePayload(await fixture("moving-quote.json"));
    const contact = parseMovingContactPayload(await fixture("moving-contact.json"));
    expect(quote.reassurance.points).toHaveLength(3);
    expect(quote.planning?.body).toContain("dates or property size");
    expect(contact.directContact.title).toBe("Speak with the team directly.");
    expect(contact.formIntroduction.title).toBe("Send a general enquiry.");
  });

  it("rejects unknown page-builder fields and malformed sections", () => {
    expect(() => parseMovingQuotePayload({
      eyebrow: "Quote", title: "Title", intro: "Intro",
      reassurance: { title: "Why", points: [{ text: "One" }, { text: "Two" }] },
      blocks: [],
    })).toThrow(MovingQuoteContractError);
    expect(() => parseMovingContactPayload({
      title: "Contact", intro: "Intro", directContact: {}, formIntroduction: {},
    })).toThrow(MovingContactContractError);
    expect(() => parseMovingContactPayload({
      title: "Contact", intro: "Intro",
      directContact: { title: "Direct", body: "Wrong field name" },
      formIntroduction: { title: "Form", intro: "Intro" },
    })).toThrow(MovingContactContractError);
    expect(() => parseMovingQuotePayload({
      eyebrow: "Quote", title: "Title", intro: "Intro",
      reassurance: { title: "Why", points: [{ text: "One" }, { text: "Two" }] },
      planning: { title: "Plan", intro: "Wrong field name" },
    })).toThrow(MovingQuoteContractError);
  });

  it("renders explicit SSR forms without client-only or unsafe HTML", async () => {
    const quote = await source("../app/components/content/MovingQuoteRenderer.vue");
    const contact = await source("../app/components/content/MovingContactRenderer.vue");
    const route = await source("../app/components/PublicPageRoute.vue");
    for (const [renderer, action] of [[quote, "/api/moving/quote"], [contact, "/api/moving/contact"]]) {
      expect(renderer).toContain("<form");
      expect(renderer).toContain(`action=\"${action}\"`);
      expect(renderer).toContain('method="post"');
      expect(renderer).toContain('name="requestToken"');
      expect(renderer).toContain('name="privacyAcknowledged"');
      expect(renderer).not.toMatch(/ClientOnly|v-html|@submit|\$fetch|Core-Submission/iu);
      expect((renderer.match(/<h1(?:\s|>)/gu) ?? [])).toHaveLength(1);
    }
    expect(contact).toContain("site.business.primaryPhone");
    expect(contact).not.toContain("+1 202-555");
    for (const type of ["moving.quote", "moving.contact"]) expect(route).toContain(type);
  });

  it("defines generic submission allowlisting and buyer-facing editor profiles only", async () => {
    const submissions = JSON.parse(await source("../application/submission-definitions.json"));
    expect(submissions).toEqual({
      version: 1,
      submissions: [
        { type: "moving.quote-request", enabled: true },
        { type: "moving.contact-request", enabled: true },
      ],
    });
    const profiles = JSON.parse(await source("../application/editor-profiles.json")).profiles;
    for (const id of ["moving.quote", "moving.contact"]) {
      const profile = profiles.find((item: { id: string }) => item.id === id);
      expect(profile).toBeDefined();
      expect(JSON.stringify(profile)).not.toMatch(/payload|parser|projection|schema internals|Core implementation/iu);
    }
  });

  it("keeps conversion layout responsive, accessible, and dependency-free", async () => {
    const theme = await source("../app/assets/css/theme.css");
    for (const evidence of [
      ".moving-conversion__layout", ".moving-form", ".moving-privacy-field",
      "@media (max-width: 67.9375rem)", "@media (max-width: 47.9375rem)",
      ":focus-visible", "min-height: 3.25rem",
    ]) expect(theme).toContain(evidence);
    const packageJson = JSON.parse(await source("../package.json"));
    expect(Object.keys(packageJson.dependencies)).toEqual(["nuxt", "vue", "vue-router"]);
  });
});

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(await source(`../application/examples/${name}`));
}

function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
