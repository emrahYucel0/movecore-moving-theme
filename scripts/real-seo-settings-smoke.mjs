import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HOST = "127.0.0.1";
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coreOrigin = required("R214D_CORE_ORIGIN");
const adminOrigin = required("R214D_ADMIN_ORIGIN");
const loginIdentifier = required("R214D_ADMIN_LOGIN");
const password = required("R214D_ADMIN_PASSWORD");
const upstreamSecret = required("R214D_SUBMISSION_SECRET");
const identitySecret = required("R214D_IDENTITY_SECRET");
let runtime;
let runtimeOutput = "";

try {
  const live = await fetch(`${coreOrigin}/health/live`);
  const ready = await fetch(`${coreOrigin}/health/ready`);
  assert.equal(live.status, 200);
  assert.equal(ready.status, 200);

  const login = await fetch(`${coreOrigin}/admin/api/v1/auth/login`, {
    method: "POST",
    headers: { origin: adminOrigin, "content-type": "application/json" },
    body: JSON.stringify({ loginIdentifier, password }),
  });
  assert.equal(login.status, 200);
  const loginBody = await responseData(login);
  const csrf = loginBody.csrfToken;
  assert.match(csrf, /^[A-Za-z0-9_-]{43}$/u);
  const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(cookie);

  const adminHeaders = { origin: adminOrigin, cookie };
  const unsafeHeaders = { ...adminHeaders, "x-csrf-token": csrf, "content-type": "application/json" };
  assert.equal((await fetch(`${coreOrigin}/admin/api/v1/auth/me`, { headers: adminHeaders })).status, 200);

  let setting = await adminData("/settings/moving/business", adminHeaders);
  assert.equal(setting.editorProfile.label, "Business details");
  const fields = setting.editorProfile.groups.flatMap((group) => group.fields);
  for (const path of ["articleArchiveSeoTitle", "articleArchiveSeoDescription", "defaultSocialImageAssetId"])
    assert.ok(fields.some((field) => field.path === path), path);
  assert.equal(fields.find((field) => field.path === "defaultSocialImageAssetId").kind, "media");

  const wrongOrigin = await fetch(`${coreOrigin}/admin/api/v1/settings/moving/business`, {
    method: "PATCH",
    headers: { ...unsafeHeaders, origin: "https://evil.example.test" },
    body: JSON.stringify({ expectedVersion: setting.version, value: setting.value }),
  });
  assert.equal(wrongOrigin.status, 403);

  for (const navigationId of ["primary", "footer"]) {
    const response = await fetch(`${coreOrigin}/admin/api/v1/navigation`, {
      method: "POST",
      headers: unsafeHeaders,
      body: JSON.stringify({ navigationId }),
    });
    assert.ok([201, 409].includes(response.status), navigationId);
  }

  const runtimePort = await reservePort();
  const runtimeOrigin = `http://${HOST}:${runtimePort}`;
  runtime = spawn(process.execPath, [path.join(rootDirectory, ".output", "server", "index.mjs")], {
    cwd: rootDirectory,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOST,
      PORT: String(runtimePort),
      NUXT_CORE_BASE_URL: coreOrigin,
      NUXT_CORE_REQUEST_TIMEOUT_MS: "3000",
      NUXT_CORE_PRIMARY_NAVIGATION_ID: "primary",
      NUXT_CORE_FOOTER_NAVIGATION_ID: "footer",
      NUXT_CORE_SITE_SETTING_NAMESPACE: "moving",
      NUXT_CORE_SITE_SETTING_KEY: "business",
      NUXT_MOVING_SUBMISSION_CLIENT_IDENTITY_SECRET: identitySecret,
      NUXT_CORE_SUBMISSION_UPSTREAM_SECRET: upstreamSecret,
      NUXT_PUBLIC_SITE_URL: runtimeOrigin,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  runtime.stdout.setEncoding("utf8");
  runtime.stderr.setEncoding("utf8");
  runtime.stdout.on("data", (value) => { runtimeOutput += value; });
  runtime.stderr.on("data", (value) => { runtimeOutput += value; });
  await waitForRuntime(runtimeOrigin);

  const defaultHead = await articleHead(runtimeOrigin);
  assertMeta(defaultHead, "name", "twitter:card", "summary");
  assertNoMeta(defaultHead, "property", "og:image");
  assertNoMeta(defaultHead, "name", "twitter:image");

  setting = await updateSetting(setting, {
    ...setting.value,
    companyName: "Buyer Managed Moving",
    articleArchiveSeoTitle: "  Buyer   managed articles  ",
    articleArchiveSeoDescription: " Buyer-managed\n guidance for a considered move. ",
  }, unsafeHeaders);
  let html = await articleHead(runtimeOrigin);
  assertHead(html, {
    title: "Buyer managed articles",
    description: "Buyer-managed guidance for a considered move.",
    canonical: `${runtimeOrigin}/articles`,
    siteName: "Buyer Managed Moving",
    card: "summary",
  });
  assert.equal((await publicSetting()).value.articleArchiveSeoTitle, "  Buyer   managed articles  ");
  assert.equal(structuredData(html).name, "Buyer Managed Moving");

  const first = await uploadImage("first.png", 1200, 630, unsafeHeaders, adminHeaders);
  setting = await updateSetting(setting, { ...setting.value, defaultSocialImageAssetId: first.assetId }, unsafeHeaders);
  html = await articleHead(runtimeOrigin);
  assertHead(html, {
    title: "Buyer managed articles",
    description: "Buyer-managed guidance for a considered move.",
    canonical: `${runtimeOrigin}/articles`,
    siteName: "Buyer Managed Moving",
    card: "summary_large_image",
    image: first.original.publicUrl,
  });
  assert.equal((await fetch(first.original.publicUrl)).status, 200);
  assert.equal(first.original.publicUrl.includes(coreOrigin), false);

  const second = await uploadImage("second.png", 1600, 900, unsafeHeaders, adminHeaders);
  setting = await updateSetting(setting, { ...setting.value, defaultSocialImageAssetId: second.assetId }, unsafeHeaders);
  html = await articleHead(runtimeOrigin);
  assertMeta(html, "property", "og:image", second.original.publicUrl);
  assertMeta(html, "name", "twitter:image", second.original.publicUrl);
  assert.equal(html.includes(first.original.publicUrl), false);

  const withoutImage = { ...setting.value };
  delete withoutImage.defaultSocialImageAssetId;
  setting = await updateSetting(setting, withoutImage, unsafeHeaders);
  html = await articleHead(runtimeOrigin);
  assertMeta(html, "name", "twitter:card", "summary");
  assertNoMeta(html, "property", "og:image");
  assertNoMeta(html, "name", "twitter:image");

  const invalid = await fetch(`${coreOrigin}/admin/api/v1/settings/moving/business`, {
    method: "PATCH",
    headers: unsafeHeaders,
    body: JSON.stringify({
      expectedVersion: setting.version,
      value: { ...setting.value, articleArchiveSeoTitle: "x".repeat(161) },
    }),
  });
  assert.equal(invalid.status, 422);
  const afterInvalid = await adminData("/settings/moving/business", adminHeaders);
  assert.equal(afterInvalid.version, setting.version);
  assert.deepEqual(afterInvalid.value, setting.value);

  const hostileName = '</script><script>alert("x")</script> & <Moving>';
  setting = await updateSetting(setting, { ...setting.value, companyName: hostileName }, unsafeHeaders);
  html = await articleHead(runtimeOrigin);
  assert.equal(countStartTags(html, "script"), 1);
  const hostileJsonLd = jsonLdSource(html);
  assert.equal(hostileJsonLd.includes("</script>"), false);
  assert.equal(hostileJsonLd.includes("<script>"), false);
  assert.equal(structuredData(html).name, hostileName);

  setting = await updateSetting(setting, { ...setting.value, companyName: "Buyer Managed Moving" }, unsafeHeaders);
  html = await articleHead(runtimeOrigin);
  assert.equal(structuredData(html).name, "Buyer Managed Moving");

  const paginated = await fetch(`${runtimeOrigin}/articles?after=content%3Aarticle-1&utm_source=noise`);
  assert.equal(paginated.status, 200);
  const paginatedHtml = await paginated.text();
  const canonical = `${runtimeOrigin}/articles?after=content%3Aarticle-1`;
  assertLink(paginatedHtml, "canonical", canonical);
  assertMeta(paginatedHtml, "property", "og:url", canonical);
  assert.equal(paginatedHtml.includes("utm_source"), false);

  const publicProjection = await publicSetting();
  assert.equal(publicProjection.exposure, undefined);
  assert.equal(publicProjection.value.companyName, "Buyer Managed Moving");
  assert.equal(JSON.stringify(publicProjection).includes("editorProfile"), false);

  process.stdout.write(JSON.stringify({
    status: "PASS",
    mysql: "8.x disposable",
    coreHealth: { live: 200, ready: 200 },
    migrations: 10,
    authSession: "PASS",
    csrfOrigin: "PASS",
    typedSettingsProfile: "PASS",
    mediaRoundTrip: "PASS",
    publicSettings: "PASS",
    productionSsr: "PASS",
    noImageFallback: "PASS",
    mutationPersistence: "PASS",
    validationRollback: "PASS",
    injectionSafety: "PASS",
  }) + "\n");
} catch (error) {
  if (runtimeOutput.length > 0) process.stderr.write(runtimeOutput.replace(/http:\/\/127\.0\.0\.1:[0-9]+/gu, "[local-origin]"));
  throw error;
} finally {
  if (runtime !== undefined) await stopRuntime(runtime);
}
process.exit(0);

async function publicSetting() {
  const response = await fetch(`${coreOrigin}/v1/settings/moving/business`);
  assert.equal(response.status, 200);
  return responseData(response);
}

async function adminData(pathname, headers) {
  const response = await fetch(`${coreOrigin}/admin/api/v1${pathname}`, { headers });
  assert.equal(response.status, 200, pathname);
  return responseData(response);
}

async function updateSetting(current, value, headers) {
  const response = await fetch(`${coreOrigin}/admin/api/v1/settings/moving/business`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ expectedVersion: current.version, value }),
  });
  assert.equal(response.status, 200);
  const result = await responseData(response);
  const reloaded = await adminData("/settings/moving/business", {
    origin: adminOrigin,
    cookie: headers.cookie,
  });
  assert.equal(reloaded.version, result.version);
  return reloaded;
}

