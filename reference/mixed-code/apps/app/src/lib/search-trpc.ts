import { searchInputSchema, searchPageSchema } from "@yona/contracts";
import {
  createDefaultAppResourceProcedureContext,
  readDomainActor,
  rethrowDomainAsTrpc,
  t,
  type AppResourceProcedureContext,
} from "./resource-trpc";

export const searchRouter = t.router({
  search: t.procedure
    .input(searchInputSchema)
    .output(searchPageSchema)
    .query(async ({ ctx, input }) => {
      try {
        const { search } = await import("@yona/domain");
        return searchPageSchema.parse(await search(await readDomainActor(ctx), input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
});

export function createSearchCaller(overrides: Partial<AppResourceProcedureContext> = {}) {
  return searchRouter.createCaller({
    ...createDefaultAppResourceProcedureContext(),
    ...overrides,
  });
}
