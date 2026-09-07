import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync(new URL("../application/admin-shell.json", import.meta.url), "utf8"));

describe("Moving application shell intent", () => {
  it("uses stable product identity, independent of editable company data", () => {
    expect(manifest.version).toBe(1);
    expect(manifest.application).toEqual({ name: "MoveCore Moving", descriptor: "Operations workspace" });
  });

  it("declares four compact groups in product order", () => {
    expect(manifest.groups).toEqual([
      { id: "operations", label: "Operations" },
      { id: "content", label: "Content" },
      { id: "site", label: "Site" },
      { id: "system", label: "System" },
    ]);
  });

  it("explicitly orders and labels all eight useful capabilities without hiding any", () => {
    expect(manifest.navigation).toEqual([
      { id: "overview", label: "Overview", group: "operations", visible: true },
      { id: "submissions", label: "Leads", group: "operations", visible: true },
      { id: "content", label: "Content", group: "content", visible: true },
      { id: "media", label: "Media", group: "content", visible: true },
      { id: "navigation", label: "Navigation", group: "site", visible: true },
      { id: "settings", label: "Business settings", group: "site", visible: true },
      { id: "url-seo", label: "SEO & URLs", group: "site", visible: true },
      { id: "audit", label: "Audit", group: "system", visible: true },
    ]);
    expect(new Set(manifest.navigation.map((item: { id: string }) => item.id)).size).toBe(8);
  });

  it("contains only deployment presentation data, never routing, grants, secrets or customers", () => {
    expect(Object.keys(manifest).sort()).toEqual(["application", "groups", "navigation", "version"]);
    expect(Object.keys(manifest.application).sort()).toEqual(["descriptor", "name"]);
    for (const group of manifest.groups) expect(Object.keys(group).sort()).toEqual(["id", "label"]);
    for (const item of manifest.navigation) expect(Object.keys(item).sort()).toEqual(["group", "id", "label", "visible"]);
    expect(JSON.stringify(manifest)).not.toMatch(/href|route|permission|https?:|secret|password|token|customer|northline|@|moving\.(quote|contact)/i);
  });
});
