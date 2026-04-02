import {
  pullRequestCreateInputSchema,
  pullRequestDetailSchema,
  pullRequestMergeInputSchema,
  pullRequestMergeOutputSchema,
  pullRequestMergePreviewInputSchema,
  pullRequestMergePreviewOutputSchema,
  pullRequestRefSchema,
  pullRequestReviewCommentDeleteInputSchema,
  pullRequestReviewCommentDeleteOutputSchema,
  pullRequestReviewCommentCreateInputSchema,
  pullRequestReviewCountsSchema,
  pullRequestReviewThreadFilterInputSchema,
  pullRequestReviewThreadSchema,
  pullRequestReviewThreadStateUpdateInputSchema,
  pullRequestStateUpdateInputSchema,
  pullRequestSummarySchema,
  type PullRequestCreateInput,
  type PullRequestDetail,
  type PullRequestMergeInput,
  type PullRequestMergeOutput,
  type PullRequestMergePreviewInput,
  type PullRequestMergePreviewOutput,
  type PullRequestRef,
  type PullRequestReviewCommentCreateInput,
  type PullRequestReviewCommentDeleteInput,
  type PullRequestReviewCommentDeleteOutput,
  type PullRequestReviewCounts,
  type PullRequestReviewThread,
  type PullRequestReviewThreadFilterInput,
  type PullRequestStateUpdateInput,
  type PullRequestSummary,
} from "@yona/contracts";
import {
  createPullRequestRecord,
  createPullRequestReviewComment as createPullRequestReviewCommentRecord,
  deletePullRequestReviewComment as deletePullRequestReviewCommentRecord,
  listPullRequestReviewThreadsByProject,
  listPullRequestReviewThreadsByPullRequest,
  listPullRequestsByProject,
  readProjectAuthorization,
  readPullRequestByProjectAndNumber,
  readPullRequestRecordByProjectAndNumber,
  readPullRequestReviewComment,
  readPullRequestReviewCountsByProject,
  readPullRequestReviewThread,
  updatePullRequestMergeStateByProjectAndNumber,
  updatePullRequestReviewThreadState as updatePullRequestReviewThreadStateRecord,
  updatePullRequestStateByProjectAndNumber,
} from "@yona/db";
import {
  appendPullRequestMergeAuditLog,
  getGitAuditLogPath,
  getRefOid,
  getRepositoryRoot,
  performPullRequestMerge as performPullRequestMergeInRepo,
  previewPullRequestMerge as previewPullRequestMergeInRepo,
  resolveRepositoryPath,
  type MutationActor,
} from "@yona/vcs";
import { getActorDisplayName, requireAuthenticatedActor } from "./actor-utils";
import {
  DomainNotFoundError,
  DomainPermissionError,
  DomainValidationError,
  type DomainActor,
} from "./errors";
import {
  requireProjectReadAuthorization,
  requireProjectWriteAuthorization,
} from "./project-authorization";

type ProjectAuthorization =
  Awaited<ReturnType<typeof readProjectAuthorization>> extends infer TResult
    ? Exclude<TResult, null>
    : never;

export interface PullRequestServiceDeps {
  appendPullRequestMergeAuditLog: typeof appendPullRequestMergeAuditLog;
  createPullRequestRecord: typeof createPullRequestRecord;
  createPullRequestReviewComment: typeof createPullRequestReviewCommentRecord;
  deletePullRequestReviewComment: typeof deletePullRequestReviewCommentRecord;
  getGitAuditLogPath: typeof getGitAuditLogPath;
  getRefOid: typeof getRefOid;
  getRepositoryRoot: typeof getRepositoryRoot;
  listPullRequestReviewThreadsByProject: typeof listPullRequestReviewThreadsByProject;
  listPullRequestReviewThreadsByPullRequest: typeof listPullRequestReviewThreadsByPullRequest;
  listPullRequestsByProject: typeof listPullRequestsByProject;
  performPullRequestMerge: typeof performPullRequestMergeInRepo;
  previewPullRequestMerge: typeof previewPullRequestMergeInRepo;
  readProjectAuthorization: typeof readProjectAuthorization;
  readPullRequestByProjectAndNumber: typeof readPullRequestByProjectAndNumber;
  readPullRequestRecordByProjectAndNumber: typeof readPullRequestRecordByProjectAndNumber;
  readPullRequestReviewComment: typeof readPullRequestReviewComment;
  readPullRequestReviewCountsByProject: typeof readPullRequestReviewCountsByProject;
  readPullRequestReviewThread: typeof readPullRequestReviewThread;
  resolveRepositoryPath: typeof resolveRepositoryPath;
  updatePullRequestMergeStateByProjectAndNumber: typeof updatePullRequestMergeStateByProjectAndNumber;
  updatePullRequestReviewThreadState: typeof updatePullRequestReviewThreadStateRecord;
  updatePullRequestStateByProjectAndNumber: typeof updatePullRequestStateByProjectAndNumber;
}

