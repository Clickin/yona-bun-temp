import {
  projectCreateInputSchema,
  projectDetailSchema,
  projectRefSchema,
  projectUpdateInputSchema,
} from "@yona/contracts";
import { createProject, readProjectDetail, readProjectSettings, updateProject } from "@yona/domain";
import {
  createDefaultAppResourceProcedureContext,
  readDomainActor,
  rethrowDomainAsTrpc,
  t,
  type AppResourceProcedureContext,
} from "./resource-trpc";

export const projectRouter = t.router({
  createProject: t.procedure
    .input(projectCreateInputSchema)
    .output(projectDetailSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return projectDetailSchema.parse(await createProject(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  readProjectDetail: t.procedure
    .input(projectRefSchema)
    .output(projectDetailSchema)
    .query(async ({ ctx, input }) => {
      try {
        return projectDetailSchema.parse(
          await readProjectDetail(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  readProjectSettings: t.procedure
    .input(projectRefSchema)
    .output(projectDetailSchema)
    .query(async ({ ctx, input }) => {
      try {
        return projectDetailSchema.parse(
          await readProjectSettings(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  updateProject: t.procedure
    .input(projectUpdateInputSchema)
    .output(projectDetailSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return projectDetailSchema.parse(await updateProject(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
});

export function createProjectCaller(overrides: Partial<AppResourceProcedureContext> = {}) {
  return projectRouter.createCaller({
    ...createDefaultAppResourceProcedureContext(),
    ...overrides,
  });
}
