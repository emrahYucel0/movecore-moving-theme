const MOVING_SUBMISSION_PATHS = new Set([
  "/api/moving/quote",
  "/api/moving/contact",
]);

export default defineEventHandler((event) => {
  if (!MOVING_SUBMISSION_PATHS.has(getRequestURL(event).pathname) ||
    event.node.req.method === "POST") return;
  setResponseHeader(event, "allow", "POST");
  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
