import { describe, expect, it } from "vitest";
import {
  issueAssignInputSchema,
  issueDetailSchema,
  issueTimelineEventSchema,
  issueSummarySchema,
  issueTimelineItemSchema,
  issueUnassignInputSchema,
} from "./issue";

describe("issue contracts", () => {
  it("parses participation fields on issue summary and detail", () => {
    expect(
      issueSummarySchema.parse({
        assignee: {
          loginId: "alecsiel",
          name: "Alec Siel",
        },
        authorLoginId: "nori",
        authorName: "Nori",
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        issueNumber: 1,
        ownerName: "yobi",
        projectName: "projectYobi",
        state: "open",
        title: "Issue title",
        voterCount: 2,
        watcherCount: 4,
      }),
    ).toEqual({
      assignee: {
        loginId: "alecsiel",
        name: "Alec Siel",
      },
      authorLoginId: "nori",
      authorName: "Nori",
      createdAt: new Date("2026-03-10T00:00:00.000Z"),
      issueNumber: 1,
      ownerName: "yobi",
      projectName: "projectYobi",
      state: "open",
      title: "Issue title",
      voterCount: 2,
      watcherCount: 4,
    });

    expect(
      issueDetailSchema.parse({
        assignee: null,
        authorLoginId: "nori",
        authorName: "Nori",
        body: "Issue body",
        comments: [],
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        hasVoted: false,
        isWatching: true,
        issueNumber: 1,
        ownerName: "yobi",
        projectName: "projectYobi",
        state: "open",
        timeline: [],
        title: "Issue title",
        voterCount: 0,
        watcherCount: 1,
      }),
    ).toMatchObject({
      hasVoted: false,
      isWatching: true,
      timeline: [],
      voterCount: 0,
      watcherCount: 1,
    });
  });

  it("parses timeline items as a discriminated union", () => {
    expect(
      issueTimelineItemSchema.parse({
        authorLoginId: "nori",
        authorName: "Nori",
        commentId: 10,
        contents: "First comment",
        createdAt: new Date("2026-03-10T01:00:00.000Z"),
        kind: "comment",
      }),
    ).toMatchObject({
      commentId: 10,
      kind: "comment",
    });

    expect(
      issueTimelineEventSchema.parse({
        createdAt: new Date("2026-03-10T02:00:00.000Z"),
        eventId: 11,
        eventType: "issue.assignee.changed",
        kind: "event",
        newValue: "alecsiel",
        oldValue: "nori",
        senderLoginId: "yobi",
      }),
    ).toMatchObject({
      eventId: 11,
      kind: "event",
    });
  });

  it("normalizes assign and unassign inputs", () => {
    expect(
      issueAssignInputSchema.parse({
        assigneeLoginId: "  alecsiel  ",
        issueNumber: 1,
        ownerName: "  yobi  ",
        projectName: "  projectYobi  ",
      }),
    ).toEqual({
      assigneeLoginId: "alecsiel",
      issueNumber: 1,
      ownerName: "yobi",
      projectName: "projectYobi",
    });

    expect(
      issueUnassignInputSchema.parse({
        issueNumber: 1,
        ownerName: "  yobi  ",
        projectName: "  projectYobi  ",
      }),
    ).toEqual({
      issueNumber: 1,
      ownerName: "yobi",
      projectName: "projectYobi",
    });
  });
});
