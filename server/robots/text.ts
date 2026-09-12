import { parsePublicSiteOrigin } from "../../shared/public-site-url";

export function createMovingRobotsText(siteUrl: string): string {
  const origin = parsePublicSiteOrigin(siteUrl);
  return `User-agent: *\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`;
}
