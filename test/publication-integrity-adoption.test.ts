import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  defineContentEditorProfiles,
  validateProfilePayloadForPublication,
  type ContentEditorProfile,
} from "../../core-cms/packages/admin-application/dist/index.js";
import { parseSitePagePayload } from "../shared/content/site-page";
import { parseMovingHomePayload } from "../shared/content/moving-home";
import { parseMovingServicePayload } from "../shared/content/moving-service";
import { parseMovingLocationPayload } from "../shared/content/moving-location";
import { parseMovingServicesPayload } from "../shared/content/moving-services";
import { parseMovingAreasPayload } from "../shared/content/moving-areas";
import { parseMovingFaqPayload } from "../shared/content/moving-faq";
import { parseMovingTestimonialsPayload } from "../shared/content/moving-testimonials";
import { parseMovingQuotePayload, parseMovingContactPayload } from "../shared/content/moving-conversion";
import { parseMovingArticlePayload } from "../shared/content/moving-article";

type JsonObject = Record<string, unknown>;
type Parser = (payload: unknown) => unknown;

const ENFORCED_TYPES = [
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
] as const;

const NEWLY_ENFORCED = [
  ["site.page", "site-page-detail.json", parseSitePagePayload],
  ["moving.service", "moving-service.json", parseMovingServicePayload],
  ["moving.location", "moving-location.json", parseMovingLocationPayload],
  ["moving.services", "moving-services.json", parseMovingServicesPayload],
  ["moving.areas", "moving-areas.json", parseMovingAreasPayload],
  ["moving.faq", "moving-faq.json", parseMovingFaqPayload],
  ["moving.testimonials", "moving-testimonials.json", parseMovingTestimonialsPayload],
] as const satisfies readonly (readonly [string, string, Parser])[];

const FINAL_ADOPTION = [
  ["moving.home", "moving-home.json", parseMovingHomePayload],
  ["moving.quote", "moving-quote.json", parseMovingQuotePayload],
  ["moving.contact", "moving-contact.json", parseMovingContactPayload],
] as const satisfies readonly (readonly [string, string, Parser])[];

