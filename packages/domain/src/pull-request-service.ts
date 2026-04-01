import {
  pullRequestCreateInputSchema,
  pullRequestDetailSchema,
  pullRequestRefSchema,
  pullRequestReviewCountsSchema,
  pullRequestReviewThreadFilterInputSchema,
  pullRequestReviewThreadSchema,
  pullRequestStateUpdateInputSchema,
  pullRequestSummarySchema,
  type PullRequestCreateInput,
  type PullRequestDetail,
  type PullRequestRef,
  type PullRequestReviewCounts,
  type PullRequestReviewThread,
  type PullRequestReviewThreadFilterInput,
  type PullRequestStateUpdateInput,
  type PullRequestSummary,
} from "@yona/contracts";
import {
  createPullRequestRecord,
  listPullRequestReviewThreadsByProject,
  listPullRequestsByProject,
  readProjectAuthorization,
  readPullRequestByProjectAndNumber,
  readPullRequestReviewCountsByProject,
  updatePullRequestStateByProjectAndNumber,
} from "@yona/db";
import { requireAuthenticatedActor } from "./actor-utils";
import { DomainNotFoundError, DomainValidationError, type DomainActor } from "./errors";
import {
  requireProjectReadAuthorization,
  requireProjectWriteAuthorization,
} from "./project-authorization";

export interface PullRequestServiceDeps {
  createPullRequestRecord: typeof createPullRequestRecord;
  listPullRequestReviewThreadsByProject: typeof listPullRequestReviewThreadsByProject;
  listPullRequestsByProject: typeof listPullRequestsByProject;
  readProjectAuthorization: typeof readProjectAuthorization;
  readPullRequestByProjectAndNumber: typeof readPullRequestByProjectAndNumber;
  readPullRequestReviewCountsByProject: typeof readPullRequestReviewCountsByProject;
  updatePullRequestStateByProjectAndNumber: typeof updatePullRequestStateByProjectAndNumber;
}

const defaultDeps: PullRequestServiceDeps = {
  createPullRequestRecord,
  listPullRequestReviewThreadsByProject,
  listPullRequestsByProject,
  readProjectAuthorization,
  readPullRequestByProjectAndNumber,
  readPullRequestReviewCountsByProject,
  updatePullRequestStateByProjectAndNumber,
};

function matchesReviewThreadFilter(
  thread: PullRequestReviewThread,
  input: PullRequestReviewThreadFilterInput,
): boolean {
  if (input.state && thread.state !== input.state) {
    return false;
  }

  if (input.authorLoginId && thread.authorLoginId !== input.authorLoginId) {
    return false;
  }

  if (input.participantLoginId && !thread.participants.includes(input.participantLoginId)) {
    return false;
  }

  if (!input.filter) {
    return true;
  }

  const normalizedFilter = input.filter.toLowerCase();
  const searchValues = [thread.commitId, thread.path, thread.text]
    .filter((value): value is string => value !== null)
    .map((value) => value.toLowerCase());

  return searchValues.some((value) => value.includes(normalizedFilter));
}

export async function listPullRequests(
  actor: DomainActor,
  input: {
    ownerName: string;
    projectName: string;
  },
  deps: PullRequestServiceDeps = defaultDeps,
): Promise<PullRequestSummary[]> {
  const authorization = await requireProjectReadAuthorization(actor, input, deps);
  return pullRequestSummarySchema
    .array()
    .parse(
      await deps.listPullRequestsByProject(
        authorization.project.id,
        authorization.project.ownerName,
        authorization.project.projectName,
      ),
    );
}

export async function readPullRequestDetail(
  actor: DomainActor,
  input: PullRequestRef,
  deps: PullRequestServiceDeps = defaultDeps,
): Promise<PullRequestDetail> {
  const parsedInput = pullRequestRefSchema.parse(input);
  const authorization = await requireProjectReadAuthorization(actor, parsedInput, deps);

  const pullRequest = await deps.readPullRequestByProjectAndNumber(
    authorization.project.id,
    parsedInput.pullRequestNumber,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!pullRequest) {
    throw new DomainNotFoundError("Pull request not found.");
  }

  return pullRequestDetailSchema.parse(pullRequest);
}

