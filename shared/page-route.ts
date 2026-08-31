import type { PublicSeoProjection } from "./core-public-contracts";
import type { SitePageViewModel } from "./content/site-page";
import type { MovingHomeViewModel } from "./content/moving-home";
import type { MovingServiceViewModel } from "./content/moving-service";
import type { MovingLocationViewModel } from "./content/moving-location";

export type PublicApplicationPage =
  | {
    readonly type: "site.page";
    readonly seo: PublicSeoProjection;
    readonly content: SitePageViewModel;
  }
  | {
    readonly type: "moving.home";
    readonly seo: PublicSeoProjection;
    readonly content: MovingHomeViewModel;
  }
  | {
    readonly type: "moving.service";
    readonly seo: PublicSeoProjection;
    readonly content: MovingServiceViewModel;
  }
  | {
    readonly type: "moving.location";
    readonly seo: PublicSeoProjection;
    readonly content: MovingLocationViewModel;
  };

export type PageRouteResult =
  | { readonly kind: "page"; readonly page: PublicApplicationPage }
  | { readonly kind: "redirect"; readonly to: string; readonly status: 301 | 302 }
  | { readonly kind: "not-found" };

export function publicPathname(route: Readonly<{ readonly path: string }>): string {
  return route.path;
}
