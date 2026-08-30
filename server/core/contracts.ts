import { CoreClientError } from "./errors";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface PublicContentProjection {
  readonly contentId: string;
  readonly type: string;
  readonly revisionId: string;
  readonly revisionNumber: number;
  readonly payload: JsonValue;
  readonly publishedAt: string;
}

export interface PublicSeoProjection {
  readonly title?: string;
  readonly description?: string;
  readonly canonicalPath: string;
  readonly index: boolean;
  readonly follow: boolean;
}

export interface PublicPageProjection {
  readonly resource: Readonly<{ readonly type: string; readonly id: string }>;
  readonly content: PublicContentProjection;
  readonly seo: PublicSeoProjection;
}

export interface PublicSettingProjection {
  readonly namespace: string;
  readonly key: string;
  readonly value: JsonValue;
}

export type PublicNavigationDestination =
  | { readonly kind: "internal"; readonly path: string }
  | { readonly kind: "external"; readonly url: string };

export interface PublicNavigationItem {
  readonly id: string;
  readonly label: string;
  readonly destination: PublicNavigationDestination;
  readonly children: readonly PublicNavigationItem[];
}

export interface PublicNavigationProjection {
  readonly id: string;
  readonly items: readonly PublicNavigationItem[];
}

export type PublicMediaKind = "image" | "audio" | "video" | "document";

export interface PublicMediaObjectProjection {
  readonly mimeType: string;
  readonly format: string;
  readonly byteSize: number;
  readonly publicUrl: string;
  readonly width?: number;
  readonly height?: number;
  readonly aspectRatio?: number;
}

export interface PublicMediaProjection {
  readonly assetId: string;
  readonly kind: PublicMediaKind;
  readonly original: PublicMediaObjectProjection;
  readonly variants: readonly PublicMediaObjectProjection[];
}

export interface PublicSitemapEntry {
  readonly path: string;
  readonly lastModified?: string;
}

export interface PublicSitemapPage {
  readonly items: readonly PublicSitemapEntry[];
  readonly nextAfter?: string;
}

export interface PublicRedirectProjection {
  readonly from: string;
  readonly to: string;
  readonly status: 301 | 302;
}

export function parsePublicPage(value: unknown): PublicPageProjection {
  const record = requiredRecord(value);
  const resource = requiredRecord(record.resource);
  return {
    resource: {
      type: requiredNonBlankString(resource.type),
      id: requiredNonBlankString(resource.id),
    },
    content: parsePublicContent(record.content),
    seo: parsePublicSeo(record.seo),
  };
}

export function parsePublicContent(value: unknown): PublicContentProjection {
  const record = requiredRecord(value);
  return {
    contentId: requiredNonBlankString(record.contentId),
    type: requiredNonBlankString(record.type),
    revisionId: requiredNonBlankString(record.revisionId),
    revisionNumber: requiredPositiveInteger(record.revisionNumber),
    payload: parseJsonValue(record.payload),
    publishedAt: requiredNonBlankString(record.publishedAt),
  };
}

export function parsePublicSetting(value: unknown): PublicSettingProjection {
  const record = requiredRecord(value);
  return {
    namespace: requiredNonBlankString(record.namespace),
    key: requiredNonBlankString(record.key),
    value: parseJsonValue(record.value),
  };
}

export function parsePublicNavigation(value: unknown): PublicNavigationProjection {
  const record = requiredRecord(value);
  return {
    id: requiredNonBlankString(record.id),
    items: parseArray(record.items, parsePublicNavigationItem),
  };
}

export function parsePublicMedia(value: unknown): PublicMediaProjection {
  const record = requiredRecord(value);
  const kind = record.kind;
  if (kind !== "image" && kind !== "audio" && kind !== "video" && kind !== "document") {
    throw protocolError();
  }
  return {
    assetId: requiredNonBlankString(record.assetId),
    kind,
    original: parsePublicMediaObject(record.original),
    variants: parseArray(record.variants, parsePublicMediaObject),
  };
}

export function parsePublicSitemap(value: unknown): PublicSitemapPage {
  const record = requiredRecord(value);
  if (record.kind !== "success") throw protocolError();
  const nextAfter = optionalCanonicalPath(record.nextAfter);
  return {
    items: parseArray(record.items, parsePublicSitemapEntry),
    ...(nextAfter === undefined ? {} : { nextAfter }),
  };
}

