import { describe, expect, it } from "vitest";
import {
  pullRequestReviewCountsSchema,
  pullRequestStateUpdateInputSchema,
  pullRequestReviewThreadFilterInputSchema,
  pullRequestReviewThreadSchema,
} from "./pull-request";

describe("pull request contracts", () => {
  it("keeps bounded pull-request state updates limited to open and closed", () => {
    expect(
      pullRequestStateUpdateInputSchema.parse({
        ownerName: " yona ",
        projectName: " project-yona ",
        pullRequestNumber: 5,
        state: "closed",
      }),
    ).toEqual({
      ownerName: "yona",
      projectName: "project-yona",
      pullRequestNumber: 5,
      state: "closed",
    });

    expect(
      pullRequestStateUpdateInputSchema.safeParse({
        ownerName: "yona",
        projectName: "project-yona",
        pullRequestNumber: 5,
        state: "merged",
      }).success,
    ).toBe(false);
  });

  it("parses bounded review-thread filters at the contract boundary", () => {
    expect(
      pullRequestReviewThreadFilterInputSchema.parse({
        authorLoginId: " admin ",
        filter: " controllers ",
        orderBy: "createdDate",
        orderDir: "asc",
        ownerName: " yona ",
        participantLoginId: " doortts ",
        projectName: " project-yona ",
        state: "open",
      }),
    ).toEqual({
      authorLoginId: "admin",
      filter: "controllers",
      orderBy: "createdDate",
      orderDir: "asc",
      ownerName: "yona",
      participantLoginId: "doortts",
      projectName: "project-yona",
      state: "open",
    });

    expect(
      pullRequestReviewThreadFilterInputSchema.safeParse({
        filter: "comment",
        orderBy: "updatedDate",
        ownerName: "yona",
        projectName: "project-yona",
        state: "merged",
      }).success,
    ).toBe(false);
  });

  it("parses bounded read-only review-thread results", () => {
    expect(
      pullRequestReviewThreadSchema.parse({
        authorLoginId: "admin",
        authorName: "Admin",
        commitId: "commit-111",
        createdAt: null,
        lastCommentAt: null,
        participants: ["admin", "doortts"],
        path: "/app/controllers/BoardApp.java",
        projectName: "project-yona",
        replyCount: 2,
        state: "open",
        text: "Comment #2 : /app/controllers/BoardApp.java",
        threadId: "thread-open-controllers",
      }),
    ).toEqual({
      authorLoginId: "admin",
      authorName: "Admin",
      commitId: "commit-111",
      createdAt: null,
      lastCommentAt: null,
      participants: ["admin", "doortts"],
      path: "/app/controllers/BoardApp.java",
      projectName: "project-yona",
      replyCount: 2,
      state: "open",
      text: "Comment #2 : /app/controllers/BoardApp.java",
      threadId: "thread-open-controllers",
    });
  });

  it("parses bounded review count summaries", () => {
    expect(
      pullRequestReviewCountsSchema.parse({
        all: 4,
        closed: 1,
        createdByYou: 2,
        involvingYou: 3,
        open: 3,
      }),
    ).toEqual({
      all: 4,
      closed: 1,
      createdByYou: 2,
      involvingYou: 3,
      open: 3,
    });
  });
});
