import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createMockCoreServer } from "./mock-core.mjs";

const HOST = "127.0.0.1";
const PRIVATE_SENTINEL = "http://core-r16-private.invalid:9876";
const PUBLIC_SITE_ORIGIN = "https://public.example.test";
const MEDIA_ORIGIN = "https://cdn.example.test";
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mockCore = createMockCoreServer({ mediaOrigin: MEDIA_ORIGIN });
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
      NUXT_CORE_PRIMARY_NAVIGATION_ID: "primary",
      NUXT_CORE_SITE_SETTING_NAMESPACE: "site",
      NUXT_CORE_SITE_SETTING_KEY: "foundation",
      NUXT_CORE_FOUNDATION_MEDIA_ID: "asset:demo-hero",
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
  await verifySiteComposition(runtimeOrigin, coreOrigin);
  await verifyApplicationFailures(runtimeOrigin, coreOrigin);
  await verifyRouteRegressions(runtimeOrigin, coreOrigin);
  await verifySitemap(runtimeOrigin, coreOrigin);
  await verifySentinelRuntimeLeak();
  process.stdout.write("R1.6_PRODUCTION_SMOKE=PASS\n");
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
    "Core CMS Nuxt Starter",
    "A typed, server-rendered public site powered through the Core CMS Public HTTP boundary.",
    "Structured content",
    "Public media",
    "Abstract MoveCore demo hero",
    "Abstract MoveCore demo section",
    `${MEDIA_ORIGIN}/demo-media/hero.svg`,
    `${MEDIA_ORIGIN}/demo-media/section.svg`,
    "<title>MoveCore Starter Demo</title>",
    "A production-oriented Nuxt starter for Core CMS.",
    "index,follow",
    `${PUBLIC_SITE_ORIGIN}/`,
    "Home",
    "About",
  ]) assert.ok(html.includes(expected), `Missing SSR evidence: ${expected}`);
  assert.equal((html.match(/<h1(?:\s|>)/gu) ?? []).length, 1);
  assert.ok((html.match(/<h2(?:\s|>)/gu) ?? []).length >= 2);
  for (const forbidden of [
    "\"payload\":", "revisionId", "publishedAt", "Public JSON payload", "<pre",
    coreOrigin, PRIVATE_SENTINEL, "MoveCore site foundation",
  ]) assert.equal(html.includes(forbidden), false, `SSR leak: ${forbidden}`);
}

async function verifySiteComposition(runtimeOrigin, coreOrigin) {
  const response = await fetch(`${runtimeOrigin}/api/_movecore/site`);
  assert.equal(response.status, 200);
  const composition = await response.json();
  assert.equal(composition.navigation.id, "primary");
  assert.equal(composition.setting.value.name, "MoveCore Nuxt Starter");
  assert.equal(composition.media.assetId, "asset:demo-hero");
  assert.equal(JSON.stringify(composition).includes(coreOrigin), false);
}

async function verifyApplicationFailures(runtimeOrigin, coreOrigin) {
  const expectations = [
    ["/invalid", 500, "Page unavailable", ["No title"]],
    ["/unsupported", 500, "Page unavailable", ["something.else"]],
    ["/missing-media", 500, "Page unavailable", ["asset:missing"]],
    ["/non-image", 500, "Page unavailable", ["asset:document"]],
    ["/protocol-media", 502, "Upstream response unavailable", ["asset:protocol"]],
    ["/media-unavailable", 503, "Service temporarily unavailable", ["asset:unavailable"]],
  ];
  for (const [pathname, status, heading, privateValues] of expectations) {
    const response = await fetch(`${runtimeOrigin}${pathname}`, {
      redirect: "manual",
      headers: { accept: "text/html" },
    });
    assert.equal(response.status, status, pathname);
    const body = await response.text();
    assert.ok(body.includes(heading), `${pathname} did not render its safe error heading`);
    assert.ok(body.includes("Return to home"), `${pathname} omitted recovery action`);
    for (const forbidden of [...privateValues, coreOrigin, PRIVATE_SENTINEL, "NUXT_CORE_BASE_URL", "stack"]) {
      assert.equal(body.includes(forbidden), false, `${pathname} leaked ${forbidden}`);
    }
  }
}

async function verifyRouteRegressions(runtimeOrigin, coreOrigin) {
  for (const [pathname, status] of [["/old", 301], ["/temporary", 302]]) {
    const response = await fetch(`${runtimeOrigin}${pathname}`, {
      redirect: "manual",
      headers: { accept: "text/html" },
    });
    assert.equal(response.status, status);
    assert.equal(response.headers.get("location"), "/about");
  }
  for (const [pathname, status, heading] of [
    ["/missing", 404, "Page not found"],
    ["/core-invalid", 400, "Invalid request"],
    ["/page-unavailable", 503, "Service temporarily unavailable"],
  ]) {
    const response = await fetch(`${runtimeOrigin}${pathname}`, {
      redirect: "manual",
      headers: { accept: "text/html" },
    });
    assert.equal(response.status, status);
    const body = await response.text();
    assert.ok(body.includes(heading));
    assert.equal(body.includes(coreOrigin), false);
  }
}

async function verifySitemap(runtimeOrigin, coreOrigin) {
  const response = await fetch(`${runtimeOrigin}/sitemap.xml`);
  assert.equal(response.status, 200);
  const xml = await response.text();
  assert.ok(xml.includes(`<loc>${PUBLIC_SITE_ORIGIN}/</loc>`));
  assert.ok(xml.includes(`<loc>${PUBLIC_SITE_ORIGIN}/about</loc>`));
  assert.equal(xml.includes(coreOrigin), false);
  assert.equal(xml.includes(PRIVATE_SENTINEL), false);
}

async function verifySentinelRuntimeLeak() {
  const port = await reservePort();
  const origin = `http://${HOST}:${port}`;
  const child = spawn(process.execPath, [path.join(rootDirectory, ".output", "server", "index.mjs")], {
    cwd: rootDirectory,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOST,
      PORT: String(port),
      NUXT_CORE_BASE_URL: PRIVATE_SENTINEL,
      NUXT_CORE_REQUEST_TIMEOUT_MS: "500",
      NUXT_CORE_PRIMARY_NAVIGATION_ID: "",
      NUXT_CORE_SITE_SETTING_NAMESPACE: "",
      NUXT_CORE_SITE_SETTING_KEY: "",
      NUXT_CORE_FOUNDATION_MEDIA_ID: "",
      NUXT_PUBLIC_SITE_URL: PUBLIC_SITE_ORIGIN,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout.resume();
  child.stderr.resume();
  try {
    await waitForChildRuntime(child, origin);
    for (const pathname of ["/", "/sitemap.xml"]) {
      const response = await fetch(`${origin}${pathname}`, { headers: { accept: "text/html" } });
      assert.equal(response.status, 503, pathname);
      const body = await response.text();
      for (const forbidden of [PRIVATE_SENTINEL, "core-r16-private.invalid", "NUXT_CORE_BASE_URL"]) {
        assert.equal(body.includes(forbidden), false, `${pathname} leaked private runtime configuration`);
      }
    }
  } finally {
    await stopRuntime(child);
  }
}

async function waitForRuntime(origin) {
  return waitForChildRuntime(runtime, origin);
}

async function waitForChildRuntime(child, origin) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child?.exitCode !== null) throw new Error("Production runtime exited before smoke testing.");
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
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function stopRuntime(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  const stopped = await Promise.race([exited.then(() => true), delay(3_000).then(() => false)]);
  if (!stopped && child.exitCode === null) {
    child.kill("SIGKILL");
    await exited;
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
