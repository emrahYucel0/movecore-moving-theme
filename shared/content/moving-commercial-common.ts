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

export const MOVING_COMMERCIAL_LIMITS = Object.freeze({
  eyebrow: 80,
  title: 180,
  intro: 800,
  body: 1_600,
  itemTitle: 120,
  itemDescription: 600,
  point: 240,
  question: 200,
  answer: 1_200,
  quote: 600,
  customerName: 100,
  testimonialContext: 160,
  serviceLabel: 100,
  actionLabel: MOVING_COMMON_LIMITS.actionLabel,
  href: MOVING_COMMON_LIMITS.href,
});

export interface MovingCollectionHero {
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro: string;
  readonly media?: ContentMediaReference;
}

export interface MovingCollectionHeroViewModel extends Omit<MovingCollectionHero, "media"> {
  readonly media?: ContentImage;
}

export interface MovingFaqItem {
  readonly question: string;
  readonly answer: string;
}

export interface MovingFaqSection {
  readonly title: string;
  readonly intro?: string;
  readonly items: readonly MovingFaqItem[];
  readonly action?: ActionLink;
}

export interface MovingTestimonial {
  readonly quote: string;
  readonly customerName: string;
  readonly context?: string;
  readonly serviceLabel?: string;
}

export interface MovingTestimonialSection {
  readonly title: string;
  readonly intro?: string;
  readonly featured: MovingTestimonial;
  readonly items: readonly MovingTestimonial[];
  readonly action?: ActionLink;
}

type ContractFailure = () => Error;

export function parseMovingCollectionHero(
  value: unknown,
  fail: ContractFailure,
): MovingCollectionHero {
  const source = movingPlainRecord(value, fail);
  const eyebrow = movingOptionalString(source["eyebrow"], MOVING_COMMERCIAL_LIMITS.eyebrow, fail);
  const media = movingOptionalMedia(source["media"], fail);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: movingRequiredString(source["title"], MOVING_COMMERCIAL_LIMITS.title, fail),
    intro: movingRequiredString(source["intro"], MOVING_COMMERCIAL_LIMITS.intro, fail),
    ...(media === undefined ? {} : { media }),
  });
}

export function parseMovingFinalAction(
  value: unknown,
  fail: ContractFailure,
): MovingActionSection {
  const source = movingPlainRecord(value, fail);
  const eyebrow = movingOptionalString(source["eyebrow"], MOVING_COMMERCIAL_LIMITS.eyebrow, fail);
  const body = movingOptionalString(source["body"], MOVING_COMMERCIAL_LIMITS.intro, fail);
  const secondaryAction = movingOptionalAction(source["secondaryAction"], fail);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: movingRequiredString(source["title"], MOVING_COMMERCIAL_LIMITS.title, fail),
    ...(body === undefined ? {} : { body }),
    primaryAction: parseMovingAction(source["primaryAction"], fail),
    ...(secondaryAction === undefined ? {} : { secondaryAction }),
  });
}

export function parseMovingFaqItems(
  value: unknown,
  minimum: number,
  maximum: number,
  fail: ContractFailure,
): readonly MovingFaqItem[] {
  const items = movingBoundedArray(value, minimum, maximum, (item) => {
    const source = movingPlainRecord(item, fail);
    return Object.freeze({
      question: movingRequiredString(source["question"], MOVING_COMMERCIAL_LIMITS.question, fail),
      answer: movingRequiredString(source["answer"], MOVING_COMMERCIAL_LIMITS.answer, fail),
    });
  }, fail);
  movingAssertUnique(items, (item) => item.question.trim().toLocaleLowerCase("en"), fail);
  return items;
}

