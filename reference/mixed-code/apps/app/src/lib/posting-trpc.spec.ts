import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createPostingCommentMock,
  createPostingMock,
  listPostingsMock,
  readCurrentSessionMock,
  readPostingDetailMock,
} = vi.hoisted(() => ({
  createPostingCommentMock: vi.fn(),
  createPostingMock: vi.fn(),
  listPostingsMock: vi.fn(),
  readCurrentSessionMock: vi.fn(),
  readPostingDetailMock: vi.fn(),
}));

vi.mock("@yona/domain", async () => {
  const actual = await vi.importActual<typeof import("@yona/domain")>("@yona/domain");
  return {
    ...actual,
    createPosting: createPostingMock,
    createPostingComment: createPostingCommentMock,
    listPostings: listPostingsMock,
    readPostingDetail: readPostingDetailMock,
  };
});

vi.mock("@yona/auth", async () => {
  const actual = await vi.importActual<typeof import("@yona/auth")>("@yona/auth");
  return {
    ...actual,
    readCurrentSession: readCurrentSessionMock,
  };
});

import { createPostingCaller } from "./posting-trpc";

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

describe("posting tRPC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readCurrentSessionMock.mockResolvedValue({
      clearCookie: false,
      projection: {
        actorId: 2,
        emailAddress: "yobi@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "yobi",
        userLabel: "Yobi",
      },
      sessionRecord: {
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        expiresAt: new Date("2026-03-10T00:00:00.000Z"),
        id: "session-1",
        token: "session-token",
        userId: 2,
      },
      token: "session-token",
      user: {
        emailAddress: "yobi@example.com",
        id: 2,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "yobi",
        name: "Yobi",
      },
    });
  });

  it("lists and mutates discussion postings", async () => {
    listPostingsMock.mockResolvedValue([
      {
        authorLoginId: "yobi",
        authorName: "Yobi",
        createdAt: null,
        ownerName: "yobi",
        postingNumber: 1,
        projectName: "yona",
        title: "Hello",
      },
    ]);
    readPostingDetailMock.mockResolvedValue({
      authorLoginId: "yobi",
      authorName: "Yobi",
      body: "Body",
      comments: [],
      createdAt: null,
      ownerName: "yobi",
      postingNumber: 1,
      projectName: "yona",
      title: "Hello",
    });
    createPostingMock.mockResolvedValue({
      authorLoginId: "yobi",
      authorName: "Yobi",
      body: "Body",
      comments: [],
      createdAt: null,
      ownerName: "yobi",
      postingNumber: 1,
      projectName: "yona",
      title: "Hello",
    });
    createPostingCommentMock.mockResolvedValue({
      authorLoginId: "yobi",
      authorName: "Yobi",
      body: "Body",
      comments: [
        {
          authorLoginId: "yobi",
          authorName: "Yobi",
          commentId: 1,
          contents: "reply",
          createdAt: null,
        },
      ],
      createdAt: null,
      ownerName: "yobi",
      postingNumber: 1,
      projectName: "yona",
      title: "Hello",
    });

    const caller = createPostingCaller(createContext("session-token"));

    await expect(
      caller.listPostings({ ownerName: "yobi", projectName: "yona" }),
    ).resolves.toHaveLength(1);
    await expect(
      caller.readPostingDetail({ ownerName: "yobi", postingNumber: 1, projectName: "yona" }),
    ).resolves.toMatchObject({ postingNumber: 1 });
    await expect(
      caller.createPosting({
        body: "Body",
        ownerName: "yobi",
        projectName: "yona",
        title: "Hello",
      }),
    ).resolves.toMatchObject({ postingNumber: 1 });
    await expect(
      caller.createPostingComment({
        contents: "reply",
        ownerName: "yobi",
        postingNumber: 1,
        projectName: "yona",
      }),
    ).resolves.toMatchObject({ postingNumber: 1 });
  });
});
