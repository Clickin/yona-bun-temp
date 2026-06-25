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
    expect(html).toContain(">Create new project<");
    expect(html).toContain("projectYobi");
    expect(html).toContain("Wave 2A parity home");
    expect(html).toContain('class="yobicon-friends yobicon-middle"');
    expect(html).toContain("<strong>4</strong>");
    expect(html).toContain('class="yobicon-eye"');
    expect(html).toContain("<strong>3</strong>");
    expect(html).not.toContain("project.onmember 4");
    expect(html).not.toContain("project.onwatching 3");
    expect(html).toContain("naver<!-- --> / <!-- -->legacyYobi");
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

    expect(html).not.toContain(">Create new project<");
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
    expect(html).toContain("This project&#x27;s watcher list.");
    expect(html).toContain("Unwatch");
    expect(html).not.toContain("Unwatch project");
    expect(html).toContain('aria-label="Copy URL"');
    expect(html).toContain('title="Copy URL"');
    expect(html).not.toContain("Clone URL");
    expect(html).toContain("Wave 2A parity home");
    expect(html).toContain('aria-label="Edit"');
    expect(html).toContain('title="Edit"');
    expect(html).not.toContain("Edit overview");
    expect(html).toContain("Dashboard");
    expect(html).toContain(">README<");
    expect(html).toContain(">History<");
    expect(html).not.toContain(">project.history.recent<");
    expect(html).not.toContain(">project.dashboard<");
    expect(html).toContain('href="#helpKeys"');
    expect(html).toContain('class="modal hide fade keymap-help"');
    expect(html).toContain(">Keyboard shortcuts</a>");
    expect(html).toContain("<h5>projects</h5>");
    expect(html).toContain('<span class="help-inline">Home</span>');
    expect(html).toContain('<span class="help-inline">Board</span>');
    expect(html).toContain('<span class="help-inline">Issue</span>');
    expect(html).toContain('<span class="help-inline">Code</span>');
    expect(html).toContain('<span class="help-inline">Pull request</span>');
    expect(html).toContain('<span class="help-inline">Settings</span>');
    expect(html).toContain('<span class="help-inline">Site search</span>');
    expect(html).toContain('<span class="help-inline">Submit form</span>');
    expect(html).toContain('<span class="menu-name">Issue</span>');
    expect(html).toContain('<span class="project-menu-count">12</span>');
    expect(html).toContain('<span class="menu-name">Pull request</span>');
    expect(html).toContain('<span class="project-menu-count">5</span>');
    expect(html).toContain('<span class="menu-name">Review</span>');
    expect(html).toContain('<span class="project-menu-count">3</span>');
    expect(html).toContain('<span class="menu-name">Board</span>');
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
    expect(html).toContain("Due Date");
    expect(html).toContain("2 / 6");
    expect(html).not.toContain("Current milestone");
    expect(html).not.toContain("Open issues:");
    expect(html).not.toContain("Closed issues:");
    expect(html).not.toContain("Progress:");
    expect(html).toContain("Wave 2A");
    expect(html).toContain("Project members");
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
    expect(organizationNewHtml).not.toContain('action="/yona/organizations/new"');
    expect(organizationNewHtml).toContain('name="new-org"');
    expect(organizationNewHtml).toContain(">New Group<");
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
    expect(organizationSettingsHtml).toContain(">Group Home</a>");
    expect(organizationSettingsHtml).toContain(">Issue</a>");
    expect(organizationSettingsHtml).toContain(">Board</a>");
    expect(organizationSettingsHtml).toContain(">Pull request</a>");
    expect(organizationSettingsHtml).toContain('class="project-setting"');
    expect(organizationSettingsHtml).toContain('class="yobicon-cog"');
    expect(organizationSettingsHtml).toContain(
      '<li class="active"><a href="/yona/organizations/weblabs/settingform"><i class="yobicon-cog"></i>',
    );
    expect(organizationSettingsHtml).toContain('<span class="blind">Project configuration</span>');
    expect(organizationSettingsHtml).not.toContain(">title.organizationHome<");
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
    expect(projectSettingsHtml).toContain(
      '<li class="active"><a href="/yona/weblabs/projectYobi/settingform"><i class="yobicon-cog"></i>',
    );
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
