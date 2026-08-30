import {
  parsePublicContent,
  parsePublicMedia,
  parsePublicNavigation,
  parsePublicPage,
  parsePublicRedirect,
  parsePublicSetting,
  parsePublicSitemap,
  type PublicContentProjection,
  type PublicMediaProjection,
  type PublicNavigationProjection,
  type PublicPageProjection,
  type PublicSettingProjection,
  type PublicSitemapPage,
} from "./contracts";
import { CoreClientError, isCoreClientError } from "./errors";

const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;

export type CoreFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface CorePublicClientOptions {
  readonly baseUrl: string;
  readonly requestTimeoutMs?: number;
  readonly fetch?: CoreFetch;
}

export interface ListSitemapOptions {
  readonly limit?: number;
  readonly after?: string;
}

export type ResolvePageResult =
  | { readonly kind: "page"; readonly page: PublicPageProjection }
  | {
      readonly kind: "redirect";
      readonly from: string;
      readonly to: string;
      readonly location: string;
      readonly status: 301 | 302;
    }
  | { readonly kind: "not-found" };

export interface CorePublicClient {
  readonly resolvePage: (path: string) => Promise<ResolvePageResult>;
  readonly getContent: (contentId: string) => Promise<PublicContentProjection | null>;
  readonly getSetting: (namespace: string, key: string) => Promise<PublicSettingProjection | null>;
  readonly getNavigation: (navigationId: string) => Promise<PublicNavigationProjection | null>;
  readonly listSitemap: (options?: ListSitemapOptions) => Promise<PublicSitemapPage>;
  readonly getMedia: (mediaId: string) => Promise<PublicMediaProjection | null>;
}

export function createCorePublicClient(options: CorePublicClientOptions): CorePublicClient {
  const baseUrl = parseBaseUrl(options.baseUrl);
  const timeoutMs = parseTimeout(options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS);
  const fetchImpl = options.fetch ?? globalThis.fetch;

  const request = async (url: URL): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(url, {
        method: "GET",
        headers: { accept: "application/json" },
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (error: unknown) {
      if (isCoreClientError(error)) throw error;
      if (controller.signal.aborted) {
        throw new CoreClientError("timeout", { code: "request_timeout" });
      }
      throw new CoreClientError("network", { code: "network_failure" });
    } finally {
      clearTimeout(timer);
    }
  };

  const resource = async <T>(url: URL, parser: (value: unknown) => T): Promise<T | null> => {
    const response = await request(url);
    if (response.status === 200) return parser(await readData(response));
    const failure = await readError(response);
    if (response.status === 404 && failure.code === "not_found") return null;
    throw mappedFailure(response.status, failure.code);
  };

  return Object.freeze({
    resolvePage: async (path: string): Promise<ResolvePageResult> => {
      const url = endpoint(baseUrl, "pages", "resolve");
      url.searchParams.set("path", requiredInput(path));
      const response = await request(url);
      if (response.status === 200) {
        return { kind: "page", page: parsePublicPage(await readData(response)) };
      }
      if (response.status === 301 || response.status === 302) {
        const redirect = parsePublicRedirect(await readData(response));
        const location = response.headers.get("location");
        if (
          redirect.status !== response.status ||
          location === null ||
          location !== redirect.to ||
          !isCanonicalPath(location)
        ) {
          throw protocolFailure();
        }
        return {
          kind: "redirect",
          from: redirect.from,
          to: redirect.to,
          location,
          status: redirect.status,
        };
      }
      const failure = await readError(response);
      if (response.status === 404 && failure.code === "not_found") return { kind: "not-found" };
      throw mappedFailure(response.status, failure.code);
    },
    getContent: (contentId: string) => resource(
      endpoint(baseUrl, "content", requiredInput(contentId)),
      parsePublicContent,
    ),
    getSetting: (namespace: string, key: string) => resource(
      endpoint(baseUrl, "settings", requiredInput(namespace), requiredInput(key)),
      parsePublicSetting,
    ),
    getNavigation: (navigationId: string) => resource(
      endpoint(baseUrl, "navigation", requiredInput(navigationId)),
      parsePublicNavigation,
    ),
    listSitemap: async (query: ListSitemapOptions = {}): Promise<PublicSitemapPage> => {
      const url = endpoint(baseUrl, "sitemap");
      if (query.limit !== undefined) url.searchParams.set("limit", String(parseLimit(query.limit)));
      if (query.after !== undefined) url.searchParams.set("after", requiredInput(query.after));
      const response = await request(url);
      if (response.status === 200) return parsePublicSitemap(await readData(response));
      const failure = await readError(response);
      throw mappedFailure(response.status, failure.code);
    },
    getMedia: (mediaId: string) => resource(
      endpoint(baseUrl, "media", requiredInput(mediaId)),
      parsePublicMedia,
    ),
  });
}

function parseBaseUrl(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    throw configurationFailure();
  }
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw configurationFailure();
  }
  return parsed.origin;
}

function parseTimeout(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_TIMEOUT_MS) {
    throw configurationFailure();
  }
  return value;
}

function parseLimit(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 100) {
    throw new CoreClientError("invalid-request", { code: "invalid_client_input" });
  }
  return value;
}

function endpoint(baseUrl: string, ...segments: readonly string[]): URL {
  const encoded = segments.map((segment) => encodeURIComponent(segment));
  return new URL(`/v1/${encoded.join("/")}`, `${baseUrl}/`);
}

function requiredInput(value: string): string {
  if (value.trim().length === 0) {
    throw new CoreClientError("invalid-request", { code: "invalid_client_input" });
  }
  return value;
}

async function readData(response: Response): Promise<unknown> {
  const body = requiredRecord(await readJson(response));
  if (!Object.prototype.hasOwnProperty.call(body, "data")) throw protocolFailure();
  return body.data;
}

async function readError(response: Response): Promise<Readonly<{ code: string; message: string }>> {
  const body = requiredRecord(await readJson(response));
  const error = requiredRecord(body.error);
  if (
    typeof error.code !== "string" || error.code.trim().length === 0 ||
    typeof error.message !== "string" || error.message.trim().length === 0
  ) {
    throw protocolFailure();
  }
  return { code: error.code, message: error.message };
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase();
  if (contentType === undefined || !contentType.includes("application/json")) {
    throw protocolFailure();
  }
  const text = await response.text();
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed;
  } catch {
    throw protocolFailure();
  }
}

function requiredRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) throw protocolFailure();
  return value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mappedFailure(status: number, code: string): CoreClientError {
  if (status === 400 && code === "invalid_request") {
    return new CoreClientError("invalid-request", { status, code });
  }
  if (status === 503 && code === "service_unavailable") {
    return new CoreClientError("unavailable", { status, code });
  }
  return protocolFailure(status);
}

function isCanonicalPath(value: string): boolean {
  return value.startsWith("/") && !/[?#\u0000-\u001f]/u.test(value);
}

function configurationFailure(): CoreClientError {
  return new CoreClientError("invalid-request", { code: "invalid_configuration" });
}

function protocolFailure(status?: number): CoreClientError {
  return new CoreClientError("protocol", {
    ...(status === undefined ? {} : { status }),
    code: "invalid_response",
  });
}
