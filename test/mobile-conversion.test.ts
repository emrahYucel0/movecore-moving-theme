import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const RAIL = "../app/components/PublicMobileConversion.vue";
const THEME = "../app/assets/css/theme.css";
const MOBILE_BREAKPOINT = "@media (max-width: 67.9375rem)";

describe("R2.16B1 mobile conversion chrome", () => {
  it("reaches the phone and the quote in one tap, from the site's own data", async () => {
    const rail = await source(RAIL);
    // The same business projection the header and footer already dial.
    expect(rail).toContain(':href="business.primaryPhone.href"');
    expect(rail).toContain("{{ business.primaryPhone.display }}");
    expect(rail).toContain('to="/quote"');
    expect(rail).not.toMatch(/tel:\+?[0-9]/u);
    expect(rail).not.toMatch(/useRuntimeConfig|\$fetch|process\.env/u);
  });

  it("is named, native and free of script", async () => {
    const rail = await source(RAIL);
    expect(rail).toContain('aria-label="Contact the moving team"');
    expect(rail).toContain("<nav");
    expect(rail).toMatch(/<a\s/u);
    expect(rail).toContain("<NuxtLink");
    for (const forbidden of ["onMounted", "addEventListener", "@click", "v-show", "v-html", ":style="]) {
      expect(rail).not.toContain(forbidden);
    }
  });

  it("appears only where the header stops carrying the phone", async () => {
    const theme = await source(THEME);
    // Off by default, which is the desktop case.
    expect(theme).toMatch(/\.theme-menu-trigger,\n\.theme-mobile-menu,\n\.theme-mobile-conversion \{\n\s*display: none;/u);
    const mobile = theme.slice(theme.indexOf(MOBILE_BREAKPOINT));
    const desktopHeaderHidden = mobile.indexOf(".theme-header__desktop");
    const railShown = mobile.indexOf(".theme-mobile-conversion {");
    expect(desktopHeaderHidden).toBeGreaterThanOrEqual(0);
    expect(railShown).toBeGreaterThan(desktopHeaderHidden);
    expect(mobile.slice(railShown)).toContain("display: grid;");
  });

  it("clears the safe area, reserves its own space and covers nothing", async () => {
    const theme = await source(THEME);
    const mobile = theme.slice(theme.indexOf(MOBILE_BREAKPOINT));
    const rail = mobile.slice(mobile.indexOf(".theme-mobile-conversion {"));
    expect(rail).toContain("position: fixed;");
    expect(rail).toContain("padding-bottom: env(safe-area-inset-bottom, 0px);");
    // The footer closes every page, so it carries the reserved strip.
    expect(rail).toContain(".theme-footer {");
    expect(rail).toMatch(/padding-bottom: calc\(3\.5rem \+ 1px \+ env\(safe-area-inset-bottom, 0px\)\);/u);
  });

  it("keeps both targets comfortably tappable and square-cornered", async () => {
    const theme = await source(THEME);
    const action = theme.match(/\.theme-mobile-conversion__action \{[^}]*\}/u)?.[0] ?? "";
    expect(action).toContain("min-height: 3.5rem;");
    expect(action).toContain("min-width: 2.75rem;");
    expect(action).toContain("border-radius: var(--theme-radius);");
  });

  it("never puts two phone controls on screen at once", async () => {
    const theme = await source(THEME);
    expect(theme).toContain("body:has(#theme-mobile-menu:popover-open) .theme-mobile-conversion");
    // The header phone block stays the single desktop control, undisturbed.
    const navigation = await source("../app/components/PublicNavigation.vue");
    expect(navigation.match(/business\.primaryPhone\.href/gu) ?? []).toHaveLength(2);
  });

  it("is part of the shell, not of one page", async () => {
    const layout = await source("../app/layouts/default.vue");
    expect(layout).toContain("<PublicMobileConversion :business=\"site.business\" />");
    expect(layout).toContain("import PublicMobileConversion from");
  });
});

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
