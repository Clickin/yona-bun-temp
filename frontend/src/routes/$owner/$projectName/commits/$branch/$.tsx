import { createFileRoute } from "@tanstack/react-router";
import { CodeHistoryRouteView } from "../-code-history-route";

export const Route = createFileRoute("/$owner/$projectName/commits/$branch/$")({
  component: CodeHistoryPathRouteComponent,
});

function CodeHistoryPathRouteComponent() {
  const { _splat, branch, owner, projectName } = Route.useParams();
  return (
    <CodeHistoryRouteView
      branch={branch}
      owner={owner}
      path={_splat ?? ""}
      projectName={projectName}
    />
  );
}
