import type { PublicBusinessIdentity, PublicSiteSeo } from "./site-composition";
import { parsePublicSiteOrigin } from "./public-site-url";

export const DEFAULT_ARTICLE_ARCHIVE_SEO_TITLE = "Moving articles and practical guides";
export const DEFAULT_ARTICLE_ARCHIVE_SEO_DESCRIPTION =
  "Clear field notes for preparing access, packing well and planning a considered move.";

export interface MovingSocialMetadata {
  readonly ogTitle: string;
  readonly ogDescription?: string;
  readonly ogUrl: string;
  readonly ogType: "website";
  readonly ogSiteName: string;
  readonly ogImage?: string;
  readonly twitterCard: "summary" | "summary_large_image";
  readonly twitterTitle: string;
  readonly twitterDescription?: string;
  readonly twitterImage?: string;
}

export function composeMovingSocialMetadata(input: Readonly<{
  title: string;
  description?: string;
  canonicalUrl: string;
  siteName: string;
  defaultSocialImageUrl?: string;
}>): MovingSocialMetadata {
  return Object.freeze({
    ogTitle: input.title,
    ...(input.description === undefined ? {} : { ogDescription: input.description }),
    ogUrl: input.canonicalUrl,
    ogType: "website",
    ogSiteName: input.siteName,
    ...(input.defaultSocialImageUrl === undefined ? {} : { ogImage: input.defaultSocialImageUrl }),
    twitterCard: input.defaultSocialImageUrl === undefined ? "summary" : "summary_large_image",
    twitterTitle: input.title,
    ...(input.description === undefined ? {} : { twitterDescription: input.description }),
    ...(input.defaultSocialImageUrl === undefined ? {} : { twitterImage: input.defaultSocialImageUrl }),
  });
}

export function businessStructuredData(
  publicSiteUrl: string,
  business: PublicBusinessIdentity,
  seo: PublicSiteSeo,
): Readonly<Record<string, unknown>> {
  const origin = parsePublicSiteOrigin(publicSiteUrl);
  const sameAs = business.socialLinks
    .map((link) => safeAbsoluteHttpUrl(link.href))
    .filter((value): value is string => value !== undefined);
  return Object.freeze({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${origin}/#business`,
    name: business.companyName,
    url: `${origin}/`,
    telephone: business.primaryPhone.display,
    ...(business.email === undefined ? {} : { email: business.email.display }),
    ...(business.address === undefined ? {} : { address: business.address }),
    ...(seo.businessLogoUrl === undefined ? {} : { logo: seo.businessLogoUrl }),
    ...(sameAs.length === 0 ? {} : { sameAs: Object.freeze(sameAs) }),
  });
}

/** Serializes JSON for an HTML script data block without permitting script termination. */
export function serializeJsonLd(value: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(value)
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003C")
    .replaceAll(">", "\\u003E")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function safeAbsoluteHttpUrl(input: string): string | undefined {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return undefined;
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
    return undefined;
  }
  return url.toString();
}
