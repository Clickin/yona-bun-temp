import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../../../-shared";

export const Route = createFileRoute("/organizations/$organizationName/boards")({
  component: OrganizationBoardsRouteComponent,
});

function OrganizationBoardsRouteComponent() {
  const { organizationName } = Route.useParams();
  return <PlaceholderPage href={`/organizations/${organizationName}/boards`} title="Organization Boards" />;
}
