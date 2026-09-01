import type { MovingActionSection } from "./moving-common";
import {
  MOVING_COMMERCIAL_LIMITS,
  movingAssertUnique,
  movingPlainRecord,
  movingTestimonialIdentity,
  parseMovingCollectionHero,
  parseMovingFinalAction,
  parseMovingTestimonial,
  parseMovingTestimonialItems,
  type MovingCollectionHero,
  type MovingCollectionHeroViewModel,
  type MovingTestimonial,
} from "./moving-commercial-common";

export const MOVING_TESTIMONIALS_LIMITS = Object.freeze({
  ...MOVING_COMMERCIAL_LIMITS,
  itemsMinimum: 2,
  itemsMaximum: 10,
});

export interface MovingTestimonialsPage {
  readonly hero: MovingCollectionHero;
  readonly featured: MovingTestimonial;
  readonly items: readonly MovingTestimonial[];
  readonly finalAction: MovingActionSection;
}

export interface MovingTestimonialsViewModel extends Omit<MovingTestimonialsPage, "hero"> {
  readonly hero: MovingCollectionHeroViewModel;
}

export class MovingTestimonialsContractError extends Error {
  public constructor() {
    super("The moving.testimonials payload does not match the application contract.");
    this.name = "MovingTestimonialsContractError";
  }
}

export function parseMovingTestimonialsPayload(input: unknown): MovingTestimonialsPage {
  const source = movingPlainRecord(input, contractError);
  const featured = parseMovingTestimonial(source["featured"], contractError);
  const items = parseMovingTestimonialItems(
    source["items"],
    MOVING_TESTIMONIALS_LIMITS.itemsMinimum,
    MOVING_TESTIMONIALS_LIMITS.itemsMaximum,
    contractError,
  );
  movingAssertUnique([featured, ...items], movingTestimonialIdentity, contractError);
  return Object.freeze({
    hero: parseMovingCollectionHero(source["hero"], contractError),
    featured,
    items,
    finalAction: parseMovingFinalAction(source["finalAction"], contractError),
  });
}

function contractError(): MovingTestimonialsContractError {
  return new MovingTestimonialsContractError();
}
