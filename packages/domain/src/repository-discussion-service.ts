import {
  createRepositoryCommitDiscussionCommentInputSchema,
  createRepositoryCommitDiscussionCommentOutputSchema,
  deleteRepositoryCommitDiscussionCommentInputSchema,
  deleteRepositoryCommitDiscussionCommentOutputSchema,
  listRepositoryCommitDiscussionThreadsInputSchema,
  listRepositoryCommitDiscussionThreadsOutputSchema,
  repositoryCommitDiscussionCapabilitiesInputSchema,
  repositoryCommitDiscussionCapabilitiesOutputSchema,
  updateRepositoryCommitDiscussionThreadStateInputSchema,
  updateRepositoryCommitDiscussionThreadStateOutputSchema,
  type CreateRepositoryCommitDiscussionCommentInput,
  type CreateRepositoryCommitDiscussionCommentOutput,
  type DeleteRepositoryCommitDiscussionCommentInput,
  type DeleteRepositoryCommitDiscussionCommentOutput,
  type ListRepositoryCommitDiscussionThreadsInput,
  type ListRepositoryCommitDiscussionThreadsOutput,
  type RepositoryCommitDiscussionCapabilitiesInput,
  type RepositoryCommitDiscussionCapabilitiesOutput,
  type UpdateRepositoryCommitDiscussionThreadStateInput,
  type UpdateRepositoryCommitDiscussionThreadStateOutput,
} from "@yona/contracts";
import {
  createRepositoryCommitDiscussionComment as createRepositoryCommitDiscussionCommentRecord,
  deleteRepositoryCommitDiscussionComment as deleteRepositoryCommitDiscussionCommentRecord,
  listRepositoryCommitDiscussionThreads as listRepositoryCommitDiscussionThreadsRecord,
  loadRepositoryAccessFacts,
  readRepositoryCommitDiscussionComment,
  readRepositoryCommitDiscussionThread,
  updateRepositoryCommitDiscussionThreadState as updateRepositoryCommitDiscussionThreadStateRecord,
} from "@yona/db";
import { getActorDisplayName, requireAuthenticatedActor } from "./actor-utils";
import {
  DomainNotFoundError,
  DomainPermissionError,
  DomainValidationError,
  type DomainActor,
} from "./errors";
import { authorizeRepositoryAccess, type RepositoryAccessFacts } from "./repository-authorization";

export interface RepositoryDiscussionServiceDeps {
  createRepositoryCommitDiscussionComment: typeof createRepositoryCommitDiscussionCommentRecord;
  deleteRepositoryCommitDiscussionComment: typeof deleteRepositoryCommitDiscussionCommentRecord;
  listRepositoryCommitDiscussionThreads: typeof listRepositoryCommitDiscussionThreadsRecord;
  loadRepositoryAccessFacts: typeof loadRepositoryAccessFacts;
  readRepositoryCommitDiscussionComment: typeof readRepositoryCommitDiscussionComment;
  readRepositoryCommitDiscussionThread: typeof readRepositoryCommitDiscussionThread;
  updateRepositoryCommitDiscussionThreadState: typeof updateRepositoryCommitDiscussionThreadStateRecord;
}

const defaultDeps: RepositoryDiscussionServiceDeps = {
  createRepositoryCommitDiscussionComment: createRepositoryCommitDiscussionCommentRecord,
  deleteRepositoryCommitDiscussionComment: deleteRepositoryCommitDiscussionCommentRecord,
  listRepositoryCommitDiscussionThreads: listRepositoryCommitDiscussionThreadsRecord,
  loadRepositoryAccessFacts,
  readRepositoryCommitDiscussionComment,
  readRepositoryCommitDiscussionThread,
  updateRepositoryCommitDiscussionThreadState: updateRepositoryCommitDiscussionThreadStateRecord,
};

function canCreateCommitDiscussion(actor: DomainActor, facts: RepositoryAccessFacts): boolean {
  if (actor.isAnonymous) {
    return false;
  }

  if (
    facts.isSiteAdmin ||
    facts.isOrganizationAdmin ||
    facts.isProjectManager ||
    facts.isProjectMember
  ) {
    return true;
  }

  if (facts.projectScope === "public") {
    return true;
  }

  return facts.projectScope === "protected" && facts.isOrganizationMember;
}

function canManageCommitDiscussion(actor: DomainActor, facts: RepositoryAccessFacts): boolean {
  if (actor.isAnonymous) {
    return false;
  }

  return authorizeRepositoryAccess(facts, "write").allowed;
}

async function requireRepositoryDiscussionFacts(
  actor: DomainActor,
  repoId: string,
  deps: RepositoryDiscussionServiceDeps,
) {
  const facts = await deps.loadRepositoryAccessFacts(repoId, actor.actorId);
  if (!facts) {
    throw new DomainNotFoundError("Repository not found.");
  }

  return facts;
}

function validateNumericId(value: number, kind: "comment" | "thread"): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DomainValidationError(`Invalid repository discussion ${kind} id.`);
  }
}

async function ensureThreadExists(
  deps: RepositoryDiscussionServiceDeps,
  input: {
    commitId: string;
    projectId: number;
    threadId: number;
  },
) {
  const thread = await deps.readRepositoryCommitDiscussionThread(input);
  if (!thread) {
    throw new DomainNotFoundError("Repository discussion thread not found.");
  }

  return thread;
}

