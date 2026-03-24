import { describe, expect, it, vi } from "vitest";

vi.mock("@app/lib/shell-data", () => ({
  getPublicShellData: vi.fn(async () => ({
    workstreams: ["projects", "groups", "search"],
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

vi.mock("@app/lib/locale", () => ({
  readCurrentLocale: vi.fn(async () => ({
    locale: "en",
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

    expect(html).toContain("Yona");
    expect(html).toContain("Create new project");
    expect(html).toContain("New Group");
  });

  it("preserves the current route search when building locale switch links inside the app layout", async () => {
    const router = getRouter({
      history: createMemoryHistory({ initialEntries: ["/search?pageSize=20&scope=global"] }),
    });

    await router.load();
    const html = renderToString(<RouterProvider router={router} />);

    expect(html).toContain("Language");
    expect(html).toContain('href="/search?pageSize=20&amp;scope=global&amp;lang=en"');
    expect(html).toContain('href="/search?pageSize=20&amp;scope=global&amp;lang=ko-KR"');
  });

  it("keeps auth routes outside the shared app layout", async () => {
    const router = getRouter({
      history: createMemoryHistory({ initialEntries: ["/login?redirect=%2Fme"] }),
    });

    await router.load();
    const html = renderToString(<RouterProvider router={router} />);

    expect(html).not.toContain("Language");
    expect(html).not.toContain("app-navbar");
    expect(html).toContain("Log in to Yona");
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
