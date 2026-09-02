import { createHash, createHmac } from "node:crypto";

const PROTOCOL = "core-cms-submission-upstream-v1";
const METHOD = "POST";
const PATH = "/v1/submissions";

export interface CoreSubmissionProof {
  readonly timestamp: string;
  readonly client: string;
  readonly signature: string;
  readonly bodyHash: string;
  readonly canonical: string;
}

export function signCoreSubmission(input: Readonly<{
  readonly secret: Uint8Array;
  readonly bodyBytes: Uint8Array;
  readonly timestamp: string;
  readonly client: string;
  readonly idempotencyKey?: string;
}>): CoreSubmissionProof {
  requireTimestamp(input.timestamp);
  requireClient(input.client);
  const idempotency = input.idempotencyKey === undefined
    ? "0:"
    : `1:${requireIdempotencyKey(input.idempotencyKey)}`;
  const bodyHash = createHash("sha256").update(input.bodyBytes).digest("hex");
  const canonical = [
    PROTOCOL,
    METHOD,
    PATH,
    input.timestamp,
    input.client,
    idempotency,
    bodyHash,
  ].join("\n");
  const signature = `v1=${createHmac("sha256", input.secret).update(canonical, "utf8").digest("hex")}`;
  return Object.freeze({ timestamp: input.timestamp, client: input.client, signature, bodyHash, canonical });
}

function requireTimestamp(value: string): void {
  if (!/^[1-9][0-9]{0,9}$/u.test(value)) throw new TypeError("Invalid Core submission timestamp.");
}

function requireClient(value: string): void {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(value)) throw new TypeError("Invalid Core client identity.");
  const decoded = Buffer.from(value, "base64url");
  if (decoded.length !== 32 || decoded.toString("base64url") !== value) {
    throw new TypeError("Invalid Core client identity.");
  }
}

function requireIdempotencyKey(value: string): string {
  if (value.length < 1 || value.length > 128 || !/^[\x21-\x7e]+$/u.test(value)) {
    throw new TypeError("Invalid Core idempotency key.");
  }
  return value;
}
