import { describe, expect, it } from "vitest";
import {
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
        ownerName: " yona ",
        participantLoginId: " doortts ",
        projectName: " project-yona ",
        state: "open",
      }),
    ).toEqual({
      authorLoginId: "admin",
      filter: "controllers",
      ownerName: "yona",
      participantLoginId: "doortts",
      projectName: "project-yona",
      state: "open",
    });

    expect(
      pullRequestReviewThreadFilterInputSchema.safeParse({
        filter: "comment",
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
      state: "open",
      text: "Comment #2 : /app/controllers/BoardApp.java",
      threadId: "thread-open-controllers",
    });
  });
});
