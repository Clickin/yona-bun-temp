import { createFileRoute } from "@tanstack/react-router";
import { ProjectIssuesScreen, validateProjectIssuesSearch } from "./issues";

export const Route = createFileRoute("/$ownerName/$projectName/go")({
  component: ProjectGoRoute,
  validateSearch(search) {
    return search;
  },
});

function ProjectGoRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();
  return (
    <ProjectIssuesScreen
      ownerName={ownerName}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
      search={validateProjectIssuesSearch(Route.useSearch())}
    />
  );
}
