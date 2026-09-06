import { describe, expect, it } from "vitest";
import { BUSINESS_IDENTITY_LIMITS } from "../shared/business-identity";

interface EditorFieldMapping {
  readonly path: string;
  readonly kind: string;
  readonly required: boolean;
  readonly allowedKinds?: readonly string[];
}

interface RepeaterMapping {
  readonly path: string;
  readonly minItems: number;
  readonly maxItems: number;
  readonly fields: readonly EditorFieldMapping[];
}

const buyerFields: readonly EditorFieldMapping[] = [
  { path: "companyName", kind: "text", required: true },
  { path: "logoAssetId", kind: "media", required: false, allowedKinds: ["image"] },
  { path: "primaryPhone", kind: "phone", required: true },
  { path: "primaryPhoneDial", kind: "phone", required: false },
  { path: "whatsappUrl", kind: "url", required: false },
  { path: "whatsappLabel", kind: "text", required: false },
  { path: "email", kind: "email", required: false },
  { path: "address", kind: "multiline", required: false },
] as const;

const repeaters: readonly RepeaterMapping[] = [
  {
    path: "openingHours",
    minItems: 0,
    maxItems: BUSINESS_IDENTITY_LIMITS.openingHours,
    fields: [
      { path: "label", kind: "text", required: true },
      { path: "value", kind: "text", required: true },
    ],
  },
  {
    path: "socialLinks",
    minItems: 0,
    maxItems: BUSINESS_IDENTITY_LIMITS.socialLinks,
    fields: [
      { path: "label", kind: "text", required: true },
      { path: "href", kind: "url", required: true },
    ],
  },
] as const;

describe("canonical Moving business v2 Core editor compatibility", () => {
  it("maps every buyer-editable source property to current Core v1 primitives", () => {
    expect(buyerFields.map(({ path, kind, required }) => [path, kind, required])).toEqual([
      ["companyName", "text", true],
      ["logoAssetId", "media", false],
      ["primaryPhone", "phone", true],
      ["primaryPhoneDial", "phone", false],
      ["whatsappUrl", "url", false],
      ["whatsappLabel", "text", false],
      ["email", "email", false],
      ["address", "multiline", false],
    ]);
    expect(buyerFields.find(({ path }) => path === "logoAssetId")?.allowedKinds).toEqual(["image"]);
    expect(buyerFields.every(({ path }) => !path.includes("."))).toBe(true);
  });

  it("uses only bounded flat repeater item fields", () => {
    expect(repeaters).toEqual([
      {
        path: "openingHours",
        minItems: 0,
        maxItems: 14,
        fields: [
          { path: "label", kind: "text", required: true },
          { path: "value", kind: "text", required: true },
        ],
      },
      {
        path: "socialLinks",
        minItems: 0,
        maxItems: 8,
        fields: [
          { path: "label", kind: "text", required: true },
          { path: "href", kind: "url", required: true },
        ],
      },
    ]);
    expect(repeaters.flatMap(({ fields }) => fields).every(({ path }) => !path.includes("."))).toBe(true);
  });

  it("keeps the discriminator non-editable and has no optional nested object", () => {
    expect(buyerFields.some(({ path }) => path === "schemaVersion")).toBe(false);
    expect(repeaters.some(({ path }) => path === "schemaVersion")).toBe(false);
    expect(new Set([...buyerFields.map(({ path }) => path), ...repeaters.map(({ path }) => path)]).size).toBe(10);
  });
});
