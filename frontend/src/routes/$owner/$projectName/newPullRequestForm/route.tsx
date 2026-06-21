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
  BadRequestPage,
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
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
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
      attachmentIds: number[];
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
      setErrorMessage(
        error instanceof Error
          ? error.message
          : messages("pullRequest.error.newPullRequestForm", {
              fallback: "pullRequest.error.newPullRequestForm",
            }),
      );
    },
  });
  const error = containerQuery.error ?? formOptionsQuery.error;
  const failureKind = classifyConnectFailure(error);

  useDocumentTitle("title.newPullRequest");

  if (bootstrapping || containerQuery.isLoading || formOptionsQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={`/${owner}/${projectName}/newPullRequestForm`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${owner}/${projectName}/newPullRequestForm`} />;
  }
  if (error) {
    return <BadRequestPage href={`/${owner}/${projectName}/newPullRequestForm`} />;
  }

  return (
    <ProjectPullRequestFormPage
      csrfToken={csrfToken}
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      formOptions={formOptionsQuery.data}
      messages={messages}
      mode="create"
      runtimeConfig={runtimeConfig}
      onSubmit={async (input) => {
        await createMutation.mutateAsync(input);
      }}
    />
  );
}
