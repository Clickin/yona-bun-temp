import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  readProjectPostFormOptionsQueryOptions,
  readProjectPostQueryOptions,
  updateProjectPostRest,
} from "../../../../../../api/boards";
import { apiQueryKeys } from "../../../../../../api/query-keys";
import { useAppRuntime } from "../../../../../../app-runtime-context";
import { ProjectPostFormPage } from "../../../../../-board-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  navigateToAppHref,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/post/$postNumber/editform")({
  component: PostEditRouteComponent,
});

function PostEditRouteComponent() {
  const { owner, projectName, postNumber } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);
  const formOptionsQuery = useQuery({
    ...readProjectPostFormOptionsQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping,
  });
  const postQueryOptions = readProjectPostQueryOptions(runtimeConfig, {
    ownerName: owner,
    postNumber,
    projectName,
  });
  const postQuery = useQuery({
    ...postQueryOptions,
    enabled: !bootstrapping,
  });

  useDocumentTitle(postQuery.data?.title ? `Edit ${postQuery.data.title}` : "Edit post");

  React.useEffect(() => {
    if (formOptionsQuery.error) {
      setErrorMessage(
        formOptionsQuery.error instanceof Error
          ? formOptionsQuery.error.message
          : "Read post form options failed.",
      );
    }
  }, [formOptionsQuery.error, setErrorMessage]);

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
    return <ForbiddenPage href={`/${owner}/${projectName}/post/${postNumber}/editform`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${owner}/${projectName}/post/${postNumber}/editform`} />;
  }

  return (
    <ProjectPostFormPage
      canMarkNotice={
        formOptionsQuery.data?.canMarkNotice ?? postQuery.data?.permissions.canSetNotice ?? false
      }
      canMarkReadme={
        formOptionsQuery.data?.canMarkReadme ?? postQuery.data?.permissions.canSetNotice ?? false
      }
      initialPost={postQuery.data}
      labels={formOptionsQuery.data?.labels ?? []}
      mode="edit"
      ownerName={owner}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
      onSubmit={async (input) => {
        try {
          const updated = await updateProjectPostRest(runtimeConfig, csrfToken, {
            bodyMarkdown: input.bodyMarkdown,
            labelIds: input.labelIds,
            notice: input.notice,
            ownerName: owner,
            postNumber,
            projectName,
            readme: input.readme,
            title: input.title,
          });
          queryClient.setQueryData(postQueryOptions.queryKey, updated);
          await queryClient.invalidateQueries({ queryKey: apiQueryKeys.v1() });
          navigateToAppHref(runtimeConfig.basePath, `/${owner}/${projectName}/post/${postNumber}`);
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Update post failed.");
        }
      }}
    />
  );
}
