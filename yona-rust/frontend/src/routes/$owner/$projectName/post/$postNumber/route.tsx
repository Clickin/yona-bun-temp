import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/post/$postNumber")({
  component: BoardDetailRouteComponent,
});

function BoardDetailRouteComponent() {
  const { owner, projectName, postNumber } = Route.useParams();
  return <PlaceholderPage href={`/${owner}/${projectName}/post/${postNumber}`} title="Board" />;
}