async function uploadImage(filename, width, height, unsafeHeaders, adminHeaders) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  const form = new FormData();
  form.set("profileId", "original");
  form.set("file", new File([bytes], filename, { type: "image/png" }));
  const headers = { ...unsafeHeaders };
  delete headers["content-type"];
  const response = await fetch(`${coreOrigin}/admin/api/v1/media/ingestions`, {
    method: "POST",
    headers,
    body: form,
  });
  assert.equal(response.status, 202);
  const location = response.headers.get("location");
  assert.ok(location);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const current = await adminData(location.replace("/admin/api/v1", ""), adminHeaders);
    if (current.state === "completed") return current.asset;
    if (current.state === "failed") throw new Error("Media ingestion failed.");
    await delay(50);
  }
  throw new Error("Media ingestion did not complete.");
}

async function articleHead(runtimeOrigin) {
  const response = await fetch(`${runtimeOrigin}/articles`, { redirect: "manual" });
  assert.equal(response.status, 200);
  return response.text();
}

function assertHead(html, expected) {
  const titles = [...html.matchAll(/<title>(.*?)<\/title>/gu)];
  assert.equal(titles.length, 1);
  assert.equal(titles[0]?.[1], expected.title);
  assertMeta(html, "name", "description", expected.description);
  assertLink(html, "canonical", expected.canonical);
  assertMeta(html, "name", "robots", "index,follow");
  assertMeta(html, "property", "og:title", expected.title);
  assertMeta(html, "property", "og:description", expected.description);
  assertMeta(html, "property", "og:url", expected.canonical);
  assertMeta(html, "property", "og:type", "website");
  assertMeta(html, "property", "og:site_name", expected.siteName);
  assertMeta(html, "name", "twitter:card", expected.card);
  assertMeta(html, "name", "twitter:title", expected.title);
  assertMeta(html, "name", "twitter:description", expected.description);
  if (expected.image === undefined) {
    assertNoMeta(html, "property", "og:image");
    assertNoMeta(html, "name", "twitter:image");
  } else {
    assertMeta(html, "property", "og:image", expected.image);
    assertMeta(html, "name", "twitter:image", expected.image);
  }
}

