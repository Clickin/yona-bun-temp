import * as React from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import {
  cancelEnrollProject,
  enrollProject,
  readProjectContainer,
  toggleFavoriteProject,
  toggleProjectWatch,
  updateProjectOverview,
} from "../../../auth-workspace-client";
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
  const { csrfToken, currentSession, refreshWorkspace, runtimeConfig, setErrorMessage } = useAppRuntime();
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(null);

  const refreshContainer = React.useCallback(async (nextOwnerName: string, nextProjectName: string) => {
    const nextDetail = await readProjectContainer(runtimeConfig, nextOwnerName, nextProjectName);
    setDetail(toProjectContainerView(nextDetail));
  }, [runtimeConfig]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const nextDetail = await readProjectContainer(runtimeConfig, owner, projectName);
      if (!cancelled) {
        setDetail(toProjectContainerView(nextDetail));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [owner, projectName, runtimeConfig]);

  return (
    <ProjectDetailPage
      detail={detail}
      runtimeConfig={runtimeConfig}
      onCancelEnrollProject={async (nextOwnerName, nextProjectName) => {
        try {
          await cancelEnrollProject(runtimeConfig, csrfToken, nextOwnerName, nextProjectName);
          await refreshContainer(nextOwnerName, nextProjectName);
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
          await refreshContainer(nextOwnerName, nextProjectName);
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
          await refreshContainer(nextOwnerName, nextProjectName);
          if (currentSession && !currentSession.isAnonymous) {
            await refreshWorkspace(currentSession);
          }
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Toggle favorite failed.");
        }
      }}
      onToggleProjectWatch={async (nextOwnerName, nextProjectName, watching) => {
        try {
          const nextDetail = await toggleProjectWatch(
            runtimeConfig,
            csrfToken,
            nextOwnerName,
            nextProjectName,
            watching,
          );
          setDetail(toProjectContainerView(nextDetail));
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Toggle watch failed.");
        }
      }}
      onUpdateProjectOverview={async (nextOwnerName, nextProjectName, overview) => {
        try {
          const nextDetail = await updateProjectOverview(runtimeConfig, csrfToken, {
            overview,
            ownerName: nextOwnerName,
            projectName: nextProjectName,
          });
          setDetail(toProjectContainerView(nextDetail));
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Update overview failed.");
        }
      }}
    />
  );
}
