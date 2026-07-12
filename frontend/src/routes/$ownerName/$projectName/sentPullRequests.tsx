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
  ProjectPullRequestsBadRequestRouteShell,
  type ProjectPullRequestsSearch,
} from "./pullRequests";

export const Route = createFileRoute("/$ownerName/$projectName/sentPullRequests")({
  component: ProjectSentPullRequestsRoute,
  validateSearch: validateSentPullRequestsSearch,
});

type SentPullRequestsSearch = Partial<ProjectPullRequestsSearch>;

function validateSentPullRequestsSearch(search: Record<string, unknown>): SentPullRequestsSearch {
  const filter = typeof search.filter === "string" ? search.filter : "";
  const contributorId = Number(search.contributorId) || 0;
  const pageNum = Number(search.pageNum) || 1;

  return {
    ...(filter ? { filter } : {}),
    ...(contributorId ? { contributorId } : {}),
    ...(pageNum > 1 ? { pageNum } : {}),
  };
}

function ProjectSentPullRequestsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();
  const routeSearch = Route.useSearch();
  const search: ProjectPullRequestsSearch = {
    contributorId: routeSearch.contributorId ?? 0,
    filter: routeSearch.filter ?? "",
    pageNum: routeSearch.pageNum ?? 1,
  };

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

  if (projectQuery.data.vcs !== "GIT") {
    return (
      <ProjectPullRequestsBadRequestRouteShell
        ownerName={ownerName}
        projectName={projectName}
        runtimeConfig={runtimeConfig}
      />
    );
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
