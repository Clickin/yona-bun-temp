import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  buildAnonymousAppSession,
  buildProtectedRedirect,
  currentSessionQueryKey,
  resetCurrentSessionData,
  setCurrentSessionData,
} from "./auth-shared";

describe("auth client helpers", () => {
  it("stores the current session under the canonical query key", () => {
    const queryClient = new QueryClient();
    const session = {
      actorId: 7,
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
});
