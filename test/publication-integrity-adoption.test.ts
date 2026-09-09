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
  "moving.service",
  "moving.location",
  "moving.services",
  "moving.areas",
  "moving.faq",
  "moving.testimonials",
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

describe("R2.12D Moving publication integrity adoption", () => {
  it("loads the complete manifest in committed Core and enforces only proven profiles", async () => {
    const profiles = defineContentEditorProfiles(await profilesFromManifest());
    expect(profiles.map((profile) => profile.contentType)).toEqual([
      "site.page", "moving.home", "moving.service", "moving.location", "moving.services",
      "moving.areas", "moving.faq", "moving.testimonials", "moving.quote", "moving.contact",
      "moving.article",
    ]);
    expect(profiles.filter((profile) => profile.enforceOnPublish === true)
      .map((profile) => profile.contentType)).toEqual(ENFORCED_TYPES);
    expect(profiles.filter((profile) => profile.enforceOnPublish !== true)
      .map((profile) => profile.contentType)).toEqual([
      "moving.home", "moving.quote", "moving.contact",
    ]);
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

  it("documents the optional-parent home cross-structure blocker without weakening the parser", async () => {
    const payload = await fixture("moving-home.json");
    const customerProof = object(payload, "customerProof");
    const items = array(customerProof, "items");
    items[0] = structuredClone(customerProof["featured"]);
    expect(() => parseMovingHomePayload(payload)).toThrow();
    expect(validateProfilePayloadForPublication(await loadProfile("moving.home"), payload).valid).toBe(true);

    const home = structuredClone(await loadProfile("moving.home")) as ContentEditorProfile;
    expect(() => defineContentEditorProfiles([{
      ...home,
      groupRepeaterUniqueBy: [{
        groupPath: ["customerProof", "featured"],
        repeaterPath: ["customerProof", "items"],
        groupFieldPaths: [["customerName"], ["quote"]],
        repeaterFieldPaths: [["customerName"], ["quote"]],
        normalization: "trim-lowercase-en",
      }],
    }])).toThrow(/source path must traverse required declared groups/u);
  });

  it.each([
    ["moving.quote", "moving-quote.json", parseMovingQuotePayload],
    ["moving.contact", "moving-contact.json", parseMovingContactPayload],
  ] as const)("keeps %s unenforced because its parser rejects unknown keys", async (type, name, parse) => {
    const payload = await fixture(name);
    payload["futureRoot"] = { preserved: true };
    expect(() => parse(payload)).toThrow();
    expect(validateProfilePayloadForPublication(await loadProfile(type), payload).valid).toBe(true);
  });
});

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
