import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../../../-shared";

export const Route = createFileRoute("/organizations/$organizationName/issues")({
  component: OrganizationIssuesRouteComponent,
});

function OrganizationIssuesRouteComponent() {
  const { organizationName } = Route.useParams();
  return <PlaceholderPage href={`/organizations/${organizationName}/issues`} title="Organization Issues" />;
}
