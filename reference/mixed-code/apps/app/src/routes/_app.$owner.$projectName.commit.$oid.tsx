import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ContentCard, ProjectShell, SidebarSection } from "@app/components/parity-shells";
import { readCurrentSession } from "@app/lib/auth";
import { useTranslate } from "@app/lib/i18n-react";
import { readProjectDetail } from "@app/lib/project";
import {
  createRepositoryCommitDiscussionComment,
  deleteRepositoryCommitDiscussionComment,
  listRepositoryCommitDiscussionThreads,
  updateRepositoryCommitDiscussionThreadState,
} from "@app/lib/repo-discussion";
import { readProjectRepositoryId, readRepositoryCommitDetail } from "@app/lib/repo-browser";
import type {
  RepositoryCommitDiscussionCodeRange,
  RepositoryCommitDiscussionThread,
} from "@yona/contracts";

export const Route = createFileRoute("/_app/$owner/$projectName/commit/$oid")({
  loader: ({ params }) =>
    readProjectDetail({
      data: {
        ownerName: params.owner,
        projectName: params.projectName,
      },
    }),
  component: ProjectCommitDetailRouteComponent,
});

function ProjectCommitDetailRouteComponent() {
  const params = Route.useParams();
  const project = Route.useLoaderData();
  const isClient = typeof window !== "undefined";
  const t = useTranslate();
  const [createPending, setCreatePending] = React.useState(false);
  const [deletePendingCommentId, setDeletePendingCommentId] = React.useState<null | number>(null);
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null);
  const [replyPendingThreadId, setReplyPendingThreadId] = React.useState<null | number>(null);
  const [threadPendingId, setThreadPendingId] = React.useState<null | number>(null);

  const repoIdQuery = useQuery({
    enabled: isClient,
    queryFn: () =>
      readProjectRepositoryId({
        ownerName: params.owner,
        projectName: params.projectName,
      }),
    queryKey: ["repo-browser", "repo-id", params.owner, params.projectName],
  });

  const commitQuery = useQuery({
    enabled: isClient && Boolean(repoIdQuery.data),
    queryFn: () =>
      readRepositoryCommitDetail({
        oid: params.oid,
        repoId: repoIdQuery.data!,
      }),
    queryKey: ["repo-browser", "commit", repoIdQuery.data, params.oid],
  });
  const discussionQuery = useQuery({
    enabled: isClient && Boolean(repoIdQuery.data) && commitQuery.isSuccess,
    queryFn: () =>
      listRepositoryCommitDiscussionThreads({
        data: {
          oid: params.oid,
          repoId: repoIdQuery.data!,
        },
      }),
    queryKey: ["repo-browser", "commit-discussions", repoIdQuery.data, params.oid],
  });
  const sessionQuery = useQuery({
    enabled: isClient,
    queryFn: () => readCurrentSession(),
    queryKey: ["auth", "session", "commit-discussion"],
  });

  const refreshDiscussion = async () => {
    await discussionQuery.refetch();
  };

  return (
    <ProjectShell
      activeMenu="code"
      aside={
        <SidebarSection title={t("app.project.repositoryLinks")}>
          <p className="sidebar-kv">OID: {params.oid}</p>
          <div className="sidebar-link-list">
            <Link
              className="sidebar-link"
              params={{ owner: params.owner, projectName: params.projectName }}
              to="/$owner/$projectName/code"
            >
              {t("app.project.backToCodeBrowser")}
            </Link>
          </div>
        </SidebarSection>
      }
      project={project}
    >
      <ContentCard title={t("app.project.commitDetail")}>
        {repoIdQuery.error ? <p className="note error-note">{String(repoIdQuery.error)}</p> : null}
        {commitQuery.error ? <p className="note error-note">{String(commitQuery.error)}</p> : null}
        {commitQuery.isLoading ? <p className="note">{t("app.project.loadingCommit")}</p> : null}
        {commitQuery.data ? (
          <>
            <p className="note">
              <strong>{commitQuery.data.shortOid}</strong> {commitQuery.data.subject}
            </p>
            <p className="note">
              {commitQuery.data.authorName} ({commitQuery.data.authorEmail})
            </p>
            <pre className="note">{commitQuery.data.body || t("app.project.noCommitBody")}</pre>
          </>
        ) : null}
      </ContentCard>
      {commitQuery.data ? (
        <CommitDiscussionSection
          createPending={createPending}
          currentLoginId={sessionQuery.data?.loginId ?? null}
          deletePendingCommentId={deletePendingCommentId}
          errorMessage={
            errorMessage ??
            (discussionQuery.error
              ? discussionQuery.error instanceof Error
                ? discussionQuery.error.message
                : String(discussionQuery.error)
              : null)
          }
          onCloseOrReopenThread={async (thread) => {
            if (!repoIdQuery.data) {
              return;
            }

            setThreadPendingId(thread.threadId);
            setErrorMessage(null);
            React.startTransition(() => {
              void (async () => {
                try {
                  await updateRepositoryCommitDiscussionThreadState({
                    data: {
                      oid: params.oid,
                      repoId: repoIdQuery.data,
                      state: thread.state === "open" ? "closed" : "open",
                      threadId: thread.threadId,
                    },
                  });
                  await refreshDiscussion();
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error
                      ? error.message
                      : t("app.project.commitDiscussionActionFailed"),
                  );
                } finally {
                  setThreadPendingId(null);
                }
              })();
            });
          }}
          onCreateThread={async ({ contents, range }) => {
            if (!repoIdQuery.data) {
              return;
            }

            setCreatePending(true);
            setErrorMessage(null);
            React.startTransition(() => {
              void (async () => {
                try {
                  await createRepositoryCommitDiscussionComment({
                    data: {
                      contents,
                      oid: params.oid,
                      range,
                      repoId: repoIdQuery.data,
                    },
                  });
                  await refreshDiscussion();
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error
                      ? error.message
                      : t("app.project.commitDiscussionCreateFailed"),
                  );
                } finally {
                  setCreatePending(false);
                }
              })();
            });
          }}
          onDeleteComment={async (commentId) => {
            if (!repoIdQuery.data) {
              return;
            }

            setDeletePendingCommentId(commentId);
            setErrorMessage(null);
            React.startTransition(() => {
              void (async () => {
                try {
                  await deleteRepositoryCommitDiscussionComment({
                    data: {
                      commentId,
                      oid: params.oid,
                      repoId: repoIdQuery.data,
                    },
                  });
                  await refreshDiscussion();
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error
                      ? error.message
                      : t("app.project.commitDiscussionActionFailed"),
                  );
                } finally {
                  setDeletePendingCommentId(null);
                }
              })();
            });
          }}
          onReply={async (threadId, contents) => {
            if (!repoIdQuery.data) {
              return;
            }

            setReplyPendingThreadId(threadId);
            setErrorMessage(null);
            React.startTransition(() => {
              void (async () => {
                try {
                  await createRepositoryCommitDiscussionComment({
                    data: {
                      contents,
                      oid: params.oid,
                      repoId: repoIdQuery.data,
                      threadId,
                    },
                  });
                  await refreshDiscussion();
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error
                      ? error.message
                      : t("app.project.commitDiscussionActionFailed"),
                  );
                } finally {
                  setReplyPendingThreadId(null);
                }
              })();
            });
          }}
          replyPendingThreadId={replyPendingThreadId}
          threadPendingId={threadPendingId}
          threads={discussionQuery.data ?? []}
          viewerCanCreate={Boolean(sessionQuery.data && !sessionQuery.data.isAnonymous)}
        />
      ) : null}
    </ProjectShell>
  );
}