describe("R2.12F final Moving publication integrity adoption", () => {
  it("loads the complete manifest in committed Core and enforces every public parser-backed profile", async () => {
    const profiles = defineContentEditorProfiles(await profilesFromManifest());
    expect(profiles.map((profile) => profile.contentType)).toEqual([
      "site.page", "moving.home", "moving.service", "moving.location", "moving.services",
      "moving.areas", "moving.faq", "moving.testimonials", "moving.quote", "moving.contact",
      "moving.article",
    ]);
    expect(profiles.filter((profile) => profile.enforceOnPublish === true)
      .map((profile) => profile.contentType)).toEqual(ENFORCED_TYPES);
    expect(profiles.filter((profile) => profile.enforceOnPublish !== true)
      .map((profile) => profile.contentType)).toEqual([]);
  });

  it.each(NEWLY_ENFORCED)(
    "%s accepts both minimum and representative parser-valid payloads",
    async (type, fixtureName, parse) => {
      const contentProfile = await loadProfile(type);
      const representative = await fixture(fixtureName);
      const minimum = minimumPayload(type, representative);
      for (const payload of [minimum, representative]) {
        expect(() => parse(payload)).not.toThrow();
        expect(validateProfilePayloadForPublication(contentProfile, payload)).toEqual({
          valid: true,
          reasons: [],
        });
      }
    },
  );

  it.each(NEWLY_ENFORCED)(
    "%s rejects the same representative invariant classes in parser and Core",
    async (type, fixtureName, parse) => {
      const contentProfile = await loadProfile(type);
      for (const payload of invalidPayloads(type, await fixture(fixtureName))) {
        expect(() => parse(payload)).toThrow();
        expect(validateProfilePayloadForPublication(contentProfile, payload).valid).toBe(false);
      }
    },
  );

  it("keeps moving.article unchanged, enforced, and parser-equivalent", async () => {
    const article = await loadProfile("moving.article");
    expect(article.enforceOnPublish).toBe(true);
    expect(article.fields).toMatchObject([
      { key: "title", maxLength: 180 },
      { key: "excerpt", maxLength: 600 },
      {
        key: "body", minItems: 1, maxItems: 24,
        fields: [
          { key: "heading", maxLength: 160 },
          { key: "paragraphs", minItems: 1, maxItems: 12, fields: [{ maxLength: 2_000 }] },
        ],
      },
    ]);
    for (const name of [
      "moving-article-access.json", "moving-article-packing.json", "moving-article-office.json",
    ]) {
      const payload = await fixture(name);
      expect(() => parseMovingArticlePayload(payload)).not.toThrow();
      expect(validateProfilePayloadForPublication(article, payload).valid).toBe(true);
    }
  });

  it.each(FINAL_ADOPTION)(
    "%s accepts minimum and representative parser-valid payloads",
    async (type, name, parse) => {
      const representative = await fixture(name);
      for (const payload of [finalMinimumPayload(type, representative), representative]) {
        expect(() => parse(payload)).not.toThrow();
        expect(validateProfilePayloadForPublication(await loadProfile(type), payload)).toEqual({
          valid: true,
          reasons: [],
        });
      }
    },
  );

  it.each(FINAL_ADOPTION)(
    "%s rejects every profile-representable source invariant in both boundaries",
    async (type, name, parse) => {
      for (const payload of finalInvalidPayloads(type, await fixture(name))) {
        expect(() => parse(payload)).toThrow();
        expect(validateProfilePayloadForPublication(await loadProfile(type), payload).valid).toBe(false);
      }
    },
  );

  it("matches optional moving.home customer proof and both uniqueness scopes", async () => {
    const profile = await loadProfile("moving.home");
    const withoutProof = await fixture("moving-home.json");
    delete withoutProof["customerProof"];
    expect(() => parseMovingHomePayload(withoutProof)).not.toThrow();
    expect(validateProfilePayloadForPublication(profile, withoutProof).valid).toBe(true);

    const representative = await fixture("moving-home.json");
    expect(() => parseMovingHomePayload(representative)).not.toThrow();
    expect(validateProfilePayloadForPublication(profile, representative).valid).toBe(true);

    for (const payload of [
      changed(representative, (value) => {
        const items = array(object(value, "customerProof"), "items");
        items[1] = structuredClone(items[0]);
      }),
      changed(representative, (value) => {
        const proof = object(value, "customerProof");
        const item = objectAt(array(proof, "items"), 0);
        const featured = object(proof, "featured");
        item["customerName"] = ` ${String(featured["customerName"]).toUpperCase()} `;
        item["quote"] = ` ${String(featured["quote"]).toUpperCase()} `;
      }),
      changed(representative, (value) => { value["customerProof"] = {}; }),
    ]) {
      expect(() => parseMovingHomePayload(payload)).toThrow();
      expect(validateProfilePayloadForPublication(profile, payload).valid).toBe(false);
    }
  });

  it.each([
    ["moving.quote", "moving-quote.json", parseMovingQuotePayload, "reassurance"],
    ["moving.contact", "moving-contact.json", parseMovingContactPayload, "directContact"],
  ] as const)("enforces %s exact-record semantics without mutating malformed drafts", async (
    type, name, parse, nestedKey,
  ) => {
    const profile = await loadProfile(type);
    const valid = await fixture(name);
    expect(() => parse(valid)).not.toThrow();
    expect(validateProfilePayloadForPublication(profile, valid).valid).toBe(true);
    for (const payload of [
      changed(valid, (value) => { value["futureRoot"] = { preserved: true }; }),
      changed(valid, (value) => { object(value, nestedKey)["futureNested"] = "preserved"; }),
    ]) {
      const before = structuredClone(payload);
      expect(() => parse(payload)).toThrow();
      expect(validateProfilePayloadForPublication(profile, payload).valid).toBe(false);
      expect(payload).toEqual(before);
    }
  });

  it("keeps every canonical fixture parser-valid and valid under its final enforced profile", async () => {
    const fixtures = [
      ["site.page", "site-page-detail.json", parseSitePagePayload],
      ["site.page", "site-page-home.json", parseSitePagePayload],
      ["moving.home", "moving-home.json", parseMovingHomePayload],
      ["moving.service", "moving-service.json", parseMovingServicePayload],
      ["moving.location", "moving-location.json", parseMovingLocationPayload],
      ["moving.services", "moving-services.json", parseMovingServicesPayload],
      ["moving.areas", "moving-areas.json", parseMovingAreasPayload],
      ["moving.faq", "moving-faq.json", parseMovingFaqPayload],
      ["moving.testimonials", "moving-testimonials.json", parseMovingTestimonialsPayload],
      ["moving.quote", "moving-quote.json", parseMovingQuotePayload],
      ["moving.contact", "moving-contact.json", parseMovingContactPayload],
      ["moving.article", "moving-article-access.json", parseMovingArticlePayload],
      ["moving.article", "moving-article-packing.json", parseMovingArticlePayload],
      ["moving.article", "moving-article-office.json", parseMovingArticlePayload],
    ] as const satisfies readonly (readonly [string, string, Parser])[];
    for (const [type, name, parse] of fixtures) {
      const payload = await fixture(name);
      expect(() => parse(payload)).not.toThrow();
      expect(validateProfilePayloadForPublication(await loadProfile(type), payload).valid).toBe(true);
    }
  });
});

