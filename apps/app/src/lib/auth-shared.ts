import type { QueryClient } from "@tanstack/react-query";
import type { SessionProjection } from "@yona/contracts";
import { buildAnonymousSession } from "@yona/domain";

export interface AppSessionProjection extends SessionProjection {
  emailAddress: string | null;
  userLabel: string | null;
}

export interface ProtectedRedirect {
  search: {
    redirect: string;
  };
  to: "/login";
}

export interface SessionRoutePayload {
  session: null | {
    csrfToken: string;
    expiresAt: string;
    projection: AppSessionProjection;
    userId: number;
  };
  user: null | {
    emailAddress: string;
    id: number;
    isConfirmed: boolean;
    isSiteAdmin: boolean;
    loginId: string;
    name: string;
  };
}

export const currentSessionQueryKey = ["app-shell", "session"] as const;

export function buildAnonymousAppSession(): AppSessionProjection {
  return {
    ...buildAnonymousSession(),
    emailAddress: null,
    userLabel: null,
  };
}

export function buildAuthenticatedAppSession(user: {
  emailAddress: string;
  id: number;
  isConfirmed: boolean;
  isSiteAdmin: boolean;
  loginId: string;
  name: string;
}): AppSessionProjection {
  return {
    actorId: user.id,
    emailAddress: user.emailAddress,
    isAnonymous: false,
    isConfirmed: user.isConfirmed,
    isSiteAdmin: user.isSiteAdmin,
    loginId: user.loginId,
    userLabel: user.name,
  };
}

export function buildProtectedRedirect(
  session: AppSessionProjection,
  attemptedHref: string,
): ProtectedRedirect | null {
  if (!session.isAnonymous) {
    return null;
  }

  return {
    search: {
      redirect: attemptedHref,
    },
    to: "/login",
  };
}

export function setCurrentSessionData(
  queryClient: Pick<QueryClient, "setQueryData">,
  session: AppSessionProjection,
): void {
  queryClient.setQueryData(currentSessionQueryKey, session);
}

export function resetCurrentSessionData(queryClient: Pick<QueryClient, "setQueryData">): void {
  setCurrentSessionData(queryClient, buildAnonymousAppSession());
}
