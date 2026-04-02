import * as React from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { PullRequestMergePreviewOutput, PullRequestReviewThread } from "@yona/contracts";
import { ContentCard, ProjectShell, SidebarSection } from "@app/components/parity-shells";
import {
  createPullRequestReviewComment,
  deletePullRequestReviewComment,
  listPullRequestReviewThreads,
  mergePullRequest,
  previewPullRequestMerge,
  readPullRequestDetail,
  updatePullRequestReviewThreadState,
  updatePullRequestState,
} from "@app/lib/pull-request";
import { readProjectDetail } from "@app/lib/project";

export const Route = createFileRoute("/_app/$owner/$projectName/pulls/$pullRequestNumber")({
  loader: async ({ context, params }) => {
    const ref = {
      ownerName: params.owner,
      projectName: params.projectName,
    };
    const pullRequestNumber = Number.parseInt(params.pullRequestNumber, 10);
    const session = await context.authCaller.readCurrentSession();

    const [project, pullRequest, threads] = await Promise.all([
      readProjectDetail({ data: ref }),
      readPullRequestDetail({
        data: {
          ownerName: params.owner,
          projectName: params.projectName,
          pullRequestNumber,
        },
      }),
      listPullRequestReviewThreads({
        data: {
          ownerName: params.owner,
          projectName: params.projectName,
          pullRequestNumber,
        },
      }),
    ]);

    return {
      currentLoginId: session.loginId,
      project,
      pullRequest,
      threads,
      viewerCanWrite: !session.isAnonymous,
    };
  },
  component: ProjectPullRequestDetailRouteComponent,
});

function nextState(currentState: "closed" | "merged" | "open"): "closed" | "open" {
  return currentState === "open" ? "closed" : "open";
}

function toAbsoluteDate(value: Date | null): string {
  return value ? value.toISOString().replace("T", " ").slice(0, 16) : "-";
}

export interface PullRequestMergeSectionProps {
  mergePending: boolean;
  onMerge: () => Promise<void>;
  onPreview: () => Promise<void>;
  preview: null | PullRequestMergePreviewOutput;
  previewPending: boolean;
}

