import { createFileRoute } from "@tanstack/react-router";
import { ProjectForkRouteContent } from "../newFork";

export const Route = createFileRoute("/$ownerName/$projectName/newFork/$forkOwnerName")({
  component: ProjectForkOwnerRoute,
});

function ProjectForkOwnerRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { forkOwnerName, ownerName, projectName } = Route.useParams();

  return (
    <ProjectForkRouteContent
      key={`${ownerName}/${projectName}/${forkOwnerName}`}
      forkOwnerName={forkOwnerName}
      ownerName={ownerName}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
    />
  );
}
