import type { PublicSiteComposition } from "~~/shared/site-composition";

export async function useCorePublicSite(): Promise<PublicSiteComposition> {
  const { data, error } = await useAsyncData(
    "core-public-site-composition",
    () => $fetch<PublicSiteComposition>("/api/_movecore/site"),
  );
  if (error.value !== undefined) throw publicSiteError(error.value);
  if (data.value === undefined) throw publicSiteError(undefined);
  return data.value;
}

function publicSiteError(error: unknown): ReturnType<typeof createError> {
  const statusCode = responseStatus(error);
  const statusMessage = statusCode === 400
    ? "Invalid public site request"
    : statusCode === 500
      ? "Invalid public site configuration"
    : statusCode === 503
      ? "Public content service unavailable"
      : "Invalid public content response";
  return createError({ statusCode, statusMessage, fatal: true });
}

function responseStatus(error: unknown): 400 | 500 | 502 | 503 {
  if (!isRecord(error)) return 502;
  const status = error.statusCode ?? error.status;
  return status === 400 || status === 500 || status === 502 || status === 503 ? status : 502;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
