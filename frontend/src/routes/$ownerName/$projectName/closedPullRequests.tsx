import { createFileRoute } from "@tanstack/react-router";
import { ProjectPullRequestsScreen, validateProjectPullRequestsSearch } from "./pullRequests";

export const Route = createFileRoute("/$ownerName/$projectName/closedPullRequests")({
  component: ProjectClosedPullRequestsRoute,
  validateSearch: validateProjectPullRequestsSearch,
});

function ProjectClosedPullRequestsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();

  return (
    <ProjectPullRequestsScreen
      category="closed"
      ownerName={ownerName}
      projectName={projectName}
      renderProjectShell={false}
      requestType="closed"
      runtimeConfig={runtimeConfig}
      search={search}
    />
  );
}
