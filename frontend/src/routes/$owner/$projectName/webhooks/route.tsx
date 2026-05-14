import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  createProjectWebhookRest,
  deleteProjectWebhookRest,
  readProjectContainerQueryOptions,
  readProjectWebhooksQueryOptions,
  type ProjectWebhook,
  type ProjectWebhookInput,
  type ReadProjectWebhooksResponse,
} from "../../../../api/org-project";
import { apiQueryKeys } from "../../../../api/query-keys";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectWebhooksPage } from "../../../-project-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/webhooks")({
  component: ProjectWebhooksRouteComponent,
});

function ProjectWebhooksRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const routeHref = `/${owner}/${projectName}/webhooks`;
  const scope = { ownerName: owner, projectName };
  const webhooksKey = apiQueryKeys.project.webhooks(owner, projectName);
  const containerQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, scope),
    enabled: !bootstrapping,
  });
  const webhooksQuery = useQuery({
    ...readProjectWebhooksQueryOptions(runtimeConfig, scope),
    enabled: !bootstrapping,
  });

  const createMutation = useMutation({
    mutationFn: (input: ProjectWebhookInput) =>
      createProjectWebhookRest(runtimeConfig, csrfToken, {
        ...input,
        ownerName: owner,
        projectName,
      }),
    onSuccess: async (response: ReadProjectWebhooksResponse) => {
      queryClient.setQueryData(webhooksKey, response);
      await queryClient.invalidateQueries({ queryKey: webhooksKey });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (webhook: ProjectWebhook) =>
      deleteProjectWebhookRest(runtimeConfig, csrfToken, {
        ownerName: owner,
        projectName,
        webhookId: webhook.id,
      }),
    onSuccess: async (response: ReadProjectWebhooksResponse) => {
      queryClient.setQueryData(webhooksKey, response);
      await queryClient.invalidateQueries({ queryKey: webhooksKey });
    },
  });

  const error = containerQuery.error ?? webhooksQuery.error;
  const failureKind = classifyConnectFailure(error);

  useDocumentTitle("Project webhooks");
  React.useEffect(() => {
    if (error && !classifyConnectFailure(error)) {
      setErrorMessage(error instanceof Error ? error.message : "Read project webhooks failed.");
    }
  }, [error, setErrorMessage]);

  React.useEffect(() => {
    const mutationError = createMutation.error ?? deleteMutation.error;
    if (mutationError) {
      setErrorMessage(
        mutationError instanceof Error ? mutationError.message : "Project webhook update failed.",
      );
    }
  }, [createMutation.error, deleteMutation.error, setErrorMessage]);

  if (bootstrapping || containerQuery.isLoading || webhooksQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>Loading&hellip;</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={routeHref} />;
  }

  return (
    <ProjectWebhooksPage
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      pending={createMutation.isPending || deleteMutation.isPending}
      response={webhooksQuery.data ?? null}
      runtimeConfig={runtimeConfig}
      onCreate={(input) => createMutation.mutate(input)}
      onDelete={(webhook) => deleteMutation.mutate(webhook)}
    />
  );
}
