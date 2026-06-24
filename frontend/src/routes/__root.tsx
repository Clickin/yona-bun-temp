import * as React from "react";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { AppRuntimeProvider, useAppRuntime } from "../app-runtime-context";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { LegacyLoginDialog } from "./-auth-views";
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
        <RootSidebar />
        <RootUserMenu />
        <Outlet />
        <RootLoginDialog />
      </AppRuntimeProvider>
    </YonaQueryProvider>
  );
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
            <a href={profileHref}>Profile</a>
          </span>
          <span className="user-menu">
            <a href={accountHref}>Account</a>
          </span>
          <a href={logoutHref}>
            <span className="user-menu logout label">Log out</span>
          </a>
        </div>
        <ul className="nav nav-tabs nm">
          <li className="myOrganizationList active">
            <a data-toggle="tab" href="#myOrganizationList">
              Favorite
            </a>
          </li>
          <li className="myProjectList">
            <a data-toggle="tab" href="#myProjectList">
              Project
            </a>
          </li>
          <li className="myRecentIssueList">
            <a data-toggle="tab" href="#myRecentIssueList">
              Recent History
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
  const { currentSession, runtimeConfig } = useAppRuntime();

  if (!currentSession || currentSession.isAnonymous) {
    return null;
  }

  const customLinkName = runtimeConfig.navbarCustomLinkName?.trim();
  if (!customLinkName && !currentSession.isSiteAdmin) {
    return null;
  }

  return (
    <ul className="gnb-outer gnb-usermenu">
      {currentSession.isSiteAdmin ? (
        <li className="gnb-usermenu-item admin-logged-in-affix">
          <a
            className="user-item-btn loggged-in"
            href={prefixBasePath(runtimeConfig.basePath, "/sites/userList")}
          >
            <i className="yobicon-wrench"></i>
          </a>
        </li>
      ) : null}
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
    </ul>
  );
}

function RootLoginDialog() {
  const { authUiCapabilities, csrfToken, currentSession, runtimeConfig } = useAppRuntime();

  if (currentSession && !currentSession.isAnonymous) {
    return null;
  }

  return (
    <LegacyLoginDialog
      authUiCapabilities={authUiCapabilities}
      csrfToken={csrfToken}
      runtimeConfig={runtimeConfig}
    />
  );
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
