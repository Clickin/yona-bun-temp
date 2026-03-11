import {
  milestoneCreateInputSchema,
  milestoneDeleteInputSchema,
  milestoneRefSchema,
  milestoneSchema,
  milestoneUpdateInputSchema,
  projectRefSchema,
} from "@yona/contracts";
import {
  createMilestone,
  deleteMilestone,
  listMilestones,
  readMilestoneDetail,
  updateMilestone,
} from "@yona/domain";
import { z } from "zod";
import {
  createDefaultAppResourceProcedureContext,
  readDomainActor,
  rethrowDomainAsTrpc,
  t,
  type AppResourceProcedureContext,
} from "./resource-trpc";

export const milestoneRouter = t.router({
  createMilestone: t.procedure
    .input(milestoneCreateInputSchema)
    .output(milestoneSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return milestoneSchema.parse(await createMilestone(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  deleteMilestone: t.procedure
    .input(milestoneDeleteInputSchema)
    .output(z.boolean())
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteMilestone(await readDomainActor(ctx), input);
        return true;
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  listMilestones: t.procedure
    .input(projectRefSchema)
    .output(milestoneSchema.array())
    .query(async ({ ctx, input }) => {
      try {
        return milestoneSchema
          .array()
          .parse(await listMilestones(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  readMilestoneDetail: t.procedure
    .input(milestoneRefSchema)
    .output(milestoneSchema)
    .query(async ({ ctx, input }) => {
      try {
        return milestoneSchema.parse(await readMilestoneDetail(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  updateMilestone: t.procedure
    .input(milestoneUpdateInputSchema)
    .output(milestoneSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return milestoneSchema.parse(await updateMilestone(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
});

export function createMilestoneCaller(overrides: Partial<AppResourceProcedureContext> = {}) {
  return milestoneRouter.createCaller({
    ...createDefaultAppResourceProcedureContext(),
    ...overrides,
  });
}
