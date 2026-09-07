import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { MOVING_AREAS_LIMITS } from "../shared/content/moving-areas";
import { MOVING_FAQ_LIMITS } from "../shared/content/moving-faq";
import { MOVING_SERVICES_LIMITS } from "../shared/content/moving-services";
import { MOVING_TESTIMONIALS_LIMITS } from "../shared/content/moving-testimonials";

describe("R2.8 commercial Editor Profiles", () => {
  it("defines all four application-owned collection profiles within Core limits", async () => {
    const profiles = await loadProfiles();
    expect(profiles).toHaveLength(11);
    for (const [id, keys, total, depth] of [
      ["moving.services", ["hero", "portfolio", "context", "finalAction"], 32, 4],
      ["moving.areas", ["hero", "coverage", "planning", "finalAction"], 29, 3],
      ["moving.faq", ["hero", "items", "finalAction"], 20, 3],
      ["moving.testimonials", ["hero", "featured", "items", "finalAction"], 27, 3],
    ] as const) {
      const profile = profileById(profiles, id);
      expect(profile["version"]).toBe(1);
      expect(profile["contentType"]).toBe(id);
      const fields = array(profile["fields"]).map(record);
      expect(fields.map((field) => field["key"])).toEqual(keys);
      expect(totalFields(fields)).toBe(total);
      expect(maximumDepth(fields)).toBe(depth);
      expect(total).toBeLessThanOrEqual(200);
      expect(depth).toBeLessThanOrEqual(6);
    }
  });

  it("keeps collection fields aligned with parser limits and useful buyer language", async () => {
    const profiles = await loadProfiles();
    const services = fields(profileById(profiles, "moving.services"));
    const serviceItems = nested(nested(services, "portfolio"), "items");
    expect(field(serviceItems, "title")).toMatchObject({ maxLength: MOVING_SERVICES_LIMITS.itemTitle });
    expect(field(serviceItems, "description")).toMatchObject({ maxLength: MOVING_SERVICES_LIMITS.itemDescription });
    expect(field(serviceItems, "href")).toMatchObject({ maxLength: MOVING_SERVICES_LIMITS.href });

    const areas = fields(profileById(profiles, "moving.areas"));
    const areaItems = nested(nested(areas, "coverage"), "items");
    expect(field(areaItems, "description")).toMatchObject({ maxLength: MOVING_AREAS_LIMITS.itemDescription });

    const faq = fields(profileById(profiles, "moving.faq"));
    const faqItems = nested(faq, "items");
    expect(field(faqItems, "question")).toMatchObject({ maxLength: MOVING_FAQ_LIMITS.question });
    expect(field(faqItems, "answer")).toMatchObject({ maxLength: MOVING_FAQ_LIMITS.answer });

    const testimonials = fields(profileById(profiles, "moving.testimonials"));
    expect(field(nested(testimonials, "featured"), "quote"))
      .toMatchObject({ maxLength: MOVING_TESTIMONIALS_LIMITS.quote });

    const editorCopy = JSON.stringify(profiles);
    expect(editorCopy).not.toMatch(/CMS relation|parser|projection|fixture|payload schema/iu);
  });
});

async function loadProfiles(): Promise<readonly unknown[]> {
  const manifest = JSON.parse(await readFile(
    new URL("../application/editor-profiles.json", import.meta.url), "utf8",
  )) as Record<string, unknown>;
  return array(manifest["profiles"]);
}

function profileById(profiles: readonly unknown[], id: string): Record<string, unknown> {
  const profile = profiles.map(record).find((item) => item["id"] === id);
  if (profile === undefined) throw new Error(`Missing profile ${id}`);
  return profile;
}

function fields(profile: Record<string, unknown>): Record<string, unknown>[] {
  return array(profile["fields"]).map(record);
}

function nested(source: Record<string, unknown>[], key: string): Record<string, unknown>[] {
  return array(field(source, key)["fields"]).map(record);
}

function field(source: Record<string, unknown>[], key: string): Record<string, unknown> {
  const result = source.find((item) => item["key"] === key);
  if (result === undefined) throw new Error(`Missing field ${key}`);
  return result;
}

function totalFields(source: Record<string, unknown>[]): number {
  return source.reduce((total, item) => total + 1 + (
    Array.isArray(item["fields"]) ? totalFields(array(item["fields"]).map(record)) : 0
  ), 0);
}

function maximumDepth(source: Record<string, unknown>[], depth = 1): number {
  return Math.max(depth, ...source.map((item) => Array.isArray(item["fields"])
    ? maximumDepth(array(item["fields"]).map(record), depth + 1)
    : depth));
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Expected array");
  return value;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Expected object");
  return value as Record<string, unknown>;
}
