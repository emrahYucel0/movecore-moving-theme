import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Moving owns its launch policy; Core owns readiness schema validation and
 * evaluation. These tests therefore protect only the application relationships
 * this manifest depends on, and deliberately do not re-implement Core's parser.
 */
interface ReadinessCheck {
  readonly id: string;
  readonly type: string;
  readonly severity: string;
  readonly label: string;
  readonly description?: string;
  readonly collectionId?: string;
  readonly path?: string;
  readonly namespace?: string;
  readonly key?: string;
  readonly fieldPath?: readonly string[];
}

const policySource = readFileSync(new URL("../application/readiness-policy.json", import.meta.url), "utf8");
const policy = JSON.parse(policySource) as { readonly version: number; readonly checks: readonly ReadinessCheck[] };

const collections = JSON.parse(
  readFileSync(new URL("../application/content-collections.json", import.meta.url), "utf8"),
) as { readonly collections: ReadonlyArray<{ id: string; mode: string; contentType: string }> };

const settingDefinitions = JSON.parse(
  readFileSync(new URL("../application/setting-definitions.json", import.meta.url), "utf8"),
) as { readonly settings: ReadonlyArray<{ namespace: string; key: string; value: Record<string, unknown> }> };

const settingEditorProfiles = JSON.parse(
  readFileSync(new URL("../application/setting-editor-profiles.json", import.meta.url), "utf8"),
) as { readonly profiles: ReadonlyArray<{ namespace: string; key: string; groups: ReadonlyArray<{ fields: ReadonlyArray<{ path: string; kind: string }> }> }> };

const business = settingDefinitions.settings.find(
  (setting) => setting.namespace === "moving" && setting.key === "business",
);

const severities = (severity: string) => policy.checks.filter((check) => check.severity === severity);

describe("Moving readiness policy adoption", () => {
  it("declares one versioned policy of eight checks", () => {
    expect(Object.keys(policy).sort()).toEqual(["checks", "version"]);
    expect(policy.version).toBe(1);
    expect(policy.checks).toHaveLength(8);
    expect(new Set(policy.checks.map((check) => check.id)).size).toBe(8);
  });

  it("splits launch policy into five blockers and three recommendations", () => {
    expect(severities("blocker")).toHaveLength(5);
    expect(severities("recommendation")).toHaveLength(3);
    // Optional severity is deliberately unused in Moving V1.
    expect(severities("optional")).toHaveLength(0);
    expect(new Set(policy.checks.map((check) => check.severity)))
      .toEqual(new Set(["blocker", "recommendation"]));
  });

  it("states the intended launch policy, not an inferred one", () => {
    expect(policy.checks.map((check) => [check.id, check.type, check.severity])).toEqual([
      ["homepage-exists", "CONTENT_SINGLETON_EXISTS", "blocker"],
      ["homepage-published", "CONTENT_SINGLETON_PUBLISHED", "blocker"],
      ["homepage-address", "PATH_RESOLVES", "blocker"],
      ["business-name", "SETTING_FIELD_DIFFERS_FROM_INITIAL", "blocker"],
      ["business-phone", "SETTING_FIELD_DIFFERS_FROM_INITIAL", "blocker"],
      ["contact-page-published", "CONTENT_SINGLETON_PUBLISHED", "recommendation"],
      ["quote-page-published", "CONTENT_SINGLETON_PUBLISHED", "recommendation"],
      ["business-logo", "SETTING_FIELD_PRESENT", "recommendation"],
    ]);
    // Existence and publication stay separate so the buyer sees the right next action.
    expect(policy.checks.filter((check) => check.collectionId === "homepage").map((check) => check.type))
      .toEqual(["CONTENT_SINGLETON_EXISTS", "CONTENT_SINGLETON_PUBLISHED"]);
    expect(policy.checks.find((check) => check.type === "PATH_RESOLVES")?.path).toBe("/");
  });

  it("only targets singleton collections this application actually configures", () => {
    const singletons = new Map(collections.collections.map((entry) => [entry.id, entry.mode]));
    const referenced = policy.checks.flatMap((check) => check.collectionId === undefined ? [] : [check.collectionId]);

    expect([...new Set(referenced)].sort()).toEqual(["contact-page", "homepage", "quote-page"]);
    for (const id of referenced) {
      expect(singletons.get(id), `collection ${id}`).toBe("singleton");
    }
  });

  it("only targets setting fields this application actually ships or exposes", () => {
    expect(business).toBeDefined();
    const editorPaths = new Set(
      settingEditorProfiles.profiles
        .filter((profile) => profile.namespace === "moving" && profile.key === "business")
        .flatMap((profile) => profile.groups.flatMap((group) => group.fields.map((field) => field.path))),
    );

    for (const check of policy.checks.filter((entry) => entry.namespace !== undefined)) {
      expect(check.namespace).toBe("moving");
      expect(check.key).toBe("business");
      expect(check.fieldPath).toHaveLength(1);
      // Every targeted field must be reachable by the buyer in Business details.
      expect(editorPaths.has(check.fieldPath![0]!), `editable ${check.fieldPath![0]}`).toBe(true);
    }

    // The two replaced-placeholder blockers compare against shipped values, so
    // those keys must exist in the Setting Definition.
    for (const field of ["companyName", "primaryPhone"]) {
      expect(Object.hasOwn(business!.value, field), `shipped ${field}`).toBe(true);
      expect(typeof business!.value[field]).toBe("string");
    }
    // The logo ships no default value; it is a media field the buyer supplies,
    // which is exactly what a presence check expects.
    expect(Object.hasOwn(business!.value, "logoAssetId")).toBe(false);
    expect(editorPaths.has("logoAssetId")).toBe(true);
  });

  it("never duplicates a shipped placeholder value into the policy", () => {
    for (const shipped of [business!.value["companyName"], business!.value["primaryPhone"]]) {
      expect(policySource).not.toContain(String(shipped));
    }
    // Comparison is Core's, driven by the Setting Definition rather than a
    // literal copied into application policy.
    for (const check of policy.checks.filter((entry) => entry.type === "SETTING_FIELD_DIFFERS_FROM_INITIAL")) {
      expect(Object.keys(check).sort()).toEqual([
        "description", "fieldPath", "id", "key", "label", "namespace", "severity", "type",
      ]);
    }
  });

  it("keeps buyer copy free of technical identity", () => {
    const copy = policy.checks
      .flatMap((check) => [check.label, check.description ?? ""])
      .join(" ")
      .toLowerCase();

    for (const leak of [
      "moving.", "moving:", "fieldpath", "namespace", "collectionid",
      "singleton", "revision", "contentid", "content:", "companyname", "primaryphone", "logoassetid",
    ]) {
      expect(copy, leak).not.toContain(leak);
    }
    for (const check of policy.checks) {
      expect(check.label.length).toBeGreaterThan(0);
      expect(check.label.length).toBeLessThanOrEqual(120);
      expect(check.label.trim()).toBe(check.label);
      if (check.description !== undefined) {
        expect(check.description.length).toBeLessThanOrEqual(240);
        expect(check.description.trim()).toBe(check.description);
      }
    }
  });
});
