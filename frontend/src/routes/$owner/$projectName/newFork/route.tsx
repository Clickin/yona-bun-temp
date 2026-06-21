import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  forkProjectRest,
  readProjectContainerQueryOptions,
  readProjectForkOptionsQueryOptions,
} from "../../../../api/org-project";
import { apiQueryKeys } from "../../../../api/query-keys";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { prefixBasePath } from "../../../../runtime-config";
import { ProjectForkPage } from "../../../-project-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useRequireAuthenticatedRoute,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/newFork")({
  component: ProjectForkRouteComponent,
});

function ProjectForkRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const routeHref = `/${owner}/${projectName}/newFork`;
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
  const forkOptionsQueryKey = apiQueryKeys.project.forkOptions(owner, projectName);
  const forkOptionsQuery = useQuery({
    ...readProjectForkOptionsQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping && canRender,
  });

  React.useEffect(() => {
    const error = containerQuery.error ?? forkOptionsQuery.error;
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
  }, [containerQuery.error, forkOptionsQuery.error]);

  const forkMutation = useMutation({
    mutationFn: (input: { name: string; owner: string; projectScope: string }) =>
      forkProjectRest(runtimeConfig, csrfToken, {
        ...input,
        ownerName: owner,
        projectName,
      }),
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "fork.failed");
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(forkOptionsQueryKey, undefined);
      queryClient.invalidateQueries({ queryKey: forkOptionsQueryKey });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.container(owner, projectName),
      });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.container(
          detail.project.ownerName,
          detail.project.projectName,
        ),
      });
      window.location.assign(prefixBasePath(runtimeConfig.basePath, detail.redirectPath));
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
    <ProjectForkPage
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      forkOptions={forkOptionsQuery.data ?? null}
      onFork={async (input) => {
        await forkMutation.mutateAsync(input);
      }}
      pending={forkMutation.isPending}
      runtimeConfig={runtimeConfig}
    />
  );
}
