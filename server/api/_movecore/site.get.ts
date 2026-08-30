import { useCorePublicClient } from "../../core";
import { corePublicHttpFailure } from "../../core/http-failure";
import { loadPublicSiteComposition } from "../../site-composition/route";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  try {
    return await loadPublicSiteComposition({
      navigationId: config.corePrimaryNavigationId,
      settingNamespace: config.coreSiteSettingNamespace,
      settingKey: config.coreSiteSettingKey,
      mediaId: config.coreFoundationMediaId,
    }, () => useCorePublicClient());
  } catch (error: unknown) {
    const failure = corePublicHttpFailure(error);
    throw createError({
      statusCode: failure.statusCode,
      statusMessage: failure.statusMessage,
    });
  }
});
