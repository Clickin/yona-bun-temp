import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
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

export const Route = createFileRoute("/$owner/$projectName/sentPullRequests")({
  component: SentPullRequestsRouteComponent,
});

function SentPullRequestsRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, messages, runtimeConfig } = useAppRuntime();
  const navigate = useNavigate();
  useRouterState({ select: (state) => state.location.href });
  const searchParams = new URLSearchParams(window.location.search);
  const filter = searchParams.get("filter") ?? "";
  const pageNum = Number(searchParams.get("pageNum") || "1");
  const containerQuery = useQuery({
    queryFn: () => readProjectContainer(runtimeConfig, owner, projectName),
    queryKey: ["api", "v1", "owners", owner, "projects", projectName, "container"],
  });
  const listQuery = useQuery(
    projectPullRequestListQueryOptions(runtimeConfig, {
      category: "sent",
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
    return <ForbiddenPage href={`/${owner}/${projectName}/sentPullRequests`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${owner}/${projectName}/sentPullRequests`} />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href={`/${owner}/${projectName}/sentPullRequests`} />;
  }

  return (
    <ProjectPullRequestListPage
      category="sent"
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      list={listQuery.data}
      messages={messages}
      onNavigate={(href) => {
        void navigate({ href });
      }}
      query={{ category: "sent", filter, pageNum }}
      renderShell={false}
      runtimeConfig={runtimeConfig}
    />
  );
}
