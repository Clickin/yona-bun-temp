import {
  postingCommentCreateInputSchema,
  postingDetailSchema,
  postingRefSchema,
  postingSummarySchema,
  type PostingCommentCreateInput,
  type PostingDetail,
  type PostingRef,
  type PostingSummary,
} from "@yona/contracts";
import {
  createPostingCommentRecord,
  createPostingRecord,
  listPostingsByProject,
  readPostingByProjectAndNumber,
  readPostingIdByProjectAndNumber,
  readProjectAuthorization,
} from "@yona/db";
import { authorizeProjectAccess } from "./project-authorization";
import { DomainNotFoundError, DomainPermissionError, type DomainActor } from "./errors";

export interface PostingServiceDeps {
  createPostingCommentRecord: typeof createPostingCommentRecord;
  createPostingRecord: typeof createPostingRecord;
  listPostingsByProject: typeof listPostingsByProject;
  readPostingByProjectAndNumber: typeof readPostingByProjectAndNumber;
  readPostingIdByProjectAndNumber: typeof readPostingIdByProjectAndNumber;
  readProjectAuthorization: typeof readProjectAuthorization;
}

const defaultDeps: PostingServiceDeps = {
  createPostingCommentRecord,
  createPostingRecord,
  listPostingsByProject,
  readPostingByProjectAndNumber,
  readPostingIdByProjectAndNumber,
  readProjectAuthorization,
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
  deps: PostingServiceDeps,
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
  deps: PostingServiceDeps,
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

export async function listPostings(
  actor: DomainActor,
  input: {
    ownerName: string;
    projectName: string;
  },
  deps: PostingServiceDeps = defaultDeps,
): Promise<PostingSummary[]> {
  const authorization = await requireProjectReadAuthorization(actor, input, deps);
  return postingSummarySchema
    .array()
    .parse(
      await deps.listPostingsByProject(
        authorization.project.id,
        authorization.project.ownerName,
        authorization.project.projectName,
      ),
    );
}

export async function readPostingDetail(
  actor: DomainActor,
  input: PostingRef,
  deps: PostingServiceDeps = defaultDeps,
): Promise<PostingDetail> {
  const parsedInput = postingRefSchema.parse(input);
  const authorization = await requireProjectReadAuthorization(actor, parsedInput, deps);

  const posting = await deps.readPostingByProjectAndNumber(
    authorization.project.id,
    parsedInput.postingNumber,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!posting) {
    throw new DomainNotFoundError("Posting not found.");
  }

  return postingDetailSchema.parse(posting);
}

export async function createPosting(
  actor: DomainActor,
  input: {
    body: null | string;
    ownerName: string;
    projectName: string;
    title: string;
  },
  deps: PostingServiceDeps = defaultDeps,
): Promise<PostingDetail> {
  requireAuthenticatedActor(actor);
  const authorization = await requireProjectWriteAuthorization(actor, input, deps);
  const ownerName = authorization.project.ownerName;
  const projectName = authorization.project.projectName;
  if (!ownerName || !projectName) {
    throw new DomainNotFoundError("Project not found.");
  }

  const postingNumber = await deps.createPostingRecord({
    authorId: actor.actorId,
    authorLoginId: actor.loginId,
    authorName: actor.loginId,
    body: input.body,
    projectId: authorization.project.id,
    title: input.title.trim(),
  });

  return readPostingDetail(
    actor,
    {
      ownerName,
      postingNumber,
      projectName,
    },
    deps,
  );
}

export async function createPostingComment(
  actor: DomainActor,
  input: PostingCommentCreateInput,
  deps: PostingServiceDeps = defaultDeps,
): Promise<PostingDetail> {
  requireAuthenticatedActor(actor);
  const parsedInput = postingCommentCreateInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);
  const postingId = await deps.readPostingIdByProjectAndNumber(
    authorization.project.id,
    parsedInput.postingNumber,
  );
  if (!postingId) {
    throw new DomainNotFoundError("Posting not found.");
  }

  await deps.createPostingCommentRecord({
    authorId: actor.actorId,
    authorLoginId: actor.loginId,
    authorName: actor.loginId,
    contents: parsedInput.contents,
    postingId,
    projectId: authorization.project.id,
  });

  return readPostingDetail(
    actor,
    {
      ownerName: parsedInput.ownerName,
      postingNumber: parsedInput.postingNumber,
      projectName: parsedInput.projectName,
    },
    deps,
  );
}
