import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import { isSearchType, projectSearchQueryOptions, type SearchType } from "../../../api/search";
import { LegacyI18nProvider } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import type { RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import {
  emptySearchResult,
  isRequestTextTooLargeError,
  LegacySearchBody,
  RequestTextTooLargeErrorBody,
} from "../../-search-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

type ProjectSearchRouteSearch = {
  keyword: string;
  pageNum: number;
  searchType: SearchType;
};

export const Route = createFileRoute("/$ownerName/$projectName/search")({
  component: ProjectSearchRoute,
  validateSearch: (search: Record<string, unknown>): ProjectSearchRouteSearch => {
    const rawSearchType = typeof search.searchType === "string" ? search.searchType : "auto";
    const rawPageNum = typeof search.pageNum === "string" ? Number.parseInt(search.pageNum, 10) : 1;
    return {
      keyword: typeof search.keyword === "string" ? search.keyword : "",
      pageNum: Number.isFinite(rawPageNum) && rawPageNum > 0 ? rawPageNum : 1,
      searchType:
        isSearchType(rawSearchType) && rawSearchType !== "project" ? rawSearchType : "auto",
    };
  },
});

function ProjectSearchRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectSearchScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectSearchScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const hasKeyword = search.keyword.trim().length > 0;
  const searchQuery = useQuery({
    ...projectSearchQueryOptions(runtimeConfig, {
      ...search,
      ownerName,
      projectName,
    }),
    enabled: hasKeyword,
  });
  const result =
    searchQuery.data ??
    emptySearchResult({
      ...search,
      scope: "project",
    });

  if (isRequestTextTooLargeError(searchQuery.error)) {
    return <RequestTextTooLargeErrorBody />;
  }

  if (!projectQuery.data) {
    return null;
  }

  const submitCategory = (nextSearchType: SearchType) => {
    void navigate({
      search: (current) => ({
        ...current,
        pageNum: 1,
        searchType: nextSearchType === "project" ? "auto" : nextSearchType,
      }),
    });
  };

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <LegacySearchBody
        includeProjectCategory={false}
        onCategory={submitCategory}
        result={result}
        runtimeConfig={runtimeConfig}
        searchPath={`/${ownerName}/${projectName}/search`}
      />
    </>
  );
}
