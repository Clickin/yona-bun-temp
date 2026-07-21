import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  codeCommitDetailQueryOptions,
  closeCommitDiscussionThreadRest,
  createCommitDiscussionCommentRest,
  deleteCommitDiscussionCommentRest,
  openCommitDiscussionThreadRest,
  type CodeCommitDetailResponse,
  type CodeReviewAttachment,
  type CodeReviewComment,
  type CodeReviewThread,
  unwatchCommitRest,
  updateCommitDiscussionCommentRest,
  watchCommitRest,
} from "../../../../api/code-commits";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import { apiQueryKeys } from "../../../../api/query-keys";
import { currentSessionQueryOptions } from "../../../../api/session";
import type { ProjectContainer } from "../../../../api/types";
import { readSessionBootstrap } from "../../../../auth-workspace-client";
import { useLegacyMessages } from "../../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { LegacyMarkdownHelp } from "../../../-legacy-markdown-help";
import { styles } from "./-commit-detail.stylex";

const sx = {
  codediffLayout: stylex.props(styles.codediffLayout),
  diffsLayout: stylex.props(styles.diffsLayout),
  reviewPanel: stylex.props(styles.reviewPanel),
  reviewContainer: stylex.props(styles.reviewContainer),
  page: stylex.props(styles.page),
  browse: stylex.props(styles.browse),
  commitInfo: stylex.props(styles.commitInfo),
  commitMessage: stylex.props(styles.commitMessage),
  commitDescription: stylex.props(styles.commitDescription),
  diffBody: stylex.props(styles.diffBody),
  browseTabs: stylex.props(styles.browseTabs),
  reviewTabs: stylex.props(styles.reviewTabs),
  editorTabContent: stylex.props(styles.editorTabContent),
  reviewTextarea: stylex.props(styles.reviewTextarea),
  reviewFormShell: stylex.props(styles.reviewFormShell),
  reviewAuthorInfoWrap: stylex.props(styles.reviewAuthorInfoWrap),
  reviewWriteCommentBox: stylex.props(styles.reviewWriteCommentBox),
  rightText: stylex.props(styles.rightText),
  threadReviewForm: stylex.props(styles.threadReviewForm),
  rangedThreadHeader: stylex.props(styles.rangedThreadHeader),
  threadComments: stylex.props(styles.threadComments),
  threadComment: stylex.props(styles.threadComment),
  threadMediaBody: stylex.props(styles.threadMediaBody),
  rangedThreadMinimize: stylex.props(styles.rangedThreadMinimize),
  threadActions: stylex.props(styles.threadActions),
  originalMessageToggle: stylex.props(styles.originalMessageToggle),
} as const;

const legacyMarkdownTextareaAttr = { markdown: "true" };

type CurrentUserSummary = {
  avatarUrl: string;
  loginId: string;
  userLabel: string;
};

type ParsedDiffLine =
  | { kind: "range"; text: string }
  | {
      kind: "line";
      lineNumber: number;
      newLineNumber: number | null;
      oldLineNumber: number | null;
      prefix: string;
      text: string;
      type: "add" | "context" | "remove";
    };

type ParsedFileDiff = {
  changeType: "add" | "copy" | "delete" | "modify" | "rename";
  lines: ParsedDiffLine[];
  pathA: string;
  pathB: string;
};

type CommitFileDiff = CodeCommitDetailResponse["files"][number] & {
  error?: string;
  errorCode?: string;
  errorCodes?: string[];
  errors?: string[];
  fileModeChanged?: boolean | string;
  hasError?: boolean | string;
  isFileModeChanged?: boolean | string;
  newMode?: string;
  oldMode?: string;
};

export const Route = createFileRoute("/$ownerName/$projectName/commit/$commitId")({
  component: ProjectCommitDetailRoute,
  validateSearch(search) {
    return {
      branch: typeof search.branch === "string" ? search.branch : "",
      path: typeof search.path === "string" ? search.path : "",
    };
  },
});

function ProjectCommitDetailRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const routeParams = Route.useParams();
  const search = Route.useSearch();
  return (
    <ProjectCommitDetailScreen
      branch={search.branch}
      path={search.path}
      routeParams={routeParams}
      runtimeConfig={runtimeConfig}
    />
  );
}

