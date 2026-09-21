import { createFileRoute } from "@tanstack/react-router";
import type { RuntimeConfig } from "../../../../runtime-config";
import { LastOutletTransition } from "../../../-last-outlet-transition";
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
  return <LastOutletTransition routeId={Route.id} />;
}

export function ProjectCodeBranchHistoryIndexScreen({
  runtimeConfig,
}: {
  runtimeConfig: RuntimeConfig;
}) {
  const { branch, ownerName, projectName } = Route.useParams();
  return (
    <ProjectCodeBranchHistoryRouteFrame
      page={Route.useSearch().page ?? 0}
      routeParams={{ branch, ownerName, projectName }}
      runtimeConfig={runtimeConfig}
    />
  );
}
