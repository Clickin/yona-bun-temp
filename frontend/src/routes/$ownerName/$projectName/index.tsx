import { createFileRoute } from "@tanstack/react-router";
import { use } from "react";
import { ProjectHomeBody, ProjectLayoutContext } from "../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/")({
  component: ProjectIndexRoute,
});

function ProjectIndexRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { tabId } = Route.useSearch();
  const project = use(ProjectLayoutContext);

  return project ? (
    <ProjectHomeBody project={project} runtimeConfig={runtimeConfig} tabId={tabId || "readme"} />
  ) : null;
}
