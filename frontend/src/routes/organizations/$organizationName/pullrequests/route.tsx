import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { organizationPullRequestListQueryOptions } from "../../../../api/pull-requests";
import { readOrganizationContainer } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toOrganizationContainerView } from "../../../../app-view-models";
import { OrganizationPullRequestListPage } from "../../../-pull-request-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/organizations/$organizationName/pullrequests")({
  component: OrganizationPullRequestsRouteComponent,
});

function OrganizationPullRequestsRouteComponent() {
  const { organizationName } = Route.useParams();
  const { bootstrapping, messages, runtimeConfig } = useAppRuntime();
  const searchParams = new URLSearchParams(window.location.search);
  const filter = searchParams.get("filter") ?? "";
  const pageNum = Number(searchParams.get("pageNum") || "1");
  const containerQuery = useQuery({
    queryFn: () => readOrganizationContainer(runtimeConfig, organizationName),
    queryKey: ["api", "v1", "organizations", organizationName, "container"],
  });
  const listQuery = useQuery(
    organizationPullRequestListQueryOptions(runtimeConfig, {
      category: "open",
      filter,
      organizationName,
      pageNum,
    }),
  );
  const error = containerQuery.error ?? listQuery.error;
  const failureKind = error ? (classifyConnectFailure(error) ?? "bad-request") : null;

  useDocumentTitle("title.pullrequest");

  if (bootstrapping || containerQuery.isLoading || listQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={`/organizations/${organizationName}/pullrequests`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/organizations/${organizationName}/pullrequests`} />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href={`/organizations/${organizationName}/pullrequests`} />;
  }

  return (
    <OrganizationPullRequestListPage
      category="open"
      detail={containerQuery.data ? toOrganizationContainerView(containerQuery.data) : null}
      list={listQuery.data}
      messages={messages}
      organizationName={organizationName}
      query={{ category: "open", filter, pageNum }}
      renderShell={false}
      runtimeConfig={runtimeConfig}
    />
  );
}
