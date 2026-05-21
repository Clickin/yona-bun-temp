import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  closePullRequestThreadRest,
  createPullRequestCommentRest,
  deletePullRequestCommentRest,
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
  const pullRequestDetailKey = apiQueryKeys.project.pullRequestDetail(
    owner,
    projectName,
    parsedNumber,
  );
  const pullRequestChangesKey = apiQueryKeys.project.pullRequestChanges(
    owner,
    projectName,
    parsedNumber,
  );
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
  const mutationError = React.useCallback(
    (fallback: string) => (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : fallback);
    },
    [setErrorMessage],
  );
  const inlineCommentMutation = useMutation({
    mutationFn: (input: {
      attachmentIds?: number[];
      commitId?: string;
      contentsMarkdown: string;
      endLine: number;
      path: string;
      prevCommitId?: string;
      startLine: number;
    }) =>
      createPullRequestCommentRest(runtimeConfig, csrfToken, {
        ...scope,
        ...input,
      }),
    onError: mutationError("Create pull request inline review comment failed."),
    onSuccess: async (updated) => {
      queryClient.setQueryData(pullRequestDetailKey, updated);
      queryClient.setQueryData(pullRequestChangesKey, (current: typeof changesQuery.data) =>
        current
          ? {
              ...current,
              pullRequest: updated,
              threads: updated.threads,
            }
          : current,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: pullRequestChangesKey }),
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
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) =>
      deletePullRequestCommentRest(runtimeConfig, csrfToken, {
        ...scope,
        commentId,
      }),
    onError: mutationError("Delete pull request review comment failed."),
    onSuccess: async (updated) => {
      queryClient.setQueryData(pullRequestDetailKey, updated);
      queryClient.setQueryData(pullRequestChangesKey, (current: typeof changesQuery.data) =>
        current
          ? {
              ...current,
              pullRequest: updated,
              threads: updated.threads,
            }
          : current,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: pullRequestChangesKey }),
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
        queryClient.invalidateQueries({ queryKey: pullRequestChangesKey }),
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
        queryClient.invalidateQueries({ queryKey: pullRequestChangesKey }),
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
      csrfToken={csrfToken}
      changes={changesQuery.data}
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      runtimeConfig={runtimeConfig}
      onCommentDelete={async (commentId) => {
        await deleteCommentMutation.mutateAsync(commentId);
      }}
      onInlineCommentSubmit={async (input) => {
        await inlineCommentMutation.mutateAsync(input);
      }}
      onThreadClose={async (threadId) => {
        await closeThreadMutation.mutateAsync(threadId);
      }}
      onThreadOpen={async (threadId) => {
        await openThreadMutation.mutateAsync(threadId);
      }}
    />
  );
}
