import { createServerFn } from "@tanstack/react-start";
import {
  pullRequestCreateInputSchema,
  pullRequestDetailSchema,
  pullRequestRefSchema,
  pullRequestReviewCountsSchema,
  pullRequestReviewThreadFilterInputSchema,
  pullRequestReviewThreadSchema,
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

export const updatePullRequestState = createServerFn({ method: "POST" })
  .inputValidator(pullRequestStateUpdateInputSchema)
  .handler(async ({ data }) => {
    const { createServerPullRequestCaller } = await import("./pull-request-trpc.server");
    return pullRequestDetailSchema.parse(
      await createServerPullRequestCaller().updatePullRequestState(data),
    );
  });
