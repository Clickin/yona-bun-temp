import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import {
  acceptPullRequestRest,
  closePullRequestRest,
  closePullRequestThreadRest,
  deletePullRequestCommentRest,
  deletePullRequestSourceBranchRest,
  openPullRequestRest,
  openPullRequestThreadRest,
  pullRequestDetailQueryOptions,
  reviewPullRequestRest,
  restorePullRequestSourceBranchRest,
  unreviewPullRequestRest,
  updatePullRequestCommentRest,
  unwatchPullRequestRest,
  watchPullRequestRest,
} from "../../../../../api/pull-requests";
import { apiQueryKeys } from "../../../../../api/query-keys";
import { readProjectContainer } from "../../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../../app-view-models";
import { ProjectPullRequestDetailPage } from "../../../../-pull-request-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/pullRequest/$pullRequestNumber")({
  component: PullRequestDetailRouteComponent,
});

function PullRequestDetailRouteComponent() {
  const routePathname = useRouterState({ select: (state) => state.location.pathname });
  const isChildRoute =
    routePathname.endsWith("/changes") ||
    routePathname.includes("/changes/") ||
    routePathname.endsWith("/editform");

  if (isChildRoute) {
    return <Outlet />;
  }

  return <PullRequestDetailLeafRouteComponent />;
}

