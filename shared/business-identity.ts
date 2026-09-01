export const BUSINESS_IDENTITY_LIMITS = Object.freeze({
  companyName: 120,
  assetId: 191,
  contactLabel: 80,
  contactDisplay: 120,
  contactHref: 2_048,
  address: 500,
  hoursLabel: 80,
  hoursValue: 160,
  openingHours: 14,
  socialLinks: 8,
});

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

export class BusinessIdentityContractError extends Error {
  public constructor() {
    super("The moving business setting does not match the application contract.");
    this.name = "BusinessIdentityContractError";
  }
}

export function parseBusinessIdentity(input: unknown): BusinessIdentity {
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
  const logoAssetId = optionalString(source["logoAssetId"], BUSINESS_IDENTITY_LIMITS.assetId);
  const whatsapp = optionalContactAction(source["whatsapp"]);
  const email = optionalEmail(source["email"]);
  const address = optionalString(source["address"], BUSINESS_IDENTITY_LIMITS.address);
  const openingHours = source["openingHours"] === undefined
    ? Object.freeze([])
    : parseBoundedArray(source["openingHours"], BUSINESS_IDENTITY_LIMITS.openingHours, parseOpeningHours);
  const socialLinks = source["socialLinks"] === undefined
    ? Object.freeze([])
    : parseSocialLinks(source["socialLinks"]);

  return Object.freeze({
    companyName: requiredString(source["companyName"], BUSINESS_IDENTITY_LIMITS.companyName),
    ...(logoAssetId === undefined ? {} : { logoAssetId }),
    primaryPhone: parsePhone(source["primaryPhone"]),
    ...(whatsapp === undefined ? {} : { whatsapp }),
    ...(email === undefined ? {} : { email }),
    ...(address === undefined ? {} : { address }),
    openingHours,
    socialLinks,
  });
}

function parsePhone(value: unknown): BusinessPhone {
  const source = exactRecord(value, ["display", "href"], ["display", "href"]);
  const href = requiredString(source["href"], BUSINESS_IDENTITY_LIMITS.contactHref);
  if (!/^tel:\+[1-9][0-9]{6,14}$/u.test(href)) throw contractError();
  return Object.freeze({
    display: requiredString(source["display"], BUSINESS_IDENTITY_LIMITS.contactDisplay),
    href,
  });
}

function optionalContactAction(value: unknown): BusinessContactAction | undefined {
  if (value === undefined) return undefined;
  const source = exactRecord(value, ["label", "href"], ["label", "href"]);
  const href = requiredHttpsUrl(source["href"]);
  const parsed = new URL(href);
  if (!["wa.me", "api.whatsapp.com", "www.whatsapp.com"].includes(parsed.hostname.toLowerCase())) {
    throw contractError();
  }
  return Object.freeze({
    label: requiredString(source["label"], BUSINESS_IDENTITY_LIMITS.contactLabel),
    href,
  });
}

function optionalEmail(value: unknown): BusinessEmail | undefined {
  if (value === undefined) return undefined;
  const source = exactRecord(value, ["display", "href"], ["display", "href"]);
  const display = requiredString(source["display"], BUSINESS_IDENTITY_LIMITS.contactDisplay);
  const href = requiredString(source["href"], BUSINESS_IDENTITY_LIMITS.contactHref);
  if (!/^mailto:[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/iu.test(href) ||
    href.slice("mailto:".length).toLowerCase() !== display.toLowerCase()) {
    throw contractError();
  }
  return Object.freeze({ display, href });
}

function parseOpeningHours(value: unknown): BusinessOpeningHours {
  const source = exactRecord(value, ["label", "value"], ["label", "value"]);
  return Object.freeze({
    label: requiredString(source["label"], BUSINESS_IDENTITY_LIMITS.hoursLabel),
    value: requiredString(source["value"], BUSINESS_IDENTITY_LIMITS.hoursValue),
  });
}

function parseSocialLinks(value: unknown): readonly BusinessSocialLink[] {
  const links = parseBoundedArray(value, BUSINESS_IDENTITY_LIMITS.socialLinks, (entry) => {
    const source = exactRecord(entry, ["label", "href"], ["label", "href"]);
    return Object.freeze({
      label: requiredString(source["label"], BUSINESS_IDENTITY_LIMITS.contactLabel),
      href: requiredHttpsUrl(source["href"]),
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

function requiredHttpsUrl(value: unknown): string {
  const href = requiredString(value, BUSINESS_IDENTITY_LIMITS.contactHref);
  if (/[\s\u0000-\u001f\u007f\\]/u.test(href)) throw contractError();
  try {
    const parsed = new URL(href);
    if (parsed.protocol !== "https:" || parsed.hostname.length === 0 ||
      parsed.username !== "" || parsed.password !== "") throw contractError();
  } catch {
    throw contractError();
  }
  return href;
}

function optionalString(value: unknown, maximum: number): string | undefined {
  return value === undefined ? undefined : requiredString(value, maximum);
}

function requiredString(value: unknown, maximum: number): string {
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
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw contractError();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw contractError();
  if (Object.getOwnPropertySymbols(value).length > 0) throw contractError();
  const properties = Object.getOwnPropertyNames(value);
  for (const property of properties) {
    const descriptor = Object.getOwnPropertyDescriptor(value, property);
    if (descriptor?.get !== undefined || descriptor?.set !== undefined || !allowed.includes(property)) {
      throw contractError();
    }
  }
  for (const property of required) {
    if (!Object.prototype.hasOwnProperty.call(value, property)) throw contractError();
  }
  return value as Readonly<Record<string, unknown>>;
}

function contractError(): BusinessIdentityContractError {
  return new BusinessIdentityContractError();
}
