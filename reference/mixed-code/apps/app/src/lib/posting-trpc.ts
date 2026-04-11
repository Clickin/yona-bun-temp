import {
  postingCommentCreateInputSchema,
  postingDetailSchema,
  postingRefSchema,
  postingSummarySchema,
  projectRefSchema,
} from "@yona/contracts";
import { createPosting, createPostingComment, listPostings, readPostingDetail } from "@yona/domain";
import {
  createDefaultAppResourceProcedureContext,
  readDomainActor,
  rethrowDomainAsTrpc,
  t,
  type AppResourceProcedureContext,
} from "./resource-trpc";

export const postingRouter = t.router({
  createPosting: t.procedure
    .input(
      projectRefSchema
        .extend({
          body: postingDetailSchema.shape.body,
          title: postingSummarySchema.shape.title,
        })
        .strict(),
    )
    .output(postingDetailSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return postingDetailSchema.parse(await createPosting(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  createPostingComment: t.procedure
    .input(postingCommentCreateInputSchema)
    .output(postingDetailSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return postingDetailSchema.parse(
          await createPostingComment(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  listPostings: t.procedure
    .input(projectRefSchema)
    .output(postingSummarySchema.array())
    .query(async ({ ctx, input }) => {
      try {
        return postingSummarySchema
          .array()
          .parse(await listPostings(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  readPostingDetail: t.procedure
    .input(postingRefSchema)
    .output(postingDetailSchema)
    .query(async ({ ctx, input }) => {
      try {
        return postingDetailSchema.parse(
          await readPostingDetail(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
});

export function createPostingCaller(overrides: Partial<AppResourceProcedureContext> = {}) {
  return postingRouter.createCaller({
    ...createDefaultAppResourceProcedureContext(),
    ...overrides,
  });
}
