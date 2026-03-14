import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainNotFoundError, DomainPermissionError } from "@yona/domain";

const { readCurrentSessionMock, searchMock } = vi.hoisted(() => ({
  readCurrentSessionMock: vi.fn(),
  searchMock: vi.fn(),
}));

vi.mock("@yona/domain", async () => {
  const actual = await vi.importActual<typeof import("@yona/domain")>("@yona/domain");
  return {
    ...actual,
    search: searchMock,
  };
});

vi.mock("@yona/auth", async () => {
  const actual = await vi.importActual<typeof import("@yona/auth")>("@yona/auth");
  return {
    ...actual,
    readCurrentSession: readCurrentSessionMock,
  };
});

import { createSearchCaller } from "./search-trpc";

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

function createAuthenticatedSession() {
  return {
    clearCookie: false,
    projection: {
      actorId: 55,
      emailAddress: "searcher@example.com",
      isAnonymous: false,
      isConfirmed: true,
      isSiteAdmin: false,
      loginId: "searcher",
      userLabel: "Searcher",
    },
    sessionRecord: {
      createdAt: new Date("2026-03-09T00:00:00.000Z"),
      expiresAt: new Date("2026-03-10T00:00:00.000Z"),
      id: "session-1",
      token: "session-token",
      userId: 55,
    },
    token: "session-token",
    user: {
      emailAddress: "searcher@example.com",
      id: 55,
      isConfirmed: true,
      isSiteAdmin: false,
      loginId: "searcher",
      name: "Searcher",
    },
  };
}

function createAnonymousSession() {
  return {
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
  };
}

describe("search tRPC provenance: docs/provenance/phase-0b/search.md", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readCurrentSessionMock.mockResolvedValue(createAuthenticatedSession());
  });

  it("returns bounded search pages with counts, snippets, and nextCursor", async () => {
    searchMock.mockResolvedValueOnce({
      counts: {
        returned: 2,
        total: 5,
      },
      items: [
        {
          loginId: "searcher",
          scope: "global",
          snippets: ["alpha user snippet"],
          type: "user",
          userLabel: "Searcher",
        },
        {
          issueNumber: 3,
          ownerName: "yona",
          projectName: "projectYobi",
          scope: "project",
          snippets: ["alpha issue snippet"],
          title: "Alpha issue",
          type: "issue",
        },
      ],
      nextCursor: "cursor-2",
      pageSize: 2,
    });

    await expect(
      createSearchCaller(createContext("session-token")).search({
        pageSize: 2,
        query: "alpha",
        scope: "global",
        types: ["user", "issue"],
      }),
    ).resolves.toEqual({
      counts: {
        returned: 2,
        total: 5,
      },
      items: [
        {
          loginId: "searcher",
          scope: "global",
          snippets: ["alpha user snippet"],
          type: "user",
          userLabel: "Searcher",
        },
        {
          issueNumber: 3,
          ownerName: "yona",
          projectName: "projectYobi",
          scope: "project",
          snippets: ["alpha issue snippet"],
          title: "Alpha issue",
          type: "issue",
        },
      ],
      nextCursor: "cursor-2",
      pageSize: 2,
    });

    expect(searchMock).toHaveBeenCalledWith(
      {
        actorId: 55,
        isAnonymous: false,
        isSiteAdmin: false,
        loginId: "searcher",
        name: "Searcher",
      },
      {
        pageSize: 2,
        query: "alpha",
        scope: "global",
        types: ["user", "issue"],
      },
    );
  });

  it("maps missing organization targets to NOT_FOUND", async () => {
    searchMock.mockRejectedValueOnce(new DomainNotFoundError("Organization not found."));

    await expect(
      createSearchCaller(createContext("session-token")).search({
        organizationName: "labs",
        pageSize: 10,
        query: "alpha",
        scope: "organization",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("maps anonymous project searches to UNAUTHORIZED", async () => {
    readCurrentSessionMock.mockResolvedValueOnce(createAnonymousSession());
    searchMock.mockRejectedValueOnce(
      new DomainPermissionError("Authentication required.", {
        requiresAuthentication: true,
      }),
    );

    await expect(
      createSearchCaller(createContext()).search({
        ownerName: "yona",
        pageSize: 10,
        projectName: "projectYobi",
        query: "alpha",
        scope: "project",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
