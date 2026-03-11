import {
  issueLabelCreateInputSchema,
  issueLabelDeleteInputSchema,
  issueLabelSchema,
  issueLabelUpdateInputSchema,
  labelCategoryCreateInputSchema,
  labelCategoryDeleteInputSchema,
  labelCategorySchema,
  labelCategoryUpdateInputSchema,
  projectRefSchema,
} from "@yona/contracts";
import { z } from "zod";
import {
  createIssueLabel,
  createLabelCategory,
  deleteIssueLabel,
  deleteLabelCategory,
  listIssueLabels,
  listLabelCategories,
  updateIssueLabel,
  updateLabelCategory,
} from "@yona/domain";
import {
  createDefaultAppResourceProcedureContext,
  readDomainActor,
  rethrowDomainAsTrpc,
  t,
  type AppResourceProcedureContext,
} from "./resource-trpc";

export const labelRouter = t.router({
  createIssueLabel: t.procedure
    .input(issueLabelCreateInputSchema)
    .output(issueLabelSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return issueLabelSchema.parse(await createIssueLabel(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  createLabelCategory: t.procedure
    .input(labelCategoryCreateInputSchema)
    .output(labelCategorySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return labelCategorySchema.parse(
          await createLabelCategory(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  deleteIssueLabel: t.procedure
    .input(issueLabelDeleteInputSchema)
    .output(z.boolean())
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteIssueLabel(await readDomainActor(ctx), input);
        return true;
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  deleteLabelCategory: t.procedure
    .input(labelCategoryDeleteInputSchema)
    .output(z.boolean())
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteLabelCategory(await readDomainActor(ctx), input);
        return true;
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  listIssueLabels: t.procedure
    .input(projectRefSchema)
    .output(issueLabelSchema.array())
    .query(async ({ ctx, input }) => {
      try {
        return issueLabelSchema
          .array()
          .parse(await listIssueLabels(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  listLabelCategories: t.procedure
    .input(projectRefSchema)
    .output(labelCategorySchema.array())
    .query(async ({ ctx, input }) => {
      try {
        return labelCategorySchema
          .array()
          .parse(await listLabelCategories(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  updateIssueLabel: t.procedure
    .input(issueLabelUpdateInputSchema)
    .output(issueLabelSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return issueLabelSchema.parse(await updateIssueLabel(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  updateLabelCategory: t.procedure
    .input(labelCategoryUpdateInputSchema)
    .output(labelCategorySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return labelCategorySchema.parse(
          await updateLabelCategory(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
});

export function createLabelCaller(overrides: Partial<AppResourceProcedureContext> = {}) {
  return labelRouter.createCaller({
    ...createDefaultAppResourceProcedureContext(),
    ...overrides,
  });
}
