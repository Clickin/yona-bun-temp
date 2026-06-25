import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { WorkspacePage } from "../-workspace-views";
import { useRequireAuthenticatedRoute } from "../-shared";

export const Route = createFileRoute("/me")({
  component: MeRouteComponent,
});

function MeRouteComponent() {
  const { bootstrapping, messages, runtimeConfig, workspaceOverview } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/me");

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }

  return (
    <WorkspacePage
      messages={messages}
      runtimeConfig={runtimeConfig}
      workspaceOverview={workspaceOverview}
    />
  );
}
