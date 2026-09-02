import {
  movingBoundedArray,
  movingOptionalString,
  movingPlainRecord,
  movingRequiredString,
} from "./moving-commercial-common";

export const MOVING_CONVERSION_CONTENT_LIMITS = Object.freeze({
  eyebrow: 80,
  title: 180,
  intro: 800,
  sectionTitle: 160,
  body: 1_200,
  point: 240,
});

export interface MovingQuotePage {
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro: string;
  readonly reassurance: {
    readonly title: string;
    readonly points: readonly string[];
  };
  readonly planning?: {
    readonly title: string;
    readonly body: string;
  };
}

export interface MovingContactPage {
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro: string;
  readonly directContact: {
    readonly title: string;
    readonly intro: string;
  };
  readonly formIntroduction: {
    readonly title: string;
    readonly intro: string;
  };
}

export class MovingQuoteContractError extends Error {
  public constructor() {
    super("The moving.quote payload does not match the application contract.");
    this.name = "MovingQuoteContractError";
  }
}

export class MovingContactContractError extends Error {
  public constructor() {
    super("The moving.contact payload does not match the application contract.");
    this.name = "MovingContactContractError";
  }
}

export function parseMovingQuotePayload(input: unknown): MovingQuotePage {
  const source = exactRecord(input, ["eyebrow", "title", "intro", "reassurance", "planning"], quoteError);
  const eyebrow = movingOptionalString(source["eyebrow"], MOVING_CONVERSION_CONTENT_LIMITS.eyebrow, quoteError);
  const planning = source["planning"] === undefined ? undefined : parsePlanning(source["planning"]);
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: movingRequiredString(source["title"], MOVING_CONVERSION_CONTENT_LIMITS.title, quoteError),
    intro: movingRequiredString(source["intro"], MOVING_CONVERSION_CONTENT_LIMITS.intro, quoteError),
    reassurance: parseReassurance(source["reassurance"]),
    ...(planning === undefined ? {} : { planning }),
  });
}

export function parseMovingContactPayload(input: unknown): MovingContactPage {
  const source = exactRecord(
    input, ["eyebrow", "title", "intro", "directContact", "formIntroduction"], contactError,
  );
  const eyebrow = movingOptionalString(
    source["eyebrow"], MOVING_CONVERSION_CONTENT_LIMITS.eyebrow, contactError,
  );
  return Object.freeze({
    ...(eyebrow === undefined ? {} : { eyebrow }),
    title: movingRequiredString(source["title"], MOVING_CONVERSION_CONTENT_LIMITS.title, contactError),
    intro: movingRequiredString(source["intro"], MOVING_CONVERSION_CONTENT_LIMITS.intro, contactError),
    directContact: parseCopySection(source["directContact"], "intro", contactError),
    formIntroduction: parseCopySection(source["formIntroduction"], "intro", contactError),
  });
}

function parseReassurance(value: unknown): MovingQuotePage["reassurance"] {
  const source = exactRecord(value, ["title", "points"], quoteError);
  return Object.freeze({
    title: movingRequiredString(
      source["title"], MOVING_CONVERSION_CONTENT_LIMITS.sectionTitle, quoteError,
    ),
    points: movingBoundedArray(source["points"], 2, 5, (item) => {
      const point = exactRecord(item, ["text"], quoteError);
      return movingRequiredString(point["text"], MOVING_CONVERSION_CONTENT_LIMITS.point, quoteError);
    }, quoteError),
  });
}

function parsePlanning(value: unknown): NonNullable<MovingQuotePage["planning"]> {
  const section = parseCopySection(value, "body", quoteError);
  return Object.freeze({ title: section.title, body: section.intro });
}

function parseCopySection(
  value: unknown,
  copyKey: "intro" | "body",
  fail: () => Error,
): Readonly<{ readonly title: string; readonly intro: string }> {
  const source = exactRecord(value, ["title", copyKey], fail);
  return Object.freeze({
    title: movingRequiredString(source["title"], MOVING_CONVERSION_CONTENT_LIMITS.sectionTitle, fail),
    intro: movingRequiredString(source[copyKey], MOVING_CONVERSION_CONTENT_LIMITS.body, fail),
  });
}

function exactRecord(
  value: unknown,
  keys: readonly string[],
  fail: () => Error,
): Readonly<Record<string, unknown>> {
  const source = movingPlainRecord(value, fail);
  const allowed = new Set(keys);
  if (Object.keys(source).some((key) => !allowed.has(key))) throw fail();
  return source;
}

function quoteError(): MovingQuoteContractError {
  return new MovingQuoteContractError();
}

function contactError(): MovingContactContractError {
  return new MovingContactContractError();
}
