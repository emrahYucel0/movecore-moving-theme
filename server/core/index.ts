import { useRuntimeConfig } from "#imports";
import {
  createCorePublicClient,
  type CoreFetch,
  type CorePublicClient,
} from "./client";
import { CoreClientError } from "./errors";

export * from "./client";
export * from "./contracts";
export * from "./errors";

export function useCorePublicClient(fetchImpl?: CoreFetch): CorePublicClient {
  const config = useRuntimeConfig();
  return createCorePublicClient({
    baseUrl: config.coreBaseUrl,
    requestTimeoutMs: privateTimeout(config.coreRequestTimeoutMs),
    ...(fetchImpl === undefined ? {} : { fetch: fetchImpl }),
  });
}

function privateTimeout(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^[1-9][0-9]*$/u.test(value)) return Number(value);
  throw new CoreClientError("invalid-request", { code: "invalid_configuration" });
}
