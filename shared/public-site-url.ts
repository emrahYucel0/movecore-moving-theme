export class PublicSiteConfigurationError extends Error {
  public constructor() {
    super("Public site configuration is invalid.");
    this.name = "PublicSiteConfigurationError";
  }
}

export function parsePublicSiteOrigin(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) throw configurationError();
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw configurationError();
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw configurationError();
  }
  return url.origin;
}

export function absolutePublicUrl(siteOrigin: string, canonicalPath: string): string {
  const origin = parsePublicSiteOrigin(siteOrigin);
  if (
    !canonicalPath.startsWith("/") ||
    canonicalPath.startsWith("//") ||
    /[?#\u0000-\u001f]/u.test(canonicalPath)
  ) {
    throw configurationError();
  }
  return `${origin}${canonicalPath}`;
}

function configurationError(): PublicSiteConfigurationError {
  return new PublicSiteConfigurationError();
}
