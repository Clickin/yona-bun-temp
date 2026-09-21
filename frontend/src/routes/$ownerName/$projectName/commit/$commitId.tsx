import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DiffLineView, type ParsedDiffLine } from "../../../../components/diff-line-view";
import { UploadForm } from "../../../../components/file-uploader";
import { FileDiffErrorRow } from "../../../../components/file-diff-error-row";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LegacyMarkdown } from "../../../../components/legacy-markdown";
import { TabButton } from "../../../../components/tab-button";
import defaultAvatarUrl from "../../../../assets/legacy/default-avatar-34.png";
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
import { uploadTemporaryAttachment } from "../../../../api/attachments";
import { apiQueryKeys } from "../../../../api/query-keys";
import { currentSessionQueryOptions } from "../../../../api/session";
import type { ProjectContainer } from "../../../../api/types";
import { readSessionBootstrap } from "../../../../auth-workspace-client";
import { formatLegacyTimestamp, useLegacyMessages } from "../../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { LegacyMarkdownHelp } from "../../../-legacy-markdown-help";

const legacyMarkdownTextareaAttr = { markdown: "true" };

type CurrentUserSummary = {
  avatarUrl: string;
  loginId: string;
  userLabel: string;
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

type CommitReviewRange = {
  endColumn: number;
  endLine: number;
  endSide: string;
  path: string;
  prevCommitId: string;
  startColumn: number;
  startLine: number;
  startSide: string;
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
          avatarUrl: stringField(sessionQuery.data.avatarUrl, defaultAvatarUrl),
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
  const authorDate = formatLegacyTimestamp(commit?.authorDate ?? "", t);
  const openThreads = detail.threads.filter((thread) => thread.state.toLowerCase() === "open");
  const closedThreads = detail.threads.filter((thread) => thread.state.toLowerCase() === "closed");
  const [reviewCardTab, setReviewCardTab] = useState<"closed" | "open">("open");
  const [reviewCardsCollapsed, setReviewCardsCollapsed] = useState(false);
  const reviewWrapRef = useRef<HTMLDivElement>(null);
  const reviewListRef = useRef<HTMLDivElement>(null);
  const diffLayoutRef = useRef<HTMLDivElement>(null);
  const [reviewAffixed, setReviewAffixed] = useState(false);
  const [reviewListMaxHeight, setReviewListMaxHeight] = useState<number>();
  const [blockReviewFormOpen, setBlockReviewFormOpen] = useState(false);
  const [blockReviewButtonVisible, setBlockReviewButtonVisible] = useState(false);
  const [blockReviewRange, setBlockReviewRange] = useState<CommitReviewRange | null>(null);
  const [commentDeleteCommentId, setCommentDeleteCommentId] = useState<number | null>(null);
  const nonRangedThreads = detail.threads.filter(isNonRangedThread);
  const isSvn = project.vcs === "SVN" || project.vcs === "SUBVERSION";

  useEffect(() => {
    const reviewWrap = reviewWrapRef.current;
    const reviewList = reviewListRef.current;
    const diffLayout = diffLayoutRef.current;
    if (isSvn || reviewCardsCollapsed || !reviewWrap || !reviewList || !diffLayout) return;

    // yobi.code.Diff._setReviewWrapAffixed / _setReviewListHeight.
    const offsetTop = reviewWrap.getBoundingClientRect().top + window.scrollY - 10;
    const updateReviewPosition = () => {
      const affixed = window.scrollY > offsetTop;
      setReviewAffixed(affixed);
      const diffBottom = diffLayout.offsetTop + diffLayout.offsetHeight;
      const listBottom = reviewList.getBoundingClientRect().bottom + window.scrollY;
      setReviewListMaxHeight(
        affixed
          ? diffBottom <= listBottom + 15
            ? diffBottom - window.scrollY + 90
            : window.innerHeight - reviewList.offsetTop - 15
          : diffLayout.offsetHeight - reviewList.offsetTop,
      );
    };
    updateReviewPosition();
    window.addEventListener("scroll", updateReviewPosition, { passive: true });
    window.addEventListener("resize", updateReviewPosition);
    return () => {
      window.removeEventListener("scroll", updateReviewPosition);
      window.removeEventListener("resize", updateReviewPosition);
    };
  }, [commitId, isSvn, reviewCardsCollapsed]);
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
      <div className={`page-wrap-outer `.trim()} data-owner="commit-detail-page">
        <div className="project-page-wrap" data-owner="commit-detail-shell">
          <div
            className={`code-browse-wrap `.trim()}
            data-owner="commit-detail-browse"
            id="code-browse-wrap"
          >
            <ul className={` nav nav-tabs`} data-owner="commit-detail-browse-tabs">
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
              className={`codediff-wrap${reviewCardsCollapsed ? " diffs-only" : ""}`}
              data-owner="commit-detail-diff-layout"
              ref={diffLayoutRef}
            >
              <button
                type="button"
                className="ybtn ybtn-default btn-show-reviewcards"
                onClick={() => setReviewCardsCollapsed(false)}
              >
                <i className="yobicon-restore"></i>
              </button>
              <div className={` diffs-wrap`} data-owner="commit-detail-diffs">
                <div className={` commitInfo`} data-owner="commit-detail-info">
                  <div className={` commitAuthor`} data-owner="commit-detail-author">
                    <CommitAuthor detail={detail} />
                    <span
                      className={` ago`}
                      data-owner="commit-detail-author-ago"
                      title={authorDate.title}
                    >
                      {authorDate.label}
                    </span>
                  </div>
                  <div className="commitMsg-wrap" data-owner="commit-detail-message">
                    <CommitMessage
                      message={commit?.message ?? ""}
                      shortMessage={commit?.shortMessage ?? ""}
                    />
                  </div>
                  <div className={` commitId-wrap`} data-owner="commit-detail-id-wrap">
                    <strong className={` commitId`} data-owner="commit-detail-id">
                      @{commit?.commitId ?? commitId}
                    </strong>
                  </div>
                </div>

                {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- legacy yobi.CodeCommentBlock opens block review controls from text selection inside .diff-body. */}
                <div
                  className={` diff-body`}
                  data-owner="commit-detail-diff-body-layout"
                  onMouseUp={(event) => {
                    if (event.target instanceof Element && event.target.closest(".btnPop")) return;
                    const range = readCommitReviewRange(event.currentTarget);
                    if (range) setBlockReviewRange(range);
                    setBlockReviewButtonVisible(range !== null);
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
                    className={`btnPop${blockReviewButtonVisible ? " is-visible" : ""}`}
                    data-owner="commit-detail-block-review-button"
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
                    range={blockReviewRange}
                    onClose={() => setBlockReviewFormOpen(false)}
                  />
                ) : null}
              </div>

              <div
                className="review-wrap span-hard-wrap"
                data-owner="commit-detail-review-panel"
                ref={reviewWrapRef}
              >
                <div className={`review-container ${reviewAffixed ? "affix" : "affix-top"}`}>
                  <button
                    type="button"
                    className="ybtn ybtn-default btn-hide-reviewcards"
                    onClick={() => setReviewCardsCollapsed(true)}
                  >
                    <i className="yobicon-maximize"></i>
                  </button>
                  <ul
                    className={` nav nav-tabs`}
                    data-owner="commit-detail-review-tabs"
                    style={{ marginBottom: "10px" }}
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
                  <div
                    className="tab-content review-list"
                    ref={reviewListRef}
                    style={{ maxHeight: reviewListMaxHeight }}
                  >
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
            data-owner="commit-detail-footer-watch"
            onClick={() => watchMutation.mutate(!detail.isWatching)}
          >
            {t("notification.watch")}
          </button>

          <Link
            to={projectTo(ownerName, projectName, "commits", encodedBranch, path)}
            className="ybtn pull-right"
            data-owner="commit-detail-footer-list"
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
  const authorDate = formatLegacyTimestamp(commit?.authorDate ?? "", t);
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

          <ul className={` nav nav-tabs`} data-owner="commit-detail-svn-browse-tabs">
            <li>
              <Link to={projectTo(ownerName, projectName, "code")}>{t("code.files")}</Link>
            </li>
            <li className="active">
              <Link to={projectTo(ownerName, projectName, "commits")}>{t("code.commits")}</Link>
            </li>
          </ul>

          <p className={` commitInfo`} data-owner="commit-detail-svn-info">
            <span className="avatar-wrap">
              <img src={defaultAvatarUrl} width="32" height="32" alt="" />
            </span>
            <strong>{commit?.authorName || commit?.authorEmail || anonymousAuthorName}</strong>
            <span className={` ago`} data-owner="commit-detail-svn-ago" title={authorDate.title}>
              {authorDate.label}
            </span>
            <strong className={`  commitId`} data-owner="commit-detail-svn-id">
              @{commit?.commitId ?? commitId}
            </strong>
          </p>
          <pre className="commitMsg">{commit?.message ?? ""}</pre>
          <div className={` diff-wrap`} data-owner="commit-detail-svn-diff-wrap">
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
          className={` ybtn ${detail.isWatching ? "active" : ""}`}
          data-owner="commit-detail-footer-watch"
          onClick={toggleWatch}
        >
          {t("notification.watch")}
        </button>

        <Link
          to={projectTo(ownerName, projectName, "commits", encodedBranch)}
          className={` ybtn`}
          data-owner="commit-detail-footer-list"
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
    <div id={fileId} className={` diff-partial-outer`} data-owner="commit-detail-file">
      <div className="diff-partial-inner">
        <div className={` diff-partial-meta`} data-owner="commit-detail-file-meta">
          <div className={` diff-partial-commit`} data-owner="commit-detail-file-commit">
            <div className={` diff-partial-commit-id`} data-owner="commit-detail-file-commit-id">
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
            <div className={` diff-partial-commit-id`} data-owner="commit-detail-file-commit-id">
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
          <div className={` diff-partial-file`} data-owner="commit-detail-file-header">
            <span className={` filename`} data-owner="commit-detail-file-header-filename">
              {fileHeader}
            </span>
          </div>
        </div>
        <div
          className={` diff-partial-code`}
          data-hashcode={filePath}
          data-owner="commit-detail-file-code"
        >
          <div className="patch-header">
            {parsed.pathA ? <div className="path">{`--- ${parsed.pathA}`}</div> : null}
            {parsed.pathB ? <div className="path">{`+++ ${parsed.pathB}`}</div> : null}
          </div>
          <table
            className={` diff-container show-comments`}
            data-owner="commit-detail-diff-partial-table"
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
                        <td data-owner="commit-detail-diff-line-number-cell" className={` linenum`}>
                          <div
                            data-owner="commit-detail-diff-line-number"
                            className={` line-number`}
                            data-line-num="..."
                          >
                            <span className="hidden">...</span>
                          </div>
                        </td>
                        <td data-owner="commit-detail-diff-line-number-cell" className={` linenum`}>
                          <div
                            data-owner="commit-detail-diff-line-number"
                            className={` line-number`}
                            data-line-num="..."
                          >
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
                        key={diffLineKey(line)}
                        line={line}
                        openCommentDeleteModal={openCommentDeleteModal}
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
      <td data-owner="commit-detail-diff-line-number-cell" className={` linenum`}>
        <div
          data-owner="commit-detail-diff-line-number"
          className={` line-number`}
          data-line-num={modeChange.oldMode}
        ></div>
        <span className="hidden">{modeChange.oldMode}</span>
      </td>
      <td data-owner="commit-detail-diff-line-number-cell" className={` linenum`}>
        <div
          data-owner="commit-detail-diff-line-number"
          className={` line-number`}
          data-line-num={modeChange.newMode}
        ></div>
        <span className="hidden">{modeChange.newMode}</span>
      </td>
      <td className={` isBinary`} data-owner="commit-detail-diff-is-binary">
        {t("code.fileModeChanged")}
      </td>
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
      <DiffLineView
        line={line}
        owners={{
          lineNumberCell: "commit-detail-diff-line-number-cell",
          commentIcon: "commit-detail-diff-line-comment-icon",
          lineNumber: "commit-detail-diff-line-number",
          codeCell: "commit-detail-diff-code-cell",
          codeLine: "commit-detail-diff-code-pre",
        }}
      />
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
    <tr
      className={` comments board-comment-wrap`}
      data-commit-id={threads[0]?.commitId || commitId}
      data-owner="commit-detail-inline-comment-row"
    >
      <td className={` `} colSpan={3} data-owner="commit-detail-inline-comment-cell">
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
              commentItemVariant="inline"
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
  hasPreviousThread: _hasPreviousThread = false,
  commentItemVariant = "default",
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
  commentItemVariant?: "inline" | "default";
  isFolded?: boolean;
  onFoldChange?: (isFolded: boolean) => void;
  previousThreadFolded?: boolean;
  submitReply: (threadId: number, contentsMarkdown: string) => void;
  thread: CodeReviewThread;
  toggleThreadState: (threadId: number, state: string) => void;
  updateComment: (commentId: number, contentsMarkdown: string) => void;
}) {
  const isInlineComment = commentItemVariant === "inline";
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
      className={`comment-thread-wrap ${state}${isFolded ? " fold" : ""}`}
      data-owner="commit-detail-thread-shell"
      data-range-path={isNonRanged ? undefined : thread.path}
      data-range-startside={isNonRanged ? undefined : thread.startSide}
      data-range-startline={isNonRanged ? undefined : thread.startLine}
      data-range-startcolumn={isNonRanged ? undefined : thread.startColumn}
      data-range-endside={isNonRanged ? undefined : thread.endSide}
      data-range-endline={isNonRanged ? undefined : thread.endLine}
      data-range-endcolumn={isNonRanged ? undefined : thread.endColumn}
      style={
        // F5 static/0px — yona-original/app/assets/stylesheets/less/_page.less:6098-6104:
        // the frozen .comment-thread-wrap.fold flattening loses to the app.css
        // .diff-container tr.comments .comment-thread-wrap (0,3,2) block on
        // specificity, so the route pins the legacy fold output inline.
        isClosedRangedFold
          ? {
              position: "static",
              padding: 0,
              margin: 0,
              background: "transparent",
              border: "none",
              boxShadow: "none",
            }
          : // F5 margin-top 0 — _page.less:6131 (.fold + .comment-thread-wrap).
            previousThreadFolded
            ? { marginTop: 0 }
            : undefined
      }
    >
      {/* F5 right:0 — _page.less:6105-6110 (.fold .btn-thread-here right:0px);
          the frozen .fold rule loses to app.css .btn-thread-minimize right:10px
          on cascade order, so the folded state pins the legacy right inline. */}
      <div
        className="btn-thread-here btn-thread-minimize"
        style={isClosedRangedFold ? { right: "0px" } : undefined}
      >
        <button
          type="button"
          className="ybtn ybtn-default ybtn-small"
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
        <div className="thread-header">
          <span className={`badge state ${state}`}>{t(`issue.state.${state}`)}</span>
          <button
            type="button"
            className="ybtn ybtn-default ybtn-small btn-thread-minimize"
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

      <ul className="comments">
        {thread.comments.map((comment) => {
          const isEditing = editingCommentIds.has(comment.id);
          const createdDate = formatLegacyTimestamp(comment.createdLabel, t);
          return (
            <li
              id={`comment-${comment.id}`}
              className="comment"
              data-owner={isInlineComment ? "commit-detail-inline-comment-item" : undefined}
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
                    src={comment.authorAvatarUrl || defaultAvatarUrl}
                    width="32"
                    height="32"
                    alt={comment.authorLoginId}
                  />
                </Link>
              </div>
              <div className={` media-body`}>
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
                      title={createdDate.title}
                    >
                      {createdDate.label}
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
                  className={isEditing ? "is-editing" : undefined}
                  data-owner="commit-detail-comment-body"
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
          className="review-form"
          data-owner="commit-detail-thread-review-form"
          onSubmit={(event) => {
            event.preventDefault();
            submitReply(thread.id, formContents(event.currentTarget));
          }}
        >
          <input type="hidden" name="thread.id" value={thread.id} />
          <div className="author-info-wrap pull-left hide-in-mobile">
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
          <div className="write-comment-box">
            <div className="write-comment-wrap">
              <Editor
                editorMode="code-review-body"
                wrapId={`thread-${thread.id}`}
                threadHeight100
              />
              <UploadForm
                resourceType="COMMIT_COMMENT"
                helpClassName="right-txt help"
                helpOwner="commit-detail-attachment-help"
              />
              <div className="right-txt" data-owner="commit-detail-thread-actions">
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
    return <LegacyMarkdown>{contentsMarkdown}</LegacyMarkdown>;
  }

  return (
    <>
      <LegacyMarkdown>{originalMessage.visibleMarkdown}</LegacyMarkdown>
      <button
        type="button"
        data-owner="commit-detail-original-message-toggle"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setShowsOriginalMessage((current) => !current);
        }}
      >
        ...
      </button>
      <div data-original-message-owner="route" hidden={!showsOriginalMessage}>
        <LegacyMarkdown>{originalMessage.hiddenMarkdown}</LegacyMarkdown>
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
      className={`comment-update-form${isEditing ? " is-visible" : ""}`}
      data-owner="commit-detail-comment-update-form"
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
              className="right-txt comment-update-button upload-button-line"
              data-owner="commit-detail-comment-update-actions"
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
          className={` avatar-wrap smaller`}
          data-owner="commit-detail-author-avatar"
        >
          <img
            src={commit.authorAvatarUrl || defaultAvatarUrl}
            alt={authorName}
            width="32"
            height="32"
          />
        </Link>
        <strong>{authorName}</strong>
      </>
    );
  }

  if (!commit.authorEmail) {
    return <strong>{commit.authorName || anonymousAuthorName}</strong>;
  }

  return (
    <>
      <span className={` avatar-wrap smaller`} data-owner="commit-detail-author-avatar">
        <img src={commit.authorAvatarUrl || defaultAvatarUrl} width="32" height="32" alt="" />
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
      <span className={` commitMsg short`} data-owner="commit-detail-short-message">
        {shortMessage || t("code.commitMsg.empty")}
      </span>
      {detail ? (
        <pre className={` commitMsg desc`} data-owner="commit-detail-description">
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
        <UploadForm
          resourceType="COMMIT_COMMENT"
          helpClassName="right-txt help"
          helpOwner="commit-detail-attachment-help"
        />
        <div className="write-comment-wrap">
          <div className="right-txt" data-owner="commit-detail-comment-actions">
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
  range,
}: {
  action: string;
  currentUser: CurrentUserSummary;
  isOpen?: boolean;
  onClose?: () => void;
  range: CommitReviewRange | null;
}) {
  const { t } = useLegacyMessages();
  const { runtimeConfig } = Route.useRouteContext();
  const { commitId, ownerName, projectName } = Route.useParams();
  const { branch, path } = Route.useSearch();
  const queryClient = useQueryClient();
  const [formKey, setFormKey] = useState(0);
  const detailQueryKey = apiQueryKeys.project.commitDetail(ownerName, projectName, commitId, {
    branch: branch ?? "",
    path: path ?? "",
  });
  const mutation = useMutation({
    mutationFn: async ({
      formData,
      selection,
    }: {
      formData: FormData;
      selection: CommitReviewRange;
    }) => {
      const contentsMarkdown = String(formData.get("contents") ?? "");
      if (!contentsMarkdown.trim()) throw new Error(t("post.comment.empty"));
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      const attachments = await Promise.all(
        formData
          .getAll("filePath")
          .flatMap((value) =>
            value instanceof File && value.name !== ""
              ? [uploadTemporaryAttachment(runtimeConfig, csrfToken, value)]
              : [],
          ),
      );
      return createCommitDiscussionCommentRest(runtimeConfig, csrfToken, {
        commitId,
        ownerName,
        projectName,
        ...selection,
        contentsMarkdown,
        attachmentIds: attachments.map((attachment) => attachment.id),
      });
    },
    onSuccess(detail) {
      queryClient.setQueryData(detailQueryKey, detail);
      setFormKey((key) => key + 1);
      onClose?.();
      return queryClient.invalidateQueries({ queryKey: detailQueryKey });
    },
  });
  return (
    <div
      id="review-form"
      className={`review-form${isOpen ? " is-open" : ""}`}
      data-owner="commit-detail-review-form"
    >
      <form
        action={action}
        method="post"
        encType="multipart/form-data"
        key={formKey}
        onSubmit={(event) => {
          event.preventDefault();
          if (range && !mutation.isPending) {
            mutation.mutate({ formData: new FormData(event.currentTarget), selection: range });
          }
        }}
      >
        <div className="author-info-wrap pull-left hide-in-mobile">
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
        <div className="write-comment-box">
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
            <UploadForm
              resourceType="COMMIT_COMMENT"
              helpClassName="right-txt help"
              helpOwner="commit-detail-attachment-help"
            />
            {mutation.error ? (
              <p className="alert alert-error" role="alert">
                {mutation.error.message}
              </p>
            ) : null}
            <div className="right-txt" data-owner="commit-detail-review-actions">
              <button
                type="submit"
                className="ybtn ybtn-success ybtn-small"
                disabled={mutation.isPending}
              >
                {t("button.comment.new")}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function readCommitReviewRange(container: HTMLElement): CommitReviewRange | null {
  const selection = container.ownerDocument.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const startElement =
    range.startContainer instanceof Element
      ? range.startContainer
      : range.startContainer.parentElement;
  const endElement =
    range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement;
  const startCode = startElement?.closest("td.code > pre");
  const endCode = endElement?.closest("td.code > pre");
  const startRow = startCode?.closest<HTMLTableRowElement>("tr[data-line]");
  const endRow = endCode?.closest<HTMLTableRowElement>("tr[data-line]");
  const table = startRow?.closest("table");
  if (
    !startCode ||
    !endCode ||
    !startRow ||
    !endRow ||
    !table ||
    !container.contains(table) ||
    table !== endRow.closest("table")
  )
    return null;
  const betweenRows = Array.from(table.rows).slice(startRow.rowIndex + 1, endRow.rowIndex);
  if (betweenRows.some((row) => !row.matches("tr[data-line], tr.comments"))) return null;
  const path = table.dataset.filePath;
  const startLine = Number(startRow.dataset.line);
  const endLine = Number(endRow.dataset.line);
  if (!path || !Number.isFinite(startLine) || !Number.isFinite(endLine)) return null;
  const prefix = range.cloneRange();
  prefix.setStart(startCode, 0);
  prefix.setEnd(range.startContainer, range.startOffset);
  const startColumn = prefix.toString().length;
  prefix.setStart(endCode, 0);
  prefix.setEnd(range.endContainer, range.endOffset);
  return {
    path,
    prevCommitId: table.dataset.commitA ?? "",
    startLine,
    startColumn,
    startSide: startRow.dataset.side ?? "B",
    endLine,
    endColumn: prefix.toString().length,
    endSide: endRow.dataset.side ?? "B",
  };
}

function stringField(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function Editor({
  editorMode,
  textareaName = "contents",
  value = "",
  wrapId,
  threadHeight100 = false,
}: {
  editorMode: string;
  textareaName?: string;
  value?: string;
  wrapId: string;
  threadHeight100?: boolean;
}) {
  const { t } = useLegacyMessages();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [contents, setContents] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const insertChecklist = () => {
    const start = textareaRef.current?.selectionStart || contents.length;
    const checklist = "\n- [ ] Todo A\n- [ ] Todo B\n- [ ] Todo C";
    setContents(`${contents.slice(0, start)}${checklist}${contents.slice(start)}`);
    setActiveTab("edit");
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + checklist.length, start + checklist.length);
    });
  };
  return (
    <div
      className="mt10"
      data-owner="commit-detail-markdown-editor-wrapper"
      data-owner-instance={wrapId}
    >
      <ul className="nav nav-tabs nm small" data-owner="commit-detail-editor-tabs">
        <TabButton type="button" active={activeTab === "edit"} onClick={() => setActiveTab("edit")}>
          {t("common.editor.edit")}
        </TabButton>
        <TabButton
          type="button"
          active={activeTab === "preview"}
          onClick={() => setActiveTab("preview")}
        >
          {t("common.editor.preview")}
        </TabButton>
        <li>
          <div className="task-list-button">
            <button
              type="button"
              className="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"
              onClick={insertChecklist}
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
      <div className="tab-content" data-owner="commit-detail-editor-tab-content">
        <LegacyMarkdownHelp />
        <div id={`edit-${wrapId}`} className={`tab-pane${activeTab === "edit" ? " active" : ""}`}>
          <div className="textarea-box">
            <textarea
              name={textareaName}
              className="editorSeries content comment nm"
              data-editor-mode={editorMode}
              id={`editor-${textareaName}-${wrapId}`}
              ref={textareaRef}
              value={contents}
              onChange={(event) => setContents(event.currentTarget.value)}
              style={
                editorMode === "code-review-body" && threadHeight100
                  ? { height: "100px" }
                  : undefined
              }
              data-owner={
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
          <div className={`markdown-preview markdown-wrap ${editorMode}`} data-via-email="false">
            {activeTab === "preview" ? <LegacyMarkdown>{contents}</LegacyMarkdown> : null}
          </div>
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

function ReviewCards({
  id,
  isActive = false,
  threads,
}: {
  id: string;
  isActive?: boolean;
  threads: CodeReviewThread[];
}) {
  const { t } = useLegacyMessages();
  const { branch, path } = Route.useSearch();
  const hashSearch = {
    ...(branch ? { branch } : {}),
    ...(path ? { path } : {}),
  };

  return (
    <div id={id} className={`tab-pane${isActive ? " active" : ""}`}>
      {threads.map((thread) => {
        const createdDate = formatLegacyTimestamp(thread.createdLabel, t);
        return (
          <Link
            to="."
            hash={`thread-${thread.id}`}
            search={hashSearch}
            activeOptions={{ includeHash: true }}
            activeProps={{
              "aria-current": undefined,
              className: undefined,
              "data-status": undefined,
            }}
            className={`review-card ${thread.state.toLowerCase()}`}
            data-owner="commit-detail-review-card"
            key={thread.id}
          >
            <p className="content" data-owner="commit-detail-review-card-content">
              {thread.comments[0]?.contentsMarkdown ?? ""}
            </p>
            <span
              className="date"
              data-owner="commit-detail-review-card-date"
              title={createdDate.title}
            >
              <span className="comments" data-owner="commit-detail-review-card-comments">
                {thread.comments.length > 1 ? (
                  <>
                    <i className="yobicon-comments"></i> {thread.comments.length}
                  </>
                ) : null}
              </span>
              <span className="avatar-wrap smaller margin-right-5">
                <img
                  src={thread.comments[0]?.authorAvatarUrl || defaultAvatarUrl}
                  alt={thread.comments[0]?.authorLabel ?? ""}
                />
              </span>
              {createdDate.label}
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
  return (
    <>
      <div
        id="comment-delete-modal"
        className={`modal hide fade${isOpen ? " in is-open" : ""}`}
        data-owner="commit-detail-comment-delete-modal"
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
