import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectIssueDetailPage } from "./routes/-issue-views";
import type { ProjectDetailViewModel, ProjectIssueDetailViewModel } from "./routes/-view-models";

describe("ProjectIssueDetailPage legacy issue shell", () => {
  it("renders the legacy board shell, state badge, watch, vote, and label anchors", () => {
    const html = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          hasVoted: true,
          isWatching: true,
          labels: [{ color: "#f44336", id: 5, name: "bug" }],
          voterCount: 2,
          watcherCount: 3,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
        onFavoriteToggle={async () => undefined}
        onVoteToggle={async () => undefined}
        onWatchToggle={async () => undefined}
      />,
    );

    expect(html).toContain('class="app-shell issue-detail-page page-wrap-outer"');
    expect(html).toContain('class="project-page-wrap board-view"');
    expect(html).toContain('class="board-header issue"');
    expect(html).toContain('class="board-id"');
    expect(html).toContain("#1");
    expect(html).toContain('class="badge badge-issue-open"');
    expect(html).toContain('class="board-body row-fluid"');
    expect(html).toContain('class="span9 span-left-pane"');
    expect(html).toContain('class="span3 right-menu"');
    expect(html).toContain('class="board-actrow right-txt"');
    expect(html).toContain('id="watch-button"');
    expect(html).toContain('data-watching="true"');
    expect(html).toContain('id="vote"');
    expect(html).toContain('class="vote-wrap voter-exists"');
    expect(html).toContain('data-request-method="post"');
    expect(html).toContain('class="watcher-list"');
    expect(html).toContain("Watchers: 3");
    expect(html).toContain('class="label issue-label list-label active"');
  });

  it("renders the legacy delete confirmation modal shell for deletable issues", () => {
    const html = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          viewerCanDelete: true,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
        onDeleteIssue={async () => undefined}
      />,
    );

    expect(html).toContain('href="#deleteConfirm"');
    expect(html).toContain('data-toggle="modal"');
    expect(html).toContain('id="deleteConfirm"');
    expect(html).toContain('class="modal hide fade"');
    expect(html).toContain("issue.delete");
    expect(html).toContain("post.delete.confirm");
    expect(html).toContain('class="ybtn ybtn-danger"');
    expect(html).toContain('data-request-method="delete"');
  });

  it("renders the legacy comment delete trigger and confirmation modal shell", () => {
    const html = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          commentCount: 1,
          timeline: [
            {
              comment: {
                authorAvatarUrl: "https://cdn.yona/avatar-commenter.png",
                authorLabel: "Commenter",
                authorLoginId: "commenter",
                contentsHtml: "<p>Comment body</p>",
                contentsMarkdown: "Comment body",
                createdLabel: "now",
                id: 55,
                viewerCanDelete: true,
                viewerCanUpdate: false,
                viewerHasVoted: false,
                voterCount: 0,
                voters: [],
              },
              createdLabel: "now",
              eventType: "",
              id: 55,
              kind: "comment",
              newValue: "",
              oldValue: "",
              senderLoginId: "",
            },
          ],
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
        onCommentDelete={async () => undefined}
      />,
    );

    expect(html).toContain('id="comment-55"');
    expect(html).toContain('data-toggle="comment-delete"');
    expect(html).toContain('data-request-uri="/yona/owner/projectYobi/issue/1/comment/55/delete"');
    expect(html).toContain('title="common.comment.delete"');
    expect(html).toContain('class="btn-transparent-with-fontsize-lineheight ml6"');
    expect(html).toContain('id="comment-delete-modal"');
    expect(html).toContain('class="modal hide fade"');
    expect(html).toContain("common.comment.delete.confirm");
    expect(html).toContain('id="comment-delete-confirm"');
    expect(html).toContain('data-request-method="delete"');
  });

  it("renders legacy event timeline anchors and hides body-change events", () => {
    const html = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          timeline: [
            {
              createdLabel: "1 minute ago",
              eventType: "ISSUE_STATE_CHANGED",
              id: 17,
              kind: "event",
              newValue: "closed",
              oldValue: "open",
              senderLoginId: "owner",
            },
            {
              createdLabel: "now",
              eventType: "ISSUE_LABEL_CHANGED",
              id: 18,
              kind: "event",
              newValue: "bug",
              oldValue: "",
              senderLoginId: "owner",
            },
            {
              createdLabel: "now",
              eventType: "ISSUE_BODY_CHANGED",
              id: 19,
              kind: "event",
              newValue: "new body",
              oldValue: "old body",
              senderLoginId: "owner",
            },
          ],
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );

    expect(html).toContain('class="event" id="event-17"');
    expect(html).toContain('class="state closed"');
    expect(html).toContain("issue.event.closed");
    expect(html).toContain('href="/yona/owner"');
    expect(html).toContain('class="date"><a href="#event-17">1 minute ago</a></span>');
    expect(html).toContain('class="event" id="event-18"');
    expect(html).toContain('class="state label-added"');
    expect(html).toContain("issue.event.label.added");
    expect(html).not.toContain('id="event-19"');
  });
});

const projectDetail: ProjectDetailViewModel = {
  enrollmentRequested: false,
  isFavorited: false,
  organizationName: "",
  overview: "",
  ownerName: "owner",
  projectName: "projectYobi",
  projectScope: "private",
  viewerCanEnroll: false,
  viewerCanUpdate: true,
};

const issueDetail: ProjectIssueDetailViewModel = {
  assigneeAvatarUrl: "",
  assigneeLabel: "",
  assigneeLoginId: "",
  attachments: [],
  authorAvatarUrl: "https://cdn.yona/avatar-owner.png",
  authorLabel: "Owner User",
  authorLoginId: "owner",
  bodyHtml: "<p>Body</p>",
  bodyMarkdown: "Body",
  commentCount: 0,
  comments: [],
  hasVoted: false,
  historyHtml: "",
  historyMarkdown: "",
  isFavorited: false,
  isWatching: false,
  issueNumber: 1,
  labels: [],
  milestoneTitle: "",
  ownerName: "owner",
  projectName: "projectYobi",
  sharers: [],
  state: "open",
  timeline: [],
  title: "Shared issue",
  viewerCanComment: false,
  viewerCanDelete: false,
  viewerCanManageSharers: false,
  viewerCanUpdate: false,
  viewerHasInheritedShare: false,
  viewerIsDirectSharer: false,
  voterCount: 0,
  watcherCount: 0,
};
