import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  changeProjectVcsRest,
  readProjectChangeVcsQueryOptions,
  readProjectContainerQueryOptions,
} from "../../../../api/org-project";
import { apiQueryKeys } from "../../../../api/query-keys";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectChangeVcsPage } from "../../../-project-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  navigateToAppHref,
  NotFoundPage,
  useRequireAuthenticatedRoute,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/changeVCS")({
  component: ProjectChangeVcsRouteComponent,
});

function ProjectChangeVcsRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const routeHref = `/${owner}/${projectName}/changeVCS`;
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
  const changeVcsQueryKey = apiQueryKeys.project.changeVcs(owner, projectName);
  const changeVcsQuery = useQuery({
    ...readProjectChangeVcsQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping && canRender,
  });

  React.useEffect(() => {
    const error = containerQuery.error ?? changeVcsQuery.error;
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
  }, [changeVcsQuery.error, containerQuery.error]);

  const changeMutation = useMutation({
    mutationFn: () =>
      changeProjectVcsRest(runtimeConfig, csrfToken, {
        ownerName: owner,
        projectName,
      }),
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "project.changeVCS.error");
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(changeVcsQueryKey, detail);
      queryClient.invalidateQueries({ queryKey: changeVcsQueryKey });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.container(owner, projectName),
      });
      navigateToAppHref(runtimeConfig.basePath, detail.redirectPath || `/${owner}/${projectName}`);
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
  if (
    (containerQuery.data && !containerQuery.data.viewerCanUpdate) ||
    (changeVcsQuery.data && !changeVcsQuery.data.viewerCanChange)
  ) {
    return <ForbiddenPage href={routeHref} />;
  }

  return (
    <ProjectChangeVcsPage
      changeVcs={changeMutation.data ?? changeVcsQuery.data ?? null}
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      messages={messages}
      onChangeVcs={async () => {
        await changeMutation.mutateAsync();
      }}
      pending={changeMutation.isPending}
      runtimeConfig={runtimeConfig}
    />
  );
}
