import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createMockCoreServer } from "./mock-core.mjs";

const HOST = "127.0.0.1";
const PRIVATE_SENTINEL = "http://core-r25-private.invalid:9876";
const PUBLIC_SITE_ORIGIN = "https://public.example.test";
const MEDIA_ORIGIN = "https://cdn.example.test";
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coreSubmissionUpstreamSecret = randomBytes(32).toString("base64url");
const movingSubmissionClientIdentitySecret = randomBytes(32).toString("base64url");
const mockSubmissions = [];
const mockSubmissionEvents = [];
const submissionControl = { mode: undefined };
const mockCore = createMockCoreServer({
  mediaOrigin: MEDIA_ORIGIN,
  upstreamSecret: coreSubmissionUpstreamSecret,
  submissions: mockSubmissions,
  submissionEvents: mockSubmissionEvents,
  submissionControl,
});
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
      NUXT_CORE_FOOTER_NAVIGATION_ID: "footer",
      NUXT_CORE_SITE_SETTING_NAMESPACE: "moving",
      NUXT_CORE_SITE_SETTING_KEY: "business",
      NUXT_MOVING_SUBMISSION_CLIENT_IDENTITY_SECRET: movingSubmissionClientIdentitySecret,
      NUXT_CORE_SUBMISSION_UPSTREAM_SECRET: coreSubmissionUpstreamSecret,
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
  await verifyRenderedPage(runtimeOrigin, coreOrigin);
  await verifyInnerPages(runtimeOrigin, coreOrigin);
  await verifyArticles(runtimeOrigin, coreOrigin);
  await verifyConversionPages(runtimeOrigin, coreOrigin);
  await verifySubmissionBoundary(runtimeOrigin);
  await verifySiteComposition(runtimeOrigin, coreOrigin);
  await verifyApplicationFailures(runtimeOrigin, coreOrigin);
  await verifyRouteRegressions(runtimeOrigin, coreOrigin);
  await verifySitemap(runtimeOrigin, coreOrigin);
  await verifySentinelRuntimeLeak();
  process.stdout.write("R2.5_PRODUCTION_SMOKE=PASS\n");
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
    "Moving handled with care, from door to door.",
    "A planned moving service for homes and businesses",
    "Planned",
    "At each handoff",
    "The right help for the work ahead.",
    "Home moving",
    "Office relocation",
    "Know what happens next.",
    "Prepare",
    "Care is part of the process.",
    "Clear arrival windows",
    "Moving support shaped around local access.",
    "North District",
    "A calm move is built before moving day.",
    "Questions worth answering early.",
    "Start with a clear moving plan.",
    "Plan your move",
    "Call the team",
    'href="/about"',
    'href="tel:+12025550147"',
    "Care at every handoff",
    "Illustrated moving truck beside stacked packing boxes",
    "Illustrated hands carefully passing a packed box",
    `${MEDIA_ORIGIN}/demo-media/hero.svg`,
    `${MEDIA_ORIGIN}/demo-media/section.svg`,
    `${MEDIA_ORIGIN}/demo-media/logo.svg`,
    "<title>Northline Moving | Moving with a clear plan</title>",
    "Professional packing, transport and placement for carefully planned residential and commercial moves.",
    "index,follow",
    `${runtimeOrigin}/`,
    "Home",
    "About",
    "+1 202-555-0147",
    "Message on WhatsApp",
    "hello@example.test",
    "100 Example Avenue, Northline, EX 00000",
    "Monday to Friday",
    "Instagram",
    "Footer navigation",
  ]) assert.ok(html.includes(expected), `Missing SSR evidence: ${expected}`);
  assert.equal((html.match(/<h1(?:\s|>)/gu) ?? []).length, 1);
  assert.ok((html.match(/<h2(?:\s|>)/gu) ?? []).length >= 5);
  for (const forbidden of [
    "\"payload\":", "revisionId", "publishedAt", "Public JSON payload", "<pre",
    coreOrigin, PRIVATE_SENTINEL, "MoveCore site foundation", "fictional demo", "CMS relation",
  ]) assert.equal(html.includes(forbidden), false, `SSR leak: ${forbidden}`);

  const aboutResponse = await fetch(`${runtimeOrigin}/about`, { redirect: "manual" });
  assert.equal(aboutResponse.status, 200);
  const aboutHtml = await aboutResponse.text();
  for (const expected of [
    "A clear plan for the work between homes.",
    "Built around careful handling",
    "<title>About Northline Moving</title>",
  ]) assert.ok(aboutHtml.includes(expected), `Missing /about SSR evidence: ${expected}`);
  assert.equal((aboutHtml.match(/<h1(?:\s|>)/gu) ?? []).length, 1);
  assert.equal(aboutHtml.includes("moving.home"), false);
}

