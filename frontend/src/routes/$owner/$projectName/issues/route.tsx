import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { listProjectIssues, readProjectContainer } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView, toProjectIssueListView } from "../../../../app-view-models";
import { ProjectIssueListPage } from "../../../-issue-views";
import { classifyConnectFailure, ForbiddenPage, NotFoundPage, useDocumentTitle } from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/issues")({
  component: ProjectIssuesRouteComponent,
});

function ProjectIssuesRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/issues`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(null);
  const [issueList, setIssueList] = React.useState<ReturnType<typeof toProjectIssueListView> | null>(null);
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);

  useDocumentTitle("Issues");

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const [nextDetail, nextIssueList] = await Promise.all([
          readProjectContainer(runtimeConfig, owner, projectName),
          listProjectIssues(runtimeConfig, owner, projectName),
        ]);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
          setIssueList(toProjectIssueListView(nextIssueList));
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        const nextFailureKind = classifyConnectFailure(error);
        if (nextFailureKind) {
          setFailureKind(nextFailureKind);
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "Read project issues failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [owner, projectName, runtimeConfig, setErrorMessage]);

  if (bootstrapping) {
    return <main className="app-shell"><h1>Loading...</h1></main>;
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={routeHref} />;
  }

  return <ProjectIssueListPage detail={detail} issueList={issueList} runtimeConfig={runtimeConfig} />;
}
