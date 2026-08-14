import { queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

type ProjectScopeInput = {
  ownerName: string;
  projectName: string;
};

export type CodeBrowserResponse = {
  branches: CodeBrowserBranch[];
  breadcrumbs: CodeBrowserBreadcrumb[];
  entries: CodeBrowserEntry[];
  file: unknown | null;
  noHead: boolean;
  ownerName: string;
  path: string;
  projectName: string;
  selectedBranch: string;
};

export type CodeBrowserBranch = {
  name: string;
};

export type CodeBrowserBreadcrumb = {
  name: string;
  path: string;
};

export type CodeBrowserEntry = {
  commitDate: string;
  commitMessage: string;
  commitShortId: string;
  kind: string;
  name: string;
  path: string;
};

function projectPath(input: ProjectScopeInput, suffix = ""): string {
  return `/projects/${encodeURIComponent(input.ownerName)}/${encodeURIComponent(
    input.projectName,
  )}${suffix}`;
}

function normalizeBranch(branch: Partial<CodeBrowserBranch>): CodeBrowserBranch {
  return {
    name: branch.name ?? "",
  };
}

function normalizeBreadcrumb(breadcrumb: Partial<CodeBrowserBreadcrumb>): CodeBrowserBreadcrumb {
  return {
    name: breadcrumb.name ?? "",
    path: breadcrumb.path ?? "",
  };
}

function normalizeEntry(entry: Partial<CodeBrowserEntry>): CodeBrowserEntry {
  return {
    commitDate: entry.commitDate ?? "",
    commitMessage: entry.commitMessage ?? "",
    commitShortId: entry.commitShortId ?? "",
    kind: entry.kind ?? "",
    name: entry.name ?? "",
    path: entry.path ?? "",
  };
}

function normalizeCodeBrowserResponse(response: Partial<CodeBrowserResponse>): CodeBrowserResponse {
  return {
    branches: (response.branches ?? []).map(normalizeBranch),
    breadcrumbs: (response.breadcrumbs ?? []).map(normalizeBreadcrumb),
    entries: (response.entries ?? []).map(normalizeEntry),
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
    // retry: 0 — legacy CodeApp answers 404 immediately; also the TanStack
    // Query retryer pauses between attempts while the document is unfocused,
    // so a retrying 404 never reaches isError in hidden WTR iframes (missing
    // svn README title gate).
    queryFn: () => readCodeBrowser(runtimeConfig, input),
    queryKey: apiQueryKeys.project.codeBrowser(input.ownerName, input.projectName, {
      branch: input.branch ?? "",
      path: input.path ?? "",
    }),
    retry: 0,
  });
}
