/* eslint-disable jsx-a11y/no-access-key -- legacy common/navbar.scala.html keeps accesskey=S */
import * as React from "react";
import { Outlet, createRootRouteWithContext, useRouterState } from "@tanstack/react-router";
import { RestApiError } from "../api/rest-client";
import { signInWithPassword } from "../auth-workspace-client";
import { AppRuntimeProvider, useAppRuntime } from "../app-runtime-context";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { LegacyLoginDialog, resolvePostAuthHref } from "./-auth-views";
import { navigateToAppHref } from "./-shared";
import type { WorkspaceOverviewViewModel } from "./-view-models";

export interface AppRouterContext {
  runtimeConfig: RuntimeConfig;
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootRouteComponent,
});

function RootRouteComponent() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <AppRuntimeProvider runtimeConfig={runtimeConfig}>
        <RuntimeErrorBanner />
        <SiteAdminLoggedInAffix />
        <RootHeader />
        <RootSidebar />
        <Outlet />
        <RootFooter />
        <RootLoginDialog />
      </AppRuntimeProvider>
    </YonaQueryProvider>
  );
}

const STANDALONE_FOOTER_PATHS = new Set(["/_UIKit", "/restart", "/secret"]);
const NON_PROJECT_TOP_LEVEL_PATHS = new Set([
  "_UIKit",
  "_import",
  "admin",
  "api",
  "assets",
  "authenticate",
  "files",
  "forgot-password",
  "images",
  "login",
  "lostPassword",
  "me",
  "migration",
  "notification",
  "notifications",
  "organizations",
  "projectform",
  "projects",
  "register",
  "reset-password",
  "resetPassword",
  "restart",
  "restricted",
  "search",
  "secret",
  "sites",
  "user",
  "users",
  "verify",
]);

type RootSearchScope =
  | { type: "global" }
  | { organizationName: string; type: "organization" }
  | { ownerName: string; projectName: string; type: "project" };

function RootFooter() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (STANDALONE_FOOTER_PATHS.has(pathname)) {
    return null;
  }

  return (
    <footer className="page-footer-outer">
      <div className="page-footer">
        <span className="provider">
          Copyright{" "}
          <a
            className="yona-author"
            href="https://github.com/yona-projects/yona/blob/master/AUTHORS"
            target="_blank"
          >
            Yona authors
          </a>{" "}
          &amp; ©{" "}
          <a href="https://navercorp.com" target="_blank">
            NAVER Corp.
          </a>{" "}
          &amp;{" "}
          <a className="naver-labs" href="https://naverlabs.com/" target="_blank">
            NAVER LABS
          </a>{" "}
          Supported by{" "}
          <a
            className="naver-cloud-platform"
            href="https://www.ncloud.com/?referer=yona"
            target="_blank"
          >
            NAVER CLOUD PLATFORM
          </a>
        </span>
      </div>
    </footer>
  );
}

function SiteAdminLoggedInAffix() {
  const { currentSession, messages } = useAppRuntime();

  if (!currentSession?.isSiteAdmin) {
    return null;
  }

  return (
    <div className="admin-logged-in-affix" data-spy="affix" data-offset-top="30">
      {messages("user.siteAdminLoggedInAffix", { fallback: "user.siteAdminLoggedInAffix" })}{" "}
      <span className="small-font">
        {messages("user.siteAdminLoggedInAffix.maxim", {
          fallback: "user.siteAdminLoggedInAffix.maxim",
        })}
      </span>
    </div>
  );
}

