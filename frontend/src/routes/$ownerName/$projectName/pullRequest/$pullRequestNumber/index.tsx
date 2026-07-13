import { createFileRoute } from "@tanstack/react-router";
import { ProjectPullRequestOverviewIndexScreen } from "../$pullRequestNumber";

export const Route = createFileRoute("/$ownerName/$projectName/pullRequest/$pullRequestNumber/")({
  component: ProjectPullRequestOverviewIndexRoute,
});

function ProjectPullRequestOverviewIndexRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectPullRequestOverviewIndexScreen runtimeConfig={runtimeConfig} />;
}
