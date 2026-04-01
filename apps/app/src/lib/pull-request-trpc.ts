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
  type PullRequestReviewThread,
  type PullRequestReviewThreadFilterInput,
} from "@yona/contracts";
import {
  createPullRequest,
  listPullRequests,
  listPullRequestReviewThreads,
  readPullRequestDetail,
  readPullRequestReviewCounts,
  updatePullRequestState,
} from "@yona/domain";
import {
  createDefaultAppResourceProcedureContext,
  readDomainActor,
  rethrowDomainAsTrpc,
  t,
  type AppResourceProcedureContext,
} from "./resource-trpc";

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

export const pullRequestRouter = t.router({
  createPullRequest: t.procedure
    .input(pullRequestCreateInputSchema)
    .output(pullRequestDetailSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return pullRequestDetailSchema.parse(
          await createPullRequest(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  listPullRequests: t.procedure
    .input(projectRefSchema)
    .output(pullRequestSummarySchema.array())
    .query(async ({ ctx, input }) => {
      try {
        return pullRequestSummarySchema
          .array()
          .parse(await listPullRequests(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  listPullRequestReviewThreads: t.procedure
    .input(pullRequestReviewThreadFilterInputSchema)
    .output(pullRequestReviewThreadSchema.array())
    .query(async ({ ctx, input }) => {
      try {
        const threads = pullRequestReviewThreadSchema
          .array()
          .parse(await listPullRequestReviewThreads(await readDomainActor(ctx), input));
        return threads.filter((thread) => matchesReviewThreadFilter(thread, input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  readPullRequestReviewCounts: t.procedure
    .input(pullRequestReviewThreadFilterInputSchema)
    .output(pullRequestReviewCountsSchema)
    .query(async ({ ctx, input }) => {
      try {
        return pullRequestReviewCountsSchema.parse(
          await readPullRequestReviewCounts(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  readPullRequestDetail: t.procedure
    .input(pullRequestRefSchema)
    .output(pullRequestDetailSchema)
    .query(async ({ ctx, input }) => {
      try {
        return pullRequestDetailSchema.parse(
          await readPullRequestDetail(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  updatePullRequestState: t.procedure
    .input(pullRequestStateUpdateInputSchema)
    .output(pullRequestDetailSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return pullRequestDetailSchema.parse(
          await updatePullRequestState(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
});

export function createPullRequestCaller(overrides: Partial<AppResourceProcedureContext> = {}) {
  return pullRequestRouter.createCaller({
    ...createDefaultAppResourceProcedureContext(),
    ...overrides,
  });
}
