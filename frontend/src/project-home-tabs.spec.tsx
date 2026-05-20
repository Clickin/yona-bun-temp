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
    const html = renderProjectHome("/yona/yona/projectYobi?tabId=history", {
      history: {
        items: [
          {
            actorAvatarUrl: "/yona/assets/admin.png",
            actorName: "Admin User",
            actorUrl: "/yona/admin",
            createdLabel: "2026-05-20",
            itemType: "issue",
            shortTitle: "#1",
            title: "History issue",
            url: "/yona/yona/projectYobi/issue/1",
          },
        ],
      },
    });

    expect(html).toContain('class="content-container nm"');
    expect(html).toContain('class="main-stream"');
    expect(html).toContain('class="activity-streams unstyled"');
    expect(html).toContain('class="activity-stream"');
    expect(html).toContain('class="avatar-wrap pull-left mr10"');
    expect(html).toContain('src="/yona/assets/admin.png"');
    expect(html).toContain('class="actor"');
    expect(html).toContain('href="/yona/admin"');
    expect(html).toContain("Admin User");
    expect(html).toContain("project.history.type.issue");
    expect(html).toContain('class="where"');
    expect(html).toContain('class="title"');
    expect(html).toContain("History issue");
    expect(html).toContain('class="date"');
    expect(html).toContain("2026-05-20");
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

  it("renders project dashboard label rows from container data", () => {
    const html = renderProjectHome("/yona/yona/projectYobi?tabId=dashboard", {
      dashboard: {
        labels: [
          {
            categoryName: "Type",
            color: "#00aa55",
            id: 7,
            name: "Guide",
            openIssueCount: 3,
          },
        ],
      },
    });

    expect(html).toContain('class="issue-label list-label active"');
    expect(html).toContain('data-label-id="7"');
    expect(html).toContain('href="/yona/yona/projectYobi/issues?state=open&amp;labelIds=7"');
    expect(html).toContain("Guide");
    expect(html).toContain("<strong>3</strong>");
    expect(html).not.toContain("label.none");
  });

  it("renders project dashboard assignee rows from container data", () => {
    const html = renderProjectHome("/yona/yona/projectYobi?tabId=dashboard", {
      dashboard: {
        assignees: [
          {
            avatarUrl: "/yona/assets/avatar.png",
            loginId: "assigned",
            openIssueCount: 2,
            userId: 11,
            userLabel: "Assigned User",
          },
        ],
        labels: [],
        unassignedOpenIssueCount: 1,
      },
      openIssueCount: 3,
    });

    expect(html).toContain('class="avatar-wrap smaller"');
    expect(html).toContain('src="/yona/assets/avatar.png"');
    expect(html).toContain('class="loginid"');
    expect(html).toContain("<strong>@</strong>assigned");
    expect(html).toContain(
      'href="/yona/yona/projectYobi/issues?state=open&amp;assigneeLoginId=assigned"',
    );
    expect(html).toContain('href="/yona/yona/projectYobi/issues?state=open&amp;assigneeId=0"');
    expect(html).toContain("Assigned User");
    expect(html).toContain("issue.noAssignee");
    expect(html).toContain("<strong>2</strong>");
    expect(html).toContain("<strong>1</strong>");
    expect(html).toContain('title="67%"');
    expect(html).toContain('title="33%"');
  });
});
