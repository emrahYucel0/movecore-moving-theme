import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { MOVING_HOME_LIMITS, parseMovingHomePayload } from "../shared/content/moving-home";
import { MOVING_SERVICE_LIMITS, parseMovingServicePayload } from "../shared/content/moving-service";
import { MOVING_LOCATION_LIMITS, parseMovingLocationPayload } from "../shared/content/moving-location";
import { parseSitePagePayload } from "../shared/content/site-page";

describe("application Editor Profile manifest", () => {
  it("keeps the inherited version 1 site.page profile field-for-field", async () => {
    const manifest = await loadManifest();
    expect(Object.keys(manifest).sort()).toEqual(["profiles", "version"]);
    expect(manifest["version"]).toBe(1);
    const profiles = array(manifest["profiles"]);
    expect(profiles).toHaveLength(4);

    const profile = profileById(profiles, "site.page");
    expect(profile).toMatchObject({ id: "site.page", version: 1, contentType: "site.page" });
    const fields = array(profile["fields"]).map(record);
    expect(fields.map((field) => field["key"])).toEqual([
      "eyebrow", "title", "intro", "heroMedia", "sections",
    ]);
    expect(field(fields, "eyebrow")).toMatchObject({ kind: "text", required: false, maxLength: 80 });
    expect(field(fields, "title")).toMatchObject({ kind: "text", required: true, maxLength: 160 });
    expect(field(fields, "intro")).toMatchObject({ kind: "textarea", required: false, maxLength: 600 });

    const hero = field(fields, "heroMedia");
    expect(hero).toMatchObject({ kind: "group", required: false });
    expectMediaFields(array(hero["fields"]).map(record));

    const sections = field(fields, "sections");
    expect(sections).toMatchObject({ kind: "repeater", required: false });
    const sectionFields = array(sections["fields"]).map(record);
    expect(field(sectionFields, "heading")).toMatchObject({ kind: "text", required: true, maxLength: 160 });
    expect(field(sectionFields, "body")).toMatchObject({ kind: "textarea", required: false, maxLength: 2000 });
    const sectionMedia = field(sectionFields, "media");
    expect(sectionMedia).toMatchObject({ kind: "group", required: false });
    expectMediaFields(array(sectionMedia["fields"]).map(record));
  });

  it("expresses moving.home v1 with parser-aligned fields, kinds, required flags, and lengths", async () => {
    const manifest = await loadManifest();
    const profiles = array(manifest["profiles"]);
    expect(profiles.map((value) => record(value)["id"])).toEqual([
      "site.page", "moving.home", "moving.service", "moving.location",
    ]);
    const profile = profileById(profiles, "moving.home");
    expect(profile).toMatchObject({ id: "moving.home", version: 1, contentType: "moving.home" });
    const fields = array(profile["fields"]).map(record);
    expect(fields.map((entry) => entry["key"])).toEqual([
      "hero", "proof", "services", "process", "assurance", "serviceAreas", "finalAction",
    ]);
    for (const entry of fields) expect(entry["required"]).toBe(true);

    const hero = nested(fields, "hero", "group", true);
    expect(hero.map((entry) => entry["key"])).toEqual([
      "eyebrow", "title", "intro", "media", "primaryAction", "secondaryAction",
    ]);
    expect(field(hero, "eyebrow")).toMatchObject({ kind: "text", required: false, maxLength: MOVING_HOME_LIMITS.eyebrow });
    expect(field(hero, "title")).toMatchObject({ kind: "text", required: true, maxLength: MOVING_HOME_LIMITS.title });
    expect(field(hero, "intro")).toMatchObject({ kind: "textarea", required: true, maxLength: MOVING_HOME_LIMITS.intro });
    expectMediaFields(nested(hero, "media", "group", true));
    expectActionFields(nested(hero, "primaryAction", "group", true));
    expectActionFields(nested(hero, "secondaryAction", "group", false));

    const proof = nested(fields, "proof", "repeater", true);
    expect(field(proof, "value")).toMatchObject({ kind: "text", required: true, maxLength: MOVING_HOME_LIMITS.proofValue });
    expect(field(proof, "label")).toMatchObject({ kind: "text", required: true, maxLength: MOVING_HOME_LIMITS.proofLabel });

    const services = nested(fields, "services", "group", true);
    expectSectionCopyFields(services);
    const serviceItems = nested(services, "items", "repeater", true);
    expect(field(serviceItems, "title")).toMatchObject({ kind: "text", required: true, maxLength: MOVING_HOME_LIMITS.itemTitle });
    expect(field(serviceItems, "description")).toMatchObject({ kind: "textarea", required: true, maxLength: MOVING_HOME_LIMITS.itemDescription });
    expectHrefField(field(serviceItems, "href"));

    const process = nested(fields, "process", "group", true);
    expectSectionCopyFields(process);
    const steps = nested(process, "steps", "repeater", true);
    expect(field(steps, "title")).toMatchObject({ kind: "text", required: true, maxLength: MOVING_HOME_LIMITS.itemTitle });
    expect(field(steps, "description")).toMatchObject({ kind: "textarea", required: true, maxLength: MOVING_HOME_LIMITS.itemDescription });

    const assurance = nested(fields, "assurance", "group", true);
    expect(field(assurance, "body")).toMatchObject({ kind: "textarea", required: true, maxLength: MOVING_HOME_LIMITS.assuranceBody });
    expectMediaFields(nested(assurance, "media", "group", false));
    expect(field(nested(assurance, "points", "repeater", true), "text"))
      .toMatchObject({ kind: "text", required: true, maxLength: MOVING_HOME_LIMITS.assurancePoint });

    const areas = nested(fields, "serviceAreas", "group", true);
    expectSectionCopyFields(areas);
    const areaItems = nested(areas, "areas", "repeater", true);
    expect(field(areaItems, "label")).toMatchObject({ kind: "text", required: true, maxLength: MOVING_HOME_LIMITS.areaLabel });
    expectHrefField(field(areaItems, "href"));

    const finalAction = nested(fields, "finalAction", "group", true);
    expect(field(finalAction, "body")).toMatchObject({ kind: "textarea", required: false, maxLength: MOVING_HOME_LIMITS.finalBody });
    expectActionFields(nested(finalAction, "primaryAction", "group", true));
    expectActionFields(nested(finalAction, "secondaryAction", "group", false));

    expect(totalFields(fields)).toBe(57);
    expect(maximumDepth(fields)).toBe(3);
  });

  it("expresses moving.service v1 with explicit parser-aligned groups", async () => {
    const profiles = array((await loadManifest())["profiles"]);
    const profile = profileById(profiles, "moving.service");
    expect(profile).toMatchObject({ id: "moving.service", version: 1, contentType: "moving.service" });
    const fields = array(profile["fields"]).map(record);
    expect(fields.map((entry) => entry["key"])).toEqual([
      "hero", "overview", "included", "process", "relatedServices", "finalAction",
    ]);
    for (const entry of fields) expect(entry["required"]).toBe(true);

    const hero = nested(fields, "hero", "group", true);
    expect(hero.map((entry) => entry["key"])).toEqual([
      "eyebrow", "title", "intro", "media", "primaryAction",
    ]);
    expect(field(hero, "title")).toMatchObject({ kind: "text", required: true, maxLength: MOVING_SERVICE_LIMITS.title });
    expect(field(hero, "intro")).toMatchObject({ kind: "textarea", required: true, maxLength: MOVING_SERVICE_LIMITS.heroIntro });
    expectMediaFields(nested(hero, "media", "group", false));
    expectActionFields(nested(hero, "primaryAction", "group", true));

    const overview = nested(fields, "overview", "group", true);
    expect(field(overview, "body")).toMatchObject({ kind: "textarea", required: true, maxLength: MOVING_SERVICE_LIMITS.overviewBody });
    expect(field(nested(overview, "points", "repeater", true), "text"))
      .toMatchObject({ kind: "text", required: true, maxLength: MOVING_SERVICE_LIMITS.point });

    for (const key of ["included", "process"] as const) {
      const section = nested(fields, key, "group", true);
      expect(field(section, "eyebrow")).toMatchObject({ kind: "text", required: false, maxLength: 80 });
      expect(field(section, "title")).toMatchObject({ kind: "text", required: true, maxLength: 160 });
      expect(field(section, "intro")).toMatchObject({ kind: "textarea", required: false, maxLength: 700 });
    }
    const includedItems = nested(nested(fields, "included", "group", true), "items", "repeater", true);
    expect(field(includedItems, "title")).toMatchObject({ kind: "text", required: true, maxLength: 120 });
    expect(field(includedItems, "description")).toMatchObject({ kind: "textarea", required: false, maxLength: 400 });
    const steps = nested(nested(fields, "process", "group", true), "steps", "repeater", true);
    expect(field(steps, "title")).toMatchObject({ kind: "text", required: true, maxLength: 100 });
    expect(field(steps, "description")).toMatchObject({ kind: "textarea", required: true, maxLength: 320 });

    const related = nested(fields, "relatedServices", "group", true);
    const relatedItems = nested(related, "items", "repeater", true);
    expect(field(relatedItems, "title")).toMatchObject({ kind: "text", required: true, maxLength: 120 });
    expectHrefField(field(relatedItems, "href"));

    const finalAction = nested(fields, "finalAction", "group", true);
    expectActionFields(nested(finalAction, "primaryAction", "group", true));
    expectActionFields(nested(finalAction, "secondaryAction", "group", false));
    expect(totalFields(fields)).toBe(46);
    expect(maximumDepth(fields)).toBe(3);
  });

  it("expresses moving.location v1 with explicit parser-aligned groups", async () => {
    const profiles = array((await loadManifest())["profiles"]);
    const profile = profileById(profiles, "moving.location");
    expect(profile).toMatchObject({ id: "moving.location", version: 1, contentType: "moving.location" });
    const fields = array(profile["fields"]).map(record);
    expect(fields.map((entry) => entry["key"])).toEqual([
      "hero", "overview", "services", "localDetails", "nearbyAreas", "finalAction",
    ]);
    for (const entry of fields) expect(entry["required"]).toBe(true);

    const hero = nested(fields, "hero", "group", true);
    expect(field(hero, "title")).toMatchObject({ kind: "text", required: true, maxLength: MOVING_LOCATION_LIMITS.heroTitle });
    expect(field(hero, "intro")).toMatchObject({ kind: "textarea", required: true, maxLength: MOVING_LOCATION_LIMITS.heroIntro });
    expectMediaFields(nested(hero, "media", "group", false));

    const overview = nested(fields, "overview", "group", true);
    expect(field(overview, "body")).toMatchObject({ kind: "textarea", required: true, maxLength: MOVING_LOCATION_LIMITS.overviewBody });
    expect(field(nested(overview, "highlights", "repeater", true), "text"))
      .toMatchObject({ kind: "text", required: true, maxLength: MOVING_LOCATION_LIMITS.highlight });

    const services = nested(fields, "services", "group", true);
    const serviceItems = nested(services, "items", "repeater", true);
    expect(field(serviceItems, "description")).toMatchObject({ kind: "textarea", required: false, maxLength: MOVING_LOCATION_LIMITS.itemDescription });
    expectHrefField(field(serviceItems, "href"));

    const details = nested(fields, "localDetails", "group", true);
    expect(field(details, "body")).toMatchObject({ kind: "textarea", required: true, maxLength: MOVING_LOCATION_LIMITS.overviewBody });
    const detailItems = nested(details, "items", "repeater", true);
    expect(field(detailItems, "description")).toMatchObject({ kind: "textarea", required: true, maxLength: MOVING_LOCATION_LIMITS.itemDescription });

    const nearby = nested(fields, "nearbyAreas", "group", true);
    expectActionFields(nested(nearby, "items", "repeater", true));
    const finalAction = nested(fields, "finalAction", "group", true);
    expectActionFields(nested(finalAction, "primaryAction", "group", true));
    expectActionFields(nested(finalAction, "secondaryAction", "group", false));
    expect(totalFields(fields)).toBe(43);
    expect(maximumDepth(fields)).toBe(3);
  });

  it.each(["site-page-home.json", "site-page-detail.json"])(
    "keeps example fixture %s compatible with the parser",
    async (name) => {
      const payload: unknown = JSON.parse(await readFile(
        new URL(`../application/examples/${name}`, import.meta.url),
        "utf8",
      ));
      expect(parseSitePagePayload(payload).title.length).toBeGreaterThan(0);
    },
  );

  it("keeps the sector-specific reference fixture compatible with moving.home", async () => {
    const payload: unknown = JSON.parse(await readFile(
      new URL("../application/examples/moving-home.json", import.meta.url),
      "utf8",
    ));
    expect(parseMovingHomePayload(payload).hero.primaryAction.href).toBe("/about");
  });

  it.each([
    ["moving-service.json", parseMovingServicePayload, "A room-by-room plan for moving home."],
    ["moving-location.json", parseMovingLocationPayload, "Moving support shaped around practical local access."],
  ] as const)("keeps %s compatible with its application parser", async (name, parse, title) => {
    const payload: unknown = JSON.parse(await readFile(
      new URL(`../application/examples/${name}`, import.meta.url), "utf8",
    ));
    expect(parse(payload).hero.title).toBe(title);
  });
});

