import { useCorePublicClient } from "../../core";
import { corePublicHttpFailure } from "../../core/http-failure";
import {
  loadPublicSiteComposition,
  PublicSiteCompositionError,
} from "../../site-composition/route";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  try {
    return await loadPublicSiteComposition({
      navigationId: config.corePrimaryNavigationId,
      footerNavigationId: config.coreFooterNavigationId,
      settingNamespace: config.coreSiteSettingNamespace,
      settingKey: config.coreSiteSettingKey,
      privateCoreOrigin: config.coreBaseUrl,
    }, () => useCorePublicClient());
  } catch (error: unknown) {
    if (error instanceof PublicSiteCompositionError) {
      throw createError({
        statusCode: error.kind === "configuration" ? 503 : 500,
        statusMessage: error.kind === "configuration"
          ? "Public content service unavailable"
          : "Invalid public site configuration",
      });
    }
    const failure = corePublicHttpFailure(error);
    throw createError({
      statusCode: failure.statusCode,
      statusMessage: failure.statusMessage,
    });
  }
});
