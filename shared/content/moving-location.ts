import {
  projectContentMediaReference,
  type ContentImage,
  type ContentMediaReference,
} from "./media";
import {
  isSafeActionHref,
  MOVING_COMMON_LIMITS,
  type ActionLink,
  type MovingActionSection,
} from "./moving-common";

export const MOVING_LOCATION_LIMITS = Object.freeze({
  eyebrow: 80,
  title: 160,
  heroTitle: 180,
  heroIntro: 800,
  sectionIntro: 700,
  overviewBody: 1_600,
  highlight: 240,
  itemTitle: 120,
  itemDescription: 500,
  finalBody: 600,
  actionLabel: MOVING_COMMON_LIMITS.actionLabel,
  href: MOVING_COMMON_LIMITS.href,
});

export interface MovingLocationHero {
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro: string;
  readonly media?: ContentMediaReference;
}

export interface MovingLocationOverview {
  readonly title: string;
  readonly body: string;
  readonly highlights: readonly string[];
}

export interface MovingLocationServiceLink {
  readonly title: string;
  readonly description?: string;
  readonly href: string;
}

export interface MovingLocationServicesSection {
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro?: string;
  readonly items: readonly MovingLocationServiceLink[];
}

export interface MovingLocationDetailItem {
  readonly title: string;
  readonly description: string;
}

export interface MovingLocationDetailsSection {
  readonly eyebrow?: string;
  readonly title: string;
  readonly body: string;
  readonly items: readonly MovingLocationDetailItem[];
}

export interface MovingNearbyAreasSection {
  readonly eyebrow?: string;
  readonly title: string;
  readonly items: readonly ActionLink[];
}

export interface MovingLocation {
  readonly hero: MovingLocationHero;
  readonly overview: MovingLocationOverview;
  readonly services: MovingLocationServicesSection;
  readonly localDetails: MovingLocationDetailsSection;
  readonly nearbyAreas: MovingNearbyAreasSection;
  readonly finalAction: MovingActionSection;
}

export interface MovingLocationHeroViewModel extends Omit<MovingLocationHero, "media"> {
  readonly media?: ContentImage;
}

export interface MovingLocationViewModel extends Omit<MovingLocation, "hero"> {
  readonly hero: MovingLocationHeroViewModel;
}

export class MovingLocationContractError extends Error {
  public constructor() {
    super("The moving.location payload does not match the application contract.");
    this.name = "MovingLocationContractError";
  }
}

export function parseMovingLocationPayload(input: unknown): MovingLocation {
  const source = plainRecord(input);
  return Object.freeze({
    hero: parseHero(source["hero"]),
    overview: parseOverview(source["overview"]),
    services: parseServices(source["services"]),
    localDetails: parseLocalDetails(source["localDetails"]),
    nearbyAreas: parseNearbyAreas(source["nearbyAreas"]),
    finalAction: parseFinalAction(source["finalAction"]),
  });
}

function parseHero(value: unknown): MovingLocationHero {
  const source = plainRecord(value);
  const eyebrow = optionalString(source["eyebrow"], MOVING_LOCATION_LIMITS.eyebrow);
  const media = optionalMedia(source["media"]);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], MOVING_LOCATION_LIMITS.heroTitle),
    intro: requiredString(source["intro"], MOVING_LOCATION_LIMITS.heroIntro),
    ...(media === undefined ? {} : { media }),
  });
}

function parseOverview(value: unknown): MovingLocationOverview {
  const source = plainRecord(value);
  const highlights = parseBoundedArray(source["highlights"], 2, 6, parseHighlight);
  return Object.freeze({
    title: requiredString(source["title"], MOVING_LOCATION_LIMITS.title),
    body: requiredString(source["body"], MOVING_LOCATION_LIMITS.overviewBody),
    highlights: Object.freeze(highlights.map((item) => item.text)),
  });
}

