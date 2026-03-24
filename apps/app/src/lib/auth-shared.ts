import type { QueryClient } from "@tanstack/react-query";
import type { AppSessionProjection } from "@yona/contracts";
import { resolveDefaultLandingPath, resolvePostAuthLandingPath } from "@yona/domain";

export function buildAnonymousAppSession(): AppSessionProjection {
  return {
    actorId: null,
    defaultLandingPath: null,
    emailAddress: null,
    isAnonymous: true,
    isConfirmed: false,
    isSiteAdmin: false,
    loginId: null,
    userLabel: null,
  };
}

export interface ProtectedRedirect {
  search: {
    redirect: string;
  };
  to: "/login";
}

export const currentSessionQueryKey = ["app-shell", "session"] as const;

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

export function resolveAuthenticatedHomePath(session: AppSessionProjection): string {
  return resolveDefaultLandingPath(session.defaultLandingPath);
}

export function resolvePostAuthRedirectPath(
  session: AppSessionProjection,
  requestedRedirect: string | undefined,
): string {
  return resolvePostAuthLandingPath(requestedRedirect, session.defaultLandingPath);
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
