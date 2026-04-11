import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { commentThread, n4user, project, pullRequest, reviewComment } from "@drizzle/sqlite/schema";
import {
  createRepositoryCommitDiscussionComment,
  deleteRepositoryCommitDiscussionComment,
  listRepositoryCommitDiscussionThreads,
  updateRepositoryCommitDiscussionThreadState,
} from "./repository-discussion";
import { applySqliteMigrations } from "./test-helpers";
import { setupSQLiteTestDatabase } from "./test-utils/database";

describe("repository commit-discussion helpers", () => {
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

  async function seedProject(baseId: number) {
    await db.insert(n4user).values([
      {
        createdDate: new Date(0),
        email: `author-${baseId}@example.com`,
        id: baseId + 1,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: `author-${baseId}`,
        name: `Author ${baseId}`,
        token: null,
      },
      {
        createdDate: new Date(0),
        email: `reply-${baseId}@example.com`,
        id: baseId + 2,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: `reply-${baseId}`,
        name: `Reply ${baseId}`,
        token: null,
      },
    ]);

    await db.insert(project).values({
      id: baseId + 100,
      name: `project-${baseId}`,
      overview: "overview",
      owner: "yona",
      projectScope: "public",
      vcs: "GIT",
    });

    return {
      authorId: baseId + 1,
      authorLoginId: `author-${baseId}`,
      authorName: `Author ${baseId}`,
      projectId: baseId + 100,
      replierId: baseId + 2,
      replierLoginId: `reply-${baseId}`,
      replierName: `Reply ${baseId}`,
    };
  }

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

  it("creates a new non-ranged non-PR thread with its first comment", async () => {
    const fixture = await seedProject(1000);

    await createRepositoryCommitDiscussionComment(
      {
        authorId: fixture.authorId,
        authorLoginId: fixture.authorLoginId,
        authorName: fixture.authorName,
        commitId: "commit-non-ranged",
        contents: "first commit discussion",
        projectId: fixture.projectId,
      },
      db,
    );

    const threads = await listRepositoryCommitDiscussionThreads(
      {
        commitId: "commit-non-ranged",
        projectId: fixture.projectId,
      },
      db,
    );

    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({
      commitId: "commit-non-ranged",
      path: null,
      prevCommitId: null,
      state: "open",
      threadType: "non_ranged",
    });
    expect(threads[0]?.range).toBeNull();
    expect(threads[0]?.threadId).toEqual(expect.any(Number));
    expect(threads[0]?.comments).toEqual([
      expect.objectContaining({
        authorLoginId: fixture.authorLoginId,
        authorName: fixture.authorName,
        commentId: expect.any(Number),
        contents: "first commit discussion",
      }),
    ]);
  });

  it("persists ranged thread metadata for commit discussions", async () => {
    const fixture = await seedProject(2000);

    await createRepositoryCommitDiscussionComment(
      {
        authorId: fixture.authorId,
        authorLoginId: fixture.authorLoginId,
        authorName: fixture.authorName,
        commitId: "commit-ranged",
        contents: "range anchored comment",
        projectId: fixture.projectId,
        range: {
          endColumn: 4,
          endLine: 6,
          endSide: "B",
          path: "src/main.ts",
          startColumn: 0,
          startLine: 5,
          startSide: "A",
        },
      },
      db,
    );

    const threads = await listRepositoryCommitDiscussionThreads(
      {
        commitId: "commit-ranged",
        projectId: fixture.projectId,
      },
      db,
    );

    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({
      path: "src/main.ts",
      prevCommitId: null,
      range: {
        endColumn: 4,
        endLine: 6,
        endSide: "B",
        path: "src/main.ts",
        startColumn: 0,
        startLine: 5,
        startSide: "A",
      },
      threadType: "ranged",
    });
  });

  it("appends replies to an existing non-PR thread and keeps comments oldest-first", async () => {
    const fixture = await seedProject(3000);

    const created = await createRepositoryCommitDiscussionComment(
      {
        authorId: fixture.authorId,
        authorLoginId: fixture.authorLoginId,
        authorName: fixture.authorName,
        commitId: "commit-replies",
        contents: "first",
        projectId: fixture.projectId,
      },
      db,
    );

    await createRepositoryCommitDiscussionComment(
      {
        authorId: fixture.replierId,
        authorLoginId: fixture.replierLoginId,
        authorName: fixture.replierName,
        commitId: "commit-replies",
        contents: "second",
        projectId: fixture.projectId,
        threadId: created.threadId,
      },
      db,
    );

    const threads = await listRepositoryCommitDiscussionThreads(
      {
        commitId: "commit-replies",
        projectId: fixture.projectId,
      },
      db,
    );

    expect(threads).toHaveLength(1);
    expect(threads[0]?.comments.map((comment) => comment.contents)).toEqual(["first", "second"]);
  });

  it("filters by state, excludes PR threads, and orders repository threads newest-first", async () => {
    const fixture = await seedProject(4000);

    await db.insert(pullRequest).values({
      contributorId: fixture.authorId,
      created: new Date("2026-03-21T00:00:00.000Z"),
      fromProjectId: fixture.projectId,
      id: fixture.projectId + 1,
      number: 1,
      receiverId: fixture.replierId,
      state: 0,
      title: "PR",
      toProjectId: fixture.projectId,
    });

    await db.insert(commentThread).values([
      {
        authorId: fixture.authorId,
        authorLoginId: fixture.authorLoginId,
        authorName: fixture.authorName,
        commitId: "commit-filtered",
        createdDate: new Date("2026-03-20T01:00:00.000Z"),
        dtype: "NonRangedCodeCommentThread",
        id: fixture.projectId + 10,
        projectId: fixture.projectId,
        pullRequestId: null,
        state: "open",
      },
      {
        authorId: fixture.replierId,
        authorLoginId: fixture.replierLoginId,
        authorName: fixture.replierName,
        commitId: "commit-filtered",
        createdDate: new Date("2026-03-20T02:00:00.000Z"),
        dtype: "CodeCommentThread",
        id: fixture.projectId + 11,
        path: "src/newer.ts",
        projectId: fixture.projectId,
        pullRequestId: null,
        startColumn: 0,
        startLine: 1,
        startSide: "A",
        state: "open",
      },
      {
        authorId: fixture.authorId,
        authorLoginId: fixture.authorLoginId,
        authorName: fixture.authorName,
        commitId: "commit-filtered",
        createdDate: new Date("2026-03-20T03:00:00.000Z"),
        dtype: "NonRangedCodeCommentThread",
        id: fixture.projectId + 12,
        projectId: fixture.projectId,
        pullRequestId: null,
        state: "closed",
      },
      {
        authorId: fixture.authorId,
        authorLoginId: fixture.authorLoginId,
        authorName: fixture.authorName,
        commitId: "commit-filtered",
        createdDate: new Date("2026-03-20T04:00:00.000Z"),
        dtype: "NonRangedCodeCommentThread",
        id: fixture.projectId + 13,
        projectId: fixture.projectId,
        pullRequestId: fixture.projectId + 1,
        state: "open",
      },
    ]);

    await db.insert(reviewComment).values([
      {
        authorId: fixture.authorId,
        authorLoginId: fixture.authorLoginId,
        authorName: fixture.authorName,
        contents: "older open",
        createdDate: new Date("2026-03-20T01:00:00.000Z"),
        id: fixture.projectId + 20,
        threadId: fixture.projectId + 10,
      },
      {
        authorId: fixture.replierId,
        authorLoginId: fixture.replierLoginId,
        authorName: fixture.replierName,
        contents: "newer open",
        createdDate: new Date("2026-03-20T02:00:00.000Z"),
        id: fixture.projectId + 21,
        threadId: fixture.projectId + 11,
      },
      {
        authorId: fixture.authorId,
        authorLoginId: fixture.authorLoginId,
        authorName: fixture.authorName,
        contents: "closed thread",
        createdDate: new Date("2026-03-20T03:00:00.000Z"),
        id: fixture.projectId + 22,
        threadId: fixture.projectId + 12,
      },
      {
        authorId: fixture.authorId,
        authorLoginId: fixture.authorLoginId,
        authorName: fixture.authorName,
        contents: "pr-only thread",
        createdDate: new Date("2026-03-20T04:00:00.000Z"),
        id: fixture.projectId + 23,
        threadId: fixture.projectId + 13,
      },
    ]);

    const allThreads = await listRepositoryCommitDiscussionThreads(
      {
        commitId: "commit-filtered",
        projectId: fixture.projectId,
      },
      db,
    );
    const openThreads = await listRepositoryCommitDiscussionThreads(
      {
        commitId: "commit-filtered",
        projectId: fixture.projectId,
        state: "open",
      },
      db,
    );

    expect(allThreads.map((thread) => thread.threadId)).toEqual([
      fixture.projectId + 12,
      fixture.projectId + 11,
      fixture.projectId + 10,
    ]);
    expect(openThreads.map((thread) => thread.threadId)).toEqual([
      fixture.projectId + 11,
      fixture.projectId + 10,
    ]);
  });

  it("closes and reopens commit-discussion threads", async () => {
    const fixture = await seedProject(5000);

    const created = await createRepositoryCommitDiscussionComment(
      {
        authorId: fixture.authorId,
        authorLoginId: fixture.authorLoginId,
        authorName: fixture.authorName,
        commitId: "commit-state",
        contents: "stateful thread",
        projectId: fixture.projectId,
      },
      db,
    );

    const closed = await updateRepositoryCommitDiscussionThreadState(
      {
        commitId: "commit-state",
        projectId: fixture.projectId,
        state: "closed",
        threadId: created.threadId,
      },
      db,
    );
    const reopened = await updateRepositoryCommitDiscussionThreadState(
      {
        commitId: "commit-state",
        projectId: fixture.projectId,
        state: "open",
        threadId: created.threadId,
      },
      db,
    );

    expect(closed.state).toBe("closed");
    expect(reopened.state).toBe("open");
  });

  it("deleting the last comment also deletes the thread", async () => {
    const fixture = await seedProject(6000);

    const created = await createRepositoryCommitDiscussionComment(
      {
        authorId: fixture.authorId,
        authorLoginId: fixture.authorLoginId,
        authorName: fixture.authorName,
        commitId: "commit-delete-last",
        contents: "only comment",
        projectId: fixture.projectId,
      },
      db,
    );

    const deleted = await deleteRepositoryCommitDiscussionComment(
      {
        commentId: created.comments[0]!.commentId,
        commitId: "commit-delete-last",
        projectId: fixture.projectId,
      },
      db,
    );

    const threads = await listRepositoryCommitDiscussionThreads(
      {
        commitId: "commit-delete-last",
        projectId: fixture.projectId,
      },
      db,
    );
    const remainingThreads = await (db as any).select().from(commentThread);
    const remainingComments = await (db as any).select().from(reviewComment);

    expect(deleted).toEqual({
      deletedCommentId: created.comments[0]!.commentId,
      threadDeleted: true,
      threadId: created.threadId,
    });
    expect(threads).toEqual([]);
    expect(remainingThreads.some((row: { id: number }) => row.id === created.threadId)).toBe(false);
    expect(
      remainingComments.some((row: { id: number }) => row.id === created.comments[0]!.commentId),
    ).toBe(false);
  });
});
