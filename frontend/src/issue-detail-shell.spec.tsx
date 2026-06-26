import React from "react";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ISSUE_ASSIGNEE_SEARCH_DEBOUNCE_MS,
  IssueAssignableUserSuggestions,
  IssueMentionUserSuggestions,
  IssueReferenceSuggestions,
  IssueSharerPanel,
  ProjectIssueDetailPage,
} from "./routes/-issue-views";
import { legacyIssueLabelTextClass } from "./routes/-shared";
import type { ProjectDetailViewModel, ProjectIssueDetailViewModel } from "./routes/-view-models";

describe("ProjectIssueDetailPage legacy issue shell", () => {
  it("matches legacy issue label text contrast classes", () => {
    expect(legacyIssueLabelTextClass("#ffffff")).toBe("dimgray");
    expect(legacyIssueLabelTextClass("#f44336")).toBe("white");
    expect(legacyIssueLabelTextClass("#abc")).toBe("white");
  });

  it("renders issue assignee autocomplete loading, empty, error, and suggestion states", () => {
    expect(ISSUE_ASSIGNEE_SEARCH_DEBOUNCE_MS).toBe(300);

    const loadingHtml = renderToStaticMarkup(
      <IssueAssignableUserSuggestions
        onSelect={() => undefined}
        state={{ items: [], status: "loading", truncated: false }}
      />,
    );
    expect(loadingHtml).toContain("Searching...");
    expect(loadingHtml).not.toContain("Searching…");

    const emptyHtml = renderToStaticMarkup(
      <IssueAssignableUserSuggestions
        onSelect={() => undefined}
        state={{ items: [], status: "loaded", truncated: false }}
      />,
    );
    expect(emptyHtml).toContain("No results");
    expect(emptyHtml).not.toContain("title.no.results");
    expect(emptyHtml).not.toContain("No matches found");
    expect(emptyHtml).not.toContain("No matching users");

    const errorHtml = renderToStaticMarkup(
      <IssueAssignableUserSuggestions
        onSelect={() => undefined}
        state={{ items: [], status: "error", truncated: false }}
      />,
    );
    expect(errorHtml).toBe("");
    expect(errorHtml).not.toContain("Assignable user search failed.");

    const suggestionHtml = renderToStaticMarkup(
      <IssueAssignableUserSuggestions
        onSelect={() => undefined}
        state={{
          items: [
            {
              avatarUrl: "/avatars/door.png",
              displayName: "Door User",
              loginId: "door",
              pureNameOnly: "Door",
              type: "user",
            },
          ],
          status: "loaded",
          truncated: true,
        }}
      />,
    );
    expect(suggestionHtml).toContain("Door User");
    expect(suggestionHtml).toContain("@door");
    expect(suggestionHtml).toContain("Loading more results...");
    expect(suggestionHtml).not.toContain("Loading more results…");
  });

  it("hides issue mention and reference loading states like legacy At.js", () => {
    const mentionHtml = renderToStaticMarkup(
      <IssueMentionUserSuggestions
        onSelect={() => undefined}
        state={{ items: [], status: "loading", truncated: false }}
      />,
    );
    expect(mentionHtml).toBe("");
    expect(mentionHtml).not.toContain("Searching…");
    expect(mentionHtml).not.toContain("Searching...");

    const referenceHtml = renderToStaticMarkup(
      <IssueReferenceSuggestions
        onSelect={() => undefined}
        state={{ items: [], status: "loading", truncated: false }}
      />,
    );
    expect(referenceHtml).toBe("");
    expect(referenceHtml).not.toContain("Searching…");
    expect(referenceHtml).not.toContain("Searching...");
  });

  it("opens the legacy issue sharer picker with the border class after share action", () => {
    const manageableIssue = {
      ...issueDetail,
      sharers: [],
      viewerCanManageSharers: true,
      viewerCanUpdate: true,
    };

    const closedHtml = renderToStaticMarkup(
      <IssueSharerPanel
        issue={manageableIssue}
        onShareIssue={async () => undefined}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona", showUserEmail: true }}
      />,
    );
    expect(closedHtml).toContain('class="sharer-list hideFromDisplayOnly"');
    expect(closedHtml).toContain('<dd class="hideFromDisplayOnly" id="sharer-list">');
    expect(closedHtml).not.toContain("sharer-list-border");

    const openHtml = renderToStaticMarkup(
      <IssueSharerPanel
        issue={manageableIssue}
        onShareIssue={async () => undefined}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona", showUserEmail: true }}
        sharePickerOpen
      />,
    );
    expect(openHtml).toContain('class="sharer-list sharer-list-border"');
    expect(openHtml).toContain('<dd id="sharer-list">');
    expect(openHtml).not.toContain('class="hideFromDisplayOnly" id="sharer-list"');

    const existingSharerHtml = renderToStaticMarkup(
      <IssueSharerPanel
        issue={{
          ...manageableIssue,
          sharers: [{ loginId: "door", userId: 2, userLabel: "Door User" }],
        }}
        onShareIssue={async () => undefined}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona", showUserEmail: true }}
        sharePickerOpen
      />,
    );
    expect(existingSharerHtml).toContain('class="sharer-list sharer-list-border"');
    expect(existingSharerHtml).toContain("Door User");
  });

  it("renders the legacy board shell, state badge, watch, vote, and label anchors", () => {
    const html = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          bodyMarkdown: "Body **markdown** with `React`",
          hasVoted: true,
          issueId: 101,
          isWatching: true,
          parentIssueId: 0,
          issueVoters: [
            {
              avatarUrl: "https://cdn.yona/avatar-door.png",
              emailAddress: "door@yona.test",
              loginId: "door",
              userId: 2,
              userLabel: "Door User",
            },
            {
              avatarUrl: "https://cdn.yona/avatar-nori.png",
              emailAddress: "nori@yona.test",
              loginId: "nori",
              userId: 3,
              userLabel: "Nori User",
            },
            {
              avatarUrl: "https://cdn.yona/avatar-rio.png",
              emailAddress: "rio@yona.test",
              loginId: "rio",
              userId: 4,
              userLabel: "Rio User",
            },
            {
              avatarUrl: "https://cdn.yona/avatar-mina.png",
              emailAddress: "mina@yona.test",
              loginId: "mina",
              userId: 5,
              userLabel: "Mina User",
            },
            {
              avatarUrl: "https://cdn.yona/avatar-jo.png",
              emailAddress: "jo@yona.test",
              loginId: "jo",
              userId: 6,
              userLabel: "Jo User",
            },
          ],
          labels: [{ color: "#f44336", id: 5, name: "bug" }],
          viewerCanUpdate: true,
          voterCount: 5,
          watcherCount: 3,
          weight: 3,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona", showUserEmail: true }}
        onFavoriteToggle={async () => undefined}
        onIssueWeightChange={async () => undefined}
        onVoteToggle={async () => undefined}
        onWatchToggle={async () => undefined}
      />,
    );

    expect(html).toContain('class="app-shell issue-detail-page"');
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-header-inner"');
    expect(html).toContain('class="project-header-wrap"');
    expect(html).toContain('<a href="/yona/owner">owner</a>');
    expect(html).toContain('<a href="/yona/owner/projectYobi">projectYobi</a>');
    expect(html).toContain('class="project-menu-outer"');
    expect(html).toContain('href="#helpKeys"');
    expect(html).toContain('class="modal hide fade keymap-help"');
    expect(html).toContain("<h5>Issue details</h5>");
    expect(html).toContain('<span class="help-inline">New issue</span>');
    expect(html).toContain('<span class="help-inline">List</span>');
    expect(html).toContain('<span class="help-inline">Edit</span>');
    expect(html).toContain("<h5>Issue Comments</h5>");
    expect(html).toContain('<span class="help-inline">Comment &amp; Close issue</span>');
    expect(html).toContain('class="page-wrap-outer"');
    expect(html).not.toContain("Yona Rust Project");
    expect(html).not.toContain("<p>owner/projectYobi</p>");
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
    expect(html).toContain(">Unsubscribe from this issue</button>");
    expect(html).not.toContain(">issue.unwatch</button>");
    expect(html).toContain('id="issue-share-button"');
    expect(html).toContain("Issue Sharing");
    expect(html).toContain(
      'data-content="You can share this issue with a user or all members of a project.',
    );
    expect(html).toContain('class="project-btn-item hide show-in-mobile-inline ml4"');
    expect(html).toContain('href="/yona/owner/projectYobi/issueform?parentIssueId=101"');
    expect(html).toContain("New subtask");
    expect(html).toContain('class="issue-weight"');
    expect(html).toContain('id="upvote-issue-weight"');
    expect(html).toContain('title="Issue weight: Upvote"');
    expect(html).toContain('id="down-vote-issue-weight"');
    expect(html).toContain('title="Issue weight: Down vote"');
    expect(html).toContain('class="weight-number"');
    expect(html).toContain(">3</span>");
    expect(html).toContain('id="translate"');
    expect(html).toContain('title="Translation"');
    expect(html).toContain('class="yobicon-lang"');
    expect(html).toContain('title="Edit"');
    expect(html).toContain('class="yobicon-edit-2"');
    expect(html).not.toContain(">Edit</a>");
    expect(html).toContain('id="vote"');
    expect(html).toContain('class="vote-wrap voter-exists"');
    expect(html).toContain('href="/yona/owner/projectYobi/issue/1/unvote"');
    expect(html).toContain('data-request-method="post"');
    expect(html).toContain('class="heart"');
    expect(html).toContain('class="yobicon-hearts"');
    expect(html).toContain('class="voter-list-wrap"');
    expect(html).toContain('class="voter-list"');
    expect(html).toContain('href="/yona/door"');
    expect(html).toContain('src="https://cdn.yona/avatar-door.png"');
    expect(html).toContain('id="voters"');
    expect(html).toContain('class="modal hide voters-dialog"');
    expect(html).toContain("People who agree with this");
    expect(html).toContain('class="usf-group"');
    expect(html).toContain("Door User");
    expect(html).toContain('id="copyEmailBtn"');
    expect(html).toContain("Copy email list");
    expect(html).toContain("Door User &lt;door@yona.test&gt;;");
    expect(html).toContain("Nori User &lt;nori@yona.test&gt;;");
    expect(html).toContain("Rio User &lt;rio@yona.test&gt;;");
    expect(html).toContain("and 2 others");
    expect(html).not.toContain("issue.voters.more 2");
    expect(html).not.toContain("Voters: 2");
    expect(html).not.toContain("Unvote");
    expect(html).toContain('<div class="watcher-list"></div>');
    expect(html).not.toContain("Watchers: 3");
    expect(html).toContain("<dt>Label</dt>");
    expect(html).toContain('class="label issue-label active static white"');
    expect(html).toContain('data-label-id="5"');
    expect(html).toContain('href="/yona/owner/projectYobi/issues?state=open&amp;labelIds=5"');
    expect(html).not.toContain('class="label issue-label list-label active"');
    expect(html).toContain('class="hide" id="issue-1"');
    expect(html).toContain(
      'action="/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/content"',
    );
    expect(html).toContain("<textarea>Body **markdown** with `React`</textarea>");
    expect(html).toContain('id="issue-body-1"');
    expect(html).toContain("<strong>markdown</strong>");
    expect(html).toContain("<code>React</code>");
  });

  it("renders legacy issue next-state button labels", () => {
    const openHtml = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          viewerCanUpdate: true,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
        onStateChange={async () => undefined}
      />,
    );
    const closedHtml = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          state: "closed",
          viewerCanUpdate: true,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
        onStateChange={async () => undefined}
      />,
    );

    expect(openHtml).toContain(">Close issue</button>");
    expect(openHtml).not.toContain(">button.nextState.closed</button>");
    expect(closedHtml).toContain(">Reopen issue</button>");
    expect(closedHtml).not.toContain(">button.nextState.open</button>");
  });

  it("renders the legacy show-original edit control when the viewer cannot update", () => {
    const html = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={issueDetail}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );

    expect(html).toContain('href="/yona/owner/projectYobi/issue/1/editform"');
    expect(html).toContain('title="See text"');
    expect(html).toContain('class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"');
    expect(html).not.toContain('title="button.show.original"');
  });

  it("renders legacy issue child comments under their parent with one-line reply form", () => {
    const parentComment = {
      authorAvatarUrl: "https://cdn.yona/avatar-parent.png",
      authorLabel: "Parent User",
      authorLoginId: "parent",
      contentsHtml: "",
      contentsMarkdown: "Parent comment",
      createdLabel: "1 minute ago",
      id: 77,
      viewerCanDelete: false,
      viewerCanUpdate: false,
      viewerHasVoted: false,
      voterCount: 0,
      voters: [],
    };
    const childComment = {
      ...parentComment,
      authorLabel: "Child User",
      authorLoginId: "child",
      contentsMarkdown: "Child reply",
      createdLabel: "now",
      id: 78,
      parentCommentId: 77,
      viewerCanDelete: true,
    };
    const html = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          commentCount: 2,
          comments: [parentComment, childComment],
          timeline: [
            {
              comment: parentComment,
              createdLabel: "1 minute ago",
              eventType: "",
              id: 77,
              kind: "comment",
              newValue: "",
              oldValue: "",
              senderLoginId: "",
            },
            {
              comment: childComment,
              createdLabel: "now",
              eventType: "",
              id: 78,
              kind: "comment",
              newValue: "",
              oldValue: "",
              senderLoginId: "",
            },
          ],
          viewerCanComment: true,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
        onCommentDelete={async () => undefined}
        onCommentSubmit={async () => undefined}
      />,
    );

    expect(html).toContain('id="comment-77"');
    expect(html).not.toContain('id="comment-78"');
    expect(html).toContain('class="issue-info"');
    expect(html).toContain('<div class="board-comment-wrap" id="comments"><div id="timeline"');
    expect(html).toContain('class="comment index-comment"');
    expect(html).toContain('data-location="#comment-77"');
    expect(html).toContain('id="comment-body-77"');
    expect(html).toContain(
      '<div class="comment-body"><a href="#comment-77">Parent comment</a></div>',
    );
    expect(html).toContain('class="index-comment-author"');
    expect(html).toContain('class="comment-exists"');
    expect(html).toContain('class="comment_author"');
    expect(html).toContain('href="/yona/parent"');
    expect(html).toContain('class="share-link"');
    expect(html).toContain('class="add-a-comment pull-right"');
    expect(html).toContain('class="child-comments"');
    expect(html).toContain('class="one-line-comment"');
    expect(html).toContain("Child reply");
    expect(html).toContain('<div class="contents"><p>Child reply</p><span');
    expect(html).not.toContain('<div class="contents"><div><p>Child reply</p></div><span');
    expect(html).toContain('class="subcomment-author hide"');
    expect(html).toContain('class="parentCommentId"');
    expect(html).toContain('name="parentCommentId"');
    expect(html).toContain('value="77"');
    expect(html).toContain('class="oneline-comment-box"');
    expect(html).toContain("Reply (CTRL + ENTER)");
    expect(html).toContain('data-request-uri="/yona/owner/projectYobi/issue/1/comment/78/delete"');
  });

  it("marks comments and mention links for the current user like legacy jQuery", () => {
    const comment = {
      authorAvatarUrl: "https://cdn.yona/avatar-parent.png",
      authorLabel: "Parent User",
      authorLoginId: "parent",
      contentsHtml: "",
      contentsMarkdown: "Please check @door",
      createdLabel: "1 minute ago",
      id: 88,
      mentionReferences: [
        { kind: "user", label: "Door User", loginId: "door", ownerName: "", projectName: "" },
      ],
      viewerCanDelete: false,
      viewerCanUpdate: false,
      viewerHasVoted: false,
      voterCount: 0,
      voters: [],
    };
    const html = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          commentCount: 1,
          comments: [comment],
          timeline: [
            {
              comment,
              createdLabel: "1 minute ago",
              eventType: "",
              id: 88,
              kind: "comment",
              newValue: "",
              oldValue: "",
              senderLoginId: "",
            },
          ],
          viewerCanComment: true,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
        viewerLabel="Door User"
        viewerLoginId="door"
      />,
    );

    expect(html).toContain('<li class="comment mentioned" id="comment-88"');
    expect(html).toContain('class="no-text-decoration user-link me" href="/yona/door"');
  });

  it("uses the legacy no-author label for issue detail author fallback", () => {
    const html = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          authorLabel: "",
          authorLoginId: "",
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );

    expect(html).toContain('<strong class="name">No author</strong>');
    expect(html).toContain('alt="No author"');
    expect(html).not.toContain("Unknown");
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
    expect(html).toContain("Delete issue");
    expect(html).toContain("Once you delete the post, you won&#x27;t be able to recover it.");
    expect(html).toContain('class="ybtn ybtn-danger"');
    expect(html).toContain('data-request-method="delete"');
    expect(html).toContain('title="Delete"');
    expect(html).toContain('class="yobicon-trash"');
    expect(html).not.toContain(">Delete</button>");
  });

  it("renders the legacy comment delete trigger and confirmation modal shell", () => {
    const html = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          commentCount: 1,
          viewerCanComment: true,
          timeline: [
            {
              comment: {
                authorAvatarUrl: "https://cdn.yona/avatar-commenter.png",
                authorId: 42,
                authorLabel: "Commenter",
                authorLoginId: "commenter",
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
        onCommentVoteToggle={async () => undefined}
      />,
    );

    expect(html).toContain('id="comment-55"');
    expect(html).toContain('class="ago-date"');
    expect(html).toContain('class="ago" href="#comment-55"');
    expect(html).toContain('class="share-link" href="#comment-55"');
    expect(html).toContain('class="act-row pull-right"');
    expect(html).toContain('class="new-issue-by"');
    expect(html).toContain('href="/yona/user/issues/new?commentId=55"');
    expect(html).toContain(
      'class="icon btn-transparent-with-fontsize-lineheight ml10 comment-translate"',
    );
    expect(html).toContain('data-comment-id="55"');
    expect(html).toContain('title="Translation"');
    expect(html).toContain('data-request-type="comment-vote"');
    expect(html).toContain('data-request-uri="/yona/owner/projectYobi/issue/1/comment/55/vote"');
    expect(html).toContain('title="Agree"');
    expect(html).toContain('id="comment-body-55"');
    expect(html).toContain('<div class="comment-body markdown-wrap"');
    expect(html).toContain("<p>Comment body</p>");
    expect(html).toContain('data-allowed-update="false"');
    expect(html).toContain('data-toggle="comment-delete"');
    expect(html).toContain('data-request-uri="/yona/owner/projectYobi/issue/1/comment/55/delete"');
    expect(html).toContain('title="Delete comment"');
    expect(html).toContain('class="btn-transparent-with-fontsize-lineheight ml6"');
    expect(html).toContain('id="comment-delete-modal"');
    expect(html).toContain('class="modal hide fade"');
    expect(html).toContain("Once you delete this comment, you won&#x27;t be able to recover it.");
    expect(html).toContain('id="comment-delete-confirm"');
    expect(html).toContain('data-request-method="delete"');
  });

  it("renders the legacy comment edit trigger shell", () => {
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
                authorId: 42,
                authorLabel: "Commenter",
                authorLoginId: "commenter",
                contentsMarkdown: "- [ ] Comment body",
                createdLabel: "now",
                id: 56,
                viewerCanDelete: false,
                viewerCanUpdate: true,
                viewerHasVoted: false,
                voterCount: 0,
                voters: [],
              },
              createdLabel: "now",
              eventType: "",
              id: 56,
              kind: "comment",
              newValue: "",
              oldValue: "",
              senderLoginId: "",
            },
          ],
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
        onCommentUpdate={async () => undefined}
      />,
    );

    expect(html).toContain('id="comment-56"');
    expect(html).toContain('data-toggle="comment-edit"');
    expect(html).toContain('data-comment-id="56"');
    expect(html).toContain('title="Edit comment"');
    expect(html).toContain('class="btn-transparent-with-fontsize-lineheight ml10"');
    expect(html).toContain('id="comment-editform-56"');
    expect(html).toContain('class="comment-update-form"');
    expect(html).toContain('class="file-upload__label ybtn"');
    expect(html).toContain('for="upload-56"');
    expect(html).toContain('class="file-upload__input"');
    expect(html).toContain('id="upload-56"');
    expect(html).toContain('type="file"');
    expect(html).toContain('name="filePath"');
    expect(html).toContain("multiple");
    expect(html).toContain('class="send-notification-check"');
    expect(html).toContain('data-toggle="popover"');
    expect(html).toContain('data-trigger="hover"');
    expect(html).toContain('data-placement="top"');
    expect(html).toContain('name="notificationMail"');
    expect(html).toContain('value="yes"');
    expect(html).toContain('checked=""');
    expect(html).toContain('class="yobicon-edit-2"');
    expect(html).toContain('id="comment-editform-56"');
    expect(html).toContain('class="comment-update-form"');
    expect(html).toContain('data-toggle="markdown-editor"');
    expect(html).toContain('href="#edit-56"');
    expect(html).toContain('href="#preview-56"');
    expect(html).toContain('data-editor-mode="update-comment-body"');
    expect(html).toContain('class="markdown-help"');
    expect(html).toContain('class="markdown-preview markdown-wrap update-comment-body"');
    expect(html).toContain('class="upload-drop-here"');
    expect(html).toContain('data-task-index="0"');
    expect(html).toContain('data-allowed-update="true"');
  });

  it("renders the legacy writable and disabled issue comment form shells", () => {
    const writableHtml = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          viewerCanComment: true,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
        onCommentSubmit={async () => undefined}
      />,
    );

    expect(writableHtml).toContain('id="comment-form"');
    expect(writableHtml).toContain('action="/yona/owner/projectYobi/issue/1/comments"');
    expect(writableHtml).toContain('encType="multipart/form-data"');
    expect(writableHtml).toContain('<div class="write-comment-box">');
    expect(writableHtml).toContain('data-toggle="markdown-editor"');
    expect(writableHtml).toContain('class="nav nav-tabs nm small"');
    expect(writableHtml).toContain("Edit");
    expect(writableHtml).toContain("Preview");
    expect(writableHtml).toContain('class="markdown-help"');
    expect(writableHtml).toContain('class="markdown-help-nav"');
    expect(writableHtml).toContain('data-target="markdownShortLinks"');
    expect(writableHtml).toContain('class="markdown-help-wrap"');
    expect(writableHtml).toContain('id="editor-contents-comment-body"');
    expect(writableHtml).toContain('name="contents"');
    expect(writableHtml).toContain('data-editor-mode="comment-body"');
    expect(writableHtml).toContain('class="temporaryUploadFiles"');
    expect(writableHtml).toContain('data-resource-type="ISSUE_COMMENT"');
    expect(writableHtml).toContain('id="dynamic-comment-btn"');
    expect(writableHtml).toContain("Add a comment");
    expect(writableHtml).not.toContain("Leave a comment");
    expect(writableHtml).not.toContain(">Comment</button>");

    const directFallbackHtml = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          commentCount: 1,
          timeline: [
            {
              comment: {
                authorAvatarUrl: "",
                authorLabel: "Owner User",
                authorLoginId: "owner",
                contentsMarkdown: "editable comment",
                createdLabel: "now",
                id: 56,
                viewerCanDelete: false,
                viewerCanUpdate: true,
                viewerHasVoted: false,
                voterCount: 0,
                voters: [],
              },
              createdLabel: "now",
              eventType: "COMMENTED",
              id: 56,
              kind: "comment",
              newValue: "",
              oldValue: "",
              senderLoginId: "owner",
            },
          ],
          viewerCanComment: true,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );
    expect(directFallbackHtml).toContain('id="comment-form"');
    expect(directFallbackHtml).toContain('action="/yona/owner/projectYobi/issue/1/comments"');
    expect(directFallbackHtml).toContain('data-toggle="comment-edit"');
    expect(directFallbackHtml).toContain('id="comment-editform-56"');
    expect(directFallbackHtml).toContain('action="/yona/owner/projectYobi/issue/1/comments/56"');

    const source = fs.readFileSync(path.resolve(__dirname, "routes/-issue-views.tsx"), "utf8");
    expect(source).not.toContain("if (!props.onSubmit) {");
    expect(source).not.toContain("if (!props.onCommentSubmit) {");
    expect(source).toContain("const submitComment = props.onSubmit;");
    expect(source).toContain(".onCommentSubmit?.(contents, [], comment.id)");

    const disabledHtml = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          viewerCanComment: false,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );

    expect(disabledHtml).toContain('class="write-comment-box mt20"');
    expect(disabledHtml).toContain('title="You need to log in to add comments."');
    expect(disabledHtml).toContain('data-login="required"');
    expect(disabledHtml).toContain('class="comment disabled"');
    expect(disabledHtml).toContain('class="ybtn ybtn-disabled"');
  });

  it("uses metadata-backed mention links in the legacy issue history modal", () => {
    const html = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          historyMarkdown: "Old body @owner @owner/projectYobi @ghost @owner/missing",
          mentionReferences: [
            {
              kind: "user",
              label: "owner",
              loginId: "owner",
              ownerName: "",
              projectName: "",
            },
            {
              kind: "project",
              label: "owner/projectYobi",
              loginId: "",
              ownerName: "owner",
              projectName: "projectYobi",
            },
          ],
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );

    expect(html).toContain('id="-yona-posting-history"');
    expect(html).toContain('href="/yona/owner"');
    expect(html).toContain('href="/yona/owner/projectYobi"');
    expect(html).toContain("@ghost @owner/missing");
    expect(html).not.toContain('href="/yona/ghost"');
    expect(html).not.toContain('href="/yona/owner/missing"');
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
              eventType: "ISSUE_ASSIGNEE_CHANGED",
              id: 20,
              kind: "event",
              newValue: "2",
              oldValue: "",
              senderLabel: "Owner User",
              senderLoginId: "owner",
              targetLabel: "Assignee User",
              targetLoginId: "assignee",
            },
            {
              createdLabel: "now",
              eventType: "ISSUE_MILESTONE_CHANGED",
              id: 21,
              kind: "event",
              newValue: "7",
              oldValue: "",
              resourceHref: "/owner/repo/milestone/7",
              resourceLabel: "Sprint 1",
              resourceTitle: "milestone",
              senderLabel: "Owner User",
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
    expect(html).toContain(">Closed</span>");
    expect(html).toContain("<strong>owner</strong></a> closed this issue");
    expect(html).not.toContain("issue.event.closed");
    expect(html).toContain('href="/yona/owner"');
    expect(html).toContain('class="date"><a href="#event-17">1 minute ago</a></span>');
    expect(html).toContain('class="event" id="event-18"');
    expect(html).toContain('class="state label-added"');
    expect(html).toContain(">Added</span>");
    expect(html).toContain("<strong>owner</strong></a> added ");
    expect(html).toContain('<div class="label issue-label">bug</div>');
    expect(html).not.toContain("issue.event.label.added");
    expect(html).toContain('class="event" id="event-20"');
    expect(html).toContain('href="/yona/assignee"');
    expect(html).toContain("<strong>Owner User</strong></a> assigned this issue to ");
    expect(html).toContain("<strong>Assignee User</strong></a>");
    expect(html).toContain('class="event" id="event-21"');
    expect(html).toContain('href="/yona/owner/repo/milestone/7"');
    expect(html).toContain(">Sprint 1</a>");
    expect(html).not.toContain('id="event-19"');
  });

  it("renders the legacy issue and comment uploader shell", () => {
    const html = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          viewerCanComment: true,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );

    expect(html).toContain('class="upload-wrap content-footer"');
    expect(html).toContain('data-resource-type="ISSUE_COMMENT"');
    expect(html).toContain('class="help help-droppable"');
    expect(html).toContain('class="nbtn medium white fake-file-wrap"');
    expect(html).toContain('class="yobicon-upload"');
    expect(html).toContain('name="filePath"');
    expect(html).toContain('multiple=""');
    expect(html).toContain('class="attached-files unstyled"');
    expect(html).toContain("Drag &amp; Drop files to attach here or");
    expect(html).toContain("Click upload button");
    expect(html).toContain("Paste the clipboard image");
    expect(html).toContain("Selected file will be attached when your comment is saved.");
  });

  it("renders the legacy inline issue metadata update form", () => {
    const html = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={{
          ...projectDetail,
          dashboard: {
            labels: [
              {
                categoryId: 3,
                categoryIsExclusive: false,
                categoryName: "Type",
                color: "#f44336",
                id: 5,
                name: "bug",
                openIssueCount: 1,
              },
            ],
          },
        }}
        issue={{
          ...issueDetail,
          dueDateLabel: "2026-08-02",
          issueId: 101,
          labels: [{ color: "#f44336", id: 5, name: "bug" }],
          milestoneId: 7,
          milestoneTitle: "v1.0",
          viewerCanUpdate: true,
        }}
        milestoneOptions={[
          {
            attachments: [],
            closedIssueCount: 0,
            closedIssues: [],
            completionPercent: 0,
            contentsMarkdown: "",
            dueDateLabel: "",
            id: 7,
            openIssueCount: 0,
            openIssues: [],
            state: "open",
            title: "v1.0",
            viewerCanDelete: false,
            viewerCanUpdate: false,
          },
          {
            attachments: [],
            closedIssueCount: 0,
            closedIssues: [],
            completionPercent: 0,
            contentsMarkdown: "",
            dueDateLabel: "",
            id: 8,
            openIssueCount: 0,
            openIssues: [],
            state: "closed",
            title: "v0.9",
            viewerCanDelete: false,
            viewerCanUpdate: false,
          },
        ]}
        onAssign={async () => undefined}
        onMetadataUpdate={async () => undefined}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );

    expect(html).toContain('class="issue-info"');
    expect(html).toContain('id="issueUpdateForm"');
    expect(html).toContain('name="issues[0].id"');
    expect(html).toContain('value="101"');
    expect(html).toContain('id="milestone"');
    expect(html).toContain('name="milestone.id"');
    expect(html).toContain('<optgroup label="Open">');
    expect(html).toContain('<option data-state="open" value="7" selected="">v1.0</option>');
    expect(html).toContain('<optgroup label="Closed">');
    expect(html).toContain('<option data-state="closed" value="8">v0.9</option>');
    expect(html).toContain('name="dueDate"');
    expect(html).toContain('value="2026-08-02"');
    expect(html).toContain('id="labelIds"');
    expect(html).toContain('name="labelIds"');
    expect(html).toContain('data-format="issuelabel"');
    expect(html).toContain("[Edit]");
    expect(html).not.toContain("[button.edit]");
  });

  it("renders the legacy issue subtask list shell", () => {
    const html = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={projectDetail}
        issue={{
          ...issueDetail,
          childClosedCount: 1,
          childIssues: [
            {
              assigneeLabel: "Door User",
              commentCount: 2,
              createdLabel: "now",
              isDraft: false,
              issueNumber: 2,
              labels: [{ color: "#00aaff", id: 9, name: "subtask" }],
              state: "closed",
              title: "Child issue",
              voterCount: 1,
            },
            {
              assigneeLabel: "",
              createdLabel: "yesterday",
              isDraft: false,
              issueNumber: 3,
              labels: [],
              state: "closed",
              title: "Done child",
            },
          ],
          childOpenCount: 1,
          issueNumber: 2,
          parentIssueNumber: 1,
          parentIssueState: "open",
          parentIssueTitle: "Shared issue",
          state: "closed",
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );

    expect(html).toContain('class="subtasks"');
    expect(html).toContain('class="child-issues"');
    expect(html).toContain('class="issue-item parent-issue"');
    expect(html).toContain('href="/yona/owner/projectYobi/issue/1"');
    expect(html).toContain('class="upload-progress red-outline"');
    expect(html).toContain('style="width:50%"');
    expect(html).toContain('class="parent-issue-state open"');
    expect(html).toContain(">Open</span>");
    expect(html).not.toContain("issue.state.open");
    expect(html).not.toContain('class="parent-issue-state closed"');
    expect(html).toContain('class="issue-item child-issue"');
    expect(html).toContain('class="state-label closed"');
    expect(html).toContain('class="subtask-number">#2');
    expect(html).toContain('class="font12 no-border-at-child"');
    expect(html).toContain('class="comments-count comments-count-color"');
    expect(html).toContain('href="/yona/owner/projectYobi/issue/2#comments"');
    expect(html).toContain('class="yobicon-comment2"');
    expect(html).toContain('class="vote-count vote-color"');
    expect(html).toContain('href="/yona/owner/projectYobi/issue/2#vote"');
    expect(html).toContain('class="yobicon-hearts"');
    expect(html).not.toContain('<span class="font12 no-border-at-child"><span>open</span></span>');
    expect(html).toContain('href="/yona/owner/projectYobi/issues?state=open&amp;labelIds=9"');
    expect(html).toContain('class="child-issue-date" title="now"');
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
  bodyMarkdown: "Body",
  commentCount: 0,
  createdLabel: "now",
  comments: [],
  childClosedCount: 0,
  childIssues: [],
  childOpenCount: 0,
  dueDateLabel: "",
  hasVoted: false,
  historyMarkdown: "",
  isFavorited: false,
  isDraft: false,
  isWatching: false,
  issueNumber: 1,
  labels: [],
  milestoneId: 0,
  milestoneTitle: "",
  ownerName: "owner",
  parentIssueId: 0,
  parentIssueNumber: 0,
  parentIssueState: "",
  parentIssueTitle: "",
  projectName: "projectYobi",
  sharers: [],
  state: "open",
  timeline: [],
  title: "Shared issue",
  viewerCanComment: false,
  viewerCanDelete: false,
  viewerCanManageSharers: false,
  viewerCanUpdate: false,
  viewerUserId: 42,
  viewerHasInheritedShare: false,
  viewerIsDirectSharer: false,
  voterCount: 0,
  watcherCount: 0,
  weight: 0,
};
