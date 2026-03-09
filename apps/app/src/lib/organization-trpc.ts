import {
  organizationCreateInputSchema,
  organizationDetailSchema,
  organizationRefSchema,
  organizationUpdateInputSchema,
} from "@yona/contracts";
import {
  createOrganization,
  readOrganizationDetail,
  readOrganizationSettings,
  updateOrganization,
} from "@yona/domain";
import {
  createDefaultAppResourceProcedureContext,
  readDomainActor,
  rethrowDomainAsTrpc,
  t,
  type AppResourceProcedureContext,
} from "./resource-trpc";

export const organizationRouter = t.router({
  createOrganization: t.procedure
    .input(organizationCreateInputSchema)
    .output(organizationDetailSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return organizationDetailSchema.parse(
          await createOrganization(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  readOrganizationDetail: t.procedure
    .input(organizationRefSchema)
    .output(organizationDetailSchema)
    .query(async ({ ctx, input }) => {
      try {
        return organizationDetailSchema.parse(
          await readOrganizationDetail(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  readOrganizationSettings: t.procedure
    .input(organizationRefSchema)
    .output(organizationDetailSchema)
    .query(async ({ ctx, input }) => {
      try {
        return organizationDetailSchema.parse(
          await readOrganizationSettings(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  updateOrganization: t.procedure
    .input(organizationUpdateInputSchema)
    .output(organizationDetailSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return organizationDetailSchema.parse(
          await updateOrganization(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
});

export function createOrganizationCaller(overrides: Partial<AppResourceProcedureContext> = {}) {
  return organizationRouter.createCaller({
    ...createDefaultAppResourceProcedureContext(),
    ...overrides,
  });
}
