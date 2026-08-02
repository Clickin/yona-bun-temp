import type {
  ListProjectMilestonesResponse,
  ProjectMilestoneDeleteResponse,
  ProjectMilestoneMutationResponse,
} from "./types";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

type ProjectScope = {
  ownerName: string;
  projectName: string;
};

export type ProjectMilestoneListOptions = {
  includeDetails?: boolean;
  orderBy?: string;
  orderDir?: string;
  state?: string;
};

export function listProjectMilestonesQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectScope & ProjectMilestoneListOptions,
) {
  const options = {
    includeDetails: input.includeDetails ?? true,
    orderBy: input.orderBy ?? "dueDate",
    orderDir: input.orderDir ?? "asc",
    state: input.state ?? "open",
  };
  return queryOptions({
    gcTime: 15 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: () =>
      listProjectMilestonesRest(runtimeConfig, input.ownerName, input.projectName, options),
    queryKey: apiQueryKeys.project.milestones(input.ownerName, input.projectName, options),
    staleTime: 5 * 60_000,
  });
}

type ProjectMilestoneInput = ProjectScope & {
  attachmentIds?: Array<bigint | number>;
  contentsMarkdown?: string;
  dueDate?: string;
  milestoneId: bigint | number;
  state?: string;
  title?: string;
};

function toInt64Number(value: bigint | number): number {
  return Number(value);
}

function toInt64Array(values: Array<bigint | number> | undefined): number[] {
  return (values ?? []).map(toInt64Number);
}

function projectPath(ownerName: string, projectName: string, suffix = ""): string {
  return `/owners/${encodeURIComponent(ownerName)}/projects/${encodeURIComponent(projectName)}${suffix}`;
}

function milestonePath(
  input: ProjectScope & { milestoneId: bigint | number },
  suffix = "",
): string {
  return `${projectPath(input.ownerName, input.projectName)}/milestones/${toInt64Number(
    input.milestoneId,
  )}${suffix}`;
}

function milestoneBody(input: ProjectMilestoneInput) {
  return {
    attachmentIds: toInt64Array(input.attachmentIds),
    contentsMarkdown: input.contentsMarkdown ?? "",
    dueDate: input.dueDate ?? "",
    state: input.state ?? "open",
    title: input.title ?? "",
  };
}

function normalizeMilestone(milestone: NonNullable<ProjectMilestoneMutationResponse["milestone"]>) {
  const normalizeMilestoneIssue = (item: NonNullable<typeof milestone.openIssues>[number]) => ({
    ...item,
    assigneeLabel: item.assigneeLabel ?? "",
    commentCount: item.commentCount ?? 0,
    issueNumber: item.issueNumber ?? "0",
    labels: item.labels ?? [],
    state: item.state ?? "",
    title: item.title ?? "",
    updatedLabel: item.updatedLabel ?? "",
  });

  return {
    ...milestone,
    closedIssueCount: milestone.closedIssueCount ?? 0,
    completionPercent: milestone.completionPercent ?? 0,
    contentsHtml: milestone.contentsHtml ?? "",
    contentsMarkdown: milestone.contentsMarkdown ?? "",
    dueDateLabel: milestone.dueDateLabel ?? "",
    id: milestone.id ?? "0",
    openIssueCount: milestone.openIssueCount ?? 0,
    state: milestone.state ?? "",
    title: milestone.title ?? "",
    viewerCanDelete: milestone.viewerCanDelete ?? false,
    viewerCanUpdate: milestone.viewerCanUpdate ?? false,
    attachments: milestone.attachments ?? [],
    closedIssues: (milestone.closedIssues ?? []).map(normalizeMilestoneIssue),
    openIssues: (milestone.openIssues ?? []).map(normalizeMilestoneIssue),
  };
}

function normalizeMilestoneListResponse(
  response: ListProjectMilestonesResponse,
): ListProjectMilestonesResponse {
  return {
    ...response,
    milestones: (response.milestones ?? []).map(normalizeMilestone),
  };
}

function normalizeMilestoneMutationResponse(
  response: ProjectMilestoneMutationResponse,
): ProjectMilestoneMutationResponse {
  return {
    ...response,
    milestone: response.milestone ? normalizeMilestone(response.milestone) : response.milestone,
  };
}

export function listProjectMilestonesRest(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  input: ProjectMilestoneListOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ListProjectMilestonesResponse> {
  const searchParams = new URLSearchParams({
    orderBy: input.orderBy ?? "dueDate",
    orderDir: input.orderDir ?? "asc",
    state: input.state ?? "open",
  });
  if (input.includeDetails !== undefined) {
    searchParams.set("includeDetails", String(input.includeDetails));
  }
  return restFetch<ListProjectMilestonesResponse>(
    runtimeConfig,
    `${projectPath(ownerName, projectName)}/milestones?${searchParams.toString()}`,
    {
      fetchImpl,
      method: "GET",
    },
  ).then(normalizeMilestoneListResponse);
}

export function readProjectMilestoneRest(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  milestoneId: bigint | number,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneMutationResponse> {
  return restFetch<ProjectMilestoneMutationResponse>(
    runtimeConfig,
    milestonePath({ milestoneId, ownerName, projectName }),
    {
      fetchImpl,
      method: "GET",
    },
  ).then(normalizeMilestoneMutationResponse);
}

export function createProjectMilestoneRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectScope & {
    attachmentIds?: Array<bigint | number>;
    contentsMarkdown?: string;
    dueDate?: string;
    state?: string;
    title: string;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneMutationResponse> {
  return restFetch<ProjectMilestoneMutationResponse>(
    runtimeConfig,
    `${projectPath(input.ownerName, input.projectName)}/milestones`,
    {
      body: milestoneBody({ ...input, milestoneId: 0 }),
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  ).then(normalizeMilestoneMutationResponse);
}

export function updateProjectMilestoneRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectMilestoneInput & { title: string },
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneMutationResponse> {
  return restFetch<ProjectMilestoneMutationResponse>(runtimeConfig, milestonePath(input), {
    body: milestoneBody(input),
    csrfToken,
    fetchImpl,
    method: "PATCH",
  }).then(normalizeMilestoneMutationResponse);
}

export function deleteProjectMilestoneRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectScope & { milestoneId: bigint | number },
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneDeleteResponse> {
  return restFetch<ProjectMilestoneDeleteResponse>(runtimeConfig, milestonePath(input), {
    csrfToken,
    fetchImpl,
    method: "DELETE",
  });
}

export function openProjectMilestoneRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectScope & { milestoneId: bigint | number },
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneMutationResponse> {
  return restFetch<ProjectMilestoneMutationResponse>(
    runtimeConfig,
    `${milestonePath(input)}/state`,
    {
      body: {
        state: "open",
      },
      csrfToken,
      fetchImpl,
      method: "PATCH",
    },
  ).then(normalizeMilestoneMutationResponse);
}

export function closeProjectMilestoneRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectScope & { milestoneId: bigint | number },
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneMutationResponse> {
  return restFetch<ProjectMilestoneMutationResponse>(
    runtimeConfig,
    `${milestonePath(input)}/state`,
    {
      body: {
        state: "closed",
      },
      csrfToken,
      fetchImpl,
      method: "PATCH",
    },
  ).then(normalizeMilestoneMutationResponse);
}
