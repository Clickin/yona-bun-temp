import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  closePullRequestThreadRest,
  openPullRequestThreadRest,
  pullRequestChangesQueryOptions,
} from "../../../../../../api/pull-requests";
import { apiQueryKeys } from "../../../../../../api/query-keys";
import { readProjectContainer } from "../../../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../../../app-view-models";
import { PullRequestChangesPage } from "../../../../../-pull-request-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/pullRequest/$pullRequestNumber/changes")(
  {
    component: PullRequestChangesRouteComponent,
  },
);

function PullRequestChangesRouteComponent() {
  const { owner, projectName, pullRequestNumber } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const parsedNumber = Number(pullRequestNumber);
  const scope = { ownerName: owner, projectName, pullRequestNumber: parsedNumber };
  const containerQuery = useQuery({
    queryFn: () => readProjectContainer(runtimeConfig, owner, projectName),
    queryKey: apiQueryKeys.project.container(owner, projectName),
  });
  const changesQuery = useQuery(
    pullRequestChangesQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
      pullRequestNumber: parsedNumber,
    }),
  );
  const error = containerQuery.error ?? changesQuery.error;
  const failureKind = classifyConnectFailure(error);
  const closeThreadMutation = useMutation({
    mutationFn: (threadId: number) =>
      closePullRequestThreadRest(runtimeConfig, csrfToken, {
        ...scope,
        threadId,
      }),
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Close review thread failed.");
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...apiQueryKeys.project.base(owner, projectName), "pull-requests"],
        }),
        queryClient.invalidateQueries({
          queryKey: [...apiQueryKeys.project.base(owner, projectName), "reviews"],
        }),
        queryClient.invalidateQueries({ queryKey: apiQueryKeys.search.all() }),
      ]);
    },
  });
  const openThreadMutation = useMutation({
    mutationFn: (threadId: number) =>
      openPullRequestThreadRest(runtimeConfig, csrfToken, {
        ...scope,
        threadId,
      }),
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Open review thread failed.");
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...apiQueryKeys.project.base(owner, projectName), "pull-requests"],
        }),
        queryClient.invalidateQueries({
          queryKey: [...apiQueryKeys.project.base(owner, projectName), "reviews"],
        }),
        queryClient.invalidateQueries({ queryKey: apiQueryKeys.search.all() }),
      ]);
    },
  });

  useDocumentTitle("Pull Request Changes");
  React.useEffect(() => {
    if (error && !classifyConnectFailure(error)) {
      setErrorMessage(error instanceof Error ? error.message : "Read pull request changes failed.");
    }
  }, [error, setErrorMessage]);

  if (bootstrapping || containerQuery.isLoading || changesQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>Loading&hellip;</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return (
      <ForbiddenPage href={`/${owner}/${projectName}/pullRequest/${pullRequestNumber}/changes`} />
    );
  }
  if (failureKind === "not-found") {
    return (
      <NotFoundPage href={`/${owner}/${projectName}/pullRequest/${pullRequestNumber}/changes`} />
    );
  }

  return (
    <PullRequestChangesPage
      changes={changesQuery.data}
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      runtimeConfig={runtimeConfig}
      onThreadClose={async (threadId) => {
        await closeThreadMutation.mutateAsync(threadId);
      }}
      onThreadOpen={async (threadId) => {
        await openThreadMutation.mutateAsync(threadId);
      }}
    />
  );
}
