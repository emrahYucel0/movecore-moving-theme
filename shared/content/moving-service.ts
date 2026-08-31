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
  type MovingProcessStep,
} from "./moving-common";

export const MOVING_SERVICE_LIMITS = Object.freeze({
  eyebrow: 80,
  title: 160,
  heroIntro: 700,
  sectionIntro: 700,
  overviewBody: 1_600,
  point: 240,
  itemTitle: 120,
  itemDescription: 400,
  processTitle: 100,
  processDescription: 320,
  finalBody: 600,
  actionLabel: MOVING_COMMON_LIMITS.actionLabel,
  href: MOVING_COMMON_LIMITS.href,
});

export interface MovingServiceHero {
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro: string;
  readonly media?: ContentMediaReference;
  readonly primaryAction: ActionLink;
}

export interface MovingServiceOverview {
  readonly title: string;
  readonly body: string;
  readonly points: readonly string[];
}

export interface MovingServiceIncludedItem {
  readonly title: string;
  readonly description?: string;
}

export interface MovingServiceIncludedSection {
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro?: string;
  readonly items: readonly MovingServiceIncludedItem[];
}

export interface MovingServiceProcessSection {
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro?: string;
  readonly steps: readonly MovingProcessStep[];
}

export interface MovingRelatedLink {
  readonly title: string;
  readonly description?: string;
  readonly href: string;
}

export interface MovingRelatedServicesSection {
  readonly eyebrow?: string;
  readonly title: string;
  readonly items: readonly MovingRelatedLink[];
}

export interface MovingService {
  readonly hero: MovingServiceHero;
  readonly overview: MovingServiceOverview;
  readonly included: MovingServiceIncludedSection;
  readonly process: MovingServiceProcessSection;
  readonly relatedServices: MovingRelatedServicesSection;
  readonly finalAction: MovingActionSection;
}

export interface MovingServiceHeroViewModel extends Omit<MovingServiceHero, "media"> {
  readonly media?: ContentImage;
}

export interface MovingServiceViewModel extends Omit<MovingService, "hero"> {
  readonly hero: MovingServiceHeroViewModel;
}

export class MovingServiceContractError extends Error {
  public constructor() {
    super("The moving.service payload does not match the application contract.");
    this.name = "MovingServiceContractError";
  }
}

export function parseMovingServicePayload(input: unknown): MovingService {
  const source = plainRecord(input);
  return Object.freeze({
    hero: parseHero(source["hero"]),
    overview: parseOverview(source["overview"]),
    included: parseIncluded(source["included"]),
    process: parseProcess(source["process"]),
    relatedServices: parseRelatedServices(source["relatedServices"]),
    finalAction: parseFinalAction(source["finalAction"]),
  });
}

function parseHero(value: unknown): MovingServiceHero {
  const source = plainRecord(value);
  const eyebrow = optionalString(source["eyebrow"], MOVING_SERVICE_LIMITS.eyebrow);
  const media = optionalMedia(source["media"]);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], MOVING_SERVICE_LIMITS.title),
    intro: requiredString(source["intro"], MOVING_SERVICE_LIMITS.heroIntro),
    ...(media === undefined ? {} : { media }),
    primaryAction: parseAction(source["primaryAction"]),
  });
}

function parseOverview(value: unknown): MovingServiceOverview {
  const source = plainRecord(value);
  const points = parseBoundedArray(source["points"], 2, 6, parsePoint);
  return Object.freeze({
    title: requiredString(source["title"], MOVING_SERVICE_LIMITS.title),
    body: requiredString(source["body"], MOVING_SERVICE_LIMITS.overviewBody),
    points: Object.freeze(points.map((point) => point.text)),
  });
}

function parsePoint(value: unknown): Readonly<{ readonly text: string }> {
  const source = plainRecord(value);
  return Object.freeze({ text: requiredString(source["text"], MOVING_SERVICE_LIMITS.point) });
}

function parseIncluded(value: unknown): MovingServiceIncludedSection {
  const source = plainRecord(value);
  return Object.freeze({
    ...sectionCopy(source),
    items: parseBoundedArray(source["items"], 3, 8, parseIncludedItem),
  });
}

function parseIncludedItem(value: unknown): MovingServiceIncludedItem {
  const source = plainRecord(value);
  const description = optionalString(source["description"], MOVING_SERVICE_LIMITS.itemDescription);
  return Object.freeze({
    title: requiredString(source["title"], MOVING_SERVICE_LIMITS.itemTitle),
    ...(description === undefined ? {} : { description }),
  });
}

function parseProcess(value: unknown): MovingServiceProcessSection {
  const source = plainRecord(value);
  return Object.freeze({
    ...sectionCopy(source),
    steps: parseBoundedArray(source["steps"], 3, 6, parseProcessStep),
  });
}

function parseProcessStep(value: unknown): MovingProcessStep {
  const source = plainRecord(value);
  return Object.freeze({
    title: requiredString(source["title"], MOVING_SERVICE_LIMITS.processTitle),
    description: requiredString(source["description"], MOVING_SERVICE_LIMITS.processDescription),
  });
}

function parseRelatedServices(value: unknown): MovingRelatedServicesSection {
  const source = plainRecord(value);
  const eyebrow = optionalString(source["eyebrow"], MOVING_SERVICE_LIMITS.eyebrow);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], MOVING_SERVICE_LIMITS.title),
    items: parseBoundedArray(source["items"], 2, 6, parseRelatedLink),
  });
}

function parseRelatedLink(value: unknown): MovingRelatedLink {
  const source = plainRecord(value);
  const description = optionalString(source["description"], MOVING_SERVICE_LIMITS.itemDescription);
  return Object.freeze({
    title: requiredString(source["title"], MOVING_SERVICE_LIMITS.itemTitle),
    ...(description === undefined ? {} : { description }),
    href: requiredHref(source["href"]),
  });
}

function parseFinalAction(value: unknown): MovingActionSection {
  const source = plainRecord(value);
  const eyebrow = optionalString(source["eyebrow"], MOVING_SERVICE_LIMITS.eyebrow);
  const body = optionalString(source["body"], MOVING_SERVICE_LIMITS.finalBody);
  const secondaryAction = optionalAction(source["secondaryAction"]);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], MOVING_SERVICE_LIMITS.title),
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
  const eyebrow = optionalString(source["eyebrow"], MOVING_SERVICE_LIMITS.eyebrow);
  const intro = optionalString(source["intro"], MOVING_SERVICE_LIMITS.sectionIntro);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: requiredString(source["title"], MOVING_SERVICE_LIMITS.title),
    ...(intro === undefined ? {} : { intro }),
  });
}

function parseAction(value: unknown): ActionLink {
  const source = plainRecord(value);
  return Object.freeze({
    label: requiredString(source["label"], MOVING_SERVICE_LIMITS.actionLabel),
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
  const href = requiredString(value, MOVING_SERVICE_LIMITS.href);
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

function contractError(): MovingServiceContractError {
  return new MovingServiceContractError();
}
