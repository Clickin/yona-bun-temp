import { enrollmentMutationResultSchema, enrollmentRequestRefSchema } from "@yona/contracts";
import { cancelEnrollProject, enrollProject } from "@yona/domain";
import {
  createDefaultAppResourceProcedureContext,
  readDomainActor,
  rethrowDomainAsTrpc,
  t,
  type AppResourceProcedureContext,
} from "./resource-trpc";

export const enrollmentRouter = t.router({
  cancelEnrollProject: t.procedure
    .input(enrollmentRequestRefSchema)
    .output(enrollmentMutationResultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return enrollmentMutationResultSchema.parse(
          await cancelEnrollProject(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  enrollProject: t.procedure
    .input(enrollmentRequestRefSchema)
    .output(enrollmentMutationResultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return enrollmentMutationResultSchema.parse(
          await enrollProject(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
});

export function createEnrollmentCaller(overrides: Partial<AppResourceProcedureContext> = {}) {
  return enrollmentRouter.createCaller({
    ...createDefaultAppResourceProcedureContext(),
    ...overrides,
  });
}