export async function readPullRequestReviewThreads(
  actor: DomainActor,
  input: PullRequestReviewThreadFilterInput,
  deps: PullRequestServiceDeps = defaultDeps,
): Promise<PullRequestReviewThread[]> {
  const parsedInput = pullRequestReviewThreadFilterInputSchema.parse(input);
  const authorization = await requireProjectReadAuthorization(actor, parsedInput, deps);

  return pullRequestReviewThreadSchema.array().parse(
    (
      await deps.listPullRequestReviewThreadsByProject({
        authorLoginId: parsedInput.authorLoginId,
        filter: parsedInput.filter,
        orderBy: parsedInput.orderBy,
        orderDir: parsedInput.orderDir,
        participantLoginId: parsedInput.participantLoginId,
        projectId: authorization.project.id,
        projectName: authorization.project.projectName,
        state: parsedInput.state,
      })
    ).filter((thread) => matchesReviewThreadFilter(thread, parsedInput)),
  );
}

export async function readPullRequestReviewCounts(
  actor: DomainActor,
  input: PullRequestReviewThreadFilterInput,
  deps: PullRequestServiceDeps = defaultDeps,
): Promise<PullRequestReviewCounts> {
  requireAuthenticatedActor(actor);
  const parsedInput = pullRequestReviewThreadFilterInputSchema.parse(input);
  const authorization = await requireProjectReadAuthorization(actor, parsedInput, deps);

  return pullRequestReviewCountsSchema.parse(
    await deps.readPullRequestReviewCountsByProject({
      authorLoginId: parsedInput.authorLoginId,
      currentLoginId: actor.loginId,
      filter: parsedInput.filter,
      participantLoginId: parsedInput.participantLoginId,
      projectId: authorization.project.id,
      state: parsedInput.state,
    }),
  );
}

export const listPullRequestReviewThreads = readPullRequestReviewThreads;

export async function createPullRequest(
  actor: DomainActor,
  input: PullRequestCreateInput,
  deps: PullRequestServiceDeps = defaultDeps,
): Promise<PullRequestDetail> {
  requireAuthenticatedActor(actor);
  const parsedInput = pullRequestCreateInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);
  const pullRequestNumber = await deps.createPullRequestRecord({
    body: parsedInput.body,
    contributorId: actor.actorId,
    fromBranch: parsedInput.fromBranch,
    projectId: authorization.project.id,
    title: parsedInput.title,
    toBranch: parsedInput.toBranch,
  });

  return readPullRequestDetail(
    actor,
    {
      ownerName: parsedInput.ownerName,
      projectName: parsedInput.projectName,
      pullRequestNumber,
    },
    deps,
  );
}

export async function updatePullRequestState(
  actor: DomainActor,
  input: PullRequestStateUpdateInput,
  deps: PullRequestServiceDeps = defaultDeps,
): Promise<PullRequestDetail> {
  requireAuthenticatedActor(actor);
  const parsedInput = pullRequestStateUpdateInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);

  const currentPullRequest = await deps.readPullRequestByProjectAndNumber(
    authorization.project.id,
    parsedInput.pullRequestNumber,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!currentPullRequest) {
    throw new DomainNotFoundError("Pull request not found.");
  }

  if (parsedInput.state === "open" && currentPullRequest.state === "open") {
    throw new DomainValidationError("Pull request is already open.");
  }

  await deps.updatePullRequestStateByProjectAndNumber({
    projectId: authorization.project.id,
    pullRequestNumber: parsedInput.pullRequestNumber,
    state: parsedInput.state,
  });

  return readPullRequestDetail(
    actor,
    {
      ownerName: parsedInput.ownerName,
      projectName: parsedInput.projectName,
      pullRequestNumber: parsedInput.pullRequestNumber,
    },
    deps,
  );
}