async function verifySiteComposition(runtimeOrigin, coreOrigin) {
  const response = await fetch(`${runtimeOrigin}/api/_movecore/site`);
  assert.equal(response.status, 200);
  const composition = await response.json();
  assert.equal(composition.navigation.id, "primary");
  assert.equal(composition.footerNavigation.id, "footer");
  assert.equal(composition.business.companyName, "Northline Moving");
  assert.equal(composition.business.primaryPhone.href, "tel:+12025550147");
  assert.equal(composition.business.logo.assetId, "asset:demo-logo");
  assert.equal(composition.business.logo.publicUrl, `${MEDIA_ORIGIN}/demo-media/logo.svg`);
  assert.equal(JSON.stringify(composition).includes(coreOrigin), false);
  assert.equal(JSON.stringify(composition).includes("namespace"), false);
  assert.equal(JSON.stringify(composition).includes("logoAssetId"), false);
}

async function verifyInnerPages(runtimeOrigin, coreOrigin) {
  const expectations = [
    [
      "/services",
      [
        "Practical support for every stage of a move.",
        "A focused service portfolio.",
        "Home moving",
        "Office relocation",
        "The right scope before moving day.",
        "Moving Services | Northline Moving",
        `${MEDIA_ORIGIN}/demo-media/hero.svg`,
      ],
      3,
    ],
    [
      "/services/home-moving",
      [
        "A room-by-room plan for moving home.",
        "Keep every handoff understandable.",
        "What the moving plan can include.",
        "A practical sequence from plan to placement.",
        "Continue planning the right service.",
        "Build a clear plan for moving day.",
        "Home Moving Service | Northline Moving",
        `${MEDIA_ORIGIN}/demo-media/hero.svg`,
      ],
      5,
    ],
    [
      "/services/office-relocation",
      [
        "A structured handoff for moving workplaces.",
        "Protect continuity through a clear sequence.",
        "What the relocation plan can include.",
        "Plan a clear workplace handoff.",
        "Office Relocation Service | Northline Moving",
      ],
      5,
    ],
    [
      "/areas",
      [
        "Local moves planned around real access.",
        "Where we work.",
        "North District",
        "Riverside",
        "Useful local detail, not a city directory.",
        "Service Areas | Northline Moving",
      ],
      3,
    ],
    [
      "/areas/north-district",
      [
        "Moving support shaped around practical local access.",
        "Start with the conditions at both addresses.",
        "Choose a service around the move itself.",
        "Operational details worth resolving early.",
        "Explore nearby moving pages.",
        "Connect the addresses to one clear sequence.",
        "North District Moving Support | Northline Moving",
        `${MEDIA_ORIGIN}/demo-media/section.svg`,
      ],
      5,
    ],
    [
      "/areas/riverside",
      [
        "Plan a Riverside move around access and handoff.",
        "Make the route into each property explicit.",
        "Resolve Riverside access details before arrival.",
        "Riverside Moving Support | Northline Moving",
      ],
      5,
    ],
    [
      "/faq",
      [
        "Clear answers before moving day.",
        "Questions and practical answers",
        "How early should we start planning?",
        "What happens if access changes?",
        "Moving Questions | Northline Moving",
      ],
      2,
    ],
    [
      "/testimonials",
      [
        "What a well-planned move feels like.",
        "Moving experiences in their own words",
        "The Rivera household",
        "Hartwell Studio team",
        "Customer Experiences | Northline Moving",
      ],
      2,
    ],
  ];
  for (const [pathname, evidence, minimumH2] of expectations) {
    const response = await fetch(`${runtimeOrigin}${pathname}`, { redirect: "manual" });
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    for (const expected of evidence) {
      assert.ok(html.includes(expected), `${pathname} missing SSR evidence: ${expected}`);
    }
    assert.equal((html.match(/<h1(?:\s|>)/gu) ?? []).length, 1, pathname);
    assert.ok((html.match(/<h2(?:\s|>)/gu) ?? []).length >= minimumH2, pathname);
    for (const forbidden of [coreOrigin, PRIVATE_SENTINEL, "revisionId", "publishedAt", "\"payload\":"]) {
      assert.equal(html.includes(forbidden), false, `${pathname} leaked ${forbidden}`);
    }
  }
}

