import { createServer } from "node:http";

const DEMO_PUBLISHED_AT = "2026-08-30T00:00:00.000Z";

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
      return svg(response, "MoveCore demo hero", "#0f172a", "#38bdf8");
    }
    if (url.pathname === "/demo-media/section.svg") {
      return svg(response, "MoveCore demo section", "#172554", "#a5b4fc");
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
        value: { name: "MoveCore Nuxt Starter" },
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
      type: "site.page",
      payload: {
        eyebrow: "Structured publishing",
        title: "Core CMS Nuxt Starter",
        intro: "A typed, server-rendered public site powered through the Core CMS Public HTTP boundary.",
        heroMedia: { assetId: "asset:demo-hero", alt: "Abstract MoveCore demo hero" },
        sections: [
          {
            heading: "Structured content",
            body: "Application-owned fields become semantic server-rendered content.",
          },
          {
            heading: "Public media",
            body: "Published image projections remain resolved through Core Public HTTP.",
            media: { assetId: "asset:demo-section", alt: "Abstract MoveCore demo section" },
          },
        ],
      },
    },
    "/about": {
      type: "site.page",
      payload: {
        eyebrow: "About this starter",
        title: "A clean Core-backed foundation",
        intro: "This page demonstrates a second canonical route using the same site.page contract.",
        sections: [
          {
            heading: "Application ownership",
            body: "The starter owns presentation while Core owns published content and routing projections.",
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
      title: pathname === "/" ? "MoveCore Starter Demo" : "About MoveCore Starter",
      description: pathname === "/"
        ? "A production-oriented Nuxt starter for Core CMS."
        : "How the MoveCore Nuxt starter divides application and CMS ownership.",
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
  const filename = assetId === "asset:demo-hero" ? "hero.svg" : "section.svg";
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
      byteSize: 512,
      publicUrl: isImage ? `${origin}/demo-media/${filename}` : `${origin}/${filename}`,
      ...(isImage ? { width: 1200, height: 675, aspectRatio: 16 / 9 } : {}),
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

function svg(response, label, background, accent) {
  const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img" aria-label="${label}"><rect width="1200" height="675" fill="${background}"/><circle cx="950" cy="110" r="250" fill="${accent}" opacity=".55"/><path d="M0 510 330 250l250 200 220-170 400 315v80H0Z" fill="${accent}" opacity=".8"/><text x="72" y="120" fill="white" font-family="system-ui,sans-serif" font-size="42">${label}</text></svg>`;
  response.writeHead(200, {
    "content-type": "image/svg+xml; charset=utf-8",
    "cache-control": "public, max-age=300",
  });
  response.end(body);
}
