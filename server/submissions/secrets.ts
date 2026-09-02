import { timingSafeEqual } from "node:crypto";

export interface MovingSubmissionSecrets {
  readonly clientIdentity: Uint8Array;
  readonly coreUpstream: Uint8Array;
}

export class MovingSubmissionConfigurationError extends Error {
  public constructor() {
    super("Moving submission service is unavailable.");
    this.name = "MovingSubmissionConfigurationError";
  }
}

export function parseMovingSubmissionSecrets(input: Readonly<{
  readonly movingSubmissionClientIdentitySecret: unknown;
  readonly coreSubmissionUpstreamSecret: unknown;
}>): MovingSubmissionSecrets {
  const clientIdentity = decodeSecret(input.movingSubmissionClientIdentitySecret);
  const coreUpstream = decodeSecret(input.coreSubmissionUpstreamSecret);
  if (clientIdentity.length === coreUpstream.length && timingSafeEqual(clientIdentity, coreUpstream)) {
    throw configurationError();
  }
  return Object.freeze({ clientIdentity, coreUpstream });
}

export function decodeSecret(value: unknown): Uint8Array {
  if (typeof value !== "string") throw configurationError();
  const unpadded = value.trim().replace(/=+$/u, "");
  if (!/^[A-Za-z0-9_-]+$/u.test(unpadded)) throw configurationError();
  const decoded = Buffer.from(unpadded, "base64url");
  if (decoded.length < 32 || decoded.toString("base64url") !== unpadded) throw configurationError();
  return decoded;
}

function configurationError(): MovingSubmissionConfigurationError {
  return new MovingSubmissionConfigurationError();
}
