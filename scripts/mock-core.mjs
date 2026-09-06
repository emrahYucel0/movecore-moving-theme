import { createServer } from "node:http";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

const DEMO_PUBLISHED_AT = "2026-08-30T00:00:00.000Z";
const MOVING_HOME_EXAMPLE = loadExample("moving-home.json");
const MOVING_SERVICE_EXAMPLE = loadExample("moving-service.json");
const MOVING_LOCATION_EXAMPLE = loadExample("moving-location.json");
const MOVING_SERVICES_EXAMPLE = loadExample("moving-services.json");
const MOVING_AREAS_EXAMPLE = loadExample("moving-areas.json");
const MOVING_FAQ_EXAMPLE = loadExample("moving-faq.json");
const MOVING_TESTIMONIALS_EXAMPLE = loadExample("moving-testimonials.json");
const MOVING_QUOTE_EXAMPLE = loadExample("moving-quote.json");
const MOVING_CONTACT_EXAMPLE = loadExample("moving-contact.json");

export function createMockCoreServer(options = {}) {
  const mediaOrigin = options.mediaOrigin;
  const submissions = options.submissions ?? [];
  const business = options.businessIdentity ?? businessIdentity();
  const idempotency = new Map();
  return createServer(async (request, response) => {
    try {
      await handleRequest(request, response, mediaOrigin, {
        submissions,
        submissionEvents: options.submissionEvents ?? [],
        idempotency,
        upstreamSecret: options.upstreamSecret,
        submissionControl: options.submissionControl ?? { mode: options.submissionMode },
      }, business);
    } catch {
      json(response, 500, failure("service_unavailable"));
    }
  });
}

export function createMockMediaServer() {
  return createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://mock-media.invalid");
    if (request.method !== "GET") return json(response, 405, failure("method_not_allowed"));
    if (url.pathname === "/demo-media/hero.svg") {
      return svg(response, heroIllustration());
    }
    if (url.pathname === "/demo-media/section.svg") {
      return svg(response, handoffIllustration());
    }
    if (url.pathname === "/demo-media/process.svg") {
      return svg(response, processIllustration());
    }
    if (url.pathname === "/demo-media/logo.svg") {
      return svg(response, logoMark());
    }
    return json(response, 404, failure("not_found"));
  });
}

async function handleRequest(request, response, mediaOrigin, submissionState, business) {
  const url = new URL(request.url ?? "/", "http://mock-core.invalid");
  if (request.method === "POST" && url.pathname === "/v1/submissions") {
    return submissionResponse(request, response, submissionState);
  }
  if (request.method !== "GET") return json(response, 405, failure("method_not_allowed"));
  if (url.pathname === "/v1/pages/resolve") {
    return pageResponse(url.searchParams.get("path"), response);
  }
  if (url.pathname === "/v1/navigation/primary") {
    return json(response, 200, { data: primaryNavigation() });
  }
  if (url.pathname === "/v1/navigation/footer") {
    return json(response, 200, { data: footerNavigation() });
  }
  if (url.pathname === "/v1/settings/moving/business") {
    return json(response, 200, {
      data: {
        namespace: "moving",
        key: "business",
        value: typeof business === "function" ? business() : business,
      },
    });
  }
  if (url.pathname.startsWith("/v1/media/")) {
    return mediaResponse(
      decodeURIComponent(url.pathname.slice("/v1/media/".length)),
      request,
      response,
      mediaOrigin,
    );
  }
  if (url.pathname === "/v1/sitemap") {
    return json(response, 200, {
      data: {
        kind: "success",
        items: [
          { path: "/", lastModified: DEMO_PUBLISHED_AT },
          { path: "/about", lastModified: DEMO_PUBLISHED_AT },
          { path: "/services", lastModified: DEMO_PUBLISHED_AT },
          { path: "/services/home-moving", lastModified: DEMO_PUBLISHED_AT },
          { path: "/services/office-relocation", lastModified: DEMO_PUBLISHED_AT },
          { path: "/areas", lastModified: DEMO_PUBLISHED_AT },
          { path: "/areas/north-district", lastModified: DEMO_PUBLISHED_AT },
          { path: "/areas/riverside", lastModified: DEMO_PUBLISHED_AT },
          { path: "/faq", lastModified: DEMO_PUBLISHED_AT },
          { path: "/testimonials", lastModified: DEMO_PUBLISHED_AT },
          { path: "/quote", lastModified: DEMO_PUBLISHED_AT },
          { path: "/contact", lastModified: DEMO_PUBLISHED_AT },
          { path: "/privacy", lastModified: DEMO_PUBLISHED_AT },
        ],
      },
    });
  }
  return json(response, 404, failure("not_found"));
}

