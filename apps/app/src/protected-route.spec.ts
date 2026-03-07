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
  getProtectedShellData: vi.fn(async () => ({
    title: "Protected Workspace",
    lanes: [],
  })),
  readDemoSession: vi.fn(async () => ({
    isAuthenticated: false,
    userLabel: null,
  })),
  signOutDemo: vi.fn(async () => ({
    ok: true,
  })),
}));

import { readDemoSession } from "@app/lib/shell-data";
import { Route } from "@app/routes/protected";

const mockedReadDemoSession = vi.mocked(readDemoSession);

describe("Protected route guard", () => {
  it("throws a login redirect for guest sessions", async () => {
    mockedReadDemoSession.mockResolvedValueOnce({
      isAuthenticated: false,
      userLabel: null,
    });

    await expect(
      Route.options.beforeLoad?.({
        location: { href: "/protected" },
      } as never),
    ).rejects.toMatchObject({
      options: {
        to: "/login",
        search: {
          redirect: "/protected",
        },
      },
    });
  });

  it("allows authenticated sessions through beforeLoad", async () => {
    mockedReadDemoSession.mockResolvedValueOnce({
      isAuthenticated: true,
      userLabel: "Demo Maintainer",
    });

    await expect(
      Route.options.beforeLoad?.({
        location: { href: "/protected" },
      } as never),
    ).resolves.toBeUndefined();
  });
});
