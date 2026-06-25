import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectReviewsPage } from "./routes/-pull-request-views";

describe("project review list export", () => {
  it("preserves the legacy format=xls download action with current review filters", () => {
    const html = renderToStaticMarkup(
      <ProjectReviewsPage
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
        query={{
          authorId: 5,
          filter: "src/lib.rs",
          orderBy: "updatedDate",
          orderDir: "asc",
          pageNum: 3,
          participantId: 7,
          state: "closed",
        }}
        reviews={{
          allCount: 3,
          authorCount: 1,
          closedCount: 1,
          items: [],
          openCount: 2,
          pageNum: 3,
          pageSize: 15,
          participantCount: 2,
          state: "closed",
          totalCount: 1,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
        viewerId={7}
      />,
    );

    expect(html).toContain('class="ybtn small"');
    expect(html).toContain('class="yobicon-file-excel"');
    expect(html).toContain("Download as Excel file");
    expect(html).toContain(
      'href="/yona/admin/projectYobi/reviews?state=closed&amp;filter=src%2Flib.rs&amp;authorId=5&amp;participantId=7&amp;orderBy=updatedDate&amp;orderDir=asc&amp;format=xls"',
    );
  });
});