async function verifyConversionPages(runtimeOrigin, coreOrigin) {
  for (const [pathname, evidence] of [
    ["/quote", [
      "Tell us what needs to move and where it needs to go.",
      "Share the useful details.",
      'action="/api/moving/quote"',
      'name="requestToken"',
      'name="privacyAcknowledged"',
      "This is a quote request, not an instant price calculation.",
    ]],
    ["/contact", [
      "Start a straightforward conversation with the moving team.",
      "Speak with the team directly.",
      'action="/api/moving/contact"',
      "+1 202-555-0147",
      "hello@example.test",
      "Provide at least one contact method",
    ]],
    ["/privacy", [
      "Privacy notice for this demonstration.",
      "must be reviewed and replaced",
      "This reference content is not legal advice",
    ]],
  ]) {
    const response = await fetch(`${runtimeOrigin}${pathname}`, { redirect: "manual" });
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    for (const expected of evidence) assert.ok(html.includes(expected), `${pathname}: ${expected}`);
    assert.equal((html.match(/<h1(?:\s|>)/gu) ?? []).length, 1, pathname);
    for (const forbidden of [coreOrigin, "Core-Submission-Signature", "revisionId", "\"payload\":", "<script"]) {
      assert.equal(html.includes(forbidden), false, `${pathname} leaked ${forbidden}`);
    }
  }
}

async function verifyArticles(runtimeOrigin, coreOrigin) {
  const archiveResponse = await fetch(`${runtimeOrigin}/articles`, { redirect: "manual" });
  assert.equal(archiveResponse.status, 200);
  const archiveHtml = await archiveResponse.text();
  for (const expected of [
    "Useful thinking before moving day.",
    "How to prepare access before moving day",
    "A practical packing timeline",
    "What changes when moving an office",
    `href="${runtimeOrigin}/articles"`,
  ]) assert.ok(archiveHtml.includes(expected), `/articles missing SSR evidence: ${expected}`);
  assert.equal((archiveHtml.match(/<h1(?:\s|>)/gu) ?? []).length, 1);
  assert.equal(archiveHtml.includes("<script"), false);

  const detailPath = "/articles/preparing-access-before-moving-day";
  const detailResponse = await fetch(`${runtimeOrigin}${detailPath}`, { redirect: "manual" });
  assert.equal(detailResponse.status, 200);
  const detailHtml = await detailResponse.text();
  for (const expected of [
    "How to prepare access before moving day",
    "Walk the route before the van arrives",
    "Reserve the parts you can control",
    "30 August 2026",
    `<link rel="canonical" href="${runtimeOrigin}${detailPath}">`,
  ]) assert.ok(detailHtml.includes(expected), `${detailPath} missing SSR evidence: ${expected}`);
  assert.equal((detailHtml.match(/<h1(?:\s|>)/gu) ?? []).length, 1);
  assert.equal(detailHtml.includes("<script"), false);
  for (const forbidden of [coreOrigin, PRIVATE_SENTINEL, "revisionId", '"payload":']) {
    assert.equal(archiveHtml.includes(forbidden), false, `/articles leaked ${forbidden}`);
    assert.equal(detailHtml.includes(forbidden), false, `${detailPath} leaked ${forbidden}`);
  }
}

