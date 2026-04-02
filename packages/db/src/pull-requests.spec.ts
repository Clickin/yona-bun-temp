import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import {
  commentThread,
  commentThreadN4user,
  n4user,
  project,
  pullRequest,
  pullRequestReviewers,
  reviewComment,
} from "@drizzle/sqlite/schema";
import {
  createPullRequestReviewComment,
  deletePullRequestReviewComment,
  listPullRequestReviewThreadsByProject,
  readPullRequestByProjectAndNumber,
  readPullRequestReviewCountsByProject,
  updatePullRequestMergeStateByProjectAndNumber,
  updatePullRequestReviewThreadState,
} from "./pull-requests";
import { applySqliteMigrations } from "./test-helpers";
import { setupSQLiteTestDatabase } from "./test-utils/database";

describe("pull request review-thread helpers", () => {
  let db: ReturnType<(typeof drizzle)["sqlite"]>;

  const closeDatabaseClient = async () => {
    const client = db.$client as {
      close?: () => Promise<void> | void;
      end?: () => Promise<void> | void;
    };
    if (typeof client.close === "function") {
      await client.close();
      return;
    }

    if (typeof client.end === "function") {
      await client.end();
    }
  };

  beforeAll(async () => {
    const setup = await setupSQLiteTestDatabase();
    db = (drizzle as any).sqlite(setup.url, {
      schema: await import("../../../drizzle/sqlite/schema"),
    });
    await applySqliteMigrations(db);
  });

  afterAll(async () => {
    await closeDatabaseClient();
  });

  it("lists only PR-bound review threads with dynamic created-date ordering and reply counts", async () => {
    await db.insert(n4user).values([
      {
        createdDate: new Date(0),
        email: "admin@example.com",
        id: 2101,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "admin",
        name: "Admin",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "doortts@example.com",
        id: 2102,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "doortts",
        name: "Door TTS",
        token: null,
      },
    ]);
    await db.insert(project).values({
      id: 2201,
      name: "project-yona",
      overview: "overview",
      owner: "yona",
      projectScope: "public",
      vcs: "GIT",
    });
    await db.insert(pullRequest).values([
      {
        contributorId: 2101,
        created: new Date("2026-03-10T00:00:00.000Z"),
        fromProjectId: 2201,
        id: 2301,
        number: 5,
        receiverId: 2102,
        state: 0,
        title: "First PR",
        toProjectId: 2201,
      },
      {
        contributorId: 2102,
        created: new Date("2026-03-11T00:00:00.000Z"),
        fromProjectId: 2201,
        id: 2302,
        number: 6,
        receiverId: 2101,
        state: 0,
        title: "Second PR",
        toProjectId: 2201,
      },
    ]);
    await db.insert(commentThread).values([
      {
        authorId: 2101,
        authorLoginId: "admin",
        authorName: "Admin",
        commitId: "commit-111",
        createdDate: new Date("2026-03-10T01:00:00.000Z"),
        dtype: "NonRangedCodeCommentThread",
        id: 2401,
        path: "/src/issue.ts",
        projectId: 2201,
        pullRequestId: 2301,
        state: "open",
      },
      {
        authorId: 2102,
        authorLoginId: "doortts",
        authorName: "Door TTS",
        commitId: "commit-222",
        createdDate: new Date("2026-03-11T01:00:00.000Z"),
        dtype: "NonRangedCodeCommentThread",
        id: 2402,
        path: "/src/board.ts",
        projectId: 2201,
        pullRequestId: 2302,
        state: "open",
      },
      {
        authorId: 2101,
        authorLoginId: "admin",
        authorName: "Admin",
        commitId: "commit-non-pr",
        createdDate: new Date("2026-03-12T01:00:00.000Z"),
        dtype: "NonRangedCodeCommentThread",
        id: 2403,
        path: "/src/non-pr.ts",
        projectId: 2201,
        pullRequestId: null,
        state: "open",
      },
    ]);
    await db.insert(reviewComment).values([
      {
        authorId: 2101,
        authorLoginId: "admin",
        authorName: "Admin",
        contents: "First review comment",
        createdDate: new Date("2026-03-10T01:00:00.000Z"),
        id: 2501,
        threadId: 2401,
      },
      {
        authorId: 2102,
        authorLoginId: "doortts",
        authorName: "Door TTS",
        contents: "reply one",
        createdDate: new Date("2026-03-10T02:00:00.000Z"),
        id: 2502,
        threadId: 2401,
      },
      {
        authorId: 2102,
        authorLoginId: "doortts",
        authorName: "Door TTS",
        contents: "Second review comment",
        createdDate: new Date("2026-03-11T01:00:00.000Z"),
        id: 2503,
        threadId: 2402,
      },
      {
        authorId: 2101,
        authorLoginId: "admin",
        authorName: "Admin",
        contents: "reply two",
        createdDate: new Date("2026-03-11T02:00:00.000Z"),
        id: 2504,
        threadId: 2402,
      },
      {
        authorId: 2101,
        authorLoginId: "admin",
        authorName: "Admin",
        contents: "reply three",
        createdDate: new Date("2026-03-11T03:00:00.000Z"),
        id: 2505,
        threadId: 2402,
      },
      {
        authorId: 2101,
        authorLoginId: "admin",
        authorName: "Admin",
        contents: "non pr review comment",
        createdDate: new Date("2026-03-12T01:00:00.000Z"),
        id: 2506,
        threadId: 2403,
      },
    ]);

    await expect(
      listPullRequestReviewThreadsByProject(
        {
          orderBy: "createdDate",
          orderDir: "asc",
          projectId: 2201,
          projectName: "project-yona",
        },
        db,
      ),
    ).resolves.toMatchObject([
      {
        replyCount: 1,
        threadId: "2401",
      },
      {
        replyCount: 2,
        threadId: "2402",
      },
    ]);

    await expect(
      listPullRequestReviewThreadsByProject(
        {
          orderBy: "createdDate",
          orderDir: "desc",
          projectId: 2201,
          projectName: "project-yona",
        },
        db,
      ),
    ).resolves.toMatchObject([
      {
        replyCount: 2,
        threadId: "2402",
      },
      {
        replyCount: 1,
        threadId: "2401",
      },
    ]);
  });

  it("computes legacy review count summaries by cloning the active filter state", async () => {
    await db.insert(n4user).values([
      {
        createdDate: new Date(0),
        email: "admin2@example.com",
        id: 3101,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "admin2",
        name: "Admin Two",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "doortts2@example.com",
        id: 3102,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "doortts2",
        name: "Door Two",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "laziel@example.com",
        id: 3103,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "laziel",
        name: "Laziel",
        token: null,
      },
    ]);
    await db.insert(project).values({
      id: 3201,
      name: "review-counts",
      overview: "overview",
      owner: "yona",
      projectScope: "public",
      vcs: "GIT",
    });
    await db.insert(pullRequest).values([
      {
        contributorId: 3101,
        fromProjectId: 3201,
        id: 3301,
        number: 1,
        receiverId: 3102,
        state: 0,
        title: "PR 1",
        toProjectId: 3201,
      },
      {
        contributorId: 3102,
        fromProjectId: 3201,
        id: 3302,
        number: 2,
        receiverId: 3101,
        state: 0,
        title: "PR 2",
        toProjectId: 3201,
      },
      {
        contributorId: 3103,
        fromProjectId: 3201,
        id: 3303,
        number: 3,
        receiverId: 3102,
        state: 1,
        title: "PR 3",
        toProjectId: 3201,
      },
      {
        contributorId: 3101,
        fromProjectId: 3201,
        id: 3304,
        number: 4,
        receiverId: 3102,
        state: 1,
        title: "PR 4",
        toProjectId: 3201,
      },
    ]);
    await db.insert(commentThread).values([
      {
        authorId: 3101,
        authorLoginId: "admin2",
        authorName: "Admin Two",
        commitId: "controllers-1",
        createdDate: new Date("2026-03-20T01:00:00.000Z"),
        dtype: "NonRangedCodeCommentThread",
        id: 3401,
        path: "/app/controllers/A.java",
        projectId: 3201,
        pullRequestId: 3301,
        state: "open",
      },
      {
        authorId: 3102,
        authorLoginId: "doortts2",
        authorName: "Door Two",
        commitId: "controllers-2",
        createdDate: new Date("2026-03-20T02:00:00.000Z"),
        dtype: "NonRangedCodeCommentThread",
        id: 3402,
        path: "/app/controllers/B.java",
        projectId: 3201,
        pullRequestId: 3302,
        state: "open",
      },
      {
        authorId: 3103,
        authorLoginId: "laziel",
        authorName: "Laziel",
        commitId: "controllers-3",
        createdDate: new Date("2026-03-20T03:00:00.000Z"),
        dtype: "NonRangedCodeCommentThread",
        id: 3403,
        path: "/app/controllers/C.java",
        projectId: 3201,
        pullRequestId: 3303,
        state: "closed",
      },
      {
        authorId: 3101,
        authorLoginId: "admin2",
        authorName: "Admin Two",
        commitId: "controllers-4",
        createdDate: new Date("2026-03-20T04:00:00.000Z"),
        dtype: "NonRangedCodeCommentThread",
        id: 3404,
        path: "/app/controllers/D.java",
        projectId: 3201,
        pullRequestId: 3304,
        state: "closed",
      },
    ]);
    await db.insert(reviewComment).values([
      {
        authorId: 3101,
        authorLoginId: "admin2",
        authorName: "Admin Two",
        contents: "controllers alpha",
        createdDate: new Date("2026-03-20T01:00:00.000Z"),
        id: 3501,
        threadId: 3401,
      },
      {
        authorId: 3102,
        authorLoginId: "doortts2",
        authorName: "Door Two",
        contents: "controllers beta",
        createdDate: new Date("2026-03-20T02:00:00.000Z"),
        id: 3502,
        threadId: 3402,
      },
      {
        authorId: 3103,
        authorLoginId: "laziel",
        authorName: "Laziel",
        contents: "controllers gamma",
        createdDate: new Date("2026-03-20T03:00:00.000Z"),
        id: 3503,
        threadId: 3403,
      },
      {
        authorId: 3101,
        authorLoginId: "admin2",
        authorName: "Admin Two",
        contents: "controllers delta",
        createdDate: new Date("2026-03-20T04:00:00.000Z"),
        id: 3504,
        threadId: 3404,
      },
    ]);
    await db.insert(commentThreadN4user).values([
      { commentThreadId: 3401, n4userId: 3101 },
      { commentThreadId: 3401, n4userId: 3102 },
      { commentThreadId: 3402, n4userId: 3102 },
      { commentThreadId: 3403, n4userId: 3103 },
      { commentThreadId: 3404, n4userId: 3101 },
    ]);

    await expect(
      readPullRequestReviewCountsByProject(
        {
          authorLoginId: "admin2",
          currentLoginId: "doortts2",
          filter: "controllers",
          projectId: 3201,
          state: "open",
        },
        db,
      ),
    ).resolves.toEqual({
      all: 2,
      closed: 1,
      createdByYou: 1,
      involvingYou: 2,
      open: 1,
    });
  });

  it("creates, updates, and deletes PR-bound review comments with delete-last-comment cleanup", async () => {
    await db.insert(n4user).values([
      {
        createdDate: new Date(0),
        email: "author@example.com",
        id: 4101,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "author",
        name: "Author",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "reviewer@example.com",
        id: 4102,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "reviewer",
        name: "Reviewer",
        token: null,
      },
    ]);
    await db.insert(project).values({
      id: 4201,
      name: "pr-review-write",
      overview: "overview",
      owner: "yona",
      projectScope: "public",
      vcs: "GIT",
    });
    await db.insert(pullRequest).values({
      contributorId: 4101,
      fromProjectId: 4201,
      id: 4301,
      number: 1,
      receiverId: 4102,
      state: 0,
      title: "PR review write",
      toProjectId: 4201,
    });

    const createdThread = await createPullRequestReviewComment(
      {
        authorId: 4101,
        authorLoginId: "author",
        authorName: "Author",
        commitId: "abc123",
        contents: "Initial review comment",
        projectId: 4201,
        pullRequestId: 4301,
      },
      "pr-review-write",
      db,
    );
    expect(createdThread.comments).toHaveLength(1);
    expect(createdThread.replyCount).toBe(0);

    const repliedThread = await createPullRequestReviewComment(
      {
        authorId: 4102,
        authorLoginId: "reviewer",
        authorName: "Reviewer",
        contents: "Reply comment",
        projectId: 4201,
        pullRequestId: 4301,
        threadId: Number(createdThread.threadId),
      },
      "pr-review-write",
      db,
    );
    expect(repliedThread.comments).toHaveLength(2);
    expect(repliedThread.replyCount).toBe(1);

    const closedThread = await updatePullRequestReviewThreadState(
      {
        projectId: 4201,
        projectName: "pr-review-write",
        pullRequestId: 4301,
        state: "closed",
        threadId: Number(createdThread.threadId),
      },
      db,
    );
    expect(closedThread.state).toBe("closed");

    const deletedReply = await deletePullRequestReviewComment(
      {
        commentId: repliedThread.comments[1]!.commentId,
        projectId: 4201,
        pullRequestId: 4301,
      },
      db,
    );
    expect(deletedReply).toEqual({
      deletedCommentId: repliedThread.comments[1]!.commentId,
      threadDeleted: false,
      threadId: Number(createdThread.threadId),
    });

    const deletedLast = await deletePullRequestReviewComment(
      {
        commentId: createdThread.comments[0]!.commentId,
        projectId: 4201,
        pullRequestId: 4301,
      },
      db,
    );
    expect(deletedLast).toEqual({
      deletedCommentId: createdThread.comments[0]!.commentId,
      threadDeleted: true,
      threadId: Number(createdThread.threadId),
    });

    expect(
      await (db as any)
        .select({ total: commentThread.id })
        .from(commentThread)
        .where(eq(commentThread.pullRequestId, 4301)),
    ).toHaveLength(0);
  });

  it("reads lightweight review summary and persists merged PR metadata separately from merge preview", async () => {
    await db.insert(n4user).values([
      {
        createdDate: new Date(0),
        email: "merger@example.com",
        id: 5101,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "merger",
        name: "Merger",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "receiver@example.com",
        id: 5102,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "receiver",
        name: "Receiver",
        token: null,
      },
    ]);
    await db.insert(project).values({
      id: 5201,
      name: "pr-merge-summary",
      overview: "overview",
      owner: "yona",
      projectScope: "public",
      vcs: "GIT",
    });
    await db.insert(pullRequest).values({
      contributorId: 5101,
      fromBranch: "feature/demo-ready",
      fromProjectId: 5201,
      id: 5301,
      number: 7,
      receiverId: 5102,
      state: 0,
      title: "PR merge summary",
      toBranch: "main",
      toProjectId: 5201,
    });
    await db.insert(commentThread).values([
      {
        authorId: 5101,
        authorLoginId: "merger",
        authorName: "Merger",
        commitId: "oid-open",
        createdDate: new Date("2026-04-01T00:00:00.000Z"),
        dtype: "NonRangedCodeCommentThread",
        id: 5401,
        projectId: 5201,
        pullRequestId: 5301,
        state: "open",
      },
      {
        authorId: 5102,
        authorLoginId: "receiver",
        authorName: "Receiver",
        commitId: "oid-closed",
        createdDate: new Date("2026-04-01T01:00:00.000Z"),
        dtype: "NonRangedCodeCommentThread",
        id: 5402,
        projectId: 5201,
        pullRequestId: 5301,
        state: "closed",
      },
    ]);
    await db.insert(reviewComment).values([
      {
        authorId: 5101,
        authorLoginId: "merger",
        authorName: "Merger",
        contents: "open comment",
        createdDate: new Date("2026-04-01T00:00:00.000Z"),
        id: 5501,
        threadId: 5401,
      },
      {
        authorId: 5102,
        authorLoginId: "receiver",
        authorName: "Receiver",
        contents: "closed comment",
        createdDate: new Date("2026-04-01T01:00:00.000Z"),
        id: 5502,
        threadId: 5402,
      },
    ]);
    await db.insert(pullRequestReviewers).values([
      { pullRequestId: 5301, userId: 5101 },
      { pullRequestId: 5301, userId: 5102 },
    ]);

    await expect(
      readPullRequestByProjectAndNumber(5201, 7, "yona", "pr-merge-summary", db),
    ).resolves.toMatchObject({
      pullRequestNumber: 7,
      reviewSummary: {
        closedThreadCount: 1,
        openThreadCount: 1,
        reviewerCount: 2,
      },
      state: "open",
    });

    await updatePullRequestMergeStateByProjectAndNumber(
      {
        mergedCommitIdFrom: "base-oid",
        mergedCommitIdTo: "merge-oid",
        projectId: 5201,
        pullRequestNumber: 7,
      },
      db,
    );

    await expect(
      readPullRequestByProjectAndNumber(5201, 7, "yona", "pr-merge-summary", db),
    ).resolves.toMatchObject({
      state: "merged",
    });
  });
});
