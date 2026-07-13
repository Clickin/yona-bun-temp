import { createFileRoute } from "@tanstack/react-router";
import { ProjectPullRequestChangesPage } from "../changes";

export const Route = createFileRoute(
  "/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes/$commitId",
)({
  component: ProjectPullRequestSpecificChangeRoute,
});

function ProjectPullRequestSpecificChangeRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { commitId } = Route.useParams();

  return <ProjectPullRequestChangesPage commitId={commitId} runtimeConfig={runtimeConfig} />;
}
