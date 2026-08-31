import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCorePublicClient } from "../server/core/client";
import { createMockCoreServer, createMockMediaServer } from "../scripts/mock-core.mjs";

const HOST = "127.0.0.1";
const mockMedia = createMockMediaServer();
let mockCore;
let origin;
let client;

beforeAll(async () => {
  await listen(mockMedia);
  mockCore = createMockCoreServer({ mediaOrigin: serverOrigin(mockMedia) });
  await listen(mockCore);
  origin = serverOrigin(mockCore);
  client = createCorePublicClient({ baseUrl: origin });
});

afterAll(async () => {
  await close(mockCore);
  await close(mockMedia);
});

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, HOST, resolve);
  });
}

function serverOrigin(server) {
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Mock server did not bind.");
  return `http://${HOST}:${address.port}`;
}

function close(server) {
  if (server === undefined || !server.listening) return Promise.resolve();
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

describe("shared demo Core", () => {
  it("serves typed root and about pages through the real public client", async () => {
    const root = await client.resolvePage("/");
    expect(root.kind).toBe("page");
    expect(root.page.content.type).toBe("moving.home");
    expect(root.page.content.payload).toMatchObject({
      hero: {
        title: "Moving handled with care, from door to door.",
        primaryAction: { href: "/about" },
        secondaryAction: { href: "tel:+15550101010" },
      },
      assurance: { title: "Care is part of the process." },
      finalAction: { title: "Start with a clear moving plan." },
    });
    expect(root.page.content.payload.services.items.map((item) => item.title)).toEqual([
      "Home moving", "Office relocation", "Packing support", "Small moves",
    ]);
    expect(root.page.content.payload.process.steps.map((step) => step.title)).toEqual([
      "Plan", "Prepare", "Move", "Place",
    ]);
    expect(root.page.content.payload.serviceAreas.areas.map((area) => area.label)).toContain("North district");

    const about = await client.resolvePage("/about");
    expect(about.kind).toBe("page");
    expect(about.page.content.payload).toMatchObject({ title: "A clear plan for the work between homes." });
  });

  it.each([
    ["/services/home-moving", "moving.service", "A room-by-room plan for moving home."],
    ["/services/office-relocation", "moving.service", "A structured handoff for moving workplaces."],
    ["/areas/north-district", "moving.location", "Moving support shaped around practical local access."],
    ["/areas/riverside", "moving.location", "Plan a Riverside move around access and handoff."],
  ])("serves %s as %s", async (path, type, title) => {
    const result = await client.resolvePage(path);
    expect(result.kind).toBe("page");
    expect(result.page.content.type).toBe(type);
    expect(result.page.content.payload.hero.title).toBe(title);
    expect(result.page.seo.canonicalPath).toBe(path);
    expect(result.page.seo.title).not.toBe(title);
  });

  it("serves navigation, settings, public media, and a local SVG", async () => {
    await expect(client.getNavigation("primary")).resolves.toMatchObject({
      id: "primary",
      items: [
        { label: "Home", destination: { kind: "internal", path: "/" } },
        { label: "About", destination: { kind: "internal", path: "/about" } },
        { label: "Services", destination: { kind: "internal", path: "/services/home-moving" } },
        { label: "Areas", destination: { kind: "internal", path: "/areas/north-district" } },
      ],
    });
    await expect(client.getSetting("site", "foundation")).resolves.toMatchObject({
      value: { name: "Northline Moving" },
    });
    const media = await client.getMedia("asset:demo-hero");
    expect(media).toMatchObject({ kind: "image", original: { mimeType: "image/svg+xml" } });
    const svg = await fetch(media.original.publicUrl);
    expect(svg.status).toBe(200);
    expect(svg.headers.get("content-type")).toContain("image/svg+xml");
    expect(await svg.text()).toContain("Moving truck beside stacked packing boxes");
  });

  it("preserves redirect and not-found semantics", async () => {
    await expect(client.resolvePage("/old")).resolves.toMatchObject({
      kind: "redirect",
      status: 301,
      to: "/about",
    });
    await expect(client.resolvePage("/temporary")).resolves.toMatchObject({
      kind: "redirect",
      status: 302,
      to: "/about",
    });
    await expect(client.resolvePage("/missing")).resolves.toEqual({ kind: "not-found" });
  });

  it("provides the canonical demo sitemap", async () => {
    await expect(client.listSitemap()).resolves.toMatchObject({
      items: [
        { path: "/" },
        { path: "/about" },
        { path: "/services/home-moving" },
        { path: "/services/office-relocation" },
        { path: "/areas/north-district" },
        { path: "/areas/riverside" },
      ],
    });
  });

  it("keeps every internal demo content link resolvable", async () => {
    const pages = await Promise.all([
      "/", "/services/home-moving", "/services/office-relocation",
      "/areas/north-district", "/areas/riverside",
    ].map((path) => client.resolvePage(path)));
    const hrefs = pages.flatMap((result) => result.kind === "page" ? internalHrefs(result.page.content.payload) : []);
    const unique = [...new Set(hrefs)];
    const results = await Promise.all(unique.map((href) => client.resolvePage(href)));
    expect(unique.length).toBeGreaterThan(0);
    expect(results.every((result) => result.kind === "page")).toBe(true);
  });
});

function internalHrefs(value) {
  if (Array.isArray(value)) return value.flatMap(internalHrefs);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) =>
    key === "href" && typeof item === "string" && item.startsWith("/")
      ? [item]
      : internalHrefs(item));
}