export function parseMovingTestimonial(
  value: unknown,
  fail: ContractFailure,
): MovingTestimonial {
  const source = movingPlainRecord(value, fail);
  const context = movingOptionalString(
    source["context"], MOVING_COMMERCIAL_LIMITS.testimonialContext, fail,
  );
  const serviceLabel = movingOptionalString(
    source["serviceLabel"], MOVING_COMMERCIAL_LIMITS.serviceLabel, fail,
  );
  return Object.freeze({
    quote: movingRequiredString(source["quote"], MOVING_COMMERCIAL_LIMITS.quote, fail),
    customerName: movingRequiredString(
      source["customerName"], MOVING_COMMERCIAL_LIMITS.customerName, fail,
    ),
    ...(context === undefined ? {} : { context }),
    ...(serviceLabel === undefined ? {} : { serviceLabel }),
  });
}

export function parseMovingTestimonialItems(
  value: unknown,
  minimum: number,
  maximum: number,
  fail: ContractFailure,
): readonly MovingTestimonial[] {
  const items = movingBoundedArray(
    value, minimum, maximum, (item) => parseMovingTestimonial(item, fail), fail,
  );
  movingAssertUnique(items, movingTestimonialIdentity, fail);
  return items;
}

export function movingTestimonialIdentity(item: MovingTestimonial): string {
  return `${item.customerName.trim().toLocaleLowerCase("en")}\u0000${item.quote.trim().toLocaleLowerCase("en")}`;
}

export function parseMovingAction(value: unknown, fail: ContractFailure): ActionLink {
  const source = movingPlainRecord(value, fail);
  return Object.freeze({
    label: movingRequiredString(source["label"], MOVING_COMMERCIAL_LIMITS.actionLabel, fail),
    href: movingRequiredHref(source["href"], fail),
  });
}

export function movingOptionalAction(
  value: unknown,
  fail: ContractFailure,
): ActionLink | undefined {
  return value === undefined ? undefined : parseMovingAction(value, fail);
}

export function movingOptionalMedia(
  value: unknown,
  fail: ContractFailure,
): ContentMediaReference | undefined {
  return value === undefined
    ? undefined
    : projectContentMediaReference(
      movingPlainRecord(value, fail),
      (item, maximum) => movingRequiredString(item, maximum, fail),
    );
}

export function movingRequiredHref(value: unknown, fail: ContractFailure): string {
  const href = movingRequiredString(value, MOVING_COMMERCIAL_LIMITS.href, fail);
  if (!isSafeActionHref(href)) throw fail();
  return href;
}

export function movingRequiredString(
  value: unknown,
  maximum: number | undefined,
  fail: ContractFailure,
): string {
  if (typeof value !== "string" || value.trim().length === 0 ||
    (maximum !== undefined && value.length > maximum)) {
    throw fail();
  }
  return value;
}

export function movingOptionalString(
  value: unknown,
  maximum: number,
  fail: ContractFailure,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maximum) throw fail();
  return value;
}

export function movingBoundedArray<T>(
  value: unknown,
  minimum: number,
  maximum: number,
  parseItem: (item: unknown) => T,
  fail: ContractFailure,
): readonly T[] {
  const source = movingDenseArray(value, minimum, maximum, fail);
  const result: T[] = [];
  for (let index = 0; index < source.length; index += 1) result.push(parseItem(source[index]));
  return Object.freeze(result);
}

export function movingAssertUnique<T>(
  items: readonly T[],
  identity: (item: T) => string,
  fail: ContractFailure,
): void {
  const identities = new Set<string>();
  for (const item of items) {
    const key = identity(item);
    if (identities.has(key)) throw fail();
    identities.add(key);
  }
}

export function movingPlainRecord(
  value: unknown,
  fail: ContractFailure,
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw fail();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw fail();
  if (Object.getOwnPropertySymbols(value).length > 0) throw fail();
  for (const property of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, property);
    if (descriptor?.get !== undefined || descriptor?.set !== undefined) throw fail();
  }
  return value as Readonly<Record<string, unknown>>;
}

function movingDenseArray(
  value: unknown,
  minimum: number,
  maximum: number,
  fail: ContractFailure,
): readonly unknown[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum ||
    Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length > 0) {
    throw fail();
  }
  for (const property of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, property);
    if (descriptor?.get !== undefined || descriptor?.set !== undefined) throw fail();
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) throw fail();
  }
  return value;
}
