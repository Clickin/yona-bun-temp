import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { ProjectCodeBranchHistoryRouteFrame } from "../commits";

type ProjectCodeHistorySearch = {
  page?: number;
};

export const Route = createFileRoute("/$ownerName/$projectName/commits/$branch")({
  component: ProjectCodeHistoryRoute,
  validateSearch(search): ProjectCodeHistorySearch {
    const page = typeof search.page === "number" ? search.page : Number(search.page);
    return Number.isFinite(page) && page > 0 ? { page } : {};
  },
});

function ProjectCodeHistoryRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { branch, ownerName, projectName } = Route.useParams();
  const { page = 0 } = Route.useSearch();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isProjectCodeHistoryRoot =
    pathname === `/${ownerName}/${projectName}/commits/${encodeURIComponent(branch)}`;

  if (!isProjectCodeHistoryRoot) {
    return <Outlet />;
  }

  return (
    <ProjectCodeBranchHistoryRouteFrame
      page={page}
      routeParams={{ branch, ownerName, projectName }}
      runtimeConfig={runtimeConfig}
    />
  );
}