async function loadManifest(): Promise<Readonly<Record<string, unknown>>> {
  return record(JSON.parse(await readFile(
    new URL("../application/editor-profiles.json", import.meta.url),
    "utf8",
  )));
}

function profileById(
  profiles: readonly unknown[],
  id: string,
): Readonly<Record<string, unknown>> {
  const result = profiles.map(record).find((profile) => profile["id"] === id);
  if (result === undefined) throw new Error(`Missing expected profile: ${id}`);
  return result;
}

function nested(
  fields: readonly Readonly<Record<string, unknown>>[],
  key: string,
  kind: "group" | "repeater",
  required: boolean,
): readonly Readonly<Record<string, unknown>>[] {
  const entry = field(fields, key);
  expect(entry).toMatchObject({ kind, required });
  return array(entry["fields"]).map(record);
}

function expectActionFields(fields: readonly Readonly<Record<string, unknown>>[]): void {
  expect(fields.map((entry) => entry["key"])).toEqual(["label", "href"]);
  expect(field(fields, "label")).toMatchObject({
    kind: "text", required: true, maxLength: MOVING_HOME_LIMITS.actionLabel,
  });
  expectHrefField(field(fields, "href"));
}

function expectHrefField(entry: Readonly<Record<string, unknown>>): void {
  expect(entry).toMatchObject({
    kind: "text", required: true, maxLength: MOVING_HOME_LIMITS.href,
  });
  expect(entry["description"]).toContain("internal /path");
}

