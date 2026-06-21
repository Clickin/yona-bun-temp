import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  closePullRequestThreadRest,
  createPullRequestCommentRest,
  deletePullRequestCommentRest,
  openPullRequestThreadRest,
  pullRequestChangesQueryOptions,
  updatePullRequestCommentRest,
} from "../../../../../../api/pull-requests";
import type { PullRequestChangesResponse } from "../../../../../../api/pull-requests";
import { apiQueryKeys } from "../../../../../../api/query-keys";
import { readProjectContainer } from "../../../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../../../app-view-models";
import { PullRequestChangesPage } from "../../../../../-pull-request-views";
import {
  BadRequestPage,
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
  const selectedCommitId = selectedCommitIdFromPath(window.location.pathname, pullRequestNumber);
  return (
    <PullRequestChangesRouteContent
      owner={owner}
      projectName={projectName}
      pullRequestNumber={pullRequestNumber}
      selectedCommitId={selectedCommitId}
    />
  );
}

function selectedCommitIdFromPath(pathname: string, pullRequestNumber: string) {
  const marker = `/pullRequest/${pullRequestNumber}/changes/`;
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex < 0) {
    return undefined;
  }
  const encoded = pathname.slice(markerIndex + marker.length).split("/")[0] ?? "";
  return encoded ? decodeURIComponent(encoded) : undefined;
}

function updateChangesThreadBuckets(
  current: PullRequestChangesResponse | undefined,
  updated: PullRequestChangesResponse["pullRequest"],
) {
  if (!current) {
    return current;
  }
  return {
    ...current,
    cardThreads: updated.threads,
    inlineThreads: updated.threads.filter((thread) => thread.path),
    nonRangedThreads: updated.threads.filter((thread) => !thread.path),
    pullRequest: updated,
    threads: updated.threads,
  };
}

export function PullRequestChangesRouteContent(props: {
  owner: string;
  projectName: string;
  pullRequestNumber: string;
  selectedCommitId?: string;
}) {
  const { owner, projectName, pullRequestNumber, selectedCommitId } = props;
  const {
    bootstrapping,
    csrfToken,
    currentSession,
    messages,
    runtimeConfig,
    setErrorMessage,
    workspaceOverview,
  } = useAppRuntime();
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
    { commitId: selectedCommitId },
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
      commitId: selectedCommitId,
    }),
  );
  const error = containerQuery.error ?? changesQuery.error;
  const failureKind = classifyConnectFailure(error);
  const mutationError = React.useCallback(
    (error: unknown) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : messages("error.badrequest", { fallback: "error.badrequest" }),
      );
    },
    [messages, setErrorMessage],
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
    onError: mutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(pullRequestDetailKey, updated);
      queryClient.setQueryData(pullRequestChangesKey, (current: typeof changesQuery.data) =>
        updateChangesThreadBuckets(current, updated),
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
  const commentMutation = useMutation({
    mutationFn: (input: {
      attachmentIds?: number[];
      contentsMarkdown: string;
      threadId?: number;
    }) =>
      createPullRequestCommentRest(runtimeConfig, csrfToken, {
        ...scope,
        attachmentIds: input.attachmentIds,
        commitId: selectedCommitId,
        contentsMarkdown: input.contentsMarkdown,
        threadId: input.threadId,
      }),
    onError: mutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(pullRequestDetailKey, updated);
      queryClient.setQueryData(pullRequestChangesKey, (current: typeof changesQuery.data) =>
        updateChangesThreadBuckets(current, updated),
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
    onError: mutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(pullRequestDetailKey, updated);
      queryClient.setQueryData(pullRequestChangesKey, (current: typeof changesQuery.data) =>
        updateChangesThreadBuckets(current, updated),
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
  const updateCommentMutation = useMutation({
    mutationFn: (input: {
      attachmentIds?: number[];
      commentId: number;
      contentsMarkdown: string;
    }) =>
      updatePullRequestCommentRest(runtimeConfig, csrfToken, {
        ...scope,
        ...input,
      }),
    onError: mutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(pullRequestDetailKey, updated);
      queryClient.setQueryData(pullRequestChangesKey, (current: typeof changesQuery.data) =>
        updateChangesThreadBuckets(current, updated),
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
    onError: mutationError,
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
    onError: mutationError,
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

  useDocumentTitle("menu.pullRequest");

  if (bootstrapping || containerQuery.isLoading || changesQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
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
  if (error) {
    return (
      <BadRequestPage href={`/${owner}/${projectName}/pullRequest/${pullRequestNumber}/changes`} />
    );
  }

  return (
    <PullRequestChangesPage
      csrfToken={csrfToken}
      changes={changesQuery.data}
      currentUser={
        workspaceOverview?.profile
          ? {
              avatarUrl: workspaceOverview.profile.avatarUrl,
              loginId: workspaceOverview.profile.loginId,
              userLabel: workspaceOverview.profile.displayName || workspaceOverview.profile.loginId,
            }
          : undefined
      }
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      messages={messages}
      runtimeConfig={runtimeConfig}
      selectedCommitId={selectedCommitId}
      viewerId={currentSession ? Number(currentSession.actorId) : undefined}
      onCommentDelete={async (commentId) => {
        await deleteCommentMutation.mutateAsync(commentId);
      }}
      onCommentSubmit={async (contentsMarkdown, attachmentIds) => {
        await commentMutation.mutateAsync({ attachmentIds, contentsMarkdown });
      }}
      onThreadCommentSubmit={async (threadId, contentsMarkdown, attachmentIds) => {
        await commentMutation.mutateAsync({ attachmentIds, contentsMarkdown, threadId });
      }}
      onCommentUpdate={async (commentId, contentsMarkdown, attachmentIds) => {
        await updateCommentMutation.mutateAsync({
          attachmentIds,
          commentId,
          contentsMarkdown,
        });
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
