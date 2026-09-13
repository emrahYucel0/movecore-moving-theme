export const MOVING_BUSINESS_SETTING_VERSION = 2 as const;

export const BUSINESS_IDENTITY_LIMITS = Object.freeze({
  companyName: 120,
  assetId: 191,
  phone: 120,
  contactLabel: 80,
  contactDisplay: 120,
  contactHref: 2_048,
  email: 254,
  address: 500,
  hoursLabel: 80,
  hoursValue: 160,
  openingHours: 14,
  socialLinks: 8,
  articleArchiveSeoTitle: 160,
  articleArchiveSeoDescription: 300,
});

export interface MovingBusinessSettingV2 {
  readonly schemaVersion: typeof MOVING_BUSINESS_SETTING_VERSION;
  readonly companyName: string;
  readonly logoAssetId?: string;
  /** Buyer-visible number. It is also the default source for the derived tel: link. */
  readonly primaryPhone: string;
  /** Needed only when the dial target genuinely differs from the visible number. */
  readonly primaryPhoneDial?: string;
  readonly whatsappUrl?: string;
  readonly whatsappLabel?: string;
  readonly email?: string;
  readonly address?: string;
  readonly openingHours: readonly BusinessOpeningHours[];
  readonly socialLinks: readonly BusinessSocialLink[];
  readonly articleArchiveSeoTitle?: string;
  readonly articleArchiveSeoDescription?: string;
  readonly defaultSocialImageAssetId?: string;
}

export interface BusinessPhone {
  readonly display: string;
  readonly href: string;
}

export interface BusinessContactAction {
  readonly label: string;
  readonly href: string;
}

export interface BusinessEmail {
  readonly display: string;
  readonly href: string;
}

export interface BusinessOpeningHours {
  readonly label: string;
  readonly value: string;
}

export interface BusinessSocialLink {
  readonly label: string;
  readonly href: string;
}

export interface MovingSiteSeoSetting {
  readonly articleArchiveSeoTitle?: string;
  readonly articleArchiveSeoDescription?: string;
  readonly defaultSocialImageAssetId?: string;
}

/** Runtime-only projection consumed by public components. */
export interface BusinessIdentity {
  readonly companyName: string;
  readonly logoAssetId?: string;
  readonly primaryPhone: BusinessPhone;
  readonly whatsapp?: BusinessContactAction;
  readonly email?: BusinessEmail;
  readonly address?: string;
  readonly openingHours: readonly BusinessOpeningHours[];
  readonly socialLinks: readonly BusinessSocialLink[];
}

interface LegacyBusinessSettingV1 {
  readonly companyName: string;
  readonly logoAssetId?: string;
  readonly primaryPhone: BusinessPhone;
  readonly whatsapp?: BusinessContactAction;
  readonly email?: BusinessEmail;
  readonly address?: string;
  readonly openingHours: readonly BusinessOpeningHours[];
  readonly socialLinks: readonly BusinessSocialLink[];
}

export class BusinessIdentityContractError extends Error {
  public constructor() {
    super("The moving business setting does not match the application contract.");
    this.name = "BusinessIdentityContractError";
  }
}

/** Reads either persisted version and exposes one stable runtime projection. */
export function parseBusinessIdentity(input: unknown): BusinessIdentity {
  const source = dataRecord(input);
  if (source["schemaVersion"] === MOVING_BUSINESS_SETTING_VERSION) {
    return projectV2(parseMovingBusinessSettingV2(source));
  }
  if (Object.hasOwn(source, "schemaVersion")) throw contractError();
  return projectLegacy(parseLegacyBusinessSettingV1(source));
}

/** Reads application-owned SEO values without exposing them as business identity. */
export function parseMovingSiteSeoSetting(input: unknown): MovingSiteSeoSetting {
  const source = dataRecord(input);
  if (source["schemaVersion"] === MOVING_BUSINESS_SETTING_VERSION) {
    const setting = parseMovingBusinessSettingV2(source);
    return Object.freeze({
      ...(setting.articleArchiveSeoTitle === undefined
        ? {}
        : { articleArchiveSeoTitle: setting.articleArchiveSeoTitle }),
      ...(setting.articleArchiveSeoDescription === undefined
        ? {}
        : { articleArchiveSeoDescription: setting.articleArchiveSeoDescription }),
      ...(setting.defaultSocialImageAssetId === undefined
        ? {}
        : { defaultSocialImageAssetId: setting.defaultSocialImageAssetId }),
    });
  }
  if (Object.hasOwn(source, "schemaVersion")) throw contractError();
  parseLegacyBusinessSettingV1(source);
  return Object.freeze({});
}

