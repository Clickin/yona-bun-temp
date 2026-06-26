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
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/watchers")({
  component: ProjectWatchersRouteComponent,
});

function ProjectWatchersRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, runtimeConfig } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/watchers`;
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);
  const containerQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping,
  });
  const watchersQuery = useQuery({
    ...readProjectWatchersQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping,
  });

  React.useEffect(() => {
    const error = containerQuery.error ?? watchersQuery.error;
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
  }, [containerQuery.error, watchersQuery.error]);

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
    <ProjectWatchersPage
      detail={watchersQuery.data ?? null}
      projectDetail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      renderShell={false}
      runtimeConfig={runtimeConfig}
    />
  );
}
