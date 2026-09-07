import { useCorePublicClient } from "../../core";
import { listMovingArticleArchive } from "../../articles/archive";
import { publicPageHttpFailure } from "../../public-page/route";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const keys = Object.keys(query);
  if (
    keys.some((key) => key !== "after") ||
    (query.after !== undefined && typeof query.after !== "string")
  ) {
    throw createError({ statusCode: 400, statusMessage: "Invalid article archive request" });
  }

  try {
    return await listMovingArticleArchive(useCorePublicClient(), query.after);
  } catch (error: unknown) {
    const failure = publicPageHttpFailure(error);
    throw createError({
      statusCode: failure.statusCode,
      statusMessage: failure.statusMessage,
    });
  }
});
