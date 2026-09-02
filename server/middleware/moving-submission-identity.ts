import { resolveMovingAnonymousIdentity } from "../submissions/identity";
import { parseMovingSubmissionSecrets } from "../submissions/secrets";

export default defineEventHandler((event) => {
  if (event.node.req.method !== "GET") return;
  const pathname = getRequestURL(event).pathname;
  if (pathname !== "/quote" && pathname !== "/contact") return;
  try {
    const config = useRuntimeConfig(event);
    const secrets = parseMovingSubmissionSecrets(config);
    resolveMovingAnonymousIdentity(
      event,
      secrets.clientIdentity,
      new URL(config.public.siteUrl).protocol === "https:",
    );
  } catch {
    // The page stays available with safe unavailable-state handling on submit.
  }
});
