import type { H3Event } from "h3";
import { getHeader, readRawBody } from "h3";

export const MOVING_BROWSER_BODY_LIMIT_BYTES = 12 * 1_024;
const FORM_MEDIA_TYPE = "application/x-www-form-urlencoded";

export class MovingBrowserRequestError extends Error {
  public constructor(public readonly statusCode: 400 | 403 | 413 | 415) {
    super("Invalid moving submission request.");
    this.name = "MovingBrowserRequestError";
  }
}

export function validateMovingBrowserPosture(input: Readonly<{
  readonly method: string | undefined;
  readonly contentType: string | undefined;
  readonly origin: string | undefined;
  readonly host: string | undefined;
  readonly siteUrl: string;
  readonly contentLength?: string;
}>): void {
  if (input.method !== "POST") throw requestError(400);
  const contentType = input.contentType?.split(";", 1)[0]?.trim().toLocaleLowerCase("en");
  if (contentType !== FORM_MEDIA_TYPE) throw requestError(415);
  const site = publicSiteOrigin(input.siteUrl);
  if (input.host?.toLocaleLowerCase("en") !== site.host.toLocaleLowerCase("en")) {
    throw requestError(403);
  }
  let origin: URL;
  try {
    origin = new URL(input.origin ?? "");
  } catch {
    throw requestError(403);
  }
  if (origin.origin !== site.origin || origin.href !== `${site.origin}/`) throw requestError(403);
  if (input.contentLength !== undefined) {
    if (!/^(0|[1-9][0-9]*)$/u.test(input.contentLength)) throw requestError(400);
    if (Number(input.contentLength) > MOVING_BROWSER_BODY_LIMIT_BYTES) throw requestError(413);
  }
}

export async function readMovingBrowserForm(
  event: H3Event,
  siteUrl: string,
): Promise<Readonly<Record<string, string | readonly string[]>>> {
  validateMovingBrowserPosture({
    method: event.node.req.method,
    contentType: getHeader(event, "content-type"),
    origin: getHeader(event, "origin"),
    host: getHeader(event, "host"),
    siteUrl,
    ...(getHeader(event, "content-length") === undefined
      ? {}
      : { contentLength: getHeader(event, "content-length") }),
  });
  const raw = await readRawBody(event, "utf8");
  if (raw === undefined || Buffer.byteLength(raw, "utf8") > MOVING_BROWSER_BODY_LIMIT_BYTES) {
    throw requestError(raw === undefined ? 400 : 413);
  }
  return parseMovingUrlEncoded(raw);
}

export function parseMovingUrlEncoded(
  raw: string,
): Readonly<Record<string, string | readonly string[]>> {
  if (Buffer.byteLength(raw, "utf8") > MOVING_BROWSER_BODY_LIMIT_BYTES ||
    /%(?![0-9A-Fa-f]{2})/u.test(raw)) throw requestError(
    Buffer.byteLength(raw, "utf8") > MOVING_BROWSER_BODY_LIMIT_BYTES ? 413 : 400,
  );
  const parameters = new URLSearchParams(raw);
  if ([...parameters].length > 32) throw requestError(400);
  const result: Record<string, string | readonly string[]> = Object.create(null);
  for (const key of new Set(parameters.keys())) {
    const values = parameters.getAll(key);
    result[key] = values.length === 1 ? values[0] ?? "" : Object.freeze(values);
  }
  return Object.freeze(result);
}

function publicSiteOrigin(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw requestError(403);
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username !== "" ||
    url.password !== "" || url.search !== "" || url.hash !== "" || url.pathname !== "/") {
    throw requestError(403);
  }
  return url;
}

function requestError(statusCode: 400 | 403 | 413 | 415): MovingBrowserRequestError {
  return new MovingBrowserRequestError(statusCode);
}
