import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { projectContentCollections } from "../../core-cms/packages/admin-application/dist/index.js";
import {
  CoreRuntimeContentCollectionConfigurationError,
  loadContentCollections,
} from "../../core-cms/apps/runtime/dist/content-collections.js";

const expectedCollections = [
  ["homepage", "singleton", "Homepage", "Homepage", "moving.home", "moving:home"],
  ["pages", "collection", "Pages", "Page", "site.page", undefined],
  ["services-page", "singleton", "Services Page", "Services Page", "moving.services", "moving:services"],
  ["service-pages", "collection", "Service Pages", "Service Page", "moving.service", undefined],
  ["areas-page", "singleton", "Areas Page", "Areas Page", "moving.areas", "moving:areas"],
  ["area-pages", "collection", "Area Pages", "Area Page", "moving.location", undefined],
  ["articles", "collection", "Articles", "Article", "moving.article", undefined],
  ["faq", "singleton", "FAQ", "FAQ", "moving.faq", "moving:faq"],
  ["testimonials", "singleton", "Testimonials", "Testimonials", "moving.testimonials", "moving:testimonials"],
  ["quote-page", "singleton", "Quote Page", "Quote Page", "moving.quote", "moving:quote"],
  ["contact-page", "singleton", "Contact Page", "Contact Page", "moving.contact", "moving:contact"],
] as const;

const expectedDisplayTitles = new Map<string, readonly string[]>([
  ["site.page", ["title"]],
  ["moving.home", ["hero", "title"]],
  ["moving.service", ["hero", "title"]],
  ["moving.location", ["hero", "title"]],
  ["moving.services", ["hero", "title"]],
  ["moving.areas", ["hero", "title"]],
  ["moving.faq", ["hero", "title"]],
  ["moving.testimonials", ["hero", "title"]],
  ["moving.quote", ["title"]],
  ["moving.contact", ["title"]],
  ["moving.article", ["title"]],
]);

describe("Moving buyer Content IA manifest", () => {
  it("loads through the committed Core v2 boundary with the exact buyer order and ownership", async () => {
    const configuration = await loadContentCollections(manifestPath("content-collections"));

    expect(configuration.version).toBe(2);
    expect(configuration.collections.map((collection) => [
      collection.id,
      collection.mode,
      collection.label,
      collection.singularLabel,
      collection.contentType,
      collection.mode === "singleton" ? collection.contentId : undefined,
    ])).toEqual(expectedCollections);
    expect(configuration.collections.every((collection) => collection.create)).toBe(true);
    expect(new Set(configuration.collections.map((collection) => collection.contentType)).size).toBe(11);
    expect(configuration.collections.filter((collection) => collection.mode === "singleton")).toHaveLength(7);
    expect(configuration.collections.filter((collection) => collection.mode === "collection")).toHaveLength(4);
    const fixedIds = configuration.collections.flatMap((collection) =>
      collection.mode === "singleton" ? [collection.contentId] : []
    );
    expect(new Set(fixedIds).size).toBe(7);
    for (const collection of configuration.collections.filter(({ mode }) => mode === "collection")) {
      expect("contentId" in collection).toBe(false);
    }
    expect(new Set(configuration.collections.map(({ label }) => label)).size).toBe(11);

    const buyerCopy = configuration.collections
      .flatMap(({ label, singularLabel, description }) => [label, singularLabel, description ?? ""])
      .join(" ");
    expect(buyerCopy).not.toMatch(/singleton|content type|manifest|namespace|resource identity/iu);
  });

  it("keeps fixed singleton identities server-side in the browser session projection", async () => {
    const configuration = await loadContentCollections(manifestPath("content-collections"));
    const projection = projectContentCollections(configuration);

    expect(projection.version).toBe(2);
    expect(projection.collections).toHaveLength(11);
    expect(JSON.stringify(projection)).not.toContain("moving:home");
    expect(JSON.stringify(projection)).not.toContain("contentId");
  });

  it("fails closed when the configured application manifest is invalid", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "moving-content-collections-"));
    const invalidPath = path.join(directory, "invalid.json");
    try {
      await writeFile(invalidPath, JSON.stringify({ version: 2, collections: [{ id: "broken" }] }));
      await expect(loadContentCollections(invalidPath))
        .rejects.toBeInstanceOf(CoreRuntimeContentCollectionConfigurationError);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("uses safe scalar fields from every matching application editor profile", async () => {
    const manifest = record(JSON.parse(await readFile(manifestPath("editor-profiles"), "utf8")));
    const profiles = array(manifest["profiles"]).map(record);

    expect(profiles.map((profile) => profile["contentType"])).toEqual([...expectedDisplayTitles.keys()]);
    for (const profile of profiles) {
      const contentType = string(profile["contentType"]);
      const expectedPath = expectedDisplayTitles.get(contentType);
      expect(expectedPath, `missing display-title expectation for ${contentType}`).toBeDefined();
      const displayTitle = record(profile["displayTitle"]);
      const fieldPath = array(displayTitle["fieldPath"]).map(string);
      expect(fieldPath).toEqual(expectedPath);

      let fields = array(profile["fields"]).map(record);
      let selected: Readonly<Record<string, unknown>> | undefined;
      for (const [index, key] of fieldPath.entries()) {
        selected = fields.find((field) => field["key"] === key);
        expect(selected, `${contentType}.${fieldPath.slice(0, index + 1).join(".")} must exist`).toBeDefined();
        if (index < fieldPath.length - 1) {
          expect(selected?.["kind"]).toBe("group");
          fields = array(selected?.["fields"]).map(record);
        }
      }
      expect(["text", "textarea"]).toContain(selected?.["kind"]);
    }
  });
});

function manifestPath(name: string): string {
  return path.resolve(import.meta.dirname, "..", "application", `${name}.json`);
}

function array(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error("Expected array fixture.");
  return value;
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected object fixture.");
  }
  return value as Readonly<Record<string, unknown>>;
}

function string(value: unknown): string {
  if (typeof value !== "string") throw new Error("Expected string fixture.");
  return value;
}
