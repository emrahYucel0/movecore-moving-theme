import type { CorePublicClient } from "../core/client";
import { corePublicHttpFailure } from "../core/http-failure";
import type { PageRouteResult } from "../../shared/page-route";
import {
  composeSitePage,
  PublicApplicationContentError,
} from "./application-content";

export type PublicPageResolver = Pick<CorePublicClient, "resolvePage" | "getMedia">;

export interface PublicPageHttpFailure {
  readonly statusCode: 400 | 500 | 502 | 503;
  readonly statusMessage: string;
}

export async function resolvePublicPageRoute(
  path: string,
  resolver: PublicPageResolver,
): Promise<PageRouteResult> {
  const result = await resolver.resolvePage(path);
  if (result.kind === "page") {
    return {
      kind: "page",
      page: {
        seo: result.page.seo,
        content: await composeSitePage(result.page, resolver),
      },
    };
  }
  if (result.kind === "redirect") {
    return { kind: "redirect", to: result.to, status: result.status };
  }
  return { kind: "not-found" };
}

export function publicPageHttpFailure(error: unknown): PublicPageHttpFailure {
  if (error instanceof PublicApplicationContentError) {
    return { statusCode: 500, statusMessage: "Public page content is invalid" };
  }
  const failure = corePublicHttpFailure(error);
  return failure.statusCode === 400
    ? { statusCode: 400, statusMessage: "Invalid public page request" }
    : failure;
}
