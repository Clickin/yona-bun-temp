import { createFileRoute } from "@tanstack/react-router";
import { ProjectCodeBranchHistoryRouteFrame } from "../../commits";
import { ProjectCodeFileHistoryRouteFrame } from "./$filePath";

export const Route = createFileRoute("/$ownerName/$projectName/commits/$branch/$")({
  component: ProjectCodeNestedFileHistoryRoute,
  validateSearch(search) {
    const page = typeof search.page === "number" ? search.page : Number(search.page);
    return Number.isFinite(page) && page > 0 ? { page } : {};
  },
});

function ProjectCodeNestedFileHistoryRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { _splat, branch, ownerName, projectName } = Route.useParams();
  const { page = 0 } = Route.useSearch();

  if (_splat === "" || _splat === "/") {
    return (
      <ProjectCodeBranchHistoryRouteFrame
        page={page}
        routeParams={{ branch, ownerName, projectName }}
        runtimeConfig={runtimeConfig}
      />
    );
  }

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
