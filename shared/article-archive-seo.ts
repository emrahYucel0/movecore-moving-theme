import { absolutePublicUrl } from "./public-site-url";

export function articleArchiveCanonicalUrl(siteUrl: string, after?: string): string {
  const canonical = new URL(absolutePublicUrl(siteUrl, "/articles"));
  if (after !== undefined) canonical.searchParams.set("after", after);
  return canonical.toString();
}
