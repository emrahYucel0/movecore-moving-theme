import { describe, expect, it } from "vitest";
import {
  createCorePublicClient,
  type CoreFetch,
  type CorePublicClient,
} from "../server/core/client";

const content = {
  contentId: "page-home",
  type: "page",
  revisionId: "page-home-r1",
  revisionNumber: 1,
  payload: { title: "Published" },
  publishedAt: "2026-08-20T10:00:00.000Z",
};

const page = {
  resource: { type: "page", id: "page-home" },
  content,
  seo: {
    canonicalPath: "/",
    index: true,
    follow: true,
    title: "Home",
  },
};

interface FetchCall {
  readonly url: string;
  readonly init?: RequestInit;
}

function harness(
  responder: (call: FetchCall) => Promise<Response> | Response,
  options: Readonly<{ timeoutMs?: number; baseUrl?: string }> = {},
): Readonly<{ client: CorePublicClient; calls: FetchCall[] }> {
  const calls: FetchCall[] = [];
  const fetch: CoreFetch = async (input, init) => {
    const call: FetchCall = {
      url: input instanceof Request ? input.url : input.toString(),
      ...(init === undefined ? {} : { init }),
    };
    calls.push(call);
    return responder(call);
  };
  return {
    client: createCorePublicClient({
      baseUrl: options.baseUrl ?? "https://core.example.test",
      requestTimeoutMs: options.timeoutMs ?? 5_000,
      fetch,
    }),
    calls,
  };
}

