import { createFileRoute } from "@tanstack/react-router";
import { ProjectCodeBranchHistoryIndexScreen } from "../$branch";

export const Route = createFileRoute("/$ownerName/$projectName/commits/$branch/")({
  component: ProjectCodeBranchHistoryIndexRoute,
  validateSearch(search) {
    const page = typeof search.page === "number" ? search.page : Number(search.page);
    return Number.isFinite(page) && page > 0 ? { page } : {};
  },
});

function ProjectCodeBranchHistoryIndexRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectCodeBranchHistoryIndexScreen runtimeConfig={runtimeConfig} />;
}
