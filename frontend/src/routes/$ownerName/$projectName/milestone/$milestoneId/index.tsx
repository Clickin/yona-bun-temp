import { createFileRoute } from "@tanstack/react-router";
import { ProjectMilestoneDetailIndexScreen } from "../$milestoneId";

export const Route = createFileRoute("/$ownerName/$projectName/milestone/$milestoneId/")({
  component: ProjectMilestoneDetailIndexRoute,
});

function ProjectMilestoneDetailIndexRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectMilestoneDetailIndexScreen runtimeConfig={runtimeConfig} />;
}
