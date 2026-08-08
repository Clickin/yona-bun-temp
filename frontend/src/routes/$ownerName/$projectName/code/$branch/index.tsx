import { createFileRoute } from "@tanstack/react-router";
import { ProjectCodeBranchIndexScreen } from "../$branch";

export const Route = createFileRoute("/$ownerName/$projectName/code/$branch/")({
  component: ProjectCodeBranchIndexRoute,
});

function ProjectCodeBranchIndexRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectCodeBranchIndexScreen runtimeConfig={runtimeConfig} />;
}
