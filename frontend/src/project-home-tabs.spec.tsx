import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { testRuntimeConfig } from "./auth-workspace-shell.test-helpers";
import { ProjectDetailPage } from "./routes/-project-views";
import type { ProjectDetailViewModel } from "./routes/-view-models";

function renderProjectHome(routeHref: string, overrides: Partial<ProjectDetailViewModel> = {}) {
  const detail: ProjectDetailViewModel = {
    boardCount: 2,
    currentMilestone: {
      closedIssueCount: 1,
      completionPercent: 25,
      dueDateLabel: "Due 2026-06-30",
      openIssueCount: 3,
      title: "Phase dashboard",
    },
    defaultTab: "readme",
    enrollmentRequested: false,
    isFavorited: false,
    openIssueCount: 4,
    openPullRequestCount: 2,
    organizationName: "",
    overview: "Project home parity",
    ownerName: "yona",
    projectName: "projectYobi",
    projectScope: "public",
    reviewCount: 1,
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    viewerCanEnroll: false,
    viewerCanUpdate: false,
    ...overrides,
  };

  return renderToString(
    <ProjectDetailPage detail={detail} routeHref={routeHref} runtimeConfig={testRuntimeConfig} />,
  );
}

describe("project home tab parity", () => {
  it("uses tabId=history to render the legacy history stream shell", () => {
    const html = renderProjectHome("/yona/yona/projectYobi?tabId=history");

    expect(html).toContain('class="content-container nm"');
    expect(html).toContain('class="main-stream"');
    expect(html).toContain('class="activity-streams unstyled"');
    expect(html).not.toContain("Legacy placeholder panel");
    expect(html).not.toContain("No README post yet.");
  });

  it("uses tabId=dashboard to render the legacy dashboard composition shell", () => {
    const html = renderProjectHome("/yona/yona/projectYobi?tabId=dashboard");

    expect(html).toContain('class="content-container nm"');
    expect(html).toContain('class="project-overview-home row-fluid"');
    expect(html).toContain('class="overview-assignee"');
    expect(html).toContain('class="overview-milestone"');
    expect(html).toContain('class="overview-pullrequest"');
    expect(html).toContain("overview-label");
    expect(html).toContain("project.dashboard.openIssuesByAssignee");
    expect(html).toContain("Project home parity");
    expect(html).not.toContain("Legacy placeholder panel");
    expect(html).not.toContain("No README post yet.");
  });
});
