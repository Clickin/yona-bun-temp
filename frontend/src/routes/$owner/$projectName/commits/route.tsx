import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$owner/$projectName/commits")({
  component: CodeHistoryRouteComponent,
});

function CodeHistoryRouteComponent() {
  return <Outlet />;
}
