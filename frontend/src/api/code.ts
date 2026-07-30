import { queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

type ProjectScopeInput = {
  ownerName: string;
  projectName: string;
};

export type CodeTagItem = {
  commitDate?: string;
  commitId: string;
  commitMessage: string;
  commitShortId: string;
  createdDate: string;
  creatorEmail: string;
  creatorName: string;
  name: string;
  shortName: string;
};

export type CodeTagPermissions = {
  canCreate: boolean;
  canDelete: boolean;
};

export type CodeTagListResponse = {
  noHead: boolean;
  ownerName: string;
  permissions: CodeTagPermissions;
  projectName: string;
  tags: CodeTagItem[];
};

function projectPath(input: ProjectScopeInput, suffix = ""): string {
  return `/projects/${encodeURIComponent(input.ownerName)}/${encodeURIComponent(
    input.projectName,
  )}${suffix}`;
}

function normalizeTag(tag: Partial<CodeTagItem>): CodeTagItem {
  return {
    commitId: tag.commitId ?? "",
    commitMessage: tag.commitMessage ?? "",
    commitShortId: tag.commitShortId ?? "",
    createdDate: tag.createdDate ?? "",
    creatorEmail: tag.creatorEmail ?? "",
    creatorName: tag.creatorName ?? "",
    name: tag.name ?? "",
    shortName: tag.shortName ?? tag.name ?? "",
  };
}

function normalizeTagListResponse(response: Partial<CodeTagListResponse>): CodeTagListResponse {
  return {
    noHead: response.noHead ?? false,
    ownerName: response.ownerName ?? "",
    permissions: {
      canCreate: response.permissions?.canCreate ?? false,
      canDelete: response.permissions?.canDelete ?? false,
    },
    projectName: response.projectName ?? "",
    tags: (response.tags ?? []).map(normalizeTag),
  };
}

export async function readCodeTags(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<CodeTagListResponse> {
  const payload = await restFetch<Partial<CodeTagListResponse>>(
    runtimeConfig,
    projectPath(input, "/tags"),
    { fetchImpl, method: "GET" },
  );
  return normalizeTagListResponse(payload);
}

export function createCodeTag(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectScopeInput & { message?: string; tagName: string; target?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<CodeTagListResponse> {
  return restFetch<Partial<CodeTagListResponse>>(runtimeConfig, projectPath(input, "/tags"), {
    body: { message: input.message, tagName: input.tagName, target: input.target },
    csrfToken,
    fetchImpl,
    method: "POST",
  }).then(normalizeTagListResponse);
}

export function deleteCodeTag(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectScopeInput & { tagName: string },
  fetchImpl: typeof fetch = fetch,
): Promise<CodeTagListResponse> {
  return restFetch<Partial<CodeTagListResponse>>(runtimeConfig, projectPath(input, "/tags"), {
    body: { tagName: input.tagName },
    csrfToken,
    fetchImpl,
    method: "DELETE",
  }).then(normalizeTagListResponse);
}

export function codeTagsQueryOptions(runtimeConfig: RuntimeConfig, input: ProjectScopeInput) {
  return queryOptions({
    queryFn: () => readCodeTags(runtimeConfig, input),
    queryKey: [...apiQueryKeys.project.base(input.ownerName, input.projectName), "tags"] as const,
  });
}

export type CodeBlameRecord = {
  authorAvatarUrl: string;
  authorDate: string;
  authorEmail: string;
  authorName: string;
  commitId: string;
  commitMessage: string;
  commitShortId: string;
  content: string;
  lineNumber: number;
};

export type CodeBlameResponse = {
  lines: CodeBlameRecord[];
  ownerName: string;
  path: string;
  projectName: string;
  selectedBranch: string;
};

export async function readCodeBlame(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & { branch: string; filePath: string },
  fetchImpl: typeof fetch = fetch,
): Promise<CodeBlameResponse> {
  return restFetch<CodeBlameResponse>(
    runtimeConfig,
    `/projects/${encodeURIComponent(input.ownerName)}/${encodeURIComponent(
      input.projectName,
    )}/code/${encodeURIComponent(input.branch)}/blame/${input.filePath}`,
    { fetchImpl, method: "GET" },
  );
}

export function codeBlameQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & { branch: string; filePath: string; enabled?: boolean },
) {
  return queryOptions({
    enabled: input.enabled ?? true,
    queryFn: () => readCodeBlame(runtimeConfig, input),
    queryKey: [
      ...apiQueryKeys.project.base(input.ownerName, input.projectName),
      "code",
      input.branch,
      "blame",
      input.filePath,
    ] as const,
  });
}

export type RestCommitDetail = {
  branches?: Array<{ name: string }>;
  breadcrumbs?: Array<{ name: string; path: string }>;
  commit?: {
    authorDate: string;
    authorEmail: string;
    authorName: string;
    commentCount: number;
    commitId: string;
    commitShortId: string;
    message: string;
    shortMessage: string;
  } | null;
  deletions: number;
  files?: Array<{ patch: string; path: string }>;
  filesChanged: number;
  insertions: number;
  isWatching?: boolean;
  noHead?: boolean;
  ownerName?: string;
  parentCommit?: { commitId: string; commitShortId: string } | null;
  path?: string;
  permissions?: {
    canComment: boolean;
    canUpdateThreadState: boolean;
  };
  projectName?: string;
  selectedBranch?: string;
};

export async function readCommitFileDiff(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & { commitId: string; filepath: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ patch: string; path: string }> {
  const encodedPath = input.filepath.split("/").map(encodeURIComponent).join("/");
  return restFetch<{ patch: string; path: string }>(
    runtimeConfig,
    `/projects/${encodeURIComponent(input.ownerName)}/${encodeURIComponent(
      input.projectName,
    )}/commit/${encodeURIComponent(input.commitId)}/files/${encodedPath}`,
    { fetchImpl, method: "GET" },
  );
}

export type CodeFindFileResult = {
  ownerName: string;
  paths: string[];
  projectName: string;
  query: string;
  selectedBranch: string;
};

export type CodeGrepMatch = {
  content: string;
  lineNumber: number;
  path: string;
};

export type CodeGrepResult = {
  matches: CodeGrepMatch[];
  ownerName: string;
  projectName: string;
  query: string;
  selectedBranch: string;
};

export async function findCodeFiles(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & { branch: string; query?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<CodeFindFileResult> {
  const queryParam = input.query ? `?q=${encodeURIComponent(input.query)}` : "";
  return restFetch<CodeFindFileResult>(
    runtimeConfig,
    `/projects/${encodeURIComponent(input.ownerName)}/${encodeURIComponent(
      input.projectName,
    )}/code/${encodeURIComponent(input.branch)}/find${queryParam}`,
    { fetchImpl, method: "GET" },
  );
}

export function codeFindFilesQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & { branch: string; query?: string; enabled?: boolean },
) {
  return queryOptions({
    enabled: input.enabled ?? true,
    queryFn: () => findCodeFiles(runtimeConfig, input),
    queryKey: [
      ...apiQueryKeys.project.base(input.ownerName, input.projectName),
      "code",
      input.branch,
      "find",
      input.query ?? "",
    ] as const,
  });
}

export async function grepCodeFiles(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & { branch: string; query: string },
  fetchImpl: typeof fetch = fetch,
): Promise<CodeGrepResult> {
  const queryParam = `?q=${encodeURIComponent(input.query)}`;
  return restFetch<CodeGrepResult>(
    runtimeConfig,
    `/projects/${encodeURIComponent(input.ownerName)}/${encodeURIComponent(
      input.projectName,
    )}/code/${encodeURIComponent(input.branch)}/grep${queryParam}`,
    { fetchImpl, method: "GET" },
  );
}

export function codeGrepFilesQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & { branch: string; query: string; enabled?: boolean },
) {
  return queryOptions({
    enabled: (input.enabled ?? true) && input.query.trim().length > 0,
    queryFn: () => grepCodeFiles(runtimeConfig, input),
    queryKey: [
      ...apiQueryKeys.project.base(input.ownerName, input.projectName),
      "code",
      input.branch,
      "grep",
      input.query,
    ] as const,
  });
}
