import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { deleteProjectRest, readProjectContainerQueryOptions } from "../../../../api/org-project";
import { apiQueryKeys } from "../../../../api/query-keys";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectDeletePage } from "../../../-project-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  navigateToAppHref,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/deleteform")({
  component: ProjectDeleteRouteComponent,
});

function ProjectDeleteRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const routeHref = `/${owner}/${projectName}/deleteform`;
  const containerQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping,
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteProjectRest(runtimeConfig, csrfToken, owner, projectName),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.v1() });
      navigateToAppHref(runtimeConfig.basePath, result.redirectPath || "/");
    },
  });
  const error = containerQuery.error ?? deleteMutation.error;
  const failureKind = classifyConnectFailure(error);

  useDocumentTitle("Delete project");
  React.useEffect(() => {
    if (error && !classifyConnectFailure(error)) {
      setErrorMessage(error instanceof Error ? error.message : "Delete project failed.");
    }
  }, [error, setErrorMessage]);

  if (bootstrapping || containerQuery.isLoading) {
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
    <ProjectDeletePage
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      pending={deleteMutation.isPending}
      runtimeConfig={runtimeConfig}
      onDelete={() => deleteMutation.mutate()}
    />
  );
}
