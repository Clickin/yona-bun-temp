import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { LegacyI18nProvider } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import type { RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import {
  ProjectPullRequestsScreen,
  type ProjectPullRequestsSearch,
  validateProjectPullRequestsSearch,
} from "./pullRequests";

export const Route = createFileRoute("/$ownerName/$projectName/sentPullRequests")({
  component: ProjectSentPullRequestsRoute,
  validateSearch: validateProjectPullRequestsSearch,
});

function ProjectSentPullRequestsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectSentPullRequestsRouteShell
          ownerName={ownerName}
          projectName={projectName}
          runtimeConfig={runtimeConfig}
          search={search}
        />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectSentPullRequestsRouteShell({
  ownerName,
  projectName,
  runtimeConfig,
  search,
}: {
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  search: ProjectPullRequestsSearch;
}) {
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!projectQuery.data) {
    return null;
  }

  const projectSearchScope = {
    organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
    ownerName,
    projectName,
  };

  return (
    <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
      <ProjectPullRequestsScreen
        category="sent"
        ownerName={ownerName}
        project={projectQuery.data}
        projectName={projectName}
        requestType="sent"
        runtimeConfig={runtimeConfig}
        search={search}
      />
    </SiteLayoutShell>
  );
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName =
    typeof project.organizationName === "string" ? project.organizationName.trim() : "";
  if (organizationName) {
    return organizationName;
  }
  return project.isProtected === true ? ownerName : undefined;
}
