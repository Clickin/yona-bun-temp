import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { readProjectWatchersQueryOptions } from "../../../../api/org-project";
import { useAppRuntime } from "../../../../app-runtime-context";
import { ProjectWatchersPage } from "../../../-project-views";
import { classifyConnectFailure, ForbiddenPage, NotFoundPage } from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/watchers")({
  component: ProjectWatchersRouteComponent,
});

function ProjectWatchersRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/watchers`;
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);
  const watchersQuery = useQuery({
    ...readProjectWatchersQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping,
  });

  React.useEffect(() => {
    if (!watchersQuery.error) {
      setFailureKind(null);
      return;
    }
    const nextFailureKind = classifyConnectFailure(watchersQuery.error);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setErrorMessage(
      watchersQuery.error instanceof Error
        ? watchersQuery.error.message
        : "Read project watchers failed.",
    );
  }, [setErrorMessage, watchersQuery.error]);

  if (failureKind === "forbidden") {
    return <ForbiddenPage href={routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={routeHref} />;
  }

  return <ProjectWatchersPage detail={watchersQuery.data ?? null} runtimeConfig={runtimeConfig} />;
}
