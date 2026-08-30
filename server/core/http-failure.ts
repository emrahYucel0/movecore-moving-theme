import { isCoreClientError } from "./errors";

export interface CorePublicHttpFailure {
  readonly statusCode: 400 | 502 | 503;
  readonly statusMessage: string;
}

export function corePublicHttpFailure(error: unknown): CorePublicHttpFailure {
  if (!isCoreClientError(error)) return invalidUpstreamResponse();
  if (error.kind === "invalid-request") {
    return error.code === "invalid_configuration"
      ? unavailable()
      : { statusCode: 400, statusMessage: "Invalid public content request" };
  }
  if (error.kind === "protocol") return invalidUpstreamResponse();
  return unavailable();
}

function invalidUpstreamResponse(): CorePublicHttpFailure {
  return { statusCode: 502, statusMessage: "Invalid public content response" };
}

function unavailable(): CorePublicHttpFailure {
  return { statusCode: 503, statusMessage: "Public content service unavailable" };
}
