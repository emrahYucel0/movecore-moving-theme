import type { PublicSeoProjection } from "../server/core/contracts";
import type { SitePageViewModel } from "./content/site-page";

export interface PublicApplicationPage {
  readonly seo: PublicSeoProjection;
  readonly content: SitePageViewModel;
}

export type PageRouteResult =
  | { readonly kind: "page"; readonly page: PublicApplicationPage }
  | { readonly kind: "redirect"; readonly to: string; readonly status: 301 | 302 }
  | { readonly kind: "not-found" };

export function publicPathname(route: Readonly<{ readonly path: string }>): string {
  return route.path;
}
