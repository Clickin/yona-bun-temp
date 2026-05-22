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
