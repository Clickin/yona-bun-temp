import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$owner/$projectName/commits/$branch")({
  component: CodeHistoryBranchRouteComponent,
});

function CodeHistoryBranchRouteComponent() {
  return <Outlet />;
}
