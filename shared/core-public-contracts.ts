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
