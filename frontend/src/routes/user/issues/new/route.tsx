import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  createIssue,
  readDirectIssueFormOptions,
  readProjectContainer,
  searchProjectAssignableUsers,
} from "../../../../auth-workspace-client";
import { projectIssueReferencesQueryOptions } from "../../../../api/issue-meta";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectIssueFormPage } from "../../../-issue-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  navigateToAppHref,
  useDocumentTitle,
  useRequireAuthenticatedRoute,
} from "../../../-shared";

export const Route = createFileRoute("/user/issues/new")({
  component: DirectIssueCreateRouteComponent,
});

function DirectIssueCreateRouteComponent() {
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/user/issues/new");
  const [options, setOptions] = React.useState<Awaited<
    ReturnType<typeof readDirectIssueFormOptions>
  > | null>(null);
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);

  useDocumentTitle("New Issue");

  React.useEffect(() => {
    if (!canRender) {
      return;
    }
    let cancelled = false;
    setFailureKind(null);
    setOptions(null);
    setDetail(null);
    void (async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const nextOptions = await readDirectIssueFormOptions(runtimeConfig, {
          commentId: searchParams.get("commentId"),
        });
        if (cancelled) {
          return;
        }
        setOptions(nextOptions);
        const nextDetail = await readProjectContainer(
          runtimeConfig,
          nextOptions.selectedProject.ownerName,
          nextOptions.selectedProject.projectName,
        );
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
        setErrorMessage(error instanceof Error ? error.message : "Read direct issue form failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canRender, runtimeConfig, setErrorMessage]);

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href="/user/issues/new" />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href="/user/issues/new" />;
  }
  if (!options) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }

  const ownerName = options.selectedProject.ownerName;
  const projectName = options.selectedProject.projectName;
  return (
    <ProjectIssueFormPage
      csrfToken={csrfToken}
      detail={detail}
      getIssueReferencesQueryOptions={(query) =>
        projectIssueReferencesQueryOptions(runtimeConfig, {
          ownerName,
          projectName,
          query,
        })
      }
      initialBodyMarkdown={options.bodyMarkdown}
      mode="create"
      onSearchAssignableUsers={(query) =>
        searchProjectAssignableUsers(runtimeConfig, {
          ownerName,
          projectName,
          query,
        })
      }
      onSubmit={async ({ assigneeLoginId, attachmentIds, bodyMarkdown, title }) => {
        const issue = await createIssue(runtimeConfig, csrfToken, {
          assigneeLoginId,
          attachmentIds: attachmentIds.map(BigInt),
          bodyMarkdown,
          ownerName,
          projectName,
          referCommentId: options.referCommentId,
          title,
        });
        navigateToAppHref(
          runtimeConfig.basePath,
          `/${ownerName}/${projectName}/issue/${Number(issue.issueNumber)}`,
        );
      }}
      referCommentId={options.referCommentId}
      runtimeConfig={runtimeConfig}
    />
  );
}
