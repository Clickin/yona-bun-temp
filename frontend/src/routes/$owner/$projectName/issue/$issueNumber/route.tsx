import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  assignIssue,
  createIssueComment,
  deleteIssueComment,
  deleteIssue,
  readIssueDetail,
  readProjectContainer,
  shareIssue,
  unvoteIssue,
  unwatchIssue,
  unshareIssue,
  updateIssueState,
  updateIssueComment,
  voteIssue,
  watchIssue,
} from "../../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../../app-runtime-context";
import { toProjectContainerView, toProjectIssueDetailView } from "../../../../../app-view-models";
import { ProjectIssueDetailPage } from "../../../../-issue-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/issue/$issueNumber")({
  component: IssueDetailRouteComponent,
});

function IssueDetailRouteComponent() {
  const { owner, projectName, issueNumber } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/issue/${issueNumber}`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [issue, setIssue] = React.useState<ReturnType<typeof toProjectIssueDetailView> | null>(
    null,
  );
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);

  useDocumentTitle(issue?.title ?? "Issue");

  const loadIssue = React.useCallback(() => {
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
        setErrorMessage(error instanceof Error ? error.message : "Read issue detail failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [issueNumber, owner, projectName, runtimeConfig, setErrorMessage]);

  React.useEffect(() => loadIssue(), [loadIssue]);

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
    <ProjectIssueDetailPage
      detail={detail}
      issue={issue}
      onAssign={async (assigneeLoginId) => {
        const nextIssue = await assignIssue(runtimeConfig, csrfToken, {
          assigneeLoginId,
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          projectName,
        });
        setIssue(toProjectIssueDetailView(nextIssue));
      }}
      onCommentDelete={async (commentId) => {
        const nextIssue = await deleteIssueComment(runtimeConfig, csrfToken, {
          commentId: BigInt(commentId),
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          projectName,
        });
        setIssue(toProjectIssueDetailView(nextIssue));
      }}
      onCommentSubmit={async (contentsMarkdown) => {
        const nextIssue = await createIssueComment(runtimeConfig, csrfToken, {
          contentsMarkdown,
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          projectName,
        });
        setIssue(toProjectIssueDetailView(nextIssue));
      }}
      onCommentUpdate={async (commentId, contentsMarkdown) => {
        const nextIssue = await updateIssueComment(runtimeConfig, csrfToken, {
          commentId: BigInt(commentId),
          contentsMarkdown,
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          projectName,
        });
        setIssue(toProjectIssueDetailView(nextIssue));
      }}
      onDeleteIssue={async () => {
        await deleteIssue(runtimeConfig, csrfToken, {
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          projectName,
        });
        window.location.assign(`/${owner}/${projectName}/issues`);
      }}
      onStateChange={async (state) => {
        const nextIssue = await updateIssueState(runtimeConfig, csrfToken, {
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          projectName,
          state,
        });
        setIssue(toProjectIssueDetailView(nextIssue));
      }}
      onShareIssue={async (loginId) => {
        const nextIssue = await shareIssue(runtimeConfig, csrfToken, {
          issueNumber: BigInt(Number(issueNumber)),
          loginId,
          ownerName: owner,
          projectName,
        });
        setIssue(toProjectIssueDetailView(nextIssue));
      }}
      onUnshareIssue={async (loginId) => {
        const nextIssue = await unshareIssue(runtimeConfig, csrfToken, {
          issueNumber: BigInt(Number(issueNumber)),
          loginId,
          ownerName: owner,
          projectName,
        });
        setIssue(toProjectIssueDetailView(nextIssue));
      }}
      onVoteToggle={async () => {
        const mutation = issue?.hasVoted ? unvoteIssue : voteIssue;
        const nextIssue = await mutation(runtimeConfig, csrfToken, {
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          projectName,
        });
        setIssue(toProjectIssueDetailView(nextIssue));
      }}
      onWatchToggle={async () => {
        const mutation = issue?.isWatching ? unwatchIssue : watchIssue;
        const nextIssue = await mutation(runtimeConfig, csrfToken, {
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          projectName,
        });
        setIssue(toProjectIssueDetailView(nextIssue));
      }}
      runtimeConfig={runtimeConfig}
    />
  );
}
