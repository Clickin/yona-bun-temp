import { describe, expect, it, vi } from "vitest";

vi.mock("@app/lib/shell-data", () => ({
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

import { readCurrentSession } from "@app/lib/auth";
import { Route } from "@app/routes/protected";

const mockedReadCurrentSession = vi.mocked(readCurrentSession);

describe("Protected route guard", () => {
  it("throws a login redirect for guest sessions", async () => {
    mockedReadCurrentSession.mockResolvedValueOnce({
      actorId: null,
      isAnonymous: true,
      isConfirmed: false,
      isSiteAdmin: false,
      loginId: null,
      userLabel: null,
      emailAddress: null,
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
    mockedReadCurrentSession.mockResolvedValueOnce({
      actorId: 1,
      isAnonymous: false,
      isConfirmed: true,
      isSiteAdmin: true,
      loginId: "admin",
      userLabel: "Bootstrap Admin",
      emailAddress: "admin@yona.local",
    });

    await expect(
      Route.options.beforeLoad?.({
        location: { href: "/protected" },
      } as never),
    ).resolves.toBeUndefined();
  });
});
