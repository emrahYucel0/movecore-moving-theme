export type CoreClientErrorKind =
  | "invalid-request"
  | "unavailable"
  | "network"
  | "timeout"
  | "protocol";

interface CoreClientErrorDetails {
  readonly status?: number;
  readonly code?: string;
}

const messages: Readonly<Record<CoreClientErrorKind, string>> = {
  "invalid-request": "The Core public request is invalid.",
  unavailable: "The Core public service is temporarily unavailable.",
  network: "The Core public service could not be reached.",
  timeout: "The Core public request timed out.",
  protocol: "The Core public response did not match the expected contract.",
};

export class CoreClientError extends Error {
  public readonly kind: CoreClientErrorKind;
  public readonly status?: number;
  public readonly code?: string;

  public constructor(kind: CoreClientErrorKind, details: CoreClientErrorDetails = {}) {
    super(messages[kind]);
    this.name = "CoreClientError";
    this.kind = kind;
    if (details.status !== undefined) this.status = details.status;
    if (details.code !== undefined) this.code = details.code;
  }
}

export function isCoreClientError(error: unknown): error is CoreClientError {
  return error instanceof CoreClientError;
}
