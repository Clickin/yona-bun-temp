import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { organizationPullRequestListQueryOptions } from "../../../../api/pull-requests";
import { readOrganizationContainer } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toOrganizationContainerView } from "../../../../app-view-models";
import { OrganizationPullRequestListPage } from "../../../-pull-request-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/organizations/$organizationName/closedPullrequests")({
  component: OrganizationClosedPullRequestsRouteComponent,
});

function OrganizationClosedPullRequestsRouteComponent() {
  const { organizationName } = Route.useParams();
  const { bootstrapping, runtimeConfig, setErrorMessage } = useAppRuntime();
  const searchParams = new URLSearchParams(window.location.search);
  const filter = searchParams.get("filter") ?? "";
  const pageNum = Number(searchParams.get("pageNum") || "1");
  const containerQuery = useQuery({
    queryFn: () => readOrganizationContainer(runtimeConfig, organizationName),
    queryKey: ["api", "v1", "organizations", organizationName, "container"],
  });
  const listQuery = useQuery(
    organizationPullRequestListQueryOptions(runtimeConfig, {
      category: "closed",
      filter,
      organizationName,
      pageNum,
    }),
  );
  const error = containerQuery.error ?? listQuery.error;
  const failureKind = classifyConnectFailure(error);

  useDocumentTitle("Organization Closed Pull Requests");
  React.useEffect(() => {
    if (error && !classifyConnectFailure(error)) {
      setErrorMessage(error instanceof Error ? error.message : "Read organization PRs failed.");
    }
  }, [error, setErrorMessage]);

  if (bootstrapping || containerQuery.isLoading || listQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>Loading&hellip;</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={`/organizations/${organizationName}/closedPullrequests`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/organizations/${organizationName}/closedPullrequests`} />;
  }

  return (
    <OrganizationPullRequestListPage
      category="closed"
      detail={containerQuery.data ? toOrganizationContainerView(containerQuery.data) : null}
      list={listQuery.data}
      organizationName={organizationName}
      query={{ category: "closed", filter, pageNum }}
      runtimeConfig={runtimeConfig}
    />
  );
}
