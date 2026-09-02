import type {
  MovingContactRequestPayload,
  MovingQuoteRequestPayload,
} from "../../shared/submissions/moving-submissions";
import { signCoreSubmission } from "./signer";

export type MovingSubmissionPayload = MovingQuoteRequestPayload | MovingContactRequestPayload;

export interface CoreSubmissionReceipt {
  readonly id: string;
  readonly type: string;
  readonly status: "received";
  readonly createdAt: string;
  readonly replayed: boolean;
}

export type CoreSubmissionResult =
  | { readonly kind: "accepted"; readonly receipt: CoreSubmissionReceipt }
  | { readonly kind: "rate-limited" }
  | { readonly kind: "unavailable" };

export async function submitToCore(input: Readonly<{
  readonly coreBaseUrl: string;
  readonly requestTimeoutMs: number;
  readonly upstreamSecret: Uint8Array;
  readonly coreClientPseudonym: string;
  readonly idempotencyKey: string;
  readonly type: "moving.quote-request" | "moving.contact-request";
  readonly payload: MovingSubmissionPayload;
  readonly clock?: () => number;
  readonly fetch?: typeof globalThis.fetch;
}>): Promise<CoreSubmissionResult> {
  const baseUrl = coreBaseUrl(input.coreBaseUrl);
  const body = JSON.stringify({ type: input.type, payload: input.payload });
  const bodyBytes = Buffer.from(body, "utf8");
  const timestamp = String(Math.floor((input.clock?.() ?? Date.now()) / 1_000));
  const proof = signCoreSubmission({
    secret: input.upstreamSecret,
    bodyBytes,
    timestamp,
    client: input.coreClientPseudonym,
    idempotencyKey: input.idempotencyKey,
  });
  const signal = AbortSignal.timeout(requestTimeout(input.requestTimeoutMs));
  let response: Response;
  try {
    response = await (input.fetch ?? globalThis.fetch)(new URL("/v1/submissions", baseUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": input.idempotencyKey,
        "core-submission-client": proof.client,
        "core-submission-timestamp": proof.timestamp,
        "core-submission-signature": proof.signature,
      },
      body,
      signal,
    });
  } catch {
    return Object.freeze({ kind: "unavailable" });
  }
  if (response.status === 429) return Object.freeze({ kind: "rate-limited" });
  if (response.status !== 200 && response.status !== 201) {
    return Object.freeze({ kind: "unavailable" });
  }
  try {
    const receipt = parseReceipt(await response.json(), input.type, response.status);
    return Object.freeze({ kind: "accepted", receipt });
  } catch {
    return Object.freeze({ kind: "unavailable" });
  }
}

function parseReceipt(input: unknown, type: string, status: number): CoreSubmissionReceipt {
  const source = record(input);
  exactKeys(source, ["data"]);
  const data = record(source["data"]);
  exactKeys(data, ["id", "type", "status", "createdAt", "replayed"]);
  if (typeof data["id"] !== "string" || data["id"].length === 0 || data["type"] !== type ||
    data["status"] !== "received" || typeof data["createdAt"] !== "string" ||
    typeof data["replayed"] !== "boolean" || (status === 201 && data["replayed"] !== false) ||
    (status === 200 && data["replayed"] !== true)) throw new TypeError("Invalid Core receipt.");
  return Object.freeze({
    id: data["id"],
    type,
    status: "received",
    createdAt: data["createdAt"],
    replayed: data["replayed"],
  });
}

function coreBaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("Invalid private Core configuration.");
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username !== "" ||
    url.password !== "" || url.search !== "" || url.hash !== "" || url.pathname !== "/") {
    throw new TypeError("Invalid private Core configuration.");
  }
  return url;
}

function requestTimeout(value: number): number {
  if (!Number.isSafeInteger(value) || value < 100 || value > 30_000) {
    throw new TypeError("Invalid private Core timeout configuration.");
  }
  return value;
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Invalid Core response.");
  }
  return value as Readonly<Record<string, unknown>>;
}

function exactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError("Invalid Core response.");
  }
}
