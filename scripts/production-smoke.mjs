import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HOST = "127.0.0.1";
const PRIVATE_SENTINEL = "http://core-r15b-private.invalid:9876";
const PUBLIC_SITE_ORIGIN = "https://public.example.test";
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const mockCore = createServer((request, response) => handleCoreRequest(request, response));
let runtime;
let runtimeOutput = "";

try {
  const corePort = await listen(mockCore);
  const runtimePort = await reservePort();
  const coreOrigin = `http://${HOST}:${corePort}`;
  const runtimeOrigin = `http://${HOST}:${runtimePort}`;
  runtime = spawn(process.execPath, [path.join(rootDirectory, ".output", "server", "index.mjs")], {
    cwd: rootDirectory,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOST,
      PORT: String(runtimePort),
      NUXT_CORE_BASE_URL: coreOrigin,
      NUXT_CORE_REQUEST_TIMEOUT_MS: "1000",
      NUXT_CORE_PRIMARY_NAVIGATION_ID: "",
      NUXT_CORE_SITE_SETTING_NAMESPACE: "",
      NUXT_CORE_SITE_SETTING_KEY: "",
      NUXT_CORE_FOUNDATION_MEDIA_ID: "",
      NUXT_PUBLIC_SITE_URL: PUBLIC_SITE_ORIGIN,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  runtime.stdout.setEncoding("utf8");
  runtime.stderr.setEncoding("utf8");
  runtime.stdout.on("data", (value) => { runtimeOutput += value; });
  runtime.stderr.on("data", (value) => { runtimeOutput += value; });

  await waitForRuntime(runtimeOrigin);
  await verifyRenderedPage(runtimeOrigin, coreOrigin);
  await verifyApplicationFailures(runtimeOrigin, coreOrigin);
  await verifyRouteRegressions(runtimeOrigin);
  await verifySitemap(runtimeOrigin, coreOrigin);
  process.stdout.write("R1.5B_PRODUCTION_SMOKE=PASS\n");
} catch (error) {
  const safeOutput = runtimeOutput
    .replaceAll(PRIVATE_SENTINEL, "[private-core-origin]")
    .replace(/http:\/\/127\.0\.0\.1:[0-9]+/gu, "[local-origin]");
  if (safeOutput.length > 0) process.stderr.write(safeOutput);
  throw error;
} finally {
  if (runtime !== undefined) await stopRuntime(runtime);
  await close(mockCore);
}

async function verifyRenderedPage(runtimeOrigin, coreOrigin) {
  const response = await fetch(`${runtimeOrigin}/`, { redirect: "manual" });
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const expected of [
    "Core-managed Site Page",
    "Typed structured content rendered through Nuxt SSR.",
    "Typed content",
    "Public media",
    "Example structured hero",
    "Example section media",
    "https://cdn.example.test/media/hero.webp",
    "https://cdn.example.test/media/section.webp",
    "<title>Core SEO Title</title>",
    "Core SEO Description",
    "index,follow",
    `${PUBLIC_SITE_ORIGIN}/`,
  ]) assert.ok(html.includes(expected), `Missing SSR evidence: ${expected}`);
  assert.equal((html.match(/<h1(?:\s|>)/gu) ?? []).length, 1);
  assert.ok((html.match(/<h2(?:\s|>)/gu) ?? []).length >= 2);
  for (const forbidden of [
    '"payload":', "revisionId", "publishedAt", "Public JSON payload", "<pre",
    coreOrigin, PRIVATE_SENTINEL,
  ]) assert.equal(html.includes(forbidden), false, `SSR leak: ${forbidden}`);
}

async function verifyApplicationFailures(runtimeOrigin, coreOrigin) {
  const expectations = [
    ["/invalid", 500, ["No title"]],
    ["/unsupported", 500, ["something.else"]],
    ["/missing-media", 500, ["asset:missing"]],
    ["/non-image", 500, ["asset:document"]],
    ["/protocol-media", 502, ["asset:protocol"]],
    ["/media-unavailable", 503, ["asset:unavailable"]],
  ];
  for (const [pathname, status, privateValues] of expectations) {
    const response = await fetch(`${runtimeOrigin}${pathname}`, { redirect: "manual" });
    assert.equal(response.status, status, pathname);
    const body = await response.text();
    for (const forbidden of [...privateValues, coreOrigin, PRIVATE_SENTINEL, "NUXT_CORE_BASE_URL"]) {
      assert.equal(body.includes(forbidden), false, `${pathname} leaked ${forbidden}`);
    }
  }
}

async function verifyRouteRegressions(runtimeOrigin) {
  for (const [pathname, status, location] of [
    ["/old", 301, "/target"],
    ["/temporary", 302, "/temporary-target"],
  ]) {
    const response = await fetch(`${runtimeOrigin}${pathname}`, { redirect: "manual" });
    assert.equal(response.status, status);
    assert.equal(response.headers.get("location"), location);
  }
  assert.equal((await fetch(`${runtimeOrigin}/missing`, { redirect: "manual" })).status, 404);
  assert.equal((await fetch(`${runtimeOrigin}/core-invalid`, { redirect: "manual" })).status, 400);
  assert.equal((await fetch(`${runtimeOrigin}/page-unavailable`, { redirect: "manual" })).status, 503);
}

async function verifySitemap(runtimeOrigin, coreOrigin) {
  const response = await fetch(`${runtimeOrigin}/sitemap.xml`);
  assert.equal(response.status, 200);
  const xml = await response.text();
  assert.ok(xml.includes(`<loc>${PUBLIC_SITE_ORIGIN}/</loc>`));
  assert.equal(xml.includes(coreOrigin), false);
  assert.equal(xml.includes(PRIVATE_SENTINEL), false);
}

function handleCoreRequest(request, response) {
  const url = new URL(request.url ?? "/", "http://mock-core.invalid");
  if (request.method !== "GET") return json(response, 405, failure("method_not_allowed"));
  if (url.pathname === "/v1/pages/resolve") return pageResponse(url.searchParams.get("path"), response);
  if (url.pathname.startsWith("/v1/media/")) {
    return mediaResponse(decodeURIComponent(url.pathname.slice("/v1/media/".length)), response);
  }
  if (url.pathname === "/v1/sitemap") {
    return json(response, 200, { data: { kind: "success", items: [{ path: "/" }] } });
  }
  return json(response, 404, failure("not_found"));
}

function pageResponse(pathname, response) {
  if (pathname === "/old") return redirect(response, 301, "/old", "/target");
  if (pathname === "/temporary") return redirect(response, 302, "/temporary", "/temporary-target");
  if (pathname === "/missing") return json(response, 404, failure("not_found"));
  if (pathname === "/core-invalid") return json(response, 400, failure("invalid_request"));
  if (pathname === "/page-unavailable") return json(response, 503, failure("service_unavailable"));

  const scenarios = {
    "/": {
      type: "site.page",
      payload: {
        eyebrow: "Structured publishing",
        title: "Core-managed Site Page",
        intro: "Typed structured content rendered through Nuxt SSR.",
        heroMedia: { assetId: "asset:hero", alt: "Example structured hero" },
        sections: [
          {
            heading: "Typed content",
            body: "This section is rendered from a validated application contract.",
          },
          {
            heading: "Public media",
            body: "Media remains resolved through Core Public HTTP.",
            media: { assetId: "asset:section", alt: "Example section media" },
          },
        ],
      },
    },
    "/invalid": { type: "site.page", payload: { intro: "No title" } },
    "/unsupported": { type: "something.else", payload: { title: "Unsupported" } },
    "/missing-media": mediaPage("asset:missing"),
    "/non-image": mediaPage("asset:document"),
    "/protocol-media": mediaPage("asset:protocol"),
    "/media-unavailable": mediaPage("asset:unavailable"),
    "/target": { type: "site.page", payload: { title: "Target" } },
    "/temporary-target": { type: "site.page", payload: { title: "Temporary target" } },
  };
  const scenario = scenarios[pathname];
  if (scenario === undefined) return json(response, 404, failure("not_found"));
  return json(response, 200, { data: publicPage(pathname, scenario.type, scenario.payload) });
}

function mediaPage(assetId) {
  return {
    type: "site.page",
    payload: { title: "Media page", heroMedia: { assetId, alt: "Application alt" } },
  };
}

function publicPage(pathname, type, payload) {
  return {
    resource: { type: "content", id: `page:${pathname}` },
    content: {
      contentId: `page:${pathname}`,
      type,
      revisionId: `revision:${pathname}:1`,
      revisionNumber: 1,
      payload,
      publishedAt: "2026-08-30T00:00:00.000Z",
    },
    seo: {
      title: pathname === "/" ? "Core SEO Title" : "Scenario SEO",
      description: pathname === "/" ? "Core SEO Description" : "Scenario description",
      canonicalPath: pathname,
      index: true,
      follow: true,
    },
  };
}

function mediaResponse(assetId, response) {
  if (assetId === "asset:missing") return json(response, 404, failure("not_found"));
  if (assetId === "asset:unavailable") return json(response, 503, failure("service_unavailable"));
  if (assetId === "asset:protocol") return json(response, 200, { data: { assetId } });
  if (assetId === "asset:document") {
    return json(response, 200, { data: publicMedia(assetId, "document", "/document.pdf") });
  }
  const filename = assetId === "asset:hero" ? "hero.webp" : "section.webp";
  return json(response, 200, { data: publicMedia(assetId, "image", `/media/${filename}`) });
}

function publicMedia(assetId, kind, pathname) {
  return {
    assetId,
    kind,
    original: {
      mimeType: kind === "image" ? "image/webp" : "application/pdf",
      format: kind === "image" ? "webp" : "pdf",
      byteSize: 1234,
      publicUrl: `https://cdn.example.test${pathname}`,
      ...(kind === "image" ? { width: 1200, height: 800, aspectRatio: 1.5 } : {}),
    },
    variants: [],
  };
}

function redirect(response, status, from, to) {
  return json(response, status, { data: { from, to, status } }, { location: to });
}

function failure(code) {
  return { error: { code, message: "Safe mock Core response." } };
}

function json(response, status, body, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

async function waitForRuntime(origin) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (runtime?.exitCode !== null) throw new Error("Production runtime exited before smoke testing.");
    try {
      const response = await fetch(`${origin}/`, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {
      // Runtime is still binding its local listener.
    }
    await delay(100);
  }
  throw new Error("Production runtime did not become ready.");
}

async function reservePort() {
  const server = createServer();
  const port = await listen(server);
  await close(server);
  return port;
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, HOST, resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Could not allocate local port.");
  return address.port;
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => {
    if (error === undefined) resolve();
    else reject(error);
  }));
}

async function stopRuntime(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  const stopped = await Promise.race([
    exited.then(() => true),
    delay(3_000).then(() => false),
  ]);
  if (!stopped && child.exitCode === null) {
    child.kill("SIGKILL");
    await exited;
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
