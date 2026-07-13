import { createFileRoute } from "@tanstack/react-router";
import { ProjectForkRouteContent } from "../newFork";

export const Route = createFileRoute("/$ownerName/$projectName/newFork/")({
  component: ProjectForkIndexRoute,
});

function ProjectForkIndexRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();

  return (
    <ProjectForkRouteContent
      ownerName={ownerName}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
    />
  );
}
