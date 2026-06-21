import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime } from "./i18n";
import {
  SiteAdminDataPage,
  SiteAdminDiagnosticPage,
  SiteAdminIssueListPage,
  SiteAdminMailPage,
  SiteAdminMassMailPage,
  SiteAdminPostListPage,
  SiteAdminProjectListPage,
  SiteAdminUpdatePage,
  SiteAdminUserListPage,
} from "./routes/sites/$pageName/route";

type LegacyMessageLookup = ReturnType<typeof createLegacyI18nRuntime>["t"];

const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
const noop = () => {};

function renderSiteAdminI18nShell(messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    <>
      <SiteAdminUserListPage
        deleteTarget={{
          avatarUrl: "/yona/files/202",
          createdAt: "2026-01-01 10:20:30",
          displayName: "Door User",
          emailAddress: "door@yona.test",
          id: 7,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "door",
          state: "ACTIVE",
        }}
        input={{ page: 1, query: "", state: "ACTIVE" }}
        messages={messages}
        pendingAccountLockLoginId={undefined}
        pendingDeleteLoginId={undefined}
        pendingGuestLoginId={undefined}
        pendingResetPasswordLoginId={undefined}
        pendingSiteAdminLoginId={undefined}
        response={{
          page: 1,
          pageSize: 30,
          query: "",
          siteAdminCount: 1,
          state: "ACTIVE",
          total: 1,
          totalPages: 2,
          users: [
            {
              avatarUrl: "/yona/files/202",
              createdAt: "2026-01-01 10:20:30",
              displayName: "Door User",
              emailAddress: "door@yona.test",
              id: 7,
              isGuest: false,
              isSiteAdmin: false,
              loginId: "door",
              state: "ACTIVE",
            },
          ],
        }}
        resetPasswords={{ door: "new-secret" }}
        runtimeConfig={runtimeConfig}
        updateAvailable={true}
        onCancelDelete={noop}
        onConfirmDelete={noop}
        onRequestDelete={noop}
        onResetPassword={noop}
        onToggleAccountLock={noop}
        onToggleGuest={noop}
        onToggleSiteAdmin={noop}
      />
      <SiteAdminDiagnosticPage
        messages={messages}
        response={{ errorCount: 2, errors: ["storage missing"] }}
        runtimeConfig={runtimeConfig}
      />
      <SiteAdminUpdatePage
        error={null}
        messages={messages}
        response={{
          currentVersion: "1.0.0",
          error: null,
          message: "",
          releaseUrl: "/release",
          versionToUpdate: "1.1.0",
        }}
        runtimeConfig={runtimeConfig}
      />
    </>,
  );
}

