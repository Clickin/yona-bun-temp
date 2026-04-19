import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createIssue, readProjectContainer } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectIssueFormPage } from "../../../-issue-views";
import { classifyConnectFailure, ForbiddenPage, NotFoundPage, useDocumentTitle } from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/issueform")({
  component: IssueCreateRouteComponent,
});

function IssueCreateRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/issueform`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(null);
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);

  useDocumentTitle("New Issue");

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const nextDetail = await readProjectContainer(runtimeConfig, owner, projectName);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
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
        setErrorMessage(error instanceof Error ? error.message : "Read project failed.");
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

  return (
    <ProjectIssueFormPage
      detail={detail}
      mode="create"
      onSubmit={async ({ bodyMarkdown, title }) => {
        const issue = await createIssue(runtimeConfig, csrfToken, {
          bodyMarkdown,
          ownerName: owner,
          projectName,
          title,
        });
        window.location.assign(`/${owner}/${projectName}/issue/${Number(issue.issueNumber)}`);
      }}
      runtimeConfig={runtimeConfig}
    />
  );
}
