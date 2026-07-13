import { createFileRoute } from "@tanstack/react-router";
import { ProjectPullRequestChangesPage } from "../changes";

export const Route = createFileRoute(
  "/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes/",
)({
  component: ProjectPullRequestChangesIndexRoute,
});

function ProjectPullRequestChangesIndexRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <ProjectPullRequestChangesPage runtimeConfig={runtimeConfig} />;
}
