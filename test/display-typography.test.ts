import { readFile, stat } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const THEME = "../app/assets/css/theme.css";

describe("R2.16B1 self-hosted display typography", () => {
  it("carries the display face in the product instead of borrowing it from the device", async () => {
    const theme = await source(THEME);
    const faces = theme.match(/@font-face \{[^}]*\}/gu) ?? [];
    expect(faces).toHaveLength(2);
    for (const face of faces) {
      expect(face).toContain('font-family: "Archivo Narrow"');
      expect(face).toContain("font-weight: 400 700");
      expect(face).toContain("font-display: swap");
      expect(face).toContain('format("woff2")');
      // Product-owned path: no runtime request leaves the origin.
      expect(face).toMatch(/src: url\("\/fonts\/archivo-narrow-[a-z-]+\.woff2"\)/u);
      expect(face).toContain("unicode-range:");
    }
  });

  it("ships exactly the two subsets it declares, plus the licence they require", async () => {
    for (const file of ["archivo-narrow-latin.woff2", "archivo-narrow-latin-ext.woff2"]) {
      const info = await stat(new URL(`../public/fonts/${file}`, import.meta.url));
      expect(info.isFile()).toBe(true);
      expect(info.size).toBeGreaterThan(1_024);
      // A display face large enough to be worth auditing would need subsetting.
      expect(info.size).toBeLessThan(64 * 1_024);
    }
    const licence = await source("../public/fonts/OFL.txt");
    expect(licence).toContain("SIL Open Font License, Version 1.1");
    expect(licence).toContain("The Archivo Narrow Project Authors");
  });

  it("covers the Turkish and Latin Extended range the product may publish in", async () => {
    const theme = await source(THEME);
    const extended = theme.match(/@font-face \{[^}]*archivo-narrow-latin-ext[^}]*\}/u)?.[0] ?? "";
    // Ğ ğ İ Ş ş live in U+0100-017F; ı lives in the Latin subset at U+0131.
    expect(extended).toContain("U+0100-02BA");
    const latin = theme.match(/@font-face \{[^}]*archivo-narrow-latin\.woff2[^}]*\}/u)?.[0] ?? "";
    expect(latin).toContain("U+0131");
  });

  it("makes Archivo Narrow the production path and leaves the rest as failure cover", async () => {
    const theme = await source(THEME);
    const stack = theme.match(/--theme-font-display:([^;]+);/u)?.[1] ?? "";
    expect(stack.trim().startsWith('"Archivo Narrow"')).toBe(true);
    // Arial Narrow may still catch a failed load, but it is no longer the face
    // the art direction depends on.
    expect(stack.indexOf('"Archivo Narrow"')).toBeLessThan(stack.indexOf('"Arial Narrow"'));
  });

  it("requests no font from anywhere but this origin", async () => {
    const theme = await source(THEME);
    const nuxtConfig = await source("../nuxt.config.ts");
    for (const text of [theme, nuxtConfig]) {
      expect(text).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit|cdn\.jsdelivr|unpkg\.com/u);
    }
    expect(theme).not.toContain("@import url(http");
  });

  it("states every display weight once, within the range the face actually has", async () => {
    const theme = await source(THEME);
    expect(theme).toContain("--theme-display-weight: 700;");
    // Archivo Narrow tops out at 700; a literal 790 beside the display family
    // would silently clamp and mislead the next reader.
    for (const block of theme.match(/\{[^{}]*\}/gu) ?? []) {
      if (!block.includes("--theme-font-display)")) continue;
      expect(block).not.toMatch(/font-weight:\s*(?:7[1-9][0-9]|[89][0-9][0-9]);/u);
    }
  });

  it("lets the document fetch the display face alongside the stylesheet", async () => {
    const nuxtConfig = await source("../nuxt.config.ts");
    // Discovered only after theme.css parses, the face costs an extra round
    // trip on a slow connection and delays first paint.
    expect(nuxtConfig).toContain('rel: "preload"');
    expect(nuxtConfig).toContain('as: "font"');
    expect(nuxtConfig).toContain('type: "font/woff2"');
    expect(nuxtConfig).toContain('href: "/fonts/archivo-narrow-latin.woff2"');
    expect(nuxtConfig).toContain('crossorigin: "anonymous"');
    // Only the subset every page needs; Latin Extended stays on demand.
    expect(nuxtConfig.match(/rel: "preload"/gu) ?? []).toHaveLength(1);
    expect(nuxtConfig).not.toContain("archivo-narrow-latin-ext.woff2");
  });

  it("adds no font tooling or runtime dependency", async () => {
    const packageJson = JSON.parse(await source("../package.json"));
    expect(Object.keys(packageJson.dependencies)).toEqual(["nuxt", "vue", "vue-router"]);
    expect(JSON.stringify(packageJson)).not.toMatch(/fontsource|webfont|subfont|glyphhanger|fonttools/iu);
  });
});

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
