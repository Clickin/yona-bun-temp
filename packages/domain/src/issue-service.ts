import {
  issueAssignInputSchema,
  issueCommentCreateInputSchema,
  issueDetailSchema,
  issueRefSchema,
  issueStateUpdateInputSchema,
  issueSummarySchema,
  issueUnassignInputSchema,
  issueUnvoteInputSchema,
  issueUnwatchInputSchema,
  issueVoteInputSchema,
  issueWatchInputSchema,
  type IssueAssignInput,
  type IssueCommentCreateInput,
  type IssueDetail,
  type IssueRef,
  type IssueStateUpdateInput,
  type IssueSummary,
  type IssueUnassignInput,
  type IssueUnvoteInput,
  type IssueUnwatchInput,
  type IssueVoteInput,
  type IssueWatchInput,
} from "@yona/contracts";
import {
  assignIssueByProjectAndNumber,
  createIssueCommentRecord,
  createIssueRecord,
  listIssuesByProject,
  readIssueByProjectAndNumber,
  readIssueIdByProjectAndNumber,
  readProjectAuthorization,
  unassignIssueByProjectAndNumber,
  unvoteIssueRecord,
  updateIssueStateByProjectAndNumber,
  unwatchIssueRecord,
  voteIssueRecord,
  watchIssueRecord,
} from "@yona/db";
import { getActorDisplayName, requireAuthenticatedActor } from "./actor-utils";
import { DomainNotFoundError, type DomainActor } from "./errors";
import {
  requireProjectReadAuthorization,
  requireProjectWriteAuthorization,
} from "./project-authorization";

export interface IssueServiceDeps {
  assignIssueByProjectAndNumber: typeof assignIssueByProjectAndNumber;
  createIssueCommentRecord: typeof createIssueCommentRecord;
  createIssueRecord: typeof createIssueRecord;
  listIssuesByProject: typeof listIssuesByProject;
  readIssueByProjectAndNumber: typeof readIssueByProjectAndNumber;
  readIssueIdByProjectAndNumber: typeof readIssueIdByProjectAndNumber;
  readProjectAuthorization: typeof readProjectAuthorization;
  unassignIssueByProjectAndNumber: typeof unassignIssueByProjectAndNumber;
  unvoteIssueRecord: typeof unvoteIssueRecord;
  updateIssueStateByProjectAndNumber: typeof updateIssueStateByProjectAndNumber;
  unwatchIssueRecord: typeof unwatchIssueRecord;
  voteIssueRecord: typeof voteIssueRecord;
  watchIssueRecord: typeof watchIssueRecord;
}

const defaultDeps: IssueServiceDeps = {
  assignIssueByProjectAndNumber,
  createIssueCommentRecord,
  createIssueRecord,
  listIssuesByProject,
  readIssueByProjectAndNumber,
  readIssueIdByProjectAndNumber,
  readProjectAuthorization,
  unassignIssueByProjectAndNumber,
  unvoteIssueRecord,
  updateIssueStateByProjectAndNumber,
  unwatchIssueRecord,
  voteIssueRecord,
  watchIssueRecord,
};

function toIssueRef(input: IssueRef) {
  return {
    issueNumber: input.issueNumber,
    ownerName: input.ownerName,
    projectName: input.projectName,
  } satisfies IssueRef;
}

async function requireIssueTarget(
  actor: DomainActor,
  input: IssueRef,
  deps: IssueServiceDeps,
  operation: "read" | "write",
) {
  const authorization =
    operation === "write"
      ? await requireProjectWriteAuthorization(actor, input, deps)
      : await requireProjectReadAuthorization(actor, input, deps);
  const issueId = await deps.readIssueIdByProjectAndNumber(
    authorization.project.id,
    input.issueNumber,
  );
  if (!issueId) {
    throw new DomainNotFoundError("Issue not found.");
  }

  return {
    authorization,
    issueId,
  };
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
    actor.actorId,
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
    authorName: getActorDisplayName(actor),
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
    authorName: getActorDisplayName(actor),
    contents: parsedInput.contents,
    issueId,
    projectId: authorization.project.id,
  });

  return readIssueDetail(actor, toIssueRef(parsedInput), deps);
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
    senderLoginId: actor.loginId,
    state: parsedInput.state,
  });

  return readIssueDetail(actor, toIssueRef(parsedInput), deps);
}

export async function watchIssue(
  actor: DomainActor,
  input: IssueWatchInput,
  deps: IssueServiceDeps = defaultDeps,
): Promise<IssueDetail> {
  requireAuthenticatedActor(actor);
  const parsedInput = issueWatchInputSchema.parse(input);
  const target = await requireIssueTarget(actor, parsedInput, deps, "read");
  await deps.watchIssueRecord({
    issueId: target.issueId,
    userId: actor.actorId,
  });

  return readIssueDetail(actor, toIssueRef(parsedInput), deps);
}

export async function unwatchIssue(
  actor: DomainActor,
  input: IssueUnwatchInput,
  deps: IssueServiceDeps = defaultDeps,
): Promise<IssueDetail> {
  requireAuthenticatedActor(actor);
  const parsedInput = issueUnwatchInputSchema.parse(input);
  const target = await requireIssueTarget(actor, parsedInput, deps, "read");
  await deps.unwatchIssueRecord({
    issueId: target.issueId,
    userId: actor.actorId,
  });

  return readIssueDetail(actor, toIssueRef(parsedInput), deps);
}

export async function voteIssue(
  actor: DomainActor,
  input: IssueVoteInput,
  deps: IssueServiceDeps = defaultDeps,
): Promise<IssueDetail> {
  requireAuthenticatedActor(actor);
  const parsedInput = issueVoteInputSchema.parse(input);
  const target = await requireIssueTarget(actor, parsedInput, deps, "read");
  await deps.voteIssueRecord({
    issueId: target.issueId,
    userId: actor.actorId,
  });

  return readIssueDetail(actor, toIssueRef(parsedInput), deps);
}

export async function unvoteIssue(
  actor: DomainActor,
  input: IssueUnvoteInput,
  deps: IssueServiceDeps = defaultDeps,
): Promise<IssueDetail> {
  requireAuthenticatedActor(actor);
  const parsedInput = issueUnvoteInputSchema.parse(input);
  const target = await requireIssueTarget(actor, parsedInput, deps, "read");
  await deps.unvoteIssueRecord({
    issueId: target.issueId,
    userId: actor.actorId,
  });

  return readIssueDetail(actor, toIssueRef(parsedInput), deps);
}

export async function assignIssue(
  actor: DomainActor,
  input: IssueAssignInput,
  deps: IssueServiceDeps = defaultDeps,
): Promise<IssueDetail> {
  requireAuthenticatedActor(actor);
  const parsedInput = issueAssignInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);
  await deps.assignIssueByProjectAndNumber({
    assigneeLoginId: parsedInput.assigneeLoginId,
    issueNumber: parsedInput.issueNumber,
    projectId: authorization.project.id,
    senderLoginId: actor.loginId,
  });

  return readIssueDetail(actor, toIssueRef(parsedInput), deps);
}

export async function unassignIssue(
  actor: DomainActor,
  input: IssueUnassignInput,
  deps: IssueServiceDeps = defaultDeps,
): Promise<IssueDetail> {
  requireAuthenticatedActor(actor);
  const parsedInput = issueUnassignInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);
  await deps.unassignIssueByProjectAndNumber({
    issueNumber: parsedInput.issueNumber,
    projectId: authorization.project.id,
    senderLoginId: actor.loginId,
  });

  return readIssueDetail(actor, toIssueRef(parsedInput), deps);
}
