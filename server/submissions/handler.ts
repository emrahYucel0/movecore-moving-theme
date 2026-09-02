import type { H3Event } from "h3";
import { createError, sendRedirect } from "h3";
import {
  MOVING_CONTACT_REQUEST_TYPE,
  MOVING_QUOTE_REQUEST_TYPE,
  MovingSubmissionValidationError,
  parseMovingContactRequest,
  parseMovingQuoteRequest,
  parseSubmissionRequestToken,
} from "../../shared/submissions/moving-submissions";
import { readMovingBrowserForm, MovingBrowserRequestError } from "./browser-boundary";
import { submitToCore } from "./core-client";
import { resolveMovingAnonymousIdentity } from "./identity";
import { MovingSubmissionConfigurationError, parseMovingSubmissionSecrets } from "./secrets";

type SubmissionKind = "quote" | "contact";

export async function handleMovingSubmission(event: H3Event, kind: SubmissionKind): Promise<unknown> {
  const config = useRuntimeConfig(event);
  let fields: Readonly<Record<string, string | readonly string[]>>;
  try {
    fields = await readMovingBrowserForm(event, config.public.siteUrl);
  } catch (error: unknown) {
    if (error instanceof MovingBrowserRequestError) {
      throw createError({ statusCode: error.statusCode, statusMessage: "Invalid form request" });
    }
    throw createError({ statusCode: 400, statusMessage: "Invalid form request" });
  }

  let requestToken: string;
  let payload;
  try {
    const rawToken = fields["requestToken"];
    requestToken = parseSubmissionRequestToken(Array.isArray(rawToken) ? undefined : rawToken);
    payload = kind === "quote"
      ? parseMovingQuoteRequest(fields)
      : parseMovingContactRequest(fields);
  } catch (error: unknown) {
    if (error instanceof MovingSubmissionValidationError) {
      return sendRedirect(event, `/${kind}?status=invalid`, 303);
    }
    return sendRedirect(event, `/${kind}?status=unavailable`, 303);
  }

  try {
    const secrets = parseMovingSubmissionSecrets(config);
    const identity = resolveMovingAnonymousIdentity(
      event, secrets.clientIdentity, new URL(config.public.siteUrl).protocol === "https:",
    );
    const result = await submitToCore({
      coreBaseUrl: config.coreBaseUrl,
      requestTimeoutMs: config.coreRequestTimeoutMs,
      upstreamSecret: secrets.coreUpstream,
      coreClientPseudonym: identity.coreClientPseudonym,
      idempotencyKey: requestToken,
      type: kind === "quote" ? MOVING_QUOTE_REQUEST_TYPE : MOVING_CONTACT_REQUEST_TYPE,
      payload,
    });
    if (result.kind === "accepted") return sendRedirect(event, `/${kind}?submitted=1`, 303);
    if (result.kind === "rate-limited") {
      return sendRedirect(event, `/${kind}?status=rate-limited`, 303);
    }
    return sendRedirect(event, `/${kind}?status=unavailable`, 303);
  } catch (error: unknown) {
    if (error instanceof MovingSubmissionConfigurationError || error instanceof TypeError) {
      return sendRedirect(event, `/${kind}?status=unavailable`, 303);
    }
    return sendRedirect(event, `/${kind}?status=unavailable`, 303);
  }
}
