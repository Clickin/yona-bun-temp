import {
  issueCommentCreateInputSchema,
  issueDetailSchema,
  issueRefSchema,
  issueStateUpdateInputSchema,
  issueSummarySchema,
  projectRefSchema,
} from "@yona/contracts";
import {
  createIssue,
  createIssueComment,
  listIssues,
  readIssueDetail,
  updateIssueState,
} from "@yona/domain";
import {
  createDefaultAppResourceProcedureContext,
  readDomainActor,
  rethrowDomainAsTrpc,
  t,
  type AppResourceProcedureContext,
} from "./resource-trpc";

export const issueRouter = t.router({
  createIssue: t.procedure
    .input(
      projectRefSchema
        .extend({
          body: issueDetailSchema.shape.body,
          title: issueSummarySchema.shape.title,
        })
        .strict(),
    )
    .output(issueDetailSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return issueDetailSchema.parse(await createIssue(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  listIssues: t.procedure
    .input(projectRefSchema)
    .output(issueSummarySchema.array())
    .query(async ({ ctx, input }) => {
      try {
        return issueSummarySchema
          .array()
          .parse(await listIssues(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  readIssueDetail: t.procedure
    .input(issueRefSchema)
    .output(issueDetailSchema)
    .query(async ({ ctx, input }) => {
      try {
        return issueDetailSchema.parse(await readIssueDetail(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  createIssueComment: t.procedure
    .input(issueCommentCreateInputSchema)
    .output(issueDetailSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return issueDetailSchema.parse(await createIssueComment(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  updateIssueState: t.procedure
    .input(issueStateUpdateInputSchema)
    .output(issueDetailSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return issueDetailSchema.parse(await updateIssueState(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
});

export function createIssueCaller(overrides: Partial<AppResourceProcedureContext> = {}) {
  return issueRouter.createCaller({
    ...createDefaultAppResourceProcedureContext(),
    ...overrides,
  });
}
