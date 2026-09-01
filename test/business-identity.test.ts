import { describe, expect, it } from "vitest";
import {
  BUSINESS_IDENTITY_LIMITS,
  BusinessIdentityContractError,
  parseBusinessIdentity,
} from "../shared/business-identity";

describe("moving business identity contract", () => {
  it("accepts and freezes the minimal identity with normalized empty collections", () => {
    const identity = parseBusinessIdentity(minimalIdentity());

    expect(identity).toEqual({
      companyName: "Example Moving",
      primaryPhone: { display: "+1 202-555-0100", href: "tel:+12025550100" },
      openingHours: [],
      socialLinks: [],
    });
    expect(Object.isFrozen(identity)).toBe(true);
    expect(Object.isFrozen(identity.primaryPhone)).toBe(true);
    expect(Object.isFrozen(identity.openingHours)).toBe(true);
    expect(Object.isFrozen(identity.socialLinks)).toBe(true);
  });

  it("accepts, projects, and deeply freezes a complete identity", () => {
    const input = completeIdentity() as Record<string, unknown>;
    input["transportOnly"] = "must not project";
    expect(() => parseBusinessIdentity(input)).toThrow(BusinessIdentityContractError);
    delete input["transportOnly"];

    const identity = parseBusinessIdentity(input);
    expect(identity).toMatchObject({
      companyName: "Example Moving",
      logoAssetId: "asset:logo",
      whatsapp: { label: "Message on WhatsApp", href: "https://wa.me/12025550100" },
      email: { display: "hello@example.test", href: "mailto:hello@example.test" },
      address: "100 Example Avenue",
    });
    expect(Object.isFrozen(identity.whatsapp)).toBe(true);
    expect(Object.isFrozen(identity.email)).toBe(true);
    expect(Object.isFrozen(identity.openingHours[0])).toBe(true);
    expect(Object.isFrozen(identity.socialLinks[0])).toBe(true);
  });

  it.each([
    ["company name absent", { primaryPhone: phone() }],
    ["company name blank", { companyName: " ", primaryPhone: phone() }],
    ["company name silently trimmed", { companyName: " Example Moving", primaryPhone: phone() }],
    ["phone absent", { companyName: "Example Moving" }],
    ["phone not canonical tel", { companyName: "Example Moving", primaryPhone: { display: "Call", href: "tel:555-0100" } }],
    ["phone uses another scheme", { companyName: "Example Moving", primaryPhone: { display: "Call", href: "https://example.test" } }],
  ])("rejects %s", (_case, input) => {
    expect(() => parseBusinessIdentity(input)).toThrow(BusinessIdentityContractError);
  });

  it.each([
    "http://wa.me/12025550100",
    "https://example.test/whatsapp",
    "https://user:secret@wa.me/12025550100",
  ])("rejects malformed WhatsApp destination %s", (href) => {
    expect(() => parseBusinessIdentity({
      ...minimalIdentity(),
      whatsapp: { label: "Message", href },
    })).toThrow(BusinessIdentityContractError);
  });

  it.each([
    "http://example.test/social",
    "mailto:social@example.test",
    "/social",
  ])("rejects non-HTTPS social destination %s", (href) => {
    expect(() => parseBusinessIdentity({
      ...minimalIdentity(),
      socialLinks: [{ label: "Social", href }],
    })).toThrow(BusinessIdentityContractError);
  });

  it("rejects duplicate social labels and destinations", () => {
    expect(() => parseBusinessIdentity({
      ...minimalIdentity(),
      socialLinks: [
        { label: "Instagram", href: "https://example.test/one" },
        { label: "instagram", href: "https://example.test/two" },
      ],
    })).toThrow(BusinessIdentityContractError);
    expect(() => parseBusinessIdentity({
      ...minimalIdentity(),
      socialLinks: [
        { label: "Instagram", href: "https://example.test/shared" },
        { label: "Facebook", href: "https://example.test/shared" },
      ],
    })).toThrow(BusinessIdentityContractError);
  });

  it("rejects overlong repeatable collections", () => {
    expect(() => parseBusinessIdentity({
      ...minimalIdentity(),
      openingHours: Array.from({ length: BUSINESS_IDENTITY_LIMITS.openingHours + 1 }, (_, index) => ({
        label: `Day ${index}`,
        value: "Closed",
      })),
    })).toThrow(BusinessIdentityContractError);
    expect(() => parseBusinessIdentity({
      ...minimalIdentity(),
      socialLinks: Array.from({ length: BUSINESS_IDENTITY_LIMITS.socialLinks + 1 }, (_, index) => ({
        label: `Network ${index}`,
        href: `https://example.test/${index}`,
      })),
    })).toThrow(BusinessIdentityContractError);
  });

  it("rejects unknown properties, accessors, custom prototypes, symbols, and sparse arrays", () => {
    expect(() => parseBusinessIdentity({ ...minimalIdentity(), unknown: true })).toThrow(BusinessIdentityContractError);

    const accessor = minimalIdentity();
    Object.defineProperty(accessor, "companyName", { get: () => "Accessor Moving", enumerable: true });
    expect(() => parseBusinessIdentity(accessor)).toThrow(BusinessIdentityContractError);

    const custom = Object.create({ inherited: true });
    Object.assign(custom, minimalIdentity());
    expect(() => parseBusinessIdentity(custom)).toThrow(BusinessIdentityContractError);

    const symbol = minimalIdentity() as Record<PropertyKey, unknown>;
    symbol[Symbol("hidden")] = true;
    expect(() => parseBusinessIdentity(symbol)).toThrow(BusinessIdentityContractError);

    const sparse = new Array(2);
    sparse[1] = { label: "Saturday", value: "Closed" };
    expect(() => parseBusinessIdentity({ ...minimalIdentity(), openingHours: sparse })).toThrow(BusinessIdentityContractError);
  });
});

function phone() {
  return { display: "+1 202-555-0100", href: "tel:+12025550100" };
}

function minimalIdentity() {
  return { companyName: "Example Moving", primaryPhone: phone() };
}

function completeIdentity() {
  return {
    ...minimalIdentity(),
    logoAssetId: "asset:logo",
    whatsapp: { label: "Message on WhatsApp", href: "https://wa.me/12025550100" },
    email: { display: "hello@example.test", href: "mailto:hello@example.test" },
    address: "100 Example Avenue",
    openingHours: [{ label: "Monday to Friday", value: "08:00 to 18:00" }],
    socialLinks: [{ label: "Instagram", href: "https://example.test/instagram" }],
  };
}
