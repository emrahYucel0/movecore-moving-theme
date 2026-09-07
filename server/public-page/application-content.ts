import type {
  PublicMediaObjectProjection,
  PublicMediaProjection,
  PublicPageProjection,
} from "../core/contracts";
import type { CorePublicClient } from "../core/client";
import {
  parseSitePagePayload,
  SitePageContractError,
  type SitePage,
  type SitePageSectionViewModel,
  type SitePageViewModel,
} from "../../shared/content/site-page";
import {
  MovingHomeContractError,
  parseMovingHomePayload,
  type MovingHome,
  type MovingHomeViewModel,
} from "../../shared/content/moving-home";
import {
  MovingServiceContractError,
  parseMovingServicePayload,
  type MovingService,
  type MovingServiceViewModel,
} from "../../shared/content/moving-service";
import {
  MovingLocationContractError,
  parseMovingLocationPayload,
  type MovingLocation,
  type MovingLocationViewModel,
} from "../../shared/content/moving-location";
import {
  MovingServicesContractError,
  parseMovingServicesPayload,
  type MovingServicesPage,
  type MovingServicesViewModel,
} from "../../shared/content/moving-services";
import {
  MovingAreasContractError,
  parseMovingAreasPayload,
  type MovingAreasPage,
  type MovingAreasViewModel,
} from "../../shared/content/moving-areas";
import {
  MovingFaqContractError,
  parseMovingFaqPayload,
  type MovingFaqPage,
  type MovingFaqViewModel,
} from "../../shared/content/moving-faq";
import {
  MovingTestimonialsContractError,
  parseMovingTestimonialsPayload,
  type MovingTestimonialsPage,
  type MovingTestimonialsViewModel,
} from "../../shared/content/moving-testimonials";
import type {
  MovingCollectionHero,
  MovingCollectionHeroViewModel,
} from "../../shared/content/moving-commercial-common";
import type { ContentImage, ContentMediaReference } from "../../shared/content/media";
import {
  MovingContactContractError,
  MovingQuoteContractError,
  parseMovingContactPayload,
  parseMovingQuotePayload,
  type MovingContactPage,
  type MovingQuotePage,
} from "../../shared/content/moving-conversion";
import {
  MovingArticleContractError,
  parseMovingArticlePayload,
  type MovingArticleViewModel,
} from "../../shared/content/moving-article";

export class PublicApplicationContentError extends Error {
  public constructor() {
    super("Published application content is invalid.");
    this.name = "PublicApplicationContentError";
  }
}

export type PublicPageMediaClient = Pick<CorePublicClient, "getMedia">;

export async function composeSitePage(
  page: PublicPageProjection,
  client: PublicPageMediaClient,
): Promise<SitePageViewModel> {
  if (page.content.type !== "site.page") throw applicationContentError();

  let content: SitePage;
  try {
    content = parseSitePagePayload(page.content.payload);
  } catch (error: unknown) {
    if (error instanceof SitePageContractError) throw applicationContentError();
    throw error;
  }

  const media = await resolveReferencedMedia(sitePageAssetIds(content), client);
  const heroMedia = content.heroMedia === undefined
    ? undefined
    : imageView(content.heroMedia, requiredMedia(media, content.heroMedia.assetId));
  const sections = Object.freeze(content.sections.map((section): SitePageSectionViewModel => {
    const sectionMedia = section.media === undefined
      ? undefined
      : imageView(section.media, requiredMedia(media, section.media.assetId));
    return Object.freeze({
      heading: section.heading,
      ...(section.body === undefined ? {} : { body: section.body }),
      ...(sectionMedia === undefined ? {} : { media: sectionMedia }),
    });
  }));

  return Object.freeze({
    ...(content.eyebrow === undefined ? {} : { eyebrow: content.eyebrow }),
    title: content.title,
    ...(content.intro === undefined ? {} : { intro: content.intro }),
    ...(heroMedia === undefined ? {} : { heroMedia }),
    sections,
  });
}

