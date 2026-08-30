import { useCorePublicClient } from "../core";
import { corePublicHttpFailure } from "../core/http-failure";
import { createPublicSitemapXml } from "../sitemap/xml";
import { PublicSiteConfigurationError } from "../../shared/public-site-url";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  try {
    const xml = await createPublicSitemapXml(
      config.public.siteUrl,
      useCorePublicClient(),
    );
    setResponseHeader(event, "content-type", "application/xml; charset=utf-8");
    setResponseHeader(event, "cache-control", "no-store");
    setResponseHeader(event, "x-content-type-options", "nosniff");
    return xml;
  } catch (error: unknown) {
    const failure = error instanceof PublicSiteConfigurationError
      ? { statusCode: 503 as const, statusMessage: "Public site configuration unavailable" }
      : corePublicHttpFailure(error);
    throw createError({
      statusCode: failure.statusCode,
      statusMessage: failure.statusMessage,
    });
  }
});
