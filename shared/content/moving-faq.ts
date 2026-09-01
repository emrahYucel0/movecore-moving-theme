import type { MovingActionSection } from "./moving-common";
import {
  MOVING_COMMERCIAL_LIMITS,
  movingPlainRecord,
  parseMovingCollectionHero,
  parseMovingFaqItems,
  parseMovingFinalAction,
  type MovingCollectionHero,
  type MovingCollectionHeroViewModel,
  type MovingFaqItem,
} from "./moving-commercial-common";

export const MOVING_FAQ_LIMITS = Object.freeze({
  ...MOVING_COMMERCIAL_LIMITS,
  itemsMinimum: 3,
  itemsMaximum: 18,
});

export interface MovingFaqPage {
  readonly hero: MovingCollectionHero;
  readonly items: readonly MovingFaqItem[];
  readonly finalAction: MovingActionSection;
}

export interface MovingFaqViewModel extends Omit<MovingFaqPage, "hero"> {
  readonly hero: MovingCollectionHeroViewModel;
}

export class MovingFaqContractError extends Error {
  public constructor() {
    super("The moving.faq payload does not match the application contract.");
    this.name = "MovingFaqContractError";
  }
}

export function parseMovingFaqPayload(input: unknown): MovingFaqPage {
  const source = movingPlainRecord(input, contractError);
  return Object.freeze({
    hero: parseMovingCollectionHero(source["hero"], contractError),
    items: parseMovingFaqItems(
      source["items"], MOVING_FAQ_LIMITS.itemsMinimum, MOVING_FAQ_LIMITS.itemsMaximum, contractError,
    ),
    finalAction: parseMovingFinalAction(source["finalAction"], contractError),
  });
}

function contractError(): MovingFaqContractError {
  return new MovingFaqContractError();
}
