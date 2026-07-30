import type { RuntimeConfig } from "../runtime-config";
import { restFetch } from "./rest-client";

export interface BulkDeleteInput {
  ids: string[];
}

export interface BulkDeleteResponse {
  count: number;
  ok: boolean;
}

export function bulkDeleteUsers(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ids: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<BulkDeleteResponse> {
  return restFetch<BulkDeleteResponse>(runtimeConfig, "/site/users/bulk-delete", {
    body: { ids },
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}

export function bulkDeleteProjects(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ids: string[] | number[],
  fetchImpl: typeof fetch = fetch,
): Promise<BulkDeleteResponse> {
  const stringIds = ids.map((id) => String(id));
  return restFetch<BulkDeleteResponse>(runtimeConfig, "/site/projects/bulk-delete", {
    body: { ids: stringIds },
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}
