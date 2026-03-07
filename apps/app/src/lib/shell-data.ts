import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";

export const DEMO_AUTH_COOKIE = "yona_demo_auth";

export interface DemoSession {
  isAuthenticated: boolean;
  userLabel: string | null;
}

export interface ProtectedRedirect {
  to: "/login";
  search: {
    redirect: string;
  };
}

export const getPublicShellData = createServerFn({ method: "GET" }).handler(async () => {
  return {
    headline: "Yona App Shell",
    summary:
      "TanStack Start, Router, Query, and server functions are wired into a single Bun-first shell.",
    workstreams: [
      "request-scoped query client",
      "SSR loader prefetch + suspense query hydration",
      "beforeLoad auth boundary",
    ],
  };
});

export const getProtectedShellData = createServerFn({ method: "GET" }).handler(async () => {
  return {
    lanes: [
      "Public dashboard preloads before render.",
      "Protected route redirects until the cookie-backed demo session exists.",
      "Mutations use createServerFn and revalidate the router after auth changes.",
    ],
    title: "Protected Workspace",
  };
});

export const readDemoSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<DemoSession> => {
    const isAuthenticated = getCookie(DEMO_AUTH_COOKIE) === "1";

    return {
      isAuthenticated,
      userLabel: isAuthenticated ? "Demo Maintainer" : null,
    };
  },
);

export const signInDemo = createServerFn({ method: "POST" }).handler(async () => {
  setCookie(DEMO_AUTH_COOKIE, "1", {
    httpOnly: true,
    maxAge: 60 * 60,
    path: "/",
    sameSite: "lax",
  });

  return {
    ok: true,
  };
});

export const signOutDemo = createServerFn({ method: "POST" }).handler(async () => {
  setCookie(DEMO_AUTH_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });

  return {
    ok: true,
  };
});

export function buildProtectedRedirect(
  session: DemoSession,
  attemptedHref: string,
): ProtectedRedirect | null {
  if (session.isAuthenticated) {
    return null;
  }

  return {
    to: "/login",
    search: {
      redirect: attemptedHref,
    },
  };
}
