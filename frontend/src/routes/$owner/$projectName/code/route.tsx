import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$owner/$projectName/code")({
  component: CodeBrowserRouteComponent,
});

function CodeBrowserRouteComponent() {
  return <Outlet />;
}
