import { queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

type ProjectScopeInput = {
  ownerName: string;
  projectName: string;
};

export type CodeBrowserResponse = {
  branches: unknown[];
  breadcrumbs: unknown[];
  entries: unknown[];
  file: unknown | null;
  noHead: boolean;
  ownerName: string;
  path: string;
  projectName: string;
  selectedBranch: string;
};

function projectPath(input: ProjectScopeInput, suffix = ""): string {
  return `/projects/${encodeURIComponent(input.ownerName)}/${encodeURIComponent(
    input.projectName,
  )}${suffix}`;
}

function normalizeCodeBrowserResponse(response: Partial<CodeBrowserResponse>): CodeBrowserResponse {
  return {
    branches: response.branches ?? [],
    breadcrumbs: response.breadcrumbs ?? [],
    entries: response.entries ?? [],
    file: response.file ?? null,
    noHead: response.noHead ?? false,
    ownerName: response.ownerName ?? "",
    path: response.path ?? "",
    projectName: response.projectName ?? "",
    selectedBranch: response.selectedBranch ?? "",
  };
}

export async function readCodeBrowser(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & { branch?: string; path?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<CodeBrowserResponse> {
  const search = new URLSearchParams();
  if (input.branch) {
    search.set("branch", input.branch);
  }
  if (input.path) {
    search.set("path", input.path);
  }
  const suffix = search.size > 0 ? `/code?${search.toString()}` : "/code";
  const payload = await restFetch<Partial<CodeBrowserResponse>>(
    runtimeConfig,
    projectPath(input, suffix),
    {
      fetchImpl,
      method: "GET",
    },
  );
  return normalizeCodeBrowserResponse(payload);
}

export function codeBrowserQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & { branch?: string; path?: string },
) {
  return queryOptions({
    queryFn: () => readCodeBrowser(runtimeConfig, input),
    queryKey: apiQueryKeys.project.codeBrowser(input.ownerName, input.projectName, {
      branch: input.branch ?? "",
      path: input.path ?? "",
    }),
  });
}
