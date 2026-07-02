import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import { isSearchType, projectSearchQueryOptions, type SearchType } from "../../../api/search";
import { LegacyI18nProvider } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import type { RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import {
  DefaultSearchErrorBody,
  emptySearchResult,
  isRequestTextTooLargeError,
  LegacySearchBody,
  RequestTextTooLargeErrorBody,
} from "../../-search-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

type ProjectSearchRouteSearch = {
  keyword: string;
  pageNum: number;
  routeInvalid: boolean;
  searchType: SearchType;
};

export const Route = createFileRoute("/$ownerName/$projectName/search")({
  component: ProjectSearchRoute,
  validateSearch: (search: Record<string, unknown>): ProjectSearchRouteSearch => {
    const rawSearchType = typeof search.searchType === "string" ? search.searchType : "";
    const rawKeyword = typeof search.keyword === "string" ? search.keyword : "";
    const rawPageNum = typeof search.pageNum === "string" ? Number.parseInt(search.pageNum, 10) : 1;
    const validSearchType = isSearchType(rawSearchType);
    return {
      keyword: rawKeyword,
      pageNum: Number.isFinite(rawPageNum) && rawPageNum > 0 ? rawPageNum : 1,
      routeInvalid: rawKeyword.length === 0 || !validSearchType || rawSearchType === "project",
      searchType: validSearchType && rawSearchType !== "project" ? rawSearchType : "auto",
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
  const projectQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
    enabled: !search.routeInvalid,
  });
  const hasKeyword = search.keyword.trim().length > 0;
  const searchQuery = useQuery({
    ...projectSearchQueryOptions(runtimeConfig, {
      ...search,
      ownerName,
      projectName,
    }),
    enabled: hasKeyword && !search.routeInvalid,
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

  if (search.routeInvalid) {
    return (
      <DefaultSearchErrorBody
        iconClassName="ico-404"
        messageKey="error.badrequest"
        runtimeConfig={runtimeConfig}
        ybtnClassName="ybtn ybtn-info"
      />
    );
  }

  if (!projectQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <LegacySearchBody
        includeProjectCategory={false}
        result={result}
        runtimeConfig={runtimeConfig}
        searchPath={`/${ownerName}/${projectName}/search`}
      />
    </>
  );
}