async function verifySubmissionBoundary(runtimeOrigin) {
  const quotePage = await loadForm(runtimeOrigin, "/quote");
  for (const endpoint of ["/api/moving/quote", "/api/moving/contact"]) {
    for (const method of ["GET", "PUT"]) {
      const wrongMethod = await fetch(`${runtimeOrigin}${endpoint}`, {
        method,
        redirect: "manual",
      });
      assert.equal(wrongMethod.status, 405);
      assert.equal(wrongMethod.headers.get("allow"), "POST");
    }
  }
  const quoteBody = new URLSearchParams({
    requestToken: quotePage.token,
    name: "Jamie Rivera",
    phone: "+1 (202) 555-0199",
    email: "jamie@example.test",
    origin: "12 Example Street",
    destination: "84 Sample Avenue",
    preferredDate: "2026-10-12",
    moveType: "home",
    propertySize: "two-three-bedrooms",
    message: "A lift is available at the destination.",
    privacyAcknowledged: "true",
  });
  quoteBody.append("requestedServices", "packing");
  quoteBody.append("requestedServices", "special-handling");
  const quoteResponse = await postForm(runtimeOrigin, "/api/moving/quote", quotePage.cookie, quoteBody, {
    "core-submission-client": "browser-spoof",
    "core-submission-timestamp": "1",
    "core-submission-signature": "v1=browser-spoof",
  });
  assert.equal(quoteResponse.status, 303);
  assert.equal(quoteResponse.headers.get("location"), "/quote?submitted=1");
  assert.equal(mockSubmissions.length, 1);
  assert.deepEqual(mockSubmissions[0].payload, {
    schemaVersion: 1,
    customer: { name: "Jamie Rivera", phone: "+1 (202) 555-0199", email: "jamie@example.test" },
    move: {
      origin: "12 Example Street", destination: "84 Sample Avenue", preferredDate: "2026-10-12",
      moveType: "home", propertySize: "two-three-bedrooms",
    },
    requestedServices: ["packing", "special-handling"],
    message: "A lift is available at the destination.",
    privacyAcknowledged: true,
  });
  assert.match(mockSubmissions[0].client, /^[A-Za-z0-9_-]{43}$/u);
  assert.equal(mockSubmissions[0].client.includes("Jamie"), false);

  const replay = await postForm(runtimeOrigin, "/api/moving/quote", quotePage.cookie, quoteBody);
  assert.equal(replay.status, 303);
  assert.equal(mockSubmissions.length, 1);
  assert.deepEqual(mockSubmissionEvents.slice(0, 2), [
    { type: "moving.quote-request", replayed: false },
    { type: "moving.quote-request", replayed: true },
  ]);

  const success = await fetch(`${runtimeOrigin}/quote?submitted=1`, {
    headers: { cookie: quotePage.cookie },
  });
  const successHtml = await success.text();
  assert.ok(successHtml.includes("Your moving details have been sent."));
  assert.equal(successHtml.includes('action="/api/moving/quote"'), false);

  const contactPage = await loadForm(runtimeOrigin, "/contact");
  const contactBody = new URLSearchParams({
    requestToken: contactPage.token,
    name: "Morgan Lee",
    email: "morgan@example.test",
    subject: "Access question",
    message: "Can your team work with a timed loading bay?",
    privacyAcknowledged: "true",
  });
  const contactResponse = await postForm(
    runtimeOrigin, "/api/moving/contact", contactPage.cookie, contactBody,
  );
  assert.equal(contactResponse.status, 303);
  assert.equal(contactResponse.headers.get("location"), "/contact?submitted=1");
  assert.equal(mockSubmissions.length, 2);
  assert.equal(mockSubmissions[1].type, "moving.contact-request");
  assert.notEqual(mockSubmissions[0].client, mockSubmissions[1].client);

  const invalidPage = await loadForm(runtimeOrigin, "/contact", quotePage.cookie);
  const invalid = await postForm(runtimeOrigin, "/api/moving/contact", quotePage.cookie, new URLSearchParams({
    requestToken: invalidPage.token,
    name: "No Contact",
    message: "No reply method",
    privacyAcknowledged: "true",
  }));
  assert.equal(invalid.status, 303);
  assert.equal(invalid.headers.get("location"), "/contact?status=invalid");
  assert.equal(mockSubmissions.length, 2);

  const wrongOrigin = await fetch(`${runtimeOrigin}/api/moving/contact`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://evil.example.test",
      cookie: quotePage.cookie,
    },
    body: contactBody,
  });
  assert.equal(wrongOrigin.status, 403);
  const wrongType = await fetch(`${runtimeOrigin}/api/moving/contact`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/json", origin: runtimeOrigin, cookie: quotePage.cookie },
    body: "{}",
  });
  assert.equal(wrongType.status, 415);

  for (const [mode, expected] of [
    ["rate-limited", "/quote?status=rate-limited"],
    ["unavailable", "/quote?status=unavailable"],
    ["authentication-failed", "/quote?status=unavailable"],
  ]) {
    submissionControl.mode = mode;
    const page = await loadForm(runtimeOrigin, "/quote", quotePage.cookie);
    quoteBody.set("requestToken", page.token);
    const response = await postForm(runtimeOrigin, "/api/moving/quote", quotePage.cookie, quoteBody);
    assert.equal(response.status, 303, mode);
    assert.equal(response.headers.get("location"), expected, mode);
  }
  submissionControl.mode = undefined;
  assert.equal(mockSubmissions.length, 2);
}

