import { createFileRoute } from "@tanstack/react-router";
import { CodeBrowserRouteView } from "../-code-route";

export const Route = createFileRoute("/$owner/$projectName/code/$branch/$")({
  component: CodeBrowserPathRouteComponent,
});

function CodeBrowserPathRouteComponent() {
  const params = Route.useParams() as {
    _splat?: string;
    branch: string;
    owner: string;
    projectName: string;
  };
  return (
    <CodeBrowserRouteView
      branch={params.branch}
      owner={params.owner}
      path={params._splat ?? ""}
      projectName={params.projectName}
    />
  );
}
