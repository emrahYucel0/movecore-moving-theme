import type { CorePublicClient } from "../core/client";
import type { PublicPageProjection } from "../core/contracts";
import {
  MovingArticleContractError,
  parseMovingArticlePayload,
  type MovingArticleArchiveItem,
} from "../../shared/content/moving-article";
import { PublicApplicationContentError } from "../public-page/application-content";

export const ARTICLE_ARCHIVE_PAGE_SIZE = 6;
export const ARTICLE_ARCHIVE_MAX_CORE_REQUESTS = 4;

export interface MovingArticleArchivePage {
  readonly items: readonly MovingArticleArchiveItem[];
  readonly nextAfter?: string;
}

export type MovingArticleArchiveClient = Pick<CorePublicClient, "listContent">;

export async function listMovingArticleArchive(
  client: MovingArticleArchiveClient,
  after?: string,
): Promise<MovingArticleArchivePage> {
  const items: MovingArticleArchiveItem[] = [];
  const contentIds = new Set<string>();
  const canonicalPaths = new Set<string>();
  const cursors = new Set<string>();
  let cursor = after;
  let nextAfter: string | undefined;

  for (
    let requestNumber = 0;
    requestNumber < ARTICLE_ARCHIVE_MAX_CORE_REQUESTS && items.length < ARTICLE_ARCHIVE_PAGE_SIZE;
    requestNumber += 1
  ) {
    const page = await client.listContent({
      type: "moving.article",
      limit: ARTICLE_ARCHIVE_PAGE_SIZE - items.length,
      ...(cursor === undefined ? {} : { after: cursor }),
    });
    for (const projection of page.items) {
      const item = archiveItem(projection);
      if (contentIds.has(item.contentId) || canonicalPaths.has(item.canonicalPath)) {
        throw new PublicApplicationContentError();
      }
      contentIds.add(item.contentId);
      canonicalPaths.add(item.canonicalPath);
      items.push(item);
    }
    nextAfter = page.nextAfter;
    if (nextAfter === undefined) break;
    if (nextAfter === cursor || cursors.has(nextAfter)) {
      throw new PublicApplicationContentError();
    }
    cursors.add(nextAfter);
    cursor = nextAfter;
  }

  return Object.freeze({
    items: Object.freeze(items),
    ...(nextAfter === undefined ? {} : { nextAfter }),
  });
}

function archiveItem(page: PublicPageProjection): MovingArticleArchiveItem {
  if (page.content.type !== "moving.article") throw new PublicApplicationContentError();
  try {
    const content = parseMovingArticlePayload(page.content.payload);
    return Object.freeze({
      contentId: page.content.contentId,
      title: content.title,
      excerpt: content.excerpt,
      publishedAt: page.content.publishedAt,
      canonicalPath: page.seo.canonicalPath,
    });
  } catch (error: unknown) {
    if (error instanceof MovingArticleContractError) throw new PublicApplicationContentError();
    throw error;
  }
}
