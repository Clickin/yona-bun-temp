import { createFileRoute } from "@tanstack/react-router";
import { OrganizationDetailRouteComponent } from "./route";

export const Route = createFileRoute("/organizations/$organizationName/")({
  component: OrganizationHomeIndexRouteComponent,
});

function OrganizationHomeIndexRouteComponent() {
  return <OrganizationDetailRouteComponent renderShell={false} />;
}