/** Parses canonical persisted v2 data without exposing persistence details to components. */
export function parseMovingBusinessSettingV2(input: unknown): MovingBusinessSettingV2 {
  const source = dataRecord(input);
  if (source["schemaVersion"] !== MOVING_BUSINESS_SETTING_VERSION) throw contractError();
  const logoAssetId = optionalAssetId(source["logoAssetId"]);
  const primaryPhoneDial = optionalCoreText(source["primaryPhoneDial"], BUSINESS_IDENTITY_LIMITS.phone, false);
  const whatsappUrl = optionalHttpUrl(source["whatsappUrl"]);
  const whatsappLabel = optionalCoreText(source["whatsappLabel"], BUSINESS_IDENTITY_LIMITS.contactLabel, false);
  const email = optionalEmailAddress(source["email"]);
  const address = optionalCoreText(source["address"], BUSINESS_IDENTITY_LIMITS.address, true);
  const openingHours = source["openingHours"] === undefined
    ? Object.freeze([])
    : parseBoundedArray(source["openingHours"], BUSINESS_IDENTITY_LIMITS.openingHours, parseV2OpeningHours);
  const socialLinks = source["socialLinks"] === undefined
    ? Object.freeze([])
    : parseBoundedArray(source["socialLinks"], BUSINESS_IDENTITY_LIMITS.socialLinks, parseV2SocialLink);
  const articleArchiveSeoTitle = optionalNormalizedSeoText(
    source["articleArchiveSeoTitle"],
    BUSINESS_IDENTITY_LIMITS.articleArchiveSeoTitle,
  );
  const articleArchiveSeoDescription = optionalNormalizedSeoText(
    source["articleArchiveSeoDescription"],
    BUSINESS_IDENTITY_LIMITS.articleArchiveSeoDescription,
  );
  const defaultSocialImageAssetId = optionalAssetId(source["defaultSocialImageAssetId"]);

  return Object.freeze({
    schemaVersion: MOVING_BUSINESS_SETTING_VERSION,
    companyName: requiredCoreText(source["companyName"], BUSINESS_IDENTITY_LIMITS.companyName, false),
    ...(logoAssetId === undefined ? {} : { logoAssetId }),
    primaryPhone: requiredCoreText(source["primaryPhone"], BUSINESS_IDENTITY_LIMITS.phone, false),
    ...(primaryPhoneDial === undefined ? {} : { primaryPhoneDial }),
    ...(whatsappUrl === undefined ? {} : { whatsappUrl }),
    ...(whatsappLabel === undefined ? {} : { whatsappLabel }),
    ...(email === undefined ? {} : { email }),
    ...(address === undefined ? {} : { address }),
    openingHours,
    socialLinks,
    ...(articleArchiveSeoTitle === undefined ? {} : { articleArchiveSeoTitle }),
    ...(articleArchiveSeoDescription === undefined ? {} : { articleArchiveSeoDescription }),
    ...(defaultSocialImageAssetId === undefined ? {} : { defaultSocialImageAssetId }),
  });
}

