import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { publicPathIdentity, withoutSelfLinks } from "../shared/content/moving-common";

const THEME = "../app/assets/css/theme.css";

describe("R2.16A defect: an area page offered itself as somewhere else to go", () => {
  const nearby = [
    { label: "Riverside", href: "/areas/riverside" },
    { label: "North District", href: "/areas/north-district" },
  ] as const;

  it("drops the current page and keeps every other area", () => {
    const result = withoutSelfLinks(nearby, "/areas/riverside");
    expect(result.map((item) => item.href)).toEqual(["/areas/north-district"]);
  });

  it("recognises the same destination through trailing slash, query and fragment", () => {
    for (const href of ["/areas/riverside/", "/areas/riverside?from=nav", "/areas/riverside#top"]) {
      expect(withoutSelfLinks([{ label: "Riverside", href }], "/areas/riverside")).toHaveLength(0);
    }
    expect(withoutSelfLinks(nearby, "/areas/riverside/")).toHaveLength(1);
  });

  it("keeps a neighbouring path that merely shares a prefix", () => {
    const result = withoutSelfLinks(
      [{ label: "Riverside North", href: "/areas/riverside-north" }],
      "/areas/riverside",
    );
    expect(result).toHaveLength(1);
  });

  it("leaves external and protocol links alone", () => {
    expect(publicPathIdentity("tel:+441234567890")).toBeUndefined();
    expect(publicPathIdentity("https://example.test/areas/riverside")).toBeUndefined();
    expect(publicPathIdentity("//example.test/areas")).toBeUndefined();
    const items = [{ label: "Call", href: "tel:+441234567890" }];
    expect(withoutSelfLinks(items, "/areas/riverside")).toEqual(items);
  });

  it("compares identity rather than a known area name", async () => {
    const shared = await source("../shared/content/moving-common.ts");
    const renderer = await source("../app/components/content/MovingLocationRenderer.vue");
    for (const text of [shared, renderer]) {
      expect(text).not.toMatch(/riverside|north-district/iu);
    }
    expect(renderer).toContain("withoutSelfLinks(");
    expect(renderer).toContain("publicPathname(route)");
    // The list is filtered for rendering only; the content contract is untouched.
    expect(renderer).toContain('v-for="item in nearbyAreas"');
    expect(renderer).toContain('v-if="nearbyAreas.length > 0"');
  });
});

describe("R2.16A defect: two headings broke the page grid", () => {
  it("aligns the service process heading with every other inner heading", async () => {
    const theme = await source(THEME);
    expect(theme).not.toContain(".moving-service-process .moving-inner-heading");
    expect(theme).not.toContain("margin-left: min(14vw, 12rem)");
  });

  it("never indents the area note off the page grid", async () => {
    const theme = await source(THEME);
    // R2.16B3 moved the area intro out of the copy block into its own grid
    // column, so it can no longer be pushed off the H1's edge by a margin.
    expect(theme).not.toContain(".moving-location-hero--without-media .moving-inner-hero__intro");
    const note = theme.match(/\n\.moving-location-hero__note \{[^}]*\}/u)?.[0] ?? "";
    expect(note).toContain("grid-column: 7 / -1;");
    expect(note).not.toContain("margin-left");
    expect(note).toContain("margin: 0;");
    // Without a photograph it moves up beside the title, still in its own column.
    const withoutMedia = theme.match(/\.moving-location-hero--without-media \.moving-location-hero__note \{[^}]*\}/u)?.[0] ?? "";
    expect(withoutMedia).toContain("grid-column: 9 / -1;");
    expect(withoutMedia).not.toContain("margin-left");
  });
});

describe("R2.16B1 progressive motion foundation", () => {
  it("keeps every scroll-linked behaviour behind a capability gate", async () => {
    const theme = await source(THEME);
    const gate = capabilityGate(theme);
    expect(gate).toContain("@media (prefers-reduced-motion: no-preference)");
    // Every animation-timeline in the stylesheet is inside the gate; the one
    // outside it is the @supports condition itself.
    expect(theme.match(/animation-timeline:/gu) ?? []).toHaveLength(
      (gate.match(/animation-timeline:/gu) ?? []).length + 1,
    );
  });

  it("animates only decoration, and only from a finished default state", async () => {
    const theme = await source(THEME);
    const gate = capabilityGate(theme);
    const animated = [...gate.matchAll(/^ {4}(\.[\w-]+(?:::(?:before|after))?)(?:,| \{)$/gmu)]
      .map((match) => match[1] ?? "");
    expect(animated.length).toBeGreaterThanOrEqual(6);
    for (const selector of animated) {
      expect(selector).toMatch(/::(?:before|after)$/u);
      // The element's own rule must not pre-transform it, or an unsupported
      // browser would paint the unfinished state and never finish it.
      const own = theme.match(new RegExp(`\\n${escape(selector)}[,\\s][^{]*\\{[^}]*\\}`, "u"))?.[0] ?? "";
      expect(own).not.toMatch(/\n\s+transform:|\n\s+opacity:/u);
    }
  });

  it("resets to the finished state for a reader who asked for less motion", async () => {
    const theme = await source(THEME);
    const reduce = theme.slice(theme.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduce).toContain("animation: none !important;");
    expect(reduce).toContain("transform: none !important;");
  });

  it("adds no animation engine and no production client script", async () => {
    const packageJson = JSON.parse(await source("../package.json"));
    expect(JSON.stringify(packageJson)).not.toMatch(/gsap|scrolltrigger|lenis|motion|anime|framer/iu);
    expect(await source("../nuxt.config.ts")).toContain('features: { noScripts: "production" }');
  });
});

/** Extracts the @supports block by balancing braces; it nests two levels deep. */
function capabilityGate(theme: string): string {
  const start = theme.indexOf("@supports (animation-timeline: view())");
  expect(start).toBeGreaterThan(-1);
  let depth = 0;
  for (let index = theme.indexOf("{", start); index < theme.length; index += 1) {
    if (theme[index] === "{") depth += 1;
    if (theme[index] === "}") {
      depth -= 1;
      if (depth === 0) return theme.slice(start, index + 1);
    }
  }
  throw new Error("Unbalanced capability gate.");
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
