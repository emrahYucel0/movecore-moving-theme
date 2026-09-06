import { describe, expect, it, vi } from "vitest";
import {
  parsePublicMedia,
  type PublicMediaProjection,
  type PublicNavigationProjection,
  type PublicSettingProjection,
} from "../server/core/contracts";
import { CoreClientError } from "../server/core/errors";
import { corePublicHttpFailure } from "../server/core/http-failure";
import {
  loadPublicSiteComposition,
  PublicSiteCompositionError,
} from "../server/site-composition/route";

const navigation = navigationFixture("primary");
const footerNavigation = navigationFixture("footer");
const setting = settingFixture();
const logo = mediaFixture();

describe("public business shell composition", () => {
  it("fails closed before creating a client when required selectors are absent or partial", async () => {
    const createClient = vi.fn();
    await expect(loadPublicSiteComposition({}, createClient)).rejects.toMatchObject({ kind: "configuration" });
    await expect(loadPublicSiteComposition({
      navigationId: "primary",
      settingNamespace: "moving",
    }, createClient)).rejects.toMatchObject({ kind: "configuration" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("fetches public setting and navigation server-side, then resolves the configured logo", async () => {
    const getNavigation = vi.fn(async (id: string) => id === "footer" ? footerNavigation : navigation);
    const getSetting = vi.fn(async () => setting);
    const getMedia = vi.fn(async () => logo);

    const result = await loadPublicSiteComposition(selectors(), () => ({
      getNavigation,
      getSetting,
      getMedia,
    }));

    expect(getNavigation).toHaveBeenNthCalledWith(1, "primary");
    expect(getNavigation).toHaveBeenNthCalledWith(2, "footer");
    expect(getSetting).toHaveBeenCalledWith("moving", "business");
    expect(getMedia).toHaveBeenCalledWith("asset:business-logo");
    expect(result).toMatchObject({
      navigation: { id: "primary" },
      footerNavigation: { id: "footer" },
      business: {
        companyName: "Example Moving",
        primaryPhone: { display: "+1 202-555-0100", href: "tel:+12025550100" },
        logo: {
          assetId: "asset:business-logo",
          publicUrl: "https://cdn.example.test/logo.svg",
          alt: "Example Moving logo",
          width: 640,
          height: 180,
        },
      },
    });
    const transport = JSON.stringify(result);
    expect(transport).not.toMatch(/namespace|storageKey|contentHash|logoAssetId|privateCoreOrigin/u);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.business)).toBe(true);
  });

  it("uses the typographic logo fallback and reuses primary navigation without extra reads", async () => {
    const getNavigation = vi.fn(async () => navigation);
    const getSetting = vi.fn(async () => ({
      ...setting,
      value: {
        companyName: "No Logo Moving",
        primaryPhone: { display: "+1 202-555-0100", href: "tel:+12025550100" },
      },
    }));
    const getMedia = vi.fn();
    const result = await loadPublicSiteComposition({
      navigationId: "primary",
      settingNamespace: "moving",
      settingKey: "business",
    }, () => ({ getNavigation, getSetting, getMedia }));

    expect(result.business.logo).toBeUndefined();
    expect(result.footerNavigation).toBe(result.navigation);
    expect(getNavigation).toHaveBeenCalledTimes(1);
    expect(getMedia).not.toHaveBeenCalled();
  });

  it("projects equivalent legacy v1 and canonical v2 values to the same public business identity", async () => {
    const legacy = completeLegacyValue();
    const canonical = completeV2Value();
    const compose = (value: unknown) => loadPublicSiteComposition(selectors(), () => ({
      getNavigation: async (id) => id === "footer" ? footerNavigation : navigation,
      getSetting: async () => ({ ...setting, value } as PublicSettingProjection),
      getMedia: async () => logo,
    }));

    expect((await compose(legacy)).business).toEqual((await compose(canonical)).business);
  });

  it.each([
    ["primary navigation missing", async () => null, async () => setting, async () => logo],
    ["setting missing", async () => navigation, async () => null, async () => logo],
    ["malformed setting", async () => navigation, async () => ({ ...setting, value: { companyName: "Broken" } }), async () => logo],
    ["logo missing", async () => navigation, async () => setting, async () => null],
    ["logo non-image", async () => navigation, async () => setting, async () => ({ ...logo, kind: "document" as const })],
  ])("fails closed for %s", async (_case, getNavigation, getSetting, getMedia) => {
    await expect(loadPublicSiteComposition({
      navigationId: "primary",
      settingNamespace: "moving",
      settingKey: "business",
    }, () => ({ getNavigation, getSetting, getMedia }))).rejects.toBeInstanceOf(PublicSiteCompositionError);
  });

  it("fails when a configured footer navigation is missing", async () => {
    await expect(loadPublicSiteComposition(selectors(), () => ({
      getNavigation: async (id) => id === "footer" ? null : navigation,
      getSetting: async () => setting,
      getMedia: async () => logo,
    }))).rejects.toMatchObject({ kind: "application-data" });
  });

  it.each([
    ["navigation", new CoreClientError("unavailable")],
    ["setting", new CoreClientError("network")],
    ["logo", new CoreClientError("protocol")],
  ] as const)("does not swallow a %s Core failure", async (resource, failure) => {
    const getNavigation = vi.fn(async (id: string) => id === "footer" ? footerNavigation : navigation);
    const getSetting = vi.fn(async () => setting);
    const getMedia = vi.fn(async () => logo);
    if (resource === "navigation") getNavigation.mockRejectedValueOnce(failure);
    if (resource === "setting") getSetting.mockRejectedValueOnce(failure);
    if (resource === "logo") getMedia.mockRejectedValueOnce(failure);

    await expect(loadPublicSiteComposition(selectors(), () => ({
      getNavigation,
      getSetting,
      getMedia,
    }))).rejects.toBe(failure);
  });

  it.each([
    [new CoreClientError("invalid-request"), 400],
    [new CoreClientError("protocol"), 502],
    [new CoreClientError("unavailable"), 503],
    [new CoreClientError("network"), 503],
    [new CoreClientError("timeout"), 503],
  ] as const)("keeps existing Core errors mapped to HTTP %i", (error, statusCode) => {
    expect(corePublicHttpFailure(error).statusCode).toBe(statusCode);
  });

  it("strips private media fields before the logo composition receives them", () => {
    const parsed = parsePublicMedia({
      ...logo,
      storageKey: "private/key",
      contentHash: "private-hash",
      original: { ...logo.original, storageKey: "private/original" },
    });
    expect(parsed.original.publicUrl).toBe(logo.original.publicUrl);
    expect(JSON.stringify(parsed)).not.toMatch(/storageKey|contentHash/u);
  });
});

function selectors() {
  return {
    navigationId: " primary ",
    footerNavigationId: "footer",
    settingNamespace: "moving",
    settingKey: "business",
  };
}

function navigationFixture(id: string): PublicNavigationProjection {
  return {
    id,
    items: [{
      id: `${id}-about`,
      label: "About",
      destination: { kind: "internal", path: "/about" },
      children: [],
    }],
  };
}

function settingFixture(): PublicSettingProjection {
  return {
    namespace: "moving",
    key: "business",
    value: completeV2Value(),
  };
}

function completeLegacyValue() {
  return {
    companyName: "Example Moving",
    logoAssetId: "asset:business-logo",
    primaryPhone: { display: "+1 202-555-0100", href: "tel:+12025550100" },
    whatsapp: { label: "Message on WhatsApp", href: "https://wa.me/12025550100" },
    email: { display: "hello@example.test", href: "mailto:hello@example.test" },
    address: "100 Example Avenue",
    openingHours: [{ label: "Monday to Friday", value: "08:00 to 18:00" }],
    socialLinks: [{ label: "Instagram", href: "https://example.test/instagram" }],
  };
}

function completeV2Value() {
  return {
    schemaVersion: 2,
    companyName: "Example Moving",
    logoAssetId: "asset:business-logo",
    primaryPhone: "+1 202-555-0100",
    whatsappUrl: "https://wa.me/12025550100",
    whatsappLabel: "Message on WhatsApp",
    email: "hello@example.test",
    address: "100 Example Avenue",
    openingHours: [{ label: "Monday to Friday", value: "08:00 to 18:00" }],
    socialLinks: [{ label: "Instagram", href: "https://example.test/instagram" }],
  };
}

function mediaFixture(): PublicMediaProjection {
  return {
    assetId: "asset:business-logo",
    kind: "image",
    original: {
      mimeType: "image/svg+xml",
      format: "svg",
      byteSize: 1_024,
      publicUrl: "https://cdn.example.test/logo.svg",
      width: 640,
      height: 180,
      aspectRatio: 640 / 180,
    },
    variants: [],
  };
}
