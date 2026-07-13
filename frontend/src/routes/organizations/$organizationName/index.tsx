import { createFileRoute } from "@tanstack/react-router";
import { OrganizationHomeIndexScreen } from "../$organizationName";

export const Route = createFileRoute("/organizations/$organizationName/")({
  component: OrganizationHomeIndexRoute,
});

function OrganizationHomeIndexRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <OrganizationHomeIndexScreen runtimeConfig={runtimeConfig} />;
}
