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
          items: [],
          ownerName: "admin",
          pageNum: 2,
          pageSize: 15,
          projectName: "projectYobi",
          totalCount: 0,
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
          labelIds: [5],
          milestoneId: 7,
          pageNum: 2,
          state: "open",
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );

    expect(html).toContain('action="/yona/admin/projectYobi/issues"');
    expect(html).toContain('name="state"');
    expect(html).toContain('<option value="open" selected="">Open</option>');
    expect(html).toContain('name="authorLoginId"');
    expect(html).toContain('value="nori"');
    expect(html).toContain('name="assigneeLoginId"');
    expect(html).toContain('value="door"');
    expect(html).toContain('name="milestoneId"');
    expect(html).toContain('<option value="7" selected="">v1.0</option>');
    expect(html).toContain('name="labelIds"');
    expect(html).toContain('<option value="5" selected="">Type: bug</option>');
  });
});