/** Pure, deterministic legacy/v2 input to canonical v2 conversion. */
export function convertBusinessSettingToV2(input: unknown): MovingBusinessSettingV2 {
  const source = dataRecord(input);
  if (source["schemaVersion"] === MOVING_BUSINESS_SETTING_VERSION) {
    return parseMovingBusinessSettingV2(source);
  }
  if (Object.hasOwn(source, "schemaVersion")) throw contractError();
  const legacy = parseLegacyBusinessSettingV1(source);
  const derivedPhoneHref = toTelHref(legacy.primaryPhone.display);
  const primaryPhoneDial = derivedPhoneHref === legacy.primaryPhone.href
    ? undefined
    : legacy.primaryPhone.href.slice("tel:".length);
  return parseMovingBusinessSettingV2({
    schemaVersion: MOVING_BUSINESS_SETTING_VERSION,
    companyName: legacy.companyName,
    ...(legacy.logoAssetId === undefined ? {} : { logoAssetId: legacy.logoAssetId }),
    primaryPhone: legacy.primaryPhone.display,
    ...(primaryPhoneDial === undefined ? {} : { primaryPhoneDial }),
    ...(legacy.whatsapp === undefined ? {} : {
      whatsappUrl: legacy.whatsapp.href,
      whatsappLabel: legacy.whatsapp.label,
    }),
    ...(legacy.email === undefined ? {} : { email: legacy.email.display }),
    ...(legacy.address === undefined ? {} : { address: legacy.address }),
    openingHours: legacy.openingHours,
    socialLinks: legacy.socialLinks,
  });
}

/** Produces a scheme-fixed link from any bounded Core phone-field value. */
export function toTelHref(input: string): string {
  const value = requiredCoreText(input, BUSINESS_IDENTITY_LIMITS.phone, false);
  const normalized = value.normalize("NFKC");
  const digits = normalized.replace(/[^0-9]/gu, "");
  const prefix = normalized.trimStart().startsWith("+") ? "+" : "";
  return `tel:${prefix}${digits}`;
}

/** Percent-encodes the address while fixing the mailto scheme in application code. */
export function toMailtoHref(input: string): string {
  const email = requiredEmailAddress(input);
  return `mailto:${encodeURIComponent(email).replace(/%40/giu, "@").replace(/'/gu, "%27")}`;
}

function projectV2(setting: MovingBusinessSettingV2): BusinessIdentity {
  const phoneSource = setting.primaryPhoneDial?.trim()
    ? setting.primaryPhoneDial
    : setting.primaryPhone;
  const whatsapp = setting.whatsappUrl === undefined
    ? undefined
    : Object.freeze({
      label: setting.whatsappLabel?.trim() ? setting.whatsappLabel : "WhatsApp",
      href: setting.whatsappUrl,
    });
  const email = setting.email === undefined
    ? undefined
    : Object.freeze({ display: setting.email, href: toMailtoHref(setting.email) });
  return Object.freeze({
    companyName: setting.companyName,
    ...(setting.logoAssetId === undefined ? {} : { logoAssetId: setting.logoAssetId }),
    primaryPhone: Object.freeze({ display: setting.primaryPhone, href: toTelHref(phoneSource) }),
    ...(whatsapp === undefined ? {} : { whatsapp }),
    ...(email === undefined ? {} : { email }),
    ...(setting.address === undefined ? {} : { address: setting.address }),
    openingHours: setting.openingHours,
    socialLinks: setting.socialLinks,
  });
}

function projectLegacy(setting: LegacyBusinessSettingV1): BusinessIdentity {
  return Object.freeze({
    companyName: setting.companyName,
    ...(setting.logoAssetId === undefined ? {} : { logoAssetId: setting.logoAssetId }),
    primaryPhone: setting.primaryPhone,
    ...(setting.whatsapp === undefined ? {} : { whatsapp: setting.whatsapp }),
    ...(setting.email === undefined ? {} : { email: setting.email }),
    ...(setting.address === undefined ? {} : { address: setting.address }),
    openingHours: setting.openingHours,
    socialLinks: setting.socialLinks,
  });
}

function parseLegacyBusinessSettingV1(input: unknown): LegacyBusinessSettingV1 {
  const source = exactRecord(input, [
    "companyName",
    "logoAssetId",
    "primaryPhone",
    "whatsapp",
    "email",
    "address",
    "openingHours",
    "socialLinks",
  ], ["companyName", "primaryPhone"]);
  const logoAssetId = optionalLegacyString(source["logoAssetId"], BUSINESS_IDENTITY_LIMITS.assetId);
  const whatsapp = optionalLegacyContactAction(source["whatsapp"]);
  const email = optionalLegacyEmail(source["email"]);
  const address = optionalLegacyString(source["address"], BUSINESS_IDENTITY_LIMITS.address);
  const openingHours = source["openingHours"] === undefined
    ? Object.freeze([])
    : parseBoundedArray(source["openingHours"], BUSINESS_IDENTITY_LIMITS.openingHours, parseLegacyOpeningHours);
  const socialLinks = source["socialLinks"] === undefined
    ? Object.freeze([])
    : parseLegacySocialLinks(source["socialLinks"]);
  return Object.freeze({
    companyName: requiredLegacyString(source["companyName"], BUSINESS_IDENTITY_LIMITS.companyName),
    ...(logoAssetId === undefined ? {} : { logoAssetId }),
    primaryPhone: parseLegacyPhone(source["primaryPhone"]),
    ...(whatsapp === undefined ? {} : { whatsapp }),
    ...(email === undefined ? {} : { email }),
    ...(address === undefined ? {} : { address }),
    openingHours,
    socialLinks,
  });
}

