import * as React from "react";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime } from "./i18n";
import { testRuntimeConfig } from "./auth-workspace-shell.test-helpers";
import {
  OrganizationDetailPage,
  OrganizationIssueListPage,
  OrganizationMembersPage,
  OrganizationSettingsPage,
} from "./routes/-organization-views";
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
  it("keeps organization menu/header fallback keys without a runtime provider", () => {
    const homeHtml = renderOrganizationHome();
    const settingsHtml = renderOrganizationSettings();

    expect(homeHtml).toContain(">title.organizationHome<");
    expect(homeHtml).toContain(">menu.issue<");
    expect(homeHtml).toContain(">menu.board<");
    expect(homeHtml).toContain(">menu.pullRequest<");
    expect(homeHtml).toContain(" organization.member.enrollment.title</button>");
    expect(homeHtml).toContain(">organization.you.may.want.to.be.a.member yona-org<");
    expect(homeHtml).toContain(">organization.member.enrollment.help.before<");
    expect(homeHtml).toContain(" button.new.enrollment</a>");
    expect(settingsHtml).toContain(">organization.settingFrom<");
    expect(settingsHtml).toContain(">organization.member<");
    expect(settingsHtml).toContain(">organization.delete<");
  });

  it("keeps known organization auxiliary fallback keys without a runtime provider", () => {
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

    expect(homeHtml).toContain('placeholder="title.type.name"');
    expect(homeHtml).toContain(">button.newProject<");
    expect(homeHtml).toContain(", project.codeUpdate ");
    expect(homeHtml).toContain('title="project.you.are.not.watching"');
    expect(homeHtml).toContain(">organization.member.leave<");
    expect(homeHtml).toContain(">user.role.org_admin<");
    expect(homeHtml).toContain(">user.role.org_member<");
    expect(issueHtml).toContain('title="common.two.column.mode"');
    expect(issueHtml).toContain('data-content="common.two.column.mode.desc"');
    expect(issueHtml).toContain(">common.two.column.view<");
    expect(issueHtml).toContain(">issue.is.empty<");
    expect(memberHtml).toContain('title="user.wrongloginId.alert"');
    expect(memberHtml).toContain(">user.role.org_admin<");
    expect(memberHtml).toContain(">user.role.org_member<");
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

    expect(homeHtml).toContain('placeholder="title.type.name"');
    expect(homeHtml).toContain(">Create new project<");
    expect(homeHtml).toContain(", Latest code update ");
    expect(homeHtml).toContain('title="project.you.are.not.watching"');
    expect(homeHtml).toContain(">organization.member.leave<");
    expect(homeHtml).toContain(">user.role.org_admin<");
    expect(homeHtml).toContain(">user.role.org_member<");
    expect(issueHtml).toContain(">issue.list.all<");
    expect(issueHtml).toContain(">Assigned<");
    expect(issueHtml).toContain(">Created<");
    expect(issueHtml).toContain(">issue.list.mentionedOfMe<");
    expect(issueHtml).toContain(">Open ");
    expect(issueHtml).toContain(">Closed ");
    expect(issueHtml).toContain('title="Two Column Mode"');
    expect(issueHtml).toContain('data-content="Splits list and body into columns respectively"');
    expect(issueHtml).toContain(">Column View<");
    expect(issueHtml).toContain(">Updated<");
    expect(issueHtml).toContain(">No author<");
    expect(issueHtml).toContain('title="Assignee: Assignee"');
    expect(emptyIssueHtml).toContain(">No issue found<");
    expect(memberHtml).toContain('title="user.wrongloginId.alert"');
    expect(memberHtml).toContain(">user.role.org_admin<");
    expect(memberHtml).toContain(">user.role.org_member<");
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
});
