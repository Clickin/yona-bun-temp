import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProjectBoardDetailPage, ProjectPostFormPage } from "./routes/-board-views";
import {
  ProjectMilestoneDetailPage,
  ProjectMilestoneFormPage,
  ProjectMilestoneListPage,
} from "./routes/-milestone-views";
import type { ProjectDetailViewModel } from "./routes/-view-models";

const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };

const detail: ProjectDetailViewModel = {
  enrollmentRequested: false,
  isFavorited: false,
  organizationName: "",
  overview: "",
  ownerName: "owner",
  projectName: "projectYobi",
  projectScope: "public",
  viewerCanEnroll: false,
  viewerCanUpdate: true,
};

const boardLabel = {
  categoryId: "3",
  categoryIsExclusive: false,
  categoryName: "kind",
  color: "#abc",
  id: "7",
  name: "guide",
};

const boardPost = {
  attachments: [
    {
      id: "501",
      mimeType: "text/plain",
      name: "board-note.txt",
      size: 42,
    },
  ],
  authorAvatarUrl: "",
  authorId: "1",
  authorLabel: "Owner",
  authorLoginId: "owner",
  bodyHtml: "",
  bodyMarkdown: "body",
  commentCount: 1,
  comments: [
    {
      attachments: [
        {
          id: "502",
          mimeType: "image/png",
          name: "comment.png",
          size: 84,
        },
      ],
      authorId: "2",
      authorLabel: "Commenter",
      authorLoginId: "commenter",
      contentsHtml: "",
      contentsMarkdown: "comment",
      createdLabel: "now",
      id: "9",
      parentCommentId: "",
      viaEmail: false,
    },
  ],
  createdLabel: "now",
  historyHtml: "",
  historyMarkdown: "",
  id: "16",
  isWatching: false,
  labels: [boardLabel],
  notice: false,
  ownerName: "owner",
  permissions: {
    canComment: true,
    canCreate: true,
    canDelete: true,
    canRead: true,
    canSetNotice: true,
    canUpdate: true,
    canWatch: true,
  },
  postNumber: "16",
  projectName: "projectYobi",
  readme: false,
  title: "Board post",
  updatedLabel: "later",
  watcherCount: 0,
};

const milestoneIssue = {
  assigneeLabel: "Owner",
  commentCount: 0,
  issueNumber: 3,
  labels: [{ color: "#abc", id: 7, name: "guide" }],
  state: "open",
  title: "Milestone issue",
  updatedLabel: "later",
};

const milestone = {
  attachments: [{ id: 901, name: "spec.pdf", url: "/yona/files/901" }],
  closedIssueCount: 0,
  closedIssues: [],
  completionPercent: 10,
  contentsMarkdown: "Ship **it**",
  dueDateLabel: "2026-07-01",
  dueDateOverdue: true,
  id: 5,
  openIssueCount: 1,
  openIssues: [milestoneIssue],
  state: "open",
  title: "M1",
  untilLabel: "5 days left",
  viewerCanDelete: true,
  viewerCanUpdate: true,
};

describe("board/milestone UI parity closure", () => {
  it("keeps board create/edit forms free of the non-legacy label picker and renders the legacy uploader shell", () => {
    const html = renderToStaticMarkup(
      <ProjectPostFormPage
        canMarkNotice={true}
        canMarkReadme={true}
        labels={[boardLabel]}
        mode="create"
        ownerName="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
        onSubmit={async () => undefined}
      />,
    );

    expect(html).not.toContain("board-label-picker");
    expect(html).toContain('class="upload-wrap content-footer"');
    expect(html).toContain('data-resource-type="BOARD_POST"');
    expect(html).toContain('name="filePath"');
  });

  it("renders board detail delete confirmation, updateable label select, and attachment metadata", () => {
    const html = renderToStaticMarkup(
      <ProjectBoardDetailPage
        messages={(key) => key}
        post={boardPost}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('href="#deleteConfirm"');
    expect(html).toContain('id="deleteConfirm"');
    expect(html).toContain('data-request-uri="/yona/owner/projectYobi/post/16/delete"');
    expect(html).toContain('id="labelIds"');
    expect(html).toContain('data-toggle="select2"');
    expect(html).toContain(
      'data-request-uri="/yona/-_-api/v1/owners/owner/projects/projectYobi/postlabel/16"',
    );
    expect(html).toContain('data-attachments="[{&quot;fileHref&quot;:&quot;/yona/files/501&quot;');
    expect(html).toContain('class="attached-file"');
    expect(html).toContain('data-resource-type="NONISSUE_COMMENT"');
    expect(html).toContain("comment.png");
  });

  it("renders milestone list sort/search and due-date relative metadata from the view model", () => {
    const html = renderToStaticMarkup(
      <ProjectMilestoneListPage
        detail={detail}
        list={{
          milestones: [milestone, { ...milestone, id: 6, title: "M2" }],
          orderBy: "dueDate",
          orderDir: "asc",
          state: "open",
        }}
        owner="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain("state=open&amp;orderBy=completionRate&amp;orderDir=asc");
    expect(html).toContain('class="pull-left search search-bar"');
    expect(html).toContain('class="due-date over"');
    expect(html).toContain('<span class="date">(5 days left)</span>');
  });

  it("renders milestone form/detail uploader, attachment metadata, mass-update shell, and field-level validation source", () => {
    const formHtml = renderToStaticMarkup(
      <ProjectMilestoneFormPage
        detail={detail}
        mode="create"
        owner="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
      />,
    );
    const detailHtml = renderToStaticMarkup(
      <ProjectMilestoneDetailPage
        detail={detail}
        issueState="open"
        milestone={milestone}
        owner="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
      />,
    );
    const source = fs.readFileSync(path.resolve(__dirname, "routes/-milestone-views.tsx"), "utf8");

    expect(formHtml).toContain('class="upload-wrap content-footer"');
    expect(formHtml).toContain('data-resource-type="MILESTONE"');
    expect(detailHtml).toContain(
      'data-attachments="[{&quot;fileHref&quot;:&quot;/yona/files/901&quot;',
    );
    expect(detailHtml).toContain('class="mass-update-wrap hide-in-mobile"');
    expect(detailHtml).toContain('data-toggle="item-search"');
    expect(source).toContain('validationMessage?.field === "title" ? " error"');
    expect(source).toContain('<div className="message">');
    expect(source).not.toContain('className="alert alert-error"');
  });
});
