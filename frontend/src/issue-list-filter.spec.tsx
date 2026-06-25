import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectIssueListPage } from "./routes/-issue-views";

describe("project issue list filters", () => {
  it("preserves legacy state author assignee label and milestone query controls", () => {
    const html = renderToStaticMarkup(
      <ProjectIssueListPage
        detail={{
          enrollmentRequested: false,
          isFavorited: false,
          organizationName: "",
          overview: "",
          ownerName: "admin",
          projectName: "projectYobi",
          projectScope: "public",
          viewerCanEnroll: false,
          viewerCanUpdate: true,
        }}
        issueList={{
          draftItems: [
            {
              assigneeLabel: "",
              authorLabel: "Admin User",
              authorLoginId: "admin",
              commentCount: 0,
              id: 103,
              issueNumber: 3,
              labels: [],
              milestoneTitle: "",
              ownerName: "admin",
              projectName: "projectYobi",
              state: "draft",
              title: "Draft issue",
              updatedLabel: "now",
              voterCount: 0,
              watcherCount: 0,
            },
          ],
          items: [
            {
              assigneeLabel: "Door",
              authorLabel: "Admin User",
              authorLoginId: "admin",
              commentCount: 2,
              id: 104,
              issueNumber: 4,
              labels: [
                {
                  color: "#f44336",
                  id: 5,
                  name: "bug",
                },
              ],
              milestoneTitle: "v1.0",
              ownerName: "admin",
              projectName: "projectYobi",
              state: "open",
              title: "Open issue",
              updatedLabel: "today",
              voterCount: 1,
              watcherCount: 1,
            },
          ],
          ownerName: "admin",
          pageNum: 2,
          pageSize: 15,
          projectName: "projectYobi",
          totalCount: 31,
        }}
        labels={[
          {
            categoryName: "Type",
            color: "#f44336",
            id: 5,
            name: "bug",
          },
        ]}
        milestones={[
          {
            id: 7,
            state: "open",
            title: "v1.0",
          },
        ]}
        query={{
          assigneeLoginId: "door",
          authorLoginId: "nori",
          dueDate: "",
          labelIds: [5],
          milestoneId: 7,
          pageNum: 2,
          state: "open",
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );

    expect(html).toContain('action="/yona/admin/projectYobi/issues"');
    expect(html).toContain('class="app-shell issue-list-page"');
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-header-inner"');
    expect(html).toContain('class="project-header-wrap"');
    expect(html).toContain('<a href="/yona/admin">admin</a>');
    expect(html).toContain('<a href="/yona/admin/projectYobi">projectYobi</a>');
    expect(html).toContain('class="project-menu-outer"');
    expect(html).toContain('href="#helpKeys"');
    expect(html).toContain('class="modal hide fade keymap-help"');
    expect(html).toContain("<h5>Issue list</h5>");
    expect(html).toContain('<span class="help-inline">New issue</span>');
    expect(html).toContain('<span class="help-inline">Previous page</span>');
    expect(html).toContain('<span class="help-inline">Next page</span>');
    expect(html).toContain('<span class="help-inline">Select all</span>');
    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('class="row-fluid issue-list-wrap"');
    expect(html).toContain('class=" left-menu span2 span-hard-wrap"');
    expect(html).toContain('<ul class="lst-stacked unstyled">');
    expect(html).toContain("Open");
    expect(html).toContain("Assigned");
    expect(html).toContain("Created");
    expect(html).toContain("Commented");
    expect(html).toContain('id="search"');
    expect(html).toContain('name="state"');
    expect(html).toContain('value="open"');
    expect(html).toContain('name="authorLoginId"');
    expect(html).toContain('value="nori"');
    expect(html).toContain('name="assigneeLoginId"');
    expect(html).toContain('value="door"');
    expect(html).toContain('name="milestoneId"');
    expect(html).toContain('id="advanced-search-form"');
    expect(html).toContain('id="authorId"');
    expect(html).toContain('id="assigneeId"');
    expect(html).toContain('id="milestoneId"');
    expect(html).toContain('<option data-state="open" value="7" selected="">v1.0</option>');
    expect(html).toContain('id="issueDueDate"');
    expect(html).toContain('name="labelIds"');
    expect(html).toContain('<option value="5" selected="">Type: bug</option>');
    expect(html).toContain('class="nav nav-tabs nm"');
    expect(html).toContain("Open");
    expect(html).toContain("Closed");
    expect(html).toContain('class="two-column-icon mr10 hide-in-mobile"');
    expect(html).toContain('title="Two Column Mode"');
    expect(html).toContain('data-content="Splits list and body into columns respectively"');
    expect(html).toContain('id="two-column-mode"');
    expect(html).toContain('class="two-column-mode-text">Column View</span>');
    expect(html).toContain('class="show-subtasks-li"');
    expect(html).toContain('class="show-subtasks mr10"');
    expect(html).toContain('data-toggle="popover"');
    expect(html).toContain('data-trigger="hover"');
    expect(html).toContain('title="Show subtask"');
    expect(html).toContain('data-content="Show subtask always"');
    expect(html).toContain('id="toggle-show-subtasks"');
    expect(html).toContain('class="show-subtasks-text">Show subtask</span>');
    expect(html).toContain('class="filter-wrap board"');
    expect(html).toContain('class="ybtn small"');
    expect(html).toContain('class="yobicon-file-excel"');
    expect(html).toContain('data-list="draft-issues"');
    expect(html).toContain('class="post-list-wrap row-fluid"');
    expect(html).toContain('class="post-item title"');
    expect(html).toContain('id="issue-item-104"');
    expect(html).toContain('data-value="admin 4 Open issue"');
    expect(html).toContain('data-item="issue-item"');
    expect(html).toContain('class="mass-update-check hide-in-mobile"');
    expect(html).toContain('id="issue-104"');
    expect(html).toContain('data-issue-id="104"');
    expect(html).toContain('data-toggle="issue-checkbox"');
    expect(html).toContain('class="issue-item-row"');
    expect(html).toContain('class="title-wrap"');
    expect(html).toContain('class="draft-number"');
    expect(html).toContain("#Draft");
    expect(html).not.toContain("#issue.state.draft");
    expect(html).toContain("Draft issue");
    expect(html).toContain("Open issue");
    expect(html).toContain('class="infos-item item-count-groups"');
    expect(html).toContain('href="/yona/admin/projectYobi/issue/4#comments"');
    expect(html).toContain('href="/yona/admin/projectYobi/issue/4#vote"');
    expect(html).toContain('class="label issue-label list-label active white"');
    expect(html).toContain('class="child-issue-list hide"');
    expect(html).toContain('class="avatar-wrap assinee"');
    expect(html).toContain('class="page-navigation-wrap"');
    expect(html).toContain('id="pagination"');
    expect(html).toContain('<ul class="page-nums">');
    expect(html).toContain('name="pageNum"');
    expect(html).toContain('value="2"');
    expect(html).toContain(
      'href="/yona/admin/projectYobi/issues?state=open&amp;authorLoginId=nori&amp;assigneeLoginId=door&amp;milestoneId=7&amp;labelIds=5"',
    );
    expect(html).toContain(
      'href="/yona/admin/projectYobi/issues?state=open&amp;authorLoginId=nori&amp;assigneeLoginId=door&amp;milestoneId=7&amp;labelIds=5&amp;pageNum=3"',
    );
    expect(html).toContain(
      'href="/yona/admin/projectYobi/issues?state=open&amp;authorLoginId=nori&amp;assigneeLoginId=door&amp;milestoneId=7&amp;labelIds=5&amp;format=xls"',
    );
    expect(html).not.toContain("Yona Rust Project");
    expect(html).not.toContain("Author:");
    expect(html).not.toContain("issue.assignee:");
    expect(html).not.toContain("Comments:");
  });
});
