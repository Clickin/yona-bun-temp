import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../../../../../-shared";

export const Route = createFileRoute(
  "/$owner/$projectName/pullRequest/$pullRequestNumber/editform",
)({
  component: PullRequestEditFormRouteComponent,
});

function PullRequestEditFormRouteComponent() {
  const { owner, projectName, pullRequestNumber } = Route.useParams();
  return (
    <PlaceholderPage
      href={`/${owner}/${projectName}/pullRequest/${pullRequestNumber}/editform`}
      title="Pull Request"
    />
  );
}