export function PullRequestMergeSection(props: PullRequestMergeSectionProps) {
  return (
    <ContentCard title="Merge Preview">
      <div className="action-row">
        <button
          className="cta"
          disabled={props.previewPending}
          onClick={() => void props.onPreview()}
          type="button"
        >
          {props.previewPending ? "Previewing..." : "Preview Merge"}
        </button>
        <button
          className="cta"
          disabled={props.mergePending || props.preview?.mergeable === false}
          onClick={() => void props.onMerge()}
          type="button"
        >
          {props.mergePending ? "Merging..." : "Merge Pull Request"}
        </button>
      </div>
      {props.preview ? (
        <div className="form-grid">
          <p className="note">mergeable: {props.preview.mergeable ? "true" : "false"}</p>
          <p className="note">blocked reason: {props.preview.blockedReason ?? "none"}</p>
          {props.preview.conflictedFiles.length > 0 ? (
            <div>
              <p className="note">conflicted files</p>
              <ul className="note">
                {props.preview.conflictedFiles.map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="note">Run preview to calculate current mergeability.</p>
      )}
    </ContentCard>
  );
}

export interface PullRequestReviewSectionProps {
  createPending: boolean;
  currentLoginId: null | string;
  deletePendingCommentId: null | number;
  errorMessage: null | string;
  onCloseOrReopenThread: (threadId: number, state: "closed" | "open") => Promise<void>;
  onCreateComment: (input: { contents: string; threadId?: number }) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  replyPendingThreadId: null | number;
  threadPendingId: null | number;
  threads: PullRequestReviewThread[];
  viewerCanWrite: boolean;
}

export function PullRequestReviewSection(props: PullRequestReviewSectionProps) {
  return (
    <ContentCard title="Review Threads">
      {props.errorMessage ? <p className="note error-note">{props.errorMessage}</p> : null}
      {props.viewerCanWrite ? (
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const contents = String(formData.get("contents") ?? "").trim();
            if (!contents) {
              return;
            }
            void props.onCreateComment({ contents });
            event.currentTarget.reset();
          }}
        >
          <label className="field">
            <span>New Review Comment</span>
            <textarea name="contents" rows={3} />
          </label>
          <button className="cta" disabled={props.createPending} type="submit">
            {props.createPending ? "Saving..." : "Add Review Comment"}
          </button>
        </form>
      ) : null}
      {props.threads.length === 0 ? (
        <p className="note">No review threads.</p>
      ) : (
        props.threads.map((thread) => {
          const numericThreadId = Number.parseInt(thread.threadId, 10);
          const canToggle = props.viewerCanWrite;

          return (
            <section className="sidebar-card" key={thread.threadId}>
              <div className="page-title-row">
                <div>
                  <p className="page-eyebrow">#{thread.threadId}</p>
                  <h2>{thread.text}</h2>
                </div>
                {canToggle ? (
                  <button
                    className="cta"
                    disabled={props.threadPendingId === numericThreadId}
                    onClick={() =>
                      void props.onCloseOrReopenThread(
                        numericThreadId,
                        thread.state === "open" ? "closed" : "open",
                      )
                    }
                    type="button"
                  >
                    {thread.state === "open" ? "Close Thread" : "Reopen Thread"}
                  </button>
                ) : null}
              </div>
              <div className="badge-row">
                <span className="badge">{thread.state}</span>
                <span className="badge">Replies: {thread.replyCount}</span>
                {thread.commitId ? <span className="badge">{thread.commitId}</span> : null}
              </div>
              {thread.path ? <p className="note">{thread.path}</p> : null}
              {thread.comments.map((comment) => {
                const canDelete =
                  props.viewerCanWrite && comment.authorLoginId === props.currentLoginId;

                return (
                  <article className="field" key={comment.commentId}>
                    <div className="page-title-row">
                      <strong>{comment.authorName}</strong>
                      <span className="note" title={toAbsoluteDate(comment.createdAt)}>
                        {toAbsoluteDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="note">{comment.contents}</p>
                    {canDelete ? (
                      <button
                        className="cta"
                        disabled={props.deletePendingCommentId === comment.commentId}
                        onClick={() => void props.onDeleteComment(comment.commentId)}
                        type="button"
                      >
                        Delete Comment
                      </button>
                    ) : null}
                  </article>
                );
              })}
              {props.viewerCanWrite ? (
                <form
                  className="form-grid"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const contents = String(formData.get("contents") ?? "").trim();
                    if (!contents) {
                      return;
                    }
                    void props.onCreateComment({ contents, threadId: numericThreadId });
                    event.currentTarget.reset();
                  }}
                >
                  <label className="field">
                    <span>Reply</span>
                    <textarea name="contents" rows={2} />
                  </label>
                  <button
                    className="cta"
                    disabled={props.replyPendingThreadId === numericThreadId}
                    type="submit"
                  >
                    Reply
                  </button>
                </form>
              ) : null}
            </section>
          );
        })
      )}
    </ContentCard>
  );
}