const defaultDeps: PullRequestServiceDeps = {
  appendPullRequestMergeAuditLog,
  createPullRequestRecord,
  createPullRequestReviewComment: createPullRequestReviewCommentRecord,
  deletePullRequestReviewComment: deletePullRequestReviewCommentRecord,
  getGitAuditLogPath,
  getRefOid,
  getRepositoryRoot,
  listPullRequestReviewThreadsByProject,
  listPullRequestReviewThreadsByPullRequest,
  listPullRequestsByProject,
  performPullRequestMerge: performPullRequestMergeInRepo,
  previewPullRequestMerge: previewPullRequestMergeInRepo,
  readProjectAuthorization,
  readPullRequestByProjectAndNumber,
  readPullRequestRecordByProjectAndNumber,
  readPullRequestReviewComment,
  readPullRequestReviewCountsByProject,
  readPullRequestReviewThread,
  resolveRepositoryPath,
  updatePullRequestMergeStateByProjectAndNumber,
  updatePullRequestReviewThreadState: updatePullRequestReviewThreadStateRecord,
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

function canManagePullRequestLifecycle(
  actor: DomainActor,
  authorization: ProjectAuthorization,
): boolean {
  if (actor.isSiteAdmin) {
    return true;
  }

  if (authorization.viewer.isOrganizationAdmin || authorization.viewer.isProjectManager) {
    return true;
  }

  if (authorization.viewer.isProjectMember) {
    return true;
  }

  return (
    authorization.project.projectScope !== "private" && authorization.viewer.isOrganizationMember
  );
}

async function requirePullRequestLifecycleAuthorization(
  actor: DomainActor,
  input: {
    ownerName: string;
    projectName: string;
  },
  deps: PullRequestServiceDeps,
  denialMessage: string,
): Promise<ProjectAuthorization> {
  requireAuthenticatedActor(actor);
  const authorization = await requireProjectReadAuthorization(actor, input, deps);
  if (!canManagePullRequestLifecycle(actor, authorization)) {
    throw new DomainPermissionError(denialMessage);
  }

  return authorization;
}

async function readRequiredPullRequestRecord(
  projectId: number,
  pullRequestNumber: number,
  deps: PullRequestServiceDeps,
) {
  const pullRequest = await deps.readPullRequestRecordByProjectAndNumber(
    projectId,
    pullRequestNumber,
  );
  if (!pullRequest) {
    throw new DomainNotFoundError("Pull request not found.");
  }

  return pullRequest;
}

function assertSameProjectPullRequest(pullRequest: {
  fromProjectId: number;
  toProjectId: number;
}): void {
  if (pullRequest.fromProjectId !== pullRequest.toProjectId) {
    throw new DomainValidationError("Cross-project pull requests are not supported.");
  }
}

async function ensurePullRequestBranchesExist(
  repoPath: string,
  pullRequest: {
    fromBranch: string;
    toBranch: string;
  },
  deps: PullRequestServiceDeps,
): Promise<void> {
  try {
    await deps.getRefOid(repoPath, `refs/heads/${pullRequest.fromBranch}`);
  } catch {
    throw new DomainValidationError("Pull request source branch not found.");
  }

  try {
    await deps.getRefOid(repoPath, `refs/heads/${pullRequest.toBranch}`);
  } catch {
    throw new DomainValidationError("Pull request target branch not found.");
  }
}

function createPullRequestMergeActor(actor: DomainActor): MutationActor {
  requireAuthenticatedActor(actor);

  return {
    canAdmin: actor.isSiteAdmin,
    canDirectWrite: true,
    email: actor.emailAddress?.trim() || `${actor.loginId}@users.noreply.yona.local`,
    id: String(actor.actorId),
    ipAddress: "unknown",
    name: getActorDisplayName(actor),
    role: actor.isSiteAdmin ? "admin" : "developer",
  };
}

function buildPullRequestMergeMessage(pullRequest: {
  fromBranch: string;
  pullRequestNumber: number;
}): string {
  return `Merge pull request #${pullRequest.pullRequestNumber} from ${pullRequest.fromBranch}`;
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

  const pullRequestId =
    parsedInput.pullRequestNumber !== undefined
      ? (
          await readRequiredPullRequestRecord(
            authorization.project.id,
            parsedInput.pullRequestNumber,
            deps,
          )
        ).id
      : undefined;

  const threads =
    pullRequestId !== undefined
      ? await deps.listPullRequestReviewThreadsByPullRequest({
          authorLoginId: parsedInput.authorLoginId,
          filter: parsedInput.filter,
          orderBy: parsedInput.orderBy,
          orderDir: parsedInput.orderDir,
          participantLoginId: parsedInput.participantLoginId,
          projectId: authorization.project.id,
          projectName: authorization.project.projectName,
          pullRequestId,
          state: parsedInput.state,
        })
      : await deps.listPullRequestReviewThreadsByProject({
          authorLoginId: parsedInput.authorLoginId,
          filter: parsedInput.filter,
          orderBy: parsedInput.orderBy,
          orderDir: parsedInput.orderDir,
          participantLoginId: parsedInput.participantLoginId,
          projectId: authorization.project.id,
          projectName: authorization.project.projectName,
          state: parsedInput.state,
        });

  return pullRequestReviewThreadSchema
    .array()
    .parse(threads.filter((thread) => matchesReviewThreadFilter(thread, parsedInput)));
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

export async function createPullRequestReviewComment(
  actor: DomainActor,
  input: PullRequestReviewCommentCreateInput,
  deps: PullRequestServiceDeps = defaultDeps,
): Promise<PullRequestReviewThread> {
  const parsedInput = pullRequestReviewCommentCreateInputSchema.parse(input);
  const authorization = await requirePullRequestLifecycleAuthorization(
    actor,
    parsedInput,
    deps,
    "Pull request review comment creation is not allowed.",
  );
  requireAuthenticatedActor(actor);
  const pullRequest = await readRequiredPullRequestRecord(
    authorization.project.id,
    parsedInput.pullRequestNumber,
    deps,
  );

  return pullRequestReviewThreadSchema.parse(
    await deps.createPullRequestReviewComment(
      {
        authorId: actor.actorId,
        authorLoginId: actor.loginId,
        authorName: getActorDisplayName(actor),
        commitId: parsedInput.commitId,
        contents: parsedInput.contents,
        path: parsedInput.path,
        projectId: authorization.project.id,
        pullRequestId: pullRequest.id,
        range: parsedInput.range,
        threadId: parsedInput.threadId,
      },
      authorization.project.projectName,
    ),
  );
}

export async function deletePullRequestReviewComment(
  actor: DomainActor,
  input: PullRequestReviewCommentDeleteInput,
  deps: PullRequestServiceDeps = defaultDeps,
): Promise<PullRequestReviewCommentDeleteOutput> {
  requireAuthenticatedActor(actor);
  const parsedInput = pullRequestReviewCommentDeleteInputSchema.parse(input);
  const authorization = await requireProjectReadAuthorization(actor, parsedInput, deps);
  const pullRequest = await readRequiredPullRequestRecord(
    authorization.project.id,
    parsedInput.pullRequestNumber,
    deps,
  );
  const comment = await deps.readPullRequestReviewComment({
    commentId: parsedInput.commentId,
    projectId: authorization.project.id,
    pullRequestId: pullRequest.id,
  });
  if (!comment) {
    throw new DomainNotFoundError("Pull request review comment not found.");
  }

  if (comment.authorId !== actor.actorId && !canManagePullRequestLifecycle(actor, authorization)) {
    throw new DomainPermissionError("Pull request review comment delete is not allowed.");
  }

  return pullRequestReviewCommentDeleteOutputSchema.parse(
    await deps.deletePullRequestReviewComment({
      commentId: parsedInput.commentId,
      projectId: authorization.project.id,
      pullRequestId: pullRequest.id,
    }),
  );
}

export async function updatePullRequestReviewThreadState(
  actor: DomainActor,
  input: {
    ownerName: string;
    projectName: string;
    pullRequestNumber: number;
    state: "closed" | "open";
    threadId: number;
  },
  deps: PullRequestServiceDeps = defaultDeps,
): Promise<PullRequestReviewThread> {
  requireAuthenticatedActor(actor);
  const parsedInput = pullRequestReviewThreadStateUpdateInputSchema.parse(input);
  const authorization = await requireProjectReadAuthorization(actor, parsedInput, deps);
  const pullRequest = await readRequiredPullRequestRecord(
    authorization.project.id,
    parsedInput.pullRequestNumber,
    deps,
  );
  const thread = await deps.readPullRequestReviewThread({
    projectId: authorization.project.id,
    pullRequestId: pullRequest.id,
    threadId: parsedInput.threadId,
  });
  if (!thread) {
    throw new DomainNotFoundError("Pull request review thread not found.");
  }

  if (thread.authorId !== actor.actorId && !canManagePullRequestLifecycle(actor, authorization)) {
    throw new DomainPermissionError("Pull request review thread state change is not allowed.");
  }

  return pullRequestReviewThreadSchema.parse(
    await deps.updatePullRequestReviewThreadState({
      projectId: authorization.project.id,
      projectName: authorization.project.projectName,
      pullRequestId: pullRequest.id,
      state: parsedInput.state,
      threadId: parsedInput.threadId,
    }),
  );
}

export async function previewPullRequestMerge(
  actor: DomainActor,
  input: PullRequestMergePreviewInput,
  deps: PullRequestServiceDeps = defaultDeps,
): Promise<PullRequestMergePreviewOutput> {
  const parsedInput = pullRequestMergePreviewInputSchema.parse(input);
  const authorization = await requirePullRequestLifecycleAuthorization(
    actor,
    parsedInput,
    deps,
    "Pull request merge is not allowed.",
  );
  requireAuthenticatedActor(actor);
  const pullRequest = await readRequiredPullRequestRecord(
    authorization.project.id,
    parsedInput.pullRequestNumber,
    deps,
  );

  assertSameProjectPullRequest(pullRequest);

  if (pullRequest.state !== "open") {
    return pullRequestMergePreviewOutputSchema.parse({
      blockedReason: "pull-request-not-open",
      conflictedFiles: [],
      mergeable: false,
    });
  }

  if (pullRequest.isMerging) {
    return pullRequestMergePreviewOutputSchema.parse({
      blockedReason: "pull-request-is-merging",
      conflictedFiles: [],
      mergeable: false,
    });
  }

  const repositoryId = String(authorization.project.id);
  const repoPath = deps.resolveRepositoryPath(deps.getRepositoryRoot(), repositoryId);
  await ensurePullRequestBranchesExist(repoPath, pullRequest, deps);

  const result = await deps.previewPullRequestMerge({
    repoPath,
    sourceBranch: pullRequest.fromBranch,
    targetBranch: pullRequest.toBranch,
  });

  return pullRequestMergePreviewOutputSchema.parse({
    blockedReason: result.mergeable ? null : "merge-conflict",
    conflictedFiles: result.conflictedFiles,
    mergeable: result.mergeable,
  });
}

export async function mergePullRequest(
  actor: DomainActor,
  input: PullRequestMergeInput,
  deps: PullRequestServiceDeps = defaultDeps,
): Promise<PullRequestMergeOutput> {
  const parsedInput = pullRequestMergeInputSchema.parse(input);
  const authorization = await requirePullRequestLifecycleAuthorization(
    actor,
    parsedInput,
    deps,
    "Pull request merge is not allowed.",
  );
  const pullRequest = await readRequiredPullRequestRecord(
    authorization.project.id,
    parsedInput.pullRequestNumber,
    deps,
  );

  assertSameProjectPullRequest(pullRequest);

  if (pullRequest.state !== "open") {
    throw new DomainValidationError("Pull request is not open.");
  }

  if (pullRequest.isMerging) {
    throw new DomainValidationError("Pull request is already merging.");
  }

  const repositoryId = String(authorization.project.id);
  const repoPath = deps.resolveRepositoryPath(deps.getRepositoryRoot(), repositoryId);
  await ensurePullRequestBranchesExist(repoPath, pullRequest, deps);

  const mergeMessage = buildPullRequestMergeMessage(pullRequest);
  const mergeActor = createPullRequestMergeActor(actor);
  const mergeResult = await deps.performPullRequestMerge({
    actor: mergeActor,
    message: mergeMessage,
    repoPath,
    repositoryId,
    sourceBranch: pullRequest.fromBranch,
    targetBranch: pullRequest.toBranch,
  });

  if (mergeResult.conflicted || !mergeResult.mergeCommitOid) {
    return pullRequestMergeOutputSchema.parse({
      conflicted: true,
      conflictedFiles: mergeResult.conflictedFiles,
      merged: false,
      mergedPullRequestState: "open",
    });
  }

  try {
    await deps.updatePullRequestMergeStateByProjectAndNumber({
      mergedCommitIdFrom: mergeResult.targetHeadOid,
      mergedCommitIdTo: mergeResult.mergeCommitOid,
      projectId: authorization.project.id,
      pullRequestNumber: parsedInput.pullRequestNumber,
    });
  } catch (error) {
    await deps.appendPullRequestMergeAuditLog(deps.getGitAuditLogPath(), {
      action: "pull-request-merge-db-mismatch",
      actorEmail: mergeActor.email,
      actorId: mergeActor.id,
      actorIp: "unknown",
      actorName: mergeActor.name,
      conflictedFiles: [],
      mergeCommitOid: mergeResult.mergeCommitOid,
      message: mergeMessage,
      repositoryId,
      requestId: mergeResult.requestId,
      sourceBranch: pullRequest.fromBranch,
      sourceHeadOid: mergeResult.sourceHeadOid,
      targetBranch: pullRequest.toBranch,
      targetHeadOid: mergeResult.targetHeadOid,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }

  return pullRequestMergeOutputSchema.parse({
    conflicted: false,
    conflictedFiles: [],
    merged: true,
    mergedPullRequestState: "merged",
  });
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
