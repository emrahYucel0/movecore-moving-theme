import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { H3Event } from "h3";
import { getCookie, setCookie } from "h3";

const COOKIE_NAME = "movecore_submission_client";
const COOKIE_VERSION = "v1";
const COOKIE_CONTEXT = "moving-submission-cookie-v1";
const PSEUDONYM_CONTEXT = "moving-submission-core-client-v1";

export interface MovingAnonymousIdentity {
  readonly anonymousId: string;
  readonly coreClientPseudonym: string;
  readonly created: boolean;
}

export function resolveMovingAnonymousIdentity(
  event: H3Event,
  secret: Uint8Array,
  secureCookie: boolean,
): MovingAnonymousIdentity {
  const current = parseIdentityCookie(getCookie(event, COOKIE_NAME), secret);
  const anonymousId = current ?? randomBytes(32).toString("base64url");
  if (current === undefined) {
    setCookie(event, COOKIE_NAME, serializeIdentityCookie(anonymousId, secret), {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
    });
  }
  return Object.freeze({
    anonymousId,
    coreClientPseudonym: deriveCoreClientPseudonym(anonymousId, secret),
    created: current === undefined,
  });
}

export function serializeIdentityCookie(anonymousId: string, secret: Uint8Array): string {
  requireAnonymousId(anonymousId);
  return `${COOKIE_VERSION}.${anonymousId}.${cookieSignature(anonymousId, secret)}`;
}

export function parseIdentityCookie(value: string | undefined, secret: Uint8Array): string | undefined {
  if (value === undefined) return undefined;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== COOKIE_VERSION) return undefined;
  const anonymousId = parts[1];
  const supplied = parts[2];
  if (anonymousId === undefined || supplied === undefined || !isCanonical32Bytes(anonymousId) ||
    !isCanonical32Bytes(supplied)) return undefined;
  const expected = cookieSignature(anonymousId, secret);
  const suppliedBytes = Buffer.from(supplied, "base64url");
  const expectedBytes = Buffer.from(expected, "base64url");
  if (!timingSafeEqual(suppliedBytes, expectedBytes)) return undefined;
  return anonymousId;
}

export function deriveCoreClientPseudonym(anonymousId: string, secret: Uint8Array): string {
  requireAnonymousId(anonymousId);
  return createHmac("sha256", secret)
    .update(`${PSEUDONYM_CONTEXT}\n${anonymousId}`, "utf8")
    .digest("base64url");
}

function cookieSignature(anonymousId: string, secret: Uint8Array): string {
  return createHmac("sha256", secret)
    .update(`${COOKIE_CONTEXT}\n${anonymousId}`, "utf8")
    .digest("base64url");
}

function requireAnonymousId(value: string): void {
  if (!isCanonical32Bytes(value)) throw new TypeError("Invalid anonymous submission identity.");
}

function isCanonical32Bytes(value: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(value)) return false;
  const decoded = Buffer.from(value, "base64url");
  return decoded.length === 32 && decoded.toString("base64url") === value;
}
