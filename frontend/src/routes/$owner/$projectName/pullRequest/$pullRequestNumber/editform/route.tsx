import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { pullRequestEditFormOptionsQueryOptions, updatePullRequestRest } from "@/api/pull-requests";
import { apiQueryKeys } from "@/api/query-keys";
import { readProjectContainer } from "@/auth-workspace-client";
import { useAppRuntime } from "@/app-runtime-context";
import { toProjectContainerView } from "@/app-view-models";
import { prefixBasePath } from "@/runtime-config";
import { ProjectPullRequestFormPage } from "@/routes/-pull-request-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "@/routes/-shared";

export const Route = createFileRoute(
  "/$owner/$projectName/pullRequest/$pullRequestNumber/editform",
)({
  component: PullRequestEditFormRouteComponent,
});

function PullRequestEditFormRouteComponent() {
  const { owner, projectName, pullRequestNumber } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
    mutationFn: (input: { attachmentIds: number[]; bodyMarkdown: string; title: string }) =>
      updatePullRequestRest(runtimeConfig, csrfToken, {
        attachmentIds: input.attachmentIds,
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
      void navigate({
        href: prefixBasePath(
          runtimeConfig.basePath,
          `/${owner}/${projectName}/pullRequest/${parsedNumber}`,
        ),
      });
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

  useDocumentTitle("title.editPullRequest");

  if (bootstrapping || containerQuery.isLoading || formOptionsQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
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
  if (error) {
    return (
      <BadRequestPage href={`/${owner}/${projectName}/pullRequest/${pullRequestNumber}/editform`} />
    );
  }

  return (
    <ProjectPullRequestFormPage
      csrfToken={csrfToken}
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      formOptions={formOptionsQuery.data}
      messages={messages}
      mode="edit"
      renderShell={false}
      runtimeConfig={runtimeConfig}
      onSubmit={async (input) => {
        await updateMutation.mutateAsync({
          attachmentIds: input.attachmentIds,
          bodyMarkdown: input.bodyMarkdown,
          title: input.title,
        });
      }}
    />
  );
}