function ProjectPullRequestDetailRouteComponent() {
  const router = useRouter();
  const params = Route.useParams();
  const data = Route.useLoaderData();
  const pullRequest = data.pullRequest;
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null);
  const [mergeMessage, setMergeMessage] = React.useState<null | string>(null);
  const [mergePending, setMergePending] = React.useState(false);
  const [previewPending, setPreviewPending] = React.useState(false);
  const [createPending, setCreatePending] = React.useState(false);
  const [threadPendingId, setThreadPendingId] = React.useState<null | number>(null);
  const [replyPendingThreadId, setReplyPendingThreadId] = React.useState<null | number>(null);
  const [deletePendingCommentId, setDeletePendingCommentId] = React.useState<null | number>(null);
  const [mergePreviewState, setMergePreviewState] =
    React.useState<null | PullRequestMergePreviewOutput>(null);

  const pullRequestRef = {
    ownerName: params.owner,
    projectName: params.projectName,
    pullRequestNumber: pullRequest.pullRequestNumber,
  };

  async function refreshRoute() {
    await router.invalidate();
  }

  return (
    <ProjectShell
      activeMenu="pulls"
      aside={
        <>
          <SidebarSection title="Pull Request">
            <p className="sidebar-kv">state: {pullRequest.state}</p>
            <p className="sidebar-kv">author: {pullRequest.contributorLoginId}</p>
            <p className="sidebar-kv">
              {pullRequest.fromBranch} -&gt; {pullRequest.toBranch}
            </p>
            <p className="sidebar-kv">
              reviewers: {pullRequest.reviewSummary.reviewerCount} / open threads:{" "}
              {pullRequest.reviewSummary.openThreadCount}
            </p>
          </SidebarSection>
          <SidebarSection title="Actions">
            <div className="action-row">
              <button
                className="cta"
                disabled={pending}
                onClick={() => {
                  setPending(true);
                  setErrorMessage(null);
                  React.startTransition(() => {
                    void (async () => {
                      try {
                        await updatePullRequestState({
                          data: {
                            ...pullRequestRef,
                            state: nextState(pullRequest.state),
                          },
                        });
                        await refreshRoute();
                      } catch (error) {
                        setErrorMessage(
                          error instanceof Error ? error.message : "PR state update failed.",
                        );
                      } finally {
                        setPending(false);
                      }
                    })();
                  });
                }}
                type="button"
              >
                {pending
                  ? "Updating..."
                  : pullRequest.state === "open"
                    ? "Close Pull Request"
                    : "Reopen Pull Request"}
              </button>
            </div>
          </SidebarSection>
        </>
      }
      project={data.project}
    >
      <ContentCard title={`#${pullRequest.pullRequestNumber} ${pullRequest.title}`}>
        <p className="note">{pullRequest.body ?? "No description."}</p>
        <div className="badge-row">
          <span className="badge">{pullRequest.state}</span>
          <span className="badge">{pullRequest.contributorLoginId}</span>
          <span className="badge">
            {pullRequest.fromBranch} -&gt; {pullRequest.toBranch}
          </span>
        </div>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
        {mergeMessage ? <p className="note">{mergeMessage}</p> : null}
      </ContentCard>
      <PullRequestMergeSection
        mergePending={mergePending}
        onMerge={async () => {
          setMergePending(true);
          setErrorMessage(null);
          setMergeMessage(null);
          try {
            const result = await mergePullRequest({ data: pullRequestRef });
            if (result.conflicted) {
              setMergePreviewState({
                blockedReason: "merge-conflict",
                conflictedFiles: result.conflictedFiles,
                mergeable: false,
              });
              setMergeMessage("Merge conflicted.");
              return;
            }
            setMergePreviewState({
              blockedReason: null,
              conflictedFiles: [],
              mergeable: true,
            });
            setMergeMessage("Pull request merged.");
            await refreshRoute();
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Merge failed.");
          } finally {
            setMergePending(false);
          }
        }}
        onPreview={async () => {
          setPreviewPending(true);
          setErrorMessage(null);
          try {
            setMergePreviewState(await previewPullRequestMerge({ data: pullRequestRef }));
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Merge preview failed.");
          } finally {
            setPreviewPending(false);
          }
        }}
        preview={mergePreviewState}
        previewPending={previewPending}
      />
      <PullRequestReviewSection
        createPending={createPending}
        currentLoginId={data.currentLoginId}
        deletePendingCommentId={deletePendingCommentId}
        errorMessage={errorMessage}
        onCloseOrReopenThread={async (threadId, state) => {
          setThreadPendingId(threadId);
          setErrorMessage(null);
          try {
            await updatePullRequestReviewThreadState({
              data: {
                ...pullRequestRef,
                state,
                threadId,
              },
            });
            await refreshRoute();
          } catch (error) {
            setErrorMessage(
              error instanceof Error ? error.message : "Review thread update failed.",
            );
          } finally {
            setThreadPendingId(null);
          }
        }}
        onCreateComment={async (input) => {
          if (input.threadId) {
            setReplyPendingThreadId(input.threadId);
          } else {
            setCreatePending(true);
          }
          setErrorMessage(null);
          try {
            await createPullRequestReviewComment({
              data: {
                ...pullRequestRef,
                contents: input.contents,
                threadId: input.threadId,
              },
            });
            await refreshRoute();
          } catch (error) {
            setErrorMessage(
              error instanceof Error ? error.message : "Review comment create failed.",
            );
          } finally {
            setCreatePending(false);
            setReplyPendingThreadId(null);
          }
        }}
        onDeleteComment={async (commentId) => {
          setDeletePendingCommentId(commentId);
          setErrorMessage(null);
          try {
            await deletePullRequestReviewComment({
              data: {
                ...pullRequestRef,
                commentId,
              },
            });
            await refreshRoute();
          } catch (error) {
            setErrorMessage(
              error instanceof Error ? error.message : "Review comment delete failed.",
            );
          } finally {
            setDeletePendingCommentId(null);
          }
        }}
        replyPendingThreadId={replyPendingThreadId}
        threadPendingId={threadPendingId}
        threads={data.threads}
        viewerCanWrite={data.viewerCanWrite}
      />
    </ProjectShell>
  );
}
