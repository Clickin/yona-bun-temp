import { z } from "zod";
import { authDisplayNameSchema, authLoginIdSchema } from "./auth";
import { projectRefSchema } from "./project";

export const personalProjectEntrySchema = projectRefSchema;

export type PersonalProjectEntry = z.infer<typeof personalProjectEntrySchema>;

export const personalProjectFavoriteToggleResultSchema = personalProjectEntrySchema
  .extend({
    favorited: z.boolean(),
  })
  .strict();

export type PersonalProjectFavoriteToggleResult = z.infer<
  typeof personalProjectFavoriteToggleResultSchema
>;

export const projectNotificationTypeSchema = z.string().trim().min(1).max(64);

export type ProjectNotificationType = z.infer<typeof projectNotificationTypeSchema>;

export const projectNotificationPreferenceInputSchema = projectRefSchema
  .extend({
    allowed: z.boolean(),
    notificationType: projectNotificationTypeSchema,
  })
  .strict();

export type ProjectNotificationPreferenceInput = z.infer<
  typeof projectNotificationPreferenceInputSchema
>;

export const projectNotificationPreferenceSchema = projectNotificationPreferenceInputSchema;

export type ProjectNotificationPreference = z.infer<typeof projectNotificationPreferenceSchema>;

export const userPublicProfileRefSchema = z
  .object({
    loginId: authLoginIdSchema,
  })
  .strict();

export type UserPublicProfileRef = z.infer<typeof userPublicProfileRefSchema>;

export const userPublicProfileSchema = z
  .object({
    joinedAt: z.date().nullable(),
    loginId: authLoginIdSchema,
    userLabel: authDisplayNameSchema,
  })
  .strict();

export type UserPublicProfile = z.infer<typeof userPublicProfileSchema>;

export const personalSidebarSchema = z
  .object({
    favorites: z.array(personalProjectEntrySchema),
    recentProjects: z.array(personalProjectEntrySchema),
  })
  .strict();

export type PersonalSidebar = z.infer<typeof personalSidebarSchema>;

export const personalNotificationItemSchema = z
  .object({
    createdAt: z.date().nullable(),
    eventId: z.number().int().positive(),
    eventType: z.string().nullable(),
    resourceId: z.string().nullable(),
    resourceType: z.string().nullable(),
    title: z.string().nullable(),
  })
  .strict();

export type PersonalNotificationItem = z.infer<typeof personalNotificationItemSchema>;

export const personalNotificationsSchema = z.array(personalNotificationItemSchema);

export type PersonalNotifications = z.infer<typeof personalNotificationsSchema>;
