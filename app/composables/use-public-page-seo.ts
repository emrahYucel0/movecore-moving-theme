import type { PageRouteResult } from "~~/shared/page-route";
import { composeMovingPageSeo } from "~~/shared/moving-page-seo";
import { absolutePublicUrl } from "~~/shared/public-site-url";
import { robotsDirective } from "~~/shared/public-seo";

type PublicPage = Extract<PageRouteResult, { readonly kind: "page" }>["page"];

export function usePublicPageSeo(page: PublicPage): void {
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

  useSeoMeta({
    title: () => presentation.title,
    description: () => presentation.description,
    robots: () => robotsDirective(page.seo.index, page.seo.follow),
  });
  useHead(() => ({
    link: [{ rel: "canonical", href: canonical }],
  }));
}
