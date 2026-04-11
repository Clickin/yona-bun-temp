import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/sentPullRequests")({
  component: SentPullRequestsRouteComponent,
});

function SentPullRequestsRouteComponent() {
  const { owner, projectName } = Route.useParams();
  return <PlaceholderPage href={`/${owner}/${projectName}/sentPullRequests`} title="Pull Requests" />;
}
