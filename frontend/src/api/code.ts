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
