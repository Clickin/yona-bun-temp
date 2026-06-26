import { createFileRoute } from "@tanstack/react-router";
import { SearchRoutePage } from "../../../-search-views";

export const Route = createFileRoute("/organizations/$organizationName/search")({
  component: OrganizationSearchRouteComponent,
});

function OrganizationSearchRouteComponent() {
  const { organizationName } = Route.useParams();
  return <SearchRoutePage renderShell={false} scope={{ organizationName, type: "organization" }} />;
}
