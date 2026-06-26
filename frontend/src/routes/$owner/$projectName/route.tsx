import { useQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import {
  cancelEnrollProject,
  enrollProject,
  toggleFavoriteProject,
  toggleProjectWatch,
  updateProjectOverview,
} from "../../../auth-workspace-client";
import { listProjectPostsQueryOptions } from "../../../api/boards";
import {
  deleteProjectMemberRest,
  readProjectContainerQueryOptions,
} from "../../../api/org-project";
import { RestApiError } from "../../../api/rest-client";
import { useAppRuntime } from "../../../app-runtime-context";
import { toProjectContainerView } from "../../../app-view-models";
import { ProjectDetailPage, ProjectHeader, ProjectMenu } from "../../-project-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  navigateToAppHref,
  NotFoundPage,
  useCurrentHref,
} from "../../-shared";

export const Route = createFileRoute("/$owner/$projectName")({
  component: ProjectLayoutRouteComponent,
});

function legacyProjectEnrollFallback(error: unknown): string {
  if (error instanceof RestApiError) {
    if (error.status === 403) {
      return "error.forbidden";
    }
    if (error.status >= 400 && error.status < 500) {
      return "user.enroll.failed.client";
    }
    if (error.status >= 500 && error.status < 600) {
      return "user.enroll.failed.server";
    }
    return "user.enroll.failed";
  }
  if (error instanceof TypeError) {
    return "user.enroll.failed.network";
  }
  return "user.enroll.failed";
}

function ProjectLayoutRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, messages, runtimeConfig } = useAppRuntime();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const legacyAdminAlias = legacyAdminAliasPath(owner, projectName);
  const layoutShell = projectLayoutShell(pathname, runtimeConfig.basePath, owner, projectName);

  if (legacyAdminAlias) {
    navigateToAppHref(runtimeConfig.basePath, legacyAdminAlias);
    return null;
  }

  if (!layoutShell) {
    return <Outlet />;
  }

  return (
    <ProjectRouteShellLayout
      activeMenu={layoutShell.activeMenu}
      bootstrapping={bootstrapping}
      keymapMode={layoutShell.keymapMode}
      messages={messages}
      owner={owner}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
      shellClassName={layoutShell.shellClassName}
    />
  );
}

function stripProjectLayoutBasePath(pathname: string, basePath: string): string {
  const normalizedBasePath = basePath && basePath !== "/" ? basePath.replace(/\/+$/u, "") : "";
  if (!normalizedBasePath) {
    return pathname || "/";
  }
  if (pathname === normalizedBasePath) {
    return "/";
  }
  if (pathname.startsWith(`${normalizedBasePath}/`)) {
    return pathname.slice(normalizedBasePath.length) || "/";
  }
  return pathname || "/";
}

