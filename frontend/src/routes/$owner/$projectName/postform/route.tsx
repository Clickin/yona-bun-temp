import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  createProjectPostRest,
  readProjectPostFormOptionsQueryOptions,
} from "../../../../api/boards";
import { apiQueryKeys } from "../../../../api/query-keys";
import { useAppRuntime } from "../../../../app-runtime-context";
import { prefixBasePath } from "../../../../runtime-config";
import { ProjectPostFormPage } from "../../../-board-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/postform")({
  component: PostCreateRouteComponent,
});

function PostCreateRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/postform`;
  const navigate = useNavigate();
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const queryClient = useQueryClient();
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);
  const searchParams = React.useMemo(
    () => new URL(locationHref, "http://localhost").searchParams,
    [locationHref],
  );
  const onlineCommitSearch = {
    branch: searchParams.get("branch") ?? undefined,
    edit: searchParams.has("edit"),
    issueTemplate: searchParams.has("issueTemplate"),
    path: searchParams.get("path") ?? undefined,
    readme: searchParams.has("readme"),
  };
  const formOptionsQuery = useQuery({
    ...readProjectPostFormOptionsQueryOptions(runtimeConfig, {
      ownerName: owner,
      ...onlineCommitSearch,
      projectName,
    }),
    enabled: !bootstrapping,
  });

  useDocumentTitle("post.write");

  React.useEffect(() => {
    if (!formOptionsQuery.error) {
      return;
    }
    const nextFailureKind = classifyConnectFailure(formOptionsQuery.error);
    setFailureKind(nextFailureKind ?? "bad-request");
  }, [formOptionsQuery.error]);

  if (bootstrapping || formOptionsQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }

  if (formOptionsQuery.data && !formOptionsQuery.data.defaultPermissions.canCreate) {
    return <ForbiddenPage href={`/${owner}/${projectName}/posts`} />;
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
      canMarkNotice={formOptionsQuery.data?.canMarkNotice ?? false}
      canMarkReadme={formOptionsQuery.data?.canMarkReadme ?? false}
      csrfToken={csrfToken}
      labels={formOptionsQuery.data?.labels ?? []}
      mode="create"
      onlineCommit={formOptionsQuery.data?.onlineCommit}
      ownerName={owner}
      projectName={projectName}
      readme={formOptionsQuery.data?.readme ?? false}
      renderShell={false}
      runtimeConfig={runtimeConfig}
      onSubmit={async (input) => {
        try {
          const created = await createProjectPostRest(runtimeConfig, csrfToken, {
            attachmentIds: input.attachmentIds,
            bodyMarkdown: input.bodyMarkdown,
            branch: formOptionsQuery.data?.onlineCommit.branch,
            edit: formOptionsQuery.data?.onlineCommit.edit,
            issueTemplate: formOptionsQuery.data?.onlineCommit.issueTemplate,
            labelIds: input.labelIds,
            newFileName: input.newFileName,
            notice: input.notice,
            ownerName: owner,
            path: formOptionsQuery.data?.onlineCommit.path,
            projectName,
            readme: input.readme,
            title: input.title,
          });
          await queryClient.invalidateQueries({ queryKey: apiQueryKeys.v1() });
          const nextHref =
            "onlineCommit" in created
              ? created.redirectHref
              : `/${owner}/${projectName}/post/${created.postNumber}`;
          void navigate({ href: prefixBasePath(runtimeConfig.basePath, nextHref) });
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : messages("error.badrequest", { fallback: "error.badrequest" }),
          );
        }
      }}
    />
  );
}