function PullRequestDetailLeafRouteComponent() {
  const { owner, projectName, pullRequestNumber } = Route.useParams();
  const { bootstrapping, csrfToken, currentSession, messages, runtimeConfig, setErrorMessage } =
    useAppRuntime();
  const queryClient = useQueryClient();
  const parsedNumber = Number(pullRequestNumber);
  const scope = { ownerName: owner, projectName, pullRequestNumber: parsedNumber };
  const containerQuery = useQuery({
    queryFn: () => readProjectContainer(runtimeConfig, owner, projectName),
    queryKey: apiQueryKeys.project.container(owner, projectName),
  });
  const pullRequestQuery = useQuery(
    pullRequestDetailQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
      pullRequestNumber: parsedNumber,
    }),
  );
  const error = containerQuery.error ?? pullRequestQuery.error;
  const failureKind = classifyConnectFailure(error);
  const commonMutationError = React.useCallback(
    (error: unknown) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : messages("error.badrequest", { fallback: "error.badrequest" }),
      );
    },
    [messages, setErrorMessage],
  );
  const closeMutation = useMutation({
    mutationFn: () => closePullRequestRest(runtimeConfig, csrfToken, scope),
    onError: commonMutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        apiQueryKeys.project.pullRequestDetail(owner, projectName, parsedNumber),
        updated,
      );
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
  const openMutation = useMutation({
    mutationFn: () => openPullRequestRest(runtimeConfig, csrfToken, scope),
    onError: commonMutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        apiQueryKeys.project.pullRequestDetail(owner, projectName, parsedNumber),
        updated,
      );
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
  const acceptMutation = useMutation({
    mutationFn: () => acceptPullRequestRest(runtimeConfig, csrfToken, scope),
    onError: commonMutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        apiQueryKeys.project.pullRequestDetail(owner, projectName, parsedNumber),
        updated,
      );
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
  const deleteSourceBranchMutation = useMutation({
    mutationFn: () => deletePullRequestSourceBranchRest(runtimeConfig, csrfToken, scope),
    onError: commonMutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        apiQueryKeys.project.pullRequestDetail(owner, projectName, parsedNumber),
        updated,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...apiQueryKeys.project.base(owner, projectName), "pull-requests"],
        }),
        queryClient.invalidateQueries({
          queryKey: apiQueryKeys.project.codeBranches(owner, projectName),
        }),
        queryClient.invalidateQueries({ queryKey: apiQueryKeys.search.all() }),
      ]);
    },
  });
  const restoreSourceBranchMutation = useMutation({
    mutationFn: () => restorePullRequestSourceBranchRest(runtimeConfig, csrfToken, scope),
    onError: commonMutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        apiQueryKeys.project.pullRequestDetail(owner, projectName, parsedNumber),
        updated,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...apiQueryKeys.project.base(owner, projectName), "pull-requests"],
        }),
        queryClient.invalidateQueries({
          queryKey: apiQueryKeys.project.codeBranches(owner, projectName),
        }),
        queryClient.invalidateQueries({ queryKey: apiQueryKeys.search.all() }),
      ]);
    },
  });
  const reviewMutation = useMutation({
    mutationFn: () => reviewPullRequestRest(runtimeConfig, csrfToken, scope),
    onError: commonMutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        apiQueryKeys.project.pullRequestDetail(owner, projectName, parsedNumber),
        updated,
      );
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
  const unreviewMutation = useMutation({
    mutationFn: () => unreviewPullRequestRest(runtimeConfig, csrfToken, scope),
    onError: commonMutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        apiQueryKeys.project.pullRequestDetail(owner, projectName, parsedNumber),
        updated,
      );
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
  const watchMutation = useMutation({
    mutationFn: () => watchPullRequestRest(runtimeConfig, csrfToken, scope),
    onError: commonMutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        apiQueryKeys.project.pullRequestDetail(owner, projectName, parsedNumber),
        updated,
      );
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
  const unwatchMutation = useMutation({
    mutationFn: () => unwatchPullRequestRest(runtimeConfig, csrfToken, scope),
    onError: commonMutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        apiQueryKeys.project.pullRequestDetail(owner, projectName, parsedNumber),
        updated,
      );
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
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) =>
      deletePullRequestCommentRest(runtimeConfig, csrfToken, {
        ...scope,
        commentId,
      }),
    onError: commonMutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        apiQueryKeys.project.pullRequestDetail(owner, projectName, parsedNumber),
        updated,
      );
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
    onError: commonMutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        apiQueryKeys.project.pullRequestDetail(owner, projectName, parsedNumber),
        updated,
      );
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
  const closeThreadMutation = useMutation({
    mutationFn: (threadId: number) =>
      closePullRequestThreadRest(runtimeConfig, csrfToken, {
        ...scope,
        threadId,
      }),
    onError: commonMutationError,
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
    onError: commonMutationError,
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

  useDocumentTitle(pullRequestQuery.data?.title ?? "menu.pullRequest");

  if (bootstrapping || containerQuery.isLoading || pullRequestQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={`/${owner}/${projectName}/pullRequest/${pullRequestNumber}`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${owner}/${projectName}/pullRequest/${pullRequestNumber}`} />;
  }
  if (error) {
    return <BadRequestPage href={`/${owner}/${projectName}/pullRequest/${pullRequestNumber}`} />;
  }

  return (
    <ProjectPullRequestDetailPage
      csrfToken={csrfToken}
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      messages={messages}
      pullRequest={pullRequestQuery.data}
      renderShell={false}
      runtimeConfig={runtimeConfig}
      viewerId={currentSession ? Number(currentSession.actorId) : undefined}
      viewerLabel={currentSession?.userLabel}
      viewerLoginId={currentSession?.loginId}
      onClose={async () => {
        await closeMutation.mutateAsync();
      }}
      onCommentDelete={async (commentId) => {
        await deleteCommentMutation.mutateAsync(commentId);
      }}
      onCommentUpdate={async (commentId, contentsMarkdown, attachmentIds) => {
        await updateCommentMutation.mutateAsync({
          attachmentIds,
          commentId,
          contentsMarkdown,
        });
      }}
      onOpen={async () => {
        await openMutation.mutateAsync();
      }}
      onAccept={async () => {
        await acceptMutation.mutateAsync();
      }}
      onDeleteSourceBranch={async () => {
        await deleteSourceBranchMutation.mutateAsync();
      }}
      onReview={async () => {
        await reviewMutation.mutateAsync();
      }}
      onRestoreSourceBranch={async () => {
        await restoreSourceBranchMutation.mutateAsync();
      }}
      onThreadClose={async (threadId) => {
        await closeThreadMutation.mutateAsync(threadId);
      }}
      onThreadOpen={async (threadId) => {
        await openThreadMutation.mutateAsync(threadId);
      }}
      onUnreview={async () => {
        await unreviewMutation.mutateAsync();
      }}
      onWatchToggle={
        currentSession
          ? async () => {
              if (pullRequestQuery.data?.isWatching) {
                await unwatchMutation.mutateAsync();
                return;
              }
              await watchMutation.mutateAsync();
            }
          : undefined
      }
    />
  );
}
