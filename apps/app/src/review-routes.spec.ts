import { describe, expect, it, vi } from "vitest";
import {
  ProjectReviewsIndexRoute,
  reviewRouteSearchSchema,
} from "@app/routes/_app.$owner.$projectName.reviews.index";

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

describe("review route guard", () => {
  it("redirects anonymous visitors away from project reviews", async () => {
    await expect(
      ProjectReviewsIndexRoute.options.beforeLoad?.({
        context: {
          authCaller: {
            readCurrentSession: vi.fn(async () => anonymousSession()),
          },
        },
        location: { href: "/yobi/projectYobi/reviews/" },
      } as never),
    ).rejects.toMatchObject({
      options: {
        to: "/login",
      },
    });
  });

  it("allows authenticated visitors and normalizes invalid review search params", async () => {
    await expect(
      ProjectReviewsIndexRoute.options.beforeLoad?.({
        context: {
          authCaller: {
            readCurrentSession: vi.fn(async () => authenticatedSession()),
          },
        },
        location: { href: "/yobi/projectYobi/reviews/" },
      } as never),
    ).resolves.toBeUndefined();

    expect(
      reviewRouteSearchSchema.parse({
        authorLoginId: "  admin  ",
        filter: "  controllers  ",
        orderBy: "updatedDate",
        orderDir: "sideways",
        participantLoginId: "  doortts  ",
        state: "merged",
      } as never),
    ).toEqual({
      authorLoginId: "admin",
      filter: "controllers",
      orderBy: "createdDate",
      orderDir: "desc",
      participantLoginId: "doortts",
      state: "open",
    });
  });

  it("keeps optional review search params omitted while preserving defaults", () => {
    expect(
      reviewRouteSearchSchema.parse({
        authorLoginId: "   ",
        filter: undefined,
        participantLoginId: "",
      } as never),
    ).toEqual({
      authorLoginId: undefined,
      filter: undefined,
      orderBy: "createdDate",
      orderDir: "desc",
      participantLoginId: undefined,
      state: "open",
    });
  });
});
