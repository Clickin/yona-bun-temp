import type { QueryClient } from "@tanstack/react-query";
import type { AppSessionProjection } from "@yona/contracts";
import { buildAnonymousSession } from "@yona/domain";

export function buildAnonymousAppSession(): AppSessionProjection {
  return {
    ...buildAnonymousSession(),
    emailAddress: null,
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

export function setCurrentSessionData(
  queryClient: Pick<QueryClient, "setQueryData">,
  session: AppSessionProjection,
): void {
  queryClient.setQueryData(currentSessionQueryKey, session);
}

export function resetCurrentSessionData(queryClient: Pick<QueryClient, "setQueryData">): void {
  setCurrentSessionData(queryClient, buildAnonymousAppSession());
}
