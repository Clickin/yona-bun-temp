import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createOrganizationMock,
  readCurrentSessionMock,
  readOrganizationDetailMock,
  readOrganizationSettingsMock,
  updateOrganizationMock,
} = vi.hoisted(() => ({
  createOrganizationMock: vi.fn(),
  readCurrentSessionMock: vi.fn(),
  readOrganizationDetailMock: vi.fn(),
  readOrganizationSettingsMock: vi.fn(),
  updateOrganizationMock: vi.fn(),
}));

vi.mock("@yona/domain", async () => {
  const actual = await vi.importActual<typeof import("@yona/domain")>("@yona/domain");
  return {
    ...actual,
    createOrganization: createOrganizationMock,
    readOrganizationDetail: readOrganizationDetailMock,
    readOrganizationSettings: readOrganizationSettingsMock,
    updateOrganization: updateOrganizationMock,
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
import { createOrganizationCaller } from "./organization-trpc";

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

describe("organization tRPC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readCurrentSessionMock.mockResolvedValue({
      clearCookie: false,
      projection: {
        actorId: 7,
        emailAddress: "door@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "doortts",
        userLabel: "Door TTS",
      },
      sessionRecord: {
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        expiresAt: new Date("2026-03-10T00:00:00.000Z"),
        id: "session-1",
        token: "session-token",
        userId: 7,
      },
      token: "session-token",
      user: {
        emailAddress: "door@example.com",
        id: 7,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "doortts",
        name: "Door TTS",
      },
    });
  });

  it("requires an authenticated session for organization mutations", async () => {
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
    createOrganizationMock.mockRejectedValueOnce(
      new DomainPermissionError("Authentication required.", {
        requiresAuthentication: true,
      }),
    );

    await expect(
      createOrganizationCaller(createContext()).createOrganization({
        description: "weblab < labs",
        organizationName: "weblabs",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("keeps input validation at the tRPC boundary", async () => {
    await expect(
      createOrganizationCaller(createContext("session-token")).createOrganization({
        description: "broken",
        organizationName: ".bad",
      }),
    ).rejects.toBeTruthy();
  });

  it("creates and updates organizations through the domain service with public identifiers", async () => {
    createOrganizationMock.mockResolvedValueOnce({
      description: "weblab < labs",
      organizationName: "weblabs",
      viewerCanUpdate: true,
    });
    updateOrganizationMock.mockResolvedValueOnce({
      description: "updated group",
      organizationName: "weblabs",
      viewerCanUpdate: true,
    });

    const caller = createOrganizationCaller(createContext("session-token"));

    await expect(
      caller.createOrganization({
        description: "weblab < labs",
        organizationName: "weblabs",
      }),
    ).resolves.toEqual({
      description: "weblab < labs",
      organizationName: "weblabs",
      viewerCanUpdate: true,
    });

    await expect(
      caller.updateOrganization({
        currentOrganizationName: "labs",
        description: "updated group",
        organizationName: "weblabs",
      }),
    ).resolves.toEqual({
      description: "updated group",
      organizationName: "weblabs",
      viewerCanUpdate: true,
    });
  });
});