function expectSectionCopyFields(fields: readonly Readonly<Record<string, unknown>>[]): void {
  expect(field(fields, "eyebrow")).toMatchObject({
    kind: "text", required: false, maxLength: MOVING_HOME_LIMITS.eyebrow,
  });
  expect(field(fields, "title")).toMatchObject({
    kind: "text", required: true, maxLength: MOVING_HOME_LIMITS.title,
  });
  expect(field(fields, "intro")).toMatchObject({
    kind: "textarea", required: false, maxLength: MOVING_HOME_LIMITS.intro,
  });
}

function totalFields(fields: readonly Readonly<Record<string, unknown>>[]): number {
  return fields.reduce((total, entry) => {
    const children = entry["fields"];
    return total + 1 + (Array.isArray(children) ? totalFields(children.map(record)) : 0);
  }, 0);
}

function maximumDepth(fields: readonly Readonly<Record<string, unknown>>[], depth = 1): number {
  return fields.reduce((maximum, entry) => {
    const children = entry["fields"];
    return Math.max(maximum, Array.isArray(children) ? maximumDepth(children.map(record), depth + 1) : depth);
  }, depth);
}

function expectMediaFields(fields: readonly Readonly<Record<string, unknown>>[]): void {
  expect(fields.map((entry) => entry["key"])).toEqual(["assetId", "alt"]);
  expect(field(fields, "assetId")).toMatchObject({ kind: "media", required: true });
  expect(field(fields, "alt")).toMatchObject({ kind: "text", required: true, maxLength: 200 });
}

function field(
  fields: readonly Readonly<Record<string, unknown>>[],
  key: string,
): Readonly<Record<string, unknown>> {
  const result = fields.find((entry) => entry["key"] === key);
  if (result === undefined) throw new Error(`Missing expected fixture field: ${key}`);
  return result;
}

function array(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error("Expected fixture array.");
  return value;
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected fixture object.");
  }
  return value as Readonly<Record<string, unknown>>;
}
