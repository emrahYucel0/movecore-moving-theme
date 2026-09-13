import {
  businessStructuredData,
  composeMovingSocialMetadata,
  serializeJsonLd,
} from "~~/shared/moving-social-seo";
import type { PublicSiteComposition } from "~~/shared/site-composition";

export function useMovingSeoMetadata(input: Readonly<{
  title: string;
  description?: string;
  canonicalUrl: string;
  robots: string;
  site: PublicSiteComposition;
}>): void {
  const config = useRuntimeConfig();
  const metadata = composeMovingSocialMetadata({
    title: input.title,
    ...(input.description === undefined ? {} : { description: input.description }),
    canonicalUrl: input.canonicalUrl,
    siteName: input.site.business.companyName,
    ...(input.site.seo.defaultSocialImage === undefined
      ? {}
      : { defaultSocialImageUrl: input.site.seo.defaultSocialImage.publicUrl }),
  });
  const jsonLd = serializeJsonLd(businessStructuredData(
    config.public.siteUrl,
    input.site.business,
    input.site.seo,
  ));

  useSeoMeta({
    title: metadata.ogTitle,
    ...(input.description === undefined ? {} : { description: input.description }),
    robots: input.robots,
    ogTitle: metadata.ogTitle,
    ...(metadata.ogDescription === undefined ? {} : { ogDescription: metadata.ogDescription }),
    ogUrl: metadata.ogUrl,
    ogType: metadata.ogType,
    ogSiteName: metadata.ogSiteName,
    ...(metadata.ogImage === undefined ? {} : { ogImage: metadata.ogImage }),
    twitterCard: metadata.twitterCard,
    twitterTitle: metadata.twitterTitle,
    ...(metadata.twitterDescription === undefined
      ? {}
      : { twitterDescription: metadata.twitterDescription }),
    ...(metadata.twitterImage === undefined ? {} : { twitterImage: metadata.twitterImage }),
  });
  useHead({
    link: [{ rel: "canonical", href: input.canonicalUrl }],
    script: [{
      key: "moving-business-json-ld",
      type: "application/ld+json",
      textContent: jsonLd,
    }],
  });
}