function structuredData(html) {
  return JSON.parse(jsonLdSource(html));
}

function jsonLdSource(html) {
  const matches = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gu)];
  assert.equal(matches.length, 1);
  return matches[0]?.[1] ?? "";
}

function countStartTags(html, expectedName) {
  let count = 0;
  for (let index = 0; index < html.length; index += 1) {
    if (html[index] !== "<") continue;
    let quote;
    let end = index + 1;
    for (; end < html.length; end += 1) {
      const character = html[end];
      if (quote === undefined && (character === '"' || character === "'")) quote = character;
      else if (quote === character) quote = undefined;
      else if (quote === undefined && character === ">") break;
    }
    const startTag = html.slice(index + 1, end).trimStart();
    if (new RegExp(`^${expectedName}(?:\\s|$)`, "iu").test(startTag)) count += 1;
    index = end;
  }
  return count;
}

function assertMeta(html, attributeName, key, expected) {
  const tags = tagsWithAttribute(html, "meta", attributeName, key);
  assert.equal(tags.length, 1, key);
  assert.equal(attribute(tags[0], "content"), expected, key);
}

function assertNoMeta(html, attributeName, key) {
  assert.equal(tagsWithAttribute(html, "meta", attributeName, key).length, 0, key);
}

function assertLink(html, rel, expected) {
  const tags = tagsWithAttribute(html, "link", "rel", rel);
  assert.equal(tags.length, 1, rel);
  assert.equal(attribute(tags[0], "href"), expected, rel);
}

function tagsWithAttribute(html, tag, name, value) {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gu"))]
    .map((match) => match[0])
    .filter((candidate) => attribute(candidate, name) === value);
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`, "u"))?.[1];
}

async function responseData(response) {
  const body = await response.json();
  assert.ok(body && typeof body === "object" && body.data && typeof body.data === "object");
  return body.data;
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, HOST, resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Could not reserve port.");
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function waitForRuntime(origin) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (runtime?.exitCode !== null) throw new Error("Moving runtime exited early.");
    try {
      const response = await fetch(`${origin}/articles`);
      if (response.status === 200) return;
    } catch {
      // Still binding.
    }
    await delay(100);
  }
  throw new Error("Moving runtime did not become ready.");
}

async function stopRuntime(child) {
  if (child.exitCode !== null) return;
  if (process.platform === "win32") {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      killer.once("error", resolve);
      killer.once("exit", resolve);
    });
    await Promise.race([exited, delay(3_000)]);
    child.stdout?.destroy();
    child.stderr?.destroy();
    return;
  }
  child.kill("SIGTERM");
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
