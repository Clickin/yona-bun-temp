import * as React from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import {
  cancelEnrollProject,
  enrollProject,
  readProjectDetail,
  toggleFavoriteProject,
} from "../../../auth-workspace-client";
import { useAppRuntime } from "../../../app-runtime-context";
import { toProjectDetailView } from "../../../app-view-models";
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
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectDetailView> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const nextDetail = await readProjectDetail(runtimeConfig, owner, projectName);
      if (!cancelled) {
        setDetail(toProjectDetailView(nextDetail));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [owner, projectName, runtimeConfig]);

  return (
    <ProjectDetailPage
      detail={detail}
      members={null}
      onCancelEnrollProject={async (nextOwnerName, nextProjectName) => {
        try {
          await cancelEnrollProject(runtimeConfig, csrfToken, nextOwnerName, nextProjectName);
          const nextDetail = await readProjectDetail(runtimeConfig, nextOwnerName, nextProjectName);
          setDetail(toProjectDetailView(nextDetail));
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
          const nextDetail = await readProjectDetail(runtimeConfig, nextOwnerName, nextProjectName);
          setDetail(toProjectDetailView(nextDetail));
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
          const nextDetail = await readProjectDetail(runtimeConfig, nextOwnerName, nextProjectName);
          setDetail(toProjectDetailView(nextDetail));
          if (currentSession && !currentSession.isAnonymous) {
            await refreshWorkspace(currentSession);
          }
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Toggle favorite failed.");
        }
      }}
    />
  );
}
