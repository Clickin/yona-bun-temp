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
  BadRequestPage,
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
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const routeHref = `/${owner}/${projectName}/post/${postNumber}/editform`;
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);
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

  useDocumentTitle("post.modify");

  React.useEffect(() => {
    if (!formOptionsQuery.error) {
      return;
    }
    const nextFailureKind = classifyConnectFailure(formOptionsQuery.error);
    setFailureKind(nextFailureKind ?? "bad-request");
  }, [formOptionsQuery.error]);

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
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
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

  return (
    <ProjectPostFormPage
      canMarkNotice={
        formOptionsQuery.data?.canMarkNotice ?? postQuery.data?.permissions.canSetNotice ?? false
      }
      canMarkReadme={
        formOptionsQuery.data?.canMarkReadme ?? postQuery.data?.permissions.canSetNotice ?? false
      }
      csrfToken={csrfToken}
      initialPost={postQuery.data}
      labels={formOptionsQuery.data?.labels ?? []}
      mode="edit"
      ownerName={owner}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
      onSubmit={async (input) => {
        try {
          const updated = await updateProjectPostRest(runtimeConfig, csrfToken, {
            attachmentIds: input.attachmentIds,
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
          setErrorMessage(error instanceof Error ? error.message : "post.update.error");
        }
      }}
    />
  );
}
