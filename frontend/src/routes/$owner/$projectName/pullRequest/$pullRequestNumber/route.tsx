import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import {
  acceptPullRequestRest,
  closePullRequestRest,
  closePullRequestThreadRest,
  createPullRequestCommentRest,
  deletePullRequestSourceBranchRest,
  openPullRequestRest,
  openPullRequestThreadRest,
  pullRequestDetailQueryOptions,
  reviewPullRequestRest,
  restorePullRequestSourceBranchRest,
  unreviewPullRequestRest,
} from "../../../../../api/pull-requests";
import { apiQueryKeys } from "../../../../../api/query-keys";
import { readProjectContainer } from "../../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../../app-view-models";
import { ProjectPullRequestDetailPage } from "../../../../-pull-request-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/pullRequest/$pullRequestNumber")({
  component: PullRequestDetailRouteComponent,
});

function PullRequestDetailRouteComponent() {
  const isChildRoute =
    window.location.pathname.endsWith("/changes") || window.location.pathname.endsWith("/editform");

  if (isChildRoute) {
    return <Outlet />;
  }

  return <PullRequestDetailLeafRouteComponent />;
}

function PullRequestDetailLeafRouteComponent() {
  const { owner, projectName, pullRequestNumber } = Route.useParams();
  const { bootstrapping, csrfToken, currentSession, runtimeConfig, setErrorMessage } =
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
  const mutationError = React.useCallback(
    (fallback: string) => (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : fallback);
    },
    [setErrorMessage],
  );
  const closeMutation = useMutation({
    mutationFn: () => closePullRequestRest(runtimeConfig, csrfToken, scope),
    onError: mutationError("Close pull request failed."),
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
    onError: mutationError("Reopen pull request failed."),
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
    onError: mutationError("Merge pull request failed."),
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
    onError: mutationError("Delete pull request source branch failed."),
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
    onError: mutationError("Restore pull request source branch failed."),
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
    onError: mutationError("Review pull request failed."),
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
    onError: mutationError("Unreview pull request failed."),
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
  const commentMutation = useMutation({
    mutationFn: (input: { attachmentIds?: number[]; contentsMarkdown: string }) =>
      createPullRequestCommentRest(runtimeConfig, csrfToken, {
        ...scope,
        attachmentIds: input.attachmentIds,
        contentsMarkdown: input.contentsMarkdown,
      }),
    onError: mutationError("Create pull request comment failed."),
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
    onError: mutationError("Close review thread failed."),
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
    onError: mutationError("Open review thread failed."),
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

  useDocumentTitle(pullRequestQuery.data?.title ?? "Pull Request");
  React.useEffect(() => {
    if (error && !classifyConnectFailure(error)) {
      setErrorMessage(error instanceof Error ? error.message : "Read pull request failed.");
    }
  }, [error, setErrorMessage]);

  if (bootstrapping || containerQuery.isLoading || pullRequestQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>Loading&hellip;</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={`/${owner}/${projectName}/pullRequest/${pullRequestNumber}`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${owner}/${projectName}/pullRequest/${pullRequestNumber}`} />;
  }

  return (
    <ProjectPullRequestDetailPage
      csrfToken={csrfToken}
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      pullRequest={pullRequestQuery.data}
      runtimeConfig={runtimeConfig}
      viewerId={currentSession ? Number(currentSession.actorId) : undefined}
      onClose={async () => {
        await closeMutation.mutateAsync();
      }}
      onCommentSubmit={async (contentsMarkdown, attachmentIds) => {
        await commentMutation.mutateAsync({ attachmentIds, contentsMarkdown });
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
    />
  );
}
