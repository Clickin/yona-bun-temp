import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { pullRequestDetailQueryOptions } from "../../../../../api/pull-requests";
import { readProjectContainer } from "../../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../../app-view-models";
import { ProjectPullRequestDetailPage } from "../../../../-pull-request-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/pullRequest/$pullRequestNumber")({
  component: PullRequestDetailRouteComponent,
});

function PullRequestDetailRouteComponent() {
  const isChildRoute =
    window.location.pathname.endsWith("/changes") || window.location.pathname.endsWith("/editform");

  if (isChildRoute) {
    return <Outlet />;
  }

  return <PullRequestDetailLeafRouteComponent />;
}

function PullRequestDetailLeafRouteComponent() {
  const { owner, projectName, pullRequestNumber } = Route.useParams();
  const { bootstrapping, runtimeConfig, setErrorMessage } = useAppRuntime();
  const parsedNumber = Number(pullRequestNumber);
  const containerQuery = useQuery({
    queryFn: () => readProjectContainer(runtimeConfig, owner, projectName),
    queryKey: ["api", "v1", "owners", owner, "projects", projectName, "container"],
  });
  const pullRequestQuery = useQuery(
    pullRequestDetailQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
      pullRequestNumber: parsedNumber,
    }),
  );
  const error = containerQuery.error ?? pullRequestQuery.error;
  const failureKind = classifyConnectFailure(error);

  useDocumentTitle(pullRequestQuery.data?.title ?? "Pull Request");
  React.useEffect(() => {
    if (error && !classifyConnectFailure(error)) {
      setErrorMessage(error instanceof Error ? error.message : "Read pull request failed.");
    }
  }, [error, setErrorMessage]);

  if (bootstrapping || containerQuery.isLoading || pullRequestQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>Loading&hellip;</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={`/${owner}/${projectName}/pullRequest/${pullRequestNumber}`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${owner}/${projectName}/pullRequest/${pullRequestNumber}`} />;
  }

  return (
    <ProjectPullRequestDetailPage
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      pullRequest={pullRequestQuery.data}
      runtimeConfig={runtimeConfig}
    />
  );
}
