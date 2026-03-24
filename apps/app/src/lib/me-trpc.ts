import {
  defaultLandingPreferenceInputSchema,
  defaultLandingPreferenceSchema,
  personalNotificationsSchema,
  personalProjectEntrySchema,
  personalProjectFavoriteToggleResultSchema,
  personalSidebarSchema,
  projectNotificationPreferenceInputSchema,
  projectNotificationPreferenceSchema,
  userPublicProfileRefSchema,
  userPublicProfileSchema,
} from "@yona/contracts";
import {
  readMyFavorites,
  readMyNotifications,
  readMyRecentProjects,
  readMySidebar,
  readMyDefaultLandingPreference,
  readPublicUserProfile,
  recordRecentProjectVisit,
  setMyDefaultLandingPreference,
  toggleFavoriteProject,
  updateProjectNotificationPreference,
} from "@yona/domain";
import {
  createDefaultAppResourceProcedureContext,
  readDomainActor,
  rethrowDomainAsTrpc,
  t,
  type AppResourceProcedureContext,
} from "./resource-trpc";

export const meRouter = t.router({
  readMySidebar: t.procedure.output(personalSidebarSchema).query(async ({ ctx }) => {
    try {
      return personalSidebarSchema.parse(await readMySidebar(await readDomainActor(ctx)));
    } catch (error) {
      return rethrowDomainAsTrpc(error);
    }
  }),
  readMyFavorites: t.procedure.output(personalProjectEntrySchema.array()).query(async ({ ctx }) => {
    try {
      return personalProjectEntrySchema
        .array()
        .parse(await readMyFavorites(await readDomainActor(ctx)));
    } catch (error) {
      return rethrowDomainAsTrpc(error);
    }
  }),
  readMyRecentProjects: t.procedure
    .output(personalProjectEntrySchema.array())
    .query(async ({ ctx }) => {
      try {
        return personalProjectEntrySchema
          .array()
          .parse(await readMyRecentProjects(await readDomainActor(ctx)));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  readMyNotifications: t.procedure.output(personalNotificationsSchema).query(async ({ ctx }) => {
    try {
      return personalNotificationsSchema.parse(
        await readMyNotifications(await readDomainActor(ctx)),
      );
    } catch (error) {
      return rethrowDomainAsTrpc(error);
    }
  }),
  readMyDefaultLandingPreference: t.procedure
    .output(defaultLandingPreferenceSchema)
    .query(async ({ ctx }) => {
      try {
        return defaultLandingPreferenceSchema.parse(
          await readMyDefaultLandingPreference(await readDomainActor(ctx)),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  toggleFavoriteProject: t.procedure
    .input(personalProjectEntrySchema)
    .output(personalProjectFavoriteToggleResultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return personalProjectFavoriteToggleResultSchema.parse(
          await toggleFavoriteProject(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  recordRecentProjectVisit: t.procedure
    .input(personalProjectEntrySchema)
    .output(personalProjectEntrySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return personalProjectEntrySchema.parse(
          await recordRecentProjectVisit(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  updateProjectNotificationPreference: t.procedure
    .input(projectNotificationPreferenceInputSchema)
    .output(projectNotificationPreferenceSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return projectNotificationPreferenceSchema.parse(
          await updateProjectNotificationPreference(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  setMyDefaultLandingPreference: t.procedure
    .input(defaultLandingPreferenceInputSchema)
    .output(defaultLandingPreferenceSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return defaultLandingPreferenceSchema.parse(
          await setMyDefaultLandingPreference(await readDomainActor(ctx), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  readPublicUserProfile: t.procedure
    .input(userPublicProfileRefSchema)
    .output(userPublicProfileSchema)
    .query(async ({ input }) => {
      try {
        return userPublicProfileSchema.parse(await readPublicUserProfile(input));
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
});

export function createMeCaller(overrides: Partial<AppResourceProcedureContext> = {}) {
  return meRouter.createCaller({
    ...createDefaultAppResourceProcedureContext(),
    ...overrides,
  });
}
