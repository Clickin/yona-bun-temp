import { createFileRoute, redirect } from "@tanstack/react-router";
import { ProjectCodeFileRouteFrame } from "./$filePath";

export const Route = createFileRoute("/$ownerName/$projectName/code/$branch/$")({
  beforeLoad: ({ location, params }) => {
    const isEmptySplat = params._splat === "" || params._splat === "/";
    const needsCanonicalRedirect = location.pathname.endsWith("/");
    if (isEmptySplat && needsCanonicalRedirect) {
      throw redirect({
        params: {
          branch: params.branch,
          ownerName: params.ownerName,
          projectName: params.projectName,
        },
        replace: true,
        statusCode: 303,
        to: "/$ownerName/$projectName/code/$branch",
      });
    }
  },
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
