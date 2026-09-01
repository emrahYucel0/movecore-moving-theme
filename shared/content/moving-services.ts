import type { ContentImage, ContentMediaReference } from "./media";
import type { MovingActionSection } from "./moving-common";
import {
  MOVING_COMMERCIAL_LIMITS,
  movingAssertUnique,
  movingBoundedArray,
  movingOptionalMedia,
  movingOptionalString,
  movingPlainRecord,
  movingRequiredHref,
  movingRequiredString,
  parseMovingCollectionHero,
  parseMovingFinalAction,
  type MovingCollectionHero,
  type MovingCollectionHeroViewModel,
} from "./moving-commercial-common";

export const MOVING_SERVICES_LIMITS = Object.freeze({
  ...MOVING_COMMERCIAL_LIMITS,
  servicesMinimum: 2,
  servicesMaximum: 10,
  pointsMinimum: 2,
  pointsMaximum: 6,
});

export interface MovingServicesEntry {
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly media?: ContentMediaReference;
}

export interface MovingServicesEntryViewModel extends Omit<MovingServicesEntry, "media"> {
  readonly media?: ContentImage;
}

export interface MovingServicesPortfolio {
  readonly title: string;
  readonly intro?: string;
  readonly items: readonly MovingServicesEntry[];
}

export interface MovingServicesPortfolioViewModel extends Omit<MovingServicesPortfolio, "items"> {
  readonly items: readonly MovingServicesEntryViewModel[];
}

export interface MovingServicesContext {
  readonly title: string;
  readonly body: string;
  readonly points: readonly string[];
}

export interface MovingServicesPage {
  readonly hero: MovingCollectionHero;
  readonly portfolio: MovingServicesPortfolio;
  readonly context: MovingServicesContext;
  readonly finalAction: MovingActionSection;
}

export interface MovingServicesViewModel extends Omit<MovingServicesPage, "hero" | "portfolio"> {
  readonly hero: MovingCollectionHeroViewModel;
  readonly portfolio: MovingServicesPortfolioViewModel;
}

export class MovingServicesContractError extends Error {
  public constructor() {
    super("The moving.services payload does not match the application contract.");
    this.name = "MovingServicesContractError";
  }
}

export function parseMovingServicesPayload(input: unknown): MovingServicesPage {
  const source = movingPlainRecord(input, contractError);
  return Object.freeze({
    hero: parseMovingCollectionHero(source["hero"], contractError),
    portfolio: parsePortfolio(source["portfolio"]),
    context: parseContext(source["context"]),
    finalAction: parseMovingFinalAction(source["finalAction"], contractError),
  });
}

function parsePortfolio(value: unknown): MovingServicesPortfolio {
  const source = movingPlainRecord(value, contractError);
  const intro = movingOptionalString(source["intro"], MOVING_SERVICES_LIMITS.intro, contractError);
  const items = movingBoundedArray(
    source["items"],
    MOVING_SERVICES_LIMITS.servicesMinimum,
    MOVING_SERVICES_LIMITS.servicesMaximum,
    parseEntry,
    contractError,
  );
  movingAssertUnique(items, (item) => item.href, contractError);
  return Object.freeze({
    title: movingRequiredString(source["title"], MOVING_SERVICES_LIMITS.title, contractError),
    ...(intro === undefined ? {} : { intro }),
    items,
  });
}

function parseEntry(value: unknown): MovingServicesEntry {
  const source = movingPlainRecord(value, contractError);
  const media = movingOptionalMedia(source["media"], contractError);
  return Object.freeze({
    title: movingRequiredString(source["title"], MOVING_SERVICES_LIMITS.itemTitle, contractError),
    description: movingRequiredString(
      source["description"], MOVING_SERVICES_LIMITS.itemDescription, contractError,
    ),
    href: movingRequiredHref(source["href"], contractError),
    ...(media === undefined ? {} : { media }),
  });
}

function parseContext(value: unknown): MovingServicesContext {
  const source = movingPlainRecord(value, contractError);
  const points = movingBoundedArray(
    source["points"],
    MOVING_SERVICES_LIMITS.pointsMinimum,
    MOVING_SERVICES_LIMITS.pointsMaximum,
    (item) => {
      const point = movingPlainRecord(item, contractError);
      return Object.freeze({
        text: movingRequiredString(point["text"], MOVING_SERVICES_LIMITS.point, contractError),
      });
    },
    contractError,
  );
  return Object.freeze({
    title: movingRequiredString(source["title"], MOVING_SERVICES_LIMITS.title, contractError),
    body: movingRequiredString(source["body"], MOVING_SERVICES_LIMITS.body, contractError),
    points: Object.freeze(points.map((point) => point.text)),
  });
}

function contractError(): MovingServicesContractError {
  return new MovingServicesContractError();
}
