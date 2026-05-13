import { createFileRoute } from "@tanstack/react-router";
import { CodeHistoryRouteView } from "../-code-history-route";

export const Route = createFileRoute("/$owner/$projectName/commits/$branch/")({
  component: CodeHistoryBranchIndexRouteComponent,
});

function CodeHistoryBranchIndexRouteComponent() {
  const { branch, owner, projectName } = Route.useParams();
  return <CodeHistoryRouteView branch={branch} owner={owner} projectName={projectName} />;
}
