import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Moving Article public presentation", () => {
  it("uses semantic SSR-readable archive and detail markup without unsafe HTML or client interaction", async () => {
    const archive = await source("../app/pages/articles/index.vue");
    const detail = await source("../app/components/content/MovingArticleRenderer.vue");
    expect((archive.match(/<h1(?:\s|>)/gu) ?? [])).toHaveLength(1);
    expect((detail.match(/<h1(?:\s|>)/gu) ?? [])).toHaveLength(1);
    expect(archive).toContain("<ol");
    expect(archive).toContain("<article>");
    expect(archive).toContain("aria-label=\"Article archive pagination\"");
    expect(detail).toContain("<article");
    expect(detail).toContain("<section");
    expect(detail).toContain("<time");
    for (const text of [archive, detail]) {
      expect(text).not.toMatch(/v-html|client-only|@click|<iframe/iu);
    }
  });

  it("uses Core canonical links and application SEO fallback without slug construction", async () => {
    const archive = await source("../app/pages/articles/index.vue");
    const seo = await source("../app/composables/use-public-page-seo.ts");
    expect(archive).toContain(":to=\"item.canonicalPath\"");
    expect(archive).not.toMatch(/slug|contentId.*to/iu);
    expect(seo).toContain("composeMovingPageSeo(page)");
    expect(seo).toContain("page.seo.canonicalPath");
  });
});

function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
