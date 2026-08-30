import type { CorePublicClient } from "../core/client";
import type { PublicSiteComposition } from "../../shared/site-composition";

export interface PublicSiteSelectors {
  readonly navigationId?: string;
  readonly settingNamespace?: string;
  readonly settingKey?: string;
  readonly mediaId?: string;
}

export type PublicSiteClient = Pick<
  CorePublicClient,
  "getNavigation" | "getSetting" | "getMedia"
>;

export async function loadPublicSiteComposition(
  selectors: PublicSiteSelectors,
  createClient: () => PublicSiteClient,
): Promise<PublicSiteComposition> {
  const navigationId = optionalSelector(selectors.navigationId);
  const settingNamespace = optionalSelector(selectors.settingNamespace);
  const settingKey = optionalSelector(selectors.settingKey);
  const mediaId = optionalSelector(selectors.mediaId);
  const hasSettingSelector = settingNamespace !== undefined && settingKey !== undefined;
  const needsClient = navigationId !== undefined || hasSettingSelector || mediaId !== undefined;
  if (!needsClient) return { navigation: null, setting: null, media: null };

  const client = createClient();
  const [navigation, setting, media] = await Promise.all([
    navigationId === undefined ? null : client.getNavigation(navigationId),
    hasSettingSelector ? client.getSetting(settingNamespace, settingKey) : null,
    mediaId === undefined ? null : client.getMedia(mediaId),
  ]);
  return { navigation, setting, media };
}

function optionalSelector(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}
