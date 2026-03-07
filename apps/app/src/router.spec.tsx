import { describe, expect, it, vi } from "vitest";

vi.mock("@app/lib/shell-data", () => ({
  buildProtectedRedirect: vi.fn((session: { isAuthenticated: boolean }, attemptedHref: string) =>
    session.isAuthenticated
      ? null
      : {
          to: "/login",
          search: {
            redirect: attemptedHref,
          },
        },
  ),
  getPublicShellData: vi.fn(async () => ({
    headline: "Yona App Shell",
    summary:
      "TanStack Start, Router, Query, and server functions are wired into a single Bun-first shell.",
    workstreams: [
      "request-scoped query client",
      "SSR loader prefetch + suspense query hydration",
      "beforeLoad auth boundary",
    ],
  })),
  getProtectedShellData: vi.fn(async () => ({
    title: "Protected Workspace",
    lanes: [],
  })),
  readDemoSession: vi.fn(async () => ({
    isAuthenticated: false,
    userLabel: null,
  })),
  signInDemo: vi.fn(async () => ({
    ok: true,
  })),
  signOutDemo: vi.fn(async () => ({
    ok: true,
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

    expect(html).toContain("Yona App Shell");
    expect(html).toContain("request-scoped query client");
  });

  it("creates a fresh query client for each router instance", () => {
    const firstRouter = getRouter();
    const secondRouter = getRouter();

    expect(firstRouter.options.context.queryClient).not.toBe(
      secondRouter.options.context.queryClient,
    );
  });
});
