import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectSettingsPage } from "./routes/-project-views";

describe("project settings parity", () => {
  it("renders the legacy project setting form shell and controls", () => {
    const html = renderToStaticMarkup(
      <ProjectSettingsPage
        detail={{
          boardCount: 0,
          codeMemberOnly: true,
          enrollmentRequested: false,
          isFavorited: false,
          organizationName: "",
          overview: "Overview",
          ownerName: "admin",
          projectName: "projectYobi",
          projectScope: "protected",
          defaultReviewerCount: 2,
          isUsingReviewerCount: true,
          maxReviewerCount: 3,
          showBoard: false,
          showCode: true,
          showIssue: false,
          showMilestone: true,
          showPullRequest: true,
          showReview: false,
          viewerCanEnroll: false,
          viewerCanUpdate: true,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );

    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('id="saveSetting"');
    expect(html).toContain('class="bubble-wrap gray"');
    expect(html).toContain('class="box-wrap top clearfix frm-wrap"');
    expect(html).toContain('class="setting-box left"');
    expect(html).toContain('class="setting-box right"');
    expect(html).toContain('id="project-name"');
    expect(html).toContain('name="name"');
    expect(html).toContain('id="project-desc"');
    expect(html).toContain('name="overview"');
    expect(html).toContain('id="protected"');
    expect(html).toContain('checked="" value="PROTECTED"');
    expect(html).not.toContain('<select name="projectScope">');
    expect(html).toContain('id="codeAccessibleMemberOnly"');
    expect(html).toContain('checked="" value="true"');
    expect(html).toContain('id="reviewerCountSettingPanel"');
    expect(html).toContain('id="menuSettingCode"');
    expect(html).toContain('id="menuSettingPullRequest"');
    expect(html).toContain('id="save"');
  });
});
