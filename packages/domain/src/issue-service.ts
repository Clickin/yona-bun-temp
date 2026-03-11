import {
  issueCommentCreateInputSchema,
  issueDetailSchema,
  issueRefSchema,
  issueStateUpdateInputSchema,
  issueSummarySchema,
  type IssueCommentCreateInput,
  type IssueDetail,
  type IssueRef,
  type IssueStateUpdateInput,
  type IssueSummary,
} from "@yona/contracts";
import {
  createIssueCommentRecord,
  createIssueRecord,
  listIssuesByProject,
  readIssueByProjectAndNumber,
  readIssueIdByProjectAndNumber,
  readProjectAuthorization,
  updateIssueStateByProjectAndNumber,
} from "@yona/db";
import { authorizeProjectAccess } from "./project-authorization";
import { DomainNotFoundError, DomainPermissionError, type DomainActor } from "./errors";

export interface IssueServiceDeps {
  createIssueCommentRecord: typeof createIssueCommentRecord;
  createIssueRecord: typeof createIssueRecord;
  listIssuesByProject: typeof listIssuesByProject;
  readIssueByProjectAndNumber: typeof readIssueByProjectAndNumber;
  readIssueIdByProjectAndNumber: typeof readIssueIdByProjectAndNumber;
  readProjectAuthorization: typeof readProjectAuthorization;
  updateIssueStateByProjectAndNumber: typeof updateIssueStateByProjectAndNumber;
}

const defaultDeps: IssueServiceDeps = {
  createIssueCommentRecord,
  createIssueRecord,
  listIssuesByProject,
  readIssueByProjectAndNumber,
  readIssueIdByProjectAndNumber,
  readProjectAuthorization,
  updateIssueStateByProjectAndNumber,
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
  deps: IssueServiceDeps,
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
  deps: IssueServiceDeps,
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

export async function listIssues(
  actor: DomainActor,
  input: {
    ownerName: string;
    projectName: string;
  },
  deps: IssueServiceDeps = defaultDeps,
): Promise<IssueSummary[]> {
  const authorization = await requireProjectReadAuthorization(actor, input, deps);
  return issueSummarySchema
    .array()
    .parse(
      await deps.listIssuesByProject(
        authorization.project.id,
        authorization.project.ownerName,
        authorization.project.projectName,
      ),
    );
}

export async function readIssueDetail(
  actor: DomainActor,
  input: IssueRef,
  deps: IssueServiceDeps = defaultDeps,
): Promise<IssueDetail> {
  const parsedInput = issueRefSchema.parse(input);
  const authorization = await requireProjectReadAuthorization(actor, parsedInput, deps);

  const issue = await deps.readIssueByProjectAndNumber(
    authorization.project.id,
    parsedInput.issueNumber,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!issue) {
    throw new DomainNotFoundError("Issue not found.");
  }

  return issueDetailSchema.parse(issue);
}

export async function createIssue(
  actor: DomainActor,
  input: {
    body: null | string;
    ownerName: string;
    projectName: string;
    title: string;
  },
  deps: IssueServiceDeps = defaultDeps,
): Promise<IssueDetail> {
  requireAuthenticatedActor(actor);
  const authorization = await requireProjectWriteAuthorization(actor, input, deps);
  const ownerName = authorization.project.ownerName;
  const projectName = authorization.project.projectName;
  if (!ownerName || !projectName) {
    throw new DomainNotFoundError("Project not found.");
  }

  const issueNumber = await deps.createIssueRecord({
    authorId: actor.actorId,
    authorLoginId: actor.loginId,
    authorName: actor.loginId,
    body: input.body,
    projectId: authorization.project.id,
    title: input.title.trim(),
  });

  return readIssueDetail(
    actor,
    {
      issueNumber,
      ownerName,
      projectName,
    },
    deps,
  );
}

export async function createIssueComment(
  actor: DomainActor,
  input: IssueCommentCreateInput,
  deps: IssueServiceDeps = defaultDeps,
): Promise<IssueDetail> {
  requireAuthenticatedActor(actor);
  const parsedInput = issueCommentCreateInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);
  const issueId = await deps.readIssueIdByProjectAndNumber(
    authorization.project.id,
    parsedInput.issueNumber,
  );
  if (!issueId) {
    throw new DomainNotFoundError("Issue not found.");
  }

  await deps.createIssueCommentRecord({
    authorId: actor.actorId,
    authorLoginId: actor.loginId,
    authorName: actor.loginId,
    contents: parsedInput.contents,
    issueId,
    projectId: authorization.project.id,
  });

  return readIssueDetail(
    actor,
    {
      issueNumber: parsedInput.issueNumber,
      ownerName: parsedInput.ownerName,
      projectName: parsedInput.projectName,
    },
    deps,
  );
}

export async function updateIssueState(
  actor: DomainActor,
  input: IssueStateUpdateInput,
  deps: IssueServiceDeps = defaultDeps,
): Promise<IssueDetail> {
  requireAuthenticatedActor(actor);
  const parsedInput = issueStateUpdateInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);
  await deps.updateIssueStateByProjectAndNumber({
    issueNumber: parsedInput.issueNumber,
    projectId: authorization.project.id,
    state: parsedInput.state,
  });

  return readIssueDetail(
    actor,
    {
      issueNumber: parsedInput.issueNumber,
      ownerName: parsedInput.ownerName,
      projectName: parsedInput.projectName,
    },
    deps,
  );
}