function projectLayoutShell(
  pathname: string,
  basePath: string,
  owner: string,
  projectName: string,
): {
  activeMenu?: "board" | "code" | "issue" | "milestone" | "pullRequest" | "review" | "settings";
  keymapMode?: "detail" | "list";
  shellClassName?: string;
} | null {
  const appPath = stripProjectLayoutBasePath(pathname, basePath).replace(/\/+$/u, "");
  if (
    appPath === `/${owner}/${projectName}/changeVCS` ||
    appPath === `/${owner}/${projectName}/deleteform` ||
    appPath === `/${owner}/${projectName}/issue/labelsform` ||
    appPath === `/${owner}/${projectName}/settingform` ||
    appPath === `/${owner}/${projectName}/members` ||
    appPath === `/${owner}/${projectName}/transfer` ||
    appPath === `/${owner}/${projectName}/webhooks`
  ) {
    return { activeMenu: "settings" };
  }
  if (appPath === `/${owner}/${projectName}/watchers`) {
    return {};
  }
  if (appPath === `/${owner}/${projectName}/branches`) {
    return { activeMenu: "code" };
  }
  if (
    appPath === `/${owner}/${projectName}/code` ||
    appPath.startsWith(`/${owner}/${projectName}/code/`)
  ) {
    return { activeMenu: "code" };
  }
  if (isCodeCommitPath(appPath, owner, projectName)) {
    return { activeMenu: "code" };
  }
  if (isCodeComparePath(appPath, owner, projectName)) {
    return { activeMenu: "code" };
  }
  if (
    appPath === `/${owner}/${projectName}/commits` ||
    appPath.startsWith(`/${owner}/${projectName}/commits/`)
  ) {
    return { activeMenu: "code" };
  }
  if (appPath === `/${owner}/${projectName}/posts`) {
    return { activeMenu: "board", keymapMode: "list", shellClassName: "board-page" };
  }
  if (
    appPath === `/${owner}/${projectName}/postform` ||
    isBoardPostEditFormPath(appPath, owner, projectName)
  ) {
    return { activeMenu: "board", shellClassName: "board-page" };
  }
  if (isBoardPostDetailPath(appPath, owner, projectName)) {
    return { activeMenu: "board", keymapMode: "detail", shellClassName: "board-page" };
  }
  if (appPath === `/${owner}/${projectName}/milestones`) {
    return { activeMenu: "milestone" };
  }
  if (
    appPath === `/${owner}/${projectName}/newMilestoneForm` ||
    isMilestoneDetailPath(appPath, owner, projectName) ||
    isMilestoneEditFormPath(appPath, owner, projectName)
  ) {
    return { activeMenu: "milestone" };
  }
  if (
    appPath === `/${owner}/${projectName}/issueform` ||
    isIssueEditFormPath(appPath, owner, projectName)
  ) {
    return { activeMenu: "issue" };
  }
  if (isIssueDetailPath(appPath, owner, projectName)) {
    return { activeMenu: "issue", keymapMode: "detail", shellClassName: "issue-detail-page" };
  }
  if (appPath === `/${owner}/${projectName}/issues`) {
    return { activeMenu: "issue", keymapMode: "list", shellClassName: "issue-list-page" };
  }
  if (appPath === `/${owner}/${projectName}/statistics`) {
    return { activeMenu: "issue" };
  }
  if (
    appPath === `/${owner}/${projectName}/pullRequests` ||
    appPath === `/${owner}/${projectName}/closedPullRequests` ||
    appPath === `/${owner}/${projectName}/sentPullRequests`
  ) {
    return { activeMenu: "pullRequest", shellClassName: "pull-request-page" };
  }
  if (
    appPath === `/${owner}/${projectName}/newPullRequestForm` ||
    isPullRequestEditFormPath(appPath, owner, projectName)
  ) {
    return { activeMenu: "pullRequest", shellClassName: "pull-request-page" };
  }
  if (isPullRequestDetailPath(appPath, owner, projectName)) {
    return { activeMenu: "pullRequest", shellClassName: "pull-request-page" };
  }
  if (isPullRequestChangesPath(appPath, owner, projectName)) {
    return { activeMenu: "pullRequest", shellClassName: "pull-request-page" };
  }
  if (appPath === `/${owner}/${projectName}/reviews`) {
    return { activeMenu: "review", shellClassName: "pull-request-page" };
  }
  if (appPath === `/${owner}/${projectName}/newFork`) {
    return { activeMenu: "pullRequest" };
  }
  return null;
}

function isIssueEditFormPath(appPath: string, owner: string, projectName: string): boolean {
  const segments = appPath.split("/").filter(Boolean);
  return (
    segments.length === 5 &&
    segments[0] === owner &&
    segments[1] === projectName &&
    segments[2] === "issue" &&
    segments[4] === "editform"
  );
}

function isPullRequestEditFormPath(appPath: string, owner: string, projectName: string): boolean {
  const segments = appPath.split("/").filter(Boolean);
  return (
    segments.length === 5 &&
    segments[0] === owner &&
    segments[1] === projectName &&
    segments[2] === "pullRequest" &&
    segments[4] === "editform"
  );
}

function isPullRequestDetailPath(appPath: string, owner: string, projectName: string): boolean {
  const segments = appPath.split("/").filter(Boolean);
  return (
    segments.length === 4 &&
    segments[0] === owner &&
    segments[1] === projectName &&
    segments[2] === "pullRequest"
  );
}

