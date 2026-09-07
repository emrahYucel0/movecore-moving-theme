import type { PageRouteResult } from "~~/shared/page-route";
import { absolutePublicUrl } from "~~/shared/public-site-url";
import { robotsDirective } from "~~/shared/public-seo";

type PublicPage = Extract<PageRouteResult, { readonly kind: "page" }>["page"];

export function usePublicPageSeo(page: PublicPage): void {
  const config = useRuntimeConfig();
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
    title: () => page.seo.title ?? (page.type === "moving.article" ? page.content.title : undefined),
    description: () => page.seo.description ?? (page.type === "moving.article" ? page.content.excerpt : undefined),
    robots: () => robotsDirective(page.seo.index, page.seo.follow),
  });
  useHead(() => ({
    link: [{ rel: "canonical", href: canonical }],
  }));
}
