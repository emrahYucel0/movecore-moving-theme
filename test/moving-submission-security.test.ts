import { describe, expect, it, vi } from "vitest";
import {
  MOVING_BROWSER_BODY_LIMIT_BYTES,
  MovingBrowserRequestError,
  parseMovingUrlEncoded,
  validateMovingBrowserPosture,
} from "../server/submissions/browser-boundary";
import {
  deriveCoreClientPseudonym,
  parseIdentityCookie,
  serializeIdentityCookie,
} from "../server/submissions/identity";
import { parseMovingSubmissionSecrets } from "../server/submissions/secrets";
import { signCoreSubmission } from "../server/submissions/signer";
import { submitToCore } from "../server/submissions/core-client";

const VECTOR_SECRET = "AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA";
const VECTOR_CLIENT = "ifx3yOl8hp_36r1L_5M_KbAWEE4Vn3oRjJa6wWq1xcQ";
const VECTOR_BODY = '{"type":"application.request","payload":{"message":"Example"}}';

describe("R2.9B trusted Core submission security", () => {
  it("reproduces the independent Core deterministic signing vector", () => {
    const proof = signCoreSubmission({
      secret: Buffer.from(VECTOR_SECRET, "base64url"),
      bodyBytes: Buffer.from(VECTOR_BODY, "utf8"),
      timestamp: "1788256800",
      client: VECTOR_CLIENT,
      idempotencyKey: "example-request-1",
    });
    expect(proof.bodyHash).toBe("f26dee866ca74d5a6fd719cf1241a47a4568b7e9bd5bd05521e640711eb90a47");
    expect(proof.signature).toBe("v1=65f12b30b5e7c564e9733cfa639d3ee9fd52796c18fc7dfc09c575fd2e2213c3");
    expect(proof.canonical.endsWith("\n")).toBe(false);
  });

  it("binds body, timestamp, client, and exact idempotency key", () => {
    const base = {
      secret: Buffer.from(VECTOR_SECRET, "base64url"),
      bodyBytes: Buffer.from(VECTOR_BODY),
      timestamp: "1788256800",
      client: VECTOR_CLIENT,
      idempotencyKey: "example-request-1",
    };
    const signature = signCoreSubmission(base).signature;
    expect(signCoreSubmission({ ...base, bodyBytes: Buffer.from(`${VECTOR_BODY} `) }).signature).not.toBe(signature);
    expect(signCoreSubmission({ ...base, timestamp: "1788256801" }).signature).not.toBe(signature);
    expect(signCoreSubmission({ ...base, idempotencyKey: "example-request-2" }).signature).not.toBe(signature);
  });

  it("keeps identity and upstream secrets strong and independent", () => {
    const identity = Buffer.alloc(32, 12).toString("base64url");
    const parsed = parseMovingSubmissionSecrets({
      movingSubmissionClientIdentitySecret: identity,
      coreSubmissionUpstreamSecret: VECTOR_SECRET,
    });
    expect(parsed.clientIdentity).toHaveLength(32);
    expect(parsed.coreUpstream).toHaveLength(32);
    expect(() => parseMovingSubmissionSecrets({
      movingSubmissionClientIdentitySecret: VECTOR_SECRET,
      coreSubmissionUpstreamSecret: VECTOR_SECRET,
    })).toThrow("Moving submission service is unavailable");
    expect(() => parseMovingSubmissionSecrets({
      movingSubmissionClientIdentitySecret: "weak",
      coreSubmissionUpstreamSecret: VECTOR_SECRET,
    })).toThrow("Moving submission service is unavailable");
  });

  it("authenticates the first-party identity cookie and derives isolated pseudonyms", () => {
    const secret = Buffer.alloc(32, 13);
    const first = Buffer.alloc(32, 21).toString("base64url");
    const second = Buffer.alloc(32, 22).toString("base64url");
    const cookie = serializeIdentityCookie(first, secret);
    expect(parseIdentityCookie(cookie, secret)).toBe(first);
    expect(parseIdentityCookie(`${cookie.slice(0, -1)}x`, secret)).toBeUndefined();
    const firstPseudonym = deriveCoreClientPseudonym(first, secret);
    expect(firstPseudonym).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(deriveCoreClientPseudonym(first, secret)).toBe(firstPseudonym);
    expect(deriveCoreClientPseudonym(second, secret)).not.toBe(firstPseudonym);
    expect(firstPseudonym).not.toContain(first);
  });

  it("enforces same-origin native form posture and bounded urlencoded projection", () => {
    const valid = {
      method: "POST",
      contentType: "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://moving.example.test",
      host: "moving.example.test",
      siteUrl: "https://moving.example.test",
      contentLength: "80",
    };
    expect(() => validateMovingBrowserPosture(valid)).not.toThrow();
    for (const input of [
      { ...valid, method: "GET" },
      { ...valid, contentType: "application/json" },
      { ...valid, origin: "https://evil.example.test" },
      { ...valid, host: "evil.example.test" },
      { ...valid, contentLength: String(MOVING_BROWSER_BODY_LIMIT_BYTES + 1) },
    ]) expect(() => validateMovingBrowserPosture(input)).toThrow(MovingBrowserRequestError);
    expect(parseMovingUrlEncoded("name=Jamie&requestedServices=packing&requestedServices=storage"))
      .toEqual({ name: "Jamie", requestedServices: ["packing", "storage"] });
    expect(() => parseMovingUrlEncoded("name=%zz")).toThrow(MovingBrowserRequestError);
  });

  it("serializes once, replaces browser proof attempts, and accepts only a strict Core receipt", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = String(init?.body);
      expect(body).toBe('{"type":"moving.contact-request","payload":{"schemaVersion":1,"name":"Jamie","phone":"+12025550199","message":"Hello","privacyAcknowledged":true}}');
      const headers = new Headers(init?.headers);
      expect(headers.get("core-submission-client")).toBe(VECTOR_CLIENT);
      expect(headers.get("core-submission-signature")).toMatch(/^v1=[0-9a-f]{64}$/u);
      expect(headers.get("idempotency-key")).toBe("request-token-1");
      expect(headers.has("x-forwarded-for")).toBe(false);
      return new Response(JSON.stringify({ data: {
        id: "submission-1",
        type: "moving.contact-request",
        status: "received",
        createdAt: "2026-09-02T00:00:00.000Z",
        replayed: false,
      } }), { status: 201, headers: { "content-type": "application/json" } });
    });
    const result = await submitToCore({
      coreBaseUrl: "https://core.example.test",
      requestTimeoutMs: 1_000,
      upstreamSecret: Buffer.from(VECTOR_SECRET, "base64url"),
      coreClientPseudonym: VECTOR_CLIENT,
      idempotencyKey: "request-token-1",
      type: "moving.contact-request",
      payload: {
        schemaVersion: 1,
        name: "Jamie",
        phone: "+12025550199",
        message: "Hello",
        privacyAcknowledged: true,
      },
      clock: () => 1_788_256_800_000,
      fetch: fetchMock as typeof fetch,
    });
    expect(result).toMatchObject({ kind: "accepted", receipt: { id: "submission-1", replayed: false } });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    [429, "rate-limited"],
    [401, "unavailable"],
    [503, "unavailable"],
  ] as const)("maps Core %s to a safe %s result", async (status, kind) => {
    const result = await submitToCore({
      coreBaseUrl: "https://core.example.test",
      requestTimeoutMs: 1_000,
      upstreamSecret: Buffer.from(VECTOR_SECRET, "base64url"),
      coreClientPseudonym: VECTOR_CLIENT,
      idempotencyKey: "request-token-1",
      type: "moving.contact-request",
      payload: { schemaVersion: 1, name: "A", phone: "+12025550199", message: "M", privacyAcknowledged: true },
      fetch: (async () => new Response("{}", { status })) as typeof fetch,
    });
    expect(result.kind).toBe(kind);
  });
});
