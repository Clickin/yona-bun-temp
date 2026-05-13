import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  pullRequestEditFormOptionsQueryOptions,
  updatePullRequestRest,
} from "../../../../../../api/pull-requests";
import { apiQueryKeys } from "../../../../../../api/query-keys";
import { readProjectContainer } from "../../../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../../../app-view-models";
import { ProjectPullRequestFormPage } from "../../../../../-pull-request-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  navigateToAppHref,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../../-shared";

export const Route = createFileRoute(
  "/$owner/$projectName/pullRequest/$pullRequestNumber/editform",
)({
  component: PullRequestEditFormRouteComponent,
});

function PullRequestEditFormRouteComponent() {
  const { owner, projectName, pullRequestNumber } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const parsedNumber = Number(pullRequestNumber);
  const containerQuery = useQuery({
    enabled: !bootstrapping,
    queryFn: () => readProjectContainer(runtimeConfig, owner, projectName),
    queryKey: apiQueryKeys.project.container(owner, projectName),
  });
  const formOptionsQuery = useQuery({
    ...pullRequestEditFormOptionsQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
      pullRequestNumber: parsedNumber,
    }),
    enabled: !bootstrapping,
  });
  const updateMutation = useMutation({
    mutationFn: (input: { bodyMarkdown: string; title: string }) =>
      updatePullRequestRest(runtimeConfig, csrfToken, {
        bodyMarkdown: input.bodyMarkdown,
        ownerName: owner,
        projectName,
        pullRequestNumber: parsedNumber,
        title: input.title,
      }),
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
      navigateToAppHref(
        runtimeConfig.basePath,
        `/${owner}/${projectName}/pullRequest/${parsedNumber}`,
      );
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Update pull request failed.");
    },
  });
  const error = containerQuery.error ?? formOptionsQuery.error;
  const failureKind = classifyConnectFailure(error);

  useDocumentTitle(
    formOptionsQuery.data?.pullRequest?.title
      ? `Edit ${formOptionsQuery.data.pullRequest.title}`
      : "Edit Pull Request",
  );
  React.useEffect(() => {
    if (error && !classifyConnectFailure(error)) {
      setErrorMessage(
        error instanceof Error ? error.message : "Read pull request form options failed.",
      );
    }
  }, [error, setErrorMessage]);

  if (bootstrapping || containerQuery.isLoading || formOptionsQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>Loading&hellip;</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return (
      <ForbiddenPage href={`/${owner}/${projectName}/pullRequest/${pullRequestNumber}/editform`} />
    );
  }
  if (failureKind === "not-found") {
    return (
      <NotFoundPage href={`/${owner}/${projectName}/pullRequest/${pullRequestNumber}/editform`} />
    );
  }

  return (
    <ProjectPullRequestFormPage
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      formOptions={formOptionsQuery.data}
      mode="edit"
      runtimeConfig={runtimeConfig}
      onSubmit={async (input) => {
        await updateMutation.mutateAsync({
          bodyMarkdown: input.bodyMarkdown,
          title: input.title,
        });
      }}
    />
  );
}
