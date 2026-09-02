import { describe, expect, it } from "vitest";
import {
  MovingSubmissionValidationError,
  parseMovingContactRequest,
  parseMovingQuoteRequest,
  parseSubmissionRequestToken,
} from "../shared/submissions/moving-submissions";

describe("R2.9B moving submission contracts", () => {
  it("projects a bounded quote request into the explicit v1 payload", () => {
    const payload = parseMovingQuoteRequest(quoteFields());
    expect(payload).toEqual({
      schemaVersion: 1,
      customer: { name: "Jamie Rivera", phone: "+1 (202) 555-0199", email: "jamie@example.test" },
      move: {
        origin: "12 Example Street",
        destination: "84 Sample Avenue",
        preferredDate: "2026-10-12",
        moveType: "home",
        propertySize: "two-three-bedrooms",
      },
      requestedServices: ["packing", "special-handling"],
      message: "A lift is available at the destination.",
      privacyAcknowledged: true,
    });
    expect(Object.isFrozen(payload)).toBe(true);
    expect(Object.isFrozen(payload.customer)).toBe(true);
    expect(Object.isFrozen(payload.requestedServices)).toBe(true);
  });

  it("keeps optional quote fields genuinely optional", () => {
    const fields = quoteFields();
    for (const key of ["email", "preferredDate", "propertySize", "requestedServices", "message"]) {
      delete fields[key];
    }
    expect(parseMovingQuoteRequest(fields)).toMatchObject({
      schemaVersion: 1,
      customer: { name: "Jamie Rivera", phone: "+1 (202) 555-0199" },
      move: { moveType: "home" },
      requestedServices: [],
      privacyAcknowledged: true,
    });
  });

  it.each([
    ["missing required field", () => parseMovingQuoteRequest({ ...quoteFields(), phone: "" })],
    ["unknown property", () => parseMovingQuoteRequest({ ...quoteFields(), price: "1" })],
    ["invalid move enum", () => parseMovingQuoteRequest({ ...quoteFields(), moveType: "international" })],
    ["invalid property enum", () => parseMovingQuoteRequest({ ...quoteFields(), propertySize: "mansion" })],
    ["invalid date", () => parseMovingQuoteRequest({ ...quoteFields(), preferredDate: "2026-02-30" })],
    ["malformed phone", () => parseMovingQuoteRequest({ ...quoteFields(), phone: "call me maybe" })],
    ["malformed email", () => parseMovingQuoteRequest({ ...quoteFields(), email: "not-an-email" })],
    ["privacy not exact", () => parseMovingQuoteRequest({ ...quoteFields(), privacyAcknowledged: "on" })],
    ["duplicate service", () => parseMovingQuoteRequest({
      ...quoteFields(), requestedServices: ["packing", "packing"],
    })],
    ["unbounded text", () => parseMovingQuoteRequest({ ...quoteFields(), message: "x".repeat(2_001) })],
  ])("rejects %s", (_label, run) => {
    expect(run).toThrow(MovingSubmissionValidationError);
  });

  it("accepts contact requests with either usable contact method", () => {
    expect(parseMovingContactRequest(contactFields())).toEqual({
      schemaVersion: 1,
      name: "Morgan Lee",
      phone: "+44 20 7946 0958",
      subject: "Access question",
      message: "Can your team work with a timed loading bay?",
      privacyAcknowledged: true,
    });
    expect(parseMovingContactRequest({
      ...contactFields(), phone: "", email: "morgan@example.test",
    })).toMatchObject({ email: "morgan@example.test" });
  });

  it.each([
    ["no contact method", { ...contactFields(), phone: "", email: "" }],
    ["missing message", { ...contactFields(), message: "" }],
    ["control character", { ...contactFields(), subject: "hello\u0000world" }],
    ["duplicate scalar", { ...contactFields(), phone: ["123456789", "987654321"] }],
  ])("rejects contact request with %s", (_label, fields) => {
    expect(() => parseMovingContactRequest(fields)).toThrow(MovingSubmissionValidationError);
  });

  it("rejects accessors, unexpected prototypes, and sparse repeated values", () => {
    const accessor = quoteFields();
    Object.defineProperty(accessor, "name", { get: () => "unsafe", enumerable: true });
    expect(() => parseMovingQuoteRequest(accessor)).toThrow(MovingSubmissionValidationError);
    expect(() => parseMovingQuoteRequest(Object.assign(new Date(), quoteFields())))
      .toThrow(MovingSubmissionValidationError);
    const sparse = Array(2) as string[];
    sparse[1] = "packing";
    expect(() => parseMovingQuoteRequest({ ...quoteFields(), requestedServices: sparse }))
      .toThrow(MovingSubmissionValidationError);
  });

  it("accepts only a canonical cryptorandom-sized request token", () => {
    const token = Buffer.alloc(32, 7).toString("base64url");
    expect(parseSubmissionRequestToken(token)).toBe(token);
    for (const invalid of ["", "short", `${token}=`, token.slice(1), [token]]) {
      expect(() => parseSubmissionRequestToken(invalid)).toThrow(MovingSubmissionValidationError);
    }
  });
});

function quoteFields(): Record<string, string | readonly string[]> {
  return {
    name: " Jamie Rivera ",
    phone: "+1 (202) 555-0199",
    email: "jamie@example.test",
    origin: "12 Example Street",
    destination: "84 Sample Avenue",
    preferredDate: "2026-10-12",
    moveType: "home",
    propertySize: "two-three-bedrooms",
    requestedServices: ["packing", "special-handling"],
    message: "A lift is available at the destination.",
    privacyAcknowledged: "true",
    requestToken: Buffer.alloc(32, 9).toString("base64url"),
  };
}

function contactFields(): Record<string, string | readonly string[]> {
  return {
    name: "Morgan Lee",
    phone: "+44 20 7946 0958",
    email: "",
    subject: "Access question",
    message: "Can your team work with a timed loading bay?",
    privacyAcknowledged: "true",
    requestToken: Buffer.alloc(32, 11).toString("base64url"),
  };
}
