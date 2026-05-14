import type {
  ListProjectLabelCategoriesResponse,
  ListProjectLabelsResponse,
  ProjectLabelCategoryMutationResponse,
  ProjectLabelMutationResponse,
} from "../gen/yona/pilot/v1/pilot_pb";
import { queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

type ProjectScope = {
  ownerName: string;
  projectName: string;
};

type ProjectLabelInput = ProjectScope & {
  categoryId: bigint | number;
  labelColor: string;
  labelId: bigint | number;
  labelName: string;
};

type ProjectLabelCreateInput = ProjectScope & {
  categoryIsExclusive?: boolean;
  categoryName: string;
  labelColor: string;
  labelName: string;
};

type ProjectLabelCategoryInput = ProjectScope & {
  categoryId: bigint | number;
  categoryIsExclusive: boolean;
  categoryName: string;
};

type ProjectLabelCopyInput = ProjectScope & {
  fromOwnerName: string;
  fromProjectName: string;
};

export type ProjectLabelCopyResponse = {
  copied: number;
  labels: ListProjectLabelsResponse["labels"];
  skipped: number;
};

function toInt64Number(value: bigint | number): number {
  return Number(value);
}

function projectPath(ownerName: string, projectName: string, suffix = ""): string {
  return `/owners/${encodeURIComponent(ownerName)}/projects/${encodeURIComponent(projectName)}${suffix}`;
}

function normalizeLabelListResponse(
  response: ListProjectLabelsResponse,
): ListProjectLabelsResponse {
  return {
    ...response,
    labels: response.labels ?? [],
  };
}

function normalizeCategoryListResponse(
  response: ListProjectLabelCategoriesResponse,
): ListProjectLabelCategoriesResponse {
  return {
    ...response,
    categories: response.categories ?? [],
  };
}

export function listProjectLabelsRest(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ListProjectLabelsResponse> {
  return restFetch<ListProjectLabelsResponse>(
    runtimeConfig,
    `${projectPath(ownerName, projectName)}/labels`,
    {
      fetchImpl,
      method: "GET",
    },
  ).then(normalizeLabelListResponse);
}

export function listProjectLabelsQueryOptions(runtimeConfig: RuntimeConfig, input: ProjectScope) {
  return queryOptions({
    queryFn: () => listProjectLabelsRest(runtimeConfig, input.ownerName, input.projectName),
    queryKey: apiQueryKeys.project.labels(input.ownerName, input.projectName),
  });
}

export function listProjectLabelCategoriesRest(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ListProjectLabelCategoriesResponse> {
  return restFetch<ListProjectLabelCategoriesResponse>(
    runtimeConfig,
    `${projectPath(ownerName, projectName)}/labels/categories`,
    {
      fetchImpl,
      method: "GET",
    },
  ).then(normalizeCategoryListResponse);
}

export function createProjectLabelRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectLabelCreateInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectLabelMutationResponse> {
  return restFetch<ProjectLabelMutationResponse>(
    runtimeConfig,
    `${projectPath(input.ownerName, input.projectName)}/labels`,
    {
      body: {
        categoryIsExclusive: input.categoryIsExclusive ?? false,
        categoryName: input.categoryName,
        labelColor: input.labelColor,
        labelName: input.labelName,
      },
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function updateProjectLabelRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectLabelInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectLabelMutationResponse> {
  return restFetch<ProjectLabelMutationResponse>(
    runtimeConfig,
    `${projectPath(input.ownerName, input.projectName)}/labels/${toInt64Number(input.labelId)}`,
    {
      body: {
        categoryId: toInt64Number(input.categoryId),
        labelColor: input.labelColor,
        labelName: input.labelName,
      },
      csrfToken,
      fetchImpl,
      method: "PATCH",
    },
  );
}

export async function deleteProjectLabelRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectScope & { labelId: bigint | number },
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await restFetch(
    runtimeConfig,
    `${projectPath(input.ownerName, input.projectName)}/labels/${toInt64Number(input.labelId)}`,
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  );
}

export function copyProjectLabelsRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectLabelCopyInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectLabelCopyResponse> {
  return restFetch<ProjectLabelCopyResponse>(
    runtimeConfig,
    `${projectPath(input.ownerName, input.projectName)}/labels/copy`,
    {
      body: {
        fromOwnerName: input.fromOwnerName,
        fromProjectName: input.fromProjectName,
      },
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function createProjectLabelCategoryRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectScope & { categoryIsExclusive?: boolean; categoryName: string },
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectLabelCategoryMutationResponse> {
  return restFetch<ProjectLabelCategoryMutationResponse>(
    runtimeConfig,
    `${projectPath(input.ownerName, input.projectName)}/labels/categories`,
    {
      body: {
        categoryIsExclusive: input.categoryIsExclusive ?? false,
        categoryName: input.categoryName,
      },
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function updateProjectLabelCategoryRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectLabelCategoryInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectLabelCategoryMutationResponse> {
  return restFetch<ProjectLabelCategoryMutationResponse>(
    runtimeConfig,
    `${projectPath(input.ownerName, input.projectName)}/labels/categories/${toInt64Number(input.categoryId)}`,
    {
      body: {
        categoryIsExclusive: input.categoryIsExclusive,
        categoryName: input.categoryName,
      },
      csrfToken,
      fetchImpl,
      method: "PATCH",
    },
  );
}

export async function deleteProjectLabelCategoryRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectScope & { categoryId: bigint | number },
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await restFetch(
    runtimeConfig,
    `${projectPath(input.ownerName, input.projectName)}/labels/categories/${toInt64Number(input.categoryId)}`,
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  );
}
