import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import {
  assignee,
  issue,
  issueComment,
  issueEvent,
  issueVoter,
  n4user,
  project,
  projectUser,
  role,
  unwatch,
  watch,
} from "@drizzle/sqlite/schema";
import {
  assignIssueByProjectAndNumber,
  listIssuesByProject,
  readIssueByProjectAndNumber,
  unassignIssueByProjectAndNumber,
  unvoteIssueRecord,
  updateIssueStateByProjectAndNumber,
  unwatchIssueRecord,
  voteIssueRecord,
  watchIssueRecord,
} from "./issues";
import { applySqliteMigrations } from "./test-helpers";
import { setupSQLiteTestDatabase } from "./test-utils/database";

describe("issue participation helpers", () => {
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
      schema: await import("@drizzle/sqlite/schema"),
    });
    await applySqliteMigrations(db);
    await db.insert(role).values([
      { active: true, id: 1, name: "manager" },
      { active: true, id: 2, name: "member" },
      { active: true, id: 6, name: "org_admin" },
      { active: true, id: 7, name: "org_member" },
    ]);
  });

  afterAll(async () => {
    await closeDatabaseClient();
  });

  it("aggregates assignee, watcher and voter participation for summaries and details", async () => {
    await db.insert(n4user).values([
      {
        createdDate: new Date(0),
        email: "author@example.com",
        id: 701,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "author",
        name: "Author",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "commenter@example.com",
        id: 702,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "commenter",
        name: "Commenter",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "assignee@example.com",
        id: 703,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "assignee",
        name: "Assignee",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "voter@example.com",
        id: 704,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "voter",
        name: "Voter",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "projectwatcher@example.com",
        id: 705,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "projectwatcher",
        name: "Project Watcher",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "explicit@example.com",
        id: 706,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "explicit",
        name: "Explicit Watcher",
        token: null,
      },
    ]);
    await db.insert(project).values({
      id: 710,
      name: "issue-participation-public",
      organizationId: null,
      owner: "door",
      overview: "Issue participation public project",
      projectScope: "public",
      vcs: "GIT",
    });
    await db.insert(projectUser).values([
      { projectId: 710, roleId: 1, userId: 701 },
      { projectId: 710, roleId: 2, userId: 702 },
      { projectId: 710, roleId: 2, userId: 703 },
      { projectId: 710, roleId: 2, userId: 704 },
    ]);
    await db.insert(assignee).values({
      id: 711,
      projectId: 710,
      userId: 703,
    });
    await db.insert(issue).values({
      assigneeId: 711,
      authorId: 701,
      authorLoginId: "author",
      authorName: "Author",
      body: "Issue body",
      createdDate: new Date("2026-03-10T00:00:00.000Z"),
      id: 712,
      number: 1,
      projectId: 710,
      state: 0,
      title: "Issue title",
      updatedDate: new Date("2026-03-10T00:00:00.000Z"),
    });
    await db.insert(issueComment).values({
      authorId: 702,
      authorLoginId: "commenter",
      authorName: "Commenter",
      contents: "First comment",
      createdDate: new Date("2026-03-11T00:00:00.000Z"),
      id: 713,
      issueId: 712,
      projectId: 710,
    });
    await db.insert(issueVoter).values({
      issueId: 712,
      userId: 704,
    });
    await db.insert(watch).values([
      { id: 714, resourceId: "710", resourceType: "project", userId: 705 },
      { id: 715, resourceId: "712", resourceType: "issue_post", userId: 706 },
    ]);

    const [summary] = await listIssuesByProject(
      710,
      "door",
      "issue-participation-public",
      db as never,
    );
    expect(summary).toMatchObject({
      assignee: {
        loginId: "assignee",
      },
      issueNumber: 1,
      voterCount: 1,
      watcherCount: 6,
    });

    const detail = await readIssueByProjectAndNumber(710, 1, "door", "issue-participation-public", {
      db: db as never,
      viewerId: 706,
    });
    expect(detail).toMatchObject({
      assignee: {
        loginId: "assignee",
      },
      hasVoted: false,
      isWatching: true,
      voterCount: 1,
      watcherCount: 6,
    });
  });

  it("orders timeline items by created time, comment-first ties, then stable ids", async () => {
    await db.insert(n4user).values({
      createdDate: new Date(0),
      email: "timeline@example.com",
      id: 720,
      isGuest: false,
      lastStateModifiedDate: new Date(0),
      loginId: "timeline",
      name: "Timeline User",
      token: null,
    });
    await db.insert(project).values({
      id: 721,
      name: "timeline-project",
      organizationId: null,
      owner: "door",
      overview: "Timeline project",
      projectScope: "public",
      vcs: "GIT",
    });
    await db.insert(issue).values({
      authorId: 720,
      authorLoginId: "timeline",
      authorName: "Timeline User",
      body: "Timeline body",
      createdDate: new Date("2026-03-12T00:00:00.000Z"),
      id: 722,
      number: 1,
      projectId: 721,
      state: 0,
      title: "Timeline issue",
      updatedDate: new Date("2026-03-12T00:00:00.000Z"),
    });
    await db.insert(issueComment).values([
      {
        authorId: 720,
        authorLoginId: "timeline",
        authorName: "Timeline User",
        contents: "Comment one",
        createdDate: new Date("2026-03-12T00:00:00.000Z"),
        id: 723,
        issueId: 722,
        projectId: 721,
      },
      {
        authorId: 720,
        authorLoginId: "timeline",
        authorName: "Timeline User",
        contents: "Comment two",
        createdDate: new Date("2026-03-12T00:00:00.000Z"),
        id: 724,
        issueId: 722,
        projectId: 721,
      },
    ]);
    await db.insert(issueEvent).values([
      {
        created: new Date("2026-03-12T00:00:00.000Z"),
        eventType: "issue.state.changed",
        id: 725,
        issueId: 722,
        newValue: "closed",
        oldValue: "open",
        senderEmail: "timeline@example.com",
        senderLoginId: "timeline",
      },
      {
        created: new Date("2026-03-13T00:00:00.000Z"),
        eventType: "issue.assignee.changed",
        id: 726,
        issueId: 722,
        newValue: "next-user",
        oldValue: null,
        senderEmail: "timeline@example.com",
        senderLoginId: "timeline",
      },
    ]);

    const detail = await readIssueByProjectAndNumber(721, 1, "door", "timeline-project", {
      db: db as never,
      viewerId: 720,
    });

    expect(
      detail?.timeline.map(
        (item) => `${item.kind}:${item.kind === "comment" ? item.commentId : item.eventId}`,
      ),
    ).toEqual(["comment:723", "comment:724", "event:725", "event:726"]);
  });

  it("keeps vote and watch mutations idempotent", async () => {
    await db.insert(n4user).values({
      createdDate: new Date(0),
      email: "idempotent@example.com",
      id: 730,
      isGuest: false,
      lastStateModifiedDate: new Date(0),
      loginId: "idempotent",
      name: "Idempotent User",
      token: null,
    });
    await db.insert(project).values({
      id: 731,
      name: "idempotent-project",
      organizationId: null,
      owner: "door",
      overview: "Idempotent project",
      projectScope: "public",
      vcs: "GIT",
    });
    await db.insert(issue).values({
      authorId: 730,
      authorLoginId: "idempotent",
      authorName: "Idempotent User",
      body: "Idempotent body",
      createdDate: new Date("2026-03-14T00:00:00.000Z"),
      id: 732,
      number: 1,
      projectId: 731,
      state: 0,
      title: "Idempotent issue",
      updatedDate: new Date("2026-03-14T00:00:00.000Z"),
    });

    await voteIssueRecord({ issueId: 732, userId: 730 }, db as never);
    await voteIssueRecord({ issueId: 732, userId: 730 }, db as never);
    await watchIssueRecord({ issueId: 732, userId: 730 }, db as never);
    await watchIssueRecord({ issueId: 732, userId: 730 }, db as never);

    expect(await db.select().from(issueVoter).where(eq(issueVoter.issueId, 732))).toHaveLength(1);
    expect(
      await db
        .select()
        .from(watch)
        .where(and(eq(watch.resourceId, "732"), eq(watch.resourceType, "issue_post"))),
    ).toHaveLength(1);

    await unvoteIssueRecord({ issueId: 732, userId: 730 }, db as never);
    await unvoteIssueRecord({ issueId: 732, userId: 730 }, db as never);
    await unwatchIssueRecord({ issueId: 732, userId: 730 }, db as never);
    await unwatchIssueRecord({ issueId: 732, userId: 730 }, db as never);

    expect(await db.select().from(issueVoter).where(eq(issueVoter.issueId, 732))).toHaveLength(0);
    expect(
      await db
        .select()
        .from(unwatch)
        .where(and(eq(unwatch.resourceId, "732"), eq(unwatch.resourceType, "issue_post"))),
    ).toHaveLength(1);
  });

  it("filters unreadable private-project watchers from the effective watcher set", async () => {
    await db.insert(n4user).values([
      {
        createdDate: new Date(0),
        email: "member@example.com",
        id: 740,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "member",
        name: "Member",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "outsider@example.com",
        id: 741,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "outsider",
        name: "Outsider",
        token: null,
      },
    ]);
    await db.insert(project).values({
      id: 742,
      name: "private-project",
      organizationId: null,
      owner: "door",
      overview: "Private project",
      projectScope: "private",
      vcs: "GIT",
    });
    await db.insert(projectUser).values({
      projectId: 742,
      roleId: 2,
      userId: 740,
    });
    await db.insert(issue).values({
      authorId: 740,
      authorLoginId: "member",
      authorName: "Member",
      body: "Private issue body",
      createdDate: new Date("2026-03-15T00:00:00.000Z"),
      id: 743,
      number: 1,
      projectId: 742,
      state: 0,
      title: "Private issue",
      updatedDate: new Date("2026-03-15T00:00:00.000Z"),
    });
    await db.insert(watch).values([
      { id: 744, resourceId: "742", resourceType: "project", userId: 740 },
      { id: 745, resourceId: "743", resourceType: "issue_post", userId: 741 },
    ]);

    const detail = await readIssueByProjectAndNumber(742, 1, "door", "private-project", {
      db: db as never,
      viewerId: 740,
    });

    expect(detail).toMatchObject({
      watcherCount: 1,
    });
  });

  it("writes state change events once and exposes them in the issue timeline", async () => {
    await db.insert(n4user).values({
      createdDate: new Date(0),
      email: "state-user@example.com",
      id: 746,
      isGuest: false,
      lastStateModifiedDate: new Date(0),
      loginId: "state-user",
      name: "State User",
      token: null,
    });
    await db.insert(project).values({
      id: 747,
      name: "state-project",
      organizationId: null,
      owner: "door",
      overview: "State project",
      projectScope: "public",
      vcs: "GIT",
    });
    await db.insert(issue).values({
      authorId: 746,
      authorLoginId: "state-user",
      authorName: "State User",
      body: "State issue body",
      createdDate: new Date("2026-03-15T12:00:00.000Z"),
      id: 748,
      number: 1,
      projectId: 747,
      state: 0,
      title: "State issue",
      updatedDate: new Date("2026-03-15T12:00:00.000Z"),
    });

    await updateIssueStateByProjectAndNumber(
      {
        issueNumber: 1,
        projectId: 747,
        senderLoginId: "state-user",
        state: "closed",
      } as never,
      db as never,
    );
    await updateIssueStateByProjectAndNumber(
      {
        issueNumber: 1,
        projectId: 747,
        senderLoginId: "state-user",
        state: "closed",
      } as never,
      db as never,
    );

    const stateEvents = await db.select().from(issueEvent).where(eq(issueEvent.issueId, 748));
    expect(stateEvents).toHaveLength(1);
    expect(stateEvents[0]).toMatchObject({
      eventType: "issue.state.changed",
      newValue: "closed",
      oldValue: "open",
      senderLoginId: "state-user",
    });

    const detail = await readIssueByProjectAndNumber(747, 1, "door", "state-project", {
      db: db as never,
      viewerId: 746,
    });
    expect(detail?.state).toBe("closed");
    expect(detail?.timeline).toContainEqual(
      expect.objectContaining({
        eventType: "issue.state.changed",
        kind: "event",
        newValue: "closed",
        oldValue: "open",
        senderLoginId: "state-user",
      }),
    );
  });

  it("assigns and unassigns issues through reusable assignee rows and writes assignee events once", async () => {
    await db.insert(n4user).values([
      {
        createdDate: new Date(0),
        email: "assigner@example.com",
        id: 750,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "assigner",
        name: "Assigner",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "target@example.com",
        id: 751,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "target",
        name: "Target User",
        token: null,
      },
    ]);
    await db.insert(project).values({
      id: 752,
      name: "assignee-project",
      organizationId: null,
      owner: "door",
      overview: "Assignee project",
      projectScope: "public",
      vcs: "GIT",
    });
    await db.insert(issue).values({
      authorId: 750,
      authorLoginId: "assigner",
      authorName: "Assigner",
      body: "Assignee issue body",
      createdDate: new Date("2026-03-16T00:00:00.000Z"),
      id: 753,
      number: 1,
      projectId: 752,
      state: 0,
      title: "Assignee issue",
      updatedDate: new Date("2026-03-16T00:00:00.000Z"),
    });

    await assignIssueByProjectAndNumber(
      {
        assigneeLoginId: "target",
        issueNumber: 1,
        projectId: 752,
        senderLoginId: "assigner",
      } as never,
      db as never,
    );
    await assignIssueByProjectAndNumber(
      {
        assigneeLoginId: "target",
        issueNumber: 1,
        projectId: 752,
        senderLoginId: "assigner",
      } as never,
      db as never,
    );

    const detail = await readIssueByProjectAndNumber(752, 1, "door", "assignee-project", {
      db: db as never,
      viewerId: 750,
    });
    expect(detail).toMatchObject({
      assignee: {
        loginId: "target",
      },
      watcherCount: 2,
    });
    expect(await db.select().from(assignee).where(eq(assignee.projectId, 752))).toHaveLength(1);
    expect(await db.select().from(issueEvent).where(eq(issueEvent.issueId, 753))).toMatchObject([
      {
        eventType: "issue.assignee.changed",
        newValue: "target",
        oldValue: null,
        senderLoginId: "assigner",
      },
    ]);

    await unassignIssueByProjectAndNumber(
      { issueNumber: 1, projectId: 752, senderLoginId: "assigner" } as never,
      db as never,
    );
    await unassignIssueByProjectAndNumber(
      { issueNumber: 1, projectId: 752, senderLoginId: "assigner" } as never,
      db as never,
    );

    const unassigned = await readIssueByProjectAndNumber(752, 1, "door", "assignee-project", {
      db: db as never,
      viewerId: 750,
    });
    expect(unassigned).toMatchObject({
      assignee: null,
    });
    expect(await db.select().from(issueEvent).where(eq(issueEvent.issueId, 753))).toMatchObject([
      {
        eventType: "issue.assignee.changed",
        newValue: "target",
        oldValue: null,
        senderLoginId: "assigner",
      },
      {
        eventType: "issue.assignee.changed",
        newValue: null,
        oldValue: "target",
        senderLoginId: "assigner",
      },
    ]);
    expect(unassigned?.timeline).toContainEqual(
      expect.objectContaining({
        eventType: "issue.assignee.changed",
        kind: "event",
        newValue: null,
        oldValue: "target",
        senderLoginId: "assigner",
      }),
    );
  });

  it("keeps batched list watcher and voter counts isolated per issue", async () => {
    await db.insert(n4user).values([
      {
        createdDate: new Date(0),
        email: "issue1-author@example.com",
        id: 760,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "issue1-author",
        name: "Issue1 Author",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "issue1-commenter@example.com",
        id: 761,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "issue1-commenter",
        name: "Issue1 Commenter",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "issue1-voter@example.com",
        id: 762,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "issue1-voter",
        name: "Issue1 Voter",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "issue1-watcher@example.com",
        id: 763,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "issue1-watcher",
        name: "Issue1 Watcher",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "issue2-author@example.com",
        id: 764,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "issue2-author",
        name: "Issue2 Author",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "issue2-assignee@example.com",
        id: 765,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "issue2-assignee",
        name: "Issue2 Assignee",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "issue2-voter@example.com",
        id: 766,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "issue2-voter",
        name: "Issue2 Voter",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "issue2-watcher@example.com",
        id: 767,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "issue2-watcher",
        name: "Issue2 Watcher",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "project-watcher@example.com",
        id: 768,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "project-watcher",
        name: "Project Watcher",
        token: null,
      },
    ]);
    await db.insert(project).values({
      id: 769,
      name: "batched-issue-project",
      organizationId: null,
      owner: "door",
      overview: "Batched issue project",
      projectScope: "public",
      vcs: "GIT",
    });
    await db.insert(projectUser).values([
      { projectId: 769, roleId: 2, userId: 760 },
      { projectId: 769, roleId: 2, userId: 764 },
      { projectId: 769, roleId: 2, userId: 765 },
    ]);
    await db.insert(assignee).values({
      id: 770,
      projectId: 769,
      userId: 765,
    });
    await db.insert(issue).values([
      {
        authorId: 760,
        authorLoginId: "issue1-author",
        authorName: "Issue1 Author",
        body: "Issue one body",
        createdDate: new Date("2026-03-17T00:00:00.000Z"),
        id: 771,
        number: 1,
        projectId: 769,
        state: 0,
        title: "Issue one",
        updatedDate: new Date("2026-03-17T00:00:00.000Z"),
      },
      {
        assigneeId: 770,
        authorId: 764,
        authorLoginId: "issue2-author",
        authorName: "Issue2 Author",
        body: "Issue two body",
        createdDate: new Date("2026-03-18T00:00:00.000Z"),
        id: 772,
        number: 2,
        projectId: 769,
        state: 0,
        title: "Issue two",
        updatedDate: new Date("2026-03-18T00:00:00.000Z"),
      },
    ]);
    await db.insert(issueComment).values({
      authorId: 761,
      authorLoginId: "issue1-commenter",
      authorName: "Issue1 Commenter",
      contents: "Issue one comment",
      createdDate: new Date("2026-03-17T01:00:00.000Z"),
      id: 773,
      issueId: 771,
      projectId: 769,
    });
    await db.insert(issueVoter).values([
      { issueId: 771, userId: 762 },
      { issueId: 772, userId: 766 },
    ]);
    await db.insert(watch).values([
      { id: 774, resourceId: "771", resourceType: "issue_post", userId: 763 },
      { id: 775, resourceId: "772", resourceType: "issue_post", userId: 767 },
      { id: 776, resourceId: "769", resourceType: "project", userId: 768 },
    ]);
    await db.insert(unwatch).values({
      id: 777,
      resourceId: "772",
      resourceType: "issue_post",
      userId: 767,
    });

    const summaries = await listIssuesByProject(769, "door", "batched-issue-project", db as never);
    const byIssueNumber = new Map(summaries.map((summary) => [summary.issueNumber, summary]));

    expect(byIssueNumber.get(1)).toMatchObject({
      issueNumber: 1,
      voterCount: 1,
      watcherCount: 5,
    });
    expect(byIssueNumber.get(2)).toMatchObject({
      issueNumber: 2,
      voterCount: 1,
      watcherCount: 4,
    });
  });
});