function ProjectCommitDetailScreen({
  branch,
  path,
  routeParams,
  runtimeConfig,
}: {
  branch: string;
  path: string;
  routeParams: { commitId: string; ownerName: string; projectName: string };
  runtimeConfig: RuntimeConfig;
}) {
  const { commitId, ownerName, projectName } = routeParams;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const detailQuery = useQuery(
    codeCommitDetailQueryOptions(runtimeConfig, {
      commitId,
      ownerName,
      projectName,
      query: { branch, path },
    }),
  );
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));

  if (!projectQuery.data || !detailQuery.data || !sessionQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectCommitDetailTitle commitId={detailQuery.data.commit?.commitId ?? commitId} />
      <ProjectCommitDetailBody
        currentUser={{
          avatarUrl: stringField(
            sessionQuery.data.avatarUrl,
            "/assets/images/default-avatar-32.png",
          ),
          loginId: stringField(sessionQuery.data.loginId, ""),
          userLabel: stringField(
            sessionQuery.data.userLabel,
            stringField(sessionQuery.data.loginId, ""),
          ),
        }}
        detail={detailQuery.data}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectCommitDetailTitle({ commitId }: { commitId: string }) {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = Route.useParams();

  return <title>{`${t("code.commits")} @${commitId} - ${ownerName}/${projectName}`}</title>;
}

function ProjectCommitDetailBody({
  currentUser,
  detail,
  project,
  runtimeConfig,
}: {
  currentUser: CurrentUserSummary;
  detail: CodeCommitDetailResponse;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const { commitId, ownerName, projectName } = Route.useParams();
  const { branch, path } = Route.useSearch();
  const queryClient = useQueryClient();
  const selectedBranch = detail.selectedBranch || branch;
  const encodedBranch = encodeURIComponent(selectedBranch);
  const commit = detail.commit;
  const openThreads = detail.threads.filter((thread) => thread.state.toLowerCase() === "open");
  const closedThreads = detail.threads.filter((thread) => thread.state.toLowerCase() === "closed");
  const [reviewCardTab, setReviewCardTab] = useState<"closed" | "open">("open");
  const [reviewCardsCollapsed, setReviewCardsCollapsed] = useState(false);
  const [blockReviewFormOpen, setBlockReviewFormOpen] = useState(false);
  const [blockReviewButtonVisible, setBlockReviewButtonVisible] = useState(false);
  const blockReviewButtonProps = stylex.props(
    blockReviewButtonVisible ? styles.blockReviewButtonVisible : styles.blockReviewButtonHidden,
  );
  const [commentDeleteCommentId, setCommentDeleteCommentId] = useState<number | null>(null);
  const nonRangedThreads = detail.threads.filter(isNonRangedThread);
  const isSvn = project.vcs === "SVN" || project.vcs === "SUBVERSION";
  const detailQueryKey = apiQueryKeys.project.commitDetail(ownerName, projectName, commitId, {
    branch: branch ?? "",
    path: path ?? "",
  });
  const scope = { commitId, ownerName, projectName };
  const watchMutation = useMutation({
    mutationFn: async (nextWatching: boolean) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      const input = { ...scope, query: { branch, path } };
      return nextWatching
        ? watchCommitRest(runtimeConfig, csrfToken, input)
        : unwatchCommitRest(runtimeConfig, csrfToken, input);
    },
    onSuccess(nextDetail) {
      queryClient.setQueryData(detailQueryKey, nextDetail);
    },
  });
  const createCommentMutation = useMutation({
    mutationFn: async (input: { contentsMarkdown: string; threadId?: number }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createCommitDiscussionCommentRest(runtimeConfig, csrfToken, {
        ...scope,
        contentsMarkdown: input.contentsMarkdown,
        threadId: input.threadId,
      });
    },
    onSuccess(nextDetail) {
      queryClient.setQueryData(detailQueryKey, nextDetail);
    },
  });
  const updateCommentMutation = useMutation({
    mutationFn: async (input: { commentId: number; contentsMarkdown: string }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updateCommitDiscussionCommentRest(runtimeConfig, csrfToken, {
        ...scope,
        commentId: input.commentId,
        contentsMarkdown: input.contentsMarkdown,
      });
    },
    onSuccess(nextDetail) {
      queryClient.setQueryData(detailQueryKey, nextDetail);
    },
  });
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteCommitDiscussionCommentRest(runtimeConfig, csrfToken, {
        ...scope,
        commentId,
      });
    },
    onSuccess(nextDetail) {
      queryClient.setQueryData(detailQueryKey, nextDetail);
    },
  });
  const threadStateMutation = useMutation({
    mutationFn: async (input: { state: string; threadId: number }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return input.state === "open"
        ? closeCommitDiscussionThreadRest(runtimeConfig, csrfToken, {
            ...scope,
            threadId: input.threadId,
          })
        : openCommitDiscussionThreadRest(runtimeConfig, csrfToken, {
            ...scope,
            threadId: input.threadId,
          });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: detailQueryKey });
    },
  });

  if (isSvn) {
    return (
      <SvnCommitDetailBody
        createComment={(contentsMarkdown) => createCommentMutation.mutate({ contentsMarkdown })}
        detail={detail}
        encodedBranch={encodedBranch}
        ownerName={ownerName}
        projectName={projectName}
        runtimeConfig={runtimeConfig}
        selectedBranch={selectedBranch}
        toggleWatch={() => watchMutation.mutate(!detail.isWatching)}
      />
    );
  }

  return (
    <>
      <div {...sx.page} data-stylex-owner="commit-detail-page">
        <div data-stylex-owner="commit-detail-shell">
          <div {...sx.browse} data-stylex-owner="commit-detail-browse" id="code-browse-wrap">
            <ul
              {...sx.browseTabs}
              className={`${sx.browseTabs.className} nav nav-tabs`}
              data-stylex-owner="commit-detail-browse-tabs"
            >
              <li>
                <Link to={projectTo(ownerName, projectName, "code")}>{t("code.files")}</Link>
              </li>
              <li className="active">
                <Link to={projectTo(ownerName, projectName, "commits")}>{t("code.commits")}</Link>
              </li>
              {project.vcs === "GIT" ? (
                <li>
                  <Link to={projectTo(ownerName, projectName, "branches")}>
                    {t("title.branches")}
                  </Link>
                </li>
              ) : null}
            </ul>

            <div
              {...sx.codediffLayout}
              className={`${sx.codediffLayout.className} codediff-wrap${reviewCardsCollapsed ? " diffs-only" : ""}`}
              data-stylex-owner="commit-detail-diff-layout"
            >
              <button
                type="button"
                className="ybtn ybtn-default btn-show-reviewcards"
                onClick={() => setReviewCardsCollapsed(false)}
              >
                <i className="yobicon-restore"></i>
              </button>
              <div
                {...sx.diffsLayout}
                className={`${sx.diffsLayout.className} diffs-wrap`}
                data-stylex-owner="commit-detail-diffs"
              >
                <div {...sx.commitInfo} data-stylex-owner="commit-detail-info">
                  <div className="commitAuthor">
                    <CommitAuthor detail={detail} />
                    <span className="ago" title={commit?.authorDate ?? ""}>
                      {commit?.authorDate ?? ""}
                    </span>
                  </div>
                  <div data-stylex-owner="commit-detail-message">
                    <CommitMessage
                      message={commit?.message ?? ""}
                      shortMessage={commit?.shortMessage ?? ""}
                    />
                  </div>
                  <div className="commitId-wrap">
                    <strong className="commitId">@{commit?.commitId ?? commitId}</strong>
                  </div>
                </div>

                {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- legacy yobi.CodeCommentBlock opens block review controls from text selection inside .diff-body. */}
                <div
                  {...sx.diffBody}
                  className={`diff-body ${sx.diffBody.className}`}
                  data-stylex-owner="commit-detail-diff-body"
                  onMouseUp={() => {
                    const selection = globalThis.getSelection?.();
                    const selectedText = selection?.toString() ?? "";
                    if (selectedText.length > 0) {
                      setBlockReviewButtonVisible(true);
                    }
                  }}
                >
                  {detail.files.map((file) => (
                    <FileDiffView
                      commitA={detail.parentCommit?.commitId ?? ""}
                      commitB={commit?.commitId ?? commitId}
                      file={file}
                      key={file.path}
                      currentUser={currentUser}
                      deleteComment={(commentId) => deleteCommentMutation.mutate(commentId)}
                      openCommentDeleteModal={setCommentDeleteCommentId}
                      ownerName={ownerName}
                      projectName={projectName}
                      runtimeConfig={runtimeConfig}
                      submitReply={(threadId, contentsMarkdown) =>
                        createCommentMutation.mutate({ contentsMarkdown, threadId })
                      }
                      threads={detail.threads}
                      toggleThreadState={(threadId, state) =>
                        threadStateMutation.mutate({ state, threadId })
                      }
                      updateComment={(commentId, contentsMarkdown) =>
                        updateCommentMutation.mutate({ commentId, contentsMarkdown })
                      }
                    />
                  ))}
                  <div
                    {...blockReviewButtonProps}
                    className={`btnPop ${blockReviewButtonProps.className ?? ""}`.trim()}
                    data-stylex-owner="commit-detail-block-review-button"
                  >
                    <button
                      type="button"
                      className="ybtn ybtn-info ybtn-small"
                      onClick={() => {
                        setBlockReviewFormOpen(true);
                        setBlockReviewButtonVisible(false);
                      }}
                    >
                      <i className="yobicon-post2"></i>
                    </button>
                  </div>
                </div>

                <div className="board-comment-wrap">
                  <div className="non-ranged-threads-wrap">
                    {nonRangedThreads.map((thread) => (
                      <CodeCommentThreadView
                        isNonRanged
                        currentUser={currentUser}
                        deleteComment={(commentId) => deleteCommentMutation.mutate(commentId)}
                        openCommentDeleteModal={setCommentDeleteCommentId}
                        key={thread.id}
                        ownerName={ownerName}
                        projectName={projectName}
                        runtimeConfig={runtimeConfig}
                        thread={thread}
                        submitReply={(threadId, contentsMarkdown) =>
                          createCommentMutation.mutate({ contentsMarkdown, threadId })
                        }
                        toggleThreadState={(threadId, state) =>
                          threadStateMutation.mutate({ state, threadId })
                        }
                        updateComment={(commentId, contentsMarkdown) =>
                          updateCommentMutation.mutate({ commentId, contentsMarkdown })
                        }
                      />
                    ))}
                  </div>
                  {detail.permissions.canComment ? (
                    <CommentForm
                      action={commitCommentsHref(
                        runtimeConfig.basePath,
                        ownerName,
                        projectName,
                        commitId,
                      )}
                      onSubmit={(contentsMarkdown) =>
                        createCommentMutation.mutate({ contentsMarkdown })
                      }
                    />
                  ) : null}
                </div>

                {detail.permissions.canComment ? (
                  <ReviewForm
                    action={commitCommentsHref(
                      runtimeConfig.basePath,
                      ownerName,
                      projectName,
                      commitId,
                    )}
                    currentUser={currentUser}
                    isOpen={blockReviewFormOpen}
                    onClose={() => setBlockReviewFormOpen(false)}
                  />
                ) : null}
              </div>

              <div
                {...sx.reviewPanel}
                className={`${sx.reviewPanel.className} review-wrap span-hard-wrap`}
                data-stylex-owner="commit-detail-review-panel"
              >
                <div
                  {...sx.reviewContainer}
                  className={`${sx.reviewContainer.className} review-container`}
                >
                  <button
                    type="button"
                    className="ybtn ybtn-default btn-hide-reviewcards"
                    onClick={() => setReviewCardsCollapsed(true)}
                  >
                    <i className="yobicon-maximize"></i>
                  </button>
                  <ul
                    {...sx.reviewTabs}
                    className={`${sx.reviewTabs.className} nav nav-tabs`}
                    data-stylex-owner="commit-detail-review-tabs"
                  >
                    <li className={reviewCardTab === "open" ? "active" : undefined}>
                      <button type="button" onClick={() => setReviewCardTab("open")}>
                        {`${t("issue.state.open")} ${openThreads.length}`}
                      </button>
                    </li>
                    <li className={reviewCardTab === "closed" ? "active" : undefined}>
                      <button type="button" onClick={() => setReviewCardTab("closed")}>
                        {`${t("issue.state.closed")} ${closedThreads.length}`}
                      </button>
                    </li>
                  </ul>
                  <div className="tab-content review-list">
                    <ReviewCards
                      id="reviewcards-open"
                      isActive={reviewCardTab === "open"}
                      threads={openThreads}
                    />
                    <ReviewCards
                      id="reviewcards-closed"
                      isActive={reviewCardTab === "closed"}
                      threads={closedThreads}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            id="watch-button"
            type="button"
            className={`pull-left ybtn ${detail.isWatching ? "active ybtn-watching" : ""}`}
            onClick={() => watchMutation.mutate(!detail.isWatching)}
          >
            {t("notification.watch")}
          </button>

          <Link
            to={projectTo(ownerName, projectName, "commits", encodedBranch, path)}
            className="ybtn pull-right"
          >
            {t("button.list")}
          </Link>
        </div>
      </div>
      <CommentDeleteModal
        isOpen={commentDeleteCommentId !== null}
        onClose={() => setCommentDeleteCommentId(null)}
        onConfirm={() => {
          if (commentDeleteCommentId !== null) {
            deleteCommentMutation.mutate(commentDeleteCommentId);
          }
          setCommentDeleteCommentId(null);
        }}
      />
    </>
  );
}

