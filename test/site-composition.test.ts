import { describe, expect, it, vi } from "vitest";
import {
  parsePublicMedia,
  type PublicMediaProjection,
  type PublicNavigationProjection,
  type PublicSettingProjection,
} from "../server/core/contracts";
import { CoreClientError } from "../server/core/errors";
import { corePublicHttpFailure } from "../server/core/http-failure";
import { loadPublicSiteComposition } from "../server/site-composition/route";

const navigation = {
  id: "primary",
  items: [
    {
      id: "about",
      label: "About",
      destination: { kind: "internal", path: "/about" },
      children: [
        {
          id: "team",
          label: "Team",
          destination: { kind: "internal", path: "/about/team" },
          children: [],
        },
      ],
    },
    {
      id: "external",
      label: "Example",
      destination: { kind: "external", url: "https://example.org" },
      children: [],
    },
  ],
} satisfies PublicNavigationProjection;

const setting = {
  namespace: "site",
  key: "foundation",
  value: { arbitrary: [true, 42, { nested: "value" }] },
} satisfies PublicSettingProjection;

const media = {
  assetId: "foundation-image",
  kind: "image",
  original: {
    mimeType: "image/webp",
    format: "webp",
    byteSize: 1234,
    publicUrl: "https://cdn.example.test/media/foundation.webp",
    width: 1200,
    height: 800,
    aspectRatio: 1.5,
  },
  variants: [],
} satisfies PublicMediaProjection;

describe("public site composition", () => {
  it("does not create a Core client when optional selectors are absent", async () => {
    const createClient = vi.fn();

    await expect(loadPublicSiteComposition({}, createClient)).resolves.toEqual({
      navigation: null,
      setting: null,
      media: null,
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("treats a partial setting selector as disabled", async () => {
    const createClient = vi.fn();
    await loadPublicSiteComposition({ settingNamespace: "site" }, createClient);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("loads configured navigation, setting, and media through their fixed client methods", async () => {
    const getNavigation = vi.fn(async () => navigation);
    const getSetting = vi.fn(async () => setting);
    const getMedia = vi.fn(async () => media);

    const result = await loadPublicSiteComposition({
      navigationId: " primary ",
      settingNamespace: "site",
      settingKey: "foundation",
      mediaId: "foundation-image",
    }, () => ({ getNavigation, getSetting, getMedia }));

    expect(getNavigation).toHaveBeenCalledWith("primary");
    expect(getSetting).toHaveBeenCalledWith("site", "foundation");
    expect(getMedia).toHaveBeenCalledWith("foundation-image");
    expect(result.navigation?.items[0]?.children[0]?.destination).toEqual({
      kind: "internal",
      path: "/about/team",
    });
    expect(result.navigation?.items[1]?.destination).toEqual({
      kind: "external",
      url: "https://example.org",
    });
    expect(result.setting?.value).toEqual(setting.value);
    expect(result.media?.original).toEqual(media.original);
  });

  it("keeps real optional-resource 404 results as null", async () => {
    const result = await loadPublicSiteComposition({
      navigationId: "missing-nav",
      settingNamespace: "site",
      settingKey: "missing",
      mediaId: "missing-media",
    }, () => ({
      getNavigation: async () => null,
      getSetting: async () => null,
      getMedia: async () => null,
    }));

    expect(result).toEqual({ navigation: null, setting: null, media: null });
  });

  it.each([
    ["navigation", new CoreClientError("unavailable")],
    ["setting", new CoreClientError("network")],
    ["media", new CoreClientError("protocol")],
  ] as const)("does not swallow a %s infrastructure failure", async (resource, failure) => {
    const getNavigation = vi.fn(async () => navigation);
    const getSetting = vi.fn(async () => setting);
    const getMedia = vi.fn(async () => media);
    if (resource === "navigation") getNavigation.mockRejectedValueOnce(failure);
    if (resource === "setting") getSetting.mockRejectedValueOnce(failure);
    if (resource === "media") getMedia.mockRejectedValueOnce(failure);

    await expect(loadPublicSiteComposition({
      navigationId: "primary",
      settingNamespace: "site",
      settingKey: "foundation",
      mediaId: "foundation-image",
    }, () => ({ getNavigation, getSetting, getMedia }))).rejects.toBe(failure);
  });

  it.each([
    [new CoreClientError("invalid-request"), 400],
    [new CoreClientError("protocol"), 502],
    [new CoreClientError("unavailable"), 503],
    [new CoreClientError("network"), 503],
    [new CoreClientError("timeout"), 503],
  ] as const)("maps composition errors to HTTP %i", (error, statusCode) => {
    expect(corePublicHttpFailure(error).statusCode).toBe(statusCode);
  });

  it("strips private media storage fields while preserving its public URL and dimensions", () => {
    const parsed = parsePublicMedia({
      ...media,
      storageKey: "private/key",
      originalFilename: "secret-name.webp",
      contentHash: "private-hash",
      original: {
        ...media.original,
        storageKey: "private/original",
        contentHash: "private-object-hash",
      },
    });
    const transport = JSON.stringify(parsed);

    expect(parsed.original.publicUrl).toBe(media.original.publicUrl);
    expect(parsed.original.width).toBe(1200);
    expect(parsed.original.height).toBe(800);
    expect(transport).not.toMatch(/storageKey|originalFilename|contentHash/u);
  });
});