function isPullRequestChangesPath(appPath: string, owner: string, projectName: string): boolean {
  const segments = appPath.split("/").filter(Boolean);
  return (
    (segments.length === 5 || segments.length === 6) &&
    segments[0] === owner &&
    segments[1] === projectName &&
    segments[2] === "pullRequest" &&
    segments[4] === "changes"
  );
}

function isCodeCommitPath(appPath: string, owner: string, projectName: string): boolean {
  const segments = appPath.split("/").filter(Boolean);
  return (
    segments.length === 4 &&
    segments[0] === owner &&
    segments[1] === projectName &&
    segments[2] === "commit"
  );
}

function isCodeComparePath(appPath: string, owner: string, projectName: string): boolean {
  const segments = appPath.split("/").filter(Boolean);
  return (
    segments.length === 4 &&
    segments[0] === owner &&
    segments[1] === projectName &&
    segments[2] === "compare"
  );
}

function isIssueDetailPath(appPath: string, owner: string, projectName: string): boolean {
  const segments = appPath.split("/").filter(Boolean);
  return (
    segments.length === 4 &&
    segments[0] === owner &&
    segments[1] === projectName &&
    segments[2] === "issue"
  );
}

function isBoardPostEditFormPath(appPath: string, owner: string, projectName: string): boolean {
  const segments = appPath.split("/").filter(Boolean);
  return (
    segments.length === 5 &&
    segments[0] === owner &&
    segments[1] === projectName &&
    segments[2] === "post" &&
    segments[4] === "editform"
  );
}

function isBoardPostDetailPath(appPath: string, owner: string, projectName: string): boolean {
  const segments = appPath.split("/").filter(Boolean);
  return (
    segments.length === 4 &&
    segments[0] === owner &&
    segments[1] === projectName &&
    segments[2] === "post"
  );
}

function isMilestoneEditFormPath(appPath: string, owner: string, projectName: string): boolean {
  const segments = appPath.split("/").filter(Boolean);
  return (
    segments.length === 5 &&
    segments[0] === owner &&
    segments[1] === projectName &&
    segments[2] === "milestone" &&
    segments[4] === "editform"
  );
}

function isMilestoneDetailPath(appPath: string, owner: string, projectName: string): boolean {
  const segments = appPath.split("/").filter(Boolean);
  return (
    segments.length === 4 &&
    segments[0] === owner &&
    segments[1] === projectName &&
    segments[2] === "milestone"
  );
}

function ProjectRouteShellLayout({
  activeMenu,
  bootstrapping,
  keymapMode,
  messages,
  owner,
  projectName,
  runtimeConfig,
  shellClassName,
}: {
  activeMenu?: "board" | "code" | "issue" | "milestone" | "pullRequest" | "review" | "settings";
  bootstrapping: boolean;
  keymapMode?: "detail" | "list";
  messages: ReturnType<typeof useAppRuntime>["messages"];
  owner: string;
  projectName: string;
  runtimeConfig: ReturnType<typeof useAppRuntime>["runtimeConfig"];
  shellClassName?: string;
}) {
  const detailQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping,
  });
  const readError = detailQuery.error;
  const failureKind = classifyConnectFailure(readError);
  const routeHref = `/${owner}/${projectName}`;

  if (failureKind === "forbidden") {
    return <ForbiddenPage href={routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={routeHref} />;
  }
  if (readError) {
    return <BadRequestPage href={routeHref} />;
  }
  if (bootstrapping || !detailQuery.data) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }

  const detail = toProjectContainerView(detailQuery.data);
  return (
    <main className={shellClassName ? `app-shell ${shellClassName}` : "app-shell"}>
      <ProjectHeader detail={detail} runtimeConfig={runtimeConfig} />
      <ProjectMenu
        activeMenu={activeMenu}
        detail={detail}
        keymapMode={keymapMode}
        runtimeConfig={runtimeConfig}
      />
      <div className="page-wrap-outer">
        <Outlet />
      </div>
    </main>
  );
}

export function useProjectLayoutRouteContext() {
  return Route.useRouteContext();
}

