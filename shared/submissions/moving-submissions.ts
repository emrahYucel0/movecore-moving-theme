export const MOVING_QUOTE_REQUEST_TYPE = "moving.quote-request" as const;
export const MOVING_CONTACT_REQUEST_TYPE = "moving.contact-request" as const;

export const MOVING_SUBMISSION_LIMITS = Object.freeze({
  name: 120,
  phone: 48,
  email: 254,
  location: 240,
  subject: 160,
  message: 2_000,
  requestedServices: 4,
});

export const MOVING_MOVE_TYPES = Object.freeze([
  "home",
  "office",
  "small-move",
  "other",
] as const);

export const MOVING_PROPERTY_SIZES = Object.freeze([
  "studio-one-bedroom",
  "two-three-bedrooms",
  "four-plus-bedrooms",
  "small-office",
  "large-office",
  "other",
] as const);

export const MOVING_REQUESTED_SERVICES = Object.freeze([
  "packing",
  "furniture-disassembly",
  "storage",
  "special-handling",
] as const);

export type MovingMoveType = typeof MOVING_MOVE_TYPES[number];
export type MovingPropertySize = typeof MOVING_PROPERTY_SIZES[number];
export type MovingRequestedService = typeof MOVING_REQUESTED_SERVICES[number];

export interface MovingQuoteRequestPayload {
  readonly schemaVersion: 1;
  readonly customer: {
    readonly name: string;
    readonly phone: string;
    readonly email?: string;
  };
  readonly move: {
    readonly origin: string;
    readonly destination: string;
    readonly preferredDate?: string;
    readonly moveType: MovingMoveType;
    readonly propertySize?: MovingPropertySize;
  };
  readonly requestedServices: readonly MovingRequestedService[];
  readonly message?: string;
  readonly privacyAcknowledged: true;
}

export interface MovingContactRequestPayload {
  readonly schemaVersion: 1;
  readonly name: string;
  readonly phone?: string;
  readonly email?: string;
  readonly subject?: string;
  readonly message: string;
  readonly privacyAcknowledged: true;
}

export class MovingSubmissionValidationError extends Error {
  public constructor() {
    super("The moving submission does not match the application contract.");
    this.name = "MovingSubmissionValidationError";
  }
}

type BrowserFields = Readonly<Record<string, string | readonly string[]>>;

export function parseMovingQuoteRequest(input: unknown): MovingQuoteRequestPayload {
  const source = exactBrowserFields(input, [
    "name", "phone", "email", "origin", "destination", "preferredDate", "moveType",
    "propertySize", "requestedServices", "message", "privacyAcknowledged", "requestToken",
  ]);
  const email = optionalEmail(scalar(source, "email"));
  const preferredDate = optionalDate(scalar(source, "preferredDate"));
  const propertySize = optionalEnum(
    scalar(source, "propertySize"), MOVING_PROPERTY_SIZES,
  );
  const message = optionalMultiline(scalar(source, "message"), MOVING_SUBMISSION_LIMITS.message);
  const requestedServices = enumArray(
    source["requestedServices"], MOVING_REQUESTED_SERVICES,
    MOVING_SUBMISSION_LIMITS.requestedServices,
  );

  return Object.freeze({
    schemaVersion: 1,
    customer: Object.freeze({
      name: requiredSingleLine(scalar(source, "name"), MOVING_SUBMISSION_LIMITS.name),
      phone: requiredPhone(scalar(source, "phone")),
      ...(email === undefined ? {} : { email }),
    }),
    move: Object.freeze({
      origin: requiredSingleLine(scalar(source, "origin"), MOVING_SUBMISSION_LIMITS.location),
      destination: requiredSingleLine(
        scalar(source, "destination"), MOVING_SUBMISSION_LIMITS.location,
      ),
      ...(preferredDate === undefined ? {} : { preferredDate }),
      moveType: requiredEnum(scalar(source, "moveType"), MOVING_MOVE_TYPES),
      ...(propertySize === undefined ? {} : { propertySize }),
    }),
    requestedServices,
    ...(message === undefined ? {} : { message }),
    privacyAcknowledged: privacyAcknowledgement(scalar(source, "privacyAcknowledged")),
  });
}

export function parseMovingContactRequest(input: unknown): MovingContactRequestPayload {
  const source = exactBrowserFields(input, [
    "name", "phone", "email", "subject", "message", "privacyAcknowledged", "requestToken",
  ]);
  const phone = optionalPhone(scalar(source, "phone"));
  const email = optionalEmail(scalar(source, "email"));
  if (phone === undefined && email === undefined) throw validationError();
  const subject = optionalSingleLine(scalar(source, "subject"), MOVING_SUBMISSION_LIMITS.subject);

  return Object.freeze({
    schemaVersion: 1,
    name: requiredSingleLine(scalar(source, "name"), MOVING_SUBMISSION_LIMITS.name),
    ...(phone === undefined ? {} : { phone }),
    ...(email === undefined ? {} : { email }),
    ...(subject === undefined ? {} : { subject }),
    message: requiredMultiline(scalar(source, "message"), MOVING_SUBMISSION_LIMITS.message),
    privacyAcknowledged: privacyAcknowledgement(scalar(source, "privacyAcknowledged")),
  });
}

