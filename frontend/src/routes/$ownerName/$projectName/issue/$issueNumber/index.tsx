import { createFileRoute } from "@tanstack/react-router";
import { ProjectIssueDetailIndexScreen } from "../$issueNumber";

export const Route = createFileRoute("/$ownerName/$projectName/issue/$issueNumber/")({
  component: ProjectIssueDetailIndexRoute,
});

function ProjectIssueDetailIndexRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectIssueDetailIndexScreen runtimeConfig={runtimeConfig} />;
}