function finalMinimumPayload(type: string, source: JsonObject): JsonObject {
  const payload = structuredClone(source);
  delete payload["eyebrow"];
  if (type === "moving.home") delete payload["customerProof"];
  if (type === "moving.quote") delete payload["planning"];
  return payload;
}

function finalInvalidPayloads(type: string, source: JsonObject): readonly JsonObject[] {
  if (type === "moving.home") return [
    changed(source, (payload) => { object(payload, "hero")["title"] = "x".repeat(10_000); }),
    changed(source, (payload) => { object(payload, "customerProof")["items"] = []; }),
    changed(source, (payload) => { object(object(payload, "hero"), "primaryAction")["href"] = "javascript:alert(1)"; }),
    changed(source, (payload) => {
      const items = array(object(payload, "customerProof"), "items");
      items[1] = structuredClone(items[0]);
    }),
    changed(source, (payload) => {
      const proof = object(payload, "customerProof");
      objectAt(array(proof, "items"), 0)["customerName"] = object(proof, "featured")["customerName"];
      objectAt(array(proof, "items"), 0)["quote"] = object(proof, "featured")["quote"];
    }),
  ];
  if (type === "moving.quote") return [
    changed(source, (payload) => { payload["title"] = "x".repeat(181); }),
    changed(source, (payload) => { object(payload, "reassurance")["points"] = [{ text: "Only one" }]; }),
    changed(source, (payload) => { payload["futureRoot"] = true; }),
    changed(source, (payload) => { object(payload, "reassurance")["futureNested"] = true; }),
    changed(source, (payload) => { objectAt(array(object(payload, "reassurance"), "points"), 0)["futureNested"] = true; }),
  ];
  return [
    changed(source, (payload) => { payload["title"] = "x".repeat(181); }),
    changed(source, (payload) => { delete object(payload, "directContact")["title"]; }),
    changed(source, (payload) => { payload["futureRoot"] = true; }),
    changed(source, (payload) => { object(payload, "directContact")["futureNested"] = true; }),
  ];
}

function minimumPayload(type: string, source: JsonObject): JsonObject {
  const payload = structuredClone(source);
  if (type === "site.page") return { title: payload["title"] };
  removeOptionalCopy(type, payload);
  if (type === "moving.service") {
    array(object(payload, "overview"), "points").length = 2;
    array(object(payload, "included"), "items").length = 3;
    array(object(payload, "process"), "steps").length = 3;
    array(object(payload, "relatedServices"), "items").length = 2;
  } else if (type === "moving.location") {
    array(object(payload, "overview"), "highlights").length = 2;
    array(object(payload, "services"), "items").length = 2;
    array(object(payload, "localDetails"), "items").length = 2;
    array(object(payload, "nearbyAreas"), "items").length = 2;
  } else if (type === "moving.services") {
    array(object(payload, "portfolio"), "items").length = 2;
    array(object(payload, "context"), "points").length = 2;
  } else if (type === "moving.areas") {
    array(object(payload, "coverage"), "items").length = 2;
    array(object(payload, "planning"), "points").length = 2;
  } else if (type === "moving.faq") {
    array(payload, "items").length = 3;
  } else if (type === "moving.testimonials") {
    array(payload, "items").length = 2;
    delete object(payload, "featured")["context"];
    delete object(payload, "featured")["serviceLabel"];
    for (const item of array(payload, "items")) {
      delete record(item)["context"];
      delete record(item)["serviceLabel"];
    }
  }
  return payload;
}

function removeOptionalCopy(type: string, payload: JsonObject): void {
  const hero = object(payload, "hero");
  delete hero["eyebrow"];
  delete hero["media"];
  const finalAction = object(payload, "finalAction");
  delete finalAction["eyebrow"];
  delete finalAction["body"];
  delete finalAction["secondaryAction"];
  if (type === "moving.service") {
    for (const key of ["included", "process"]) {
      const section = object(payload, key);
      delete section["eyebrow"];
      delete section["intro"];
    }
    delete object(payload, "relatedServices")["eyebrow"];
    for (const item of array(object(payload, "included"), "items")) delete record(item)["description"];
    for (const item of array(object(payload, "relatedServices"), "items")) delete record(item)["description"];
  } else if (type === "moving.location") {
    const services = object(payload, "services");
    delete services["eyebrow"];
    delete services["intro"];
    for (const item of array(services, "items")) delete record(item)["description"];
    delete object(payload, "localDetails")["eyebrow"];
    delete object(payload, "nearbyAreas")["eyebrow"];
  } else if (type === "moving.services") {
    const portfolio = object(payload, "portfolio");
    delete portfolio["intro"];
    for (const item of array(portfolio, "items")) delete record(item)["media"];
  }
}

