import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectStatisticsPage } from "../../../-project-views";
import { classifyConnectFailure, ForbiddenPage, NotFoundPage } from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/statistics")({
  component: ProjectStatisticsRouteComponent,
});

function ProjectStatisticsRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/statistics`;
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);
  const containerQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping,
  });

  React.useEffect(() => {
    if (!containerQuery.error) {
      return;
    }
    const nextFailureKind = classifyConnectFailure(containerQuery.error);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setErrorMessage(
      containerQuery.error instanceof Error
        ? containerQuery.error.message
        : "Read project statistics failed.",
    );
  }, [containerQuery.error, setErrorMessage]);

  if (bootstrapping) {
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
    <ProjectStatisticsPage
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      runtimeConfig={runtimeConfig}
    />
  );
}
