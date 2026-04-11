import { createServerFn } from "@tanstack/react-start";
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

export const readMySidebar = createServerFn({ method: "GET" }).handler(async () => {
  const { createServerMeCaller } = await import("./me-trpc.server");
  return personalSidebarSchema.parse(await createServerMeCaller().readMySidebar());
});

export const readMyFavorites = createServerFn({ method: "GET" }).handler(async () => {
  const { createServerMeCaller } = await import("./me-trpc.server");
  return personalProjectEntrySchema.array().parse(await createServerMeCaller().readMyFavorites());
});

export const readMyRecentProjects = createServerFn({ method: "GET" }).handler(async () => {
  const { createServerMeCaller } = await import("./me-trpc.server");
  return personalProjectEntrySchema
    .array()
    .parse(await createServerMeCaller().readMyRecentProjects());
});

export const readMyNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const { createServerMeCaller } = await import("./me-trpc.server");
  return personalNotificationsSchema.parse(await createServerMeCaller().readMyNotifications());
});

export const readMyDefaultLandingPreference = createServerFn({ method: "GET" }).handler(
  async () => {
    const { createServerMeCaller } = await import("./me-trpc.server");
    return defaultLandingPreferenceSchema.parse(
      await createServerMeCaller().readMyDefaultLandingPreference(),
    );
  },
);

export const toggleFavoriteProject = createServerFn({ method: "POST" })
  .inputValidator(personalProjectEntrySchema)
  .handler(async ({ data }) => {
    const { createServerMeCaller } = await import("./me-trpc.server");
    return personalProjectFavoriteToggleResultSchema.parse(
      await createServerMeCaller().toggleFavoriteProject(data),
    );
  });

export const recordRecentProjectVisit = createServerFn({ method: "POST" })
  .inputValidator(personalProjectEntrySchema)
  .handler(async ({ data }) => {
    const { createServerMeCaller } = await import("./me-trpc.server");
    return personalProjectEntrySchema.parse(
      await createServerMeCaller().recordRecentProjectVisit(data),
    );
  });

export const updateProjectNotificationPreference = createServerFn({ method: "POST" })
  .inputValidator(projectNotificationPreferenceInputSchema)
  .handler(async ({ data }) => {
    const { createServerMeCaller } = await import("./me-trpc.server");
    return projectNotificationPreferenceSchema.parse(
      await createServerMeCaller().updateProjectNotificationPreference(data),
    );
  });

export const setMyDefaultLandingPreference = createServerFn({ method: "POST" })
  .inputValidator(defaultLandingPreferenceInputSchema)
  .handler(async ({ data }) => {
    const { createServerMeCaller } = await import("./me-trpc.server");
    return defaultLandingPreferenceSchema.parse(
      await createServerMeCaller().setMyDefaultLandingPreference(data),
    );
  });

export const readPublicUserProfile = createServerFn({ method: "GET" })
  .inputValidator(userPublicProfileRefSchema)
  .handler(async ({ data }) => {
    const { createServerMeCaller } = await import("./me-trpc.server");
    return userPublicProfileSchema.parse(await createServerMeCaller().readPublicUserProfile(data));
  });
