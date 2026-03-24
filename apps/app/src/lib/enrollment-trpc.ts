import {
  enrollmentMutationResultSchema,
  enrollmentRequestRefSchema,
  organizationEnrollmentRequestRefSchema,
} from "@yona/contracts";
import {
  cancelEnrollOrganization,
  cancelEnrollProject,
  enrollOrganization,
  enrollProject,
} from "@yona/domain";
import {
  createDefaultAppResourceProcedureContext,
  readDomainActor,
  rethrowDomainAsTrpc,
  t,
  type AppResourceProcedureContext,
} from "./resource-trpc";

export const enrollmentRouter = t.router({
  cancelEnrollOrganization: t.procedure
    .input(organizationEnrollmentRequestRefSchema)
    .output(enrollmentMutationResultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return enrollmentMutationResultSchema.parse(
          await cancelEnrollOrganization(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
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
  enrollOrganization: t.procedure
    .input(organizationEnrollmentRequestRefSchema)
    .output(enrollmentMutationResultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return enrollmentMutationResultSchema.parse(
          await enrollOrganization(await readDomainActor(ctx), input),
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
