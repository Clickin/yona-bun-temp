import { createFileRoute } from "@tanstack/react-router";
import { CodeBrowserRouteView } from "./-code-route";

export const Route = createFileRoute("/$owner/$projectName/code/")({
  component: CodeBrowserIndexRouteComponent,
});

function CodeBrowserIndexRouteComponent() {
  const { owner, projectName } = Route.useParams();
  return <CodeBrowserRouteView owner={owner} projectName={projectName} />;
}
