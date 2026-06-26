import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { projectPullRequestListQueryOptions } from "../../../../api/pull-requests";
import { readProjectContainer } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectPullRequestListPage } from "../../../-pull-request-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/closedPullRequests")({
  component: ClosedPullRequestsRouteComponent,
});

function ClosedPullRequestsRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, messages, runtimeConfig } = useAppRuntime();
  const searchParams = new URLSearchParams(window.location.search);
  const filter = searchParams.get("filter") ?? "";
  const pageNum = Number(searchParams.get("pageNum") || "1");
  const contributorId = Number(searchParams.get("contributorId") || "0");
  const containerQuery = useQuery({
    queryFn: () => readProjectContainer(runtimeConfig, owner, projectName),
    queryKey: ["api", "v1", "owners", owner, "projects", projectName, "container"],
  });
  const listQuery = useQuery(
    projectPullRequestListQueryOptions(runtimeConfig, {
      category: "closed",
      contributorId,
      filter,
      ownerName: owner,
      pageNum,
      projectName,
    }),
  );
  const error = containerQuery.error ?? listQuery.error;
  const failureKind = error ? (classifyConnectFailure(error) ?? "bad-request") : null;

  useDocumentTitle("menu.pullRequest");

  if (bootstrapping || containerQuery.isLoading || listQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={`/${owner}/${projectName}/closedPullRequests`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${owner}/${projectName}/closedPullRequests`} />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href={`/${owner}/${projectName}/closedPullRequests`} />;
  }

  return (
    <ProjectPullRequestListPage
      category="closed"
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      list={listQuery.data}
      messages={messages}
      query={{ category: "closed", contributorId, filter, pageNum }}
      renderShell={false}
      runtimeConfig={runtimeConfig}
    />
  );
}