function json(status: number, body: unknown, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function failure(status: number, code: string): Response {
  return json(status, { error: { code, message: "Safe public error." } });
}

describe("Core Public HTTP client", () => {
  it("returns a validated page projection for a 200 response", async () => {
    const { client, calls } = harness(() => json(200, { data: page }));
    await expect(client.resolvePage("/")).resolves.toEqual({ kind: "page", page });
    expect(new URL(calls[0]?.url ?? "").pathname).toBe("/v1/pages/resolve");
    expect(new URL(calls[0]?.url ?? "").searchParams.get("path")).toBe("/");
  });

  it("observes a 301 redirect without following it", async () => {
    const { client, calls } = harness(() => json(301, {
      data: { from: "/old", to: "/new", status: 301 },
    }, { location: "/new" }));
    await expect(client.resolvePage("/old")).resolves.toEqual({
      kind: "redirect",
      from: "/old",
      to: "/new",
      location: "/new",
      status: 301,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.redirect).toBe("manual");
  });

  it("observes a 302 redirect without following it", async () => {
    const { client, calls } = harness(() => json(302, {
      data: { from: "/temporary", to: "/target", status: 302 },
    }, { location: "/target" }));
    await expect(client.resolvePage("/temporary")).resolves.toMatchObject({
      kind: "redirect",
      to: "/target",
      status: 302,
    });
    expect(calls).toHaveLength(1);
  });

  it("maps a missing page to an explicit not-found result", async () => {
    const { client } = harness(() => failure(404, "not_found"));
    await expect(client.resolvePage("/missing")).resolves.toEqual({ kind: "not-found" });
  });

  it("returns published content", async () => {
    const { client } = harness(() => json(200, { data: content }));
    await expect(client.getContent("page-home")).resolves.toEqual(content);
  });

  it("uses null consistently for a missing resource getter", async () => {
    const { client } = harness(() => failure(404, "not_found"));
    await expect(client.getContent("missing")).resolves.toBeNull();
  });

  it("returns a public setting with recursive JSON", async () => {
    const setting = { namespace: "site", key: "identity", value: { name: "MoveCore" } };
    const { client } = harness(() => json(200, { data: setting }));
    await expect(client.getSetting("site", "identity")).resolves.toEqual(setting);
  });

  it("returns public navigation", async () => {
    const navigation = {
      id: "primary",
      items: [{
        id: "home",
        label: "Home",
        destination: { kind: "internal", path: "/" },
        children: [],
      }],
    };
    const { client } = harness(() => json(200, { data: navigation }));
    await expect(client.getNavigation("primary")).resolves.toEqual(navigation);
  });

  it("returns a safe public media projection", async () => {
    const media = {
      assetId: "asset-1",
      kind: "image",
      original: {
        mimeType: "image/png",
        format: "png",
        byteSize: 8,
        publicUrl: "/media/asset-1",
        width: 1,
        height: 1,
        aspectRatio: 1,
      },
      variants: [],
    };
    const { client } = harness(() => json(200, { data: media }));
    await expect(client.getMedia("asset-1")).resolves.toEqual(media);
  });

  it("preserves sitemap pagination inputs and output", async () => {
    const { client, calls } = harness(() => json(200, {
      data: {
        kind: "success",
        items: [{ path: "/a", lastModified: "2026-08-20T10:00:00.000Z" }],
        nextAfter: "/a",
      },
    }));
    await expect(client.listSitemap({ limit: 25, after: "/before" })).resolves.toEqual({
      items: [{ path: "/a", lastModified: "2026-08-20T10:00:00.000Z" }],
      nextAfter: "/a",
    });
    const url = new URL(calls[0]?.url ?? "");
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.get("after")).toBe("/before");
    expect([...url.searchParams.keys()]).toEqual(["limit", "after"]);
  });

  it("maps Core 400 invalid_request to a sanitized invalid-request error", async () => {
    const { client } = harness(() => failure(400, "invalid_request"));
    await expect(client.resolvePage("invalid")).rejects.toMatchObject({
      kind: "invalid-request",
      status: 400,
      code: "invalid_request",
    });
  });

  it("maps Core 503 service_unavailable without returning null", async () => {
    const { client } = harness(() => failure(503, "service_unavailable"));
    await expect(client.getContent("page-home")).rejects.toMatchObject({
      kind: "unavailable",
      status: 503,
    });
  });

  it("maps a network failure to a sanitized network error", async () => {
    const { client } = harness(() => { throw new Error("private socket details"); });
    await expect(client.getContent("page-home")).rejects.toMatchObject({ kind: "network" });
  });

  it("rejects a malformed success envelope", async () => {
    const { client } = harness(() => json(200, { result: content }));
    await expect(client.getContent("page-home")).rejects.toMatchObject({ kind: "protocol" });
  });

  it("rejects malformed DTO data instead of casting it", async () => {
    const { client } = harness(() => json(200, { data: { contentId: "incomplete" } }));
    await expect(client.getContent("page-home")).rejects.toMatchObject({ kind: "protocol" });
  });

  it("rejects a malformed error envelope", async () => {
    const { client } = harness(() => json(404, { error: { code: 404, message: "bad" } }));
    await expect(client.getContent("missing")).rejects.toMatchObject({ kind: "protocol" });
  });

  it("rejects a malformed redirect", async () => {
    const { client } = harness(() => json(301, {
      data: { from: "/old", to: "/new", status: 301 },
    }, { location: "/different" }));
    await expect(client.resolvePage("/old")).rejects.toMatchObject({ kind: "protocol" });
  });

  it("encodes every dynamic URL segment", async () => {
    const setting = { namespace: "site space", key: "café", value: true };
    const { client, calls } = harness(() => json(200, { data: setting }));
    await client.getSetting("site space", "café");
    expect(new URL(calls[0]?.url ?? "").pathname).toBe("/v1/settings/site%20space/caf%C3%A9");
  });

  it("rejects malformed and non-HTTP base URLs", () => {
    for (const baseUrl of ["not-a-url", "ftp://core.example.test", "https://core.example.test/v1"]) {
      expect(() => createCorePublicClient({ baseUrl })).toThrowError(/invalid/iu);
    }
  });

  it("rejects credential-bearing base URLs", () => {
    expect(() => createCorePublicClient({
      baseUrl: "https://user:password@core.example.test",
    })).toThrowError(/invalid/iu);
  });

  it("rejects invalid sitemap limits before issuing a request", async () => {
    const { client, calls } = harness(() => json(200, { data: { kind: "success", items: [] } }));
    await expect(client.listSitemap({ limit: 101 })).rejects.toMatchObject({
      kind: "invalid-request",
    });
    expect(calls).toHaveLength(0);
  });

  it("aborts and classifies a bounded request timeout", async () => {
    const { client } = harness((call) => new Promise<Response>((_resolve, reject) => {
      const signal = call.init?.signal;
      if (signal === undefined) return reject(new Error("missing signal"));
      const abort = () => reject(new DOMException("Aborted", "AbortError"));
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
    }), { timeoutMs: 5 });
    await expect(client.getContent("page-home")).rejects.toMatchObject({
      kind: "timeout",
      code: "request_timeout",
    });
  });
});
