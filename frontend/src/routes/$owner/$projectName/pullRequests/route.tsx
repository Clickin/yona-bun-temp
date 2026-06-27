import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { apiQueryKeys } from "../../../../api/query-keys";
import {
  deleteProjectPushedBranchRest,
  projectPullRequestListQueryOptions,
} from "../../../../api/pull-requests";
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

export const Route = createFileRoute("/$owner/$projectName/pullRequests")({
  component: ProjectPullRequestsRouteComponent,
});

function ProjectPullRequestsRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const searchParams = new URL(locationHref, "http://localhost").searchParams;
  const filter = searchParams.get("filter") ?? "";
  const pageNum = Number(searchParams.get("pageNum") || "1");
  const contributorId = Number(searchParams.get("contributorId") || "0");
  const listQueryKey = apiQueryKeys.project.pullRequestList(owner, projectName, {
    category: "open",
    contributorId,
    filter,
    pageNum,
  });
  const containerQuery = useQuery({
    queryFn: () => readProjectContainer(runtimeConfig, owner, projectName),
    queryKey: ["api", "v1", "owners", owner, "projects", projectName, "container"],
  });
  const listQuery = useQuery(
    projectPullRequestListQueryOptions(runtimeConfig, {
      category: "open",
      contributorId,
      filter,
      ownerName: owner,
      pageNum,
      projectName,
    }),
  );
  const deletePushedBranchMutation = useMutation({
    mutationFn: (pushedBranchId: number) =>
      deleteProjectPushedBranchRest(runtimeConfig, csrfToken, {
        ownerName: owner,
        projectName,
        pushedBranchId,
      }),
    onError: (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "error.internalServerError");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listQueryKey });
    },
  });
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
    return <ForbiddenPage href={`/${owner}/${projectName}/pullRequests`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${owner}/${projectName}/pullRequests`} />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href={`/${owner}/${projectName}/pullRequests`} />;
  }

  return (
    <ProjectPullRequestListPage
      category="open"
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      list={listQuery.data}
      messages={messages}
      onDeletePushedBranch={(branch) => deletePushedBranchMutation.mutate(branch.id)}
      onNavigate={(href) => {
        void navigate({ href });
      }}
      query={{ category: "open", contributorId, filter, pageNum }}
      renderShell={false}
      runtimeConfig={runtimeConfig}
    />
  );
}
