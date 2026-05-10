import * as React from "react";
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
import { useAppRuntime } from "../../../app-runtime-context";
import { toProjectContainerView } from "../../../app-view-models";
import { ProjectDetailPage } from "../../-project-views";

export const Route = createFileRoute("/$owner/$projectName")({
  component: ProjectLayoutRouteComponent,
});

function ProjectLayoutRouteComponent() {
  return <Outlet />;
}

export function ProjectDetailRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const {
    bootstrapping,
    csrfToken,
    currentSession,
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

  React.useEffect(() => {
    const error = detailQuery.error ?? postsQuery.error;
    if (error) {
      setErrorMessage(error instanceof Error ? error.message : "Read project failed.");
    }
  }, [detailQuery.error, postsQuery.error, setErrorMessage]);

  return (
    <ProjectDetailPage
      detail={detailQuery.data ? toProjectContainerView(detailQuery.data) : null}
      readmePost={postsQuery.data?.readme ?? null}
      runtimeConfig={runtimeConfig}
      onCancelEnrollProject={async (nextOwnerName, nextProjectName) => {
        try {
          await cancelEnrollProject(runtimeConfig, csrfToken, nextOwnerName, nextProjectName);
          await detailQuery.refetch();
          if (currentSession && !currentSession.isAnonymous) {
            await refreshWorkspace(currentSession);
          }
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Cancel enrollment failed.");
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
          setErrorMessage(error instanceof Error ? error.message : "Enroll failed.");
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
          setErrorMessage(error instanceof Error ? error.message : "Toggle favorite failed.");
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
          setErrorMessage(error instanceof Error ? error.message : "Toggle watch failed.");
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
          setErrorMessage(error instanceof Error ? error.message : "Update overview failed.");
        }
      }}
    />
  );
}
