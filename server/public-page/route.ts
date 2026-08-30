import type { CorePublicClient } from "../core/client";
import { isCoreClientError } from "../core/errors";
import type { PageRouteResult } from "../../shared/page-route";

export type PublicPageResolver = Pick<CorePublicClient, "resolvePage">;

export interface PublicPageHttpFailure {
  readonly statusCode: 400 | 502 | 503;
  readonly statusMessage: string;
}

export async function resolvePublicPageRoute(
  path: string,
  resolver: PublicPageResolver,
): Promise<PageRouteResult> {
  const result = await resolver.resolvePage(path);
  if (result.kind === "page") return { kind: "page", page: result.page };
  if (result.kind === "redirect") {
    return { kind: "redirect", to: result.to, status: result.status };
  }
  return { kind: "not-found" };
}

export function publicPageHttpFailure(error: unknown): PublicPageHttpFailure {
  if (!isCoreClientError(error)) return invalidUpstreamResponse();
  if (error.kind === "invalid-request") {
    return error.code === "invalid_configuration"
      ? unavailable()
      : { statusCode: 400, statusMessage: "Invalid public page request" };
  }
  if (error.kind === "protocol") return invalidUpstreamResponse();
  return unavailable();
}

function invalidUpstreamResponse(): PublicPageHttpFailure {
  return { statusCode: 502, statusMessage: "Invalid public content response" };
}

function unavailable(): PublicPageHttpFailure {
  return { statusCode: 503, statusMessage: "Public content service unavailable" };
}
