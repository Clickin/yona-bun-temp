import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { readProjectWatchersQueryOptions } from "../../../../api/org-project";
import { useAppRuntime } from "../../../../app-runtime-context";
import { ProjectWatchersPage } from "../../../-project-views";

export const Route = createFileRoute("/$owner/$projectName/watchers")({
  component: ProjectWatchersRouteComponent,
});

function ProjectWatchersRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, runtimeConfig, setErrorMessage } = useAppRuntime();
  const watchersQuery = useQuery({
    ...readProjectWatchersQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping,
  });

  React.useEffect(() => {
    if (watchersQuery.error) {
      setErrorMessage(
        watchersQuery.error instanceof Error
          ? watchersQuery.error.message
          : "Read project watchers failed.",
      );
    }
  }, [setErrorMessage, watchersQuery.error]);

  return <ProjectWatchersPage detail={watchersQuery.data ?? null} runtimeConfig={runtimeConfig} />;
}
