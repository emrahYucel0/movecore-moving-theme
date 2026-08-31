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
import type { ContentImage, ContentMediaReference } from "../../shared/content/media";

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
    finalAction: content.finalAction,
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
