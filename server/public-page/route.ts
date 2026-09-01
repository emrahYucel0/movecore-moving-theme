import type { CorePublicClient } from "../core/client";
import { corePublicHttpFailure } from "../core/http-failure";
import type { PageRouteResult } from "../../shared/page-route";
import {
  composeMovingHome,
  composeMovingAreas,
  composeMovingFaq,
  composeMovingLocation,
  composeMovingService,
  composeMovingServices,
  composeMovingTestimonials,
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
    if (result.page.content.type === "site.page") {
      return {
        kind: "page",
        page: {
          type: "site.page",
          seo: result.page.seo,
          content: await composeSitePage(result.page, resolver),
        },
      };
    }
    if (result.page.content.type === "moving.home") {
      return {
        kind: "page",
        page: {
          type: "moving.home",
          seo: result.page.seo,
          content: await composeMovingHome(result.page, resolver),
        },
      };
    }
    if (result.page.content.type === "moving.service") {
      return {
        kind: "page",
        page: {
          type: "moving.service",
          seo: result.page.seo,
          content: await composeMovingService(result.page, resolver),
        },
      };
    }
    if (result.page.content.type === "moving.location") {
      return {
        kind: "page",
        page: {
          type: "moving.location",
          seo: result.page.seo,
          content: await composeMovingLocation(result.page, resolver),
        },
      };
    }
    if (result.page.content.type === "moving.services") {
      return {
        kind: "page",
        page: {
          type: "moving.services",
          seo: result.page.seo,
          content: await composeMovingServices(result.page, resolver),
        },
      };
    }
    if (result.page.content.type === "moving.areas") {
      return {
        kind: "page",
        page: {
          type: "moving.areas",
          seo: result.page.seo,
          content: await composeMovingAreas(result.page, resolver),
        },
      };
    }
    if (result.page.content.type === "moving.faq") {
      return {
        kind: "page",
        page: {
          type: "moving.faq",
          seo: result.page.seo,
          content: await composeMovingFaq(result.page, resolver),
        },
      };
    }
    if (result.page.content.type === "moving.testimonials") {
      return {
        kind: "page",
        page: {
          type: "moving.testimonials",
          seo: result.page.seo,
          content: await composeMovingTestimonials(result.page, resolver),
        },
      };
    }
    throw new PublicApplicationContentError();
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
