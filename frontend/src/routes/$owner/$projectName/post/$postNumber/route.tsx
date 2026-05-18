import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import {
  createPostCommentRest,
  deletePostCommentRest,
  deleteProjectPostRest,
  readProjectPostQueryOptions,
  unwatchPostRest,
  updatePostCommentRest,
  watchPostRest,
} from "../../../../../api/boards";
import { apiQueryKeys } from "../../../../../api/query-keys";
import { useAppRuntime } from "../../../../../app-runtime-context";
import { ProjectBoardDetailPage } from "../../../../-board-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  navigateToAppHref,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/post/$postNumber")({
  component: BoardDetailRouteComponent,
});

function BoardDetailRouteComponent() {
  const { owner, projectName, postNumber } = Route.useParams();
  const { bootstrapping, csrfToken, currentSession, runtimeConfig, setErrorMessage } =
    useAppRuntime();
  const queryClient = useQueryClient();
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);
  const isEditFormRoute = window.location.pathname.endsWith("/editform");
  const postQueryOptions = readProjectPostQueryOptions(runtimeConfig, {
    ownerName: owner,
    postNumber,
    projectName,
  });
  const postQuery = useQuery({
    ...postQueryOptions,
    enabled: !bootstrapping,
  });

  useDocumentTitle(postQuery.data?.title ?? "Board");

  React.useEffect(() => {
    if (!postQuery.error) {
      return;
    }
    const nextFailureKind = classifyConnectFailure(postQuery.error);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setErrorMessage(
      postQuery.error instanceof Error ? postQuery.error.message : "Read post failed.",
    );
  }, [postQuery.error, setErrorMessage]);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={`/${owner}/${projectName}/post/${postNumber}`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${owner}/${projectName}/post/${postNumber}`} />;
  }
  if (isEditFormRoute) {
    return <Outlet />;
  }

  const reportMutationError = (error: unknown, fallback: string) => {
    setErrorMessage(error instanceof Error ? error.message : fallback);
  };

  return (
    <ProjectBoardDetailPage
      csrfToken={csrfToken}
      post={postQuery.data}
      runtimeConfig={runtimeConfig}
      viewerId={currentSession?.actorId.toString()}
      onCommentDelete={async (commentId) => {
        try {
          const nextPost = await deletePostCommentRest(runtimeConfig, csrfToken, {
            commentId,
            ownerName: owner,
            postNumber,
            projectName,
          });
          queryClient.setQueryData(postQueryOptions.queryKey, nextPost);
          await queryClient.invalidateQueries({ queryKey: apiQueryKeys.v1() });
        } catch (error) {
          reportMutationError(error, "Delete board comment failed.");
        }
      }}
      onCommentSubmit={async (contentsMarkdown, attachmentIds) => {
        try {
          const nextPost = await createPostCommentRest(runtimeConfig, csrfToken, {
            attachmentIds,
            contentsMarkdown,
            ownerName: owner,
            postNumber,
            projectName,
          });
          queryClient.setQueryData(postQueryOptions.queryKey, nextPost);
          await queryClient.invalidateQueries({ queryKey: apiQueryKeys.v1() });
        } catch (error) {
          reportMutationError(error, "Create board comment failed.");
        }
      }}
      onCommentUpdate={async (commentId, contentsMarkdown, attachmentIds) => {
        try {
          const nextPost = await updatePostCommentRest(runtimeConfig, csrfToken, {
            attachmentIds,
            commentId,
            contentsMarkdown,
            ownerName: owner,
            postNumber,
            projectName,
          });
          queryClient.setQueryData(postQueryOptions.queryKey, nextPost);
          await queryClient.invalidateQueries({ queryKey: apiQueryKeys.v1() });
        } catch (error) {
          reportMutationError(error, "Update board comment failed.");
        }
      }}
      onDeletePost={async () => {
        try {
          await deleteProjectPostRest(runtimeConfig, csrfToken, {
            ownerName: owner,
            postNumber,
            projectName,
          });
          await queryClient.invalidateQueries({ queryKey: apiQueryKeys.v1() });
          navigateToAppHref(runtimeConfig.basePath, `/${owner}/${projectName}/posts`);
        } catch (error) {
          reportMutationError(error, "Delete board post failed.");
        }
      }}
      onWatchToggle={async () => {
        try {
          const mutation = postQuery.data?.isWatching ? unwatchPostRest : watchPostRest;
          const nextPost = await mutation(runtimeConfig, csrfToken, {
            ownerName: owner,
            postNumber,
            projectName,
          });
          queryClient.setQueryData(postQueryOptions.queryKey, nextPost);
          await queryClient.invalidateQueries({ queryKey: apiQueryKeys.v1() });
        } catch (error) {
          reportMutationError(error, "Update board watch failed.");
        }
      }}
    />
  );
}
