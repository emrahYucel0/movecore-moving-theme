import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseSitePagePayload } from "../shared/content/site-page";

describe("starter Editor Profile manifest", () => {
  it("contains exactly the version 1 site.page profile and expected field semantics", async () => {
    const manifest = record(JSON.parse(await readFile(
      new URL("../application/editor-profiles.json", import.meta.url),
      "utf8",
    )));
    expect(Object.keys(manifest).sort()).toEqual(["profiles", "version"]);
    expect(manifest["version"]).toBe(1);
    const profiles = array(manifest["profiles"]);
    expect(profiles).toHaveLength(1);

    const profile = record(profiles[0]);
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
});

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