export function parseSubmissionRequestToken(input: unknown): string {
  if (typeof input !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(input)) throw validationError();
  const decoded = Buffer.from(input, "base64url");
  if (decoded.length !== 32 || decoded.toString("base64url") !== input) throw validationError();
  return input;
}

function exactBrowserFields(input: unknown, allowed: readonly string[]): BrowserFields {
  if (typeof input !== "object" || input === null || Array.isArray(input)) throw validationError();
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) throw validationError();
  if (Object.getOwnPropertySymbols(input).length > 0) throw validationError();
  const allowedKeys = new Set(allowed);
  for (const key of Object.getOwnPropertyNames(input)) {
    if (!allowedKeys.has(key)) throw validationError();
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor?.get !== undefined || descriptor?.set !== undefined) throw validationError();
    const value = descriptor?.value;
    if (typeof value !== "string" && !validStringArray(value)) throw validationError();
  }
  return input as BrowserFields;
}

function validStringArray(value: unknown): value is readonly string[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length > 0) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index) || typeof value[index] !== "string") {
      return false;
    }
  }
  return true;
}

function scalar(source: BrowserFields, key: string): string | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw validationError();
  return value;
}

function requiredSingleLine(value: string | undefined, maximum: number): string {
  const result = normalized(value, maximum);
  if (result === undefined || /[\u0000-\u001f\u007f]/u.test(result)) throw validationError();
  return result;
}

function optionalSingleLine(value: string | undefined, maximum: number): string | undefined {
  const result = normalized(value, maximum);
  if (result !== undefined && /[\u0000-\u001f\u007f]/u.test(result)) throw validationError();
  return result;
}

function requiredMultiline(value: string | undefined, maximum: number): string {
  const result = normalized(value, maximum);
  if (result === undefined || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(result)) {
    throw validationError();
  }
  return result;
}

function optionalMultiline(value: string | undefined, maximum: number): string | undefined {
  if (value === undefined || value.trim().length === 0) return undefined;
  return requiredMultiline(value, maximum);
}

function normalized(value: string | undefined, maximum: number): string | undefined {
  if (value === undefined) return undefined;
  const result = value.trim();
  if (result.length === 0) return undefined;
  if (result.length > maximum) throw validationError();
  return result;
}

function requiredPhone(value: string | undefined): string {
  const result = optionalPhone(value);
  if (result === undefined) throw validationError();
  return result;
}

function optionalPhone(value: string | undefined): string | undefined {
  const result = optionalSingleLine(value, MOVING_SUBMISSION_LIMITS.phone);
  if (result === undefined) return undefined;
  if (!/^[0-9+(). '\-]+(?:\s*(?:x|ext\.?)[\s0-9]{1,8})?$/iu.test(result)) throw validationError();
  const digits = result.replace(/\D/gu, "");
  if (digits.length < 7 || digits.length > 20) throw validationError();
  return result;
}

function optionalEmail(value: string | undefined): string | undefined {
  const result = optionalSingleLine(value, MOVING_SUBMISSION_LIMITS.email);
  if (result === undefined) return undefined;
  if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u.test(result)) throw validationError();
  return result;
}

function optionalDate(value: string | undefined): string | undefined {
  const result = normalized(value, 10);
  if (result === undefined) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(result);
  if (match === null) throw validationError();
  const date = new Date(`${result}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== result) {
    throw validationError();
  }
  return result;
}

function requiredEnum<const T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
): T[number] {
  const result = optionalEnum(value, allowed);
  if (result === undefined) throw validationError();
  return result;
}

function optionalEnum<const T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
): T[number] | undefined {
  const result = normalized(value, 64);
  if (result === undefined) return undefined;
  if (!allowed.includes(result)) throw validationError();
  return result as T[number];
}

function enumArray<const T extends readonly string[]>(
  value: string | readonly string[] | undefined,
  allowed: T,
  maximum: number,
): readonly T[number][] {
  if (value === undefined) return Object.freeze([]);
  const values = typeof value === "string" ? [value] : value;
  if (values.length > maximum) throw validationError();
  const result = values.map((item) => requiredEnum(item, allowed));
  if (new Set(result).size !== result.length) throw validationError();
  return Object.freeze(result);
}

function privacyAcknowledgement(value: string | undefined): true {
  if (value !== "true") throw validationError();
  return true;
}

function validationError(): MovingSubmissionValidationError {
  return new MovingSubmissionValidationError();
}
