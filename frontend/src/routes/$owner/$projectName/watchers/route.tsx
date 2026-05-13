import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  readProjectContainerQueryOptions,
  readProjectWatchersQueryOptions,
} from "../../../../api/org-project";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectWatchersPage } from "../../../-project-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/watchers")({
  component: ProjectWatchersRouteComponent,
});

function ProjectWatchersRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/watchers`;
  const scope = { ownerName: owner, projectName };
  const containerQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, scope),
    enabled: !bootstrapping,
  });
  const watchersQuery = useQuery({
    ...readProjectWatchersQueryOptions(runtimeConfig, scope),
    enabled: !bootstrapping,
  });
  const error = containerQuery.error ?? watchersQuery.error;
  const failureKind = classifyConnectFailure(error);

  useDocumentTitle("Project watchers");
  React.useEffect(() => {
    if (error && !classifyConnectFailure(error)) {
      setErrorMessage(error instanceof Error ? error.message : "Read project watchers failed.");
    }
  }, [error, setErrorMessage]);

  if (bootstrapping || containerQuery.isLoading || watchersQuery.isLoading) {
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
    <ProjectWatchersPage
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      runtimeConfig={runtimeConfig}
      watchers={watchersQuery.data?.watchers ?? null}
    />
  );
}
