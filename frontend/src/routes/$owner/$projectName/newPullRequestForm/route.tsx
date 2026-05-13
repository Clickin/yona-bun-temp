import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  createPullRequestRest,
  pullRequestCreateFormOptionsQueryOptions,
} from "../../../../api/pull-requests";
import { apiQueryKeys } from "../../../../api/query-keys";
import { readProjectContainer } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectPullRequestFormPage } from "../../../-pull-request-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  navigateToAppHref,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/newPullRequestForm")({
  component: NewPullRequestFormRouteComponent,
});

function NewPullRequestFormRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const containerQuery = useQuery({
    enabled: !bootstrapping,
    queryFn: () => readProjectContainer(runtimeConfig, owner, projectName),
    queryKey: apiQueryKeys.project.container(owner, projectName),
  });
  const formOptionsQuery = useQuery({
    ...pullRequestCreateFormOptionsQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping,
  });
  const createMutation = useMutation({
    mutationFn: (input: {
      bodyMarkdown: string;
      fromBranch: string;
      fromProjectId: number;
      title: string;
      toBranch: string;
      toProjectId: number;
    }) =>
      createPullRequestRest(runtimeConfig, csrfToken, {
        ...input,
        ownerName: owner,
        projectName,
      }),
    onSuccess: async (created) => {
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
        `/${owner}/${projectName}/pullRequest/${created.pullRequestNumber}`,
      );
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Create pull request failed.");
    },
  });
  const error = containerQuery.error ?? formOptionsQuery.error;
  const failureKind = classifyConnectFailure(error);

  useDocumentTitle("New Pull Request");
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
    return <ForbiddenPage href={`/${owner}/${projectName}/newPullRequestForm`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${owner}/${projectName}/newPullRequestForm`} />;
  }

  return (
    <ProjectPullRequestFormPage
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      formOptions={formOptionsQuery.data}
      mode="create"
      runtimeConfig={runtimeConfig}
      onSubmit={async (input) => {
        await createMutation.mutateAsync(input);
      }}
    />
  );
}
