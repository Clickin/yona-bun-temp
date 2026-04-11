import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/pullRequests")({
  component: PullRequestsRouteComponent,
});

function PullRequestsRouteComponent() {
  const { owner, projectName } = Route.useParams();
  return <PlaceholderPage href={`/${owner}/${projectName}/pullRequests`} title="Pull Requests" />;
}