export function parsePublicRedirect(value: unknown): PublicRedirectProjection {
  const record = requiredRecord(value);
  if (record.status !== 301 && record.status !== 302) throw protocolError();
  return {
    from: requiredCanonicalPath(record.from),
    to: requiredCanonicalPath(record.to),
    status: record.status,
  };
}

function parsePublicSeo(value: unknown): PublicSeoProjection {
  const record = requiredRecord(value);
  const title = optionalString(record.title);
  const description = optionalString(record.description);
  if (typeof record.index !== "boolean" || typeof record.follow !== "boolean") {
    throw protocolError();
  }
  return {
    canonicalPath: requiredCanonicalPath(record.canonicalPath),
    index: record.index,
    follow: record.follow,
    ...(title === undefined ? {} : { title }),
    ...(description === undefined ? {} : { description }),
  };
}

function parsePublicNavigationItem(value: unknown): PublicNavigationItem {
  const record = requiredRecord(value);
  return {
    id: requiredNonBlankString(record.id),
    label: requiredNonBlankString(record.label),
    destination: parsePublicNavigationDestination(record.destination),
    children: parseArray(record.children, parsePublicNavigationItem),
  };
}

function parsePublicNavigationDestination(value: unknown): PublicNavigationDestination {
  const record = requiredRecord(value);
  if (record.kind === "internal") {
    return { kind: "internal", path: requiredCanonicalPath(record.path) };
  }
  if (record.kind === "external") {
    const url = requiredNonBlankString(record.url);
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw protocolError();
    }
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.username || parsed.password) {
      throw protocolError();
    }
    return { kind: "external", url };
  }
  throw protocolError();
}

function parsePublicMediaObject(value: unknown): PublicMediaObjectProjection {
  const record = requiredRecord(value);
  const width = optionalPositiveNumber(record.width);
  const height = optionalPositiveNumber(record.height);
  const aspectRatio = optionalPositiveNumber(record.aspectRatio);
  const dimensionCount = [width, height, aspectRatio].filter((entry) => entry !== undefined).length;
  if (dimensionCount !== 0 && dimensionCount !== 3) throw protocolError();
  return {
    mimeType: requiredNonBlankString(record.mimeType),
    format: requiredNonBlankString(record.format),
    byteSize: requiredNonNegativeInteger(record.byteSize),
    publicUrl: requiredNonBlankString(record.publicUrl),
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
    ...(aspectRatio === undefined ? {} : { aspectRatio }),
  };
}

function parsePublicSitemapEntry(value: unknown): PublicSitemapEntry {
  const record = requiredRecord(value);
  const lastModified = optionalString(record.lastModified);
  return {
    path: requiredCanonicalPath(record.path),
    ...(lastModified === undefined ? {} : { lastModified }),
  };
}

function parseJsonValue(value: unknown, depth = 0): JsonValue {
  if (depth > 64) throw protocolError();
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw protocolError();
    return value;
  }
  if (Array.isArray(value)) return value.map((entry) => parseJsonValue(entry, depth + 1));
  if (!isRecord(value)) throw protocolError();
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, parseJsonValue(entry, depth + 1)]),
  );
}

function parseArray<T>(value: unknown, parser: (entry: unknown) => T): readonly T[] {
  if (!Array.isArray(value)) throw protocolError();
  return value.map(parser);
}

function requiredRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) throw protocolError();
  return value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requiredNonBlankString(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) throw protocolError();
  return value;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw protocolError();
  return value;
}

function requiredCanonicalPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || /[?#\u0000-\u001f]/u.test(value)) {
    throw protocolError();
  }
  return value;
}

function optionalCanonicalPath(value: unknown): string | undefined {
  return value === undefined ? undefined : requiredCanonicalPath(value);
}

function requiredPositiveInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw protocolError();
  return value;
}

function requiredNonNegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw protocolError();
  return value;
}

function optionalPositiveNumber(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw protocolError();
  return value;
}

function protocolError(): CoreClientError {
  return new CoreClientError("protocol", { code: "invalid_response" });
}
