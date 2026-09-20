import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

type ProjectScopeInput = {
  ownerName: string;
  projectName: string;
};

export type CodeBranchPullRequest = {
  ownerName: string;
  projectName: string;
  pullRequestNumber: number;
  state: string;
};

export type CodeBranchListItem = {
  /** Original Git committer timestamp, including time and UTC offset (ISO 8601). */
  commitDate: string;
  commitId: string;
  commitMessage: string;
  commitShortId: string;
  isDefault: boolean;
  name: string;
  pullRequest: CodeBranchPullRequest | null;
  shortName: string;
};

export type CodeBranchPermissions = {
  canDelete: boolean;
  canUpdate: boolean;
};

export type CodeBranchListResponse = {
  branches: CodeBranchListItem[];
  defaultBranch: string;
  noHead: boolean;
  ownerName: string;
  permissions: CodeBranchPermissions;
  projectName: string;
};

function projectPath(input: ProjectScopeInput, suffix = ""): string {
  return `/projects/${encodeURIComponent(input.ownerName)}/${encodeURIComponent(
    input.projectName,
  )}${suffix}`;
}

function normalizeBranchPullRequest(
  pullRequest: Partial<CodeBranchPullRequest> | null | undefined,
): CodeBranchPullRequest | null {
  if (!pullRequest) {
    return null;
  }
  return {
    ownerName: pullRequest.ownerName ?? "",
    projectName: pullRequest.projectName ?? "",
    pullRequestNumber: pullRequest.pullRequestNumber ?? 0,
    state: pullRequest.state ?? "open",
  };
}

function normalizeBranch(branch: Partial<CodeBranchListItem>): CodeBranchListItem {
  return {
    commitDate: branch.commitDate ?? "",
    commitId: branch.commitId ?? "",
    commitMessage: branch.commitMessage ?? "",
    commitShortId: branch.commitShortId ?? "",
    isDefault: branch.isDefault ?? false,
    name: branch.name ?? "",
    pullRequest: normalizeBranchPullRequest(branch.pullRequest),
    shortName: branch.shortName ?? branch.name ?? "",
  };
}

function normalizeBranchListResponse(
  response: Partial<CodeBranchListResponse>,
): CodeBranchListResponse {
  return {
    branches: (response.branches ?? []).map(normalizeBranch),
    defaultBranch: response.defaultBranch ?? "",
    noHead: response.noHead ?? false,
    ownerName: response.ownerName ?? "",
    permissions: {
      canDelete: response.permissions?.canDelete ?? false,
      canUpdate: response.permissions?.canUpdate ?? false,
    },
    projectName: response.projectName ?? "",
  };
}

export async function readCodeBranches(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<CodeBranchListResponse> {
  const payload = await restFetch<Partial<CodeBranchListResponse>>(
    runtimeConfig,
    projectPath(input, "/branches"),
    { fetchImpl, method: "GET" },
  );
  return normalizeBranchListResponse(payload);
}

export function setDefaultCodeBranchRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectScopeInput & { branchName: string },
  fetchImpl: typeof fetch = fetch,
): Promise<CodeBranchListResponse> {
  return restFetch<Partial<CodeBranchListResponse>>(
    runtimeConfig,
    projectPath(input, "/branches/default"),
    {
      body: { branchName: input.branchName },
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  ).then(normalizeBranchListResponse);
}

export function deleteCodeBranchRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectScopeInput & { branchName: string },
  fetchImpl: typeof fetch = fetch,
): Promise<CodeBranchListResponse> {
  return restFetch<Partial<CodeBranchListResponse>>(
    runtimeConfig,
    projectPath(input, "/branches"),
    {
      body: { branchName: input.branchName },
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  ).then(normalizeBranchListResponse);
}

export function codeBranchesQueryOptions(runtimeConfig: RuntimeConfig, input: ProjectScopeInput) {
  return queryOptions({
    placeholderData: keepPreviousData,
    queryFn: () => readCodeBranches(runtimeConfig, input),
    queryKey: apiQueryKeys.project.codeBranches(input.ownerName, input.projectName),
  });
}
