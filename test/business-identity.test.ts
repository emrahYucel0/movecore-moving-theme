import { describe, expect, it } from "vitest";
import {
  BUSINESS_IDENTITY_LIMITS,
  BusinessIdentityContractError,
  convertBusinessSettingToV2,
  parseBusinessIdentity,
  parseMovingBusinessSettingV2,
  parseMovingSiteSeoSetting,
  toMailtoHref,
  toTelHref,
} from "../shared/business-identity";

const rejected = (input: unknown) =>
  expect(() => parseBusinessIdentity(input)).toThrow(BusinessIdentityContractError);

describe("moving business identity persistence and runtime boundary", () => {
  it("keeps a minimal legacy v1 value readable without writing it", () => {
    const source = minimalLegacy();
    const snapshot = structuredClone(source);
    const identity = parseBusinessIdentity(source);
    expect(identity).toEqual({
      companyName: "Example Moving",
      primaryPhone: { display: "+1 202-555-0100", href: "tel:+12025550100" },
      openingHours: [],
      socialLinks: [],
    });
    expect(source).toEqual(snapshot);
    expect(Object.isFrozen(identity.primaryPhone)).toBe(true);
  });

  it("keeps a complete legacy v1 runtime projection deeply immutable", () => {
    const identity = parseBusinessIdentity(completeLegacy());
    expect(identity).toMatchObject({
      companyName: "Example Moving",
      logoAssetId: "asset:logo",
      whatsapp: { label: "Message on WhatsApp", href: "https://wa.me/12025550100" },
      email: { display: "hello@example.test", href: "mailto:hello@example.test" },
      address: "100 Example Avenue",
    });
    expect(Object.isFrozen(identity)).toBe(true);
    expect(Object.isFrozen(identity.whatsapp)).toBe(true);
    expect(Object.isFrozen(identity.email)).toBe(true);
    expect(Object.isFrozen(identity.openingHours[0])).toBe(true);
    expect(Object.isFrozen(identity.socialLinks[0])).toBe(true);
  });

  it.each([
    ["partial phone", { companyName: "Example", primaryPhone: { display: "Call" } }],
    ["malformed email", { ...minimalLegacy(), email: { display: "hello@example.test" } }],
    ["malformed WhatsApp", { ...minimalLegacy(), whatsapp: { href: "https://wa.me/12025550100" } }],
    ["wrong hours shape", { ...minimalLegacy(), openingHours: {} }],
    ["invalid social URL", { ...minimalLegacy(), socialLinks: [{ label: "Social", href: "http://example.test" }] }],
    ["incompatible root", []],
  ])("rejects malformed legacy input: %s", (_name, input) => rejected(input));

  it("parses a minimal canonical v2 value and derives a safe runtime phone link", () => {
    const identity = parseBusinessIdentity(minimalV2());
    expect(identity).toEqual({
      companyName: "Example Moving",
      primaryPhone: { display: "+1 (202) 555-0100", href: "tel:+12025550100" },
      openingHours: [],
      socialLinks: [],
    });
  });

  it("projects all canonical v2 source fields without exposing persistence details", () => {
    const identity = parseBusinessIdentity(completeV2());
    expect(identity).toEqual({
      companyName: "Taşıma Örneği",
      logoAssetId: "asset:logo",
      primaryPhone: { display: "Main office", href: "tel:+442079460958" },
      whatsapp: { label: "Plan on WhatsApp", href: "https://wa.me/442079460958" },
      email: { display: "hello+moving@example.test", href: "mailto:hello%2Bmoving@example.test" },
      address: "İstasyon Caddesi 10\nİstanbul",
      openingHours: [{ label: "Pazartesi–Cuma", value: "08:00–18:00" }],
      socialLinks: [{ label: "Instagram", href: "https://example.test/moving" }],
    });
    expect(JSON.stringify(identity)).not.toContain("schemaVersion");
  });

  it("treats absent optional v2 values as absent and collections as empty", () => {
    const setting = parseMovingBusinessSettingV2(minimalV2());
    expect(setting).toEqual({ ...minimalV2(), openingHours: [], socialLinks: [] });
    const identity = parseBusinessIdentity(setting);
    expect(identity.logoAssetId).toBeUndefined();
    expect(identity.whatsapp).toBeUndefined();
    expect(identity.email).toBeUndefined();
  });

  it("normalizes bounded archive SEO and keeps it outside the public business identity", () => {
    const source = {
      ...minimalV2(),
      articleArchiveSeoTitle: "  Buyer\n managed   articles  ",
      articleArchiveSeoDescription: " Clear\t planning   guidance. ",
      defaultSocialImageAssetId: "asset:social",
    };
    expect(parseMovingSiteSeoSetting(source)).toEqual({
      articleArchiveSeoTitle: "Buyer managed articles",
      articleArchiveSeoDescription: "Clear planning guidance.",
      defaultSocialImageAssetId: "asset:social",
    });
    expect(parseBusinessIdentity(source)).not.toHaveProperty("articleArchiveSeoTitle");
    expect(parseMovingSiteSeoSetting(minimalLegacy())).toEqual({});
    rejected({ ...minimalV2(), articleArchiveSeoTitle: "x".repeat(161) });
    rejected({ ...minimalV2(), articleArchiveSeoDescription: "x".repeat(301) });
  });

  it("accepts every bounded phone primitive safely and fixes derived schemes", () => {
    expect(toTelHref("+44 (0)20 7946 0958")).toBe("tel:+4402079460958");
    expect(toTelHref("Call the office")).toBe("tel:");
    expect(toTelHref("javascript:alert(1)")).toBe("tel:1");
    expect(toMailtoHref("hello+moving@example.test")).toBe("mailto:hello%2Bmoving@example.test");
    expect(parseBusinessIdentity({ ...minimalV2(), primaryPhoneDial: "   " }).primaryPhone.href)
      .toBe("tel:+12025550100");
    for (const href of [toTelHref("javascript:alert(1)"), toMailtoHref("hello@example.test")]) {
      expect(href.startsWith("javascript:")).toBe(false);
      expect(href).not.toMatch(/[<>"\r\n]/u);
    }
  });

  it("aligns v2 email and URL validation with current Core editor primitives", () => {
    expect(parseBusinessIdentity({ ...minimalV2(), whatsappUrl: "http://localhost:3000/contact" }).whatsapp?.href)
      .toBe("http://localhost:3000/contact");
    expect(parseBusinessIdentity({
      ...minimalV2(),
      socialLinks: [{ label: "Local", href: "http://localhost:3000/social" }],
    }).socialLinks).toHaveLength(1);
    for (const whatsappUrl of ["/contact", "javascript:alert(1)", "https://user:secret@example.test", "https://example.test/a b"]) {
      rejected({ ...minimalV2(), whatsappUrl });
    }
    for (const email of ["missing-at.example.test", "a@b", "a b@example.test"]) {
      rejected({ ...minimalV2(), email });
    }
  });

  it("keeps v2 collections bounded, ordered and compatible with repeater item shapes", () => {
    const openingHours = Array.from({ length: BUSINESS_IDENTITY_LIMITS.openingHours }, (_, index) => ({
      label: `Day ${index + 1}`,
      value: index % 2 ? "Closed" : "08:00–18:00",
    }));
    const socialLinks = Array.from({ length: BUSINESS_IDENTITY_LIMITS.socialLinks }, (_, index) => ({
      label: `Network ${index + 1}`,
      href: `https://example.test/${index + 1}`,
    }));
    expect(parseMovingBusinessSettingV2({ ...minimalV2(), openingHours, socialLinks }))
      .toMatchObject({ openingHours, socialLinks });
    rejected({ ...minimalV2(), openingHours: [...openingHours, { label: "Extra", value: "Closed" }] });
    rejected({ ...minimalV2(), socialLinks: [...socialLinks, { label: "Extra", href: "https://example.test/extra" }] });
    const sparse = new Array(2);
    sparse[1] = { label: "Saturday", value: "Closed" };
    rejected({ ...minimalV2(), openingHours: sparse });
  });

  it("converts complete legacy data to canonical v2 without meaningful loss", () => {
    const legacy = completeLegacy();
    const converted = convertBusinessSettingToV2(legacy);
    expect(converted).toEqual({
      schemaVersion: 2,
      companyName: legacy.companyName,
      logoAssetId: legacy.logoAssetId,
      primaryPhone: legacy.primaryPhone.display,
      whatsappUrl: legacy.whatsapp.href,
      whatsappLabel: legacy.whatsapp.label,
      email: legacy.email.display,
      address: legacy.address,
      openingHours: legacy.openingHours,
      socialLinks: legacy.socialLinks,
    });
    expect(parseBusinessIdentity(converted)).toEqual(parseBusinessIdentity(legacy));
  });

  it("uses an optional top-level dial override only when legacy display and target differ", () => {
    const legacy = {
      ...minimalLegacy(),
      primaryPhone: { display: "Main office", href: "tel:+442079460958" },
    };
    const converted = convertBusinessSettingToV2(legacy);
    expect(converted.primaryPhone).toBe("Main office");
    expect(converted.primaryPhoneDial).toBe("+442079460958");
    expect(parseBusinessIdentity(converted).primaryPhone).toEqual(legacy.primaryPhone);
  });

  it("converts absent capabilities and maximum Unicode collections deterministically", () => {
    const legacy = {
      companyName: "Örnek Nakliyat",
      primaryPhone: { display: "+90 212 555 01 00", href: "tel:+902125550100" },
      address: "Bağdat Caddesi, İstanbul",
      openingHours: Array.from({ length: BUSINESS_IDENTITY_LIMITS.openingHours }, (_, index) => ({
        label: `Gün ${index + 1}`,
        value: "Randevuyla",
      })),
      socialLinks: [],
    };
    const converted = convertBusinessSettingToV2(legacy);
    expect(converted.logoAssetId).toBeUndefined();
    expect(converted.whatsappUrl).toBeUndefined();
    expect(converted.email).toBeUndefined();
    expect(converted.openingHours).toHaveLength(BUSINESS_IDENTITY_LIMITS.openingHours);
    expect(parseBusinessIdentity(converted).companyName).toBe("Örnek Nakliyat");
  });

  it("is idempotent for canonical v2 and explicitly ignores unknown safe siblings", () => {
    const input = { ...completeV2(), future: { retainedByCoreEditor: true } };
    expect(parseBusinessIdentity(input)).toEqual(parseBusinessIdentity(completeV2()));
    const once = convertBusinessSettingToV2(input);
    const twice = convertBusinessSettingToV2(once);
    expect(twice).toEqual(once);
    expect("future" in once).toBe(false);
    expect(Object.isFrozen(once)).toBe(true);
  });

  it("rejects unsafe object mechanics and unknown schema versions", () => {
    const accessor = minimalV2();
    Object.defineProperty(accessor, "companyName", { get: () => "Accessor Moving", enumerable: true });
    rejected(accessor);
    const custom = Object.assign(Object.create({ inherited: true }), minimalV2());
    rejected(custom);
    const symbol = minimalV2() as Record<PropertyKey, unknown>;
    symbol[Symbol("hidden")] = true;
    rejected(symbol);
    rejected({ ...minimalV2(), schemaVersion: 3 });
  });
});

function minimalLegacy() {
  return {
    companyName: "Example Moving",
    primaryPhone: { display: "+1 202-555-0100", href: "tel:+12025550100" },
  };
}

function completeLegacy() {
  return {
    ...minimalLegacy(),
    logoAssetId: "asset:logo",
    whatsapp: { label: "Message on WhatsApp", href: "https://wa.me/12025550100" },
    email: { display: "hello@example.test", href: "mailto:hello@example.test" },
    address: "100 Example Avenue",
    openingHours: [{ label: "Monday to Friday", value: "08:00 to 18:00" }],
    socialLinks: [{ label: "Instagram", href: "https://example.test/instagram" }],
  };
}

function minimalV2() {
  return {
    schemaVersion: 2,
    companyName: "Example Moving",
    primaryPhone: "+1 (202) 555-0100",
  };
}

function completeV2() {
  return {
    schemaVersion: 2,
    companyName: "Taşıma Örneği",
    logoAssetId: "asset:logo",
    primaryPhone: "Main office",
    primaryPhoneDial: "+44 20 7946 0958",
    whatsappUrl: "https://wa.me/442079460958",
    whatsappLabel: "Plan on WhatsApp",
    email: "hello+moving@example.test",
    address: "İstasyon Caddesi 10\nİstanbul",
    openingHours: [{ label: "Pazartesi–Cuma", value: "08:00–18:00" }],
    socialLinks: [{ label: "Instagram", href: "https://example.test/moving" }],
  };
}
