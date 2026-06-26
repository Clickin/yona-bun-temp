import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  createProjectWebhookRest,
  deleteProjectWebhookRest,
  readProjectContainerQueryOptions,
  readProjectWebhooksQueryOptions,
  type ProjectWebhookInput,
} from "../../../../api/org-project";
import { apiQueryKeys } from "../../../../api/query-keys";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectWebhooksPage } from "../../../-project-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useRequireAuthenticatedRoute,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/webhooks")({
  component: ProjectWebhooksRouteComponent,
});

function ProjectWebhooksRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const routeHref = `/${owner}/${projectName}/webhooks`;
  const canRender = useRequireAuthenticatedRoute(routeHref);
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);
  const containerQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping && canRender,
  });
  const webhooksQueryKey = apiQueryKeys.project.webhooks(owner, projectName);
  const webhooksQuery = useQuery({
    ...readProjectWebhooksQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping && canRender,
  });

  React.useEffect(() => {
    const error = containerQuery.error ?? webhooksQuery.error;
    if (!error) {
      setFailureKind(null);
      return;
    }
    const nextFailureKind = classifyConnectFailure(error);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setFailureKind("bad-request");
  }, [containerQuery.error, webhooksQuery.error]);

  const createMutation = useMutation({
    mutationFn: (input: ProjectWebhookInput) =>
      createProjectWebhookRest(runtimeConfig, csrfToken, {
        ...input,
        ownerName: owner,
        projectName,
      }),
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : messages("error.badrequest", { fallback: "error.badrequest" }),
      );
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(webhooksQueryKey, detail);
      queryClient.invalidateQueries({ queryKey: webhooksQueryKey });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.container(owner, projectName),
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (webhookId: number) =>
      deleteProjectWebhookRest(runtimeConfig, csrfToken, {
        ownerName: owner,
        projectName,
        webhookId,
      }),
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : messages("error.badrequest", { fallback: "error.badrequest" }),
      );
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(webhooksQueryKey, detail);
      queryClient.invalidateQueries({ queryKey: webhooksQueryKey });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.container(owner, projectName),
      });
    },
  });

  if (bootstrapping || !canRender) {
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
    <ProjectWebhooksPage
      detail={webhooksQuery.data ?? null}
      messages={messages}
      onCreateWebhook={(input) => createMutation.mutate(input)}
      onDeleteWebhook={(webhookId) => deleteMutation.mutate(webhookId)}
      pending={createMutation.isPending || deleteMutation.isPending}
      projectDetail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      renderShell={false}
      runtimeConfig={runtimeConfig}
    />
  );
}