function invalidPayloads(type: string, source: JsonObject): readonly JsonObject[] {
  const required = changed(source, (payload) => { delete payload[requiredRoot(type)]; });
  const tooLong = changed(source, (payload) => {
    const target = type === "site.page" ? payload : object(payload, "hero");
    target["title"] = "x".repeat(181);
  });
  if (type === "site.page") {
    return [required, changed(source, (payload) => {
      payload["sections"] = Array.from({ length: 101 }, () => ({ heading: "Section" }));
    })];
  }
  const unsafeLink = changed(source, (payload) => {
    const action = object(object(payload, "finalAction"), "primaryAction");
    action["href"] = "javascript:alert(1)";
  });
  if (type === "moving.service") return [
    required,
    tooLong,
    unsafeLink,
    changed(source, (payload) => { object(payload, "overview")["points"] = []; }),
    changed(source, (payload) => {
      object(payload, "included")["items"] = Array.from({ length: 9 }, () => ({ title: "Item" }));
    }),
  ];
  if (type === "moving.location") return [
    required,
    tooLong,
    unsafeLink,
    changed(source, (payload) => { object(payload, "services")["items"] = []; }),
  ];
  if (type === "moving.services") return [
    required,
    tooLong,
    unsafeLink,
    changed(source, (payload) => {
      const items = array(object(payload, "portfolio"), "items");
      objectAt(items, 1)["href"] = objectAt(items, 0)["href"];
    }),
  ];
  if (type === "moving.areas") return [
    required,
    tooLong,
    unsafeLink,
    changed(source, (payload) => {
      const items = array(object(payload, "coverage"), "items");
      objectAt(items, 1)["href"] = objectAt(items, 0)["href"];
    }),
  ];
  if (type === "moving.faq") return [
    required,
    tooLong,
    unsafeLink,
    changed(source, (payload) => {
      const items = array(payload, "items");
      objectAt(items, 1)["question"] = `  ${String(objectAt(items, 0)["question"]).toUpperCase()}  `;
    }),
  ];
  return [
    required,
    tooLong,
    unsafeLink,
    changed(source, (payload) => {
      const items = array(payload, "items");
      items[1] = structuredClone(items[0]);
    }),
    changed(source, (payload) => {
      const featured = object(payload, "featured");
      const first = objectAt(array(payload, "items"), 0);
      first["customerName"] = ` ${String(featured["customerName"]).toUpperCase()} `;
      first["quote"] = ` ${String(featured["quote"]).toUpperCase()} `;
    }),
  ];
}

function requiredRoot(type: string): string {
  return type === "site.page" ? "title" : type === "moving.testimonials" ? "featured" : "hero";
}

function changed(source: JsonObject, change: (payload: JsonObject) => void): JsonObject {
  const payload = structuredClone(source);
  change(payload);
  return payload;
}

async function profilesFromManifest(): Promise<readonly ContentEditorProfile[]> {
  const manifest = record(JSON.parse(await readFile(
    new URL("../application/editor-profiles.json", import.meta.url), "utf8",
  )));
  if (!Array.isArray(manifest["profiles"])) throw new Error("Missing profiles");
  return manifest["profiles"] as unknown as readonly ContentEditorProfile[];
}

async function loadProfile(contentType: string): Promise<ContentEditorProfile> {
  const result = (await profilesFromManifest()).find((item) => item.contentType === contentType);
  if (result === undefined) throw new Error(`Missing profile ${contentType}`);
  return result;
}

async function fixture(name: string): Promise<JsonObject> {
  return record(JSON.parse(await readFile(
    new URL(`../application/examples/${name}`, import.meta.url), "utf8",
  )));
}

function object(source: JsonObject, key: string): JsonObject {
  return record(source[key]);
}

function objectAt(source: unknown[], index: number): JsonObject {
  return record(source[index]);
}

function array(source: JsonObject, key: string): unknown[] {
  const result = source[key];
  if (!Array.isArray(result)) throw new Error(`Expected array ${key}`);
  return result;
}

function record(value: unknown): JsonObject {
  if (!isRecord(value)) throw new Error("Expected object");
  return value;
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
