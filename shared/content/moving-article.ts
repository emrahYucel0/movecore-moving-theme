import {
  projectContentMediaReference,
  type ContentImage,
  type ContentMediaReference,
} from "./media";

export const MOVING_ARTICLE_LIMITS = Object.freeze({
  title: 180,
  excerpt: 600,
  heading: 160,
  paragraph: 2_000,
  bodySections: 24,
  paragraphsPerSection: 12,
});

export interface MovingArticleParagraph {
  readonly text: string;
}

export interface MovingArticleBodySection {
  readonly heading?: string;
  readonly paragraphs: readonly MovingArticleParagraph[];
}

export interface MovingArticle {
  readonly title: string;
  readonly excerpt: string;
  /**
   * Optional. Articles published before this field existed carry no cover and
   * stay valid; the page simply opens on type instead of on an image.
   */
  readonly coverMedia?: ContentMediaReference;
  readonly body: readonly MovingArticleBodySection[];
}

export interface MovingArticleViewModel extends Omit<MovingArticle, "coverMedia"> {
  readonly publishedAt: string;
  readonly coverMedia?: ContentImage;
}

export interface MovingArticleArchiveItem {
  readonly contentId: string;
  readonly title: string;
  readonly excerpt: string;
  readonly publishedAt: string;
  readonly canonicalPath: string;
}

export function formatMovingArticleDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw contractError();
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export class MovingArticleContractError extends Error {
  public constructor() {
    super("The moving.article payload does not match the application contract.");
    this.name = "MovingArticleContractError";
  }
}

export function parseMovingArticlePayload(input: unknown): MovingArticle {
  const source = plainRecord(input);
  const body = requiredArray(source["body"], MOVING_ARTICLE_LIMITS.bodySections)
    .map(parseBodySection);
  if (body.length === 0) throw contractError();
  const coverMedia = optionalMedia(source["coverMedia"]);
  return Object.freeze({
    title: requiredString(source["title"], MOVING_ARTICLE_LIMITS.title),
    excerpt: requiredString(source["excerpt"], MOVING_ARTICLE_LIMITS.excerpt),
    ...(coverMedia === undefined ? {} : { coverMedia }),
    body: Object.freeze(body),
  });
}

function optionalMedia(value: unknown): ContentMediaReference | undefined {
  return value === undefined
    ? undefined
    : projectContentMediaReference(plainRecord(value), requiredString);
}

function parseBodySection(value: unknown): MovingArticleBodySection {
  const source = plainRecord(value);
  const heading = optionalString(source["heading"], MOVING_ARTICLE_LIMITS.heading);
  const paragraphs = requiredArray(
    source["paragraphs"],
    MOVING_ARTICLE_LIMITS.paragraphsPerSection,
  ).map((entry) => {
    const paragraph = plainRecord(entry);
    return Object.freeze({
      text: requiredString(paragraph["text"], MOVING_ARTICLE_LIMITS.paragraph),
    });
  });
  if (paragraphs.length === 0) throw contractError();
  return Object.freeze({
    ...(heading === undefined ? {} : { heading }),
    paragraphs: Object.freeze(paragraphs),
  });
}

function requiredArray(value: unknown, maximum: number): readonly unknown[] {
  if (!Array.isArray(value) || value.length > maximum) throw contractError();
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) throw contractError();
  }
  return value;
}

/** `maximum` is optional so the shared media projection can reuse this, exactly
 *  as the other Moving content modules do. */
function requiredString(value: unknown, maximum?: number): string {
  if (
    typeof value !== "string" || value.trim().length === 0 ||
    (maximum !== undefined && value.length > maximum)
  ) {
    throw contractError();
  }
  return value;
}

function optionalString(value: unknown, maximum: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maximum) throw contractError();
  return value.trim().length === 0 ? undefined : value;
}

function plainRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw contractError();
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw contractError();
  if (Object.getOwnPropertySymbols(value).length > 0) throw contractError();
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor?.get !== undefined || descriptor?.set !== undefined) throw contractError();
  }
  return value as Readonly<Record<string, unknown>>;
}

function contractError(): MovingArticleContractError {
  return new MovingArticleContractError();
}
