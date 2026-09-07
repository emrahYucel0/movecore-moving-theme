import { describe, expect, it, vi } from "vitest";
import {
  ARTICLE_ARCHIVE_MAX_CORE_REQUESTS,
  ARTICLE_ARCHIVE_PAGE_SIZE,
  listMovingArticleArchive,
} from "../server/articles/archive";
import { PublicApplicationContentError } from "../server/public-page/application-content";
import type { PublicPageProjection } from "../shared/core-public-contracts";

describe("Moving Article archive composition", () => {
  it("uses one bounded generic collection request for a normal archive page", async () => {
    const listContent = vi.fn(async () => ({ items: [article("1"), article("2"), article("3")] }));
    const result = await listMovingArticleArchive({ listContent });
    expect(listContent).toHaveBeenCalledOnce();
    expect(listContent).toHaveBeenCalledWith({ type: "moving.article", limit: ARTICLE_ARCHIVE_PAGE_SIZE });
    expect(result.items.map((item) => item.canonicalPath)).toEqual(["/guides/1", "/guides/2", "/guides/3"]);
    expect(result.nextAfter).toBeUndefined();
  });

  it("continues across short and empty Core pages without exceeding four requests", async () => {
    const listContent = vi.fn()
      .mockResolvedValueOnce({ items: [], nextAfter: "cursor-1" })
      .mockResolvedValueOnce({ items: [article("1")], nextAfter: "cursor-2" })
      .mockResolvedValueOnce({ items: [], nextAfter: "cursor-3" })
      .mockResolvedValueOnce({ items: [article("2")], nextAfter: "cursor-4" });
    const result = await listMovingArticleArchive({ listContent });
    expect(listContent).toHaveBeenCalledTimes(ARTICLE_ARCHIVE_MAX_CORE_REQUESTS);
    expect(listContent).toHaveBeenNthCalledWith(2, { type: "moving.article", limit: 6, after: "cursor-1" });
    expect(listContent).toHaveBeenNthCalledWith(3, { type: "moving.article", limit: 5, after: "cursor-2" });
    expect(result.items).toHaveLength(2);
    expect(result.nextAfter).toBe("cursor-4");
  });

  it("preserves the page cursor and requests only the remaining display capacity", async () => {
    const listContent = vi.fn()
      .mockResolvedValueOnce({ items: [article("2"), article("3")], nextAfter: "cursor-3" })
      .mockResolvedValueOnce({ items: [article("4"), article("5"), article("6"), article("7")] });
    const result = await listMovingArticleArchive({ listContent }, "cursor-1");
    expect(listContent).toHaveBeenNthCalledWith(1, { type: "moving.article", limit: 6, after: "cursor-1" });
    expect(listContent).toHaveBeenNthCalledWith(2, { type: "moving.article", limit: 4, after: "cursor-3" });
    expect(result.items).toHaveLength(6);
  });

  it("fails closed for malformed payloads, wrong types, duplicates and repeated cursors", async () => {
    await expect(listMovingArticleArchive({ listContent: async () => ({
      items: [{ ...article("1"), content: { ...article("1").content, payload: { title: "No body" } } }],
    }) })).rejects.toBeInstanceOf(PublicApplicationContentError);
    await expect(listMovingArticleArchive({ listContent: async () => ({
      items: [{ ...article("1"), content: { ...article("1").content, type: "site.page" } }],
    }) })).rejects.toBeInstanceOf(PublicApplicationContentError);
    await expect(listMovingArticleArchive({ listContent: async () => ({ items: [article("1"), article("1")] }) }))
      .rejects.toBeInstanceOf(PublicApplicationContentError);
    await expect(listMovingArticleArchive({ listContent: async () => ({ items: [], nextAfter: "same" }) }, "same"))
      .rejects.toBeInstanceOf(PublicApplicationContentError);
  });
});

function article(id: string): PublicPageProjection {
  return {
    resource: { type: "moving.article", id: `article-${id}` },
    content: {
      contentId: `article-${id}`,
      type: "moving.article",
      revisionId: `article-${id}-r1`,
      revisionNumber: 1,
      payload: {
        title: `Article ${id}`,
        excerpt: `Excerpt ${id}`,
        body: [{ heading: "Plan", paragraphs: [{ text: "Useful guidance." }] }],
      },
      publishedAt: "2026-08-30T00:00:00.000Z",
    },
    seo: { canonicalPath: `/guides/${id}`, index: true, follow: true },
  };
}
