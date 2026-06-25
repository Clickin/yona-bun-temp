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
  SiteAdminLoadingShell,
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

  it("uses default legacy messages for site-admin shell labels without a runtime provider", () => {
    const html = renderSiteAdminI18nShell();

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
    expect(html).not.toContain(">site.sidebar<");
    expect(html).not.toContain(">title.resetPassword<");
    expect(html).not.toContain("site.update.isAvailable");
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

  it("switches the site-admin internal loading shell through legacy messages", () => {
    const fallbackHtml = renderToStaticMarkup(<SiteAdminLoadingShell />);

    expect(fallbackHtml).toContain(
      '<main class="app-shell site-admin-page"><h1>common.loading</h1></main>',
    );

    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    const englishHtml = renderToStaticMarkup(<SiteAdminLoadingShell messages={runtime.t} />);
    expect(englishHtml).toContain(
      '<main class="app-shell site-admin-page"><h1>Loading</h1></main>',
    );
    expect(englishHtml).not.toContain("<h1>common.loading</h1>");

    runtime.setLanguage("ko-KR");
    const koreanHtml = renderToStaticMarkup(<SiteAdminLoadingShell messages={runtime.t} />);
    expect(koreanHtml).toContain(
      '<main class="app-shell site-admin-page"><h1>불러오는 중</h1></main>',
    );
    expect(koreanHtml).not.toContain("<h1>Loading</h1>");
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

    expect(userHtml).toContain(">Users<");
    expect(userHtml).toContain('<div class="row-fluid"><div class="span2">');
    expect(userHtml).not.toContain("site-setting-layout");
    expect(userHtml).toContain(
      '<a href="/yona/sites/update">Software Update<span class="notification-badge">1</span></a>',
    );
    expect(userHtml).toContain('placeholder="Find user by login ID, user name or email"');
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

    expect(projectHtml).toContain(">Projects<");
    expect(projectHtml).toContain('placeholder="Search by keyword"');
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

    expect(userHtml).toContain(">Name<");
    expect(userHtml).toContain(">Email address<");
    expect(userHtml).toContain(">Member since<");
    expect(userHtml).toContain(">2026-01-01 10:20 AM<");
    expect(userHtml).not.toContain("10:20:30");
    expect(userHtml).toContain(">Unlocked user<");
    expect(userHtml).toContain(
      '<img alt="Door User" height="32" src="/yona/files/202" width="32"/>',
    );
    expect(userHtml).toContain(">Make Guest<");
    expect(userHtml).toContain(">Lock account<");
    expect(userHtml).toContain(">Reset password<");
    expect(userHtml).toContain("New password: new-secret");
    expect(userHtml).toContain(">Upgrade to Site admin<");
    expect(userHtml).toContain(">Delete<");
    expect(userHtml).toContain(">Delete user<");
    expect(userHtml).toContain(">Are you sure you want this user to leave?<");
    expect(userHtml).toContain(
      '<button aria-label="Close" class="close" data-dismiss="modal" type="button">×</button>',
    );
    expect(userHtml).not.toContain('aria-label="button.close"');
    expect(userHtml).toContain(">Yes<");
    expect(userHtml).toContain(
      '<button class="ybtn" data-dismiss="modal" type="button">No</button>',
    );
    expect(userHtml).not.toContain(">user.name<");
    expect(userHtml).not.toContain(">title.resetPassword<");
    expect(userHtml).not.toContain(">site.user.delete<");

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

    expect(deletedUserHtml).toContain(">Date of leaving<");
    expect(deletedUserHtml).toContain(">2026-01-02 11:12:13<");
    expect(deletedUserHtml).not.toContain(">2025-12-31 09:10:11</div>");
    expect(deletedUserHtml).not.toContain(">Make Guest<");
    expect(deletedUserHtml).not.toContain(">Reset password<");

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

    expect(projectHtml).toContain(">Project name<");
    expect(projectHtml).toContain(">Description<");
    expect(projectHtml).toContain(">Created date<");
    expect(projectHtml).toContain('<img alt="alpha" src="/yona/files/101"/>');
    expect(projectHtml).toContain(">yona/alpha<");
    expect(projectHtml).toContain(">2026-01-01<");
    expect(projectHtml).not.toContain("10:20:30");
    expect(projectHtml).toContain(">Delete<");
    expect(projectHtml).toContain(">Delete project<");
    expect(projectHtml).toContain(">Do you really want to delete this project?<");
    expect(projectHtml).toContain(
      '<button aria-label="Close" class="close" data-dismiss="modal" type="button">×</button>',
    );
    expect(projectHtml).not.toContain('aria-label="button.close"');
    expect(projectHtml).toContain(">Yes<");
    expect(projectHtml).toContain(
      '<button class="ybtn" data-dismiss="modal" type="button">No</button>',
    );
    expect(projectHtml).not.toContain(">project.name<");
    expect(projectHtml).not.toContain(">site.project.delete<");
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

    expect(postHtml).toContain(">Posts<");
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

    expect(issueHtml).toContain(">Issues<");
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
    expect(postHtml).toContain("Previous page");
    expect(postHtml).toContain("Next page");
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

    expect(issueHtml).toContain(">Open<");
    expect(issueHtml).toContain(">Closed<");
    expect(issueHtml).not.toContain(">issue.state.open<");
    expect(issueHtml).not.toContain(">issue.state.closed<");
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
    expect(issueHtml).toContain("Previous page");
    expect(issueHtml).toContain("Next page");
    expect(issueHtml).not.toContain("data-page-num");
  });

  it("renders legacy diagnostics title and status messages", () => {
    const okHtml = renderToStaticMarkup(
      <SiteAdminDiagnosticPage
        response={{ errorCount: 0, errors: [] }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(okHtml).toContain(">Site management<");
    expect(okHtml).toContain(">Diagnostics<");
    expect(okHtml).toContain('href="/yona/sites/diagnostic"');
    expect(okHtml).toContain(">No errors were found<");
    expect(okHtml).not.toContain(">site.sidebar<");
    expect(okHtml).not.toContain("site.diagnostic.errorNotFound");

    const errorHtml = renderToStaticMarkup(
      <SiteAdminDiagnosticPage
        response={{ errorCount: 2, errors: ["storage missing", "smtp missing"] }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(errorHtml).toContain(">2 errors were found<");
    expect(errorHtml).toContain("<ul><li><pre>storage missing</pre></li>");
    expect(errorHtml).toContain("<pre>storage missing</pre>");
    expect(errorHtml).toContain("<pre>smtp missing</pre>");
    expect(errorHtml).not.toContain("site-diagnostic-errors");
    expect(errorHtml).not.toContain("site.diagnostic.errorFound");
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

    expect(mailHtml).toContain(">Send email<");
    expect(mailHtml).toContain(
      ">Mailer has not been configured. Set following properties in conf/application.conf. /admin/mailconf<",
    );
    expect(mailHtml).not.toContain(">site.mail.notConfigured<");
    expect(mailHtml).toContain("smtp.host");
    expect(mailHtml).toContain(">Mail has been sent.<");
    expect(mailHtml).toContain(">From<");
    expect(mailHtml).toContain('action="/yona/sites/mail"');
    expect(mailHtml).toContain('placeholder="sender@mail.com"');
    expect(mailHtml).toContain(">To<");
    expect(mailHtml).toContain('placeholder="receipient@mail.com"');
    expect(mailHtml).toContain(">Subject<");
    expect(mailHtml).toContain(">Body<");
    expect(mailHtml).toContain("<strong>Send</strong>");
    expect(mailHtml).not.toContain("Mail configuration is incomplete.");
    expect(mailHtml).not.toContain("Mail was sent.");
    expect(mailHtml).not.toContain(">Send Mail<");
    expect(mailHtml).not.toContain(">Mail was sent<");

    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/sites/$pageName/route.tsx"),
      "utf8",
    );
    expect(routeSource).toContain('messages?.("site.mail.fail", { fallback: "site.mail.fail" })');
    expect(routeSource).toContain(
      'messages?.("error.badrequest", { fallback: "error.badrequest" })',
    );
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

    expect(massMailHtml).toContain(">Send mass mails<");
    expect(massMailHtml).toContain(">To all<");
    expect(massMailHtml).toContain(">To members of a specific project<");
    expect(massMailHtml).toContain('data-toggle="mail-type"');
    expect(massMailHtml).toContain('placeholder="Project name"');
    expect(massMailHtml).toContain('data-loading-text="Loading..."');
    expect(massMailHtml).toContain('id="select-project" type="submit"');
    expect(massMailHtml).toContain('id="write-email" type="submit"');
    expect(massMailHtml).toContain("<strong>Add</strong>");
    expect(massMailHtml).toContain("<strong>Write</strong>");
    expect(massMailHtml).not.toContain(">Mass Mail<");
    expect(massMailHtml).not.toContain("All users");
    expect(massMailHtml).not.toContain("Project members");
    expect(massMailHtml).not.toContain("Write email");
  });

  it("renders legacy data and update site-admin shells", () => {
    const dataHtml = renderToStaticMarkup(
      <SiteAdminDataPage csrfToken="csrf-token" runtimeConfig={runtimeConfig} />,
    );

    expect(dataHtml).toContain(">Data<");
    expect(dataHtml).toContain(
      "<strong>Before importing or exporting data, you should block other user&#x27;s access and only allow the site admin.</strong>",
    );
    expect(dataHtml).toContain(
      "<strong>After clicking the export button please wait until the file download finishes.</strong>",
    );
    expect(dataHtml).toContain(
      "<strong>Please backup database before import data, in some cases you can lose existing data.</strong>",
    );
    expect(dataHtml).toContain(">Export<");
    expect(dataHtml).toContain('href="/yona/sites/export"');
    expect(dataHtml).toContain(">Import<");
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

    expect(updateHtml).toContain(">Software Update<");
    expect(updateHtml).toContain("Yona 1.1.0 is available");
    expect(updateHtml).toContain(
      '<a href="/yona/sites/update">Software Update<span class="notification-badge">1</span></a>',
    );
    expect(updateHtml).toContain('href="/yona/sites/update/download-file"');
    expect(updateHtml).toContain(">Download<");
    expect(updateHtml).toContain("Current version is Yona 1.0.0");
    expect(updateHtml).not.toContain("site.update.currentVersion");

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

    expect(noUpdateHtml).toContain(">You are using the latest version<");
    expect(noUpdateHtml).not.toContain('class="notification-badge"');
    expect(noUpdateHtml).not.toContain("site.update.isNotNecessary");
  });
});
