import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const DEMO_PUBLISHED_AT = "2026-08-30T00:00:00.000Z";
const MOVING_HOME_EXAMPLE = loadExample("moving-home.json");
const MOVING_SERVICE_EXAMPLE = loadExample("moving-service.json");
const MOVING_LOCATION_EXAMPLE = loadExample("moving-location.json");
const MOVING_SERVICES_EXAMPLE = loadExample("moving-services.json");
const MOVING_AREAS_EXAMPLE = loadExample("moving-areas.json");
const MOVING_FAQ_EXAMPLE = loadExample("moving-faq.json");
const MOVING_TESTIMONIALS_EXAMPLE = loadExample("moving-testimonials.json");

export function createMockCoreServer(options = {}) {
  const mediaOrigin = options.mediaOrigin;
  return createServer((request, response) => {
    try {
      handleRequest(request, response, mediaOrigin);
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

function handleRequest(request, response, mediaOrigin) {
  const url = new URL(request.url ?? "/", "http://mock-core.invalid");
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
        value: businessIdentity(),
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
    ],
  };
}

function businessIdentity() {
  return {
    companyName: "Northline Moving",
    logoAssetId: "asset:demo-logo",
    primaryPhone: {
      display: "+1 202-555-0147",
      href: "tel:+12025550147",
    },
    whatsapp: {
      label: "Message on WhatsApp",
      href: "https://wa.me/12025550147",
    },
    email: {
      display: "hello@example.test",
      href: "mailto:hello@example.test",
    },
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
