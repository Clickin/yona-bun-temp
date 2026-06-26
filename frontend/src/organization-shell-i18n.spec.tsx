import * as React from "react";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime } from "./i18n";
import { testRuntimeConfig } from "./auth-workspace-shell.test-helpers";
import { OrganizationBoardListPage } from "./routes/-board-views";
import {
  OrganizationDeletePage,
  OrganizationDetailPage,
  OrganizationIssueListPage,
  OrganizationMembersPage,
  OrganizationSettingsPage,
  shouldReuseLegacyMemberTypeaheadCache,
} from "./routes/-organization-views";
import { OrganizationPullRequestListPage } from "./routes/-pull-request-views";
import type { OrganizationDetailViewModel } from "./routes/-view-models";

type LegacyMessageLookup = ReturnType<typeof createLegacyI18nRuntime>["t"];

const organizationDetail: OrganizationDetailViewModel = {
  adminMembers: [],
  description: "Organization overview",
  enrollmentRequested: false,
  memberMembers: [],
  organizationName: "yona-org",
  viewerCanCreateProject: true,
  viewerCanEnroll: true,
  viewerCanLeave: false,
  viewerCanUpdate: true,
  visibleProjects: [],
};

function renderOrganizationHome(messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    <OrganizationDetailPage
      detail={organizationDetail}
      messages={messages}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

function renderOrganizationSettings(messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    <OrganizationSettingsPage
      detail={organizationDetail}
      messages={messages}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

function renderOrganizationIssues(messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    <OrganizationIssueListPage
      currentUserId={7}
      detail={organizationDetail}
      issueList={{
        closedIssueCount: 1,
        items: [
          {
            assigneeAvatarUrl: "/avatars/assignee.png",
            assigneeLabel: "Assignee",
            assigneeLoginId: "assignee",
            authorLabel: "",
            commentCount: 0,
            id: 101,
            issueNumber: 3,
            labels: [],
            milestoneTitle: "",
            ownerName: "yona-org",
            projectName: "web",
            state: "open",
            title: "Legacy issue",
            updatedLabel: "2026-06-21",
            voterCount: 0,
            watcherCount: 0,
          },
          {
            assigneeLabel: "",
            authorAvatarUrl: "/avatars/author.png",
            authorLabel: "Author",
            authorLoginId: "author",
            commentCount: 2,
            id: 102,
            issueNumber: 4,
            labels: [],
            milestoneTitle: "",
            ownerName: "yona-org",
            projectName: "web",
            state: "open",
            title: "Second issue",
            updatedLabel: "2026-06-21",
            voterCount: 1,
            watcherCount: 0,
          },
        ],
        openIssueCount: 2,
        organizationName: "yona-org",
        pageNum: 1,
        pageSize: 20,
        totalCount: 2,
        visibleProjects: [{ ownerName: "yona-org", projectName: "web" }],
      }}
      messages={messages}
      query={{
        assigneeId: 0,
        authorId: 0,
        filter: "",
        mentionId: 0,
        orderBy: "updatedDate",
        orderDir: "desc",
        pageNum: 1,
        projectNames: [],
        state: "open",
      }}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

function renderEmptyOrganizationIssues(messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    <OrganizationIssueListPage
      currentUserId={7}
      detail={organizationDetail}
      issueList={{
        closedIssueCount: 0,
        items: [],
        openIssueCount: 0,
        organizationName: "yona-org",
        pageNum: 1,
        pageSize: 20,
        totalCount: 0,
        visibleProjects: [],
      }}
      messages={messages}
      query={{
        assigneeId: 0,
        authorId: 0,
        filter: "",
        mentionId: 0,
        orderBy: "updatedDate",
        orderDir: "desc",
        pageNum: 1,
        projectNames: [],
        state: "open",
      }}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

function renderOrganizationMembers(messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    <OrganizationMembersPage
      detail={{
        deleteAllowed: true,
        enrollmentRequests: [],
        members: [
          {
            avatarUrl: "/avatars/admin.png",
            loginId: "admin",
            role: "org_admin",
            userId: "7",
            userLabel: "Admin",
          },
        ],
        organizationName: "yona-org",
        roleOptions: [
          { label: "Group Manager", role: "org_admin" },
          { label: "Group Member", role: "org_member" },
        ],
        viewerCanUpdate: true,
      }}
      messages={messages}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

describe("organization shell legacy i18n opt-in", () => {
  it("lets the organization layout route own settings chrome without changing the inner body", () => {
    const html = renderToStaticMarkup(
      <OrganizationSettingsPage
        detail={organizationDetail}
        renderShell={false}
        runtimeConfig={testRuntimeConfig}
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/route.tsx"),
      "utf8",
    );
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/settingform/route.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain("appPath === `/organizations/${organizationName}/settingform`");
    expect(layoutSource).toContain('active: "settings"');
    expect(layoutSource).toContain('shellClassName: "organization-settings-shell"');
    expect(routeSource).toContain("renderShell={false}");
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('id="saveSetting"');
    expect(html).toContain('id="logoPath"');
    expect(html).not.toContain("app-shell organization-settings-shell");
    expect(html).not.toContain("project-header-outer");
    expect(html).not.toContain("project-menu-outer");
    expect(html).not.toContain("page-wrap-outer");
  });

  it("lets the organization layout route own members chrome without changing the inner body", () => {
    const html = renderToStaticMarkup(
      <OrganizationMembersPage
        detail={{
          deleteAllowed: true,
          enrollmentRequests: [],
          members: [],
          organizationName: "yona-org",
          roleOptions: [],
          viewerCanUpdate: true,
        }}
        renderShell={false}
        runtimeConfig={testRuntimeConfig}
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/route.tsx"),
      "utf8",
    );
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/members/route.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain("appPath === `/organizations/${organizationName}/members`");
    expect(routeSource).toContain("renderShell={false}");
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('id="addNewMember"');
    expect(html).toContain('class="members project row-fluid"');
    expect(html).not.toContain('class="app-shell"');
    expect(html).not.toContain("project-header-outer");
    expect(html).not.toContain("project-menu-outer");
    expect(html).not.toContain("page-wrap-outer");
  });

  it("lets the organization layout route own delete chrome without changing the inner body", () => {
    const html = renderToStaticMarkup(
      <OrganizationDeletePage
        detail={{
          deleteAllowed: true,
          enrollmentRequests: [],
          members: [],
          organizationName: "yona-org",
          roleOptions: [],
          viewerCanUpdate: true,
        }}
        renderShell={false}
        runtimeConfig={testRuntimeConfig}
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/route.tsx"),
      "utf8",
    );
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/deleteForm/route.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain("appPath === `/organizations/${organizationName}/deleteForm`");
    expect(routeSource).toContain("renderShell={false}");
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('id="btnDelete"');
    expect(html).toContain('id="alertDeletion"');
    expect(html).not.toContain('class="app-shell"');
    expect(html).not.toContain("project-header-outer");
    expect(html).not.toContain("project-menu-outer");
    expect(html).not.toContain("page-wrap-outer");
  });

  it("lets the organization layout route own issue list chrome without changing the inner body", () => {
    const html = renderToStaticMarkup(
      <OrganizationIssueListPage
        currentUserId={7}
        detail={organizationDetail}
        issueList={{
          closedIssueCount: 0,
          items: [],
          openIssueCount: 0,
          organizationName: "yona-org",
          pageNum: 1,
          pageSize: 20,
          totalCount: 0,
          visibleProjects: [],
        }}
        query={{
          assigneeId: 0,
          authorId: 0,
          filter: "",
          mentionId: 0,
          orderBy: "updatedDate",
          orderDir: "desc",
          pageNum: 1,
          projectNames: [],
          state: "open",
        }}
        renderShell={false}
        runtimeConfig={testRuntimeConfig}
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/route.tsx"),
      "utf8",
    );
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/issues/route.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain("appPath === `/organizations/${organizationName}/issues`");
    expect(layoutSource).toContain('active: "issues"');
    expect(routeSource).toContain("renderShell={false}");
    expect(routeSource).toContain("useRouterState");
    expect(routeSource).toContain("location.href");
    expect(routeSource).toContain("useNavigate");
    expect(routeSource).toContain("onNavigate=");
    expect(html).toContain('name="search"');
    expect(html).toContain('method="get"');
    expect(html).toContain('class="page-wrap"');
    expect(html).toContain('class="row-fluid issue-list-wrap"');
    expect(html).not.toContain("project-header-outer");
    expect(html).not.toContain("project-menu-outer");
    expect(html).not.toContain("page-wrap-outer");
  });

  it("lets the organization layout route own board list chrome without changing the inner body", () => {
    const html = renderToStaticMarkup(
      <OrganizationBoardListPage
        boards={undefined}
        filter=""
        organizationName="yona-org"
        orderBy="createdDate"
        orderDir="desc"
        projectNames={[]}
        renderShell={false}
        runtimeConfig={testRuntimeConfig}
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/route.tsx"),
      "utf8",
    );
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/boards/route.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain("appPath === `/organizations/${organizationName}/boards`");
    expect(layoutSource).toContain('active: "boards"');
    expect(layoutSource).toContain('shellClassName: "board-page"');
    expect(routeSource).toContain("renderShell={false}");
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('class="search-wrap underline board-toolbar"');
    expect(html).not.toContain("project-header-outer");
    expect(html).not.toContain("project-menu-outer");
    expect(html).not.toContain("page-wrap-outer");
  });

  it("lets the organization layout route own pull request list chrome without changing the inner body", () => {
    const html = renderToStaticMarkup(
      <OrganizationPullRequestListPage
        category="open"
        detail={organizationDetail}
        list={undefined}
        organizationName="yona-org"
        query={{ category: "open", filter: "", pageNum: 1 }}
        renderShell={false}
        runtimeConfig={testRuntimeConfig}
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/route.tsx"),
      "utf8",
    );
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/pullrequests/route.tsx"),
      "utf8",
    );
    const closedRouteSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "routes/organizations/$organizationName/closedPullrequests/route.tsx",
      ),
      "utf8",
    );

    expect(layoutSource).toContain("appPath === `/organizations/${organizationName}/pullrequests`");
    expect(layoutSource).toContain(
      "appPath === `/organizations/${organizationName}/closedPullrequests`",
    );
    expect(layoutSource).toContain('active: "pullrequests"');
    expect(layoutSource).toContain('shellClassName: "pull-request-page"');
    expect(routeSource).toContain("renderShell={false}");
    expect(closedRouteSource).toContain("renderShell={false}");
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('class="nav nav-tabs nm pullrequeset-tab-menu"');
    expect(html).not.toContain("project-header-outer");
    expect(html).not.toContain("project-menu-outer");
    expect(html).not.toContain("page-wrap-outer");
  });

  it("uses default legacy messages for organization menu/header labels without a runtime provider", () => {
    const homeHtml = renderOrganizationHome();
    const settingsHtml = renderOrganizationSettings();

    expect(homeHtml).toContain(">Group Home<");
    expect(homeHtml).toContain(">Issue<");
    expect(homeHtml).toContain(">Board<");
    expect(homeHtml).toContain(">Pull request<");
    expect(homeHtml).toContain(" Member enrollment request</button>");
    expect(homeHtml).toContain(">You may want to be a member of yona-org group.<");
    expect(homeHtml).toContain(">Admins of this group can check your enrollment request.<");
    expect(homeHtml).toContain(" Send sign-up request</a>");
    expect(settingsHtml).toContain(">Setting<");
    expect(settingsHtml).toContain(">Group member<");
    expect(settingsHtml).toContain(">Group Delete<");
    expect(homeHtml).not.toContain(">title.organizationHome<");
  });

  it("uses default legacy messages for known organization auxiliary labels without a runtime provider", () => {
    const homeHtml = renderToStaticMarkup(
      <OrganizationDetailPage
        detail={{
          ...organizationDetail,
          viewerCanLeave: true,
          adminMembers: [
            {
              avatarUrl: "/avatars/admin.png",
              loginId: "admin",
              role: "org_admin",
              userLabel: "Admin",
            },
          ],
          memberMembers: [
            {
              avatarUrl: "/avatars/member.png",
              loginId: "member",
              role: "org_member",
              userLabel: "Member",
            },
          ],
          visibleProjects: [
            {
              createdLabel: "2026-06-01",
              isWatching: false,
              lastPushedLabel: "2026-06-20",
              logoUrl: "/logos/web.png",
              memberCount: 2,
              originOwnerName: "",
              originProjectName: "",
              overview: "Web",
              ownerName: "yona-org",
              projectName: "web",
              projectScope: "public",
              watchCount: 3,
            },
          ],
        }}
        runtimeConfig={testRuntimeConfig}
      />,
    );
    const issueHtml = renderEmptyOrganizationIssues();
    const memberHtml = renderOrganizationMembers();

    expect(homeHtml).toContain('placeholder="Type name"');
    expect(homeHtml).toContain(">Create new project<");
    expect(homeHtml).toContain(", Latest code update ");
    expect(homeHtml).toContain('title="You are not watching the  project."');
    expect(homeHtml).not.toContain("project.you.are.not.watching");
    expect(homeHtml).toContain(">Leave the group<");
    expect(homeHtml).toContain(">Group Manager<");
    expect(homeHtml).toContain(">Group Member<");
    expect(issueHtml).toContain('title="Two Column Mode"');
    expect(issueHtml).toContain('data-content="Splits list and body into columns respectively"');
    expect(issueHtml).toContain(">Column View<");
    expect(issueHtml).toContain(">No issue found<");
    expect(memberHtml).toContain('title="Enter Valid ID"');
    expect(memberHtml).toContain('data-provider="typeahead"');
    expect(memberHtml).toContain(">Group Manager<");
    expect(memberHtml).toContain(">Group Member<");
  });

  it("preserves legacy organization member typeahead cache reuse rule", () => {
    expect(
      shouldReuseLegacyMemberTypeaheadCache({
        isLastRangeEntire: true,
        lastQuery: "vi",
        query: "vis",
      }),
    ).toBe(true);
    expect(
      shouldReuseLegacyMemberTypeaheadCache({
        isLastRangeEntire: false,
        lastQuery: "vi",
        query: "vis",
      }),
    ).toBe(false);
    expect(
      shouldReuseLegacyMemberTypeaheadCache({
        isLastRangeEntire: true,
        lastQuery: "door",
        query: "vis",
      }),
    ).toBe(false);
  });

  it("uses default English legacy messages for organization shell labels", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    const homeHtml = renderOrganizationHome(runtime.t);
    const settingsHtml = renderOrganizationSettings(runtime.t);

    expect(homeHtml).toContain(">Group Home<");
    expect(homeHtml).toContain(">Issue<");
    expect(homeHtml).toContain(">Board<");
    expect(homeHtml).toContain(">Pull request<");
    expect(homeHtml).toContain(" Member enrollment request</button>");
    expect(homeHtml).toContain(">You may want to be a member of yona-org group.<");
    expect(homeHtml).toContain(">Admins of this group can check your enrollment request.<");
    expect(homeHtml).toContain(" Send sign-up request</a>");
    expect(settingsHtml).toContain(">Setting<");
    expect(settingsHtml).toContain(">Group member<");
    expect(settingsHtml).toContain(">Group Delete<");
    expect(homeHtml).not.toContain(">title.organizationHome<");
  });

  it("uses default English legacy messages for organization auxiliary labels", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    const homeHtml = renderToStaticMarkup(
      <OrganizationDetailPage
        detail={{
          ...organizationDetail,
          viewerCanLeave: true,
          adminMembers: [
            {
              avatarUrl: "/avatars/admin.png",
              loginId: "admin",
              role: "org_admin",
              userLabel: "Admin",
            },
          ],
          memberMembers: [
            {
              avatarUrl: "/avatars/member.png",
              loginId: "member",
              role: "org_member",
              userLabel: "Member",
            },
          ],
          visibleProjects: [
            {
              createdLabel: "2026-06-01",
              isWatching: false,
              lastPushedLabel: "2026-06-20",
              logoUrl: "/logos/web.png",
              memberCount: 2,
              originOwnerName: "",
              originProjectName: "",
              overview: "Web",
              ownerName: "yona-org",
              projectName: "web",
              projectScope: "public",
              watchCount: 3,
            },
          ],
        }}
        messages={runtime.t}
        runtimeConfig={testRuntimeConfig}
      />,
    );
    const issueHtml = renderOrganizationIssues(runtime.t);
    const emptyIssueHtml = renderEmptyOrganizationIssues(runtime.t);
    const memberHtml = renderOrganizationMembers(runtime.t);

    expect(homeHtml).toContain('placeholder="Type name"');
    expect(homeHtml).toContain(">Create new project<");
    expect(homeHtml).toContain(", Latest code update ");
    expect(homeHtml).toContain('title="You are not watching the  project."');
    expect(homeHtml).toContain(">Leave the group<");
    expect(homeHtml).toContain(">Group Manager<");
    expect(homeHtml).toContain(">Group Member<");
    expect(issueHtml).toContain(">All issues<");
    expect(issueHtml).toContain(">Assigned<");
    expect(issueHtml).toContain(">Created<");
    expect(issueHtml).toContain(">Mentioned<");
    expect(issueHtml).toContain(">Open ");
    expect(issueHtml).toContain(">Closed ");
    expect(issueHtml).toContain('title="Two Column Mode"');
    expect(issueHtml).toContain('data-content="Splits list and body into columns respectively"');
    expect(issueHtml).toContain(">Column View<");
    expect(issueHtml).toContain(">Updated<");
    expect(issueHtml).toContain(">No author<");
    expect(issueHtml).toContain('title="Assignee: Assignee"');
    expect(emptyIssueHtml).toContain(">No issue found<");
    expect(memberHtml).toContain('title="Enter Valid ID"');
    expect(memberHtml).toContain(">Group Manager<");
    expect(memberHtml).toContain(">Group Member<");
  });

  it("switches organization shell labels to Korean legacy messages", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const homeHtml = renderOrganizationHome(runtime.t);
    const settingsHtml = renderOrganizationSettings(runtime.t);

    expect(homeHtml).toContain(">홈<");
    expect(homeHtml).toContain(">이슈<");
    expect(homeHtml).toContain(">게시판<");
    expect(homeHtml).toContain(">코드 주고받기<");
    expect(homeHtml).toContain(" 멤버등록요청</button>");
    expect(homeHtml).toContain(">yona-org 그룹 멤버로 등록 요청을 할 수 있습니다.<");
    expect(homeHtml).toContain(
      ">그룹에 멤버 등록 요청을 보내면 그룹 관리자가 확인 할 수 있습니다.<",
    );
    expect(homeHtml).toContain(" 멤버 등록 요청하기</a>");
    expect(settingsHtml).toContain(">설정<");
    expect(settingsHtml).toContain(">그룹 멤버<");
    expect(settingsHtml).toContain(">그룹 삭제<");
    expect(homeHtml).not.toContain(">Group Home<");
  });

  it("passes AppRuntimeContext message lookup into organization pull-request route shells", () => {
    const routeFiles = [
      "routes/organizations/$organizationName/route.tsx",
      "routes/organizations/$organizationName/issues/route.tsx",
      "routes/organizations/$organizationName/boards/route.tsx",
      "routes/organizations/$organizationName/pullrequests/route.tsx",
      "routes/organizations/$organizationName/closedPullrequests/route.tsx",
      "routes/organizations/$organizationName/settingform/route.tsx",
      "routes/organizations/$organizationName/members/route.tsx",
      "routes/organizations/$organizationName/deleteForm/route.tsx",
      "routes/-search-views.tsx",
    ];

    for (const routeFile of routeFiles) {
      const source = fs.readFileSync(path.resolve(__dirname, routeFile), "utf8");
      expect(source).toContain("messages");
      expect(source).toContain("messages={messages}");
    }
  });

  it("looks up organization mutation fallback keys through the runtime messages", () => {
    const routeFiles = [
      ["routes/organizations/new/route.tsx", "error.badrequest"],
      ["routes/organizations/$organizationName/settingform/route.tsx", "error.badrequest"],
      ["routes/organizations/$organizationName/members/route.tsx", "error.badrequest"],
      ["routes/organizations/$organizationName/deleteForm/route.tsx", "organization.delete.error"],
    ];

    for (const [routeFile, key] of routeFiles) {
      const source = fs.readFileSync(path.resolve(__dirname, routeFile), "utf8");
      expect(source).toContain(`messages("${key}", { fallback: "${key}" })`);
    }
  });

  it("keeps organization create/settings/delete mutation redirects in the SPA", () => {
    const routeFiles = [
      "routes/organizations/new/route.tsx",
      "routes/organizations/$organizationName/settingform/route.tsx",
      "routes/organizations/$organizationName/deleteForm/route.tsx",
    ];

    for (const routeFile of routeFiles) {
      const source = fs.readFileSync(path.resolve(__dirname, routeFile), "utf8");
      expect(source, routeFile).toContain("useNavigate");
      expect(source, routeFile).toContain("prefixBasePath");
      expect(source, routeFile).not.toContain("navigateToAppHref");
    }
  });
});
