import { createFileRoute, redirect } from "@tanstack/react-router";
import { ProjectCodeFileRouteFrame } from "./$filePath";

export const Route = createFileRoute("/$ownerName/$projectName/code/$branch/$")({
    beforeLoad: () => undefined,
  component: ProjectCodeNestedFileRoute,
});

function ProjectCodeNestedFileRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { _splat, branch, ownerName, projectName } = Route.useParams();

  return (
    <ProjectCodeFileRouteFrame
      routeParams={{
        branch,
        filePath: _splat ?? "",
        ownerName,
        projectName,
      }}
      runtimeConfig={runtimeConfig}
    />
  );
}