function SvnCommitDetailBody({
  createComment,
  detail,
  encodedBranch,
  ownerName,
  projectName,
  runtimeConfig,
  selectedBranch,
  toggleWatch,
}: {
  createComment: (contentsMarkdown: string) => void;
  detail: CodeCommitDetailResponse;
  encodedBranch: string;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  selectedBranch: string;
  toggleWatch: () => void;
}) {
  const { t } = useLegacyMessages();
  const { commitId } = Route.useParams();
  const commit = detail.commit;
  const patch = detail.files[0]?.patch ?? "";
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const anonymousAuthorName = t("user.role.anonymous");

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div id="code-browse-wrap" className="code-browse-wrap">
          <div
            id="branches"
            className={`btn-group branches pull-right${branchDropdownOpen ? " open" : ""}`}
            data-name="branch"
          >
            <button
              className="btn dropdown-toggle large"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setBranchDropdownOpen((isOpen) => !isOpen);
              }}
            >
              <span className="d-label">{selectedBranch || "HEAD"}</span>
              <span className="d-caret">
                <span className="caret"></span>
              </span>
            </button>
            <ul className="dropdown-menu">
              {detail.branches.map((branch) => (
                <li
                  data-value={branch.name}
                  data-selected={branch.name === selectedBranch ? "true" : undefined}
                  key={branch.name}
                >
                  <Link
                    to={projectTo(
                      ownerName,
                      projectName,
                      "commits",
                      encodeURIComponent(branch.name),
                    )}
                  >
                    {branch.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <ul
            {...sx.browseTabs}
            className={`${sx.browseTabs.className} nav nav-tabs`}
            data-stylex-owner="commit-detail-svn-browse-tabs"
          >
            <li>
              <Link to={projectTo(ownerName, projectName, "code")}>{t("code.files")}</Link>
            </li>
            <li className="active">
              <Link to={projectTo(ownerName, projectName, "commits")}>{t("code.commits")}</Link>
            </li>
          </ul>

          <p className="commitInfo">
            <span className="avatar-wrap">
              <img
                src={prefixBasePath(runtimeConfig.basePath, "/assets/images/default-avatar-32.png")}
                width="32"
                height="32"
                alt=""
              />
            </span>
            <strong>{commit?.authorName || commit?.authorEmail || anonymousAuthorName}</strong>
            <span className="ago" title={commit?.authorDate ?? ""}>
              {commit?.authorDate ?? ""}
            </span>
            <strong className="commitId pull-right">@{commit?.commitId ?? commitId}</strong>
          </p>
          <pre className="commitMsg">{commit?.message ?? ""}</pre>
          <div className="diff-wrap">
            <div id="commit" data-commit-origin="true" className="diff-body hide">
              {patch}
            </div>
          </div>

          <div className="board-comment-wrap">
            {detail.permissions.canComment ? (
              <CommentForm
                action={commitCommentsHref(
                  runtimeConfig.basePath,
                  ownerName,
                  projectName,
                  commitId,
                )}
                onSubmit={createComment}
              />
            ) : null}
          </div>
        </div>

        <button
          id="watch-button"
          type="button"
          className={`ybtn ${detail.isWatching ? "active" : ""}`}
          onClick={toggleWatch}
        >
          {t("notification.watch")}
        </button>

        <Link
          to={projectTo(ownerName, projectName, "commits", encodedBranch)}
          className="ybtn pull-right"
        >
          {t("button.list")}
        </Link>

        <div id="minimap" className="minimap-outer">
          <div className="minimap-wrap">
            <div className="minimap-curr"></div>
            <div className="minimap-links"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileDiffView({
  commitA,
  commitB,
  currentUser,
  deleteComment,
  file,
  openCommentDeleteModal,
  ownerName,
  projectName,
  runtimeConfig,
  submitReply,
  threads,
  toggleThreadState,
  updateComment,
}: {
  commitA: string;
  commitB: string;
  currentUser: CurrentUserSummary;
  deleteComment: (commentId: number) => void;
  file: CommitFileDiff;
  openCommentDeleteModal: (commentId: number) => void;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  submitReply: (threadId: number, contentsMarkdown: string) => void;
  threads: CodeReviewThread[];
  toggleThreadState: (threadId: number, state: string) => void;
  updateComment: (commentId: number, contentsMarkdown: string) => void;
}) {
  const { t } = useLegacyMessages();
  const parsed = parseUnifiedDiff(file.path, file.patch);
  const filePath = parsed.pathB || parsed.pathA || file.path;
  const fileHeader = fileDiffHeaderLabel(parsed, filePath, t);
  const fileId = filePath.replace(/\//g, "-").replace(/\./g, "-");
  const commitAShort = shortenCommitId(commitA);
  const commitBShort = shortenCommitId(commitB);
  const fileThreads = threads.filter((thread) => thread.path === filePath);
  const errorMessageKey = fileDiffErrorMessageKey(file);
  const fileModeChange = getFileModeChange(file);
  const shouldRenderNoChanges = parsed.lines.length === 0 && !fileModeChange;

  return (
    <div
      id={fileId}
      className={`${stylex.props(styles.file).className} diff-partial-outer`}
      data-stylex-owner="commit-detail-file"
    >
      <div className="diff-partial-inner">
        <div
          {...stylex.props(styles.fileMeta)}
          className={`${stylex.props(styles.fileMeta).className} diff-partial-meta`}
          data-stylex-owner="commit-detail-file-meta"
        >
          <div className="diff-partial-commit">
            <div className="diff-partial-commit-id">
              {commitA && parsed.pathA ? (
                <Link
                  to={projectTo(ownerName, projectName, "code", commitA, parsed.pathA)}
                  title={commitA}
                  target="_blank"
                >
                  {commitAShort}
                </Link>
              ) : (
                "\u00a0"
              )}
            </div>
            <div className="diff-partial-commit-id">
              {commitB && parsed.pathB ? (
                <Link
                  to={projectTo(ownerName, projectName, "code", commitB, parsed.pathB)}
                  title={commitB}
                  target="_blank"
                >
                  {commitBShort}
                </Link>
              ) : (
                "\u00a0"
              )}
            </div>
          </div>
          <div className="diff-partial-file">
            <span className="filename">{fileHeader}</span>
          </div>
        </div>
        <div
          {...stylex.props(styles.fileCode)}
          className={`${stylex.props(styles.fileCode).className} diff-partial-code`}
          data-hashcode={filePath}
          data-stylex-owner="commit-detail-file-code"
        >
          <div className="patch-header">
            {parsed.pathA ? <div className="path">{`--- ${parsed.pathA}`}</div> : null}
            {parsed.pathB ? <div className="path">{`+++ ${parsed.pathB}`}</div> : null}
          </div>
          <table
            className="diff-container show-comments"
            data-path-a={parsed.pathA}
            data-path-b={parsed.pathB}
            data-commit-a={commitA}
            data-commit-b={commitB}
            data-file-path={filePath}
          >
            <tbody>
              {errorMessageKey ? (
                <FileDiffErrorRow messageKey={errorMessageKey} />
              ) : shouldRenderNoChanges ? (
                <FileDiffErrorRow messageKey="code.noChanges" />
              ) : (
                <>
                  {fileModeChange ? <FileModeChangedRow modeChange={fileModeChange} /> : null}
                  {parsed.lines.map((line) => {
                    const lineThreads =
                      line.kind === "line" ? threadsForDiffLine(fileThreads, line) : [];

                    return line.kind === "range" ? (
                      <tr className="range" key={diffLineKey(line)}>
                        <td className="linenum">
                          <div className="line-number" data-line-num="...">
                            <span className="hidden">...</span>
                          </div>
                        </td>
                        <td className="linenum">
                          <div className="line-number" data-line-num="...">
                            <span className="hidden">...</span>
                          </div>
                        </td>
                        <td className="hunk">{line.text}</td>
                      </tr>
                    ) : (
                      <FragmentWithInlineComments
                        commitId={commitB}
                        currentUser={currentUser}
                        deleteComment={deleteComment}
                        openCommentDeleteModal={openCommentDeleteModal}
                        key={diffLineKey(line)}
                        line={line}
                        ownerName={ownerName}
                        projectName={projectName}
                        runtimeConfig={runtimeConfig}
                        submitReply={submitReply}
                        threads={lineThreads}
                        toggleThreadState={toggleThreadState}
                        updateComment={updateComment}
                      />
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FileModeChangedRow({ modeChange }: { modeChange: { newMode: string; oldMode: string } }) {
  const { t } = useLegacyMessages();

  return (
    <tr>
      <td className="linenum">
        <div className="line-number" data-line-num={modeChange.oldMode}></div>
        <span className="hidden">{modeChange.oldMode}</span>
      </td>
      <td className="linenum">
        <div className="line-number" data-line-num={modeChange.newMode}></div>
        <span className="hidden">{modeChange.newMode}</span>
      </td>
      <td className="isBinary">{t("code.fileModeChanged")}</td>
    </tr>
  );
}

function FileDiffErrorRow({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();

  return (
    <tr>
      <td colSpan={3}>{t(messageKey)}</td>
    </tr>
  );
}

function fileDiffErrorMessageKey(file: CommitFileDiff) {
  const errors = [
    file.error,
    file.errorCode,
    file.hasError === true ? "UNKNOWN" : file.hasError || undefined,
    ...(file.errors ?? []),
    ...(file.errorCodes ?? []),
  ];

  if (errors.includes("OTHERS_SIZE_EXCEEDED")) {
    return "code.skipDiff";
  }
  if (errors.includes("A_SIZE_EXCEEDED") || errors.includes("B_SIZE_EXCEEDED")) {
    return "code.tooBigFile";
  }
  if (errors.includes("DIFF_SIZE_EXCEEDED")) {
    return "code.tooBigDiff";
  }
  return errors.some(Boolean) ? "code.unknownError" : null;
}

function getFileModeChange(file: CommitFileDiff) {
  const oldMode = file.oldMode || file.patch.match(/^old mode (.+)$/mu)?.[1] || "";
  const newMode = file.newMode || file.patch.match(/^new mode (.+)$/mu)?.[1] || "";

  if (
    file.isFileModeChanged === true ||
    file.fileModeChanged === true ||
    Boolean(oldMode || newMode)
  ) {
    return { newMode, oldMode };
  }

  return null;
}

function FragmentWithInlineComments({
  commitId,
  currentUser,
  deleteComment,
  line,
  openCommentDeleteModal,
  ownerName,
  projectName,
  runtimeConfig,
  submitReply,
  threads,
  toggleThreadState,
  updateComment,
}: {
  commitId: string;
  currentUser: CurrentUserSummary;
  deleteComment: (commentId: number) => void;
  line: Extract<ParsedDiffLine, { kind: "line" }>;
  openCommentDeleteModal: (commentId: number) => void;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  submitReply: (threadId: number, contentsMarkdown: string) => void;
  threads: CodeReviewThread[];
  toggleThreadState: (threadId: number, state: string) => void;
  updateComment: (commentId: number, contentsMarkdown: string) => void;
}) {
  return (
    <>
      <DiffLineView line={line} />
      {threads.length > 0 ? (
        <InlineCommentRow
          commitId={commitId}
          currentUser={currentUser}
          deleteComment={deleteComment}
          openCommentDeleteModal={openCommentDeleteModal}
          ownerName={ownerName}
          projectName={projectName}
          runtimeConfig={runtimeConfig}
          submitReply={submitReply}
          threads={threads}
          toggleThreadState={toggleThreadState}
          updateComment={updateComment}
        />
      ) : null}
    </>
  );
}

function DiffLineView({ line }: { line: Extract<ParsedDiffLine, { kind: "line" }> }) {
  const oldLine = line.oldLineNumber === null ? "" : String(line.oldLineNumber);
  const newLine = line.newLineNumber === null ? "" : String(line.newLineNumber);

  return (
    <tr
      className={line.type}
      data-line={line.lineNumber}
      data-side={line.type === "remove" ? "A" : "B"}
    >
      <td className="linenum">
        <i className="yobicon-comments"></i>
        <div className="line-number" data-line-num={oldLine}></div>
        <span className="hidden">{oldLine}</span>
      </td>
      <td className="linenum">
        <div className="line-number" data-line-num={newLine}></div>
        <span className="hidden">{newLine}</span>
      </td>
      <td className="code">
        <pre className="diff-partial-codeline">{`${line.prefix}${line.text}`}</pre>
      </td>
    </tr>
  );
}

function diffLineKey(line: ParsedDiffLine) {
  if (line.kind === "range") {
    return `range-${line.text}`;
  }

  return `line-${line.oldLineNumber ?? ""}-${line.newLineNumber ?? ""}-${line.prefix}${line.text}`;
}

function threadsForDiffLine(
  threads: CodeReviewThread[],
  line: Extract<ParsedDiffLine, { kind: "line" }>,
) {
  return threads.filter((thread) => {
    const side = thread.startSide === "A" ? "A" : "B";
    const lineNumber = side === "A" ? line.oldLineNumber : line.newLineNumber;
    return lineNumber !== null && thread.startLine === lineNumber;
  });
}

function InlineCommentRow({
  commitId,
  currentUser,
  deleteComment,
  openCommentDeleteModal,
  ownerName,
  projectName,
  runtimeConfig,
  submitReply,
  threads,
  toggleThreadState,
  updateComment,
}: {
  commitId: string;
  currentUser: CurrentUserSummary;
  deleteComment: (commentId: number) => void;
  openCommentDeleteModal: (commentId: number) => void;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  submitReply: (threadId: number, contentsMarkdown: string) => void;
  threads: CodeReviewThread[];
  toggleThreadState: (threadId: number, state: string) => void;
  updateComment: (commentId: number, contentsMarkdown: string) => void;
}) {
  const [foldedThreadIds, setFoldedThreadIds] = useState(() =>
    threads.reduce((closedIds, thread) => {
      if (thread.state.toLowerCase() === "closed") closedIds.add(thread.id);
      return closedIds;
    }, new Set<number>()),
  );

  return (
    <tr className="comments board-comment-wrap" data-commit-id={threads[0]?.commitId || commitId}>
      <td colSpan={3}>
        {threads.map((thread, index) => {
          const previousThread = threads[index - 1];
          const previousThreadFolded = previousThread
            ? !isNonRangedThread(previousThread) && foldedThreadIds.has(previousThread.id)
            : false;
          return (
            <CodeCommentThreadView
              currentUser={currentUser}
              deleteComment={deleteComment}
              hasPreviousThread={index > 0}
              isFolded={foldedThreadIds.has(thread.id)}
              onFoldChange={(isFolded) =>
                setFoldedThreadIds((current) => {
                  const next = new Set(current);
                  if (isFolded) next.add(thread.id);
                  else next.delete(thread.id);
                  return next;
                })
              }
              previousThreadFolded={previousThreadFolded}
              openCommentDeleteModal={openCommentDeleteModal}
              key={thread.id}
              ownerName={ownerName}
              projectName={projectName}
              runtimeConfig={runtimeConfig}
              submitReply={submitReply}
              thread={thread}
              toggleThreadState={toggleThreadState}
              updateComment={updateComment}
            />
          );
        })}
      </td>
    </tr>
  );
}

function isNonRangedThread(thread: CodeReviewThread) {
  return thread.startLine == null && thread.endLine == null;
}

function CodeCommentThreadView({
  currentUser,
  deleteComment,
  hasPreviousThread = false,
  isNonRanged = false,
  isFolded: controlledIsFolded,
  onFoldChange,
  openCommentDeleteModal,
  ownerName,
  projectName,
  previousThreadFolded,
  runtimeConfig,
  submitReply,
  thread,
  toggleThreadState,
  updateComment,
}: {
  currentUser: CurrentUserSummary;
  deleteComment: (commentId: number) => void;
  isNonRanged?: boolean;
  openCommentDeleteModal: (commentId: number) => void;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  hasPreviousThread?: boolean;
  isFolded?: boolean;
  onFoldChange?: (isFolded: boolean) => void;
  previousThreadFolded?: boolean;
  submitReply: (threadId: number, contentsMarkdown: string) => void;
  thread: CodeReviewThread;
  toggleThreadState: (threadId: number, state: string) => void;
  updateComment: (commentId: number, contentsMarkdown: string) => void;
}) {
  const { t } = useLegacyMessages();
  const { branch, path } = Route.useSearch();
  const hashSearch = {
    ...(branch ? { branch } : {}),
    ...(path ? { path } : {}),
  };
  const state = thread.state.toLowerCase();
  const action = commitCommentsHref(
    runtimeConfig.basePath,
    ownerName,
    projectName,
    thread.commitId,
  );
  const [editingCommentIds, setEditingCommentIds] = useState<Set<number>>(() => new Set());
  const [localIsFolded, setLocalIsFolded] = useState(() => !isNonRanged && state === "closed");
  const isFolded = controlledIsFolded ?? localIsFolded;
  const isClosedRangedFold = !isNonRanged && state === "closed" && isFolded;
  const threadSpacingProps = stylex.props(
    hasPreviousThread
      ? previousThreadFolded
        ? styles.threadAfterFoldedThread
        : styles.threadAfterThread
      : null,
  );
  const threadShellProps = stylex.props(
    styles.threadShell,
    state === "closed" ? styles.threadShellClosed : styles.threadShellOpen,
    isClosedRangedFold && styles.threadShellClosedFold,
  );
  const threadFoldHereProps = stylex.props(isClosedRangedFold && styles.threadFoldHere);
  const threadFoldButtonProps = stylex.props(
    isClosedRangedFold
      ? styles.threadFoldClosedButton
      : isFolded
        ? styles.threadFoldOpenButton
        : null,
  );
  const threadFoldHiddenProps = stylex.props(isClosedRangedFold && styles.threadFoldHidden);

  function setCommentEditing(commentId: number, isEditing: boolean) {
    setEditingCommentIds((current) => {
      const next = new Set(current);
      if (isEditing) {
        next.add(commentId);
      } else {
        next.delete(commentId);
      }
      return next;
    });
  }

  return (
    <div
      id={`thread-${thread.id}`}
      data-state={isNonRanged ? undefined : state}
      {...threadShellProps}
      className={`${threadShellProps.className} ${threadSpacingProps.className ?? ""} comment-thread-wrap ${state}${isFolded ? " fold" : ""}`}
      data-stylex-owner="commit-detail-thread-shell"
      data-range-path={isNonRanged ? undefined : thread.path}
      data-range-startside={isNonRanged ? undefined : thread.startSide}
      data-range-startline={isNonRanged ? undefined : thread.startLine}
      data-range-startcolumn={isNonRanged ? undefined : thread.startColumn}
      data-range-endside={isNonRanged ? undefined : thread.endSide}
      data-range-endline={isNonRanged ? undefined : thread.endLine}
      data-range-endcolumn={isNonRanged ? undefined : thread.endColumn}
    >
      <div
        {...threadFoldHereProps}
        className={`${threadFoldHereProps.className ?? ""} btn-thread-here btn-thread-minimize`}
      >
        <button
          type="button"
          {...threadFoldButtonProps}
          className={`${threadFoldButtonProps.className ?? ""} ybtn ybtn-default ybtn-small`}
          onClick={() => {
            const next = !isFolded;
            setLocalIsFolded(next);
            onFoldChange?.(next);
          }}
        >
          <i className={isNonRanged ? "yobicon-comments" : "yobicon-post2"}></i>
        </button>
      </div>

      {isNonRanged ? null : (
        <div
          {...sx.rangedThreadHeader}
          {...threadFoldHiddenProps}
          className={`${sx.rangedThreadHeader.className} ${threadFoldHiddenProps.className ?? ""} thread-header`}
        >
          <span
            className={`${stylex.props(styles.rangedThreadBadge).className} badge state ${state}`}
          >
            {t(`issue.state.${state}`)}
          </span>
          <button
            {...sx.rangedThreadMinimize}
            {...threadFoldHiddenProps}
            type="button"
            className={`${sx.rangedThreadMinimize.className} ${threadFoldHiddenProps.className ?? ""} ybtn ybtn-default ybtn-small btn-thread-minimize`}
            onClick={() => {
              const next = !isFolded;
              setLocalIsFolded(next);
              onFoldChange?.(next);
            }}
          >
            <i className="yobicon-maximize"></i>
          </button>
        </div>
      )}

      <ul
        {...sx.threadComments}
        {...threadFoldHiddenProps}
        className={`${sx.threadComments.className} ${threadFoldHiddenProps.className ?? ""} comments`}
      >
        {thread.comments.map((comment) => {
          const isEditing = editingCommentIds.has(comment.id);
          return (
            <li
              {...sx.threadComment}
              id={`comment-${comment.id}`}
              className={`${sx.threadComment.className} comment`}
              key={comment.id}
            >
              <div className="comment-avatar">
                <Link
                  to="/$user"
                  params={{ user: comment.authorLoginId }}
                  activeOptions={{ exact: true }}
                  className="avatar-wrap"
                  title={comment.authorLabel}
                >
                  <img
                    src={
                      comment.authorAvatarUrl ||
                      prefixBasePath(runtimeConfig.basePath, "/assets/images/default-avatar-32.png")
                    }
                    width="32"
                    height="32"
                    alt={comment.authorLoginId}
                  />
                </Link>
              </div>
              <div {...sx.threadMediaBody} className={`${sx.threadMediaBody.className} media-body`}>
                <div className="meta-info">
                  <span className="comment_author pull-left">
                    <Link
                      to="/$user"
                      params={{ user: comment.authorLoginId }}
                      activeOptions={{ exact: true }}
                      title={comment.authorLabel}
                    >
                      <strong>{`${comment.authorLoginId} `}</strong>
                    </Link>
                  </span>
                  <span className="ago">
                    <Link
                      to="."
                      hash={`comment-${comment.id}`}
                      search={hashSearch}
                      activeOptions={{ includeHash: true }}
                      activeProps={{
                        "aria-current": undefined,
                        className: undefined,
                        "data-status": undefined,
                      }}
                      title={comment.createdLabel}
                    >
                      {comment.createdLabel}
                    </Link>
                  </span>
                  {comment.canUpdate ? (
                    <span className="edit pull-right">
                      <button
                        type="button"
                        className="btn-transparent pull-right"
                        data-comment-id={comment.id}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setCommentEditing(comment.id, true);
                        }}
                        title={t("common.comment.edit")}
                      >
                        <i className="yobicon-edit-2"></i>
                      </button>
                    </span>
                  ) : null}
                  {comment.canDelete ? (
                    <span className="edit pull-right">
                      <button
                        className="btn-transparent pull-right close"
                        onClick={(event) => {
                          if (isNonRanged) {
                            deleteComment(comment.id);
                          } else {
                            event.preventDefault();
                            event.stopPropagation();
                            openCommentDeleteModal(comment.id);
                          }
                        }}
                        title={isNonRanged ? undefined : t("common.comment.delete")}
                      >
                        <i className="yobicon-trash"></i>
                      </button>
                    </span>
                  ) : null}
                </div>
                <CodeCommentUpdateForm
                  action={prefixBasePath(runtimeConfig.basePath, `/comments/${comment.id}`)}
                  comment={comment}
                  isEditing={isEditing}
                  onCancel={() => setCommentEditing(comment.id, false)}
                  onSubmit={(contentsMarkdown) => updateComment(comment.id, contentsMarkdown)}
                />
                <div
                  id={`comment-body-${comment.id}`}
                  {...stylex.props(isEditing && styles.commentBodyHidden)}
                  data-stylex-owner="commit-detail-comment-body"
                >
                  <div
                    className="comment-body markdown-wrap"
                    data-via-email={String(comment.viaEmail)}
                    data-yobi-original-message-processed={
                      comment.viaEmail && splitOriginalMessageMarkdown(comment.contentsMarkdown)
                        ? "true"
                        : undefined
                    }
                  >
                    <OriginalMessageMarkdown
                      contentsMarkdown={comment.contentsMarkdown}
                      viaEmail={comment.viaEmail}
                    />
                  </div>
                  <div
                    className="attachments"
                    data-attachments={JSON.stringify(comment.attachments ?? [])}
                  ></div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="write-comment-form">
        <form
          action={action}
          method="post"
          encType="multipart/form-data"
          {...sx.reviewFormShell}
          {...sx.threadReviewForm}
          {...threadFoldHiddenProps}
          className={`review-form ${sx.reviewFormShell.className} ${sx.threadReviewForm.className} ${threadFoldHiddenProps.className ?? ""}`}
          data-stylex-owner="commit-detail-thread-review-form"
          onSubmit={(event) => {
            event.preventDefault();
            submitReply(thread.id, formContents(event.currentTarget));
          }}
        >
          <input type="hidden" name="thread.id" value={thread.id} />
          <div
            {...sx.reviewAuthorInfoWrap}
            className={`${sx.reviewAuthorInfoWrap.className} author-info-wrap pull-left hide-in-mobile`}
          >
            <div className="author-info">
              <Link
                to="/$user"
                params={{ user: currentUser.loginId }}
                activeOptions={{ exact: true }}
                className="avatar-wrap medium"
                title={currentUser.userLabel}
              >
                <img src={currentUser.avatarUrl} width="32" height="32" alt="" />
              </Link>
            </div>
          </div>
          <div
            {...sx.reviewWriteCommentBox}
            className={`${sx.reviewWriteCommentBox.className} write-comment-box`}
          >
            <div className="write-comment-wrap">
              <Editor editorMode="code-review-body" wrapId={`thread-${thread.id}`} />
              <UploadForm resourceType="COMMIT_COMMENT" />
              <div
                {...sx.rightText}
                {...sx.threadActions}
                className={`${sx.rightText.className} ${sx.threadActions.className}`}
                data-stylex-owner="commit-detail-thread-actions"
              >
                <button
                  type="button"
                  className="ybtn ybtn-default ybtn-small"
                  onClick={() => toggleThreadState(thread.id, state)}
                >
                  {t(state === "open" ? "commentThread.close" : "commentThread.open")}
                </button>
                <button type="submit" className="ybtn ybtn-success ybtn-small">
                  {t("button.comment.new")}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function OriginalMessageMarkdown({
  contentsMarkdown,
  viaEmail,
}: {
  contentsMarkdown: string;
  viaEmail: boolean;
}) {
  const [showsOriginalMessage, setShowsOriginalMessage] = useState(false);
  const originalMessage = viaEmail ? splitOriginalMessageMarkdown(contentsMarkdown) : null;

  if (!originalMessage) {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentsMarkdown}</ReactMarkdown>;
  }

  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{originalMessage.visibleMarkdown}</ReactMarkdown>
      <button
        type="button"
        {...sx.originalMessageToggle}
        data-stylex-owner="commit-detail-original-message-toggle"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setShowsOriginalMessage((current) => !current);
        }}
      >
        ...
      </button>
      <div data-original-message-owner="route" hidden={!showsOriginalMessage}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{originalMessage.hiddenMarkdown}</ReactMarkdown>
      </div>
    </>
  );
}

function splitOriginalMessageMarkdown(contentsMarkdown: string) {
  const lines = contentsMarkdown.split(/\r?\n/u);
  const delimiterIndex = lines.findIndex(
    (line, index) => index > 0 && /^---+[^-]*---+\s*$/u.test(line.trim()),
  );

  if (delimiterIndex < 0) {
    return null;
  }

  return {
    visibleMarkdown: lines.slice(0, delimiterIndex).join("\n").trimEnd(),
    hiddenMarkdown: lines.slice(delimiterIndex).join("\n").trim(),
  };
}

function CodeCommentUpdateForm({
  action,
  comment,
  isEditing,
  onCancel,
  onSubmit,
}: {
  action: string;
  comment: CodeReviewComment;
  isEditing: boolean;
  onCancel: () => void;
  onSubmit: (contentsMarkdown: string) => void;
}) {
  const { t } = useLegacyMessages();
  const commentId = String(comment.id);

  return (
    <div
      id={`comment-editform-${commentId}`}
      className="comment-update-form"
      {...stylex.props(
        isEditing ? styles.commentUpdateFormVisible : styles.commentUpdateFormHidden,
      )}
      data-stylex-owner="commit-detail-comment-update-form"
    >
      <form
        action={action}
        method="post"
        encType="multipart/form-data"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(formContents(event.currentTarget));
        }}
      >
        <input type="hidden" name="id" value={commentId} />
        <div className="write-comment-box">
          <div className="write-comment-wrap">
            <Editor
              editorMode="update-comment-body"
              textareaName="contents"
              value={comment.contentsMarkdown}
              wrapId={commentId}
            />
            <div className="upload-drop-here">
              <div className="msg-wrap">
                <div className="msg">{t("common.attach.dropFilesHere")}</div>
              </div>
            </div>
            <div
              className="comment-update-button upload-button-line"
              {...sx.rightText}
              data-stylex-owner="commit-detail-comment-update-actions"
            >
              <span className="file-upload">
                <label htmlFor={`upload-${commentId}`} className="file-upload__label ybtn">
                  {t("button.upload")}
                </label>
                <input
                  id={`upload-${commentId}`}
                  className="file-upload__input"
                  type="file"
                  name="filePath"
                  multiple
                />
              </span>
              <button
                type="button"
                className="ybtn ybtn-cancel"
                data-comment-id={commentId}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCancel();
                }}
              >
                {t("button.cancel")}
              </button>
              {comment.canUpdate ? (
                <button type="submit" className="ybtn ybtn-info">
                  {t("button.save")}
                </button>
              ) : null}
            </div>
          </div>
          <input
            type="hidden"
            name="temporaryUploadFiles"
            className="temporaryUploadFiles"
            value=""
          />
          <div className={`preview-${commentId}`}></div>
          <div className="attachment-files">
            {(comment.attachments ?? []).map((file) => (
              <AttachmentFileMarker file={file} key={file.id} />
            ))}
          </div>
          <div
            id={`upload-${commentId}`}
            data-resourcetype="NONISSUE_COMMENT"
            data-resourceid={commentId}
          ></div>
        </div>
      </form>
    </div>
  );
}

function AttachmentFileMarker({ file }: { file: CodeReviewAttachment }) {
  const name = String(file.name);
  const mimeType = String(file.mimeType);
  const size = String(file.size);

  return (
    <div className="attached-file attached-file-marker" data-name={name} data-mime={mimeType}>
      <i className="mimetype"></i>
      <strong className="name">{name}</strong>
      <span className="size">{size}</span>
      <button type="button" className="btn-transparent btn-delete">
        ×
      </button>
    </div>
  );
}

function CommitAuthor({ detail }: { detail: CodeCommitDetailResponse }) {
  const { runtimeConfig } = Route.useRouteContext();
  const { t } = useLegacyMessages();
  const anonymousAuthorName = t("user.role.anonymous");
  const commit = detail.commit as
    | (NonNullable<CodeCommitDetailResponse["commit"]> & {
        authorAvatarUrl?: string;
        authorLoginId?: string;
      })
    | null;
  if (!commit) {
    return <strong>{anonymousAuthorName}</strong>;
  }
  const authorName = commit.authorName || commit.authorEmail || anonymousAuthorName;

  if (commit.authorLoginId) {
    return (
      <>
        <Link
          to="/$user"
          params={{ user: commit.authorLoginId }}
          activeOptions={{ exact: true }}
          className="avatar-wrap smaller"
        >
          <img
            src={
              commit.authorAvatarUrl ||
              prefixBasePath(runtimeConfig.basePath, "/assets/images/default-avatar-32.png")
            }
            alt={authorName}
            width="32"
            height="32"
          />
        </Link>
        <strong>{authorName}</strong>
      </>
    );
  }

  return (
    <>
      <span className="avatar-wrap smaller">
        <img
          src={
            commit.authorAvatarUrl ||
            prefixBasePath(runtimeConfig.basePath, "/assets/images/default-avatar-32.png")
          }
          width="32"
          height="32"
          alt=""
        />
      </span>
      <strong>{authorName}</strong>
    </>
  );
}

function CommitMessage({ message, shortMessage }: { message: string; shortMessage: string }) {
  const { t } = useLegacyMessages();
  const lines = message.split("\n");
  const detail = lines.slice(1).join("\n");
  return (
    <>
      <span {...sx.commitMessage} data-stylex-owner="commit-detail-short-message">
        {shortMessage || t("code.commitMsg.empty")}
      </span>
      {detail ? (
        <pre {...sx.commitDescription} data-stylex-owner="commit-detail-description">
          {detail}
        </pre>
      ) : null}
    </>
  );
}

function CommentForm({
  action,
  onSubmit,
}: {
  action: string;
  onSubmit: (contentsMarkdown: string) => void;
}) {
  const { t } = useLegacyMessages();
  return (
    <form
      id="comment-form"
      action={action}
      method="post"
      encType="multipart/form-data"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(formContents(event.currentTarget));
      }}
    >
      <div className="write-comment-box">
        <Editor editorMode="comment-body" wrapId="comment" />
        <UploadForm resourceType="COMMIT_COMMENT" />
        <div className="write-comment-wrap">
          <div {...sx.rightText} data-stylex-owner="commit-detail-comment-actions">
            <button type="button" className="ybtn hidden" id="dynamic-comment-btn"></button>
            <button type="submit" className="ybtn ybtn-success">
              {t("button.comment.new")}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function formContents(form: HTMLFormElement) {
  const data = new FormData(form);
  const value = data.get("contents");
  return typeof value === "string" ? value : "";
}

function ReviewForm({
  action,
  currentUser,
  isOpen = false,
  onClose,
}: {
  action: string;
  currentUser: CurrentUserSummary;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const { t } = useLegacyMessages();
  const reviewFormVisibilityProps = stylex.props(
    isOpen ? styles.reviewFormVisible : styles.reviewFormHidden,
  );
  return (
    <div
      id="review-form"
      {...sx.reviewFormShell}
      {...reviewFormVisibilityProps}
      className={`review-form ${sx.reviewFormShell.className} ${reviewFormVisibilityProps.className ?? ""}`}
      data-stylex-owner="commit-detail-review-form"
    >
      <form action={action} method="post" encType="multipart/form-data">
        <div
          {...sx.reviewAuthorInfoWrap}
          className={`${sx.reviewAuthorInfoWrap.className} author-info-wrap pull-left hide-in-mobile`}
        >
          <div className="author-info">
            <Link
              to="/$user"
              params={{ user: currentUser.loginId }}
              activeOptions={{ exact: true }}
              className="avatar-wrap medium"
              title={currentUser.userLabel}
            >
              <img src={currentUser.avatarUrl} width="32" height="32" alt="" />
            </Link>
          </div>
        </div>
        <div
          {...sx.reviewWriteCommentBox}
          className={`${sx.reviewWriteCommentBox.className} write-comment-box`}
        >
          <div className="write-comment-wrap">
            <div className="pull-right">
              <button
                type="button"
                className="ybtn ybtn-default ybtn-small"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onClose?.();
                }}
              >
                &times;
              </button>
            </div>
            <Editor editorMode="code-review-body" wrapId="review" />
            <UploadForm resourceType="COMMIT_COMMENT" />
            <div {...sx.rightText} data-stylex-owner="commit-detail-review-actions">
              <button type="submit" className="ybtn ybtn-success ybtn-small">
                {t("button.comment.new")}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function stringField(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function Editor({
  editorMode,
  textareaName = "contents",
  value = "",
  wrapId,
}: {
  editorMode: string;
  textareaName?: string;
  value?: string;
  wrapId: string;
}) {
  const { t } = useLegacyMessages();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  return (
    <div className="mt10">
      <ul className="nav nav-tabs nm small" data-stylex-owner="commit-detail-editor-tabs">
        <li className={activeTab === "edit" ? "active" : undefined}>
          <button type="button" onClick={() => setActiveTab("edit")}>
            {t("common.editor.edit")}
          </button>
        </li>
        <li className={activeTab === "preview" ? "active" : undefined}>
          <button type="button" onClick={() => setActiveTab("preview")}>
            {t("common.editor.preview")}
          </button>
        </li>
        <li>
          <div className="task-list-button">
            <button
              type="button"
              className="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"
            >
              <i className="yobicon-list task-list-icon"></i> {t("button.add.checklist")}
            </button>
          </div>
        </li>
        <li>
          <div className="editor-clear-temporary">
            <div className="editor-clear-temporary-button">
              <button
                type="button"
                id="button-clear-temporary"
                className="ybtn ybtn-small ybtn-warning"
              >
                {t("button.clear.temporary")}
              </button>
            </div>
          </div>
        </li>
        <li>
          <div className="editor-notice-label"></div>
        </li>
      </ul>
      <div
        {...sx.editorTabContent}
        className={`${sx.editorTabContent.className} tab-content`}
        data-stylex-owner="commit-detail-editor-tab-content"
      >
        <LegacyMarkdownHelp />
        <div id={`edit-${wrapId}`} className={`tab-pane${activeTab === "edit" ? " active" : ""}`}>
          <div className="textarea-box">
            <textarea
              name={textareaName}
              className="editorSeries content comment nm"
              data-editor-mode={editorMode}
              id={`editor-${textareaName}-${wrapId}`}
              defaultValue={value}
              {...(editorMode === "code-review-body" ? sx.reviewTextarea : {})}
              data-stylex-owner={
                editorMode === "code-review-body" ? "commit-detail-review-textarea" : undefined
              }
              {...legacyMarkdownTextareaAttr}
            ></textarea>
          </div>
        </div>
        <div
          id={`preview-${wrapId}`}
          className={`tab-pane${activeTab === "preview" ? " active" : ""}`}
        >
          <div
            className={`markdown-preview markdown-wrap ${editorMode}`}
            data-via-email="false"
          ></div>
        </div>
        <div className="notification-receiver">
          <span className="notification-receiver-title">
            {t("notification.receiver.list.title")}
          </span>
          <span className="notification-receiver-list"></span>
        </div>
      </div>
    </div>
  );
}

function UploadForm({ resourceType }: { resourceType: string }) {
  const { t } = useLegacyMessages();
  return (
    <div className="upload-wrap content-footer" data-resource-type={resourceType}>
      <div className="attach-wrap">
        <span className="help help-droppable">{t("common.attach.drophere")}</span>
        <div className="btn-wrap">
          <div className="nbtn medium white fake-file-wrap">
            <i className="yobicon-upload"></i> {t("button.upload")}
            <input type="file" className="file" name="filePath" multiple />
          </div>
        </div>
        <span className="plain">{t("common.attach.clickbutton")}</span>
        <span className="help help-pastable">{t("common.attach.pastehere")}</span>
      </div>
      <ul className="attached-files unstyled"></ul>
      <p className="help" {...sx.rightText} data-stylex-owner="commit-detail-attachment-help">
        <i className="yobicon-supportrequest"></i> {t("common.attach.attachIfYouSave")}
      </p>
    </div>
  );
}

function ReviewCards({
  id,
  isActive = false,
  threads,
}: {
  id: string;
  isActive?: boolean;
  threads: CodeReviewThread[];
}) {
  const { runtimeConfig } = Route.useRouteContext();
  const { branch, path } = Route.useSearch();
  const hashSearch = {
    ...(branch ? { branch } : {}),
    ...(path ? { path } : {}),
  };

  return (
    <div id={id} className={`tab-pane${isActive ? " active" : ""}`}>
      {threads.map((thread) => {
        const cardStyleProps = stylex.props(
          styles.reviewCard,
          thread.state.toLowerCase() === "open" ? styles.reviewCardOpen : styles.reviewCardClosed,
        );
        return (
          <Link
            {...cardStyleProps}
            to="."
            hash={`thread-${thread.id}`}
            search={hashSearch}
            activeOptions={{ includeHash: true }}
            activeProps={{
              "aria-current": undefined,
              className: undefined,
              "data-status": undefined,
            }}
            className={`${cardStyleProps.className} review-card ${thread.state.toLowerCase()}`}
            data-stylex-owner="commit-detail-review-card"
            key={thread.id}
          >
            <p className="content">{thread.comments[0]?.contentsMarkdown ?? ""}</p>
            <span className="date" title={thread.createdLabel}>
              <span className="comments">
                {thread.comments.length > 1 ? (
                  <>
                    <i className="yobicon-comments"></i> {thread.comments.length}
                  </>
                ) : null}
              </span>
              <span className="avatar-wrap smaller margin-right-5">
                <img
                  src={
                    thread.comments[0]?.authorAvatarUrl ||
                    prefixBasePath(runtimeConfig.basePath, "/assets/images/default-avatar-32.png")
                  }
                  alt={thread.comments[0]?.authorLabel ?? ""}
                />
              </span>
              {thread.createdLabel}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function CommentDeleteModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLegacyMessages();
  const modalStyleProps = stylex.props(isOpen && styles.commentDeleteModalVisible);
  return (
    <>
      <div
        id="comment-delete-modal"
        {...modalStyleProps}
        className={`${isOpen ? "modal hide fade in" : "modal hide fade"} ${modalStyleProps.className ?? ""}`.trim()}
        data-stylex-owner="commit-detail-comment-delete-modal"
      >
        <div className="modal-header">
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
          <h3>{t("common.comment.delete")}</h3>
        </div>
        <div className="modal-body">
          <p>{t("common.comment.delete.confirm")}</p>
        </div>
        <div className="modal-footer">
          <button
            id="comment-delete-confirm"
            type="button"
            className="ybtn ybtn-danger"
            onClick={onConfirm}
          >
            {t("button.yes")}
          </button>
          <button type="button" className="ybtn" onClick={onClose}>
            {t("button.no")}
          </button>
        </div>
      </div>
      {isOpen ? (
        <div
          className="modal-backdrop fade in"
          role="presentation"
          onClick={onClose}
          onKeyUp={onClose}
        ></div>
      ) : null}
    </>
  );
}

function projectHref(basePath: string, ownerName: string, projectName: string, ...parts: string[]) {
  return prefixBasePath(
    basePath,
    `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`,
  );
}

function projectTo(ownerName: string, projectName: string, ...parts: string[]) {
  return `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`;
}

function commitCommentsHref(
  basePath: string,
  ownerName: string,
  projectName: string,
  commitId: string,
) {
  return projectHref(basePath, ownerName, projectName, "commit", commitId, "comments");
}

function parseUnifiedDiff(path: string, patch: string): ParsedFileDiff {
  let changeType: ParsedFileDiff["changeType"] = "modify";
  let pathA = path;
  let pathB = path;
  let oldLineNumber = 0;
  let newLineNumber = 0;
  const lines: ParsedDiffLine[] = [];

  for (const rawLine of patch.split(/\r?\n/u)) {
    if (rawLine.startsWith("new file mode ")) {
      changeType = "add";
      continue;
    }
    if (rawLine.startsWith("deleted file mode ")) {
      changeType = "delete";
      continue;
    }
    if (rawLine.startsWith("rename from ")) {
      changeType = "rename";
      pathA = rawLine.slice("rename from ".length).trim();
      continue;
    }
    if (rawLine.startsWith("rename to ")) {
      changeType = "rename";
      pathB = rawLine.slice("rename to ".length).trim();
      continue;
    }
    if (rawLine.startsWith("copy from ")) {
      changeType = "copy";
      pathA = rawLine.slice("copy from ".length).trim();
      continue;
    }
    if (rawLine.startsWith("copy to ")) {
      changeType = "copy";
      pathB = rawLine.slice("copy to ".length).trim();
      continue;
    }
    if (rawLine.startsWith("--- ")) {
      pathA = normalizeDiffPath(rawLine.slice(4));
      continue;
    }
    if (rawLine.startsWith("+++ ")) {
      pathB = normalizeDiffPath(rawLine.slice(4));
      continue;
    }
    if (rawLine.startsWith("@@")) {
      const hunkMatch = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/u.exec(rawLine);
      oldLineNumber = hunkMatch ? Number(hunkMatch[1]) : oldLineNumber;
      newLineNumber = hunkMatch ? Number(hunkMatch[2]) : newLineNumber;
      lines.push({ kind: "range", text: rawLine });
      continue;
    }
    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      lines.push({
        kind: "line",
        lineNumber: newLineNumber,
        newLineNumber,
        oldLineNumber: null,
        prefix: "+",
        text: rawLine.slice(1),
        type: "add",
      });
      newLineNumber += 1;
      continue;
    }
    if (rawLine.startsWith("-") && !rawLine.startsWith("---")) {
      lines.push({
        kind: "line",
        lineNumber: oldLineNumber,
        newLineNumber: null,
        oldLineNumber,
        prefix: "-",
        text: rawLine.slice(1),
        type: "remove",
      });
      oldLineNumber += 1;
      continue;
    }
    if (rawLine.startsWith(" ")) {
      lines.push({
        kind: "line",
        lineNumber: newLineNumber,
        newLineNumber,
        oldLineNumber,
        prefix: " ",
        text: rawLine.slice(1),
        type: "context",
      });
      oldLineNumber += 1;
      newLineNumber += 1;
    }
  }

  if (!pathA && pathB) {
    changeType = "add";
  } else if (pathA && !pathB) {
    changeType = "delete";
  } else if (changeType === "modify" && pathA !== "" && pathB !== "" && pathA !== pathB) {
    changeType = "rename";
  }

  return { changeType, lines, pathA, pathB };
}

function normalizeDiffPath(input: string) {
  const path = input.trim().split(/\s+/u)[0] ?? "";
  if (path === "/dev/null") {
    return "";
  }
  return path.replace(/^[ab]\//u, "");
}

function fileDiffHeaderLabel(
  parsed: ParsedFileDiff,
  filePath: string,
  t: (key: string, options?: { args?: Array<number | string> }) => string,
) {
  switch (parsed.changeType) {
    case "add":
      return t("code.addedPath", { args: [parsed.pathB || filePath] });
    case "copy":
      return t("code.copiedPath", { args: [parsed.pathA, parsed.pathB || filePath] });
    case "delete":
      return t("code.deletedPath", { args: [parsed.pathA || filePath] });
    case "rename":
      return t("code.renamedPath", { args: [parsed.pathA, parsed.pathB || filePath] });
    case "modify":
      return filePath;
  }
}

function shortenCommitId(commitId: string) {
  return commitId.length < 7 ? commitId : commitId.slice(0, 7);
}
