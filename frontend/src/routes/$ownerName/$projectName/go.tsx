import { createFileRoute, Navigate } from "@tanstack/react-router";
import { use } from "react";
import { ProjectLayoutContext } from "../$projectName";
import { ProjectIssuesScreen, validateProjectIssuesSearch } from "./issues";

export const Route = createFileRoute("/$ownerName/$projectName/go")({
  component: ProjectGoRoute,
  validateSearch(search) {
    return search;
  },
});

function ProjectGoRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();
  const project = use(ProjectLayoutContext);
  const search = validateProjectIssuesSearch(Route.useSearch());
  if (!project) return null;
  if ((project.menuSetting?.issue ?? project.showIssue) === false) {
    return (project.menuSetting?.board ?? project.showBoard) === false ? (
      <Navigate to="/$ownerName/$projectName" params={{ ownerName, projectName }} replace />
    ) : (
      <Navigate
        to="/$ownerName/$projectName/posts"
        params={{ ownerName, projectName }}
        search={{ pageNum: search.pageNum }}
        replace
      />
    );
  }
  return (
    <ProjectIssuesScreen
      ownerName={ownerName}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
      search={search}
    />
  );
}
