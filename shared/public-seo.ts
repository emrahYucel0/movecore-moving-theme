export function robotsDirective(index: boolean, follow: boolean): string {
  return `${index ? "index" : "noindex"},${follow ? "follow" : "nofollow"}`;
}
