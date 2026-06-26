import * as React from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import {
  assignIssue,
  createIssueComment,
  deleteIssueComment,
  deleteIssue,
  listProjectMilestones,
  massUpdateIssues,
  readIssueDetail,
  readProjectContainer,
  searchIssueAssignableUsers,
  searchIssueMentionUsers,
  searchIssueSharableUsers,
  shareIssue,
  toggleFavoriteIssue,
  unvoteIssue,
  unvoteIssueComment,
  unwatchIssue,
  unshareIssue,
  updateIssueState,
  updateIssueComment,
  updateIssueWeight,
  voteIssue,
  voteIssueComment,
  watchIssue,
} from "../../../../../auth-workspace-client";
import {
  projectIssueReferencesQueryOptions,
  updateIssueContentRest,
} from "../../../../../api/issue-meta";
import { useAppRuntime } from "../../../../../app-runtime-context";
import {
  toProjectContainerView,
  toProjectIssueDetailView,
  toProjectMilestoneListView,
} from "../../../../../app-view-models";
import { ProjectIssueDetailPage } from "../../../../-issue-views";
import type { ProjectMilestoneViewModel } from "../../../../-view-models";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  navigateToAppHref,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/issue/$issueNumber")({
  component: IssueDetailRouteComponent,
});

function IssueDetailRouteComponent() {
  const { owner, projectName, issueNumber } = Route.useParams();
  const { bootstrapping, csrfToken, currentSession, messages, runtimeConfig } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/issue/${issueNumber}`;
  const isEditFormRoute = window.location.pathname
    .replace(/\/+$/u, "")
    .endsWith(`/issue/${issueNumber}/editform`);
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [issue, setIssue] = React.useState<ReturnType<typeof toProjectIssueDetailView> | null>(
    null,
  );
  const [milestones, setMilestones] = React.useState<ProjectMilestoneViewModel[]>([]);
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);

  useDocumentTitle(issue?.title ?? "title.issueDetail");

  const loadIssue = React.useCallback(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const [nextDetail, nextIssue, nextMilestones] = await Promise.all([
          readProjectContainer(runtimeConfig, owner, projectName),
          readIssueDetail(runtimeConfig, owner, projectName, Number(issueNumber)),
          listProjectMilestones(runtimeConfig, owner, projectName, { state: "all" }),
        ]);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
          setIssue(toProjectIssueDetailView(nextIssue));
          setMilestones(
            toProjectMilestoneListView(nextMilestones, "all", "dueDate", "asc").milestones,
          );
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
        setFailureKind("bad-request");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [issueNumber, owner, projectName, runtimeConfig]);

  React.useEffect(() => {
    if (!isEditFormRoute) {
      return loadIssue();
    }
    return undefined;
  }, [isEditFormRoute, loadIssue]);

  if (isEditFormRoute) {
    return <Outlet />;
  }

  if (bootstrapping) {
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
    <ProjectIssueDetailPage
      csrfToken={csrfToken}
      detail={detail}
      getIssueReferencesQueryOptions={(query) =>
        projectIssueReferencesQueryOptions(runtimeConfig, {
          ownerName: owner,
          projectName,
          query,
        })
      }
      issue={issue}
      milestoneOptions={milestones}
      renderShell={false}
      onAssign={async (assigneeLoginId) => {
        const nextIssue = await assignIssue(runtimeConfig, csrfToken, {
          assigneeLoginId,
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          projectName,
        });
        setIssue(toProjectIssueDetailView(nextIssue));
      }}
      onSearchAssignableUsers={(query) =>
        searchIssueAssignableUsers(runtimeConfig, {
          issueNumber: BigInt(Number(issueNumber)),
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
      onSearchSharableUsers={(query) =>
        searchIssueSharableUsers(runtimeConfig, {
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          projectName,
          query,
        })
      }
      onCommentDelete={async (commentId) => {
        const nextIssue = await deleteIssueComment(runtimeConfig, csrfToken, {
          commentId: BigInt(commentId),
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          projectName,
        });
        setIssue(toProjectIssueDetailView(nextIssue));
      }}
      onCommentSubmit={async (contentsMarkdown, attachmentIds, parentCommentId) => {
        const nextIssue = await createIssueComment(runtimeConfig, csrfToken, {
          attachmentIds: attachmentIds?.map(BigInt),
          contentsMarkdown,
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          parentCommentId,
          projectName,
        });
        setIssue(toProjectIssueDetailView(nextIssue));
      }}
      onCommentUpdate={async (commentId, contentsMarkdown, attachmentIds) => {
        const nextIssue = await updateIssueComment(runtimeConfig, csrfToken, {
          attachmentIds: attachmentIds?.map(BigInt),
          commentId: BigInt(commentId),
          contentsMarkdown,
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          projectName,
        });
        setIssue(toProjectIssueDetailView(nextIssue));
      }}
      onCommentVoteToggle={async (commentId, viewerHasVoted) => {
        const mutation = viewerHasVoted ? unvoteIssueComment : voteIssueComment;
        const nextIssue = await mutation(runtimeConfig, csrfToken, {
          commentId: BigInt(commentId),
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
        navigateToAppHref(runtimeConfig.basePath, `/${owner}/${projectName}/issues`);
      }}
      onFavoriteToggle={async () => {
        const nextIssue = await toggleFavoriteIssue(runtimeConfig, csrfToken, {
          issueNumber: BigInt(Number(issueNumber)),
          ownerName: owner,
          projectName,
        });
        setIssue(toProjectIssueDetailView(nextIssue));
      }}
      onIssueWeightChange={async (delta) => {
        const nextWeight = await updateIssueWeight(
          runtimeConfig,
          csrfToken,
          {
            issueNumber: BigInt(Number(issueNumber)),
            ownerName: owner,
            projectName,
          },
          delta,
        );
        setIssue((current) =>
          current
            ? {
                ...current,
                weight: nextWeight.weight,
              }
            : current,
        );
      }}
      onIssueContentUpdate={async ({ nextMarkdown, originalMarkdown }) => {
        await updateIssueContentRest(runtimeConfig, csrfToken, {
          content: nextMarkdown,
          issueNumber: BigInt(Number(issueNumber)),
          original: originalMarkdown,
          ownerName: owner,
          projectName,
        });
        const nextIssue = await readIssueDetail(
          runtimeConfig,
          owner,
          projectName,
          Number(issueNumber),
        );
        setIssue(toProjectIssueDetailView(nextIssue));
      }}
      onMetadataUpdate={async (input) => {
        await massUpdateIssues(runtimeConfig, csrfToken, {
          ...input,
          issueNumbers: [BigInt(Number(issueNumber))],
          ownerName: owner,
          projectName,
        });
        const nextIssue = await readIssueDetail(
          runtimeConfig,
          owner,
          projectName,
          Number(issueNumber),
        );
        setIssue(toProjectIssueDetailView(nextIssue));
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
      onShareIssue={async (loginId, targetType) => {
        const nextIssue = await shareIssue(runtimeConfig, csrfToken, {
          issueNumber: BigInt(Number(issueNumber)),
          loginId,
          ownerName: owner,
          projectName,
          targetType,
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
      viewerLabel={currentSession?.userLabel}
      viewerLoginId={currentSession?.loginId}
    />
  );
}