async function loadForm(runtimeOrigin, pathname, existingCookie) {
  const response = await fetch(`${runtimeOrigin}${pathname}`, {
    headers: existingCookie === undefined ? {} : { cookie: existingCookie },
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  const match = /<input[^>]+name="requestToken"[^>]+value="([A-Za-z0-9_-]{43})"/u.exec(html);
  assert.ok(match, `${pathname} did not render a request token.`);
  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  const cookie = existingCookie ?? setCookies[0]?.split(";", 1)[0];
  assert.ok(cookie, `${pathname} did not establish the anonymous abuse-isolation cookie.`);
  return { token: match[1], cookie };
}

function postForm(runtimeOrigin, pathname, cookie, body, extraHeaders = {}) {
  return fetch(`${runtimeOrigin}${pathname}`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: runtimeOrigin,
      cookie,
      ...extraHeaders,
    },
    body,
  });
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
  for (const pathname of [
    "/", "/about", "/services", "/services/home-moving", "/services/office-relocation",
    "/areas", "/areas/north-district", "/areas/riverside", "/faq", "/testimonials",
    "/articles",
    "/articles/preparing-access-before-moving-day", "/articles/practical-packing-timeline",
    "/articles/moving-an-office",
    "/quote", "/contact", "/privacy",
  ]) assert.ok(xml.includes(`<loc>${runtimeOrigin}${pathname}</loc>`), pathname);
  assert.equal(xml.split(`<loc>${runtimeOrigin}/articles</loc>`).length - 1, 1);
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
      NUXT_CORE_FOOTER_NAVIGATION_ID: "",
      NUXT_CORE_SITE_SETTING_NAMESPACE: "",
      NUXT_CORE_SITE_SETTING_KEY: "",
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
      for (const forbidden of [PRIVATE_SENTINEL, "core-r21-private.invalid", "core-r23-private.invalid", "NUXT_CORE_BASE_URL"]) {
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