export function CommitDiscussionSection({
  createPending,
  currentLoginId,
  deletePendingCommentId,
  errorMessage,
  onCloseOrReopenThread,
  onCreateThread,
  onDeleteComment,
  onReply,
  replyPendingThreadId,
  threadPendingId,
  threads,
  viewerCanCreate,
}: {
  createPending: boolean;
  currentLoginId: null | string;
  deletePendingCommentId: null | number;
  errorMessage: null | string;
  onCloseOrReopenThread: (thread: RepositoryCommitDiscussionThread) => Promise<void> | void;
  onCreateThread: (input: {
    contents: string;
    range?: RepositoryCommitDiscussionCodeRange;
  }) => Promise<void> | void;
  onDeleteComment: (commentId: number) => Promise<void> | void;
  onReply: (threadId: number, contents: string) => Promise<void> | void;
  replyPendingThreadId: null | number;
  threadPendingId: null | number;
  threads: RepositoryCommitDiscussionThread[];
  viewerCanCreate: boolean;
}) {
  const [createFormError, setCreateFormError] = React.useState<null | string>(null);
  const [newComment, setNewComment] = React.useState("");
  const [replyDrafts, setReplyDrafts] = React.useState<Record<number, string>>({});
  const [rangeForm, setRangeForm] = React.useState({
    endColumn: "",
    endLine: "",
    endSide: "B",
    path: "",
    startColumn: "",
    startLine: "",
    startSide: "A",
  });
  const t = useTranslate();

  const buildRange = (): RepositoryCommitDiscussionCodeRange | undefined => {
    const path = rangeForm.path.trim();
    if (path.length === 0) {
      return undefined;
    }

    const startLine = Number.parseInt(rangeForm.startLine, 10);
    const endLine = Number.parseInt(rangeForm.endLine, 10);
    const startColumn = Number.parseInt(rangeForm.startColumn, 10);
    const endColumn = Number.parseInt(rangeForm.endColumn, 10);

    if (
      !Number.isInteger(startLine) ||
      startLine <= 0 ||
      !Number.isInteger(endLine) ||
      endLine <= 0 ||
      !Number.isInteger(startColumn) ||
      startColumn < 0 ||
      !Number.isInteger(endColumn) ||
      endColumn < 0
    ) {
      return null as never;
    }

    return {
      endColumn,
      endLine,
      endSide: rangeForm.endSide as "A" | "B",
      path,
      startColumn,
      startLine,
      startSide: rangeForm.startSide as "A" | "B",
    };
  };

  return (
    <ContentCard title={t("app.project.commitDiscussions")}>
      {viewerCanCreate ? (
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const contents = newComment.trim();
            if (contents.length === 0) {
              return;
            }

            const range = buildRange();
            if (rangeForm.path.trim().length > 0 && !range) {
              setCreateFormError(t("app.project.commitDiscussionRangeInvalid"));
              return;
            }

            setCreateFormError(null);
            onCreateThread({
              contents,
              range,
            });
            setNewComment("");
            setRangeForm({
              endColumn: "",
              endLine: "",
              endSide: "B",
              path: "",
              startColumn: "",
              startLine: "",
              startSide: "A",
            });
          }}
        >
          <label className="field">
            <span>{t("app.project.newCommitDiscussion")}</span>
            <textarea
              onChange={(event) => setNewComment(event.target.value)}
              placeholder={t("app.project.commitDiscussionComment")}
              rows={4}
              value={newComment}
            />
          </label>
          <div className="content-grid">
            <label className="field">
              <span>{t("app.project.filePath")}</span>
              <input
                onChange={(event) =>
                  setRangeForm((current) => ({ ...current, path: event.target.value }))
                }
                type="text"
                value={rangeForm.path}
              />
            </label>
            <label className="field">
              <span>{t("app.project.commitDiscussionStartLine")}</span>
              <input
                onChange={(event) =>
                  setRangeForm((current) => ({ ...current, startLine: event.target.value }))
                }
                type="text"
                value={rangeForm.startLine}
              />
            </label>
            <label className="field">
              <span>{t("app.project.commitDiscussionEndLine")}</span>
              <input
                onChange={(event) =>
                  setRangeForm((current) => ({ ...current, endLine: event.target.value }))
                }
                type="text"
                value={rangeForm.endLine}
              />
            </label>
            <label className="field">
              <span>{t("app.project.commitDiscussionStartColumn")}</span>
              <input
                onChange={(event) =>
                  setRangeForm((current) => ({ ...current, startColumn: event.target.value }))
                }
                type="text"
                value={rangeForm.startColumn}
              />
            </label>
            <label className="field">
              <span>{t("app.project.commitDiscussionEndColumn")}</span>
              <input
                onChange={(event) =>
                  setRangeForm((current) => ({ ...current, endColumn: event.target.value }))
                }
                type="text"
                value={rangeForm.endColumn}
              />
            </label>
            <label className="field">
              <span>{t("app.project.commitDiscussionStartSide")}</span>
              <select
                onChange={(event) =>
                  setRangeForm((current) => ({ ...current, startSide: event.target.value }))
                }
                value={rangeForm.startSide}
              >
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </label>
            <label className="field">
              <span>{t("app.project.commitDiscussionEndSide")}</span>
              <select
                onChange={(event) =>
                  setRangeForm((current) => ({ ...current, endSide: event.target.value }))
                }
                value={rangeForm.endSide}
              >
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </label>
          </div>
          <div className="action-row">
            <button className="cta" type="submit">
              {createPending ? t("app.project.creating") : t("app.project.addComment")}
            </button>
          </div>
        </form>
      ) : null}

      {createFormError ? <p className="note error-note">{createFormError}</p> : null}
      {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      {threads.length === 0 ? <p className="note">{t("app.project.noCommitDiscussions")}</p> : null}

      {threads.map((thread) => (
        <section className="content-card" key={thread.threadId}>
          <header className="section-header">
            <h2>
              #{thread.threadId}{" "}
              {thread.path ? `${thread.path}` : t("app.project.commitDiscussionGeneralThread")}
            </h2>
          </header>
          <div className="section-body">
            <div className="badge-row">
              <span className="badge">{t("app.project.stateBadge", thread.state)}</span>
              <span className="badge">
                {t("app.project.commitDiscussionThreadType", thread.threadType)}
              </span>
            </div>

            {thread.comments.map((comment) => (
              <div className="content-card" key={comment.commentId}>
                <div className="section-body">
                  <p className="note">
                    <strong>{comment.authorName}</strong> (@{comment.authorLoginId})
                  </p>
                  <p className="note">{comment.contents}</p>
                  <div className="action-row">
                    {currentLoginId === comment.authorLoginId ? (
                      <button
                        className="secondary-cta"
                        disabled={deletePendingCommentId === comment.commentId}
                        onClick={() => onDeleteComment(comment.commentId)}
                        type="button"
                      >
                        {deletePendingCommentId === comment.commentId
                          ? t("app.project.updating")
                          : t("app.project.deleteComment")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}

            {currentLoginId === thread.authorLoginId ? (
              <div className="action-row">
                <button
                  className="secondary-cta"
                  disabled={threadPendingId === thread.threadId}
                  onClick={() => void onCloseOrReopenThread(thread)}
                  type="button"
                >
                  {thread.state === "open"
                    ? t("app.project.closeThread")
                    : t("app.project.reopenThread")}
                </button>
              </div>
            ) : null}

            {viewerCanCreate ? (
              <form
                className="form-grid"
                onSubmit={(event) => {
                  event.preventDefault();
                  const contents = (replyDrafts[thread.threadId] ?? "").trim();
                  if (contents.length === 0) {
                    return;
                  }

                  onReply(thread.threadId, contents);
                }}
              >
                <label className="field">
                  <span>{t("app.project.replyToThread")}</span>
                  <textarea
                    onChange={(event) =>
                      setReplyDrafts((current) => ({
                        ...current,
                        [thread.threadId]: event.target.value,
                      }))
                    }
                    placeholder={t("app.project.commitDiscussionReply")}
                    rows={3}
                    value={replyDrafts[thread.threadId] ?? ""}
                  />
                </label>
                <div className="action-row">
                  <button
                    className="cta"
                    disabled={replyPendingThreadId === thread.threadId}
                    type="submit"
                  >
                    {replyPendingThreadId === thread.threadId
                      ? t("app.project.creating")
                      : t("app.project.reply")}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </section>
      ))}
    </ContentCard>
  );
}
