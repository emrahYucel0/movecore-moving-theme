import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  MOVING_ARTICLE_LIMITS,
  MovingArticleContractError,
  formatMovingArticleDate,
  parseMovingArticlePayload,
} from "../shared/content/moving-article";

describe("moving.article application contract", () => {
  it.each([
    "moving-article-access.json",
    "moving-article-packing.json",
    "moving-article-office.json",
  ])("parses deterministic Article fixture %s", async (name) => {
    const payload: unknown = JSON.parse(await readFile(
      new URL(`../application/examples/${name}`, import.meta.url), "utf8",
    ));
    const article = parseMovingArticlePayload(payload);
    expect(article.title.length).toBeGreaterThan(0);
    expect(article.excerpt.length).toBeGreaterThan(0);
    expect(article.body.length).toBeGreaterThan(0);
    expect(article.body.every((section) => section.paragraphs.length > 0)).toBe(true);
  });

  it("accepts a section without a heading and normalizes a blank optional heading", () => {
    expect(parseMovingArticlePayload(valid({ body: [{ heading: "", paragraphs: [{ text: "Copy" }] }] })))
      .toMatchObject({ body: [{ paragraphs: [{ text: "Copy" }] }] });
  });

  it.each([
    null,
    [],
    { title: "Title", excerpt: "Excerpt", body: [] },
    { title: "", excerpt: "Excerpt", body: [{ paragraphs: [{ text: "Copy" }] }] },
    { title: "Title", excerpt: "", body: [{ paragraphs: [{ text: "Copy" }] }] },
    { title: "Title", excerpt: "Excerpt", body: [{ paragraphs: [] }] },
    { title: "Title", excerpt: "Excerpt", body: [{ paragraphs: [{ text: "" }] }] },
    { title: "Title", excerpt: "Excerpt", body: "unsafe" },
  ])("rejects incompatible Article payload %#", (payload) => {
    expect(() => parseMovingArticlePayload(payload)).toThrow(MovingArticleContractError);
  });

  it("enforces every buyer-facing length and collection bound", () => {
    expect(() => parseMovingArticlePayload(valid({ title: "x".repeat(MOVING_ARTICLE_LIMITS.title + 1) })))
      .toThrow(MovingArticleContractError);
    expect(() => parseMovingArticlePayload(valid({ excerpt: "x".repeat(MOVING_ARTICLE_LIMITS.excerpt + 1) })))
      .toThrow(MovingArticleContractError);
    expect(() => parseMovingArticlePayload(valid({
      body: Array.from({ length: MOVING_ARTICLE_LIMITS.bodySections + 1 }, () => ({ paragraphs: [{ text: "Copy" }] })),
    }))).toThrow(MovingArticleContractError);
    expect(() => parseMovingArticlePayload(valid({
      body: [{ paragraphs: Array.from({ length: MOVING_ARTICLE_LIMITS.paragraphsPerSection + 1 }, () => ({ text: "Copy" })) }],
    }))).toThrow(MovingArticleContractError);
  });

  it("formats the truthful Core publication instant in UTC and rejects invalid dates", () => {
    expect(formatMovingArticleDate("2026-08-30T00:00:00.000Z")).toBe("30 August 2026");
    expect(() => formatMovingArticleDate("not-a-date")).toThrow(MovingArticleContractError);
  });
});

function valid(overrides: Readonly<Record<string, unknown>> = {}): unknown {
  return {
    title: "Useful moving guidance",
    excerpt: "A concise introduction.",
    body: [{ heading: "Plan", paragraphs: [{ text: "Start early." }] }],
    ...overrides,
  };
}
