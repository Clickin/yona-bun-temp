import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$owner/$projectName/code/$branch")({
  component: CodeBrowserBranchRouteComponent,
});

function CodeBrowserBranchRouteComponent() {
  return <Outlet />;
}
