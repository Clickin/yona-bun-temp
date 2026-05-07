import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  readIssueDetail,
  readProjectContainer,
  searchIssueMentionUsers,
  searchProjectAssignableUsers,
  updateIssue,
} from "../../../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../../../app-runtime-context";
import {
  toProjectContainerView,
  toProjectIssueDetailView,
} from "../../../../../../app-view-models";
import { ProjectIssueFormPage } from "../../../../../-issue-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/issue/$issueNumber/editform")({
  component: IssueEditRouteComponent,
});

function IssueEditRouteComponent() {
  const { owner, projectName, issueNumber } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/issue/${issueNumber}/editform`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [issue, setIssue] = React.useState<ReturnType<typeof toProjectIssueDetailView> | null>(
    null,
  );
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);

  useDocumentTitle(issue?.title ? `Edit ${issue.title}` : "Edit Issue");

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const [nextDetail, nextIssue] = await Promise.all([
          readProjectContainer(runtimeConfig, owner, projectName),
          readIssueDetail(runtimeConfig, owner, projectName, Number(issueNumber)),
        ]);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
          setIssue(toProjectIssueDetailView(nextIssue));
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
        setErrorMessage(error instanceof Error ? error.message : "Read issue failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [issueNumber, owner, projectName, runtimeConfig, setErrorMessage]);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>Loading...</h1>
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
    <ProjectIssueFormPage
      detail={detail}
      initialIssue={issue}
      mode="edit"
      onSearchAssignableUsers={(query) =>
        searchProjectAssignableUsers(runtimeConfig, {
          ownerName: owner,
          projectName,
          query,
        })
      }
      onSearchMentionUsers={(query, context) =>
        searchIssueMentionUsers(runtimeConfig, {
          context,
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          projectName,
          query,
        })
      }
      onSubmit={async ({ assigneeLoginId, bodyMarkdown, title }) => {
        const updated = await updateIssue(runtimeConfig, csrfToken, {
          assigneeLoginId,
          bodyMarkdown,
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          projectName,
          title,
        });
        window.location.assign(`/${owner}/${projectName}/issue/${Number(updated.issueNumber)}`);
      }}
      runtimeConfig={runtimeConfig}
    />
  );
}
