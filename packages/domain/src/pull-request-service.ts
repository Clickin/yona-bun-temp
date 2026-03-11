import {
  pullRequestCreateInputSchema,
  pullRequestDetailSchema,
  pullRequestRefSchema,
  pullRequestStateUpdateInputSchema,
  pullRequestSummarySchema,
  type PullRequestCreateInput,
  type PullRequestDetail,
  type PullRequestRef,
  type PullRequestStateUpdateInput,
  type PullRequestSummary,
} from "@yona/contracts";
import {
  createPullRequestRecord,
  listPullRequestsByProject,
  readProjectAuthorization,
  readPullRequestByProjectAndNumber,
  updatePullRequestStateByProjectAndNumber,
} from "@yona/db";
import { authorizeProjectAccess } from "./project-authorization";
import { DomainNotFoundError, DomainPermissionError, type DomainActor } from "./errors";

export interface PullRequestServiceDeps {
  createPullRequestRecord: typeof createPullRequestRecord;
  listPullRequestsByProject: typeof listPullRequestsByProject;
  readProjectAuthorization: typeof readProjectAuthorization;
  readPullRequestByProjectAndNumber: typeof readPullRequestByProjectAndNumber;
  updatePullRequestStateByProjectAndNumber: typeof updatePullRequestStateByProjectAndNumber;
}

const defaultDeps: PullRequestServiceDeps = {
  createPullRequestRecord,
  listPullRequestsByProject,
  readProjectAuthorization,
  readPullRequestByProjectAndNumber,
  updatePullRequestStateByProjectAndNumber,
};

function requireAuthenticatedActor(actor: DomainActor): asserts actor is DomainActor & {
  actorId: number;
  loginId: string;
} {
  if (actor.isAnonymous || actor.actorId === null || actor.loginId === null) {
    throw new DomainPermissionError("Authentication required.", {
      requiresAuthentication: true,
    });
  }
}

async function requireProjectReadAuthorization(
  actor: DomainActor,
  input: {
    ownerName: string;
    projectName: string;
  },
  deps: PullRequestServiceDeps,
) {
  const authorization = await deps.readProjectAuthorization(
    input.ownerName,
    input.projectName,
    actor.actorId,
  );
  if (!authorization) {
    throw new DomainNotFoundError("Project not found.");
  }

  const readDecision = authorizeProjectAccess(
    {
      ...authorization.viewer,
      projectScope: authorization.project.projectScope,
    },
    "read",
  );
  if (!readDecision.allowed) {
    throw new DomainPermissionError("Project read is not allowed.", {
      requiresAuthentication: actor.actorId === null,
    });
  }

  return authorization;
}

async function requireProjectWriteAuthorization(
  actor: DomainActor,
  input: {
    ownerName: string;
    projectName: string;
  },
  deps: PullRequestServiceDeps,
) {
  requireAuthenticatedActor(actor);
  const authorization = await requireProjectReadAuthorization(actor, input, deps);
  const writeDecision = authorizeProjectAccess(
    {
      ...authorization.viewer,
      projectScope: authorization.project.projectScope,
    },
    "update",
  );
  if (!writeDecision.allowed) {
    throw new DomainPermissionError("Project update is not allowed.");
  }

  return authorization;
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