export async function composeMovingHome(
  page: PublicPageProjection,
  client: PublicPageMediaClient,
): Promise<MovingHomeViewModel> {
  if (page.content.type !== "moving.home") throw applicationContentError();

  let content: MovingHome;
  try {
    content = parseMovingHomePayload(page.content.payload);
  } catch (error: unknown) {
    if (error instanceof MovingHomeContractError) throw applicationContentError();
    throw error;
  }

  const media = await resolveReferencedMedia(movingHomeAssetIds(content), client);
  const heroMedia = imageView(content.hero.media, requiredMedia(media, content.hero.media.assetId));
  const assuranceMedia = content.assurance.media === undefined
    ? undefined
    : imageView(content.assurance.media, requiredMedia(media, content.assurance.media.assetId));

  return Object.freeze({
    hero: Object.freeze({
      ...(content.hero.eyebrow === undefined ? {} : { eyebrow: content.hero.eyebrow }),
      title: content.hero.title,
      intro: content.hero.intro,
      media: heroMedia,
      primaryAction: content.hero.primaryAction,
      ...(content.hero.secondaryAction === undefined
        ? {}
        : { secondaryAction: content.hero.secondaryAction }),
    }),
    proof: content.proof,
    services: content.services,
    process: content.process,
    assurance: Object.freeze({
      ...(content.assurance.eyebrow === undefined ? {} : { eyebrow: content.assurance.eyebrow }),
      title: content.assurance.title,
      body: content.assurance.body,
      ...(assuranceMedia === undefined ? {} : { media: assuranceMedia }),
      points: content.assurance.points,
    }),
    serviceAreas: content.serviceAreas,
    ...(content.customerProof === undefined ? {} : { customerProof: content.customerProof }),
    ...(content.frequentQuestions === undefined
      ? {}
      : { frequentQuestions: content.frequentQuestions }),
    finalAction: content.finalAction,
  });
}

export async function composeMovingService(
  page: PublicPageProjection,
  client: PublicPageMediaClient,
): Promise<MovingServiceViewModel> {
  if (page.content.type !== "moving.service") throw applicationContentError();

  let content: MovingService;
  try {
    content = parseMovingServicePayload(page.content.payload);
  } catch (error: unknown) {
    if (error instanceof MovingServiceContractError) throw applicationContentError();
    throw error;
  }

  const media = await resolveReferencedMedia(movingServiceAssetIds(content), client);
  const heroMedia = content.hero.media === undefined
    ? undefined
    : imageView(content.hero.media, requiredMedia(media, content.hero.media.assetId));
  return Object.freeze({
    hero: Object.freeze({
      ...(content.hero.eyebrow === undefined ? {} : { eyebrow: content.hero.eyebrow }),
      title: content.hero.title,
      intro: content.hero.intro,
      ...(heroMedia === undefined ? {} : { media: heroMedia }),
      primaryAction: content.hero.primaryAction,
    }),
    overview: content.overview,
    included: content.included,
    process: content.process,
    relatedServices: content.relatedServices,
    finalAction: content.finalAction,
  });
}

export async function composeMovingLocation(
  page: PublicPageProjection,
  client: PublicPageMediaClient,
): Promise<MovingLocationViewModel> {
  if (page.content.type !== "moving.location") throw applicationContentError();

  let content: MovingLocation;
  try {
    content = parseMovingLocationPayload(page.content.payload);
  } catch (error: unknown) {
    if (error instanceof MovingLocationContractError) throw applicationContentError();
    throw error;
  }

  const media = await resolveReferencedMedia(movingLocationAssetIds(content), client);
  const heroMedia = content.hero.media === undefined
    ? undefined
    : imageView(content.hero.media, requiredMedia(media, content.hero.media.assetId));
  return Object.freeze({
    hero: Object.freeze({
      ...(content.hero.eyebrow === undefined ? {} : { eyebrow: content.hero.eyebrow }),
      title: content.hero.title,
      intro: content.hero.intro,
      ...(heroMedia === undefined ? {} : { media: heroMedia }),
    }),
    overview: content.overview,
    services: content.services,
    localDetails: content.localDetails,
    nearbyAreas: content.nearbyAreas,
    finalAction: content.finalAction,
  });
}

