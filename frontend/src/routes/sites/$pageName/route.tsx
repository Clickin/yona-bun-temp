import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../../-shared";

export const Route = createFileRoute("/sites/$pageName")({
  component: SiteAdminRouteComponent,
});

function SiteAdminRouteComponent() {
  const { pageName } = Route.useParams();
  return <PlaceholderPage href={`/sites/${pageName}`} title="Site Admin" />;
}
