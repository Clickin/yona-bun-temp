import { describe, expect, it, vi } from "vitest";
import { Route } from "@app/routes/_app.index";

function anonymousSession() {
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

function authenticatedSession(path: null | string = null) {
  return {
    actorId: 7,
    defaultLandingPath: path,
    emailAddress: "door@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: false,
    loginId: "doortts",
    userLabel: "Door TTS",
  };
}

describe("home route guard", () => {
  it("keeps anonymous visitors on the public home", async () => {
    await expect(
      Route.options.beforeLoad?.({
        context: {
          authCaller: {
            readCurrentSession: vi.fn(async () => anonymousSession()),
          },
        },
      } as never),
    ).resolves.toBeUndefined();
  });

  it("redirects authenticated visitors to their effective landing page", async () => {
    await expect(
      Route.options.beforeLoad?.({
        context: {
          authCaller: {
            readCurrentSession: vi.fn(async () => authenticatedSession("/users/doortts")),
          },
        },
      } as never),
    ).rejects.toMatchObject({
      options: {
        href: "/users/doortts",
      },
    });

    await expect(
      Route.options.beforeLoad?.({
        context: {
          authCaller: {
            readCurrentSession: vi.fn(async () => authenticatedSession(null)),
          },
        },
      } as never),
    ).rejects.toMatchObject({
      options: {
        href: "/me",
      },
    });
  });
});
