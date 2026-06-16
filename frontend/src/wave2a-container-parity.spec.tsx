import { describe, expect, it } from "vitest";
import {
  renderOrganizationDetail,
  renderOrganizationNew,
  renderOrganizationSettings,
  renderProjectDetail,
  renderProjectSettings,
} from "./auth-workspace-shell.test-helpers";

describe("wave 2A container parity", () => {
  it("renders the organization home hero, project filter, gated CTA, roster bubbles, and settings entry", () => {
    const html = renderOrganizationDetail({
      adminMembers: [
        {
          avatarUrl: "/avatars/admin.png",
          loginId: "admin",
          role: "org_admin",
          userLabel: "Admin",
        },
      ],
      description: "Web labs",
      memberMembers: [
        {
          avatarUrl: "/avatars/member.png",
          loginId: "member",
          role: "org_member",
          userLabel: "Member",
        },
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
    expect(html).toContain(">button.newProject<");
    expect(html).toContain("projectYobi");
    expect(html).toContain("Wave 2A parity home");
    expect(html).toContain('class="yobicon-friends yobicon-middle"');
    expect(html).toContain("<strong>4</strong>");
    expect(html).toContain('class="yobicon-eye"');
    expect(html).toContain("<strong>3</strong>");
    expect(html).not.toContain("project.onmember 4");
    expect(html).not.toContain("project.onwatching 3");
    expect(html).toContain("naver<!-- --> / <!-- -->legacyYobi");
    expect(html).toContain("user.role.org_admin");
    expect(html).toContain("user.role.org_member");
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

    expect(html).not.toContain(">button.newProject<");
    expect(html).not.toContain("user.role.org_admin");
    expect(html).not.toContain("user.role.org_member");
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
        id: 9,
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
    expect(html).toContain("project.watcher.title");
    expect(html).toContain("project.unwatch");
    expect(html).not.toContain("Unwatch project");
    expect(html).toContain('aria-label="code.copyUrl"');
    expect(html).toContain('title="code.copyUrl"');
    expect(html).not.toContain("Clone URL");
    expect(html).toContain("Wave 2A parity home");
    expect(html).toContain('aria-label="button.edit"');
    expect(html).toContain('title="button.edit"');
    expect(html).not.toContain("Edit overview");
    expect(html).toContain("project.dashboard");
    expect(html).toContain(">README<");
    expect(html).toContain(">project.history.recent<");
    expect(html).not.toContain(">Recent history<");
    expect(html).not.toContain(">Dashboard<");
    expect(html).toContain('<span class="menu-name">menu.issue</span>');
    expect(html).toContain('<span class="project-menu-count">12</span>');
    expect(html).toContain('<span class="menu-name">menu.pullRequest</span>');
    expect(html).toContain('<span class="project-menu-count">5</span>');
    expect(html).toContain('<span class="menu-name">menu.review</span>');
    expect(html).toContain('<span class="project-menu-count">3</span>');
    expect(html).toContain('<span class="menu-name">menu.board</span>');
    expect(html).toContain('<span class="project-menu-count">7</span>');
    expect(html).not.toContain('title="Issues 12"');
    expect(html).not.toContain('title="Pull requests 5"');
    expect(html).not.toContain('title="Reviews 3"');
    expect(html).not.toContain('title="Boards 7"');
    expect(html).toContain('class="milestone-info"');
    expect(html).toContain(
      'class="title" href="/yona/weblabs/projectYobi/milestone/9">Wave 2A</a>',
    );
    expect(html).toContain('class="progress progress-success nm"');
    expect(html).toContain("label.dueDate");
    expect(html).toContain("2 / 6");
    expect(html).not.toContain("Current milestone");
    expect(html).not.toContain("Open issues:");
    expect(html).not.toContain("Closed issues:");
    expect(html).not.toContain("Progress:");
    expect(html).toContain("Wave 2A");
    expect(html).toContain("project.members");
    expect(html).toContain('href="/yona/weblabs/projectYobi/settingform"');
  });

  it("renders a Git README fallback with the legacy readme body wrapper", () => {
    const html = renderProjectDetail({
      defaultTab: "readme",
      enrollmentRequested: false,
      isFavorited: false,
      ownerName: "weblabs",
      overview: "",
      projectName: "projectYobi",
      projectScope: "public",
      readmeFile: {
        bodyHtml: "",
        bodyMarkdown:
          "# Git README\n\n![logo](/yona/weblabs/projectYobi/files/main/assets/logo.png)\n\n[Guide](/yona/weblabs/projectYobi/code/main/docs/guide.md)",
        name: "README.md",
      },
      viewerCanEnroll: false,
      viewerCanUpdate: false,
    } as never);

    expect(html).toContain("README.md");
    expect(html).toContain('class="readme-body markdown-wrap"');
    expect(html).toContain(
      '<h1 id="git-readme">Git README<a class="head-anchor" href="#git-readme">#</a></h1>',
    );
    expect(html).toContain('src="/yona/weblabs/projectYobi/files/main/assets/logo.png"');
    expect(html).toContain('href="/yona/weblabs/projectYobi/code/main/docs/guide.md"');
    expect(html).not.toContain("No README post yet.");
  });

  it("renders the organization create, settings, and project settings shells from the container state", () => {
    const organizationNewHtml = renderOrganizationNew();
    expect(organizationNewHtml).toContain('class="form-wrap new-project"');
    expect(organizationNewHtml).toContain('name="new-org"');
    expect(organizationNewHtml).toContain(">title.newOrganization<");
    expect(organizationNewHtml).toContain('id="name"');
    expect(organizationNewHtml).toContain('name="name"');
    expect(organizationNewHtml).toContain('id="descr"');
    expect(organizationNewHtml).toContain('name="descr"');

    const organizationSettingsHtml = renderOrganizationSettings({
      description: "Web labs",
      organizationName: "weblabs",
      viewerCanCreateProject: true,
      viewerCanUpdate: true,
    } as never);
    expect(organizationSettingsHtml).toContain('id="saveSetting"');
    expect(organizationSettingsHtml).toContain('name="update-org"');
    expect(organizationSettingsHtml).toContain('class="project-header-outer"');
    expect(organizationSettingsHtml).toContain('class="project-header-inner"');
    expect(organizationSettingsHtml).toContain('class="group-title-head">group</span>');
    expect(organizationSettingsHtml).toContain('<a href="/yona/organizations/weblabs">weblabs</a>');
    expect(organizationSettingsHtml).toContain('class="bubble-wrap gray"');
    expect(organizationSettingsHtml).toContain('class="setting-box left"');
    expect(organizationSettingsHtml).toContain('id="logoPath"');
    expect(organizationSettingsHtml).toContain('id="project-name"');
    expect(organizationSettingsHtml).toContain('name="name"');
    expect(organizationSettingsHtml).toContain('id="project-desc"');
    expect(organizationSettingsHtml).toContain('name="descr"');
    expect(organizationSettingsHtml).toContain('id="save"');
    expect(organizationSettingsHtml).toContain('class="project-menu-nav project-menu-gruop"');
    expect(organizationSettingsHtml).toContain(">title.organizationHome</a>");
    expect(organizationSettingsHtml).toContain(">menu.issue</a>");
    expect(organizationSettingsHtml).toContain(">menu.board</a>");
    expect(organizationSettingsHtml).toContain(">menu.pullRequest</a>");
    expect(organizationSettingsHtml).toContain('class="project-setting"');
    expect(organizationSettingsHtml).toContain('class="yobicon-cog"');
    expect(organizationSettingsHtml).toContain('<span class="blind">menu.admin</span>');
    expect(organizationSettingsHtml).not.toContain(">Group Home<");
    expect(organizationSettingsHtml).not.toContain(">Settings<");

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
    expect(projectSettingsHtml).toContain('id="saveSetting"');
    expect(projectSettingsHtml).toContain('class="bubble-wrap gray"');
    expect(projectSettingsHtml).toContain('class="box-wrap top clearfix frm-wrap"');
    expect(projectSettingsHtml).toContain('class="setting-box left"');
    expect(projectSettingsHtml).toContain('class="setting-box right"');
    expect(projectSettingsHtml).toContain('id="project-name"');
    expect(projectSettingsHtml).toContain('id="project-desc"');
    expect(projectSettingsHtml).toContain('id="codeAccessibleMemberOnly"');
    expect(projectSettingsHtml).toContain('id="menuSettingIssue"');
    expect(projectSettingsHtml).toContain('id="menuSettingPullRequest"');
    expect(projectSettingsHtml).toContain('id="menuSettingReview"');
    expect(projectSettingsHtml).toContain('id="menuSettingMilestone"');
    expect(projectSettingsHtml).toContain('id="menuSettingBoard"');
    expect(projectSettingsHtml).toContain('id="save"');
  });
});
