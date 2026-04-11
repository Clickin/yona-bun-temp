import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/pullRequest/$pullRequestNumber")({
  component: PullRequestDetailRouteComponent,
});

function PullRequestDetailRouteComponent() {
  const { owner, projectName, pullRequestNumber } = Route.useParams();
  return (
    <PlaceholderPage
      href={`/${owner}/${projectName}/pullRequest/${pullRequestNumber}`}
      title="Pull Request"
    />
  );
}
