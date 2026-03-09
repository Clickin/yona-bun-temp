import { beforeEach, describe, expect, it, vi } from "vitest";

const { cancelEnrollProjectMock, enrollProjectMock, readCurrentSessionMock } = vi.hoisted(() => ({
  cancelEnrollProjectMock: vi.fn(),
  enrollProjectMock: vi.fn(),
  readCurrentSessionMock: vi.fn(),
}));

vi.mock("@yona/domain", async () => {
  const actual = await vi.importActual<typeof import("@yona/domain")>("@yona/domain");
  return {
    ...actual,
    cancelEnrollProject: cancelEnrollProjectMock,
    enrollProject: enrollProjectMock,
  };
});

vi.mock("@yona/auth", async () => {
  const actual = await vi.importActual<typeof import("@yona/auth")>("@yona/auth");
  return {
    ...actual,
    readCurrentSession: readCurrentSessionMock,
  };
});

import { DomainPermissionError } from "@yona/domain";
import { createEnrollmentCaller } from "./enrollment-trpc";

function createContext(cookieValue?: string) {
  const cookies = new Map<string, string>();
  if (cookieValue) {
    cookies.set("yona-session", cookieValue);
  }

  return {
    deleteCookie: vi.fn(),
    getCookie: (name: string) => cookies.get(name),
    setResponseStatus: vi.fn(),
  };
}

describe("enrollment tRPC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readCurrentSessionMock.mockResolvedValue({
      clearCookie: false,
      projection: {
        actorId: 6,
        emailAddress: "guest-user@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "guest-user",
        userLabel: "Guest User",
      },
      sessionRecord: {
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        expiresAt: new Date("2026-03-10T00:00:00.000Z"),
        id: "session-1",
        token: "session-token",
        userId: 6,
      },
      token: "session-token",
      user: {
        emailAddress: "guest-user@example.com",
        id: 6,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "guest-user",
        name: "Guest User",
      },
    });
  });

  it("requires an authenticated session for enrollment mutations", async () => {
    readCurrentSessionMock.mockResolvedValueOnce({
      clearCookie: false,
      projection: {
        actorId: null,
        emailAddress: null,
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
        loginId: null,
        userLabel: null,
      },
      sessionRecord: null,
      token: null,
      user: null,
    });
    enrollProjectMock.mockRejectedValueOnce(
      new DomainPermissionError("Authentication required.", {
        requiresAuthentication: true,
      }),
    );

    await expect(
      createEnrollmentCaller(createContext()).enrollProject({
        ownerName: "yobi",
        projectName: "projectYobi",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("keeps input validation at the tRPC boundary", async () => {
    await expect(
      createEnrollmentCaller(createContext("session-token")).enrollProject({
        ownerName: "yobi",
        projectName: ".git",
      }),
    ).rejects.toBeTruthy();
  });

  it("enrolls and cancels project enrollment requests through the domain service", async () => {
    enrollProjectMock.mockResolvedValueOnce({
      ok: true,
    });
    cancelEnrollProjectMock.mockResolvedValueOnce({
      ok: true,
    });

    const caller = createEnrollmentCaller(createContext("session-token"));

    await expect(
      caller.enrollProject({
        ownerName: "yobi",
        projectName: "projectYobi",
      }),
    ).resolves.toEqual({
      ok: true,
    });

    await expect(
      caller.cancelEnrollProject({
        ownerName: "yobi",
        projectName: "projectYobi",
      }),
    ).resolves.toEqual({
      ok: true,
    });
  });
});
