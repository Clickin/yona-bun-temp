import { createFileRoute } from "@tanstack/react-router";
import { ProjectCodeHistoryIndexScreen } from "../commits";

export const Route = createFileRoute("/$ownerName/$projectName/commits/")({
  component: ProjectCodeHistoryIndexRoute,
});

function ProjectCodeHistoryIndexRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectCodeHistoryIndexScreen runtimeConfig={runtimeConfig} />;
}
