import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { WorkspacePage } from "../-workspace-views";
import { useRequireAuthenticatedRoute } from "../-shared";

export const Route = createFileRoute("/me")({
  component: MeRouteComponent,
});

function MeRouteComponent() {
  const { bootstrapping, messages, runtimeConfig, workspaceOverview } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/me");
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const basePathPrefix =
    runtimeConfig.basePath === "/" ? "" : runtimeConfig.basePath.replace(/\/$/u, "");

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }

  if (pathname.startsWith(`${basePathPrefix}/me/settings/`)) {
    return <Outlet />;
  }

  return (
    <WorkspacePage
      messages={messages}
      runtimeConfig={runtimeConfig}
      workspaceOverview={workspaceOverview}
    />
  );
}
