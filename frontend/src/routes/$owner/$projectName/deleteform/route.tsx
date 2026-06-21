import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { deleteProjectRest, readProjectContainerQueryOptions } from "../../../../api/org-project";
import { apiQueryKeys } from "../../../../api/query-keys";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectDeletePage } from "../../../-project-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  navigateToAppHref,
  NotFoundPage,
  useRequireAuthenticatedRoute,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/deleteform")({
  component: ProjectDeleteFormRouteComponent,
});

function ProjectDeleteFormRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const routeHref = `/${owner}/${projectName}/deleteform`;
  const canRender = useRequireAuthenticatedRoute(routeHref);
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);
  const projectQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping && canRender,
  });

  React.useEffect(() => {
    if (!projectQuery.error) {
      setFailureKind(null);
      return;
    }
    const nextFailureKind = classifyConnectFailure(projectQuery.error);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setFailureKind("bad-request");
  }, [projectQuery.error]);

  const deleteMutation = useMutation({
    mutationFn: () =>
      deleteProjectRest(runtimeConfig, csrfToken, {
        ownerName: owner,
        projectName,
      }),
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "project.delete.error");
    },
    onSuccess: (result) => {
      queryClient.removeQueries({ queryKey: apiQueryKeys.project.base(owner, projectName) });
      navigateToAppHref(runtimeConfig.basePath, result.redirectPath || "/");
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
  if (projectQuery.data && !projectQuery.data.viewerCanUpdate) {
    return <ForbiddenPage href={routeHref} />;
  }

  return (
    <ProjectDeletePage
      detail={projectQuery.data ? toProjectContainerView(projectQuery.data) : null}
      messages={messages}
      onDeleteProject={() => deleteMutation.mutate()}
      pending={deleteMutation.isPending}
      runtimeConfig={runtimeConfig}
    />
  );
}
