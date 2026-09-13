import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createMockCoreServer, createMockMediaServer } from "./mock-core.mjs";

const HOST = "127.0.0.1";
const PUBLIC_SITE_ORIGIN = "https://public.example.test";
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coreSubmissionUpstreamSecret = randomBytes(32).toString("base64url");
const movingSubmissionClientIdentitySecret = randomBytes(32).toString("base64url");
const mockMedia = createMockMediaServer();
let mockCore;
let runtime;
let runtimeOutput = "";
let expectedSocialImage;

const resourceCases = [
  ["/", "Moving handled with care, from door to door.", "A planned moving service for homes and businesses, with careful packing, coordinated transport and a clear handoff at every stage."],
  ["/about", "Explicit Core SEO title", "Explicit Core SEO description."],
  ["/services", "Practical support for every stage of a move.", "Choose a complete moving plan or focused help for a workplace transition, with clear scope and careful handling."],
  ["/services/home-moving", "A room-by-room plan for moving home.", "Coordinate packing, access, transport and placement through one clear moving sequence."],
  ["/areas", "Local moves planned around real access.", "Explore the areas we serve and the practical property, parking and timing details that can shape moving day."],
  ["/areas/north-district", "Moving support shaped around practical local access.", "Plan building entry, loading coordination and destination handoff for a move within North District."],
  ["/faq", "Clear answers before moving day.", "Understand planning, packing, access and handoff before choosing the scope of your move."],
  ["/testimonials", "What a well-planned move feels like.", "Editorial customer stories about communication, careful handling and a clear handoff."],
  ["/quote", "Tell us what needs to move and where it needs to go.", "Share the practical details your moving team needs for a useful first conversation. This is a quote request, not an instant price calculation."],
  ["/contact", "Start a straightforward conversation with the moving team.", "Use the direct details below or send a short message. For a move-specific estimate, the quote request captures the most useful planning information."],
  ["/articles/preparing-access-before-moving-day", "How to prepare access before moving day", "A practical access check helps the moving team arrive with the right plan, protect shared spaces and keep handover time under control."],
  ["/privacy", "Privacy notice for this demonstration.", "This fictional Northline Moving notice is provided only to demonstrate where deployment-specific privacy information belongs. It must be reviewed and replaced before a real site is launched."],
];

try {
  const mediaPort = await listen(mockMedia);
  expectedSocialImage = `http://${HOST}:${mediaPort}/demo-media/section.svg`;
  mockCore = createMockCoreServer({
    mediaOrigin: `http://${HOST}:${mediaPort}`,
    upstreamSecret: coreSubmissionUpstreamSecret,
    seoProjection: (pathname) => ({
      canonicalPath: pathname,
      index: true,
      follow: true,
      ...(pathname === "/about"
        ? {
            title: "Explicit Core SEO title",
            description: "Explicit Core SEO description.",
          }
        : {}),
    }),
  });
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
      NUXT_CORE_FOOTER_NAVIGATION_ID: "footer",
      NUXT_CORE_SITE_SETTING_NAMESPACE: "moving",
      NUXT_CORE_SITE_SETTING_KEY: "business",
      NUXT_MOVING_SUBMISSION_CLIENT_IDENTITY_SECRET: movingSubmissionClientIdentitySecret,
      NUXT_CORE_SUBMISSION_UPSTREAM_SECRET: coreSubmissionUpstreamSecret,
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

  for (const [route, title, description] of resourceCases) {
    const response = await fetch(`${runtimeOrigin}${route}`, { redirect: "manual" });
    assert.equal(response.status, 200, route);
    const html = await response.text();
    assertPageHead(html, {
      title,
      description,
      canonical: `${PUBLIC_SITE_ORIGIN}${route === "/" ? "/" : route}`,
    });
    assert.equal(html.includes(coreOrigin), false, `${route} leaked the private Core origin`);
  }

  const archive = await fetch(`${runtimeOrigin}/articles`, { redirect: "manual" });
  assert.equal(archive.status, 200);
  assertPageHead(await archive.text(), {
    title: "Northline moving articles and practical guides",
    description: "Buyer-managed field notes for planning a careful, well-prepared move.",
    canonical: `${PUBLIC_SITE_ORIGIN}/articles`,
  });

  const cursor = "page:/articles/preparing-access-before-moving-day";
  const cursorQuery = new URLSearchParams({ after: cursor, utm_source: "ignored", fbclid: "ignored" });
  const paginated = await fetch(`${runtimeOrigin}/articles?${cursorQuery}`, { redirect: "manual" });
  assert.equal(paginated.status, 200);
  assertPageHead(await paginated.text(), {
    title: "Northline moving articles and practical guides",
    description: "Buyer-managed field notes for planning a careful, well-prepared move.",
    canonical: `${PUBLIC_SITE_ORIGIN}/articles?after=${encodeCursor(cursor)}`,
  });

  const tracked = await fetch(`${runtimeOrigin}/about?utm_source=test&fbclid=noise`, {
    redirect: "manual",
  });
  assert.equal(tracked.status, 200);
  assertPageHead(await tracked.text(), {
    title: "Explicit Core SEO title",
    description: "Explicit Core SEO description.",
    canonical: `${PUBLIC_SITE_ORIGIN}/about`,
  });

  const robots = await fetch(`${runtimeOrigin}/robots.txt`, { redirect: "manual" });
  assert.equal(robots.status, 200);
  assert.match(robots.headers.get("content-type") ?? "", /^text\/plain\b/iu);
  assert.equal(await robots.text(), [
    "User-agent: *",
    "Disallow: /api/",
    `Sitemap: ${PUBLIC_SITE_ORIGIN}/sitemap.xml`,
    "",
  ].join("\n"));

  const missing = await fetch(`${runtimeOrigin}/does-not-exist`, {
    redirect: "manual",
    headers: { accept: "text/html" },
  });
  assert.equal(missing.status, 404);
  const missingHtml = await missing.text();
  assert.match(missingHtml, /<html\b[^>]*\blang="en"/u);
  assert.equal(tagsWithAttribute(missingHtml, "link", "rel", "canonical").length, 0);
  assert.equal(tagsWithAttributePrefix(missingHtml, "meta", "property", "og:").length, 0);
  assert.equal(tagsWithAttributePrefix(missingHtml, "meta", "name", "twitter:").length, 0);
  assert.equal(missingHtml.includes("application/ld+json"), false);
  assert.equal(missingHtml.includes(coreOrigin), false);

  const sitemap = await fetch(`${runtimeOrigin}/sitemap.xml`, { redirect: "manual" });
  assert.equal(sitemap.status, 200);
  const sitemapXml = await sitemap.text();
  assert.equal(count(sitemapXml, `<loc>${PUBLIC_SITE_ORIGIN}/articles</loc>`), 1);
  for (const route of ["/", "/about", "/services", "/areas", "/faq", "/quote", "/contact"]) {
    assert.ok(sitemapXml.includes(`<loc>${PUBLIC_SITE_ORIGIN}${route}</loc>`), route);
  }
  assert.equal(sitemapXml.includes(coreOrigin), false);

  process.stdout.write("R2.14B_SEO_RUNTIME_SMOKE=PASS\n");
} catch (error) {
  const safeOutput = runtimeOutput.replace(/http:\/\/127\.0\.0\.1:[0-9]+/gu, "[local-origin]");
  if (safeOutput.length > 0) process.stderr.write(safeOutput);
  throw error;
} finally {
  if (runtime !== undefined) await stopRuntime(runtime);
  await close(mockCore);
  await close(mockMedia);
}
process.exit(0);

