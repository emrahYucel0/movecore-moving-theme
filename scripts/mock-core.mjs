import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const DEMO_PUBLISHED_AT = "2026-08-30T00:00:00.000Z";
const MOVING_SERVICE_EXAMPLE = loadExample("moving-service.json");
const MOVING_LOCATION_EXAMPLE = loadExample("moving-location.json");

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
  if (url.pathname === "/v1/settings/site/foundation") {
    return json(response, 200, {
      data: {
        namespace: "site",
        key: "foundation",
        value: { name: "Northline Moving" },
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
          { path: "/services/home-moving", lastModified: DEMO_PUBLISHED_AT },
          { path: "/services/office-relocation", lastModified: DEMO_PUBLISHED_AT },
          { path: "/areas/north-district", lastModified: DEMO_PUBLISHED_AT },
          { path: "/areas/riverside", lastModified: DEMO_PUBLISHED_AT },
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
        intro: "Northline Moving is a fictional demo brand showing how structured Core content becomes a focused service experience.",
        sections: [
          {
            heading: "Built around careful handling",
            body: "The theme owns presentation while Core continues to own published content, routing and public projections.",
          },
        ],
      },
    },
    "/services/home-moving": {
      type: "moving.service",
      payload: movingServicePayload("home"),
    },
    "/services/office-relocation": {
      type: "moving.service",
      payload: movingServicePayload("office"),
    },
    "/areas/north-district": {
      type: "moving.location",
      payload: movingLocationPayload("north"),
    },
    "/areas/riverside": {
      type: "moving.location",
      payload: movingLocationPayload("riverside"),
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
        destination: { kind: "internal", path: "/services/home-moving" },
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
        destination: { kind: "internal", path: "/areas/north-district" },
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
  const filename = assetId === "asset:demo-hero"
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
  return {
    assetId,
    kind,
    original: {
      mimeType: isImage ? "image/svg+xml" : "application/pdf",
      format: isImage ? "svg" : "pdf",
      byteSize: 1_024,
      publicUrl: isImage ? `${origin}/demo-media/${filename}` : `${origin}/${filename}`,
      ...(isImage ? { width: 1200, height: 800, aspectRatio: 1.5 } : {}),
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
  return {
    hero: {
      eyebrow: "Residential & commercial moving",
      title: "Moving handled with care, from door to door.",
      intro: "A planned moving service for homes and businesses, with careful packing, coordinated transport and a clear handoff at every stage.",
      media: {
        assetId: "asset:demo-hero",
        alt: "Illustrated moving truck beside stacked packing boxes",
      },
      primaryAction: { label: "Plan your move", href: "/about" },
      secondaryAction: { label: "Call the team", href: "tel:+15550101010" },
    },
    proof: [
      { value: "Planned", label: "Every move" },
      { value: "Protected", label: "At each handoff" },
      { value: "Clear", label: "From plan to placement" },
    ],
    services: {
      eyebrow: "Moving support",
      title: "The right help for the work ahead.",
      intro: "Focused moving support for homes, workplaces and smaller changes of address.",
      items: [
        { title: "Home moving", description: "A coordinated plan for packing, transport and room-by-room placement.", href: "/services/home-moving" },
        { title: "Office relocation", description: "Structured preparation and handoff for workplace moves.", href: "/services/office-relocation" },
        { title: "Packing support", description: "Careful preparation for furniture, boxes and fragile belongings.", href: "/services/home-moving" },
        { title: "Small moves", description: "A clear scope for compact moves that still need thoughtful handling.", href: "/services/home-moving" },
      ],
    },
    process: {
      eyebrow: "A clear sequence",
      title: "Know what happens next.",
      intro: "Four practical stages keep the move understandable from preparation to handoff.",
      steps: [
        { title: "Plan", description: "Confirm access, timing and what needs to move." },
        { title: "Prepare", description: "Protect furniture and pack according to the agreed scope." },
        { title: "Move", description: "Coordinate loading, transport and unloading." },
        { title: "Place", description: "Position items in the destination rooms before handoff." },
      ],
    },
    assurance: {
      eyebrow: "Care at every handoff",
      title: "Care is part of the process.",
      body: "A good move is not only about transport. It is about knowing who is handling each stage, what happens next and how belongings are protected along the way.",
      media: {
        assetId: "asset:demo-section",
        alt: "Illustrated hands carefully passing a packed box",
      },
      points: [
        { text: "Clear arrival windows" },
        { text: "Room-by-room handling" },
        { text: "Protective packing" },
        { text: "Direct handoff" },
      ],
    },
    serviceAreas: {
      eyebrow: "Demo service area",
      title: "Moving support across the fictional Northline area.",
      intro: "These general labels demonstrate homepage area navigation without creating a location SEO model.",
      areas: [
        { label: "North district", href: "/areas/north-district" },
        { label: "Riverside", href: "/areas/riverside" },
        { label: "North district planning", href: "/areas/north-district" },
        { label: "Riverside planning", href: "/areas/riverside" },
      ],
    },
    finalAction: {
      eyebrow: "Ready when you are",
      title: "Start with a clear moving plan.",
      body: "Tell us what is moving, where it is going and when you need it there.",
      primaryAction: { label: "Plan your move", href: "/about" },
      secondaryAction: { label: "Call the team", href: "tel:+15550101010" },
    },
  };
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
    payload.hero.intro = "Use practical building entry, loading and room-placement details for a move in the fictional Riverside area.";
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
    "/services/home-moving": "Home Moving Service | Northline Moving",
    "/services/office-relocation": "Office Relocation Service | Northline Moving",
    "/areas/north-district": "North District Moving Support | Northline Moving",
    "/areas/riverside": "Riverside Moving Support | Northline Moving",
  };
  return titles[pathname] ?? "Northline Moving";
}

function seoDescription(pathname) {
  return pathname === "/"
    ? "Professional packing, transport and placement for carefully planned residential and commercial moves."
    : "A fictional moving service demo built on the MoveCore Nuxt application boundary.";
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