function parseLegacyPhone(value: unknown): BusinessPhone {
  const source = exactRecord(value, ["display", "href"], ["display", "href"]);
  const href = requiredLegacyString(source["href"], BUSINESS_IDENTITY_LIMITS.contactHref);
  if (!/^tel:\+[1-9][0-9]{6,14}$/u.test(href)) throw contractError();
  return Object.freeze({
    display: requiredLegacyString(source["display"], BUSINESS_IDENTITY_LIMITS.contactDisplay),
    href,
  });
}

function optionalLegacyContactAction(value: unknown): BusinessContactAction | undefined {
  if (value === undefined) return undefined;
  const source = exactRecord(value, ["label", "href"], ["label", "href"]);
  const href = requiredLegacyHttpsUrl(source["href"]);
  const parsed = new URL(href);
  if (!["wa.me", "api.whatsapp.com", "www.whatsapp.com"].includes(parsed.hostname.toLowerCase())) {
    throw contractError();
  }
  return Object.freeze({
    label: requiredLegacyString(source["label"], BUSINESS_IDENTITY_LIMITS.contactLabel),
    href,
  });
}

function optionalLegacyEmail(value: unknown): BusinessEmail | undefined {
  if (value === undefined) return undefined;
  const source = exactRecord(value, ["display", "href"], ["display", "href"]);
  const display = requiredLegacyString(source["display"], BUSINESS_IDENTITY_LIMITS.contactDisplay);
  const href = requiredLegacyString(source["href"], BUSINESS_IDENTITY_LIMITS.contactHref);
  if (!/^mailto:[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/iu.test(href) ||
    href.slice("mailto:".length).toLowerCase() !== display.toLowerCase()) {
    throw contractError();
  }
  return Object.freeze({ display, href });
}

function parseLegacyOpeningHours(value: unknown): BusinessOpeningHours {
  const source = exactRecord(value, ["label", "value"], ["label", "value"]);
  return Object.freeze({
    label: requiredLegacyString(source["label"], BUSINESS_IDENTITY_LIMITS.hoursLabel),
    value: requiredLegacyString(source["value"], BUSINESS_IDENTITY_LIMITS.hoursValue),
  });
}

function parseLegacySocialLinks(value: unknown): readonly BusinessSocialLink[] {
  const links = parseBoundedArray(value, BUSINESS_IDENTITY_LIMITS.socialLinks, (entry) => {
    const source = exactRecord(entry, ["label", "href"], ["label", "href"]);
    return Object.freeze({
      label: requiredLegacyString(source["label"], BUSINESS_IDENTITY_LIMITS.contactLabel),
      href: requiredLegacyHttpsUrl(source["href"]),
    });
  });
  const labels = new Set<string>();
  const hrefs = new Set<string>();
  for (const link of links) {
    const label = link.label.toLocaleLowerCase("en-US");
    if (labels.has(label) || hrefs.has(link.href)) throw contractError();
    labels.add(label);
    hrefs.add(link.href);
  }
  return links;
}

function parseV2OpeningHours(value: unknown): BusinessOpeningHours {
  const source = dataRecord(value);
  return Object.freeze({
    label: requiredCoreText(source["label"], BUSINESS_IDENTITY_LIMITS.hoursLabel, false),
    value: requiredCoreText(source["value"], BUSINESS_IDENTITY_LIMITS.hoursValue, false),
  });
}

function parseV2SocialLink(value: unknown): BusinessSocialLink {
  const source = dataRecord(value);
  return Object.freeze({
    label: requiredCoreText(source["label"], BUSINESS_IDENTITY_LIMITS.contactLabel, false),
    href: requiredHttpUrl(source["href"]),
  });
}

function requiredHttpUrl(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > BUSINESS_IDENTITY_LIMITS.contactHref ||
    /[\s\\]/u.test(value) || !/^https?:\/\//u.test(value)) throw contractError();
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
      throw contractError();
    }
  } catch {
    throw contractError();
  }
  return value;
}