function RootHeader() {
  const { currentSession, messages, runtimeConfig, workspaceOverview } = useAppRuntime();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isGuest = workspaceOverview?.profile?.isGuest ?? false;
  const showProjectListing = !runtimeConfig.hideProjectListing && !isGuest;
  const searchScope = rootSearchScopeFromPathname(pathname);
  const searchAction = rootSearchAction(runtimeConfig.basePath, searchScope);
  const showGlobalSearchScope = showProjectListing || !!currentSession?.isSiteAdmin;
  const showOrganizationSearchScope =
    searchScope.type === "organization" &&
    (runtimeConfig.hideProjectListing || isGuest) &&
    isKnownOrganizationParticipant(searchScope.organizationName, workspaceOverview);

  return (
    <header className={`gnb-outer${searchScope.type !== "global" ? " project-header" : ""}`}>
      <div className="gnb-inner">
        <div className="pin" title="Sidebar">
          <i className="yobicon-arrow-left"></i>
          <i className="yobicon-arrow-right"></i>
        </div>
        <ul className="gnb-nav">
          <li>
            <a className="logo logo-letter" href={prefixBasePath(runtimeConfig.basePath, "/")}>
              Y
            </a>
          </li>
          {showProjectListing ? (
            <>
              <li>
                <a
                  className="show-progress-bar"
                  href={prefixBasePath(runtimeConfig.basePath, "/projects")}
                >
                  {messages("title.list", { fallback: "title.list" })}
                </a>
              </li>
              <li className="divider"></li>
            </>
          ) : null}
          {runtimeConfig.feedbackUrl ? (
            <li>
              <a href={runtimeConfig.feedbackUrl} rel="noreferrer" target="_blank">
                {messages("title.yobi.feedback", { fallback: "title.yobi.feedback" })}
              </a>
            </li>
          ) : null}
          <li>
            <form
              action={searchAction}
              className="input-prepend gnb-search-form"
              name="gnb-search-form"
            >
              <input name="searchType" type="hidden" value="auto" />
              {searchScope.type !== "global" ? (
                <div className="btn-group">
                  <button
                    className="ybtn dropdown-toggle"
                    data-toggle="dropdown"
                    id="gnb-search-scope-title"
                    type="button"
                  >
                    {messages(
                      searchScope.type === "project"
                        ? "search.scope.project"
                        : "search.scope.group",
                      {
                        fallback:
                          searchScope.type === "project"
                            ? "search.scope.project"
                            : "search.scope.group",
                      },
                    )}
                  </button>
                  <ul className="dropdown-menu flat right">
                    {searchScope.type === "project" || showOrganizationSearchScope ? (
                      <li>
                        <a
                          data-action={searchAction}
                          data-toggle="search-scope"
                          href={searchAction}
                        >
                          {messages(
                            searchScope.type === "project"
                              ? "search.scope.project"
                              : "search.scope.group",
                            {
                              fallback:
                                searchScope.type === "project"
                                  ? "search.scope.project"
                                  : "search.scope.group",
                            },
                          )}
                        </a>
                      </li>
                    ) : null}
                    {showGlobalSearchScope ? (
                      <li>
                        <a
                          data-action={prefixBasePath(runtimeConfig.basePath, "/search")}
                          data-toggle="search-scope"
                          href={prefixBasePath(runtimeConfig.basePath, "/search")}
                        >
                          {messages("search.scope.all", { fallback: "search.scope.all" })}
                        </a>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
              <div className={`search-box${searchScope.type !== "global" ? " select" : ""}`}>
                <input accessKey="S" autoComplete="off" name="keyword" type="text" />
                <button type="submit">
                  <i className="yobicon-search"></i>
                </button>
              </div>
            </form>
          </li>
        </ul>
        {currentSession && !currentSession.isAnonymous ? <RootUserMenu /> : <RootAnonymousMenu />}
      </div>
    </header>
  );
}

function isKnownOrganizationParticipant(
  organizationName: string,
  workspaceOverview: WorkspaceOverviewViewModel | null,
): boolean {
  if (!workspaceOverview) {
    return false;
  }

  return (
    workspaceOverview.memberProjects?.some((project) => project.ownerName === organizationName) ??
    false
  );
}

function rootSearchScopeFromPathname(pathname: string): RootSearchScope {
  const segments = pathname.split("/").flatMap((segment) => {
    const trimmed = segment.trim();
    return trimmed ? [trimmed] : [];
  });

  if (segments[0] === "organizations" && segments[1]) {
    return { organizationName: segments[1], type: "organization" };
  }

  if (
    segments.length >= 2 &&
    segments[0] &&
    segments[1] &&
    !NON_PROJECT_TOP_LEVEL_PATHS.has(segments[0])
  ) {
    return { ownerName: segments[0], projectName: segments[1], type: "project" };
  }

  return { type: "global" };
}

function rootSearchAction(basePath: string, scope: RootSearchScope): string {
  if (scope.type === "project") {
    return prefixBasePath(basePath, `/${scope.ownerName}/${scope.projectName}/search`);
  }

  if (scope.type === "organization") {
    return prefixBasePath(basePath, `/organizations/${scope.organizationName}/search`);
  }

  return prefixBasePath(basePath, "/search");
}

function RootSidebar() {
  const { currentSession, messages, runtimeConfig, workspaceOverview } = useAppRuntime();

  if (!currentSession || currentSession.isAnonymous) {
    return null;
  }

  const profileHref = prefixBasePath(runtimeConfig.basePath, `/${currentSession.loginId}`);
  const accountHref = prefixBasePath(runtimeConfig.basePath, "/user/editform");
  const logoutHref = prefixBasePath(runtimeConfig.basePath, "/users/logout");

  return (
    <div id="mySidenav" className="sidenav">
      <div className="span5 right-menu span-hard-wrap">
        <div className="row-fluid user-menu-wrap">
          <span className="user-menu">
            <a href={profileHref}>
              {messages("userinfo.profile", { fallback: "userinfo.profile" })}
            </a>
          </span>
          <span className="user-menu">
            <a href={accountHref}>
              {messages("userinfo.accountSetting", { fallback: "userinfo.accountSetting" })}
            </a>
          </span>
          <a href={logoutHref}>
            <span className="user-menu logout label">
              {messages("title.logout", { fallback: "title.logout" })}
            </span>
          </a>
        </div>
        <ul className="nav nav-tabs nm">
          <li className="myOrganizationList active">
            <a data-toggle="tab" href="#myOrganizationList">
              {messages("title.favorite", { fallback: "title.favorite" })}
            </a>
          </li>
          <li className="myProjectList">
            <a data-toggle="tab" href="#myProjectList">
              {messages("title.project", { fallback: "title.project" })}
            </a>
          </li>
          <li className="myRecentIssueList">
            <a data-toggle="tab" href="#myRecentIssueList">
              {messages("title.recently.visited.issue", {
                fallback: "title.recently.visited.issue",
              })}
            </a>
          </li>
        </ul>
        <div className="tab-content tab-box">
          <div id="usermenu-tab-content-list" className="tab-content">
            <SidebarProjectList
              active
              id="myOrganizationList"
              noResultsLabel={messages("title.no.results", { fallback: "title.no.results" })}
              projects={workspaceOverview?.favoriteProjects ?? []}
              runtimeConfig={runtimeConfig}
            />
            <SidebarProjectList
              id="myProjectList"
              noResultsLabel={messages("title.no.results", { fallback: "title.no.results" })}
              projects={[
                ...(workspaceOverview?.recentProjects ?? []),
                ...(workspaceOverview?.watchedProjects ?? []),
              ]}
              runtimeConfig={runtimeConfig}
            />
            <SidebarIssueList
              issues={workspaceOverview?.issueItems ?? []}
              noResultsLabel={messages("title.no.results", { fallback: "title.no.results" })}
              runtimeConfig={runtimeConfig}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarProjectList({
  active = false,
  id,
  noResultsLabel,
  projects,
  runtimeConfig,
}: {
  active?: boolean;
  id: string;
  noResultsLabel: string;
  projects: Array<{ ownerName: string; projectName: string }>;
  runtimeConfig: RuntimeConfig;
}) {
  if (projects.length === 0) {
    return (
      <div className={`no-result tab-pane user-ul ${active ? "active" : ""}`} id={id}>
        {noResultsLabel}
      </div>
    );
  }

  return (
    <ul className={`tab-pane user-ul ${active ? "active" : ""}`} id={id}>
      {projects.map((project) => {
        const projectHref = prefixBasePath(
          runtimeConfig.basePath,
          `/${project.ownerName}/${project.projectName}`,
        );
        const ownerHref = prefixBasePath(runtimeConfig.basePath, `/${project.ownerName}`);
        return (
          <li className="user-li " data-location={projectHref} key={`${id}:${projectHref}`}>
            <div className="project-list project-flex-container">
              <div className="project-item project-item-container">
                <div className="flex-item site-logo">
                  <i className="project-avatar">
                    <span className="dummy-25px"> </span>
                  </i>
                </div>
                <div className="projectName-owner flex-item">
                  <div className="project-name flex-item">
                    <a href={projectHref}>{project.projectName}</a>
                  </div>
                  <div className="project-owner flex-item">
                    <a href={ownerHref}>{project.ownerName}</a>
                  </div>
                </div>
              </div>
              <div className="star-project flex-item" data-project-id="">
                <i className="star material-icons">star</i>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarIssueList({
  issues,
  noResultsLabel,
  runtimeConfig,
}: {
  issues: NonNullable<WorkspaceOverviewViewModel["issueItems"]>;
  noResultsLabel: string;
  runtimeConfig: RuntimeConfig;
}) {
  if (issues.length === 0) {
    return (
      <div className="no-result tab-pane user-ul" id="myRecentIssueList">
        {noResultsLabel}
      </div>
    );
  }

  return (
    <ul className="tab-pane user-ul" id="myRecentIssueList">
      {issues.map((issue) => {
        const href = prefixBasePath(
          runtimeConfig.basePath,
          `/${issue.ownerName}/${issue.projectName}/issue/${issue.issueNumber}`,
        );
        return (
          <li className="user-li" data-location={href} key={href}>
            <a href={href}>{issue.title}</a>
          </li>
        );
      })}
    </ul>
  );
}

function RootUserMenu() {
  const { currentSession, messages, runtimeConfig, workspaceOverview } = useAppRuntime();

  if (!currentSession || currentSession.isAnonymous) {
    return null;
  }

  const customLinkName = runtimeConfig.navbarCustomLinkName?.trim();
  const avatarUrl =
    workspaceOverview?.profile?.avatarUrl ||
    prefixBasePath(runtimeConfig.basePath, "/assets/images/default-avatar-64.png");
  const isGuest = workspaceOverview?.profile?.isGuest ?? false;

  return (
    <ul className="gnb-usermenu">
      {customLinkName ? (
        <li className="gnb-usermenu-item">
          <a
            className="user-item-btn loggged-in"
            href={prefixBasePath(runtimeConfig.basePath, runtimeConfig.navbarCustomLinkUrl || "/")}
          >
            {customLinkName}
          </a>
        </li>
      ) : null}
      <li
        className="gnb-usermenu-item"
        data-placement="bottom"
        data-toggle="tooltip"
        title={`${messages("title.shortcut", { fallback: "title.shortcut" })} (A)`}
      >
        <a
          className="user-item-btn loggged-in"
          href={prefixBasePath(runtimeConfig.basePath, "/user/issues")}
        >
          {messages("issue.myIssue", { fallback: "issue.myIssue" })}
        </a>
      </li>
      <li className="divider"></li>
      {currentSession.isSiteAdmin ? (
        <li className="gnb-usermenu-item">
          <a
            className="usermenu-icon-button show-progress-bar"
            data-placement="bottom"
            data-toggle="tooltip"
            href={prefixBasePath(runtimeConfig.basePath, "/sites/userList")}
            title={messages("menu.siteAdmin", { fallback: "menu.siteAdmin" })}
          >
            <i className="yobicon-wrench"></i>
          </a>
        </li>
      ) : null}
      {currentSession.isSiteAdmin ? <li className="divider"></li> : null}
      <li className="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn">
        <a
          className="gnb-dropdown-toggle"
          data-placement="bottom"
          data-toggle="tooltip"
          href="#mySidenav"
          title={`${messages("user.menu", { fallback: "user.menu" })}, ${messages(
            "title.shortcut",
            {
              fallback: "title.shortcut",
            },
          )} (F)`}
        >
          <span className="avatar-wrap smaller">
            <img alt={currentSession.userLabel || currentSession.loginId} src={avatarUrl} />
          </span>
          <span className="caret"></span>
        </a>
      </li>
      <li className="gnb-usermenu-dropdown">
        <a
          className="gnb-dropdown-toggle dropdwon-box-btn"
          data-toggle="dropdown"
          href="#gnb-create-menu"
        >
          <i className="yobicon-plus"></i>
          <span className="caret"></span>
        </a>
        <ul className="dropdown-menu flat right" id="gnb-create-menu">
          <li>
            <a href={prefixBasePath(runtimeConfig.basePath, "/user/issues/new")}>
              {messages("issue.menu.new", { fallback: "issue.menu.new" })}
            </a>
          </li>
          <li>
            <a href={prefixBasePath(runtimeConfig.basePath, "/user/issues/new/mine")}>
              {messages("issue.menu.new.mine", { fallback: "issue.menu.new.mine" })}
            </a>
          </li>
          <li>
            <hr className="no-margin" />
          </li>
          <li>
            <a href={prefixBasePath(runtimeConfig.basePath, "/projects/new")}>
              {messages("button.newProject", { fallback: "button.newProject" })}
            </a>
          </li>
          {!isGuest ? (
            <li>
              <a href={prefixBasePath(runtimeConfig.basePath, "/organizations/new")}>
                {messages("title.newOrganization", { fallback: "title.newOrganization" })}
              </a>
            </li>
          ) : null}
        </ul>
      </li>
    </ul>
  );
}

function RootAnonymousMenu() {
  const { messages, runtimeConfig } = useAppRuntime();

  return (
    <ul className="gnb-usermenu">
      <li className="gnb-usermenu-item" id="required-logged-in">
        <a
          className="user-item-btn"
          data-login="required"
          href={prefixBasePath(runtimeConfig.basePath, "/users/loginform")}
        >
          {messages("button.login", { fallback: "button.login" })}
        </a>
      </li>
      <li className="divider"></li>
      <li>
        <a
          className="ybtn ybtn-success"
          href={prefixBasePath(runtimeConfig.basePath, "/users/signupform")}
        >
          {messages("title.signup", { fallback: "title.signup" })}
        </a>
      </li>
    </ul>
  );
}

function RootLoginDialog() {
  const {
    authUiCapabilities,
    csrfToken,
    currentSession,
    refreshWorkspace,
    runtimeConfig,
    setCurrentSession,
    setErrorMessage,
  } = useAppRuntime();
  const [pending, setPending] = React.useState(false);

  if (currentSession && !currentSession.isAnonymous) {
    return null;
  }

  return (
    <LegacyLoginDialog
      authUiCapabilities={authUiCapabilities}
      csrfToken={csrfToken}
      runtimeConfig={runtimeConfig}
      onSignIn={async (input) => {
        if (pending) {
          return;
        }
        setPending(true);
        setErrorMessage(null);
        try {
          const session = await signInWithPassword(runtimeConfig, csrfToken, input);
          setCurrentSession(session);
          await refreshWorkspace(session);
          navigateToAppHref(
            runtimeConfig.basePath,
            resolvePostAuthHref(null, session.defaultLandingPath),
          );
        } catch (error) {
          setErrorMessage(legacyLoginFailureMessage(error));
        } finally {
          setPending(false);
        }
      }}
    />
  );
}

function legacyLoginFailureMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "user.login.failed.network";
  }
  if (error instanceof RestApiError) {
    if (error.code !== "http_error" && error.message) {
      return error.message;
    }
    if (error.status >= 400 && error.status < 500) {
      return "user.login.failed.client";
    }
    if (error.status >= 500 && error.status < 600) {
      return "user.login.failed.server";
    }
    return "user.login.failed";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "user.login.failed";
}

function RuntimeErrorBanner() {
  const { errorMessage, messages, setErrorMessage } = useAppRuntime();

  if (!errorMessage) {
    return null;
  }

  const translatedErrorMessage = messages(errorMessage, { fallback: errorMessage });
  const closeLabel = messages("button.close", { fallback: "button.close" });

  return (
    <div className="runtime-error-banner" role="alert">
      <span>{translatedErrorMessage}</span>
      <button onClick={() => setErrorMessage(null)} type="button">
        {closeLabel}
      </button>
    </div>
  );
}
