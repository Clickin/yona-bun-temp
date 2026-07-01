import { createFileRoute } from "@tanstack/react-router";
import { LegacyI18nProvider } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectPullRequestsScreen, validateProjectPullRequestsSearch } from "./pullRequests";

export const Route = createFileRoute("/$ownerName/$projectName/closedPullRequests")({
  component: ProjectClosedPullRequestsRoute,
  validateSearch: validateProjectPullRequestsSearch,
});

function ProjectClosedPullRequestsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectPullRequestsScreen
            category="closed"
            ownerName={ownerName}
            projectName={projectName}
            requestType="closed"
            runtimeConfig={runtimeConfig}
            search={search}
          />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}
