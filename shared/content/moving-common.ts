export const MOVING_COMMON_LIMITS = Object.freeze({
  actionLabel: 80,
  href: 2_048,
});

export interface ActionLink {
  readonly label: string;
  readonly href: string;
}

export interface MovingProcessStep {
  readonly title: string;
  readonly description: string;
}

export interface MovingActionSection {
  readonly eyebrow?: string;
  readonly title: string;
  readonly body?: string;
  readonly primaryAction: ActionLink;
  readonly secondaryAction?: ActionLink;
}

/**
 * Reduces an internal public href to a comparable identity, so `/areas/x`,
 * `/areas/x/` and `/areas/x?from=nav` are recognised as the same destination.
 * Returns undefined for anything that is not an internal path, which keeps
 * `tel:`, `mailto:` and external links out of identity comparisons entirely.
 */
export function publicPathIdentity(value: string): string | undefined {
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  const path = value.split("#")[0]?.split("?")[0] ?? "";
  if (path.length === 0) return undefined;
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/**
 * Removes links that point back at the page being rendered. A page listing
 * itself as somewhere else to go is a dead end, and no page should have to know
 * its own name to avoid it.
 */
export function withoutSelfLinks<T extends { readonly href: string }>(
  items: readonly T[],
  currentPath: string,
): readonly T[] {
  const current = publicPathIdentity(currentPath);
  if (current === undefined) return items;
  return Object.freeze(items.filter((item) => publicPathIdentity(item.href) !== current));
}

export function isSafeActionHref(value: string): boolean {
  if (value.length === 0 || value.length > MOVING_COMMON_LIMITS.href || value.trim() !== value ||
    /[\s\u0000-\u001f\u007f\\]/u.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  if (value.startsWith("tel:") || value.startsWith("mailto:")) {
    return value.slice(value.indexOf(":") + 1).length > 0;
  }
  if (!value.startsWith("http://") && !value.startsWith("https://")) return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.hostname.length > 0 && parsed.username === "" && parsed.password === "";
  } catch {
    return false;
  }
}
