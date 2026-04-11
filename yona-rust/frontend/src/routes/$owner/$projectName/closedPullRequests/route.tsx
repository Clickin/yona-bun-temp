import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/closedPullRequests")({
  component: ClosedPullRequestsRouteComponent,
});

function ClosedPullRequestsRouteComponent() {
  const { owner, projectName } = Route.useParams();
  return <PlaceholderPage href={`/${owner}/${projectName}/closedPullRequests`} title="Pull Requests" />;
}
