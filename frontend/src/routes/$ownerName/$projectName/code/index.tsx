import { createFileRoute } from "@tanstack/react-router";
import { ProjectCodeIndexScreen } from "../code";

export const Route = createFileRoute("/$ownerName/$projectName/code/")({
  component: ProjectCodeIndexRoute,
});

function ProjectCodeIndexRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectCodeIndexScreen runtimeConfig={runtimeConfig} />;
}
