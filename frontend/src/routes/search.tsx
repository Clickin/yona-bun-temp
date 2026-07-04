import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { globalSearchQueryOptions, isSearchType, type SearchType } from "../api/search";
import { LegacyI18nProvider } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import type { RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";
import {
  emptySearchResult,
  DefaultSearchErrorBody,
  isDefaultForbiddenError,
  isDefaultInternalServerError,
  isRequestTextTooLargeError,
  LegacySearchBody,
  RequestTextTooLargeErrorBody,
} from "./-search-screen";

type SearchRouteSearch = {
  keyword: string;
  pageNum: number;
  routeInvalid: boolean;
  searchType: SearchType;
};

export const Route = createFileRoute("/search")({
  component: SearchRoute,
  validateSearch: (search: Record<string, unknown>): SearchRouteSearch => {
    const rawSearchType = typeof search.searchType === "string" ? search.searchType : "";
    const rawKeyword = typeof search.keyword === "string" ? search.keyword : "";
    const rawPageNum =
      typeof search.pageNum === "number"
        ? search.pageNum
        : typeof search.pageNum === "string"
          ? Number.parseInt(search.pageNum, 10)
          : 1;
    const validSearchType = isSearchType(rawSearchType);
    return {
      keyword: rawKeyword,
      pageNum: Number.isFinite(rawPageNum) && rawPageNum > 0 ? rawPageNum : 1,
      routeInvalid: rawKeyword.length === 0 || !validSearchType,
      searchType: validSearchType ? rawSearchType : "auto",
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
  const hasKeyword = search.keyword.trim().length > 0;
  const searchQuery = useQuery({
    ...globalSearchQueryOptions(runtimeConfig, search),
    enabled: hasKeyword && !search.routeInvalid,
  });
  const result =
    searchQuery.data ??
    emptySearchResult({
      ...search,
      scope: "global",
    });

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

  if (isRequestTextTooLargeError(searchQuery.error)) {
    return <RequestTextTooLargeErrorBody />;
  }
  if (isDefaultForbiddenError(searchQuery.error)) {
    return (
      <DefaultSearchErrorBody
        iconClassName="ico ico-err2"
        messageKey="error.forbidden"
        runtimeConfig={runtimeConfig}
      />
    );
  }
  if (isDefaultInternalServerError(searchQuery.error)) {
    return (
      <DefaultSearchErrorBody
        iconClassName="ico-404"
        messageKey="error.internalServerError"
        runtimeConfig={runtimeConfig}
      />
    );
  }

  return (
    <LegacySearchBody
      includeProjectCategory={true}
      result={result}
      runtimeConfig={runtimeConfig}
      searchPath="/search"
    />
  );
}
