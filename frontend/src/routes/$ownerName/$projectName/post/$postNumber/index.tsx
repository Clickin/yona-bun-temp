import { createFileRoute } from "@tanstack/react-router";
import { ProjectPostDetailIndexScreen } from "../$postNumber";

export const Route = createFileRoute("/$ownerName/$projectName/post/$postNumber/")({
  component: ProjectPostDetailIndexRoute,
});

function ProjectPostDetailIndexRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectPostDetailIndexScreen runtimeConfig={runtimeConfig} />;
}
