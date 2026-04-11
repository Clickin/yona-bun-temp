import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/code")({
  component: CodeBrowserRouteComponent,
});

function CodeBrowserRouteComponent() {
  const { owner, projectName } = Route.useParams();
  return <PlaceholderPage href={`/${owner}/${projectName}/code`} title="Code" />;
}
