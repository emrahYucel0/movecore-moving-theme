import type { PublicApplicationPage } from "./page-route";

export const MOVING_FALLBACK_TITLE_MAX_LENGTH = 160;
export const MOVING_FALLBACK_DESCRIPTION_MAX_LENGTH = 300;

export interface MovingPageSeoPresentation {
  readonly title: string;
  readonly description?: string;
}

export function composeMovingPageSeo(page: PublicApplicationPage): MovingPageSeoPresentation {
  const fallback = movingPageSeoFallback(page);
  return Object.freeze({
    title: page.seo.title ?? fallback.title,
    ...(page.seo.description !== undefined
      ? { description: page.seo.description }
      : fallback.description === undefined
        ? {}
        : { description: fallback.description }),
  });
}

export function movingPageSeoFallback(page: PublicApplicationPage): MovingPageSeoPresentation {
  switch (page.type) {
    case "site.page":
      return fallback(page.content.title, page.content.intro);
    case "moving.home":
    case "moving.service":
    case "moving.location":
    case "moving.services":
    case "moving.areas":
    case "moving.faq":
    case "moving.testimonials":
      return fallback(page.content.hero.title, page.content.hero.intro);
    case "moving.quote":
    case "moving.contact":
      return fallback(page.content.title, page.content.intro);
    case "moving.article":
      return fallback(page.content.title, page.content.excerpt);
  }
}

function fallback(title: string, description?: string): MovingPageSeoPresentation {
  const normalizedDescription = description === undefined
    ? undefined
    : boundedPlainText(description, MOVING_FALLBACK_DESCRIPTION_MAX_LENGTH);
  return Object.freeze({
    title: boundedPlainText(title, MOVING_FALLBACK_TITLE_MAX_LENGTH),
    ...(normalizedDescription === undefined || normalizedDescription.length === 0
      ? {}
      : { description: normalizedDescription }),
  });
}

function boundedPlainText(value: string, maximum: number): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  const characters = [...normalized];
  if (characters.length <= maximum) return normalized;
  const bounded = characters.slice(0, maximum).join("");
  const wordBoundary = bounded.lastIndexOf(" ");
  return (wordBoundary >= Math.floor(maximum * 0.7)
    ? bounded.slice(0, wordBoundary)
    : bounded).trimEnd();
}
