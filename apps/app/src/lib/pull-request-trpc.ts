import {
  pullRequestCreateInputSchema,
  pullRequestDetailSchema,
  pullRequestRefSchema,
  pullRequestStateUpdateInputSchema,
  pullRequestSummarySchema,
  projectRefSchema,
} from "@yona/contracts";
import {
  createPullRequest,
  listPullRequests,
  readPullRequestDetail,
  updatePullRequestState,
} from "@yona/domain";
import {
  createDefaultAppResourceProcedureContext,
  readDomainActor,
  rethrowDomainAsTrpc,
  t,
  type AppResourceProcedureContext,
} from "./resource-trpc";

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
