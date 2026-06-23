import { useQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import {
  cancelEnrollProject,
  enrollProject,
  toggleFavoriteProject,
  toggleProjectWatch,
  updateProjectOverview,
} from "../../../auth-workspace-client";
import { listProjectPostsQueryOptions } from "../../../api/boards";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import { RestApiError } from "../../../api/rest-client";
import { useAppRuntime } from "../../../app-runtime-context";
import { toProjectContainerView } from "../../../app-view-models";
import { ProjectDetailPage } from "../../-project-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
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
  return <Outlet />;
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
