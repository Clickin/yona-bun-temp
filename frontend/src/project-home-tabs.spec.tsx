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
      id: 7,
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
  it("renders the legacy project layout header and menu shell", () => {
    const html = renderProjectHome("/yona/yona/projectYobi", {
      backgroundUrl: "/yona/assets/bg.png",
      cloneUrl: "https://example.com/yona/projectYobi.git",
      isFavorited: true,
      logoUrl: "/yona/assets/logo.png",
      projectScope: "private",
      showAdmin: true,
      viewerCanUpdate: true,
    });

    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('style="background-image:url(/yona/assets/bg.png)"');
    expect(html).toContain('class="project-header-inner"');
    expect(html).toContain('class="project-header-wrap"');
    expect(html).toContain('class="project-header-avatar"');
    expect(html).toContain('src="/yona/assets/logo.png"');
    expect(html).toContain('class="project-breadcrumb-wrap"');
    expect(html).toContain('class="project-author hide-in-mobile"');
    expect(html).toContain('href="/yona/yona"');
    expect(html).toContain('class="project-separator hide-in-mobile"');
    expect(html).toContain('class="project-name"');
    expect(html).toContain('class="user-project-list"');
    expect(html).toContain('class="starred star material-icons va-text-top"');
    expect(html).toContain('class="project-private"');
    expect(html).toContain('class="project-menu-outer"');
    expect(html).toContain('class="project-menu-inner"');
    expect(html).toContain('class="project-menu-nav project-menu-gruop"');
    expect(html).toContain('class="code-menu');
    expect(html).toContain('class="project-menu-count"');
    expect(html).toContain(
      'href="/yona/yona/projectYobi"><span class="menu-name">Project home</span>',
    );
    expect(html).toContain(
      'href="/yona/yona/projectYobi/code"><span class="menu-name">Code</span>',
    );
    expect(html).toContain(
      'class="title" href="/yona/yona/projectYobi/milestone/7">Phase dashboard</a>',
    );
    expect(html).not.toContain('title="Home"');
    expect(html).not.toContain('title="Code"');
    expect(html).not.toContain('title="Settings"');
    expect(html).toContain('class="project-setting"');
    expect(html).toContain('class="yobicon-cog"');
    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('class="project-home-header row-fluid"');
    expect(html).toContain('class="project-overview span9 span-hard-wrap"');
    expect(html).toContain('class="project-description"');
    expect(html).toContain('id="project-description"');
    expect(html).toContain('class="markdown-wrap"');
    expect(html).toContain('class="ybtn ybtn-minimum"');
    expect(html).toContain('data-toggle="description-edit"');
    expect(html).toContain('class="project-clone-wrap span3 hide-in-mobile"');
    expect(html).toContain('class="project-clone-url"');
    expect(html).toContain('id="cloneURL"');
    expect(html).toContain('class="ybtn project-clone-button"');
    expect(html).toContain('id="cloneURLBtn"');
    expect(html).toContain('class="span9 span-left-pane"');
    expect(html).toContain('class="nav nav-tabs"');
    expect(html).toContain('class="tab-content"');
    expect(html).toContain('class="tab-pane active"');
    expect(html).toContain('class="span3 span-right-pane"');
    expect(html).toContain('class="bubble-wrap gray project-home"');
  });

  it("renders project overview through Markdown like legacy project home", () => {
    const html = renderProjectHome("/yona/yona/projectYobi", {
      overview: "Project **home** ~~parity~~",
    });

    expect(html).toContain('<span class="markdown-wrap" id="project-description">');
    expect(html).toContain("<strong>home</strong>");
    expect(html).toContain("<del>parity</del>");
    expect(html).not.toContain("Project **home** ~~parity~~");
  });

  it("renders project enrollment as the legacy direct enroll anchor", () => {
    const enrollHtml = renderProjectHome("/yona/yona/projectYobi", {
      viewerCanEnroll: true,
    });
    expect(enrollHtml).toContain(
      'class="ybtn ybtn-info enrollBtn" href="/yona/yona/projectYobi/enroll" id="enrollBtn"',
    );
    expect(enrollHtml).toContain('class="yobicon-addfriend"');

    const cancelHtml = renderProjectHome("/yona/yona/projectYobi", {
      enrollmentRequested: true,
      viewerCanEnroll: true,
    });
    expect(cancelHtml).toContain(
      'class="ybtn enrollBtn" href="/yona/yona/projectYobi/cancel/enroll" id="enrollBtn"',
    );
    expect(cancelHtml).toContain('class="yobicon-removefriend"');
  });

  it("renders project watch as the legacy direct watch anchor", () => {
    const watchHtml = renderProjectHome("/yona/yona/projectYobi", {
      viewerCanWatch: true,
    });
    expect(watchHtml).toContain(
      'class="ybtn ybtn-watching watchBtn" href="/yona/yona/projectYobi/watch"',
    );
    expect(watchHtml).toContain('class="yobicon-eye"');

    const unwatchHtml = renderProjectHome("/yona/yona/projectYobi", {
      isWatching: true,
      viewerCanWatch: true,
    });
    expect(unwatchHtml).toContain(
      'class="ybtn ybtn-watching watchBtn" href="/yona/yona/projectYobi/unwatch"',
    );
    expect(unwatchHtml).toContain('class="yobicon-eye-off"');
  });

  it("renders project leave as the legacy direct leave button", () => {
    const html = renderProjectHome("/yona/yona/projectYobi", {
      members: [{ avatarUrl: "/avatar.png", loginId: "door", role: "member", userLabel: "Door" }],
      viewerCanLeave: true,
      viewerUserId: 42,
    });

    expect(html).toContain(
      'class="ybtn ybtn-minimum ybtn-danger pull-right" data-href="/yona/yona/projectYobi/member/42/delete" id="projectLeaveBtn"',
    );
    expect(html).not.toContain("project.member.leave</button>");
  });

  it("keeps project overview mentions plain like legacy Markdown.render(String)", () => {
    const html = renderProjectHome("/yona/yona/projectYobi", {
      overview: "Project **home** @admin @yona/projectYobi",
    });

    const overviewHtml = html.match(
      /<span class="markdown-wrap" id="project-description">[\s\S]*?<\/span>/,
    )?.[0];

    expect(overviewHtml).toBeDefined();
    expect(html).toContain("<strong>home</strong>");
    expect(overviewHtml).toContain("@admin");
    expect(overviewHtml).toContain("@yona/projectYobi");
    expect(overviewHtml).not.toContain('href="/yona/admin"');
    expect(overviewHtml).not.toContain('href="/yona/yona/projectYobi"');
    expect(overviewHtml).not.toContain("user-link");
    expect(overviewHtml).not.toContain("project-link");
  });

  it("keeps the legacy project overview placeholder plain when empty", () => {
    const html = renderProjectHome("/yona/yona/projectYobi", {
      overview: "",
    });

    expect(html).toContain(
      '<span class="markdown-wrap" id="project-description">Enter project description</span>',
    );
  });

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
    expect(html).toContain("New issue added.");
    expect(html).not.toContain("project.history.type.issue");
    expect(html).toContain('class="where"');
    expect(html).toContain('class="title"');
    expect(html).toContain("History issue");
    expect(html).toContain('class="date"');
    expect(html).toContain("2026-05-20");
    expect(html).not.toContain("Legacy placeholder panel");
    expect(html).not.toContain("No README post yet.");
  });

  it("renders the legacy empty README fallback and create action for updateable Git projects", () => {
    const html = renderProjectHome("/yona/yona/projectYobi", {
      readmeFile: undefined,
      vcs: "GIT",
      viewerCanUpdate: true,
    });

    expect(html).toContain('class="bubble-wrap gray readme"');
    expect(html).toContain('class="default"');
    expect(html).toContain("README.md will be shown here");
    expect(html).toContain('href="/yona/yona/projectYobi/postform?readme=true"');
    expect(html).toContain("create README");
    expect(html).not.toContain("project.svn.readme");
    expect(html).not.toContain("No README post yet.");
  });

  it("renders the legacy SVN empty README copy without a create action", () => {
    const html = renderProjectHome("/yona/yona/projectYobi", {
      readmeFile: undefined,
      vcs: "Subversion",
      viewerCanUpdate: true,
    });

    expect(html).toContain('class="bubble-wrap gray readme"');
    expect(html).toContain("README.md will be shown here");
    expect(html).not.toContain("create README");
    expect(html).not.toContain("No README post yet.");
  });

  it("uses metadata-backed mention links for DB-backed README postings", () => {
    const html = renderToString(
      <ProjectDetailPage
        detail={{
          ...projectHomeDetail,
          defaultTab: "readme",
        }}
        readmePost={{
          authorLabel: "Owner",
          authorLoginId: "owner",
          authorId: "1",
          attachments: [],
          bodyHtml: "",
          bodyMarkdown: "README @owner @yona/projectYobi @ghost @yona/missing",
          commentCount: 0,
          comments: [],
          createdLabel: "now",
          historyHtml: "",
          historyMarkdown: "",
          id: "1",
          issueReferences: [],
          isWatching: false,
          labels: [],
          mentionReferences: [
            {
              kind: "user",
              label: "owner",
              loginId: "owner",
              ownerName: "",
              projectName: "",
            },
            {
              kind: "project",
              label: "yona/projectYobi",
              loginId: "",
              ownerName: "yona",
              projectName: "projectYobi",
            },
          ],
          notice: false,
          ownerName: "yona",
          permissions: {
            canComment: false,
            canCreate: false,
            canDelete: false,
            canRead: true,
            canSetNotice: false,
            canWatch: false,
            canUpdate: false,
          },
          postNumber: "1",
          projectName: "projectYobi",
          readme: true,
          title: "README",
          updatedLabel: "now",
          watcherCount: 0,
        }}
        routeHref="/yona/yona/projectYobi"
        runtimeConfig={testRuntimeConfig}
      />,
    );

    expect(html).toContain('class="board-view project-readme-post"');
    expect(html).toContain('href="/yona/owner"');
    expect(html).toContain('href="/yona/yona/projectYobi"');
    expect(html).toContain("@ghost");
    expect(html).toContain("@yona/missing");
    expect(html).not.toContain('href="/yona/ghost"');
    expect(html).not.toContain('href="/yona/yona/missing"');
  });

  it("uses metadata-backed mention links for Git README fallback files", () => {
    const html = renderProjectHome("/yona/yona/projectYobi", {
      readmeFile: {
        bodyMarkdown: "README @owner @yona/projectYobi @ghost @yona/missing",
        mentionReferences: [
          {
            kind: "user",
            label: "owner",
            loginId: "owner",
            ownerName: "",
            projectName: "",
          },
          {
            kind: "project",
            label: "yona/projectYobi",
            loginId: "",
            ownerName: "yona",
            projectName: "projectYobi",
          },
        ],
        name: "README.md",
      },
    });

    expect(html).toContain('class="readme-wrap project-git-readme"');
    expect(html).toContain('href="/yona/owner"');
    expect(html).toContain('href="/yona/yona/projectYobi"');
    expect(html).toContain("@ghost");
    expect(html).toContain("@yona/missing");
    expect(html).not.toContain('href="/yona/ghost"');
    expect(html).not.toContain('href="/yona/yona/missing"');
  });

  it("uses tabId=dashboard to render the legacy dashboard composition shell", () => {
    const html = renderProjectHome("/yona/yona/projectYobi?tabId=dashboard");
    const noMilestoneHtml = renderProjectHome("/yona/yona/projectYobi?tabId=dashboard", {
      currentMilestone: undefined,
    });

    expect(html).toContain('class="content-container nm"');
    expect(html).toContain('class="project-overview-home row-fluid"');
    expect(html).toContain('class="overview-assignee"');
    expect(html).toContain('class="overview-milestone"');
    expect(html).toContain('class="overview-pullrequest"');
    expect(html).toContain("Open issues: by assignee");
    expect(html).toContain("Project home parity");
    expect(html).not.toContain("Legacy placeholder panel");
    expect(html).not.toContain("No README post yet.");
    expect(noMilestoneHtml).toContain("No milestone");
    expect(noMilestoneHtml).not.toContain("milestone.none");
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
    const emptyLabelHtml = renderProjectHome("/yona/yona/projectYobi?tabId=dashboard", {
      dashboard: { labels: [] },
    });

    expect(html).toContain('class="issue-label list-label active"');
    expect(html).toContain("overview-label");
    expect(html).toContain('data-label-id="7"');
    expect(html).toContain('href="/yona/yona/projectYobi/issues?state=open&amp;labelIds=7"');
    expect(html).toContain("Guide");
    expect(html).toContain("<strong>3</strong>");
    expect(html).not.toContain("label.none");
    expect(emptyLabelHtml).toContain("Open issues: by label");
    expect(emptyLabelHtml).not.toContain("label.none");
    expect(emptyLabelHtml).not.toContain('class="issue-label list-label active"');
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
    expect(html).toContain("No assignee");
    expect(html).toContain("<strong>2</strong>");
    expect(html).toContain("<strong>1</strong>");
    expect(html).toContain('title="67%"');
    expect(html).toContain('title="33%"');
  });
});

const projectHomeDetail: ProjectDetailViewModel = {
  boardCount: 2,
  currentMilestone: {
    closedIssueCount: 1,
    completionPercent: 25,
    dueDateLabel: "Due 2026-06-30",
    id: 7,
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
};