export async function composeMovingServices(
  page: PublicPageProjection,
  client: PublicPageMediaClient,
): Promise<MovingServicesViewModel> {
  if (page.content.type !== "moving.services") throw applicationContentError();
  let content: MovingServicesPage;
  try {
    content = parseMovingServicesPayload(page.content.payload);
  } catch (error: unknown) {
    if (error instanceof MovingServicesContractError) throw applicationContentError();
    throw error;
  }
  const media = await resolveReferencedMedia(movingServicesAssetIds(content), client);
  return Object.freeze({
    hero: collectionHeroView(content.hero, media),
    portfolio: Object.freeze({
      title: content.portfolio.title,
      ...(content.portfolio.intro === undefined ? {} : { intro: content.portfolio.intro }),
      items: Object.freeze(content.portfolio.items.map((item) => Object.freeze({
        title: item.title,
        description: item.description,
        href: item.href,
        ...(item.media === undefined
          ? {}
          : { media: imageView(item.media, requiredMedia(media, item.media.assetId)) }),
      }))),
    }),
    context: content.context,
    finalAction: content.finalAction,
  });
}

export async function composeMovingAreas(
  page: PublicPageProjection,
  client: PublicPageMediaClient,
): Promise<MovingAreasViewModel> {
  if (page.content.type !== "moving.areas") throw applicationContentError();
  const content = parseApplicationPayload(
    page.content.payload,
    parseMovingAreasPayload,
    MovingAreasContractError,
  );
  const media = await resolveReferencedMedia(collectionHeroAssetIds(content.hero), client);
  return Object.freeze({
    hero: collectionHeroView(content.hero, media),
    coverage: content.coverage,
    planning: content.planning,
    finalAction: content.finalAction,
  });
}

export async function composeMovingFaq(
  page: PublicPageProjection,
  client: PublicPageMediaClient,
): Promise<MovingFaqViewModel> {
  if (page.content.type !== "moving.faq") throw applicationContentError();
  const content = parseApplicationPayload(
    page.content.payload,
    parseMovingFaqPayload,
    MovingFaqContractError,
  );
  const media = await resolveReferencedMedia(collectionHeroAssetIds(content.hero), client);
  return Object.freeze({
    hero: collectionHeroView(content.hero, media),
    items: content.items,
    finalAction: content.finalAction,
  });
}

export async function composeMovingTestimonials(
  page: PublicPageProjection,
  client: PublicPageMediaClient,
): Promise<MovingTestimonialsViewModel> {
  if (page.content.type !== "moving.testimonials") throw applicationContentError();
  const content = parseApplicationPayload(
    page.content.payload,
    parseMovingTestimonialsPayload,
    MovingTestimonialsContractError,
  );
  const media = await resolveReferencedMedia(collectionHeroAssetIds(content.hero), client);
  return Object.freeze({
    hero: collectionHeroView(content.hero, media),
    featured: content.featured,
    items: content.items,
    finalAction: content.finalAction,
  });
}

export function composeMovingQuote(page: PublicPageProjection): MovingQuotePage {
  if (page.content.type !== "moving.quote") throw applicationContentError();
  return parseApplicationPayload(
    page.content.payload,
    parseMovingQuotePayload,
    MovingQuoteContractError,
  );
}

export function composeMovingContact(page: PublicPageProjection): MovingContactPage {
  if (page.content.type !== "moving.contact") throw applicationContentError();
  return parseApplicationPayload(
    page.content.payload,
    parseMovingContactPayload,
    MovingContactContractError,
  );
}

