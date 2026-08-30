import type { PageRouteResult } from "~~/shared/page-route";
import { publicPathname } from "~~/shared/page-route";

type PublicPage = Extract<PageRouteResult, { readonly kind: "page" }>[
  "page"
];

export async function useCorePublicPage(): Promise<PublicPage | undefined> {
  const nuxtApp = useNuxtApp();
  const route = useRoute();
  const path = publicPathname(route);
  const { data, error } = await useAsyncData(
    `core-public-page:${path}`,
    () => $fetch<PageRouteResult>("/api/_movecore/page", { query: { path } }),
  );

  if (error.value !== undefined) throw publicRouteError(error.value);
  const result = data.value;
  if (result === undefined) throw publicRouteError(undefined);
  if (result.kind === "not-found") {
    throw createError({ statusCode: 404, statusMessage: "Page not found", fatal: true });
  }
  if (result.kind === "redirect") {
    await nuxtApp.runWithContext(() => navigateTo(result.to, {
      redirectCode: result.status,
      replace: true,
    }));
    return undefined;
  }
  return result.page;
}

function publicRouteError(error: unknown): ReturnType<typeof createError> {
  const statusCode = responseStatus(error);
  const statusMessage = statusCode === 400
    ? "Invalid public page request"
    : statusCode === 500
      ? "Public page content is invalid"
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
