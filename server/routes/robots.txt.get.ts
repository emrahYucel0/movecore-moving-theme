import { PublicSiteConfigurationError } from "../../shared/public-site-url";
import { createMovingRobotsText } from "../robots/text";

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  try {
    const robots = createMovingRobotsText(config.public.siteUrl);
    setResponseHeader(event, "content-type", "text/plain; charset=utf-8");
    setResponseHeader(event, "cache-control", "no-store");
    setResponseHeader(event, "x-content-type-options", "nosniff");
    return robots;
  } catch (error: unknown) {
    if (!(error instanceof PublicSiteConfigurationError)) throw error;
    throw createError({
      statusCode: 503,
      statusMessage: "Public site configuration unavailable",
    });
  }
});
