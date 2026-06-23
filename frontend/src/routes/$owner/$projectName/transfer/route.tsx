import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  readProjectContainerQueryOptions,
  readProjectTransferQueryOptions,
  requestProjectTransferRest,
} from "../../../../api/org-project";
import { apiQueryKeys } from "../../../../api/query-keys";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectTransferPage } from "../../../-project-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useRequireAuthenticatedRoute,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/transfer")({
  component: ProjectTransferRouteComponent,
});

function ProjectTransferRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const routeHref = `/${owner}/${projectName}/transfer`;
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
  const transferQueryKey = apiQueryKeys.project.transfer(owner, projectName);
  const transferQuery = useQuery({
    ...readProjectTransferQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping && canRender,
  });

  React.useEffect(() => {
    const error = containerQuery.error ?? transferQuery.error;
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
  }, [containerQuery.error, transferQuery.error]);

  const transferMutation = useMutation({
    mutationFn: (destination: string) =>
      requestProjectTransferRest(runtimeConfig, csrfToken, {
        destination,
        ownerName: owner,
        projectName,
      }),
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : messages("project.transfer.error", { fallback: "project.transfer.error" }),
      );
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(transferQueryKey, detail);
      queryClient.invalidateQueries({ queryKey: transferQueryKey });
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
  if (containerQuery.data && !containerQuery.data.viewerCanUpdate) {
    return <ForbiddenPage href={routeHref} />;
  }

  return (
    <ProjectTransferPage
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      messages={messages}
      onRequestTransfer={async (destination) => {
        await transferMutation.mutateAsync(destination);
      }}
      pending={transferMutation.isPending}
      runtimeConfig={runtimeConfig}
      transfer={transferMutation.data ?? transferQuery.data ?? null}
    />
  );
}
