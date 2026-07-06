import { createFileRoute } from "@tanstack/react-router";
import { LegacyI18nProvider } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { OrganizationPullRequestsPage, type OrganizationPullRequestsSearch } from "./pullrequests";

export const Route = createFileRoute("/organizations/$organizationName/closedPullrequests")({
  component: OrganizationClosedPullRequestsRoute,
  validateSearch(search: Record<string, unknown>): OrganizationPullRequestsSearch {
    return {
      filter: typeof search.filter === "string" ? search.filter : "",
      pageNum: Number(search.pageNum) || 1,
    };
  },
});

function OrganizationClosedPullRequestsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { organizationName } = Route.useParams();
  const search = Route.useSearch();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <OrganizationPullRequestsPage
          category="closed"
          organizationName={organizationName}
          runtimeConfig={runtimeConfig}
          search={search}
        />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}
