import {
  projectContentMediaReference,
  type ContentImage,
  type ContentMediaReference,
} from "./media";

const MAX_SECTIONS = 100;

export type SitePageMediaReference = ContentMediaReference;

export interface SitePageSection {
  readonly heading: string;
  readonly body?: string;
  readonly media?: SitePageMediaReference;
}

export interface SitePage {
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro?: string;
  readonly heroMedia?: SitePageMediaReference;
  readonly sections: readonly SitePageSection[];
}

export type SitePageImage = ContentImage;

export interface SitePageSectionViewModel {
  readonly heading: string;
  readonly body?: string;
  readonly media?: SitePageImage;
}

export interface SitePageViewModel {
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro?: string;
  readonly heroMedia?: SitePageImage;
  readonly sections: readonly SitePageSectionViewModel[];
}

export class SitePageContractError extends Error {
  public constructor() {
    super("The site.page payload does not match the application contract.");
    this.name = "SitePageContractError";
  }
}

export function parseSitePagePayload(input: unknown): SitePage {
  const source = plainRecord(input);
  const eyebrow = optionalString(source["eyebrow"], 80);
  const intro = optionalString(source["intro"], 600);
  const heroMedia = optionalMediaReference(source["heroMedia"]);
  const sections = parseSections(source["sections"]);

  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], 160),
    ...(intro === undefined ? {} : { intro }),
    ...(heroMedia === undefined ? {} : { heroMedia }),
    sections,
  });
}

function parseSections(value: unknown): readonly SitePageSection[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value) || value.length > MAX_SECTIONS) throw contractError();
  const sections: SitePageSection[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) throw contractError();
    sections.push(parseSection(value[index]));
  }
  return Object.freeze(sections);
}

function parseSection(value: unknown): SitePageSection {
  const source = plainRecord(value);
  const body = optionalString(source["body"], 2_000);
  const media = optionalMediaReference(source["media"]);
  return Object.freeze({
    heading: requiredString(source["heading"], 160),
    ...(body === undefined ? {} : { body }),
    ...(media === undefined ? {} : { media }),
  });
}

function optionalMediaReference(value: unknown): SitePageMediaReference | undefined {
  if (value === undefined) return undefined;
  const source = plainRecord(value);
  return projectContentMediaReference(source, requiredString);
}

function requiredString(value: unknown, maximum?: number): string {
  if (typeof value !== "string" || value.trim().length === 0 ||
    (maximum !== undefined && value.length > maximum)) {
    throw contractError();
  }
  return value;
}

function optionalString(value: unknown, maximum: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maximum) throw contractError();
  return value;
}

function plainRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw contractError();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw contractError();
  if (Object.getOwnPropertySymbols(value).length > 0) throw contractError();
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor?.get !== undefined || descriptor?.set !== undefined) throw contractError();
  }
  return value as Readonly<Record<string, unknown>>;
}

function contractError(): SitePageContractError {
  return new SitePageContractError();
}