function optionalHttpUrl(value: unknown): string | undefined {
  return value === undefined ? undefined : requiredHttpUrl(value);
}

function requiredLegacyHttpsUrl(value: unknown): string {
  const href = requiredLegacyString(value, BUSINESS_IDENTITY_LIMITS.contactHref);
  if (/[\s\u0000-\u001f\u007f\\]/u.test(href)) throw contractError();
  try {
    const parsed = new URL(href);
    if (parsed.protocol !== "https:" || parsed.hostname.length === 0 || parsed.username || parsed.password) {
      throw contractError();
    }
  } catch {
    throw contractError();
  }
  return href;
}

function requiredEmailAddress(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > BUSINESS_IDENTITY_LIMITS.email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) throw contractError();
  return value;
}

function optionalEmailAddress(value: unknown): string | undefined {
  return value === undefined ? undefined : requiredEmailAddress(value);
}

function requiredCoreText(value: unknown, maximum: number, multiline: boolean): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || !value.trim() ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value) ||
    (!multiline && /[\r\n\t]/u.test(value))) throw contractError();
  return value;
}

function optionalCoreText(value: unknown, maximum: number, multiline: boolean): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maximum ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value) ||
    (!multiline && /[\r\n\t]/u.test(value))) throw contractError();
  return value;
}

function optionalNormalizedSeoText(value: unknown, maximum: number): string | undefined {
  const source = optionalCoreText(value, maximum, true);
  if (source === undefined) return undefined;
  const normalized = source.replace(/\s+/gu, " ").trim();
  return normalized.length === 0 ? undefined : normalized;
}

function optionalAssetId(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0 || value.length > BUSINESS_IDENTITY_LIMITS.assetId ||
    value !== value.trim() || /[\u0000-\u001f\u007f]/u.test(value)) throw contractError();
  return value;
}

function optionalLegacyString(value: unknown, maximum: number): string | undefined {
  return value === undefined ? undefined : requiredLegacyString(value, maximum);
}

function requiredLegacyString(value: unknown, maximum: number): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum ||
    value.trim() !== value || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) {
    throw contractError();
  }
  return value;
}

function parseBoundedArray<T>(
  value: unknown,
  maximum: number,
  parseItem: (entry: unknown) => T,
): readonly T[] {
  const source = denseArray(value, maximum);
  const result: T[] = [];
  for (let index = 0; index < source.length; index += 1) result.push(parseItem(source[index]));
  return Object.freeze(result);
}

function denseArray(value: unknown, maximum: number): readonly unknown[] {
  if (!Array.isArray(value) || value.length > maximum || Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length > 0) throw contractError();
  for (const property of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, property);
    if (descriptor?.get !== undefined || descriptor?.set !== undefined) throw contractError();
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) throw contractError();
  }
  return value;
}

function exactRecord(
  value: unknown,
  allowed: readonly string[],
  required: readonly string[],
): Readonly<Record<string, unknown>> {
  const source = dataRecord(value);
  const properties = Object.getOwnPropertyNames(source);
  if (properties.some((property) => !allowed.includes(property)) ||
    required.some((property) => !Object.prototype.hasOwnProperty.call(source, property))) {
    throw contractError();
  }
  return source;
}

/** V2 ignores unknown data properties so future typed-editor preservation remains readable. */
function dataRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw contractError();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw contractError();
  if (Object.getOwnPropertySymbols(value).length > 0) throw contractError();
  for (const property of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, property);
    if (descriptor?.get !== undefined || descriptor?.set !== undefined || descriptor?.enumerable !== true || !("value" in (descriptor ?? {}))) {
      throw contractError();
    }
  }
  return value as Readonly<Record<string, unknown>>;
}

function contractError(): BusinessIdentityContractError {
  return new BusinessIdentityContractError();
}