function pageResponse(pathname, response) {
  if (pathname === "/old") return redirect(response, 301, "/old", "/about");
  if (pathname === "/temporary") return redirect(response, 302, "/temporary", "/about");
  if (pathname === "/missing") return json(response, 404, failure("not_found"));
  if (pathname === "/core-invalid") return json(response, 400, failure("invalid_request"));
  if (pathname === "/page-unavailable") return json(response, 503, failure("service_unavailable"));

  const scenarios = {
    "/": {
      type: "moving.home",
      payload: movingHomePayload(),
    },
    "/about": {
      type: "site.page",
      payload: {
        eyebrow: "A considered service",
        title: "A clear plan for the work between homes.",
        intro: "Northline Moving plans residential and workplace moves around careful handling, clear access and a useful room-by-room handoff.",
        sections: [
          {
            heading: "Built around careful handling",
            body: "Every plan starts with the properties, the belongings involved and the responsibilities the team needs to carry from preparation to placement.",
          },
        ],
      },
    },
    "/services/home-moving": {
      type: "moving.service",
      payload: movingServicePayload("home"),
    },
    "/services": {
      type: "moving.services",
      payload: structuredClone(MOVING_SERVICES_EXAMPLE),
    },
    "/services/office-relocation": {
      type: "moving.service",
      payload: movingServicePayload("office"),
    },
    "/areas/north-district": {
      type: "moving.location",
      payload: movingLocationPayload("north"),
    },
    "/areas": {
      type: "moving.areas",
      payload: structuredClone(MOVING_AREAS_EXAMPLE),
    },
    "/areas/riverside": {
      type: "moving.location",
      payload: movingLocationPayload("riverside"),
    },
    "/faq": {
      type: "moving.faq",
      payload: structuredClone(MOVING_FAQ_EXAMPLE),
    },
    "/testimonials": {
      type: "moving.testimonials",
      payload: structuredClone(MOVING_TESTIMONIALS_EXAMPLE),
    },
    "/quote": {
      type: "moving.quote",
      payload: structuredClone(MOVING_QUOTE_EXAMPLE),
    },
    "/contact": {
      type: "moving.contact",
      payload: structuredClone(MOVING_CONTACT_EXAMPLE),
    },
    "/privacy": {
      type: "site.page",
      payload: {
        eyebrow: "Reference notice",
        title: "Privacy notice for this demonstration.",
        intro: "This fictional Northline Moving notice is provided only to demonstrate where deployment-specific privacy information belongs. It must be reviewed and replaced before a real site is launched.",
        sections: [
          {
            heading: "How request information is used",
            body: "Information sent through the quote or contact form is stored so the moving company can review and respond to that request. A real operator must document its own retention, access and deletion practices here.",
          },
          {
            heading: "Deployment responsibility",
            body: "This reference content is not legal advice and does not claim compliance with any law. The seller and deploying business remain responsible for an accurate notice.",
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
  };
  const scenario = scenarios[pathname];
  if (scenario === undefined) return json(response, 404, failure("not_found"));
  return json(response, 200, { data: publicPage(pathname, scenario.type, scenario.payload) });
}

function primaryNavigation() {
  return {
    id: "primary",
    items: [
      {
        id: "home",
        label: "Home",
        destination: { kind: "internal", path: "/" },
        children: [],
      },
      {
        id: "about",
        label: "About",
        destination: { kind: "internal", path: "/about" },
        children: [],
      },
      {
        id: "services",
        label: "Services",
        destination: { kind: "internal", path: "/services" },
        children: [
          {
            id: "home-moving",
            label: "Home moving",
            destination: { kind: "internal", path: "/services/home-moving" },
            children: [],
          },
          {
            id: "office-relocation",
            label: "Office relocation",
            destination: { kind: "internal", path: "/services/office-relocation" },
            children: [],
          },
        ],
      },
      {
        id: "areas",
        label: "Areas",
        destination: { kind: "internal", path: "/areas" },
        children: [
          {
            id: "north-district",
            label: "North District",
            destination: { kind: "internal", path: "/areas/north-district" },
            children: [],
          },
          {
            id: "riverside",
            label: "Riverside",
            destination: { kind: "internal", path: "/areas/riverside" },
            children: [],
          },
        ],
      },
      {
        id: "faq",
        label: "FAQ",
        destination: { kind: "internal", path: "/faq" },
        children: [],
      },
      {
        id: "quote",
        label: "Quote",
        destination: { kind: "internal", path: "/quote" },
        children: [],
      },
      {
        id: "contact",
        label: "Contact",
        destination: { kind: "internal", path: "/contact" },
        children: [],
      },
    ],
  };
}

function footerNavigation() {
  return {
    id: "footer",
    items: [
      {
        id: "footer-about",
        label: "About",
        destination: { kind: "internal", path: "/about" },
        children: [],
      },
      {
        id: "footer-services",
        label: "Services",
        destination: { kind: "internal", path: "/services" },
        children: [],
      },
      {
        id: "footer-areas",
        label: "Service areas",
        destination: { kind: "internal", path: "/areas" },
        children: [],
      },
      {
        id: "footer-faq",
        label: "FAQ",
        destination: { kind: "internal", path: "/faq" },
        children: [],
      },
      {
        id: "footer-testimonials",
        label: "Customer stories",
        destination: { kind: "internal", path: "/testimonials" },
        children: [],
      },
      {
        id: "footer-quote",
        label: "Request a quote",
        destination: { kind: "internal", path: "/quote" },
        children: [],
      },
      {
        id: "footer-contact",
        label: "Contact",
        destination: { kind: "internal", path: "/contact" },
        children: [],
      },
      {
        id: "footer-privacy",
        label: "Privacy",
        destination: { kind: "internal", path: "/privacy" },
        children: [],
      },
    ],
  };
}

function businessIdentity() {
  return {
    schemaVersion: 2,
    companyName: "Northline Moving",
    logoAssetId: "asset:demo-logo",
    primaryPhone: "+1 202-555-0147",
    whatsappUrl: "https://wa.me/12025550147",
    whatsappLabel: "Message on WhatsApp",
    email: "hello@example.test",
    address: "100 Example Avenue, Northline, EX 00000",
    openingHours: [
      { label: "Monday to Friday", value: "08:00 to 18:00" },
      { label: "Saturday", value: "09:00 to 14:00" },
    ],
    socialLinks: [
      { label: "Instagram", href: "https://example.test/northline-instagram" },
      { label: "Facebook", href: "https://example.test/northline-facebook" },
    ],
  };
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
      publishedAt: DEMO_PUBLISHED_AT,
    },
    seo: {
      title: seoTitle(pathname),
      description: seoDescription(pathname),
      canonicalPath: pathname,
      index: true,
      follow: true,
    },
  };
}

function mediaResponse(assetId, request, response, configuredOrigin) {
  if (assetId === "asset:missing") return json(response, 404, failure("not_found"));
  if (assetId === "asset:unavailable") return json(response, 503, failure("service_unavailable"));
  if (assetId === "asset:protocol") return json(response, 200, { data: { assetId } });
  if (assetId === "asset:document") {
    return json(response, 200, { data: publicMedia(assetId, "document", "document.pdf", request, configuredOrigin) });
  }
  const filename = assetId === "asset:demo-logo"
    ? "logo.svg"
    : assetId === "asset:demo-hero"
      ? "hero.svg"
      : assetId === "asset:demo-process"
        ? "process.svg"
        : "section.svg";
  return json(response, 200, {
    data: publicMedia(assetId, "image", filename, request, configuredOrigin),
  });
}

function publicMedia(assetId, kind, filename, request, configuredOrigin) {
  const origin = configuredOrigin ?? `http://${request.headers.host ?? "127.0.0.1:4010"}`;
  const isImage = kind === "image";
  const dimensions = assetId === "asset:demo-logo"
    ? { width: 700, height: 180, aspectRatio: 700 / 180 }
    : { width: 1200, height: 800, aspectRatio: 1.5 };
  return {
    assetId,
    kind,
    original: {
      mimeType: isImage ? "image/svg+xml" : "application/pdf",
      format: isImage ? "svg" : "pdf",
      byteSize: 1_024,
      publicUrl: isImage ? `${origin}/demo-media/${filename}` : `${origin}/${filename}`,
      ...(isImage ? dimensions : {}),
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

function svg(response, body) {
  response.writeHead(200, {
    "content-type": "image/svg+xml; charset=utf-8",
    "cache-control": "public, max-age=300",
  });
  response.end(body);
}

async function submissionResponse(request, response, state) {
  if (state.submissionControl.mode === "rate-limited") return json(response, 429, failure("rate_limited"));
  if (state.submissionControl.mode === "unavailable") return json(response, 503, failure("service_unavailable"));
  if (state.submissionControl.mode === "authentication-failed") {
    return json(response, 401, failure("upstream_authentication_failed"));
  }
  const body = await readRequestBody(request, 24 * 1_024);
  const secret = decodeMockSecret(state.upstreamSecret);
  if (secret === undefined || !authenticateMockSubmission(request, body, secret)) {
    return json(response, 401, failure("upstream_authentication_failed"));
  }
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return json(response, 400, failure("invalid_request"));
  }
  if (!plainObject(parsed) || !plainObject(parsed.payload) ||
    !["moving.quote-request", "moving.contact-request"].includes(parsed.type)) {
    return json(response, 400, failure("invalid_request"));
  }
  const idempotencyKey = request.headers["idempotency-key"];
  if (typeof idempotencyKey !== "string") return json(response, 400, failure("invalid_request"));
  const previous = state.idempotency.get(idempotencyKey);
  if (previous !== undefined) {
    if (previous.body !== body) return json(response, 409, failure("idempotency_conflict"));
    state.submissionEvents.push(Object.freeze({ type: parsed.type, replayed: true }));
    return json(response, 200, { data: { ...previous.receipt, replayed: true } });
  }
  const receipt = {
    id: `mock-submission-${state.submissions.length + 1}`,
    type: parsed.type,
    status: "received",
    createdAt: DEMO_PUBLISHED_AT,
  };
  const record = Object.freeze({
    ...receipt,
    payload: parsed.payload,
    client: request.headers["core-submission-client"],
    idempotencyKey,
  });
  state.submissions.push(record);
  state.submissionEvents.push(Object.freeze({ type: parsed.type, replayed: false }));
  state.idempotency.set(idempotencyKey, { body, receipt });
  return json(response, 201, { data: { ...receipt, replayed: false } });
}

function authenticateMockSubmission(request, body, secret) {
  const client = request.headers["core-submission-client"];
  const timestamp = request.headers["core-submission-timestamp"];
  const signature = request.headers["core-submission-signature"];
  const idempotencyKey = request.headers["idempotency-key"];
  if (typeof client !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(client) ||
    typeof timestamp !== "string" || !/^[1-9][0-9]{0,9}$/u.test(timestamp) ||
    typeof signature !== "string" || !/^v1=[0-9a-f]{64}$/u.test(signature) ||
    typeof idempotencyKey !== "string") return false;
  const bodyHash = createHash("sha256").update(body, "utf8").digest("hex");
  const canonical = [
    "core-cms-submission-upstream-v1", "POST", "/v1/submissions", timestamp, client,
    `1:${idempotencyKey}`, bodyHash,
  ].join("\n");
  const expected = `v1=${createHmac("sha256", secret).update(canonical, "utf8").digest("hex")}`;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function readRequestBody(request, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) reject(new Error("body too large"));
      else chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function decodeMockSecret(value) {
  if (typeof value !== "string") return undefined;
  const unpadded = value.replace(/=+$/u, "");
  if (!/^[A-Za-z0-9_-]+$/u.test(unpadded)) return undefined;
  const bytes = Buffer.from(unpadded, "base64url");
  return bytes.length >= 32 && bytes.toString("base64url") === unpadded ? bytes : undefined;
}

function plainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function movingHomePayload() {
  return structuredClone(MOVING_HOME_EXAMPLE);
}

function movingServicePayload(kind) {
  const payload = structuredClone(MOVING_SERVICE_EXAMPLE);
  if (kind === "office") {
    payload.hero.eyebrow = "Office relocation";
    payload.hero.title = "A structured handoff for moving workplaces.";
    payload.hero.intro = "Coordinate access, equipment groups, transport and room priorities through one clear workplace move.";
    payload.hero.media.alt = "Illustrated moving truck prepared for an office relocation";
    payload.overview.title = "Protect continuity through a clear sequence.";
    payload.overview.body = "Office relocation planning connects teams, access windows and destination zones so equipment and shared items have an agreed route through the move.";
    payload.included.title = "What the relocation plan can include.";
    payload.finalAction.title = "Plan a clear workplace handoff.";
  }
  return payload;
}

function movingLocationPayload(kind) {
  const payload = structuredClone(MOVING_LOCATION_EXAMPLE);
  if (kind === "riverside") {
    payload.hero.eyebrow = "Riverside";
    payload.hero.title = "Plan a Riverside move around access and handoff.";
    payload.hero.intro = "Use practical building entry, loading and room-placement details for a move in Riverside.";
    delete payload.hero.media;
    payload.overview.title = "Make the route into each property explicit.";
    payload.localDetails.title = "Resolve Riverside access details before arrival.";
    payload.nearbyAreas.items = [
      { label: "North District", href: "/areas/north-district" },
      { label: "Riverside", href: "/areas/riverside" },
    ];
  }
  return payload;
}

function seoTitle(pathname) {
  const titles = {
    "/": "Northline Moving | Moving with a clear plan",
    "/about": "About Northline Moving",
    "/services": "Moving Services | Northline Moving",
    "/services/home-moving": "Home Moving Service | Northline Moving",
    "/services/office-relocation": "Office Relocation Service | Northline Moving",
    "/areas": "Service Areas | Northline Moving",
    "/areas/north-district": "North District Moving Support | Northline Moving",
    "/areas/riverside": "Riverside Moving Support | Northline Moving",
    "/faq": "Moving Questions | Northline Moving",
    "/testimonials": "Customer Experiences | Northline Moving",
    "/quote": "Request a Moving Quote | Northline Moving",
    "/contact": "Contact Northline Moving",
    "/privacy": "Privacy Notice | Northline Moving",
  };
  return titles[pathname] ?? "Northline Moving";
}

function seoDescription(pathname) {
  return pathname === "/"
    ? "Professional packing, transport and placement for carefully planned residential and commercial moves."
    : "Careful moving support shaped around clear planning, practical access and a useful handoff.";
}

function loadExample(name) {
  return JSON.parse(readFileSync(new URL(`../application/examples/${name}`, import.meta.url), "utf8"));
}

function heroIllustration() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="Moving truck beside stacked packing boxes"><rect width="1200" height="800" fill="#d9d8cf"/><rect y="610" width="1200" height="190" fill="#bbc2b9"/><rect x="92" y="104" width="680" height="472" fill="#f8f6ef"/><path d="M170 470h592v-246H396v80H170z" fill="#19302c"/><path d="M762 318h168l114 112v40H762z" fill="#c94f2c"/><rect x="822" y="346" width="103" height="72" fill="#d9d8cf"/><circle cx="318" cy="525" r="58" fill="#f8f6ef" stroke="#19302c" stroke-width="26"/><circle cx="889" cy="525" r="58" fill="#f8f6ef" stroke="#19302c" stroke-width="26"/><rect x="110" y="390" width="118" height="118" fill="#c94f2c"/><rect x="236" y="342" width="144" height="166" fill="#e9a46e"/><path d="M308 342v166M236 404h144" stroke="#19302c" stroke-width="8"/><path d="M92 104h680M92 576h952" stroke="#19302c" stroke-width="8"/></svg>`;
}

function handoffIllustration() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="Hands passing a packed box"><rect width="1200" height="800" fill="#19302c"/><rect x="416" y="198" width="368" height="390" fill="#e9a46e"/><path d="M600 198v390M416 326h368" stroke="#f8f6ef" stroke-width="10"/><path d="M0 492h246l170-96v192l-176 96H0zM1200 492H954l-170-96v192l176 96h240z" fill="#c94f2c"/><path d="M246 492l170-96M954 492l-170-96" stroke="#f8f6ef" stroke-width="10"/><circle cx="600" cy="454" r="54" fill="none" stroke="#19302c" stroke-width="10"/></svg>`;
}

function processIllustration() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="Route connecting two homes"><rect width="1200" height="800" fill="#f8f6ef"/><path d="M166 558C338 362 416 658 598 432S852 260 1034 190" fill="none" stroke="#c94f2c" stroke-width="18" stroke-dasharray="30 24"/><path d="M92 552l138-112 138 112v154H92zM832 250l138-112 138 112v154H832z" fill="#19302c"/><rect x="182" y="610" width="92" height="96" fill="#d9d8cf"/><rect x="922" y="308" width="92" height="96" fill="#d9d8cf"/><circle cx="166" cy="558" r="34" fill="#f8f6ef" stroke="#c94f2c" stroke-width="14"/><circle cx="1034" cy="190" r="34" fill="#f8f6ef" stroke="#c94f2c" stroke-width="14"/><path d="M482 354h220v142H482z" fill="#e9a46e"/><path d="M592 354v142M482 416h220" stroke="#19302c" stroke-width="8"/></svg>`;
}

function logoMark() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 180" role="img" aria-label="Northline Moving logo"><rect width="180" height="180" fill="#c94f2c"/><path d="M39 127V53h27l48 45V53h27v74h-26L66 81v46z" fill="#faf9f4"/><path d="M221 145h444" stroke="#c94f2c" stroke-width="6"/><text x="218" y="91" fill="#19302c" font-family="Arial Narrow, Arial, sans-serif" font-size="61" font-weight="700" letter-spacing="-2">NORTHLINE</text><text x="221" y="128" fill="#4d5d58" font-family="Arial, sans-serif" font-size="19" font-weight="700" letter-spacing="6">MOVING COMPANY</text></svg>`;
}
