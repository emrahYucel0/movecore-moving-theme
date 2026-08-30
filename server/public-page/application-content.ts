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
  type SitePageImage,
  type SitePageMediaReference,
  type SitePageSectionViewModel,
  type SitePageViewModel,
} from "../../shared/content/site-page";

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

  const media = await resolveReferencedMedia(content, client);
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

async function resolveReferencedMedia(
  content: SitePage,
  client: PublicPageMediaClient,
): Promise<ReadonlyMap<string, PublicMediaProjection>> {
  const assetIds = new Set<string>();
  if (content.heroMedia !== undefined) assetIds.add(content.heroMedia.assetId);
  for (const section of content.sections) {
    if (section.media !== undefined) assetIds.add(section.media.assetId);
  }

  const entries = await Promise.all([...assetIds].map(async (assetId) => {
    const media = await client.getMedia(assetId);
    if (media === null || media.kind !== "image") throw applicationContentError();
    return [assetId, media] as const;
  }));
  return new Map(entries);
}

function requiredMedia(
  media: ReadonlyMap<string, PublicMediaProjection>,
  assetId: string,
): PublicMediaProjection {
  const result = media.get(assetId);
  if (result === undefined) throw applicationContentError();
  return result;
}

function imageView(reference: SitePageMediaReference, media: PublicMediaProjection): SitePageImage {
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
