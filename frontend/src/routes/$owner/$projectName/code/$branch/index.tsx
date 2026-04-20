import { createFileRoute } from "@tanstack/react-router";
import { CodeBrowserRouteView } from "../-code-route";

export const Route = createFileRoute("/$owner/$projectName/code/$branch/")({
  component: CodeBrowserBranchIndexRouteComponent,
});

function CodeBrowserBranchIndexRouteComponent() {
  const { branch, owner, projectName } = Route.useParams();
  return <CodeBrowserRouteView branch={branch} owner={owner} projectName={projectName} />;
}
