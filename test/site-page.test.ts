import { describe, expect, it } from "vitest";
import {
  parseSitePagePayload,
  SitePageContractError,
} from "../shared/content/site-page";

describe("site.page application contract", () => {
  it("parses a minimal payload and supplies an immutable empty section list", () => {
    const page = parseSitePagePayload({ title: "  Authored title  " });
    expect(page).toEqual({ title: "  Authored title  ", sections: [] });
    expect(Object.isFrozen(page)).toBe(true);
    expect(Object.isFrozen(page.sections)).toBe(true);
  });

  it("parses and freezes a complete payload without rewriting authored text", () => {
    const page = parseSitePagePayload({
      eyebrow: "Structured publishing",
      title: "Complete page",
      intro: "Line one\nLine two",
      heroMedia: { assetId: "asset:hero", alt: "Hero context" },
      sections: [
        { heading: "First", body: "First body" },
        {
          heading: "Second",
          body: "Second body",
          media: { assetId: "asset:section", alt: "Section context" },
        },
      ],
    });

    expect(page.intro).toBe("Line one\nLine two");
    expect(page.heroMedia).toEqual({ assetId: "asset:hero", alt: "Hero context" });
    expect(page.sections[1]?.media?.assetId).toBe("asset:section");
    expect(Object.isFrozen(page.heroMedia)).toBe(true);
    expect(Object.isFrozen(page.sections[1])).toBe(true);
    expect(Object.isFrozen(page.sections[1]?.media)).toBe(true);
  });

  it.each([
    ["missing", {}],
    ["effectively empty", { title: " \n " }],
    ["wrong type", { title: 42 }],
    ["too long", { title: "t".repeat(161) }],
  ])("rejects a %s title", (_case, payload) => {
    expect(() => parseSitePagePayload(payload)).toThrow(SitePageContractError);
  });

  it.each([
    ["eyebrow type", { title: "Page", eyebrow: false }],
    ["eyebrow length", { title: "Page", eyebrow: "e".repeat(81) }],
    ["intro type", { title: "Page", intro: [] }],
    ["intro length", { title: "Page", intro: "i".repeat(601) }],
  ])("rejects invalid optional string: %s", (_case, payload) => {
    expect(() => parseSitePagePayload(payload)).toThrow(SitePageContractError);
  });

  it.each([
    ["wrong shape", { title: "Page", heroMedia: "asset:hero" }],
    ["missing asset", { title: "Page", heroMedia: { alt: "Hero" } }],
    ["blank asset", { title: "Page", heroMedia: { assetId: " ", alt: "Hero" } }],
    ["missing alt", { title: "Page", heroMedia: { assetId: "asset:hero" } }],
    ["blank alt", { title: "Page", heroMedia: { assetId: "asset:hero", alt: " " } }],
    ["long alt", { title: "Page", heroMedia: { assetId: "asset:hero", alt: "a".repeat(201) } }],
  ])("rejects invalid hero media: %s", (_case, payload) => {
    expect(() => parseSitePagePayload(payload)).toThrow(SitePageContractError);
  });

  it("rejects a non-array or sparse sections value", () => {
    expect(() => parseSitePagePayload({ title: "Page", sections: {} }))
      .toThrow(SitePageContractError);
    const sparse = new Array<unknown>(1);
    expect(() => parseSitePagePayload({ title: "Page", sections: sparse }))
      .toThrow(SitePageContractError);
  });

  it.each([
    ["non-object section", { title: "Page", sections: [null] }],
    ["missing heading", { title: "Page", sections: [{ body: "Body" }] }],
    ["body type", { title: "Page", sections: [{ heading: "Heading", body: 3 }] }],
    ["body length", { title: "Page", sections: [{ heading: "Heading", body: "b".repeat(2001) }] }],
    ["media shape", { title: "Page", sections: [{ heading: "Heading", media: [] }] }],
    ["media values", { title: "Page", sections: [{ heading: "Heading", media: { assetId: "asset:x" } }] }],
  ])("rejects an invalid section: %s", (_case, payload) => {
    expect(() => parseSitePagePayload(payload)).toThrow(SitePageContractError);
  });

  it("enforces the 100-section application bound", () => {
    const valid = Array.from({ length: 100 }, (_, index) => ({ heading: `Section ${index}` }));
    expect(parseSitePagePayload({ title: "Page", sections: valid }).sections).toHaveLength(100);
    expect(() => parseSitePagePayload({
      title: "Page",
      sections: [...valid, { heading: "Too many" }],
    })).toThrow(SitePageContractError);
  });

  it("ignores unknown and constructor-like properties without prototype mutation", () => {
    const payload: unknown = JSON.parse(`{
      "title":"Safe page",
      "unknown":{"render":"never"},
      "constructor":{"prototype":{"polluted":true}},
      "__proto__":{"polluted":true},
      "sections":[{"heading":"Safe section","future":true}]
    }`);
    const page = parseSitePagePayload(payload);

    expect(page).toEqual({ title: "Safe page", sections: [{ heading: "Safe section" }] });
    expect(Object.keys(page)).toEqual(["title", "sections"]);
    expect(Object.getPrototypeOf(page)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(page, "__proto__")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(page, "constructor")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted")).toBe(false);
  });

  it("rejects executable accessors without invoking them", () => {
    let invoked = false;
    const payload = { title: "Safe" } as Record<string, unknown>;
    Object.defineProperty(payload, "future", {
      enumerable: true,
      get: () => { invoked = true; return "never"; },
    });
    expect(() => parseSitePagePayload(payload)).toThrow(SitePageContractError);
    expect(invoked).toBe(false);
  });
});
