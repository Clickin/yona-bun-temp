import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { codeHistoryQueryOptions } from "../../../../api/code-commits";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import type { RuntimeConfig } from "../../../../runtime-config";
import { ProjectNestedShellContext } from "../../$projectName";
import { ProjectCodeBranchHistoryRouteFrame, ProjectCodeHistoryBody } from "../commits";

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
  const nestedProjectShell = use(ProjectNestedShellContext);
  const isProjectCodeHistoryRoot = new RegExp(
    `^/${ownerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/${projectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/commits/${encodeURIComponent(branch)}/?$`,
  ).test(pathname);

  if (!isProjectCodeHistoryRoot) {
    return <Outlet />;
  }

  if (nestedProjectShell) {
    return <ProjectCodeBranchHistoryNestedRoute page={page} runtimeConfig={runtimeConfig} />;
  }

  return (
    <ProjectCodeBranchHistoryRouteFrame
      page={page}
      routeParams={{ branch, ownerName, projectName }}
      runtimeConfig={runtimeConfig}
    />
  );
}

function ProjectCodeBranchHistoryNestedRoute({
  page,
  runtimeConfig,
}: {
  page: number;
  runtimeConfig: RuntimeConfig;
}) {
  const { branch, ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const historyQuery = useQuery(
    codeHistoryQueryOptions(runtimeConfig, { branch, ownerName, page, projectName }),
  );

  if (!projectQuery.data || !historyQuery.data) return null;

  return (
    <ProjectCodeHistoryBody
      history={historyQuery.data}
      ownerName={ownerName}
      project={projectQuery.data}
      projectName={projectName}
      requestedBranch={branch}
      runtimeConfig={runtimeConfig}
    />
  );
}
