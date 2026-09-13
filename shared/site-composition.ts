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

export interface PublicSocialImage {
  readonly publicUrl: string;
}

export interface PublicSiteSeo {
  readonly articleArchiveTitle: string;
  readonly articleArchiveDescription: string;
  readonly defaultSocialImage?: PublicSocialImage;
  readonly businessLogoUrl?: string;
}

export interface PublicSiteComposition {
  readonly business: PublicBusinessIdentity;
  readonly seo: PublicSiteSeo;
  readonly navigation: PublicNavigationProjection;
  readonly footerNavigation: PublicNavigationProjection;
}

export type PublicSiteNavigation = PublicSiteComposition["navigation"];
export type PublicSiteNavigationItem = PublicSiteNavigation["items"][number];
