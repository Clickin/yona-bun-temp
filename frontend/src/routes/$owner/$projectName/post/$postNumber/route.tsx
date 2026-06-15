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
  BadRequestPage,
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
  const routeHref = `/${owner}/${projectName}/post/${postNumber}`;
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);
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

  useDocumentTitle(postQuery.data?.title ?? "menu.board");

  React.useEffect(() => {
    if (!postQuery.error) {
      return;
    }
    const nextFailureKind = classifyConnectFailure(postQuery.error);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setFailureKind("bad-request");
  }, [postQuery.error]);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>common.loading</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={routeHref} />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href={routeHref} />;
  }
  if (isEditFormRoute) {
    return <Outlet />;
  }

  const reportMutationError = (error: unknown) => {
    setErrorMessage(error instanceof Error ? error.message : "error.badrequest");
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
          reportMutationError(error);
        }
      }}
      onCommentSubmit={async (contentsMarkdown, attachmentIds, parentCommentId) => {
        try {
          const nextPost = await createPostCommentRest(runtimeConfig, csrfToken, {
            attachmentIds,
            contentsMarkdown,
            ownerName: owner,
            parentCommentId,
            postNumber,
            projectName,
          });
          queryClient.setQueryData(postQueryOptions.queryKey, nextPost);
          await queryClient.invalidateQueries({ queryKey: apiQueryKeys.v1() });
        } catch (error) {
          reportMutationError(error);
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
          reportMutationError(error);
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
          reportMutationError(error);
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
          reportMutationError(error);
        }
      }}
    />
  );
}
