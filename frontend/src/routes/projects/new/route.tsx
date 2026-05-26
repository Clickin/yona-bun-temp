import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../../app-runtime-context";
import { RedirectPage, useRequireAuthenticatedRoute } from "../../-shared";

export const Route = createFileRoute("/projects/new")({
  component: ProjectsNewRouteComponent,
});

function ProjectsNewRouteComponent() {
  const { bootstrapping, runtimeConfig } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/projects/new");

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }

  const owner =
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("owner") || "";
  const query = owner ? `?owner=${encodeURIComponent(owner)}` : "";

  return <RedirectPage basePath={runtimeConfig.basePath} to={`/projectform${query}`} />;
}
