import { createServerFn } from "@tanstack/react-start";
import {
  pullRequestCreateInputSchema,
  pullRequestDetailSchema,
  pullRequestMergeInputSchema,
  pullRequestMergeOutputSchema,
  pullRequestMergePreviewInputSchema,
  pullRequestMergePreviewOutputSchema,
  pullRequestRefSchema,
  pullRequestReviewCommentCreateInputSchema,
  pullRequestReviewCommentDeleteInputSchema,
  pullRequestReviewCommentDeleteOutputSchema,
  pullRequestReviewCountsSchema,
  pullRequestReviewThreadFilterInputSchema,
  pullRequestReviewThreadSchema,
  pullRequestReviewThreadStateUpdateInputSchema,
  pullRequestStateUpdateInputSchema,
  pullRequestSummarySchema,
  projectRefSchema,
} from "@yona/contracts";

export const listPullRequests = createServerFn({ method: "GET" })
  .inputValidator(projectRefSchema)
  .handler(async ({ data }) => {
    const { createServerPullRequestCaller } = await import("./pull-request-trpc.server");
    return pullRequestSummarySchema
      .array()
      .parse(await createServerPullRequestCaller().listPullRequests(data));
  });

export const listPullRequestReviewThreads = createServerFn({ method: "GET" })
  .inputValidator(pullRequestReviewThreadFilterInputSchema)
  .handler(async ({ data }) => {
    const { createServerPullRequestCaller } = await import("./pull-request-trpc.server");
    return pullRequestReviewThreadSchema
      .array()
      .parse(await createServerPullRequestCaller().listPullRequestReviewThreads(data));
  });

export const readPullRequestReviewCounts = createServerFn({ method: "GET" })
  .inputValidator(pullRequestReviewThreadFilterInputSchema)
  .handler(async ({ data }) => {
    const { createServerPullRequestCaller } = await import("./pull-request-trpc.server");
    return pullRequestReviewCountsSchema.parse(
      await createServerPullRequestCaller().readPullRequestReviewCounts(data),
    );
  });

export const readPullRequestDetail = createServerFn({ method: "GET" })
  .inputValidator(pullRequestRefSchema)
  .handler(async ({ data }) => {
    const { createServerPullRequestCaller } = await import("./pull-request-trpc.server");
    return pullRequestDetailSchema.parse(
      await createServerPullRequestCaller().readPullRequestDetail(data),
    );
  });

export const createPullRequest = createServerFn({ method: "POST" })
  .inputValidator(pullRequestCreateInputSchema)
  .handler(async ({ data }) => {
    const { createServerPullRequestCaller } = await import("./pull-request-trpc.server");
    return pullRequestDetailSchema.parse(
      await createServerPullRequestCaller().createPullRequest(data),
    );
  });

export const createPullRequestReviewComment = createServerFn({ method: "POST" })
  .inputValidator(pullRequestReviewCommentCreateInputSchema)
  .handler(async ({ data }) => {
    const { createServerPullRequestCaller } = await import("./pull-request-trpc.server");
    return pullRequestReviewThreadSchema.parse(
      await createServerPullRequestCaller().createPullRequestReviewComment(data),
    );
  });

export const deletePullRequestReviewComment = createServerFn({ method: "POST" })
  .inputValidator(pullRequestReviewCommentDeleteInputSchema)
  .handler(async ({ data }) => {
    const { createServerPullRequestCaller } = await import("./pull-request-trpc.server");
    return pullRequestReviewCommentDeleteOutputSchema.parse(
      await createServerPullRequestCaller().deletePullRequestReviewComment(data),
    );
  });

export const updatePullRequestState = createServerFn({ method: "POST" })
  .inputValidator(pullRequestStateUpdateInputSchema)
  .handler(async ({ data }) => {
    const { createServerPullRequestCaller } = await import("./pull-request-trpc.server");
    return pullRequestDetailSchema.parse(
      await createServerPullRequestCaller().updatePullRequestState(data),
    );
  });

export const updatePullRequestReviewThreadState = createServerFn({ method: "POST" })
  .inputValidator(pullRequestReviewThreadStateUpdateInputSchema)
  .handler(async ({ data }) => {
    const { createServerPullRequestCaller } = await import("./pull-request-trpc.server");
    return pullRequestReviewThreadSchema.parse(
      await createServerPullRequestCaller().updatePullRequestReviewThreadState(data),
    );
  });

export const previewPullRequestMerge = createServerFn({ method: "GET" })
  .inputValidator(pullRequestMergePreviewInputSchema)
  .handler(async ({ data }) => {
    const { createServerPullRequestCaller } = await import("./pull-request-trpc.server");
    return pullRequestMergePreviewOutputSchema.parse(
      await createServerPullRequestCaller().previewPullRequestMerge(data),
    );
  });

export const mergePullRequest = createServerFn({ method: "POST" })
  .inputValidator(pullRequestMergeInputSchema)
  .handler(async ({ data }) => {
    const { createServerPullRequestCaller } = await import("./pull-request-trpc.server");
    return pullRequestMergeOutputSchema.parse(
      await createServerPullRequestCaller().mergePullRequest(data),
    );
  });
