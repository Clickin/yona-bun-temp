import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  buildAnonymousAppSession,
  buildProtectedRedirect,
  currentSessionQueryKey,
  resetCurrentSessionData,
  resolveAuthenticatedHomePath,
  resolvePostAuthRedirectPath,
  setCurrentSessionData,
} from "./auth-shared";

describe("auth client helpers", () => {
  it("stores the current session under the canonical query key", () => {
    const queryClient = new QueryClient();
    const session = {
      actorId: 7,
      defaultLandingPath: "/me",
      emailAddress: "door@example.com",
      isAnonymous: false,
      isConfirmed: true,
      isSiteAdmin: false,
      loginId: "door",
      userLabel: "Door TTS",
    };

    setCurrentSessionData(queryClient, session);

    expect(queryClient.getQueryData(currentSessionQueryKey)).toEqual(session);
  });

  it("resets the current session cache to anonymous", () => {
    const queryClient = new QueryClient();

    setCurrentSessionData(queryClient, {
      actorId: 7,
      defaultLandingPath: "/me",
      emailAddress: "door@example.com",
      isAnonymous: false,
      isConfirmed: true,
      isSiteAdmin: false,
      loginId: "door",
      userLabel: "Door TTS",
    });
    resetCurrentSessionData(queryClient);

    expect(queryClient.getQueryData(currentSessionQueryKey)).toEqual(buildAnonymousAppSession());
  });

  it("redirects anonymous users to login and leaves authenticated users alone", () => {
    expect(buildProtectedRedirect(buildAnonymousAppSession(), "/protected")).toEqual({
      search: {
        redirect: "/protected",
      },
      to: "/login",
    });

    expect(
      buildProtectedRedirect(
        {
          actorId: 7,
          defaultLandingPath: "/me",
          emailAddress: "door@example.com",
          isAnonymous: false,
          isConfirmed: true,
          isSiteAdmin: false,
          loginId: "door",
          userLabel: "Door TTS",
        },
        "/protected",
      ),
    ).toBeNull();
  });

  it("resolves authenticated home and post-auth redirect targets", () => {
    const session = {
      actorId: 7,
      defaultLandingPath: "/search?pageSize=20&scope=global&query=yona",
      emailAddress: "door@example.com",
      isAnonymous: false,
      isConfirmed: true,
      isSiteAdmin: false,
      loginId: "door",
      userLabel: "Door TTS",
    };

    expect(resolveAuthenticatedHomePath(session)).toBe(
      "/search?pageSize=20&scope=global&query=yona",
    );
    expect(resolveAuthenticatedHomePath(buildAnonymousAppSession())).toBe("/me");
    expect(resolvePostAuthRedirectPath(session, "/projects/new")).toBe(
      "/search?pageSize=20&scope=global&query=yona",
    );
    expect(resolvePostAuthRedirectPath(session, "/users/doortts")).toBe("/users/doortts");
  });
});
