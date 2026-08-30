import type { CorePublicClient } from "../core/client";
import { CoreClientError } from "../core/errors";
import {
  absolutePublicUrl,
  parsePublicSiteOrigin,
} from "../../shared/public-site-url";

const SITEMAP_PAGE_LIMIT = 100;
const MAX_SITEMAP_PAGES = 10_000;

export type PublicSitemapClient = Pick<CorePublicClient, "listSitemap">;

export async function createPublicSitemapXml(
  siteUrl: string,
  client: PublicSitemapClient,
): Promise<string> {
  const origin = parsePublicSiteOrigin(siteUrl);
  const entries: Array<Readonly<{ path: string; lastModified?: string }>> = [];
  const cursors = new Set<string>();
  let after: string | undefined;

  for (let pageNumber = 0; pageNumber < MAX_SITEMAP_PAGES; pageNumber += 1) {
    const page = await client.listSitemap({
      limit: SITEMAP_PAGE_LIMIT,
      ...(after === undefined ? {} : { after }),
    });
    entries.push(...page.items);
    if (page.nextAfter === undefined) return renderXml(origin, entries);
    if (cursors.has(page.nextAfter)) throw repeatedCursor();
    cursors.add(page.nextAfter);
    after = page.nextAfter;
  }
  throw repeatedCursor();
}

function renderXml(
  origin: string,
  entries: readonly Readonly<{ path: string; lastModified?: string }>[],
): string {
  const urls = entries.map((entry) => {
    const location = xmlEscape(absolutePublicUrl(origin, entry.path));
    const lastModified = entry.lastModified === undefined
      ? ""
      : `\n    <lastmod>${xmlEscape(entry.lastModified)}</lastmod>`;
    return `  <url>\n    <loc>${location}</loc>${lastModified}\n  </url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.length === 0 ? "" : `\n${urls}\n`}</urlset>\n`;
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function repeatedCursor(): CoreClientError {
  return new CoreClientError("protocol", { code: "invalid_sitemap_pagination" });
}
