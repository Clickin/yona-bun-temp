import { createFileRoute } from "@tanstack/react-router";
import { SearchRoutePage } from "../../../-search-views";

export const Route = createFileRoute("/$owner/$projectName/search")({
  component: ProjectSearchRouteComponent,
});

function ProjectSearchRouteComponent() {
  const { owner, projectName } = Route.useParams();
  return (
    <SearchRoutePage
      renderShell={false}
      scope={{ ownerName: owner, projectName, type: "project" }}
    />
  );
}
