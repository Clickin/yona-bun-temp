import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../../../-shared";

export const Route = createFileRoute("/organizations/$organizationName/pullrequests")({
  component: OrganizationPullRequestsRouteComponent,
});

function OrganizationPullRequestsRouteComponent() {
  const { organizationName } = Route.useParams();
  return <PlaceholderPage href={`/organizations/${organizationName}/pullrequests`} title="Organization Pull Requests" />;
}
