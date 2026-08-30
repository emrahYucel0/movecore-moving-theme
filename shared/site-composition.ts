import type {
  PublicMediaProjection,
  PublicNavigationProjection,
  PublicSettingProjection,
} from "./core-public-contracts";

export interface PublicSiteComposition {
  readonly navigation: PublicNavigationProjection | null;
  readonly setting: PublicSettingProjection | null;
  readonly media: PublicMediaProjection | null;
}

export type PublicSiteNavigation = NonNullable<PublicSiteComposition["navigation"]>;
export type PublicSiteNavigationItem = PublicSiteNavigation["items"][number];
