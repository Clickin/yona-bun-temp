import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  closeCommitDiscussionThreadRest,
  codeCommitDetailQueryOptions,
  createCommitDiscussionCommentRest,
  deleteCommitDiscussionCommentRest,
  openCommitDiscussionThreadRest,
  updateCommitDiscussionCommentRest,
  type CodeCommitDetailResponse,
} from "../../../../../api/code-commits";
import { apiQueryKeys } from "../../../../../api/query-keys";
import { readProjectContainer } from "../../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../../app-view-models";
import { CodeCommitDetailPage, type CodeCommitDetailViewModel } from "../../../../-code-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/commit/$commitId")({
  component: CodeCommitDetailRouteComponent,
});

function toCodeCommitDetailView(response: CodeCommitDetailResponse): CodeCommitDetailViewModel {
  return {
    branches: response.branches.map((branch) => ({ name: branch.name })),
    breadcrumbs: response.breadcrumbs.map((breadcrumb) => ({
      name: breadcrumb.name,
      path: breadcrumb.path,
    })),
    commit: response.commit,
    files: response.files.map((file) => ({
      path: file.path,
      patch: file.patch,
    })),
    noHead: response.noHead,
    ownerName: response.ownerName,
    parentCommit: response.parentCommit,
    path: response.path,
    permissions: response.permissions,
    projectName: response.projectName,
    selectedBranch: response.selectedBranch,
    threads: response.threads,
  };
}

function CodeCommitDetailRouteComponent() {
  const { commitId, owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const searchParams = new URLSearchParams(window.location.search);
  const query = {
    branch: searchParams.get("branch") ?? "",
    path: searchParams.get("path") ?? "",
  };
  const scope = { commitId, ownerName: owner, projectName };
  const detailQueryKey = apiQueryKeys.project.commitDetail(owner, projectName, commitId, query);
  const containerQuery = useQuery({
    enabled: !bootstrapping,
    queryFn: () => readProjectContainer(runtimeConfig, owner, projectName),
    queryKey: apiQueryKeys.project.container(owner, projectName),
  });
  const commitDetailQuery = useQuery({
    ...codeCommitDetailQueryOptions(runtimeConfig, { ...scope, query }),
    enabled: !bootstrapping,
  });
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
  const createCommentMutation = useMutation({
    mutationFn: (input: {
      attachmentIds?: number[];
      contentsMarkdown: string;
      endLine?: number;
      path?: string;
      startLine?: number;
      threadId?: number;
    }) =>
      createCommitDiscussionCommentRest(runtimeConfig, csrfToken, {
        ...scope,
        attachmentIds: input.attachmentIds,
        contentsMarkdown: input.contentsMarkdown,
        endLine: input.endLine,
        path: input.path,
        startLine: input.startLine,
        threadId: input.threadId,
      }),
    onError: mutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(detailQueryKey, updated);
      await queryClient.invalidateQueries({ queryKey: detailQueryKey });
    },
  });
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) =>
      deleteCommitDiscussionCommentRest(runtimeConfig, csrfToken, {
        ...scope,
        commentId,
      }),
    onError: mutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(detailQueryKey, updated);
      await queryClient.invalidateQueries({ queryKey: detailQueryKey });
    },
  });
  const updateCommentMutation = useMutation({
    mutationFn: (input: {
      attachmentIds?: number[];
      commentId: number;
      contentsMarkdown: string;
    }) =>
      updateCommitDiscussionCommentRest(runtimeConfig, csrfToken, {
        ...scope,
        ...input,
      }),
    onError: mutationError,
    onSuccess: async (updated) => {
      queryClient.setQueryData(detailQueryKey, updated);
      await queryClient.invalidateQueries({ queryKey: detailQueryKey });
    },
  });
  const closeThreadMutation = useMutation({
    mutationFn: (threadId: number) =>
      closeCommitDiscussionThreadRest(runtimeConfig, csrfToken, { ...scope, threadId }),
    onError: mutationError,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: detailQueryKey });
    },
  });
  const openThreadMutation = useMutation({
    mutationFn: (threadId: number) =>
      openCommitDiscussionThreadRest(runtimeConfig, csrfToken, { ...scope, threadId }),
    onError: mutationError,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: detailQueryKey });
    },
  });
  const error = containerQuery.error ?? commitDetailQuery.error;
  const failureKind = classifyConnectFailure(error);

  useDocumentTitle(`code.commits @${commitId}`);

  if (bootstrapping || containerQuery.isLoading || commitDetailQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={`/${owner}/${projectName}/commit/${commitId}`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${owner}/${projectName}/commit/${commitId}`} />;
  }
  if (error) {
    return <BadRequestPage href={`/${owner}/${projectName}/commit/${commitId}`} />;
  }

  return (
    <CodeCommitDetailPage
      commitDetail={commitDetailQuery.data ? toCodeCommitDetailView(commitDetailQuery.data) : null}
      csrfToken={csrfToken}
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      messages={messages}
      runtimeConfig={runtimeConfig}
      onCloseThread={async (threadId) => {
        await closeThreadMutation.mutateAsync(threadId);
      }}
      onCreateComment={async (input) => {
        await createCommentMutation.mutateAsync(input);
      }}
      onDeleteComment={async (commentId) => {
        await deleteCommentMutation.mutateAsync(commentId);
      }}
      onUpdateComment={async (commentId, contentsMarkdown, attachmentIds) => {
        await updateCommentMutation.mutateAsync({
          attachmentIds,
          commentId,
          contentsMarkdown,
        });
      }}
      onOpenThread={async (threadId) => {
        await openThreadMutation.mutateAsync(threadId);
      }}
    />
  );
}
