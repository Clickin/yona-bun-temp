import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
  createRepositoryCommitDiscussionCommentInputSchema,
  createRepositoryCommitDiscussionCommentOutputSchema,
  deleteRepositoryCommitDiscussionCommentInputSchema,
  deleteRepositoryCommitDiscussionCommentOutputSchema,
  listRepositoryCommitDiscussionThreadsInputSchema,
  listRepositoryCommitDiscussionThreadsOutputSchema,
  updateRepositoryCommitDiscussionThreadStateInputSchema,
  updateRepositoryCommitDiscussionThreadStateOutputSchema,
} from "@yona/contracts";
import { createRepoCaller } from "./repo-trpc";
import { resolveServerRequestPrincipal } from "./server-request-auth";

async function createServerRepoCaller() {
  const request = getRequest();
  const principal = await resolveServerRequestPrincipal(request);
  return createRepoCaller({
    principal,
    requestId: request.headers.get("x-request-id") ?? undefined,
  });
}

export const listRepositoryCommitDiscussionThreads = createServerFn({ method: "GET" })
  .inputValidator(listRepositoryCommitDiscussionThreadsInputSchema)
  .handler(async ({ data }) => {
    return listRepositoryCommitDiscussionThreadsOutputSchema.parse(
      await (await createServerRepoCaller()).listRepositoryCommitDiscussionThreads(data),
    );
  });

export const createRepositoryCommitDiscussionComment = createServerFn({ method: "POST" })
  .inputValidator(createRepositoryCommitDiscussionCommentInputSchema)
  .handler(async ({ data }) => {
    return createRepositoryCommitDiscussionCommentOutputSchema.parse(
      await (await createServerRepoCaller()).createRepositoryCommitDiscussionComment(data),
    );
  });

export const deleteRepositoryCommitDiscussionComment = createServerFn({ method: "POST" })
  .inputValidator(deleteRepositoryCommitDiscussionCommentInputSchema)
  .handler(async ({ data }) => {
    return deleteRepositoryCommitDiscussionCommentOutputSchema.parse(
      await (await createServerRepoCaller()).deleteRepositoryCommitDiscussionComment(data),
    );
  });

export const updateRepositoryCommitDiscussionThreadState = createServerFn({ method: "POST" })
  .inputValidator(updateRepositoryCommitDiscussionThreadStateInputSchema)
  .handler(async ({ data }) => {
    return updateRepositoryCommitDiscussionThreadStateOutputSchema.parse(
      await (await createServerRepoCaller()).updateRepositoryCommitDiscussionThreadState(data),
    );
  });