function parseHighlight(value: unknown): Readonly<{ readonly text: string }> {
  const source = plainRecord(value);
  return Object.freeze({ text: requiredString(source["text"], MOVING_LOCATION_LIMITS.highlight) });
}

function parseServices(value: unknown): MovingLocationServicesSection {
  const source = plainRecord(value);
  return Object.freeze({
    ...sectionCopy(source),
    items: parseBoundedArray(source["items"], 2, 8, parseServiceLink),
  });
}

function parseServiceLink(value: unknown): MovingLocationServiceLink {
  const source = plainRecord(value);
  const description = optionalString(source["description"], MOVING_LOCATION_LIMITS.itemDescription);
  return Object.freeze({
    title: requiredString(source["title"], MOVING_LOCATION_LIMITS.itemTitle),
    ...(description === undefined ? {} : { description }),
    href: requiredHref(source["href"]),
  });
}

function parseLocalDetails(value: unknown): MovingLocationDetailsSection {
  const source = plainRecord(value);
  const eyebrow = optionalString(source["eyebrow"], MOVING_LOCATION_LIMITS.eyebrow);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], MOVING_LOCATION_LIMITS.title),
    body: requiredString(source["body"], MOVING_LOCATION_LIMITS.overviewBody),
    items: parseBoundedArray(source["items"], 2, 6, parseDetailItem),
  });
}

function parseDetailItem(value: unknown): MovingLocationDetailItem {
  const source = plainRecord(value);
  return Object.freeze({
    title: requiredString(source["title"], MOVING_LOCATION_LIMITS.itemTitle),
    description: requiredString(source["description"], MOVING_LOCATION_LIMITS.itemDescription),
  });
}

function parseNearbyAreas(value: unknown): MovingNearbyAreasSection {
  const source = plainRecord(value);
  const eyebrow = optionalString(source["eyebrow"], MOVING_LOCATION_LIMITS.eyebrow);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], MOVING_LOCATION_LIMITS.title),
    items: parseBoundedArray(source["items"], 2, 8, parseAction),
  });
}

function parseFinalAction(value: unknown): MovingActionSection {
  const source = plainRecord(value);
  const eyebrow = optionalString(source["eyebrow"], MOVING_LOCATION_LIMITS.eyebrow);
  const body = optionalString(source["body"], MOVING_LOCATION_LIMITS.finalBody);
  const secondaryAction = optionalAction(source["secondaryAction"]);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], MOVING_LOCATION_LIMITS.title),
    ...(body === undefined ? {} : { body }),
    primaryAction: parseAction(source["primaryAction"]),
    ...(secondaryAction === undefined ? {} : { secondaryAction }),
  });
}

function sectionCopy(source: Readonly<Record<string, unknown>>): Readonly<{
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro?: string;
}> {
  const eyebrow = optionalString(source["eyebrow"], MOVING_LOCATION_LIMITS.eyebrow);
  const intro = optionalString(source["intro"], MOVING_LOCATION_LIMITS.sectionIntro);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], MOVING_LOCATION_LIMITS.title),
    ...(intro === undefined ? {} : { intro }),
  });
}

function parseAction(value: unknown): ActionLink {
  const source = plainRecord(value);
  return Object.freeze({
    label: requiredString(source["label"], MOVING_LOCATION_LIMITS.actionLabel),
    href: requiredHref(source["href"]),
  });
}

function optionalAction(value: unknown): ActionLink | undefined {
  return value === undefined ? undefined : parseAction(value);
}

function optionalMedia(value: unknown): ContentMediaReference | undefined {
  return value === undefined
    ? undefined
    : projectContentMediaReference(plainRecord(value), requiredString);
}

function requiredHref(value: unknown): string {
  const href = requiredString(value, MOVING_LOCATION_LIMITS.href);
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
  for (let index = 0; index < source.length; index += 1) result.push(parseItem(source[index]));
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

function contractError(): MovingLocationContractError {
  return new MovingLocationContractError();
}