function legacyAdminAliasPath(owner: string, projectName: string): string | null {
  if (owner !== "admin") {
    return null;
  }

  switch (projectName) {
    case "projects":
      return "/sites/projectList";
    case "users":
      return "/sites/userList";
    case "mail":
      return "/sites/mail";
    case "site":
      return "/sites/data";
    case "sql":
      return "/sites/diagnostic";
    default:
      return null;
  }
}

export function ProjectDetailRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const href = useCurrentHref();
  const {
    bootstrapping,
    csrfToken,
    currentSession,
    messages,
    refreshWorkspace,
    runtimeConfig,
    setErrorMessage,
  } = useAppRuntime();
  const detailQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping,
  });
  const postsQuery = useQuery({
    ...listProjectPostsQueryOptions(runtimeConfig, {
      ownerName: owner,
      pageNum: 1,
      projectName,
    }),
    enabled: !bootstrapping,
  });
  const readError = detailQuery.error ?? postsQuery.error;
  const failureKind = classifyConnectFailure(readError);

  if (failureKind === "forbidden") {
    return <ForbiddenPage href={href} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={href} />;
  }
  if (readError) {
    return <BadRequestPage href={href} />;
  }

  return (
    <ProjectDetailPage
      detail={detailQuery.data ? toProjectContainerView(detailQuery.data) : null}
      readmePost={postsQuery.data?.readme ?? null}
      routeHref={href}
      runtimeConfig={runtimeConfig}
      onCancelEnrollProject={async (nextOwnerName, nextProjectName) => {
        try {
          await cancelEnrollProject(runtimeConfig, csrfToken, nextOwnerName, nextProjectName);
          await detailQuery.refetch();
          if (currentSession && !currentSession.isAnonymous) {
            await refreshWorkspace(currentSession);
          }
        } catch (error) {
          setErrorMessage(legacyProjectEnrollFallback(error));
        }
      }}
      onEnrollProject={async (nextOwnerName, nextProjectName) => {
        try {
          await enrollProject(runtimeConfig, csrfToken, nextOwnerName, nextProjectName);
          await detailQuery.refetch();
          if (currentSession && !currentSession.isAnonymous) {
            await refreshWorkspace(currentSession);
          }
        } catch (error) {
          setErrorMessage(legacyProjectEnrollFallback(error));
        }
      }}
      onLeaveProject={async (nextOwnerName, nextProjectName, userId) => {
        try {
          const response = await deleteProjectMemberRest(runtimeConfig, csrfToken, {
            ownerName: nextOwnerName,
            projectName: nextProjectName,
            userId,
          });
          if (currentSession && !currentSession.isAnonymous) {
            await refreshWorkspace(currentSession);
          }
          navigateToAppHref(runtimeConfig.basePath, response.redirectPath ?? "/");
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : messages("error.badrequest", { fallback: "error.badrequest" }),
          );
        }
      }}
      onToggleFavoriteProject={async (nextOwnerName, nextProjectName) => {
        try {
          await toggleFavoriteProject(runtimeConfig, csrfToken, nextOwnerName, nextProjectName);
          await detailQuery.refetch();
          if (currentSession && !currentSession.isAnonymous) {
            await refreshWorkspace(currentSession);
          }
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : messages("error.badrequest", { fallback: "error.badrequest" }),
          );
        }
      }}
      onToggleProjectWatch={async (nextOwnerName, nextProjectName, watching) => {
        try {
          await toggleProjectWatch(
            runtimeConfig,
            csrfToken,
            nextOwnerName,
            nextProjectName,
            watching,
          );
          await detailQuery.refetch();
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : messages("error.badrequest", { fallback: "error.badrequest" }),
          );
        }
      }}
      onUpdateProjectOverview={async (nextOwnerName, nextProjectName, overview) => {
        try {
          await updateProjectOverview(runtimeConfig, csrfToken, {
            overview,
            ownerName: nextOwnerName,
            projectName: nextProjectName,
          });
          await detailQuery.refetch();
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : messages("error.badrequest", { fallback: "error.badrequest" }),
          );
        }
      }}
    />
  );
}