function assertPageHead(html, expected) {
  assert.match(html, /<html\b[^>]*\blang="en"/u);
  const titles = [...html.matchAll(/<title>(.*?)<\/title>/gu)];
  assert.equal(titles.length, 1);
  assert.equal(titles[0]?.[1], expected.title);
  const descriptions = tagsWithAttribute(html, "meta", "name", "description");
  assert.equal(descriptions.length, 1);
  assert.equal(attribute(descriptions[0], "content"), expected.description);
  const canonicals = tagsWithAttribute(html, "link", "rel", "canonical");
  assert.equal(canonicals.length, 1);
  assert.equal(attribute(canonicals[0], "href"), expected.canonical);
  const robots = tagsWithAttribute(html, "meta", "name", "robots");
  assert.equal(robots.length, 1);
  assert.equal(attribute(robots[0], "content"), "index,follow");
  assertMeta(html, "property", "og:title", expected.title);
  assertMeta(html, "property", "og:description", expected.description);
  assertMeta(html, "property", "og:url", expected.canonical);
  assertMeta(html, "property", "og:type", "website");
  assertMeta(html, "property", "og:site_name", "Northline Moving");
  assertMeta(html, "property", "og:image", expectedSocialImage);
  assertMeta(html, "name", "twitter:card", "summary_large_image");
  assertMeta(html, "name", "twitter:title", expected.title);
  assertMeta(html, "name", "twitter:description", expected.description);
  assertMeta(html, "name", "twitter:image", expectedSocialImage);
  const jsonLdTags = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gu)];
  assert.equal(jsonLdTags.length, 1);
  const jsonLd = JSON.parse(jsonLdTags[0]?.[1] ?? "");
  assert.deepEqual(jsonLd, {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${PUBLIC_SITE_ORIGIN}/#business`,
    name: "Northline Moving",
    url: `${PUBLIC_SITE_ORIGIN}/`,
    telephone: "+1 202-555-0147",
    email: "hello@example.test",
    address: "100 Example Avenue, Northline, EX 00000",
    logo: expectedSocialImage.replace("section.svg", "logo.svg"),
    sameAs: [
      "https://example.test/northline-instagram",
      "https://example.test/northline-facebook",
    ],
  });
}

function assertMeta(html, attributeName, key, expectedValue) {
  const matches = tagsWithAttribute(html, "meta", attributeName, key);
  assert.equal(matches.length, 1, `${key} must occur exactly once`);
  assert.equal(attribute(matches[0], "content"), expectedValue, key);
}

function tagsWithAttribute(html, tag, name, value) {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gu"))]
    .map((match) => match[0])
    .filter((candidate) => attribute(candidate, name) === value);
}

function tagsWithAttributePrefix(html, tag, name, prefix) {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gu"))]
    .map((match) => match[0])
    .filter((candidate) => (attribute(candidate, name) ?? "").startsWith(prefix));
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`, "u"))?.[1];
}

function encodeCursor(cursor) {
  return new URLSearchParams({ after: cursor }).toString().slice("after=".length);
}

function count(value, needle) {
  return value.split(needle).length - 1;
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, HOST, () => {
      const address = server.address();
      if (address === null || typeof address === "string") reject(new Error("Server did not bind."));
      else resolve(address.port);
    });
  });
}

async function reservePort() {
  const server = createServer();
  const port = await listen(server);
  await close(server);
  return port;
}

async function waitForRuntime(origin) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (runtime?.exitCode !== null) throw new Error("Runtime exited before becoming ready.");
    try {
      const response = await fetch(`${origin}/`, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {
      // The local production server is still starting.
    }
    await delay(250);
  }
  throw new Error("Runtime did not become ready.");
}

function close(server) {
  if (server === undefined || !server.listening) return Promise.resolve();
  server.close();
  server.closeAllConnections?.();
  server.unref();
  return Promise.resolve();
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
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await Promise.race([exited, delay(3_000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
