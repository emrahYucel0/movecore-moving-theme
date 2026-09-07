import type { PublicSeoProjection } from "./core-public-contracts";
import type { SitePageViewModel } from "./content/site-page";
import type { MovingHomeViewModel } from "./content/moving-home";
import type { MovingServiceViewModel } from "./content/moving-service";
import type { MovingLocationViewModel } from "./content/moving-location";
import type { MovingServicesViewModel } from "./content/moving-services";
import type { MovingAreasViewModel } from "./content/moving-areas";
import type { MovingFaqViewModel } from "./content/moving-faq";
import type { MovingTestimonialsViewModel } from "./content/moving-testimonials";
import type { MovingContactPage, MovingQuotePage } from "./content/moving-conversion";
import type { MovingArticleViewModel } from "./content/moving-article";

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
  }
  | {
    readonly type: "moving.services";
    readonly seo: PublicSeoProjection;
    readonly content: MovingServicesViewModel;
  }
  | {
    readonly type: "moving.areas";
    readonly seo: PublicSeoProjection;
    readonly content: MovingAreasViewModel;
  }
  | {
    readonly type: "moving.faq";
    readonly seo: PublicSeoProjection;
    readonly content: MovingFaqViewModel;
  }
  | {
    readonly type: "moving.testimonials";
    readonly seo: PublicSeoProjection;
    readonly content: MovingTestimonialsViewModel;
  }
  | {
    readonly type: "moving.quote";
    readonly seo: PublicSeoProjection;
    readonly content: MovingQuotePage;
    readonly requestToken: string;
  }
  | {
    readonly type: "moving.contact";
    readonly seo: PublicSeoProjection;
    readonly content: MovingContactPage;
    readonly requestToken: string;
  }
  | {
    readonly type: "moving.article";
    readonly seo: PublicSeoProjection;
    readonly content: MovingArticleViewModel;
  };

export type PageRouteResult =
  | { readonly kind: "page"; readonly page: PublicApplicationPage }
  | { readonly kind: "redirect"; readonly to: string; readonly status: 301 | 302 }
  | { readonly kind: "not-found" };

export function publicPathname(route: Readonly<{ readonly path: string }>): string {
  return route.path;
}
