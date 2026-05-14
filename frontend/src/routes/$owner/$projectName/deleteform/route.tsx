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
  useRequireAuthenticatedRoute,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/deleteform")({
  component: ProjectDeleteFormRouteComponent,
});

function ProjectDeleteFormRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const routeHref = `/${owner}/${projectName}/deleteform`;
  const canRender = useRequireAuthenticatedRoute(routeHref);
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);
  const projectQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping && canRender,
  });

  React.useEffect(() => {
    if (!projectQuery.error) {
      return;
    }
    const nextFailureKind = classifyConnectFailure(projectQuery.error);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setErrorMessage(
      projectQuery.error instanceof Error
        ? projectQuery.error.message
        : "Read project delete form failed.",
    );
  }, [projectQuery.error, setErrorMessage]);

  const deleteMutation = useMutation({
    mutationFn: () =>
      deleteProjectRest(runtimeConfig, csrfToken, {
        ownerName: owner,
        projectName,
      }),
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Delete project failed.");
    },
    onSuccess: (result) => {
      queryClient.removeQueries({ queryKey: apiQueryKeys.project.base(owner, projectName) });
      navigateToAppHref(runtimeConfig.basePath, result.redirectPath || "/");
    },
  });

  if (bootstrapping || !canRender) {
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
  if (projectQuery.data && !projectQuery.data.viewerCanUpdate) {
    return <ForbiddenPage href={routeHref} />;
  }

  return (
    <ProjectDeletePage
      detail={projectQuery.data ? toProjectContainerView(projectQuery.data) : null}
      onDeleteProject={() => deleteMutation.mutate()}
      pending={deleteMutation.isPending}
      runtimeConfig={runtimeConfig}
    />
  );
}
