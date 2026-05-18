import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  createProjectPostRest,
  readProjectPostFormOptionsQueryOptions,
} from "../../../../api/boards";
import { apiQueryKeys } from "../../../../api/query-keys";
import { useAppRuntime } from "../../../../app-runtime-context";
import { ProjectPostFormPage } from "../../../-board-views";
import { ForbiddenPage, navigateToAppHref, useDocumentTitle } from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/postform")({
  component: PostCreateRouteComponent,
});

function PostCreateRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const formOptionsQuery = useQuery({
    ...readProjectPostFormOptionsQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping,
  });

  useDocumentTitle("New post");

  React.useEffect(() => {
    if (formOptionsQuery.error) {
      setErrorMessage(
        formOptionsQuery.error instanceof Error
          ? formOptionsQuery.error.message
          : "Read post form options failed.",
      );
    }
  }, [formOptionsQuery.error, setErrorMessage]);

  if (bootstrapping || formOptionsQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }

  if (formOptionsQuery.data && !formOptionsQuery.data.defaultPermissions.canCreate) {
    return <ForbiddenPage href={`/${owner}/${projectName}/posts`} />;
  }

  return (
    <ProjectPostFormPage
      canMarkNotice={formOptionsQuery.data?.canMarkNotice ?? false}
      canMarkReadme={formOptionsQuery.data?.canMarkReadme ?? false}
      csrfToken={csrfToken}
      labels={formOptionsQuery.data?.labels ?? []}
      mode="create"
      ownerName={owner}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
      onSubmit={async (input) => {
        try {
          const created = await createProjectPostRest(runtimeConfig, csrfToken, {
            attachmentIds: input.attachmentIds,
            bodyMarkdown: input.bodyMarkdown,
            labelIds: input.labelIds,
            notice: input.notice,
            ownerName: owner,
            projectName,
            readme: input.readme,
            title: input.title,
          });
          await queryClient.invalidateQueries({ queryKey: apiQueryKeys.v1() });
          navigateToAppHref(
            runtimeConfig.basePath,
            `/${owner}/${projectName}/post/${created.postNumber}`,
          );
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Create post failed.");
        }
      }}
    />
  );
}
