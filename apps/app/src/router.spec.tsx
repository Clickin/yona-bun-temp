import { describe, expect, it, vi } from "vitest";

vi.mock("@app/lib/shell-data", () => ({
  getPublicShellData: vi.fn(async () => ({
    headline: "Yona Canonical App",
    summary:
      "TanStack Start, Router, Query, and server functions now own the primary Yona application runtime.",
    workstreams: [
      "server functions own internal auth mutations",
      "server routes expose canonical HTTP auth surfaces",
      "protected routes read the session projection before render",
    ],
  })),
  getProtectedShellData: vi.fn(async () => ({
    title: "Protected Workspace",
    lanes: [],
  })),
}));

vi.mock("@app/lib/auth", () => ({
  buildProtectedRedirect: vi.fn((session: { isAnonymous: boolean }, attemptedHref: string) =>
    session.isAnonymous
      ? {
          to: "/login",
          search: {
            redirect: attemptedHref,
          },
        }
      : null,
  ),
  readCurrentSession: vi.fn(async () => ({
    actorId: null,
    isAnonymous: true,
    isConfirmed: false,
    isSiteAdmin: false,
    loginId: null,
    userLabel: null,
    emailAddress: null,
  })),
  signInWithPassword: vi.fn(async () => ({
    ok: true,
    session: {
      actorId: 1,
      emailAddress: "admin@yona.local",
      isAnonymous: false,
      isConfirmed: true,
      isSiteAdmin: true,
      loginId: "admin",
      userLabel: "Admin",
    },
  })),
  registerWithPassword: vi.fn(async () => ({
    ok: true,
    session: {
      actorId: 2,
      emailAddress: "door@example.com",
      isAnonymous: false,
      isConfirmed: true,
      isSiteAdmin: false,
      loginId: "door",
      userLabel: "Door TTS",
    },
  })),
  requestPasswordReset: vi.fn(async () => ({
    ok: true,
  })),
  completePasswordReset: vi.fn(async () => ({
    ok: true,
    session: {
      actorId: null,
      emailAddress: null,
      isAnonymous: true,
      isConfirmed: false,
      isSiteAdmin: false,
      loginId: null,
      userLabel: null,
    },
  })),
  signOut: vi.fn(async () => ({
    ok: true,
    session: {
      actorId: null,
      emailAddress: null,
      isAnonymous: true,
      isConfirmed: false,
      isSiteAdmin: false,
      loginId: null,
      userLabel: null,
    },
  })),
}));

import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { renderToString } from "react-dom/server";
import { getRouter } from "@app/router";

describe("TanStack Start app shell", () => {
  it("boots the public shell and renders SSR data through suspense queries", async () => {
    const router = getRouter({
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });

    await router.load();
    const html = renderToString(<RouterProvider router={router} />);

    expect(html).toContain("Yona Canonical App");
    expect(html).toContain("server functions own internal auth mutations");
  });

  it("creates a fresh query client for each router instance", () => {
    const firstRouter = getRouter();
    const secondRouter = getRouter();

    expect(firstRouter.options.context.queryClient).not.toBe(
      secondRouter.options.context.queryClient,
    );
    expect(firstRouter.options.context.authCaller).not.toBe(
      secondRouter.options.context.authCaller,
    );
  });
});
