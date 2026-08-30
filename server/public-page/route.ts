import type { CorePublicClient } from "../core/client";
import { corePublicHttpFailure } from "../core/http-failure";
import type { PageRouteResult } from "../../shared/page-route";

export type PublicPageResolver = Pick<CorePublicClient, "resolvePage">;

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

export function publicPageHttpFailure(error: unknown): ReturnType<typeof corePublicHttpFailure> {
  const failure = corePublicHttpFailure(error);
  return failure.statusCode === 400
    ? { statusCode: 400, statusMessage: "Invalid public page request" }
    : failure;
}
