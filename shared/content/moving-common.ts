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
