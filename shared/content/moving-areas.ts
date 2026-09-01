import type { MovingActionSection } from "./moving-common";
import {
  MOVING_COMMERCIAL_LIMITS,
  movingAssertUnique,
  movingBoundedArray,
  movingPlainRecord,
  movingRequiredHref,
  movingRequiredString,
  parseMovingCollectionHero,
  parseMovingFinalAction,
  type MovingCollectionHero,
  type MovingCollectionHeroViewModel,
} from "./moving-commercial-common";

export const MOVING_AREAS_LIMITS = Object.freeze({
  ...MOVING_COMMERCIAL_LIMITS,
  areasMinimum: 2,
  areasMaximum: 12,
  pointsMinimum: 2,
  pointsMaximum: 6,
});

export interface MovingAreaEntry {
  readonly title: string;
  readonly description: string;
  readonly href: string;
}

export interface MovingAreasCoverage {
  readonly title: string;
  readonly body: string;
  readonly items: readonly MovingAreaEntry[];
}

export interface MovingAreasPlanning {
  readonly title: string;
  readonly body: string;
  readonly points: readonly string[];
}

export interface MovingAreasPage {
  readonly hero: MovingCollectionHero;
  readonly coverage: MovingAreasCoverage;
  readonly planning: MovingAreasPlanning;
  readonly finalAction: MovingActionSection;
}

export interface MovingAreasViewModel extends Omit<MovingAreasPage, "hero"> {
  readonly hero: MovingCollectionHeroViewModel;
}

export class MovingAreasContractError extends Error {
  public constructor() {
    super("The moving.areas payload does not match the application contract.");
    this.name = "MovingAreasContractError";
  }
}

export function parseMovingAreasPayload(input: unknown): MovingAreasPage {
  const source = movingPlainRecord(input, contractError);
  return Object.freeze({
    hero: parseMovingCollectionHero(source["hero"], contractError),
    coverage: parseCoverage(source["coverage"]),
    planning: parsePlanning(source["planning"]),
    finalAction: parseMovingFinalAction(source["finalAction"], contractError),
  });
}

function parseCoverage(value: unknown): MovingAreasCoverage {
  const source = movingPlainRecord(value, contractError);
  const items = movingBoundedArray(
    source["items"],
    MOVING_AREAS_LIMITS.areasMinimum,
    MOVING_AREAS_LIMITS.areasMaximum,
    parseArea,
    contractError,
  );
  movingAssertUnique(items, (item) => item.href, contractError);
  return Object.freeze({
    title: movingRequiredString(source["title"], MOVING_AREAS_LIMITS.title, contractError),
    body: movingRequiredString(source["body"], MOVING_AREAS_LIMITS.body, contractError),
    items,
  });
}

function parseArea(value: unknown): MovingAreaEntry {
  const source = movingPlainRecord(value, contractError);
  return Object.freeze({
    title: movingRequiredString(source["title"], MOVING_AREAS_LIMITS.itemTitle, contractError),
    description: movingRequiredString(
      source["description"], MOVING_AREAS_LIMITS.itemDescription, contractError,
    ),
    href: movingRequiredHref(source["href"], contractError),
  });
}

function parsePlanning(value: unknown): MovingAreasPlanning {
  const source = movingPlainRecord(value, contractError);
  const points = movingBoundedArray(
    source["points"],
    MOVING_AREAS_LIMITS.pointsMinimum,
    MOVING_AREAS_LIMITS.pointsMaximum,
    (item) => {
      const point = movingPlainRecord(item, contractError);
      return Object.freeze({
        text: movingRequiredString(point["text"], MOVING_AREAS_LIMITS.point, contractError),
      });
    },
    contractError,
  );
  return Object.freeze({
    title: movingRequiredString(source["title"], MOVING_AREAS_LIMITS.title, contractError),
    body: movingRequiredString(source["body"], MOVING_AREAS_LIMITS.body, contractError),
    points: Object.freeze(points.map((point) => point.text)),
  });
}

function contractError(): MovingAreasContractError {
  return new MovingAreasContractError();
}
