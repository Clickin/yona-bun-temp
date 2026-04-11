import { describe, expect, it } from "vitest";
import {
  renderOrganizationDetail,
  renderOrganizationSettings,
  renderProjectDetail,
  renderProjectSettings,
} from "./auth-workspace-shell.test-helpers";

describe("wave 2A container parity", () => {
  it("renders the organization home hero, project filter, gated CTA, roster bubbles, and settings entry", () => {
    const html = renderOrganizationDetail({
      adminMembers: [
        { avatarUrl: "/avatars/admin.png", loginId: "admin", role: "org_admin", userLabel: "Admin" },
      ],
      description: "Web labs",
      memberMembers: [
        { avatarUrl: "/avatars/member.png", loginId: "member", role: "org_member", userLabel: "Member" },
      ],
      organizationName: "weblabs",
      viewerCanCreateProject: true,
      viewerCanUpdate: true,
      visibleProjects: [
        {
          createdLabel: "2026-04-01",
          isWatching: true,
          lastPushedLabel: "2026-04-10",
          logoUrl: "/logos/projectYobi.png",
          memberCount: 4,
          originOwnerName: "naver",
          originProjectName: "legacyYobi",
          overview: "Wave 2A parity home",
          ownerName: "weblabs",
          projectName: "projectYobi",
          projectScope: "public",
          watchCount: 3,
        },
      ],
    } as never);

    expect(html).toContain("Web labs");
    expect(html).toContain('id="mylist-filter"');
    expect(html).toContain(">Create project<");
    expect(html).toContain("projectYobi");
    expect(html).toContain("Wave 2A parity home");
    expect(html).toContain("Members: 4");
    expect(html).toContain("Watchers: 3");
    expect(html).toContain("Original: naver / legacyYobi");
    expect(html).toContain("Group Manager");
    expect(html).toContain("Group Member");
    expect(html).toContain('href="/yona/organizations/weblabs/settingform"');
  });

  it("keeps organization home roster and admin controls hidden for unauthorized viewers", () => {
    const html = renderOrganizationDetail({
      adminMembers: [],
      description: "Web labs",
      memberMembers: [],
      organizationName: "weblabs",
      viewerCanCreateProject: false,
      viewerCanUpdate: false,
      visibleProjects: [],
    } as never);

    expect(html).not.toContain(">Create project<");
    expect(html).not.toContain("Group Manager");
    expect(html).not.toContain("Group Member");
    expect(html).not.toContain("/settingform");
  });

  it("renders the project home header, watch shell, menu counts, tab chrome, and right-pane summaries", () => {
    const html = renderProjectDetail({
      backgroundUrl: "/backgrounds/projectYobi.png",
      boardCount: 7,
      cloneUrl: "https://git.example.com/weblabs/projectYobi.git",
      codeMemberOnly: false,
      currentMilestone: {
        closedIssueCount: 2,
        completionPercent: 67,
        dueDateLabel: "Due 2026-04-30",
        openIssueCount: 4,
        title: "Wave 2A",
      },
      defaultTab: "readme",
      enrollmentRequested: false,
      isFavorited: true,
      isForked: true,
      isWatching: true,
      logoUrl: "/logos/projectYobi.png",
      memberCount: 4,
      members: [
        { avatarUrl: "/avatars/admin.png", loginId: "admin", role: "manager", userLabel: "Admin" },
      ],
      openIssueCount: 12,
      openPullRequestCount: 5,
      organizationName: "weblabs",
      originOwnerName: "naver",
      originProjectName: "legacyYobi",
      overview: "Wave 2A parity home",
      overviewEditable: true,
      ownerName: "weblabs",
      projectName: "projectYobi",
      projectScope: "public",
      reviewCount: 3,
      showAdmin: true,
      showBoard: true,
      showCode: true,
      showIssue: true,
      showMilestone: true,
      showPullRequest: true,
      showReview: true,
      viewerCanEnroll: true,
      viewerCanUpdate: true,
      viewerCanWatch: true,
      watchCount: 8,
    } as never);

    expect(html).toContain("weblabs / projectYobi");
    expect(html).toContain("Original project: naver / legacyYobi");
    expect(html).toContain("Watchers");
    expect(html).toContain("Unwatch project");
    expect(html).toContain("Clone URL");
    expect(html).toContain("Wave 2A parity home");
    expect(html).toContain("Edit overview");
    expect(html).toContain(">README<");
    expect(html).toContain(">Recent history<");
    expect(html).toContain(">Dashboard<");
    expect(html).toContain("Issues 12");
    expect(html).toContain("Pull requests 5");
    expect(html).toContain("Reviews 3");
    expect(html).toContain("Boards 7");
    expect(html).toContain("Current milestone");
    expect(html).toContain("Wave 2A");
    expect(html).toContain("Members");
    expect(html).toContain('href="/yona/weblabs/projectYobi/settingform"');
  });

  it("renders the organization and project settings shells from the container state", () => {
    const organizationSettingsHtml = renderOrganizationSettings({
      description: "Web labs",
      organizationName: "weblabs",
      viewerCanCreateProject: true,
      viewerCanUpdate: true,
    } as never);
    expect(organizationSettingsHtml).toContain("Group Setting");
    expect(organizationSettingsHtml).toContain(">Group Home<");
    expect(organizationSettingsHtml).toContain(">Issue<");
    expect(organizationSettingsHtml).toContain(">Board<");
    expect(organizationSettingsHtml).toContain(">Pull request<");

    const projectSettingsHtml = renderProjectSettings({
      codeMemberOnly: true,
      overview: "Wave 2A parity home",
      ownerName: "weblabs",
      projectName: "projectYobi",
      projectScope: "public",
      showBoard: true,
      showCode: true,
      showIssue: true,
      showMilestone: true,
      showPullRequest: true,
      showReview: true,
      viewerCanUpdate: true,
    } as never);
    expect(projectSettingsHtml).toContain("Project settings");
    expect(projectSettingsHtml).toContain("Menu settings");
    expect(projectSettingsHtml).toContain("Code access is members only");
    expect(projectSettingsHtml).toContain("Issues");
    expect(projectSettingsHtml).toContain("Pull requests");
    expect(projectSettingsHtml).toContain("Reviews");
    expect(projectSettingsHtml).toContain("Milestones");
    expect(projectSettingsHtml).toContain("Boards");
  });
});
