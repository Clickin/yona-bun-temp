import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { readOrganizationContainerRest } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import { isSearchType, organizationSearchQueryOptions, type SearchType } from "../../../api/search";
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
import { OrganizationHeader, OrganizationMenu } from "../$organizationName";

type OrganizationSearchRouteSearch = {
  keyword: string;
  pageNum: number;
  searchType: SearchType;
};

export const Route = createFileRoute("/organizations/$organizationName/search")({
  component: OrganizationSearchRoute,
  validateSearch: (search: Record<string, unknown>): OrganizationSearchRouteSearch => {
    const rawSearchType = typeof search.searchType === "string" ? search.searchType : "auto";
    const rawPageNum = typeof search.pageNum === "string" ? Number.parseInt(search.pageNum, 10) : 1;
    return {
      keyword: typeof search.keyword === "string" ? search.keyword : "",
      pageNum: Number.isFinite(rawPageNum) && rawPageNum > 0 ? rawPageNum : 1,
      searchType: isSearchType(rawSearchType) ? rawSearchType : "auto",
    };
  },
});

function OrganizationSearchRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <OrganizationSearchScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function OrganizationSearchScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { organizationName } = Route.useParams();
  const search = Route.useSearch();
  const organizationQuery = useQuery({
    queryFn: () => readOrganizationContainerRest(runtimeConfig, organizationName),
    queryKey: [...apiQueryKeys.organization.base(organizationName), "container"],
  });
  const hasKeyword = search.keyword.trim().length > 0;
  const searchQuery = useQuery({
    ...organizationSearchQueryOptions(runtimeConfig, {
      ...search,
      organizationName,
    }),
    enabled: hasKeyword,
  });
  const result =
    searchQuery.data ??
    emptySearchResult({
      ...search,
      scope: "organization",
    });

  if (isRequestTextTooLargeError(searchQuery.error)) {
    return <RequestTextTooLargeErrorBody />;
  }

  if (!organizationQuery.data) {
    return null;
  }

  const logoUrl =
    typeof organizationQuery.data.logoUrl === "string" && organizationQuery.data.logoUrl.length > 0
      ? organizationQuery.data.logoUrl
      : "/assets/images/organization_default_logo.png";
  return (
    <>
      <OrganizationHeader
        basePath={runtimeConfig.basePath}
        logoUrl={logoUrl}
        organizationName={organizationName}
      />
      <OrganizationMenu
        basePath={runtimeConfig.basePath}
        organizationName={organizationName}
        viewerCanUpdate={Boolean(organizationQuery.data.viewerCanUpdate)}
      />
      <LegacySearchBody
        includeProjectCategory={true}
        result={result}
        runtimeConfig={runtimeConfig}
        searchPath={`/organizations/${organizationName}/search`}
      />
    </>
  );
}
