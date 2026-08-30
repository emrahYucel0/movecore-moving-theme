import type { PublicPageProjection } from "../server/core/contracts";

export type PageRouteResult =
  | { readonly kind: "page"; readonly page: PublicPageProjection }
  | { readonly kind: "redirect"; readonly to: string; readonly status: 301 | 302 }
  | { readonly kind: "not-found" };

export function publicPathname(route: Readonly<{ readonly path: string }>): string {
  return route.path;
}
