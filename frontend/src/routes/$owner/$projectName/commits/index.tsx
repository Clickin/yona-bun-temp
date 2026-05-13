import { createFileRoute } from "@tanstack/react-router";
import { CodeHistoryRouteView } from "./-code-history-route";

export const Route = createFileRoute("/$owner/$projectName/commits/")({
  component: CodeHistoryIndexRouteComponent,
});

function CodeHistoryIndexRouteComponent() {
  const { owner, projectName } = Route.useParams();
  return <CodeHistoryRouteView owner={owner} projectName={projectName} />;
}
