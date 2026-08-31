import {
  projectContentMediaReference,
  type ContentImage,
  type ContentMediaReference,
} from "./media";

export const MOVING_HOME_LIMITS = Object.freeze({
  eyebrow: 80,
  title: 160,
  intro: 600,
  actionLabel: 80,
  href: 2_048,
  proofValue: 40,
  proofLabel: 100,
  itemTitle: 100,
  itemDescription: 320,
  assuranceBody: 1_200,
  assurancePoint: 200,
  areaLabel: 100,
  finalBody: 600,
});

export interface ActionLink {
  readonly label: string;
  readonly href: string;
}

export interface MovingHomeHero {
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro: string;
  readonly media: ContentMediaReference;
  readonly primaryAction: ActionLink;
  readonly secondaryAction?: ActionLink;
}

export interface MovingProofItem {
  readonly value: string;
  readonly label: string;
}

export interface MovingServiceSummary {
  readonly title: string;
  readonly description: string;
  readonly href: string;
}

export interface MovingServicesSection {
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro?: string;
  readonly items: readonly MovingServiceSummary[];
}

export interface MovingProcessStep {
  readonly title: string;
  readonly description: string;
}

export interface MovingProcessSection {
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro?: string;
  readonly steps: readonly MovingProcessStep[];
}

export interface MovingAssuranceSection {
  readonly eyebrow?: string;
  readonly title: string;
  readonly body: string;
  readonly media?: ContentMediaReference;
  readonly points: readonly string[];
}

export interface MovingAreaLink {
  readonly label: string;
  readonly href: string;
}

export interface MovingServiceAreasSection {
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro?: string;
  readonly areas: readonly MovingAreaLink[];
}

export interface MovingActionSection {
  readonly eyebrow?: string;
  readonly title: string;
  readonly body?: string;
  readonly primaryAction: ActionLink;
  readonly secondaryAction?: ActionLink;
}

export interface MovingHome {
  readonly hero: MovingHomeHero;
  readonly proof: readonly MovingProofItem[];
  readonly services: MovingServicesSection;
  readonly process: MovingProcessSection;
  readonly assurance: MovingAssuranceSection;
  readonly serviceAreas: MovingServiceAreasSection;
  readonly finalAction: MovingActionSection;
}

export interface MovingHomeHeroViewModel extends Omit<MovingHomeHero, "media"> {
  readonly media: ContentImage;
}

export interface MovingAssuranceViewModel extends Omit<MovingAssuranceSection, "media"> {
  readonly media?: ContentImage;
}

export interface MovingHomeViewModel extends Omit<MovingHome, "hero" | "assurance"> {
  readonly hero: MovingHomeHeroViewModel;
  readonly assurance: MovingAssuranceViewModel;
}

export class MovingHomeContractError extends Error {
  public constructor() {
    super("The moving.home payload does not match the application contract.");
    this.name = "MovingHomeContractError";
  }
}

export function parseMovingHomePayload(input: unknown): MovingHome {
  const source = plainRecord(input);
  return Object.freeze({
    hero: parseHero(source["hero"]),
    proof: parseBoundedArray(source["proof"], 2, 6, parseProofItem),
    services: parseServices(source["services"]),
    process: parseProcess(source["process"]),
    assurance: parseAssurance(source["assurance"]),
    serviceAreas: parseServiceAreas(source["serviceAreas"]),
    finalAction: parseFinalAction(source["finalAction"]),
  });
}

export function isSafeActionHref(value: string): boolean {
  if (value.length === 0 || value.length > MOVING_HOME_LIMITS.href || value.trim() !== value ||
    /[\s\u0000-\u001f\u007f\\]/u.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  if (value.startsWith("tel:") || value.startsWith("mailto:")) {
    return value.slice(value.indexOf(":") + 1).length > 0;
  }
  if (!value.startsWith("http://") && !value.startsWith("https://")) return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.hostname.length > 0 && parsed.username === "" && parsed.password === "";
  } catch {
    return false;
  }
}

function parseHero(value: unknown): MovingHomeHero {
  const source = plainRecord(value);
  const eyebrow = optionalString(source["eyebrow"], MOVING_HOME_LIMITS.eyebrow);
  const secondaryAction = optionalAction(source["secondaryAction"]);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], MOVING_HOME_LIMITS.title),
    intro: requiredString(source["intro"], MOVING_HOME_LIMITS.intro),
    media: parseMedia(source["media"]),
    primaryAction: parseAction(source["primaryAction"]),
    ...(secondaryAction === undefined ? {} : { secondaryAction }),
  });
}

function parseProofItem(value: unknown): MovingProofItem {
  const source = plainRecord(value);
  return Object.freeze({
    value: requiredString(source["value"], MOVING_HOME_LIMITS.proofValue),
    label: requiredString(source["label"], MOVING_HOME_LIMITS.proofLabel),
  });
}

function parseServices(value: unknown): MovingServicesSection {
  const source = plainRecord(value);
  const eyebrow = optionalString(source["eyebrow"], MOVING_HOME_LIMITS.eyebrow);
  const intro = optionalString(source["intro"], MOVING_HOME_LIMITS.intro);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], MOVING_HOME_LIMITS.title),
    ...(intro === undefined ? {} : { intro }),
    items: parseBoundedArray(source["items"], 3, 8, parseService),
  });
}

