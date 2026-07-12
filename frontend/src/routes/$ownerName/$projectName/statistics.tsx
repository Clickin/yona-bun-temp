import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { LegacyI18nProvider } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import type { RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader } from "../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/statistics")({
  component: ProjectStatisticsRoute,
});

function ProjectStatisticsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectStatisticsRouteShell runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectStatisticsRouteShell({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const project = projectQuery.data;

  if (!project) {
    return null;
  }

  const projectSearchScope = {
    organizationName: projectSearchScopeOrganizationName(project, ownerName),
    ownerName,
    projectName,
  };

  return (
    <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
      <title>{`statistics - ${ownerName}/${projectName}`}</title>
      <ProjectStatisticsScreen project={project} />
    </SiteLayoutShell>
  );
}

function ProjectStatisticsScreen({ project }: { project: ProjectContainer }) {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <h1>Under Construction</h1>
        </div>
      </div>
    </>
  );
}

function stringField(value: unknown, fallback: string) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return fallback;
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return projectIsProtected(project) ? ownerName : undefined;
}

function projectIsProtected(project: ProjectContainer) {
  return (
    project.isProtected === true ||
    project.isProtected === "true" ||
    project.isProtected === 1 ||
    project.isProtected === "1" ||
    stringField(project.projectScope, "") === "protected"
  );
}
