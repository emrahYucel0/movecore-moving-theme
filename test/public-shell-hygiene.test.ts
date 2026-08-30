import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("public shell hygiene", () => {
  it("keeps site composition transport while removing its debug rendering", async () => {
    const layout = await source("../app/layouts/default.vue");
    expect(layout).not.toContain("PublicSiteFoundation");
    expect(layout).not.toContain("<pre");
    await expect(access(new URL("../server/api/_movecore/site.get.ts", import.meta.url))).resolves.toBeUndefined();
    await expect(access(new URL("../app/components/PublicSiteFoundation.vue", import.meta.url))).rejects.toThrow();
  });

  it("offers status-specific, accessible recovery without raw error internals", async () => {
    const errorPage = await source("../app/error.vue");
    for (const evidence of [
      "role=\"alert\"",
      "aria-labelledby=\"public-error-title\"",
      "Page not found",
      "Upstream response unavailable",
      "Service temporarily unavailable",
      "Return to home",
    ]) expect(errorPage).toContain(evidence);
    expect(errorPage).not.toMatch(/error\.(?:message|stack|cause)/u);
    expect(errorPage).not.toContain("v-html");
  });
});

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