function parseService(value: unknown): MovingServiceSummary {
  const source = plainRecord(value);
  return Object.freeze({
    title: requiredString(source["title"], MOVING_HOME_LIMITS.itemTitle),
    description: requiredString(source["description"], MOVING_HOME_LIMITS.itemDescription),
    href: requiredHref(source["href"]),
  });
}

function parseProcess(value: unknown): MovingProcessSection {
  const source = plainRecord(value);
  const eyebrow = optionalString(source["eyebrow"], MOVING_HOME_LIMITS.eyebrow);
  const intro = optionalString(source["intro"], MOVING_HOME_LIMITS.intro);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], MOVING_HOME_LIMITS.title),
    ...(intro === undefined ? {} : { intro }),
    steps: parseBoundedArray(source["steps"], 3, 6, parseProcessStep),
  });
}

function parseProcessStep(value: unknown): MovingProcessStep {
  const source = plainRecord(value);
  return Object.freeze({
    title: requiredString(source["title"], MOVING_HOME_LIMITS.itemTitle),
    description: requiredString(source["description"], MOVING_HOME_LIMITS.itemDescription),
  });
}

function parseAssurance(value: unknown): MovingAssuranceSection {
  const source = plainRecord(value);
  const eyebrow = optionalString(source["eyebrow"], MOVING_HOME_LIMITS.eyebrow);
  const media = optionalMedia(source["media"]);
  const pointItems = parseBoundedArray(source["points"], 2, 6, parseAssurancePoint);
  const points = Object.freeze(pointItems.map((item) => item.text));
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], MOVING_HOME_LIMITS.title),
    body: requiredString(source["body"], MOVING_HOME_LIMITS.assuranceBody),
    ...(media === undefined ? {} : { media }),
    points,
  });
}

function parseAssurancePoint(value: unknown): Readonly<{ readonly text: string }> {
  const source = plainRecord(value);
  return Object.freeze({
    text: requiredString(source["text"], MOVING_HOME_LIMITS.assurancePoint),
  });
}

function parseServiceAreas(value: unknown): MovingServiceAreasSection {
  const source = plainRecord(value);
  const eyebrow = optionalString(source["eyebrow"], MOVING_HOME_LIMITS.eyebrow);
  const intro = optionalString(source["intro"], MOVING_HOME_LIMITS.intro);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], MOVING_HOME_LIMITS.title),
    ...(intro === undefined ? {} : { intro }),
    areas: parseBoundedArray(source["areas"], 3, 12, parseArea),
  });
}

function parseArea(value: unknown): MovingAreaLink {
  const source = plainRecord(value);
  return Object.freeze({
    label: requiredString(source["label"], MOVING_HOME_LIMITS.areaLabel),
    href: requiredHref(source["href"]),
  });
}

function parseFinalAction(value: unknown): MovingActionSection {
  const source = plainRecord(value);
  const eyebrow = optionalString(source["eyebrow"], MOVING_HOME_LIMITS.eyebrow);
  const body = optionalString(source["body"], MOVING_HOME_LIMITS.finalBody);
  const secondaryAction = optionalAction(source["secondaryAction"]);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], MOVING_HOME_LIMITS.title),
    ...(body === undefined ? {} : { body }),
    primaryAction: parseAction(source["primaryAction"]),
    ...(secondaryAction === undefined ? {} : { secondaryAction }),
  });
}

function parseAction(value: unknown): ActionLink {
  const source = plainRecord(value);
  return Object.freeze({
    label: requiredString(source["label"], MOVING_HOME_LIMITS.actionLabel),
    href: requiredHref(source["href"]),
  });
}

function optionalAction(value: unknown): ActionLink | undefined {
  return value === undefined ? undefined : parseAction(value);
}

function parseMedia(value: unknown): ContentMediaReference {
  return projectContentMediaReference(plainRecord(value), requiredString);
}

function optionalMedia(value: unknown): ContentMediaReference | undefined {
  return value === undefined ? undefined : parseMedia(value);
}

function requiredHref(value: unknown): string {
  const href = requiredString(value, MOVING_HOME_LIMITS.href);
  if (!isSafeActionHref(href)) throw contractError();
  return href;
}

function requiredString(value: unknown, maximum?: number): string {
  if (typeof value !== "string" || value.trim().length === 0 ||
    (maximum !== undefined && value.length > maximum)) throw contractError();
  return value;
}

function optionalString(value: unknown, maximum: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maximum) throw contractError();
  return value;
}

function parseBoundedArray<T>(
  value: unknown,
  minimum: number,
  maximum: number,
  parseItem: (item: unknown) => T,
): readonly T[] {
  const source = denseArray(value, minimum, maximum);
  const result: T[] = [];
  for (let index = 0; index < source.length; index += 1) {
    result.push(parseItem(source[index]));
  }
  return Object.freeze(result);
}

function denseArray(value: unknown, minimum: number, maximum: number): readonly unknown[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum ||
    Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length > 0) {
    throw contractError();
  }
  for (const property of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, property);
    if (descriptor?.get !== undefined || descriptor?.set !== undefined) throw contractError();
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) throw contractError();
  }
  return value;
}

function plainRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw contractError();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw contractError();
  if (Object.getOwnPropertySymbols(value).length > 0) throw contractError();
  for (const property of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, property);
    if (descriptor?.get !== undefined || descriptor?.set !== undefined) throw contractError();
  }
  return value as Readonly<Record<string, unknown>>;
}

function contractError(): MovingHomeContractError {
  return new MovingHomeContractError();
}
