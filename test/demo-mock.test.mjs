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
    expect(root.page.content.type).toBe("site.page");
    expect(root.page.content.payload).toMatchObject({
      title: "Moving handled with care, from door to door.",
      sections: [{ heading: "Care at every handoff" }, { heading: "A planned moving process" }],
    });

    const about = await client.resolvePage("/about");
    expect(about.kind).toBe("page");
    expect(about.page.content.payload).toMatchObject({ title: "A clear plan for the work between homes." });
  });

  it("serves navigation, settings, public media, and a local SVG", async () => {
    await expect(client.getNavigation("primary")).resolves.toMatchObject({
      id: "primary",
      items: [
        { label: "Home", destination: { kind: "internal", path: "/" } },
        { label: "About", destination: { kind: "internal", path: "/about" } },
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
      items: [{ path: "/" }, { path: "/about" }],
    });
  });
});
