import { describe, expect, it } from "vitest";
import {
  pullRequestDetailSchema,
  pullRequestMergeOutputSchema,
  pullRequestMergePreviewOutputSchema,
  pullRequestReviewCommentCreateInputSchema,
  pullRequestReviewCommentDeleteInputSchema,
  pullRequestReviewCommentSchema,
  pullRequestReviewCountsSchema,
  pullRequestStateUpdateInputSchema,
  pullRequestReviewThreadStateUpdateInputSchema,
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
        comments: [
          {
            authorLoginId: "admin",
            authorName: "Admin",
            commentId: 51,
            contents: "First review comment",
            createdAt: null,
          },
          {
            authorLoginId: "doortts",
            authorName: "Door TTS",
            commentId: 52,
            contents: "Reply review comment",
            createdAt: null,
          },
        ],
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
      comments: [
        {
          authorLoginId: "admin",
          authorName: "Admin",
          commentId: 51,
          contents: "First review comment",
          createdAt: null,
        },
        {
          authorLoginId: "doortts",
          authorName: "Door TTS",
          commentId: 52,
          contents: "Reply review comment",
          createdAt: null,
        },
      ],
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

  it("parses PR-bound review comment write inputs separately from thread state mutations", () => {
    expect(
      pullRequestReviewCommentSchema.parse({
        authorLoginId: "admin",
        authorName: "Admin",
        commentId: 77,
        contents: "Looks good overall.",
        createdAt: null,
      }),
    ).toEqual({
      authorLoginId: "admin",
      authorName: "Admin",
      commentId: 77,
      contents: "Looks good overall.",
      createdAt: null,
    });

    expect(
      pullRequestReviewCommentCreateInputSchema.parse({
        commitId: "abc123",
        contents: "  Please rename this method.  ",
        ownerName: " yona ",
        path: "src/pull-request.ts",
        projectName: " project-yona ",
        pullRequestNumber: 9,
      }),
    ).toEqual({
      commitId: "abc123",
      contents: "Please rename this method.",
      ownerName: "yona",
      path: "src/pull-request.ts",
      projectName: "project-yona",
      pullRequestNumber: 9,
    });

    expect(
      pullRequestReviewCommentCreateInputSchema.parse({
        contents: "reply",
        ownerName: "yona",
        projectName: "project-yona",
        pullRequestNumber: 9,
        threadId: 12,
      }),
    ).toEqual({
      contents: "reply",
      ownerName: "yona",
      projectName: "project-yona",
      pullRequestNumber: 9,
      threadId: 12,
    });

    expect(
      pullRequestReviewCommentDeleteInputSchema.parse({
        commentId: 77,
        ownerName: " yona ",
        projectName: " project-yona ",
        pullRequestNumber: 9,
      }),
    ).toEqual({
      commentId: 77,
      ownerName: "yona",
      projectName: "project-yona",
      pullRequestNumber: 9,
    });

    expect(
      pullRequestReviewThreadStateUpdateInputSchema.parse({
        ownerName: " yona ",
        projectName: " project-yona ",
        pullRequestNumber: 9,
        state: "closed",
        threadId: 12,
      }),
    ).toEqual({
      ownerName: "yona",
      projectName: "project-yona",
      pullRequestNumber: 9,
      state: "closed",
      threadId: 12,
    });
  });

  it("keeps pull-request detail lightweight while exposing review summary counts", () => {
    expect(
      pullRequestDetailSchema.parse({
        body: "Body",
        contributorLoginId: "yobi",
        contributorName: "Yobi",
        createdAt: null,
        fromBranch: "feature/demo-ready",
        ownerName: "yobi",
        projectName: "project-yona",
        pullRequestNumber: 9,
        reviewSummary: {
          closedThreadCount: 1,
          openThreadCount: 2,
          reviewerCount: 3,
        },
        state: "open",
        title: "Demo ready PR merge slice",
        toBranch: "main",
      }),
    ).toEqual({
      body: "Body",
      contributorLoginId: "yobi",
      contributorName: "Yobi",
      createdAt: null,
      fromBranch: "feature/demo-ready",
      ownerName: "yobi",
      projectName: "project-yona",
      pullRequestNumber: 9,
      reviewSummary: {
        closedThreadCount: 1,
        openThreadCount: 2,
        reviewerCount: 3,
      },
      state: "open",
      title: "Demo ready PR merge slice",
      toBranch: "main",
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

  it("parses merge preview and merge execution result contracts", () => {
    expect(
      pullRequestMergePreviewOutputSchema.parse({
        blockedReason: null,
        conflictedFiles: [],
        mergeable: true,
      }),
    ).toEqual({
      blockedReason: null,
      conflictedFiles: [],
      mergeable: true,
    });

    expect(
      pullRequestMergePreviewOutputSchema.parse({
        blockedReason: "pull-request-not-open",
        conflictedFiles: ["src/pull-request.ts"],
        mergeable: false,
      }),
    ).toEqual({
      blockedReason: "pull-request-not-open",
      conflictedFiles: ["src/pull-request.ts"],
      mergeable: false,
    });

    expect(
      pullRequestMergeOutputSchema.parse({
        conflicted: true,
        conflictedFiles: ["src/conflicted.ts"],
        merged: false,
        mergedPullRequestState: "open",
      }),
    ).toEqual({
      conflicted: true,
      conflictedFiles: ["src/conflicted.ts"],
      merged: false,
      mergedPullRequestState: "open",
    });

    expect(
      pullRequestMergeOutputSchema.parse({
        conflicted: false,
        conflictedFiles: [],
        merged: true,
        mergedPullRequestState: "merged",
      }),
    ).toEqual({
      conflicted: false,
      conflictedFiles: [],
      merged: true,
      mergedPullRequestState: "merged",
    });
  });
});
