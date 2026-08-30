import type {
  PublicMediaProjection,
  PublicNavigationProjection,
  PublicSettingProjection,
} from "../server/core/contracts";

export interface PublicSiteComposition {
  readonly navigation: PublicNavigationProjection | null;
  readonly setting: PublicSettingProjection | null;
  readonly media: PublicMediaProjection | null;
}

export type PublicSiteNavigation = NonNullable<PublicSiteComposition["navigation"]>;
export type PublicSiteNavigationItem = PublicSiteNavigation["items"][number];
export type PublicSiteSetting = NonNullable<PublicSiteComposition["setting"]>;
export type PublicSiteMedia = NonNullable<PublicSiteComposition["media"]>;
