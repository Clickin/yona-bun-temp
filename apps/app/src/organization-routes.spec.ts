import { describe, expect, it, vi } from "vitest";
import { OrganizationNewRoute } from "@app/routes/_app.organizations.new";
import { OrganizationSettingsRoute } from "@app/routes/_app.organizations.$organizationName.settings";

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
    actorId: 7,
    emailAddress: "door@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: false,
    loginId: "doortts",
    userLabel: "Door TTS",
  };
}

describe("organization route guards", () => {
  it("redirects anonymous visitors away from organization create and settings routes", async () => {
    await expect(
      OrganizationNewRoute.options.beforeLoad?.({
        context: {
          authCaller: {
            readCurrentSession: vi.fn(async () => anonymousSession()),
          },
        },
        location: { href: "/organizations/new" },
      } as never),
    ).rejects.toMatchObject({
      options: {
        to: "/login",
      },
    });

    await expect(
      OrganizationSettingsRoute.options.beforeLoad?.({
        context: {
          authCaller: {
            readCurrentSession: vi.fn(async () => anonymousSession()),
          },
        },
        location: { href: "/organizations/labs/settings" },
      } as never),
    ).rejects.toMatchObject({
      options: {
        to: "/login",
      },
    });
  });

  it("allows authenticated visitors through organization create and settings guards", async () => {
    await expect(
      OrganizationNewRoute.options.beforeLoad?.({
        context: {
          authCaller: {
            readCurrentSession: vi.fn(async () => authenticatedSession()),
          },
        },
        location: { href: "/organizations/new" },
      } as never),
    ).resolves.toBeUndefined();

    await expect(
      OrganizationSettingsRoute.options.beforeLoad?.({
        context: {
          authCaller: {
            readCurrentSession: vi.fn(async () => authenticatedSession()),
          },
        },
        location: { href: "/organizations/labs/settings" },
      } as never),
    ).resolves.toBeUndefined();
  });
});
