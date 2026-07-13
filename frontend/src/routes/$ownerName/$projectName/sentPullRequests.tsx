import { createFileRoute } from "@tanstack/react-router";
import { ProjectPullRequestsScreen, type ProjectPullRequestsSearch } from "./pullRequests";

export const Route = createFileRoute("/$ownerName/$projectName/sentPullRequests")({
  component: ProjectSentPullRequestsRoute,
  validateSearch: validateSentPullRequestsSearch,
});

type SentPullRequestsSearch = Partial<ProjectPullRequestsSearch>;

function validateSentPullRequestsSearch(search: Record<string, unknown>): SentPullRequestsSearch {
  const filter = typeof search.filter === "string" ? search.filter : "";
  const contributorId = Number(search.contributorId) || 0;
  const pageNum = Number(search.pageNum) || 1;

  return {
    ...(filter ? { filter } : {}),
    ...(contributorId ? { contributorId } : {}),
    ...(pageNum > 1 ? { pageNum } : {}),
  };
}

function ProjectSentPullRequestsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();
  const routeSearch = Route.useSearch();
  const search: ProjectPullRequestsSearch = {
    contributorId: routeSearch.contributorId ?? 0,
    filter: routeSearch.filter ?? "",
    pageNum: routeSearch.pageNum ?? 1,
  };

  return (
    <ProjectPullRequestsScreen
      category="sent"
      ownerName={ownerName}
      projectName={projectName}
      renderProjectShell={false}
      requestType="sent"
      runtimeConfig={runtimeConfig}
      search={search}
    />
  );
}
