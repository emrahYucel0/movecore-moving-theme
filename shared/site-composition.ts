import type { PublicNavigationProjection } from "./core-public-contracts";
import type { BusinessIdentity } from "./business-identity";

export interface BusinessLogo {
  readonly assetId: string;
  readonly publicUrl: string;
  readonly alt: string;
  readonly width?: number;
  readonly height?: number;
}

export interface PublicBusinessIdentity extends Omit<BusinessIdentity, "logoAssetId"> {
  readonly logo?: BusinessLogo;
}

export interface PublicSiteComposition {
  readonly business: PublicBusinessIdentity;
  readonly navigation: PublicNavigationProjection;
  readonly footerNavigation: PublicNavigationProjection;
}

export type PublicSiteNavigation = PublicSiteComposition["navigation"];
export type PublicSiteNavigationItem = PublicSiteNavigation["items"][number];
