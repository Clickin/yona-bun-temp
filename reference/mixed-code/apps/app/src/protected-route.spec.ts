import { describe, expect, it, vi } from "vitest";

vi.mock("@app/lib/shell-data", () => ({
  getProtectedShellData: vi.fn(async () => ({
    title: "Protected Workspace",
    lanes: [],
  })),
}));

import { Route } from "@app/routes/protected";

describe("Protected route guard", () => {
  it("throws a login redirect for guest sessions", async () => {
    await expect(
      Route.options.beforeLoad?.({
        context: {
          authCaller: {
            readCurrentSession: vi.fn(async () => ({
              actorId: null,
              emailAddress: null,
              isAnonymous: true,
              isConfirmed: false,
              isSiteAdmin: false,
              loginId: null,
              userLabel: null,
            })),
          },
        },
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
    await expect(
      Route.options.beforeLoad?.({
        context: {
          authCaller: {
            readCurrentSession: vi.fn(async () => ({
              actorId: 1,
              emailAddress: "admin@yona.local",
              isAnonymous: false,
              isConfirmed: true,
              isSiteAdmin: true,
              loginId: "admin",
              userLabel: "Bootstrap Admin",
            })),
          },
        },
        location: { href: "/protected" },
      } as never),
    ).resolves.toBeUndefined();
  });
});
