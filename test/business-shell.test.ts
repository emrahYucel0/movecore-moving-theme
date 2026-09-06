import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("R2.7B commercial business shell", () => {
  it("ships the exact generic Core setting definition without a demo brand fallback", async () => {
    const manifest = JSON.parse(await source("../application/setting-definitions.json"));
    expect(manifest).toEqual({
      version: 1,
      settings: [{
        namespace: "moving",
        key: "business",
        exposure: "public",
        value: {
          schemaVersion: 2,
          companyName: "Example Moving Company",
          primaryPhone: "+1 202-555-0100",
          openingHours: [],
          socialLinks: [],
        },
      }],
    });
    expect(JSON.stringify(manifest)).not.toContain("Northline");
  });

  it("renders CMS media or an intentional typographic brand without a CSS placeholder mark", async () => {
    const brand = await source("../app/components/PublicBusinessBrand.vue");
    const header = await source("../app/components/PublicNavigation.vue");
    const theme = await source("../app/assets/css/theme.css");

    expect(brand).toContain('v-if="business.logo"');
    expect(brand).toContain(":src=\"business.logo.publicUrl\"");
    expect(brand).toContain(":alt=\"business.logo.alt\"");
    expect(brand).toContain("business.companyName");
    expect(header).toContain(":business=\"business\"");
    expect(header).toContain("business.primaryPhone.href");
    expect(theme).not.toContain("theme-brand__mark");
  });

  it("uses semantic desktop and native-popover mobile navigation without hover dependency", async () => {
    const header = await source("../app/components/PublicNavigation.vue");
    const tree = await source("../app/components/PublicNavigationTree.vue");
    const theme = await source("../app/assets/css/theme.css");

    for (const evidence of [
      '<header class="theme-header">',
      'aria-label="Primary navigation"',
      'aria-label="Mobile navigation"',
      'popovertarget="theme-mobile-menu"',
      'popover="auto"',
      'popovertargetaction="hide"',
      'aria-label="Close navigation"',
      "business.primaryPhone.href",
    ]) expect(header).toContain(evidence);
    expect(tree).toContain(":autofocus=");
    expect(theme).toContain(".theme-mobile-menu:popover-open");
    expect(theme).toContain(".theme-mobile-menu::backdrop");
    expect(theme).toContain("@media (max-width: 67.9375rem)");
    expect(header).not.toContain("@click");
  });

  it("renders a semantic, optional-field-aware commercial footer", async () => {
    const footer = await source("../app/components/PublicFooter.vue");
    const layout = await source("../app/layouts/default.vue");
    for (const evidence of [
      '<footer id="site-footer" class="theme-footer">',
      'aria-label="Footer navigation"',
      "business.primaryPhone",
      'v-if="business.whatsapp"',
      'v-if="business.email"',
      'v-if="business.address"',
      'v-if="business.openingHours.length > 0"',
      'v-if="business.socialLinks.length > 0"',
      'rel="noopener noreferrer"',
      "currentYear",
    ]) expect(footer).toContain(evidence);
    expect(layout).toContain("<PublicFooter");
    expect(layout).toContain(":navigation=\"site.footerNavigation\"");
  });

  it("keeps all business presentation escaped and server-only", async () => {
    const sources = await Promise.all([
      source("../app/components/PublicBusinessBrand.vue"),
      source("../app/components/PublicNavigation.vue"),
      source("../app/components/PublicFooter.vue"),
      source("../app/layouts/default.vue"),
    ]);
    const combined = sources.join("\n");
    for (const forbidden of ["v-html", "NUXT_CORE_BASE_URL", "getSetting", "getMedia", "storageKey"]) {
      expect(combined).not.toContain(forbidden);
    }
  });
});

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
