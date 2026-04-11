import { describe, expect, it, vi } from "vitest";
import { ProjectSettingsRoute } from "@app/routes/_app.$owner.$projectName.settings";
import { ProjectNewRoute } from "@app/routes/_app.projects.new";

function anonymousSession() {
  return {
    actorId: null,
    emailAddress: null,
    isAnonymous: true,
    isConfirmed: false,
    isSiteAdmin: false,
    loginId: null,
    userLabel: null,
  };
}

function authenticatedSession() {
  return {
    actorId: 2,
    emailAddress: "yobi@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: false,
    loginId: "yobi",
    userLabel: "Yobi",
  };
}

describe("project route guards", () => {
  it("redirects anonymous visitors away from project create and settings routes", async () => {
    await expect(
      ProjectNewRoute.options.beforeLoad?.({
        context: {
          authCaller: {
            readCurrentSession: vi.fn(async () => anonymousSession()),
          },
        },
        location: { href: "/projects/new" },
      } as never),
    ).rejects.toMatchObject({
      options: {
        to: "/login",
      },
    });

    await expect(
      ProjectSettingsRoute.options.beforeLoad?.({
        context: {
          authCaller: {
            readCurrentSession: vi.fn(async () => anonymousSession()),
          },
        },
        location: { href: "/yobi/projectYobi/settings" },
      } as never),
    ).rejects.toMatchObject({
      options: {
        to: "/login",
      },
    });
  });

  it("allows authenticated visitors through project create and settings guards", async () => {
    await expect(
      ProjectNewRoute.options.beforeLoad?.({
        context: {
          authCaller: {
            readCurrentSession: vi.fn(async () => authenticatedSession()),
          },
        },
        location: { href: "/projects/new" },
      } as never),
    ).resolves.toBeUndefined();

    await expect(
      ProjectSettingsRoute.options.beforeLoad?.({
        context: {
          authCaller: {
            readCurrentSession: vi.fn(async () => authenticatedSession()),
          },
        },
        location: { href: "/yobi/projectYobi/settings" },
      } as never),
    ).resolves.toBeUndefined();
  });
});
