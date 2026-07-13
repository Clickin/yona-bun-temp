import { queryOptions } from "@tanstack/react-query";
import type { ReadCurrentSessionResponse } from "./types";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

export function readCurrentSessionRest(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadCurrentSessionResponse> {
  return restFetch<ReadCurrentSessionResponse>(runtimeConfig, "/session", {
    fetchImpl,
    method: "GET",
  });
}

export function currentSessionQueryOptions(runtimeConfig: RuntimeConfig) {
  return queryOptions({
    gcTime: Infinity,
    queryFn: () => readCurrentSessionRest(runtimeConfig),
    queryKey: apiQueryKeys.session(),
    staleTime: Infinity,
  });
}
