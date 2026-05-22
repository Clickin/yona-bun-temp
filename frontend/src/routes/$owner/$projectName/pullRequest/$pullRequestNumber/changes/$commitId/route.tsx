import { createFileRoute } from "@tanstack/react-router";
import { PullRequestChangesRouteContent } from "../route";

export const Route = createFileRoute(
  "/$owner/$projectName/pullRequest/$pullRequestNumber/changes/$commitId",
)({
  component: PullRequestSpecificChangeRouteComponent,
});

function PullRequestSpecificChangeRouteComponent() {
  const { commitId, owner, projectName, pullRequestNumber } = Route.useParams();
  return (
    <PullRequestChangesRouteContent
      owner={owner}
      projectName={projectName}
      pullRequestNumber={pullRequestNumber}
      selectedCommitId={commitId}
    />
  );
}