export async function listRepositoryCommitDiscussionThreads(
  actor: DomainActor,
  input: ListRepositoryCommitDiscussionThreadsInput,
  deps: RepositoryDiscussionServiceDeps = defaultDeps,
): Promise<ListRepositoryCommitDiscussionThreadsOutput> {
  const parsedInput = listRepositoryCommitDiscussionThreadsInputSchema.parse(input);
  const facts = await requireRepositoryDiscussionFacts(actor, parsedInput.repoId, deps);

  if (!authorizeRepositoryAccess(facts, "read").allowed) {
    throw new DomainPermissionError("Repository read is not allowed.", {
      requiresAuthentication: actor.isAnonymous,
    });
  }

  return listRepositoryCommitDiscussionThreadsOutputSchema.parse(
    await deps.listRepositoryCommitDiscussionThreads({
      commitId: parsedInput.oid,
      projectId: facts.projectId,
      state: parsedInput.state,
    }),
  );
}

export async function readRepositoryCommitDiscussionCapabilities(
  actor: DomainActor,
  input: RepositoryCommitDiscussionCapabilitiesInput,
  deps: RepositoryDiscussionServiceDeps = defaultDeps,
): Promise<RepositoryCommitDiscussionCapabilitiesOutput> {
  const parsedInput = repositoryCommitDiscussionCapabilitiesInputSchema.parse(input);
  const facts = await requireRepositoryDiscussionFacts(actor, parsedInput.repoId, deps);

  return repositoryCommitDiscussionCapabilitiesOutputSchema.parse({
    canCreate: canCreateCommitDiscussion(actor, facts),
    canManage: canManageCommitDiscussion(actor, facts),
  });
}

export async function createRepositoryCommitDiscussionComment(
  actor: DomainActor,
  input: CreateRepositoryCommitDiscussionCommentInput,
  deps: RepositoryDiscussionServiceDeps = defaultDeps,
): Promise<CreateRepositoryCommitDiscussionCommentOutput> {
  requireAuthenticatedActor(actor);

  const parsedInput = createRepositoryCommitDiscussionCommentInputSchema.parse(input);
  if (parsedInput.threadId && parsedInput.range) {
    throw new DomainValidationError(
      "Cannot specify a code range when replying to an existing commit discussion thread.",
    );
  }

  const facts = await requireRepositoryDiscussionFacts(actor, parsedInput.repoId, deps);
  if (!canCreateCommitDiscussion(actor, facts)) {
    throw new DomainPermissionError("Commit discussion creation is not allowed.");
  }

  if (parsedInput.threadId) {
    validateNumericId(parsedInput.threadId, "thread");
    await ensureThreadExists(deps, {
      commitId: parsedInput.oid,
      projectId: facts.projectId,
      threadId: parsedInput.threadId,
    });
  }

  return createRepositoryCommitDiscussionCommentOutputSchema.parse(
    await deps.createRepositoryCommitDiscussionComment({
      authorId: actor.actorId,
      authorLoginId: actor.loginId,
      authorName: getActorDisplayName(actor),
      commitId: parsedInput.oid,
      contents: parsedInput.contents,
      projectId: facts.projectId,
      range: parsedInput.range,
      threadId: parsedInput.threadId,
    }),
  );
}

export async function deleteRepositoryCommitDiscussionComment(
  actor: DomainActor,
  input: DeleteRepositoryCommitDiscussionCommentInput,
  deps: RepositoryDiscussionServiceDeps = defaultDeps,
): Promise<DeleteRepositoryCommitDiscussionCommentOutput> {
  requireAuthenticatedActor(actor);

  const parsedInput = deleteRepositoryCommitDiscussionCommentInputSchema.parse(input);
  validateNumericId(parsedInput.commentId, "comment");

  const facts = await requireRepositoryDiscussionFacts(actor, parsedInput.repoId, deps);
  const comment = await deps.readRepositoryCommitDiscussionComment({
    commentId: parsedInput.commentId,
    commitId: parsedInput.oid,
    projectId: facts.projectId,
  });
  if (!comment) {
    throw new DomainNotFoundError("Repository discussion comment not found.");
  }

  if (comment.authorId !== actor.actorId && !canManageCommitDiscussion(actor, facts)) {
    throw new DomainPermissionError("Commit discussion delete is not allowed.");
  }

  return deleteRepositoryCommitDiscussionCommentOutputSchema.parse(
    await deps.deleteRepositoryCommitDiscussionComment({
      commentId: parsedInput.commentId,
      commitId: parsedInput.oid,
      projectId: facts.projectId,
    }),
  );
}

export async function updateRepositoryCommitDiscussionThreadState(
  actor: DomainActor,
  input: UpdateRepositoryCommitDiscussionThreadStateInput,
  deps: RepositoryDiscussionServiceDeps = defaultDeps,
): Promise<UpdateRepositoryCommitDiscussionThreadStateOutput> {
  requireAuthenticatedActor(actor);

  const parsedInput = updateRepositoryCommitDiscussionThreadStateInputSchema.parse(input);
  validateNumericId(parsedInput.threadId, "thread");

  const facts = await requireRepositoryDiscussionFacts(actor, parsedInput.repoId, deps);
  const thread = await ensureThreadExists(deps, {
    commitId: parsedInput.oid,
    projectId: facts.projectId,
    threadId: parsedInput.threadId,
  });

  if (thread.authorId !== actor.actorId && !canManageCommitDiscussion(actor, facts)) {
    throw new DomainPermissionError("Commit discussion thread state change is not allowed.");
  }

  return updateRepositoryCommitDiscussionThreadStateOutputSchema.parse(
    await deps.updateRepositoryCommitDiscussionThreadState({
      commitId: parsedInput.oid,
      projectId: facts.projectId,
      state: parsedInput.state,
      threadId: parsedInput.threadId,
    }),
  );
}
