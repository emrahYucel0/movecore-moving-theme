import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  parseBusinessIdentity,
  parseMovingBusinessSettingV2,
  type MovingBusinessSettingV2,
} from "../shared/business-identity";

const manifest = JSON.parse(readFileSync(
  new URL("../application/setting-editor-profiles.json", import.meta.url),
  "utf8",
));
const profile = manifest.profiles[0];
const fields = profile.groups.flatMap((group: { fields: unknown[] }) => group.fields);

describe("Moving Business Settings profile", () => {
  it("targets the one public business Setting with buyer-facing identity", () => {
    expect(Object.keys(manifest).sort()).toEqual(["profiles", "version"]);
    expect(manifest.version).toBe(1);
    expect(manifest.profiles).toHaveLength(1);
    expect(profile).toMatchObject({
      namespace: "moving",
      key: "business",
      label: "Business details",
      description: "Manage the company identity and contact information shown across your website.",
    });
    expect(profile.groups.map(({ label }: { label: string }) => label)).toEqual([
      "Business identity",
      "Contact",
      "Opening hours",
      "Social links",
    ]);
  });

  it("maps every canonical scalar with exact required and length semantics", () => {
    expect(fields.filter(({ kind }: { kind: string }) => kind !== "repeater").map(fieldSummary)).toEqual([
      ["companyName", "Company name", "text", true, 120],
      ["logoAssetId", "Logo", "media", false, undefined],
      ["primaryPhone", "Primary phone", "phone", true, 120],
      ["primaryPhoneDial", "Dialing number override", "phone", false, 120],
      ["whatsappUrl", "WhatsApp link", "url", false, 2048],
      ["whatsappLabel", "WhatsApp button label", "text", false, 80],
      ["email", "Email", "email", false, 254],
      ["address", "Address", "multiline", false, 500],
    ]);
    expect(fields.find(({ path }: { path: string }) => path === "logoAssetId")).toMatchObject({
      kind: "media",
      allowedKinds: ["image"],
    });
    expect(JSON.stringify(profile)).not.toMatch(/schemaVersion|mailto:|tel:/u);
  });

  it("defines bounded, flat opening-hours and social-link repeaters", () => {
    expect(fields.filter(({ kind }: { kind: string }) => kind === "repeater")).toEqual([
      {
        kind: "repeater",
        path: "openingHours",
        label: "Opening hours",
        help: "Add each public day or day range in the order it should appear.",
        minItems: 0,
        maxItems: 14,
        fields: [
          { kind: "text", path: "label", label: "Days", required: true, maxLength: 80 },
          { kind: "text", path: "value", label: "Opening hours", required: true, maxLength: 160 },
        ],
      },
      {
        kind: "repeater",
        path: "socialLinks",
        label: "Social profiles",
        help: "Add public social profiles in the order they should appear.",
        minItems: 0,
        maxItems: 8,
        fields: [
          { kind: "text", path: "label", label: "Platform or label", required: true, maxLength: 80 },
          { kind: "url", path: "href", label: "Profile URL", required: true, maxLength: 2048 },
        ],
      },
    ]);
  });

  it("keeps every supported optional combination valid for the runtime projection", () => {
    for (const value of [
      baseValue(),
      { ...baseValue(), whatsappUrl: "https://wa.me/12025550100" },
      { ...baseValue(), whatsappUrl: "https://wa.me/12025550100", whatsappLabel: "Message us" },
      { ...baseValue(), email: "hello@example.test" },
      { ...baseValue(), logoAssetId: "asset:logo" },
      { ...baseValue(), primaryPhoneDial: "+12025550199" },
    ]) expect(() => parseBusinessIdentity(value)).not.toThrow();
  });

  it("preserves hidden schema and unknown data while visible fields change or clear", () => {
    const original = {
      ...baseValue(),
      logoAssetId: "asset:old-logo",
      email: "old@example.test",
      future: { applicationOwned: true },
    };
    const edited = editVisible(original, {
      companyName: "Buyer Ready Moving",
      email: undefined,
      logoAssetId: "asset:new-logo",
    });
    expect(edited).toMatchObject({
      schemaVersion: 2,
      companyName: "Buyer Ready Moving",
      logoAssetId: "asset:new-logo",
      future: { applicationOwned: true },
    });
    expect(edited).not.toHaveProperty("email");
    expect(() => parseMovingBusinessSettingV2(edited)).not.toThrow();
  });

  it("preserves collection order and opaque row data through edit and reorder", () => {
    const original = {
      ...baseValue(),
      openingHours: [
        { label: "Monday", value: "08:00–18:00", future: "keep-first" },
        { label: "Saturday", value: "09:00–13:00", future: "keep-second" },
      ],
    };
    const reordered = [original.openingHours[1], { ...original.openingHours[0], value: "08:30–18:00" }];
    const edited = editVisible(original, { openingHours: reordered });
    expect(edited.openingHours).toEqual([
      { label: "Saturday", value: "09:00–13:00", future: "keep-second" },
      { label: "Monday", value: "08:30–18:00", future: "keep-first" },
    ]);
    expect(parseMovingBusinessSettingV2(edited).openingHours.map(({ label }) => label)).toEqual([
      "Saturday",
      "Monday",
    ]);
  });
});

function fieldSummary(field: {
  path: string;
  label: string;
  kind: string;
  required?: boolean;
  maxLength?: number;
}) {
  return [field.path, field.label, field.kind, field.required ?? false, field.maxLength];
}

function baseValue(): MovingBusinessSettingV2 {
  return {
    schemaVersion: 2,
    companyName: "Example Moving",
    primaryPhone: "+1 202-555-0100",
    openingHours: [],
    socialLinks: [],
  };
}

function editVisible<T extends Record<string, unknown>>(
  source: T,
  changes: Readonly<Record<string, unknown | undefined>>,
): T {
  const result: Record<string, unknown> = structuredClone(source);
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) delete result[key];
    else result[key] = structuredClone(value);
  }
  return result as T;
}
