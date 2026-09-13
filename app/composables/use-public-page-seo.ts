import type { PageRouteResult } from "~~/shared/page-route";
import { composeMovingPageSeo } from "~~/shared/moving-page-seo";
import { absolutePublicUrl } from "~~/shared/public-site-url";
import { robotsDirective } from "~~/shared/public-seo";
import type { PublicSiteComposition } from "~~/shared/site-composition";

type PublicPage = Extract<PageRouteResult, { readonly kind: "page" }>["page"];

export function usePublicPageSeo(page: PublicPage, site: PublicSiteComposition): void {
  const config = useRuntimeConfig();
  const presentation = composeMovingPageSeo(page);
  let canonical: string;
  try {
    canonical = absolutePublicUrl(config.public.siteUrl, page.seo.canonicalPath);
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: "Public site configuration unavailable",
      fatal: true,
    });
  }

  useMovingSeoMetadata({
    title: presentation.title,
    ...(presentation.description === undefined ? {} : { description: presentation.description }),
    robots: robotsDirective(page.seo.index, page.seo.follow),
    canonicalUrl: canonical,
    site,
  });
}
