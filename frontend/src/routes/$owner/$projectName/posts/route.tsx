import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/posts")({
  component: ProjectBoardsRouteComponent,
});

function ProjectBoardsRouteComponent() {
  const { owner, projectName } = Route.useParams();
  return <PlaceholderPage href={`/${owner}/${projectName}/posts`} title="Boards" />;
}