describe("site-admin route parity harness", () => {
  it("closes the legacy site-admin wildcard route without porting placeholders", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/sites/$pageName'");

    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/sites/$pageName/route.tsx"),
      "utf8",
    );
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).not.toContain("Read users failed.");
    expect(routeSource).not.toContain("Read projects failed.");
    expect(routeSource).not.toContain("Read posts failed.");
    expect(routeSource).not.toContain("Read issues failed.");
    expect(routeSource).not.toContain("Read mail failed.");
    expect(routeSource).not.toContain("Read diagnostics failed.");
    expect(routeSource).toContain("error.badrequest");
    expect(routeSource).not.toContain("Site admin role update failed.");
    expect(routeSource).not.toContain("Account lock update failed.");
    expect(routeSource).not.toContain("Guest mode update failed.");
    expect(routeSource).not.toContain("User delete failed.");
    expect(routeSource).not.toContain("Password reset failed.");
    expect(routeSource).not.toContain("Project delete failed.");
    expect(routeSource).not.toContain("Mail recipient lookup failed.");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain('"bad-request"');
    expect(routeSource).toContain("NotFoundPage");
    expect(routeSource).toContain("return <NotFoundPage href={`/sites/${pageName}`} />;");
  });

  it("keeps site-admin shell fallback keys without a runtime provider", () => {
    const html = renderSiteAdminI18nShell();

    expect(html).toContain(">site.sidebar<");
    expect(html).toContain(">site.sidebar.userList<");
    expect(html).toContain(">site.sidebar.postList<");
    expect(html).toContain(">site.sidebar.issueList<");
    expect(html).toContain(">site.sidebar.projectList<");
    expect(html).toContain(">site.sidebar.mailSend<");
    expect(html).toContain(">site.sidebar.massMail<");
    expect(html).toContain(">site.sidebar.update<span");
    expect(html).toContain(">site.sidebar.diagnostics<");
    expect(html).toContain('placeholder="site.userList.search"');
    expect(html).toContain(">site.userList.unlocked<");
    expect(html).toContain(">user.name<");
    expect(html).toContain(">button.user.make.guest.mode<");
    expect(html).toContain(">title.resetPassword<");
    expect(html).toContain("user.newPassword: new-secret");
    expect(html).toContain(">button.delete<");
    expect(html).toContain('aria-label="button.close"');
    expect(html).toContain(">site.diagnostic.errorFound 2<");
    expect(html).toContain("Yona 1.1.0 is available");
  });

  it("uses default English legacy messages for site-admin shell labels", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    const html = renderSiteAdminI18nShell(runtime.t);

    expect(html).toContain(">Site management<");
    expect(html).toContain(">Users<");
    expect(html).toContain(">Posts<");
    expect(html).toContain(">Issues<");
    expect(html).toContain(">Projects<");
    expect(html).toContain(">Send email<");
    expect(html).toContain(">Send mass emails<");
    expect(html).toContain(">Software Update<span");
    expect(html).toContain(">Diagnostics<");
    expect(html).toContain('placeholder="Find user by login ID, user name or email"');
    expect(html).toContain(">Unlocked user<");
    expect(html).toContain(">Name<");
    expect(html).toContain(">Make Guest<");
    expect(html).toContain(">Reset password<");
    expect(html).toContain("New password: new-secret");
    expect(html).toContain(">Delete<");
    expect(html).toContain('aria-label="Close"');
    expect(html).toContain(">2 errors were found<");
    expect(html).toContain("Yona 1.1.0 is available");
    expect(html).not.toContain(">site.sidebar.userList<");
  });

  it("switches site-admin shell labels to Korean legacy messages", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const html = renderSiteAdminI18nShell(runtime.t);

    expect(html).toContain(">사이트 관리<");
    expect(html).toContain(">사용자<");
    expect(html).toContain(">게시물<");
    expect(html).toContain(">이슈<");
    expect(html).toContain(">프로젝트<");
    expect(html).toContain(">메일 발송<");
    expect(html).toContain(">대량 메일 발송<");
    expect(html).toContain(">업데이트<span");
    expect(html).toContain(">시스템 진단<");
    expect(html).toContain('placeholder="찾으려는 사용자의 ID, 이름 또는 이메일을 입력하세요"');
    expect(html).toContain(">활성화된 사용자<");
    expect(html).toContain(">이름<");
    expect(html).toContain(">게스트로 전환<");
    expect(html).toContain(">비밀번호 재설정<");
    expect(html).toContain("신규 비밀번호: new-secret");
    expect(html).toContain(">삭제<");
    expect(html).toContain('aria-label="닫기"');
    expect(html).toContain(">2개의 문제점이 발견되었습니다.<");
    expect(html).toContain("Yona 1.1.0 버전으로 업데이트 할 수 있습니다");
    expect(html).not.toContain(">Site management<");
  });

  it("renders legacy user and project search forms without temporary English placeholders", () => {
    const userHtml = renderToStaticMarkup(
      <SiteAdminUserListPage
        deleteTarget={null}
        input={{ page: 1, query: "", state: "ACTIVE" }}
        pendingAccountLockLoginId={undefined}
        pendingDeleteLoginId={undefined}
        pendingGuestLoginId={undefined}
        pendingResetPasswordLoginId={undefined}
        pendingSiteAdminLoginId={undefined}
        response={{
          page: 1,
          pageSize: 30,
          query: "",
          siteAdminCount: 0,
          state: "ACTIVE",
          total: 0,
          totalPages: 0,
          users: [],
        }}
        resetPasswords={{}}
        runtimeConfig={runtimeConfig}
        updateAvailable={true}
        onCancelDelete={noop}
        onConfirmDelete={noop}
        onRequestDelete={noop}
        onResetPassword={noop}
        onToggleAccountLock={noop}
        onToggleGuest={noop}
        onToggleSiteAdmin={noop}
      />,
    );

    expect(userHtml).toContain(">site.sidebar.userList<");
    expect(userHtml).toContain('<div class="row-fluid"><div class="span2">');
    expect(userHtml).not.toContain("site-setting-layout");
    expect(userHtml).toContain(
      '<a href="/yona/sites/update">site.sidebar.update<span class="notification-badge">1</span></a>',
    );
    expect(userHtml).toContain('placeholder="site.userList.search"');
    expect(userHtml).toContain(
      '<button class="search-btn" type="submit"><i class="yobicon-search"></i></button>',
    );
    expect(userHtml).toContain('<ul class="user-list-wrap"></ul>');
    expect(userHtml).not.toContain("Search users");
    expect(userHtml).not.toContain(">Search</button>");
    expect(userHtml).not.toContain("No users found.");

    const projectHtml = renderToStaticMarkup(
      <SiteAdminProjectListPage
        deleteTarget={null}
        input={{ filter: "", page: 1 }}
        pendingDeleteProjectId={undefined}
        response={{
          filter: "",
          page: 1,
          pageSize: 30,
          projects: [],
          total: 0,
          totalPages: 0,
        }}
        runtimeConfig={runtimeConfig}
        onCancelDelete={noop}
        onConfirmDelete={noop}
        onRequestDelete={noop}
      />,
    );

    expect(projectHtml).toContain(">site.sidebar.projectList<");
    expect(projectHtml).toContain('placeholder="site.project.filter"');
    expect(projectHtml).toContain(
      '<button class="search-btn" type="submit"><i class="yobicon-search"></i></button>',
    );
    expect(projectHtml).toContain('<ul class="project-list-wrap"></ul>');
    expect(projectHtml).not.toContain("Search projects");
    expect(projectHtml).not.toContain(">Search</button>");
    expect(projectHtml).not.toContain("No projects found.");
  });

  it("renders legacy user and project list action labels", () => {
    const userHtml = renderToStaticMarkup(
      <SiteAdminUserListPage
        deleteTarget={{
          avatarUrl: "/yona/files/202",
          createdAt: "2026-01-01 10:20:30",
          displayName: "Door User",
          emailAddress: "door@yona.test",
          id: 7,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "door",
          state: "ACTIVE",
        }}
        input={{ page: 1, query: "", state: "ACTIVE" }}
        pendingAccountLockLoginId={undefined}
        pendingDeleteLoginId={undefined}
        pendingGuestLoginId={undefined}
        pendingResetPasswordLoginId={undefined}
        pendingSiteAdminLoginId={undefined}
        response={{
          page: 1,
          pageSize: 30,
          query: "",
          siteAdminCount: 0,
          state: "ACTIVE",
          total: 1,
          totalPages: 1,
          users: [
            {
              avatarUrl: "/yona/files/202",
              createdAt: "2026-01-01 10:20:30",
              displayName: "Door User",
              emailAddress: "door@yona.test",
              id: 7,
              isGuest: false,
              isSiteAdmin: false,
              loginId: "door",
              state: "ACTIVE",
            },
          ],
        }}
        resetPasswords={{ door: "new-secret" }}
        runtimeConfig={runtimeConfig}
        onCancelDelete={noop}
        onConfirmDelete={noop}
        onRequestDelete={noop}
        onResetPassword={noop}
        onToggleAccountLock={noop}
        onToggleGuest={noop}
        onToggleSiteAdmin={noop}
      />,
    );

    expect(userHtml).toContain(">user.name<");
    expect(userHtml).toContain(">user.email<");
    expect(userHtml).toContain(">userinfo.since<");
    expect(userHtml).toContain(">2026-01-01 10:20 AM<");
    expect(userHtml).not.toContain("10:20:30");
    expect(userHtml).toContain(">site.userList.unlocked<");
    expect(userHtml).toContain(
      '<img alt="Door User" height="32" src="/yona/files/202" width="32"/>',
    );
    expect(userHtml).toContain(">button.user.make.guest.mode<");
    expect(userHtml).toContain(">button.user.makeAccountUnlock.false<");
    expect(userHtml).toContain(">title.resetPassword<");
    expect(userHtml).toContain("user.newPassword: new-secret");
    expect(userHtml).toContain(">button.user.upgrade.to.site.admin<");
    expect(userHtml).toContain(">button.delete<");
    expect(userHtml).toContain(">site.user.delete<");
    expect(userHtml).toContain(">site.user.deleteConfirm<");
    expect(userHtml).toContain(
      '<button aria-label="button.close" class="close" data-dismiss="modal" type="button">×</button>',
    );
    expect(userHtml).not.toContain('aria-label="Close"');
    expect(userHtml).toContain(">button.yes<");
    expect(userHtml).toContain(
      '<button class="ybtn" data-dismiss="modal" type="button">button.no</button>',
    );
    expect(userHtml).not.toContain(">User<");
    expect(userHtml).not.toContain(">Email<");
    expect(userHtml).not.toContain(">Reset Password<");
    expect(userHtml).not.toContain(">Delete User<");

    const deletedUserHtml = renderToStaticMarkup(
      <SiteAdminUserListPage
        deleteTarget={null}
        input={{ page: 1, query: "", state: "DELETED" }}
        pendingAccountLockLoginId={undefined}
        pendingDeleteLoginId={undefined}
        pendingGuestLoginId={undefined}
        pendingResetPasswordLoginId={undefined}
        pendingSiteAdminLoginId={undefined}
        response={{
          page: 1,
          pageSize: 30,
          query: "",
          siteAdminCount: 0,
          state: "DELETED",
          total: 1,
          totalPages: 1,
          users: [
            {
              avatarUrl: "/yona/files/303",
              createdAt: "2025-12-31 09:10:11",
              displayName: "[DELETED]Gone User",
              emailAddress: "deleted-gone@noreply.yona.io",
              id: 8,
              isGuest: false,
              isSiteAdmin: false,
              lastStateModifiedAt: "2026-01-02 11:12:13",
              loginId: "gone",
              state: "DELETED",
            },
          ],
        }}
        resetPasswords={{}}
        runtimeConfig={runtimeConfig}
        onCancelDelete={noop}
        onConfirmDelete={noop}
        onRequestDelete={noop}
        onResetPassword={noop}
        onToggleAccountLock={noop}
        onToggleGuest={noop}
        onToggleSiteAdmin={noop}
      />,
    );

    expect(deletedUserHtml).toContain(">userinfo.leave<");
    expect(deletedUserHtml).toContain(">2026-01-02 11:12:13<");
    expect(deletedUserHtml).not.toContain(">2025-12-31 09:10:11</div>");
    expect(deletedUserHtml).not.toContain(">button.user.make.guest.mode<");
    expect(deletedUserHtml).not.toContain(">title.resetPassword<");

    const projectHtml = renderToStaticMarkup(
      <SiteAdminProjectListPage
        deleteTarget={{
          createdAt: "2026-01-01 10:20:30",
          id: 11,
          overview: "A project",
          ownerName: "yona",
          projectLogoUrl: "/yona/files/101",
          projectName: "alpha",
        }}
        input={{ filter: "", page: 1 }}
        pendingDeleteProjectId={undefined}
        response={{
          filter: "",
          page: 1,
          pageSize: 30,
          projects: [
            {
              createdAt: "2026-01-01 10:20:30",
              id: 11,
              overview: "A project",
              ownerName: "yona",
              projectLogoUrl: "/yona/files/101",
              projectName: "alpha",
            },
          ],
          total: 1,
          totalPages: 1,
        }}
        runtimeConfig={runtimeConfig}
        onCancelDelete={noop}
        onConfirmDelete={noop}
        onRequestDelete={noop}
      />,
    );

    expect(projectHtml).toContain(">project.name<");
    expect(projectHtml).toContain(">project.description<");
    expect(projectHtml).toContain(">project.created<");
    expect(projectHtml).toContain('<img alt="alpha" src="/yona/files/101"/>');
    expect(projectHtml).toContain(">yona/alpha<");
    expect(projectHtml).toContain(">2026-01-01<");
    expect(projectHtml).not.toContain("10:20:30");
    expect(projectHtml).toContain(">button.delete<");
    expect(projectHtml).toContain(">site.project.delete<");
    expect(projectHtml).toContain(">site.project.deleteConfirm<");
    expect(projectHtml).toContain(
      '<button aria-label="button.close" class="close" data-dismiss="modal" type="button">×</button>',
    );
    expect(projectHtml).not.toContain('aria-label="Close"');
    expect(projectHtml).toContain(">button.yes<");
    expect(projectHtml).toContain(
      '<button class="ybtn" data-dismiss="modal" type="button">button.no</button>',
    );
    expect(projectHtml).not.toContain(">Project<");
    expect(projectHtml).not.toContain(">Delete Project<");
    expect(projectHtml).not.toContain(">Are you sure?<");
  });

  it("renders legacy post and issue empty list wrappers without ad-hoc empty messages", () => {
    const postHtml = renderToStaticMarkup(
      <SiteAdminPostListPage
        input={{ page: 1 }}
        response={{ page: 1, pageSize: 30, posts: [], total: 0, totalPages: 0 }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(postHtml).toContain(">site.sidebar.postList<");
    expect(postHtml).toContain('<ul class="post-list-wrap"></ul>');
    expect(postHtml).not.toContain("No posts found.");

    const issueHtml = renderToStaticMarkup(
      <SiteAdminIssueListPage
        input={{ page: 1, state: "open" }}
        response={{
          issues: [],
          page: 1,
          pageSize: 30,
          state: "open",
          total: 0,
          totalPages: 0,
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(issueHtml).toContain(">site.sidebar.issueList<");
    expect(issueHtml).toContain('<ul class="post-list-wrap"></ul>');
    expect(issueHtml).not.toContain("No issues found.");
  });

  it("renders legacy post and issue row anchors and comment icons", () => {
    const postHtml = renderToStaticMarkup(
      <SiteAdminPostListPage
        input={{ page: 1 }}
        response={{
          page: 1,
          pageSize: 30,
          posts: [
            {
              authorAvatarUrl: "/yona/avatar/door.png",
              authorLabel: "Door User",
              authorLoginId: "door",
              commentCount: 3,
              createdLabel: "2026-01-01",
              createdTitle: "2026-01-01 10:20:30 AM",
              labels: [],
              notice: false,
              ownerName: "yona",
              postNumber: "15",
              projectLogoUrl: "/yona/files/101",
              projectName: "alpha",
              readme: false,
              title: "Board post",
              updatedLabel: "2026-01-02",
            },
          ],
          total: 1,
          totalPages: 2,
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(postHtml).toContain('class="row-fluid listitem"');
    expect(postHtml).toContain('class="avatar-wrap list-avatar"');
    expect(postHtml).toContain('<img alt="alpha" src="/yona/files/101"/>');
    expect(postHtml).toContain('href="/yona/yona/alpha"');
    expect(postHtml).toContain('class="post-project"');
    expect(postHtml).toContain(">yona/alpha<");
    expect(postHtml).toContain('class="post-info-separator"');
    expect(postHtml).toContain('class="post-title"');
    expect(postHtml).toContain('href="/yona/yona/alpha/post/15"');
    expect(postHtml).toContain(">Board post<");
    expect(postHtml).toContain('href="/yona/door"');
    expect(postHtml).toContain(
      '<img alt="Door User" height="16" src="/yona/avatar/door.png" width="16"/>',
    );
    expect(postHtml).toContain(">Door User<");
    expect(postHtml).toContain('title="2026-01-01 10:20:30 AM"');
    expect(postHtml).toContain(">2026-01-01</span>");
    expect(postHtml).toContain('href="/yona/yona/alpha/post/15#comments"');
    expect(postHtml).toContain('<i class="yobicon-comments"></i>3');
    expect(postHtml).toContain('class="page-navigation-wrap" id="pagination"');
    expect(postHtml).toContain('<ul class="page-nums">');
    expect(postHtml).toContain('name="pageNum"');
    expect(postHtml).toContain('value="1"');
    expect(postHtml).toContain('href="/yona/sites/postList?pageNum=2"');
    expect(postHtml).toContain("button.prevPage");
    expect(postHtml).toContain("button.nextPage");
    expect(postHtml).not.toContain("data-page-num");

    const issueHtml = renderToStaticMarkup(
      <SiteAdminIssueListPage
        input={{ page: 1, state: "open" }}
        response={{
          issues: [
            {
              assigneeLabel: "",
              authorAvatarUrl: "/yona/avatar/door.png",
              authorLabel: "Door User",
              authorLoginId: "door",
              commentCount: 4,
              createdLabel: "2026-01-03",
              createdTitle: "2026-01-03 3:04:05 PM",
              issueNumber: "21",
              labels: [],
              milestoneTitle: "",
              ownerName: "yona",
              projectLogoUrl: "/yona/files/101",
              projectName: "alpha",
              state: "open",
              title: "Open issue",
              updatedLabel: "2026-01-04",
              voterCount: 0,
              watcherCount: 0,
            },
          ],
          page: 1,
          pageSize: 30,
          state: "open",
          total: 1,
          totalPages: 2,
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(issueHtml).toContain(">issue.state.open<");
    expect(issueHtml).toContain(">issue.state.closed<");
    expect(issueHtml).not.toContain(">Open<");
    expect(issueHtml).not.toContain(">Closed<");
    expect(issueHtml).toContain('class="row-fluid listitem"');
    expect(issueHtml).toContain('href="/yona/yona/alpha"');
    expect(issueHtml).toContain('<img alt="alpha" src="/yona/files/101"/>');
    expect(issueHtml).toContain('class="post-project"');
    expect(issueHtml).toContain(">yona/alpha<");
    expect(issueHtml).toContain('class="post-title"');
    expect(issueHtml).toContain('href="/yona/yona/alpha/issue/21"');
    expect(issueHtml).toContain(">Open issue<");
    expect(issueHtml).toContain('href="/yona/door"');
    expect(issueHtml).toContain(
      '<img alt="Door User" height="16" src="/yona/avatar/door.png" width="16"/>',
    );
    expect(issueHtml).toContain(">Door User<");
    expect(issueHtml).toContain('title="2026-01-03 3:04:05 PM"');
    expect(issueHtml).toContain(">2026-01-03</span>");
    expect(issueHtml).toContain('href="/yona/yona/alpha/issue/21#comments"');
    expect(issueHtml).toContain('<i class="yobicon-comments"></i>4');
    expect(issueHtml).toContain('class="page-navigation-wrap" id="pagination"');
    expect(issueHtml).toContain('<ul class="page-nums">');
    expect(issueHtml).toContain('name="pageNum"');
    expect(issueHtml).toContain('value="1"');
    expect(issueHtml).toContain('href="/yona/sites/issueList?state=open&amp;pageNum=2"');
    expect(issueHtml).toContain("button.prevPage");
    expect(issueHtml).toContain("button.nextPage");
    expect(issueHtml).not.toContain("data-page-num");
  });

  it("renders legacy diagnostics title and status messages", () => {
    const okHtml = renderToStaticMarkup(
      <SiteAdminDiagnosticPage
        response={{ errorCount: 0, errors: [] }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(okHtml).toContain(">site.sidebar<");
    expect(okHtml).toContain(">site.sidebar.diagnostics<");
    expect(okHtml).toContain('href="/yona/sites/diagnostic"');
    expect(okHtml).toContain(">site.diagnostic.errorNotFound<");
    expect(okHtml).not.toContain(">Site Admin<");
    expect(okHtml).not.toContain(">Diagnostics<");
    expect(okHtml).not.toContain("No errors were found");

    const errorHtml = renderToStaticMarkup(
      <SiteAdminDiagnosticPage
        response={{ errorCount: 2, errors: ["storage missing", "smtp missing"] }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(errorHtml).toContain(">site.diagnostic.errorFound 2<");
    expect(errorHtml).toContain("<ul><li><pre>storage missing</pre></li>");
    expect(errorHtml).toContain("<pre>storage missing</pre>");
    expect(errorHtml).toContain("<pre>smtp missing</pre>");
    expect(errorHtml).not.toContain("site-diagnostic-errors");
    expect(errorHtml).not.toContain("2 errors were found");
  });

  it("renders legacy mail and mass-mail message-key form shells", () => {
    const mailHtml = renderToStaticMarkup(
      <SiteAdminMailPage
        pending={false}
        response={{ notConfiguredItems: ["smtp.host"], sender: "admin@yona.test", sent: true }}
        runtimeConfig={runtimeConfig}
        sent={true}
        onSend={noop}
      />,
    );

    expect(mailHtml).toContain(">title.sendMail<");
    expect(mailHtml).toContain(">site.mail.notConfigured /admin/mailconf<");
    expect(mailHtml).not.toContain(">site.mail.notConfigured<");
    expect(mailHtml).toContain("smtp.host");
    expect(mailHtml).toContain(">site.mail.sended<");
    expect(mailHtml).toContain(">site.mail.from<");
    expect(mailHtml).toContain('action="/yona/sites/mail"');
    expect(mailHtml).toContain('placeholder="site.mail.fromPlaceholder"');
    expect(mailHtml).toContain(">site.mail.to<");
    expect(mailHtml).toContain('placeholder="site.mail.toPlaceholder"');
    expect(mailHtml).toContain(">site.mail.subject<");
    expect(mailHtml).toContain(">site.mail.body<");
    expect(mailHtml).toContain("<strong>site.mail.send</strong>");
    expect(mailHtml).not.toContain("Mail configuration is incomplete.");
    expect(mailHtml).not.toContain("Mail was sent.");

    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/sites/$pageName/route.tsx"),
      "utf8",
    );
    expect(routeSource).toContain("site.mail.fail");
    expect(routeSource).toContain("error.badrequest");
    expect(routeSource).not.toContain("Mail send failed.");
    expect(routeSource).not.toContain("Mail recipient lookup failed.");

    const massMailHtml = renderToStaticMarkup(
      <SiteAdminMassMailPage
        mailtoHref=""
        pending={false}
        runtimeConfig={runtimeConfig}
        onResolveRecipients={noop}
      />,
    );

    expect(massMailHtml).toContain(">title.massMail<");
    expect(massMailHtml).toContain(">site.massMail.toAll<");
    expect(massMailHtml).toContain(">site.massMail.toProjects<");
    expect(massMailHtml).toContain('data-toggle="mail-type"');
    expect(massMailHtml).toContain('placeholder="project.name"');
    expect(massMailHtml).toContain('data-loading-text="site.massMail.loading"');
    expect(massMailHtml).toContain('id="select-project" type="submit"');
    expect(massMailHtml).toContain('id="write-email" type="submit"');
    expect(massMailHtml).toContain("<strong>button.add</strong>");
    expect(massMailHtml).toContain("<strong>site.mail.write</strong>");
    expect(massMailHtml).not.toContain(">Mass Mail<");
    expect(massMailHtml).not.toContain("All users");
    expect(massMailHtml).not.toContain("Project members");
    expect(massMailHtml).not.toContain("Write email");
  });

  it("renders legacy data and update site-admin shells", () => {
    const dataHtml = renderToStaticMarkup(
      <SiteAdminDataPage csrfToken="csrf-token" runtimeConfig={runtimeConfig} />,
    );

    expect(dataHtml).toContain(">site.sidebar.data<");
    expect(dataHtml).toContain("<strong>site.data.warning1</strong>");
    expect(dataHtml).toContain("<strong>site.data.warning2</strong>");
    expect(dataHtml).toContain("<strong>site.data.warning3</strong>");
    expect(dataHtml).toContain(">site.data.export<");
    expect(dataHtml).toContain('href="/yona/sites/export"');
    expect(dataHtml).toContain(">site.data.import<");
    expect(dataHtml).toContain('action="/yona/sites/import"');
    expect(dataHtml).toContain('name="data"');
    expect(dataHtml).toContain('<input type="submit"/>');
    expect(dataHtml).not.toContain('value="site.data.import"');

    const updateHtml = renderToStaticMarkup(
      <SiteAdminUpdatePage
        error={null}
        response={{
          currentVersion: "1.0.0",
          error: null,
          message: "",
          releaseUrl: "/release",
          versionToUpdate: "1.1.0",
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(updateHtml).toContain(">site.sidebar.update<");
    expect(updateHtml).toContain("Yona 1.1.0 is available");
    expect(updateHtml).toContain(
      '<a href="/yona/sites/update">site.sidebar.update<span class="notification-badge">1</span></a>',
    );
    expect(updateHtml).toContain('href="/yona/sites/update/download"');
    expect(updateHtml).toContain(">site.update.download<");
    expect(updateHtml).toContain("Current version is Yona 1.0.0");
    expect(updateHtml).not.toContain("site.update.isAvailable 1.1.0");
    expect(updateHtml).not.toContain("site.update.currentVersion 1.0.0");
    expect(updateHtml).not.toContain(">Update<");

    const noUpdateHtml = renderToStaticMarkup(
      <SiteAdminUpdatePage
        error={null}
        response={{
          currentVersion: "1.0.0",
          error: null,
          message: "",
          releaseUrl: null,
          versionToUpdate: null,
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(noUpdateHtml).toContain("You are using the latest version");
    expect(noUpdateHtml).not.toContain('class="notification-badge"');
    expect(noUpdateHtml).not.toContain(">site.update.isNotNecessary<");
    expect(noUpdateHtml).not.toContain("site.update.isNotNecessary 1.0.0");
  });
});
