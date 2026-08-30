import { useCorePublicClient } from "../../core";
import {
  publicPageHttpFailure,
  resolvePublicPageRoute,
} from "../../public-page/route";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const keys = Object.keys(query);
  if (keys.length !== 1 || keys[0] !== "path" || typeof query.path !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid public page request",
    });
  }

  try {
    return await resolvePublicPageRoute(query.path, useCorePublicClient());
  } catch (error: unknown) {
    const failure = publicPageHttpFailure(error);
    throw createError({
      statusCode: failure.statusCode,
      statusMessage: failure.statusMessage,
    });
  }
});
