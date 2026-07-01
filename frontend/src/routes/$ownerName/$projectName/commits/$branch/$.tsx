import { createFileRoute } from "@tanstack/react-router";
import { ProjectCodeFileHistoryRouteFrame } from "./$filePath";

export const Route = createFileRoute("/$ownerName/$projectName/commits/$branch/$")({
  component: ProjectCodeNestedFileHistoryRoute,
  validateSearch(search) {
    return {
      page: typeof search.page === "number" ? search.page : Number(search.page ?? 0) || 0,
    };
  },
});

function ProjectCodeNestedFileHistoryRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { _splat, branch, ownerName, projectName } = Route.useParams();
  const { page } = Route.useSearch();

  return (
    <ProjectCodeFileHistoryRouteFrame
      page={page}
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
