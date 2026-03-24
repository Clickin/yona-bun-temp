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
  type DefaultLandingPreference,
  type DefaultLandingPreferenceInput,
  type PersonalNotificationItem,
  type PersonalProjectEntry,
  type PersonalProjectFavoriteToggleResult,
  type PersonalSidebar,
  type ProjectNotificationPreference,
  type ProjectNotificationPreferenceInput,
  type UserPublicProfile,
  type UserPublicProfileRef,
} from "@yona/contracts";
import {
  listFavoriteProjectsForUser,
  listNotificationsForUser,
  listRecentProjectsForUser,
  readDefaultLandingPathForUser,
  readUserPublicProfileByLoginId,
  setDefaultLandingPathForUser,
  setProjectNotificationAllowed,
  toggleFavoriteProjectForUser,
  trackRecentProjectVisitForUser,
} from "@yona/db";
import { requireAuthenticatedActor } from "./actor-utils";
import { normalizeDefaultLandingPath } from "./default-landing";
import { DomainNotFoundError, DomainValidationError, type DomainActor } from "./errors";

export interface UserWorkspaceServiceDeps {
  listFavoriteProjectsForUser: typeof listFavoriteProjectsForUser;
  listNotificationsForUser: typeof listNotificationsForUser;
  listRecentProjectsForUser: typeof listRecentProjectsForUser;
  readDefaultLandingPathForUser: typeof readDefaultLandingPathForUser;
  readUserPublicProfileByLoginId: typeof readUserPublicProfileByLoginId;
  setDefaultLandingPathForUser: typeof setDefaultLandingPathForUser;
  setProjectNotificationAllowed: typeof setProjectNotificationAllowed;
  toggleFavoriteProjectForUser: typeof toggleFavoriteProjectForUser;
  trackRecentProjectVisitForUser: typeof trackRecentProjectVisitForUser;
}

const defaultDeps: UserWorkspaceServiceDeps = {
  listFavoriteProjectsForUser,
  listNotificationsForUser,
  listRecentProjectsForUser,
  readDefaultLandingPathForUser,
  readUserPublicProfileByLoginId,
  setDefaultLandingPathForUser,
  setProjectNotificationAllowed,
  toggleFavoriteProjectForUser,
  trackRecentProjectVisitForUser,
};

export async function readMyFavorites(
  actor: DomainActor,
  deps: UserWorkspaceServiceDeps = defaultDeps,
): Promise<PersonalProjectEntry[]> {
  requireAuthenticatedActor(actor);
  return personalProjectEntrySchema
    .array()
    .parse(await deps.listFavoriteProjectsForUser(actor.actorId));
}

export async function readMyRecentProjects(
  actor: DomainActor,
  deps: UserWorkspaceServiceDeps = defaultDeps,
): Promise<PersonalProjectEntry[]> {
  requireAuthenticatedActor(actor);
  return personalProjectEntrySchema
    .array()
    .parse(await deps.listRecentProjectsForUser(actor.actorId));
}

export async function readMyNotifications(
  actor: DomainActor,
  deps: UserWorkspaceServiceDeps = defaultDeps,
): Promise<PersonalNotificationItem[]> {
  requireAuthenticatedActor(actor);
  return personalNotificationsSchema.parse(await deps.listNotificationsForUser(actor.actorId));
}

export async function readMySidebar(
  actor: DomainActor,
  deps: UserWorkspaceServiceDeps = defaultDeps,
): Promise<PersonalSidebar> {
  requireAuthenticatedActor(actor);

  const [favorites, recentProjects] = await Promise.all([
    deps.listFavoriteProjectsForUser(actor.actorId),
    deps.listRecentProjectsForUser(actor.actorId),
  ]);

  return personalSidebarSchema.parse({
    favorites,
    recentProjects,
  });
}

export async function toggleFavoriteProject(
  actor: DomainActor,
  input: PersonalProjectEntry,
  deps: UserWorkspaceServiceDeps = defaultDeps,
): Promise<PersonalProjectFavoriteToggleResult> {
  requireAuthenticatedActor(actor);
  const parsedInput = personalProjectEntrySchema.parse(input);
  return personalProjectFavoriteToggleResultSchema.parse(
    await deps.toggleFavoriteProjectForUser(actor.actorId, parsedInput),
  );
}

export async function recordRecentProjectVisit(
  actor: DomainActor,
  input: PersonalProjectEntry,
  deps: UserWorkspaceServiceDeps = defaultDeps,
): Promise<PersonalProjectEntry> {
  requireAuthenticatedActor(actor);
  const parsedInput = personalProjectEntrySchema.parse(input);
  return personalProjectEntrySchema.parse(
    await deps.trackRecentProjectVisitForUser(actor.actorId, parsedInput),
  );
}

export async function updateProjectNotificationPreference(
  actor: DomainActor,
  input: ProjectNotificationPreferenceInput,
  deps: UserWorkspaceServiceDeps = defaultDeps,
): Promise<ProjectNotificationPreference> {
  requireAuthenticatedActor(actor);
  const parsedInput = projectNotificationPreferenceInputSchema.parse(input);

  return projectNotificationPreferenceSchema.parse(
    await deps.setProjectNotificationAllowed(actor.actorId, parsedInput),
  );
}

export async function readMyDefaultLandingPreference(
  actor: DomainActor,
  deps: UserWorkspaceServiceDeps = defaultDeps,
): Promise<DefaultLandingPreference> {
  requireAuthenticatedActor(actor);

  return defaultLandingPreferenceSchema.parse({
    path: normalizeDefaultLandingPath(await deps.readDefaultLandingPathForUser(actor.actorId)),
  });
}

export async function setMyDefaultLandingPreference(
  actor: DomainActor,
  input: DefaultLandingPreferenceInput,
  deps: UserWorkspaceServiceDeps = defaultDeps,
): Promise<DefaultLandingPreference> {
  requireAuthenticatedActor(actor);
  const parsedInput = defaultLandingPreferenceInputSchema.parse(input);
  const normalizedPath = normalizeDefaultLandingPath(parsedInput.path);
  if (!normalizedPath) {
    throw new DomainValidationError("Default landing path is invalid.");
  }

  return defaultLandingPreferenceSchema.parse({
    path: await deps.setDefaultLandingPathForUser(actor.actorId, normalizedPath),
  });
}

export async function readPublicUserProfile(
  input: UserPublicProfileRef,
  deps: UserWorkspaceServiceDeps = defaultDeps,
): Promise<UserPublicProfile> {
  const parsedInput = userPublicProfileRefSchema.parse(input);
  const profile = await deps.readUserPublicProfileByLoginId(parsedInput.loginId);
  if (!profile) {
    throw new DomainNotFoundError("User not found.");
  }

  return userPublicProfileSchema.parse(profile);
}
