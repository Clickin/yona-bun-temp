import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { globalSearchQueryOptions, isSearchType, type SearchType } from "../api/search";
import { LegacyI18nProvider } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import type { RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";
import {
  emptySearchResult,
  isRequestTextTooLargeError,
  LegacySearchBody,
  RequestTextTooLargeErrorBody,
} from "./-search-screen";

type SearchRouteSearch = {
  keyword: string;
  pageNum: number;
  searchType: SearchType;
};

export const Route = createFileRoute("/search")({
  component: SearchRoute,
  validateSearch: (search: Record<string, unknown>): SearchRouteSearch => {
    const rawSearchType = typeof search.searchType === "string" ? search.searchType : "auto";
    const rawPageNum = typeof search.pageNum === "string" ? Number.parseInt(search.pageNum, 10) : 1;
    return {
      keyword: typeof search.keyword === "string" ? search.keyword : "",
      pageNum: Number.isFinite(rawPageNum) && rawPageNum > 0 ? rawPageNum : 1,
      searchType: isSearchType(rawSearchType) ? rawSearchType : "auto",
    };
  },
});

function SearchRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <SearchScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function SearchScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const hasKeyword = search.keyword.trim().length > 0;
  const searchQuery = useQuery({
    ...globalSearchQueryOptions(runtimeConfig, search),
    enabled: hasKeyword,
  });
  const result =
    searchQuery.data ??
    emptySearchResult({
      ...search,
      scope: "global",
    });

  if (isRequestTextTooLargeError(searchQuery.error)) {
    return <RequestTextTooLargeErrorBody />;
  }

  const submitCategory = (nextSearchType: SearchType) => {
    void navigate({
      search: (current) => ({
        ...current,
        pageNum: 1,
        searchType: nextSearchType,
      }),
    });
  };

  return (
    <LegacySearchBody
      includeProjectCategory={true}
      onCategory={submitCategory}
      result={result}
      runtimeConfig={runtimeConfig}
      searchPath="/search"
    />
  );
}