export function composeMovingArticle(page: PublicPageProjection): MovingArticleViewModel {
  if (page.content.type !== "moving.article") throw applicationContentError();
  const content = parseApplicationPayload(
    page.content.payload,
    parseMovingArticlePayload,
    MovingArticleContractError,
  );
  return Object.freeze({
    ...content,
    publishedAt: page.content.publishedAt,
  });
}

async function resolveReferencedMedia(
  assetIds: ReadonlySet<string>,
  client: PublicPageMediaClient,
): Promise<ReadonlyMap<string, PublicMediaProjection>> {
  const entries = await Promise.all([...assetIds].map(async (assetId) => {
    const media = await client.getMedia(assetId);
    if (media === null || media.kind !== "image") throw applicationContentError();
    return [assetId, media] as const;
  }));
  return new Map(entries);
}

function sitePageAssetIds(content: SitePage): ReadonlySet<string> {
  const assetIds = new Set<string>();
  if (content.heroMedia !== undefined) assetIds.add(content.heroMedia.assetId);
  for (const section of content.sections) {
    if (section.media !== undefined) assetIds.add(section.media.assetId);
  }
  return assetIds;
}

function movingHomeAssetIds(content: MovingHome): ReadonlySet<string> {
  const assetIds = new Set<string>([content.hero.media.assetId]);
  if (content.assurance.media !== undefined) assetIds.add(content.assurance.media.assetId);
  return assetIds;
}

function movingServiceAssetIds(content: MovingService): ReadonlySet<string> {
  return new Set(content.hero.media === undefined ? [] : [content.hero.media.assetId]);
}

function movingLocationAssetIds(content: MovingLocation): ReadonlySet<string> {
  return new Set(content.hero.media === undefined ? [] : [content.hero.media.assetId]);
}

function movingServicesAssetIds(content: MovingServicesPage): ReadonlySet<string> {
  const assetIds = new Set<string>(collectionHeroAssetIds(content.hero));
  for (const item of content.portfolio.items) {
    if (item.media !== undefined) assetIds.add(item.media.assetId);
  }
  return assetIds;
}

function collectionHeroAssetIds(hero: MovingCollectionHero): ReadonlySet<string> {
  return new Set(hero.media === undefined ? [] : [hero.media.assetId]);
}

function collectionHeroView(
  hero: MovingCollectionHero,
  media: ReadonlyMap<string, PublicMediaProjection>,
): MovingCollectionHeroViewModel {
  const heroMedia = hero.media === undefined
    ? undefined
    : imageView(hero.media, requiredMedia(media, hero.media.assetId));
  return Object.freeze({
    ...(hero.eyebrow === undefined ? {} : { eyebrow: hero.eyebrow }),
    title: hero.title,
    intro: hero.intro,
    ...(heroMedia === undefined ? {} : { media: heroMedia }),
  });
}

function parseApplicationPayload<T, E extends Error>(
  payload: unknown,
  parse: (value: unknown) => T,
  ContractError: new (...args: never[]) => E,
): T {
  try {
    return parse(payload);
  } catch (error: unknown) {
    if (error instanceof ContractError) throw applicationContentError();
    throw error;
  }
}

function requiredMedia(
  media: ReadonlyMap<string, PublicMediaProjection>,
  assetId: string,
): PublicMediaProjection {
  const result = media.get(assetId);
  if (result === undefined) throw applicationContentError();
  return result;
}

function imageView(reference: ContentMediaReference, media: PublicMediaProjection): ContentImage {
  const dimensions = imageDimensions(media.original);
  return Object.freeze({
    assetId: reference.assetId,
    alt: reference.alt,
    publicUrl: media.original.publicUrl,
    ...dimensions,
  });
}

function imageDimensions(
  original: PublicMediaObjectProjection,
): Readonly<{ readonly width?: number; readonly height?: number }> {
  return original.width === undefined || original.height === undefined
    ? Object.freeze({})
    : Object.freeze({ width: original.width, height: original.height });
}

function applicationContentError(): PublicApplicationContentError {
  return new PublicApplicationContentError();
}
