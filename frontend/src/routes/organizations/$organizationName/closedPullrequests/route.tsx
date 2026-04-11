import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../../../-shared";

export const Route = createFileRoute("/organizations/$organizationName/closedPullrequests")({
  component: OrganizationClosedPullRequestsRouteComponent,
});

function OrganizationClosedPullRequestsRouteComponent() {
  const { organizationName } = Route.useParams();
  return <PlaceholderPage href={`/organizations/${organizationName}/closedPullrequests`} title="Organization Pull Requests" />;
}
