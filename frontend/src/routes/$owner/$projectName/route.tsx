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
      messages={messages}
      owner={owner}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
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
): { activeMenu: "issue" | "settings" } | null {
  const appPath = stripProjectLayoutBasePath(pathname, basePath).replace(/\/+$/u, "");
  if (appPath === `/${owner}/${projectName}/settingform`) {
    return { activeMenu: "settings" };
  }
  if (
    appPath === `/${owner}/${projectName}/issueform` ||
    isIssueEditFormPath(appPath, owner, projectName)
  ) {
    return { activeMenu: "issue" };
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

function ProjectRouteShellLayout({
  activeMenu,
  bootstrapping,
  messages,
  owner,
  projectName,
  runtimeConfig,
}: {
  activeMenu: "issue" | "settings";
  bootstrapping: boolean;
  messages: ReturnType<typeof useAppRuntime>["messages"];
  owner: string;
  projectName: string;
  runtimeConfig: ReturnType<typeof useAppRuntime>["runtimeConfig"];
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
    <main className="app-shell">
      <ProjectHeader detail={detail} runtimeConfig={runtimeConfig} />
      <ProjectMenu activeMenu={activeMenu} detail={detail} runtimeConfig={runtimeConfig} />
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
