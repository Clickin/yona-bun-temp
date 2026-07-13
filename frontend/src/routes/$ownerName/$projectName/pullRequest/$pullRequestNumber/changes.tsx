import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LegacyMarkdownHelp } from "../../../../-legacy-markdown-help";
import { LastOutletTransition } from "../../../../-last-outlet-transition";
import {
  closePullRequestThreadRest,
  openPullRequestThreadRest,
  pullRequestChangesQueryOptions,
  type PullRequestChangesResponse,
  type PullRequestCommit,
  type PullRequestDetailResponse,
  type ReviewComment,
  type ReviewThread,
} from "../../../../../api/pull-requests";
import { apiQueryKeys } from "../../../../../api/query-keys";
import { currentSessionQueryOptions } from "../../../../../api/session";
import { readProjectContainerQueryOptions } from "../../../../../api/org-project";
import type { ProjectContainer } from "../../../../../api/types";
import { readSessionBootstrap } from "../../../../../auth-workspace-client";
import { useLegacyMessages } from "../../../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
import {
  PullRequestBranchInfo,
  PullRequestHeader,
  PullRequestStateInfo,
} from "../$pullRequestNumber";

const legacyMarkdownTextareaAttr = { markdown: "true" };
const legacyLinkActiveOptions = { exact: true, explicitUndefined: true };
const legacyHashLinkActiveOptions = { exact: true, explicitUndefined: true, includeHash: true };
const legacyLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

type CurrentUserSummary = {
  avatarUrl: string;
  loginId: string;
  userLabel: string;
};

type PullRequestChangedFileWithError = PullRequestChangesResponse["files"][number] & {
  error?: string;
  errorCode?: string;
  errorCodes?: string[];
  errors?: string[];
  hasError?: boolean | string;
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
  lines: ParsedDiffLine[];
  pathA: string;
  pathB: string;
};

type ReviewBlockInfo = {
  commitId: string;
  endColumn: number;
  endLine: number;
  endSide: string;
  endType: string;
  filePath: string;
  path: string;
  pathA: string;
  pathB: string;
  prevCommitId: string;
  startColumn: number;
  startLine: number;
  startSide: string;
  startType: string;
};

type ActiveInlineReview = {
  afterLineKey: string;
  fields: ReviewBlockInfo;
  placement: "bottom" | "top";
};

type ReviewHiddenField = readonly [string, string | number];

const emptyReviewHiddenFields: readonly ReviewHiddenField[] = [];

type DiffSelectionStart = {
  lineNumber: number;
  rowIndex: number;
};

export const Route = createFileRoute(
  "/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes",
)({
  component: ProjectPullRequestChangesRoute,
});

function ProjectPullRequestChangesRoute() {
  return <LastOutletTransition routeId={Route.id} />;
}

export function ProjectPullRequestChangesPage({
  commitId = "",
  runtimeConfig,
}: {
  commitId?: string;
  runtimeConfig: RuntimeConfig;
}) {
  return <ProjectPullRequestChangesShell commitId={commitId} runtimeConfig={runtimeConfig} />;
}

function ProjectPullRequestChangesShell({
  commitId = "",
  runtimeConfig,
}: {
  commitId: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  return projectQuery.data ? (
    <ProjectPullRequestChangesScreen
      commitId={commitId}
      project={projectQuery.data}
      runtimeConfig={runtimeConfig}
    />
  ) : null;
}

function ProjectPullRequestChangesScreen({
  commitId,
  project,
  runtimeConfig,
}: {
  commitId: string;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName, pullRequestNumber } = Route.useParams();
  const prNumber = Number(pullRequestNumber) || 0;
  const changesQuery = useQuery(
    pullRequestChangesQueryOptions(runtimeConfig, {
      ownerName,
      projectName,
      pullRequestNumber: prNumber,
      commitId,
    }),
  );
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));

  const changesErrorStatus = pullRequestChangesErrorStatus(changesQuery.error);
  if (!changesQuery.data || !sessionQuery.data) {
    if (changesErrorStatus === 403 || changesErrorStatus === 404) {
      return <ProjectPullRequestChangesErrorBody status={changesErrorStatus} />;
    }
    return null;
  }

  return (
    <>
      <ProjectPullRequestChangesTitle ownerName={ownerName} projectName={projectName} />
      <ProjectPullRequestChangesBody
        changes={changesQuery.data}
        commitId={commitId}
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
        project={project}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectPullRequestChangesErrorBody({ status }: { status: 403 | 404 }) {
  const { t } = useLegacyMessages();
  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="error-wrap">
          <i className="ico ico-err2"></i>
          <p>{t(status === 404 ? "error.notfound" : "error.forbidden")}</p>
        </div>
      </div>
    </div>
  );
}

function pullRequestChangesErrorStatus(error: unknown): 403 | 404 | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  return error.status === 403 || error.status === 404 ? error.status : undefined;
}

function ProjectPullRequestChangesTitle({
  ownerName,
  projectName,
}: {
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();

  return <title>{`${t("menu.pullRequest")} - ${ownerName}/${projectName}`}</title>;
}

function replaceThreadInChanges(
  changes: PullRequestChangesResponse,
  nextThread: ReviewThread,
): PullRequestChangesResponse {
  const replace = (thread: ReviewThread) => (thread.id === nextThread.id ? nextThread : thread);

  return {
    ...changes,
    cardThreads: changes.cardThreads.map(replace),
    inlineThreads: changes.inlineThreads.map(replace),
    nonRangedThreads: changes.nonRangedThreads.map(replace),
    threads: changes.threads.map(replace),
  };
}

function ProjectPullRequestChangesBody({
  changes,
  commitId,
  currentUser,
  project,
  runtimeConfig,
}: {
  changes: PullRequestChangesResponse;
  commitId: string;
  currentUser: CurrentUserSummary;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const pullRequest = changes.pullRequest;
  const selectedCommit = commitId
    ? changes.commits.find((commit) => commit.commitId === commitId)
    : undefined;
  const hasReviewCards = changes.threads.length > 0;
  const codediffClassName = `codediff-wrap mt10${hasReviewCards ? "" : " diffs-only"}`;
  const [deleteRequestUri, setDeleteRequestUri] = useState<string | null>(null);
  const [activeInlineReview, setActiveInlineReview] = useState<ActiveInlineReview | null>(null);
  const queryClient = useQueryClient();
  const changesQueryKey = apiQueryKeys.project.pullRequestChanges(
    pullRequest.ownerName,
    pullRequest.projectName,
    pullRequest.pullRequestNumber,
    { commitId },
  );
  const threadStateMutation = useMutation({
    mutationFn: async (input: { state: string; threadId: number }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      const scope = {
        ownerName: pullRequest.ownerName,
        projectName: pullRequest.projectName,
        pullRequestNumber: pullRequest.pullRequestNumber,
        threadId: input.threadId,
      };
      return input.state === "open"
        ? closePullRequestThreadRest(runtimeConfig, csrfToken, scope)
        : openPullRequestThreadRest(runtimeConfig, csrfToken, scope);
    },
    onSuccess(nextThread) {
      queryClient.setQueryData<PullRequestChangesResponse>(changesQueryKey, (previous) =>
        previous ? replaceThreadInChanges(previous, nextThread) : previous,
      );
    },
  });
  const toggleThreadState = (threadId: number, state: string) =>
    threadStateMutation.mutate({ state, threadId });

  return (
    <>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="code-browse-wrap">
            <PullRequestHeader
              activeTab="changes"
              project={project}
              pullRequest={pullRequest}
              runtimeConfig={runtimeConfig}
            />

            <div className="board-body mb20">
              <div className="author-info right-txt" style={{ marginTop: "20px" }}>
                <Link
                  to="/$user"
                  params={{ user: pullRequest.contributor.loginId }}
                  activeOptions={legacyLinkActiveOptions}
                  activeProps={legacyLinkActiveProps}
                  className="usf-group pull-left"
                >
                  <span className="avatar-wrap smaller">
                    <img src={pullRequest.contributor.avatarUrl} width="32" height="32" alt="" />
                  </span>
                  <strong className="name">{pullRequest.contributor.userLabel}</strong>
                  <span className="loginid">
                    {" "}
                    <strong>@</strong>
                    {pullRequest.contributor.loginId}
                  </span>
                </Link>
                <PullRequestBranchInfo pullRequest={pullRequest} runtimeConfig={runtimeConfig} />
              </div>
            </div>

            <div className={codediffClassName}>
              {hasReviewCards ? (
                <button type="button" className="ybtn ybtn-default btn-show-reviewcards">
                  <i className="yobicon-restore"></i>
                </button>
              ) : null}
              <div id="changes" className="diffs-wrap">
                <CommitDropdown
                  commitId={commitId}
                  commits={changes.commits}
                  pullRequest={pullRequest}
                  selectedCommit={selectedCommit}
                />
                {selectedCommit ? <SelectedCommitInfo commit={selectedCommit} /> : null}
                <div className="diff-body diffs-wrap-scroll">
                  <div id="state" className="pullRequest-stateInfo">
                    <PullRequestStateInfo
                      currentUserLoginId={currentUser.loginId}
                      pullRequest={pullRequest}
                      runtimeConfig={runtimeConfig}
                    />
                  </div>
                  {changes.files.map((file) => (
                    <PullRequestFileDiff
                      activeInlineReview={activeInlineReview}
                      currentUser={currentUser}
                      file={file as PullRequestChangedFileWithError}
                      inlineThreads={changes.inlineThreads}
                      key={file.path}
                      onCommentDelete={setDeleteRequestUri}
                      onThreadStateToggle={toggleThreadState}
                      onInlineReviewChange={setActiveInlineReview}
                      pullRequest={pullRequest}
                      runtimeConfig={runtimeConfig}
                    />
                  ))}
                  <div className="btnPop">
                    <button type="button" className="ybtn ybtn-info ybtn-small">
                      <i className="yobicon-post2"></i>
                    </button>
                  </div>
                </div>

                <div className="board-comment-wrap">
                  <div className="non-ranged-threads-wrap">
                    {changes.nonRangedThreads.map((thread) => (
                      <NonRangedThread
                        currentUser={currentUser}
                        key={thread.id}
                        onCommentDelete={setDeleteRequestUri}
                        onThreadStateToggle={toggleThreadState}
                        pullRequest={pullRequest}
                        runtimeConfig={runtimeConfig}
                        thread={thread}
                      />
                    ))}
                  </div>
                  {pullRequest.permissions.canComment ? (
                    <CommentForm
                      action={pullRequestCommentHref(runtimeConfig.basePath, pullRequest, commitId)}
                    />
                  ) : null}
                </div>

                {pullRequest.permissions.canComment ? (
                  activeInlineReview === null ? (
                    <ReviewForm
                      action={pullRequestCommentHref(runtimeConfig.basePath, pullRequest, commitId)}
                      currentUser={currentUser}
                    />
                  ) : null
                ) : null}
              </div>
              {hasReviewCards ? (
                <ReviewWrap pullRequest={pullRequest} threads={changes.threads} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <CommentDeleteModal onClose={() => setDeleteRequestUri(null)} requestUri={deleteRequestUri} />
    </>
  );
}

function NonRangedThread({
  currentUser,
  onCommentDelete,
  onThreadStateToggle,
  pullRequest,
  runtimeConfig,
  thread,
}: {
  currentUser: CurrentUserSummary;
  onCommentDelete: (requestUri: string) => void;
  onThreadStateToggle: (threadId: number, state: string) => void;
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
  thread: ReviewThread;
}) {
  const state = thread.state.toLowerCase();
  const action = pullRequestCommentHref(runtimeConfig.basePath, pullRequest, thread.commitId);

  return (
    <div id={`thread-${thread.id}`} className={`comment-thread-wrap ${state}`}>
      <div className="btn-thread-here btn-thread-minimize">
        <button type="button" className="ybtn ybtn-default ybtn-small">
          <i className="yobicon-comments"></i>
        </button>
      </div>
      <ul className="comments">
        {thread.comments.map((comment) => (
          <NonRangedThreadComment
            comment={comment}
            key={comment.id}
            onCommentDelete={onCommentDelete}
            runtimeConfig={runtimeConfig}
          />
        ))}
      </ul>
      <div className="write-comment-form">
        <form
          action={action}
          method="post"
          encType="multipart/form-data"
          className="review-form"
          style={{ display: "block" }}
        >
          <input type="hidden" name="thread.id" value={thread.id} />
          <ThreadReplyFormBody
            currentUser={currentUser}
            onThreadStateToggle={onThreadStateToggle}
            state={state}
            threadId={thread.id}
            wrapId={`thread-${thread.id}`}
          />
        </form>
      </div>
    </div>
  );
}

function ThreadReplyFormBody({
  currentUser,
  onThreadStateToggle,
  state,
  threadId,
  wrapId,
}: {
  currentUser: CurrentUserSummary;
  onThreadStateToggle: (threadId: number, state: string) => void;
  state: string;
  threadId: number;
  wrapId: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <>
      <div className="author-info-wrap pull-left hide-in-mobile">
        <div className="author-info">
          <Link
            to="/$user"
            params={{ user: currentUser.loginId }}
            activeOptions={legacyLinkActiveOptions}
            activeProps={legacyLinkActiveProps}
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
            textareaStyle={{ height: "100px" }}
            wrapId={wrapId}
          />
          <UploadForm />
          <div className="right-txt">
            <button
              type="button"
              className="ybtn ybtn-default ybtn-small"
              onClick={() => onThreadStateToggle(threadId, state)}
            >
              {t(state === "open" ? "commentThread.close" : "commentThread.open")}
            </button>
            <button type="submit" className="ybtn ybtn-success ybtn-small">
              {t("button.comment.new")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function NonRangedThreadComment({
  comment,
  onCommentDelete,
  runtimeConfig,
}: {
  comment: ReviewComment;
  onCommentDelete: (requestUri: string) => void;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const deleteUri = prefixBasePath(
    runtimeConfig.basePath,
    `/comments/review_comment/${comment.id}`,
  );
  const hasRouteOwnedOriginalMessage =
    comment.viaEmail && splitOriginalMessageMarkdown(comment.contentsMarkdown) !== null;

  return (
    <li id={`comment-${comment.id}`} className="comment">
      <div className="comment-avatar">
        <Link
          to="/$user"
          params={{ user: comment.authorLoginId }}
          activeOptions={legacyLinkActiveOptions}
          activeProps={legacyLinkActiveProps}
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
      <div className="media-body">
        <div className="meta-info">
          <span className="comment_author pull-left">
            <Link
              to="/$user"
              params={{ user: comment.authorLoginId }}
              activeOptions={legacyLinkActiveOptions}
              activeProps={legacyLinkActiveProps}
              title={comment.authorLabel}
            >
              <strong>{`${comment.authorLoginId} `}</strong>
            </Link>
          </span>
          <span className="ago">
            <Link
              to="."
              hash={`comment-${comment.id}`}
              activeOptions={legacyHashLinkActiveOptions}
              activeProps={legacyLinkActiveProps}
              title={comment.createdLabel}
            >
              {comment.createdLabel}
            </Link>
          </span>
          {comment.canDelete ? (
            <span className="edit pull-right">
              <button
                className="btn-transparent pull-right close"
                onClick={(event: MouseEvent<HTMLButtonElement>) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCommentDelete(deleteUri);
                }}
                title={t("common.comment.delete")}
              >
                <i className="yobicon-trash"></i>
              </button>
            </span>
          ) : null}
        </div>
        <div
          className="comment-body markdown-wrap"
          data-via-email={String(comment.viaEmail)}
          data-yobi-original-message-processed={hasRouteOwnedOriginalMessage ? "true" : undefined}
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
    </li>
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
      {originalMessage.visibleMarkdown ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{originalMessage.visibleMarkdown}</ReactMarkdown>
      ) : null}
      <button
        type="button"
        style={{ border: 0, paddingLeft: 5, paddingRight: 5 }}
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
    hiddenMarkdown: lines.slice(delimiterIndex).join("\n").trim(),
    visibleMarkdown: lines.slice(0, delimiterIndex).join("\n").trimEnd(),
  };
}

function CommentDeleteModal({
  onClose,
  requestUri,
}: {
  onClose: () => void;
  requestUri: string | null;
}) {
  const { t } = useLegacyMessages();
  const isOpen = requestUri !== null;
  const closeModal = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  return (
    <>
      <div
        id="comment-delete-modal"
        className={isOpen ? "modal hide fade in" : "modal hide fade"}
        style={isOpen ? { display: "block" } : undefined}
      >
        <div className="modal-header">
          <button type="button" className="close" onClick={closeModal}>
            ×
          </button>
          <h3>{t("common.comment.delete")}</h3>
        </div>
        <div className="modal-body">
          <p>{t("common.comment.delete.confirm")}</p>
        </div>
        <div className="modal-footer">
          <button id="comment-delete-confirm" type="button" className="ybtn ybtn-danger">
            {t("button.yes")}
          </button>
          <button type="button" className="ybtn" onClick={closeModal}>
            {t("button.no")}
          </button>
        </div>
      </div>
      {isOpen ? <div className="modal-backdrop fade in"></div> : null}
    </>
  );
}

function ReviewWrap({
  pullRequest,
  threads,
}: {
  pullRequest: PullRequestDetailResponse;
  threads: ReviewThread[];
}) {
  const { t } = useLegacyMessages();
  const [reviewCardTab, setReviewCardTab] = useState<"open" | "closed">("open");
  const openThreads = threads.filter((thread) => thread.state.toLowerCase() === "open");
  const closedThreads = threads.filter((thread) => thread.state.toLowerCase() === "closed");

  return (
    <div className="review-wrap">
      <div className="review-container">
        <button type="button" className="ybtn ybtn-default btn-hide-reviewcards">
          <i className="yobicon-maximize"></i>
        </button>

        <ul className="nav nav-tabs" style={{ marginBottom: "10px" }}>
          <li className={reviewCardTab === "open" ? "active" : undefined}>
            <button type="button" onClick={() => setReviewCardTab("open")}>
              {t("issue.state.open")} {openThreads.length}
            </button>
          </li>
          <li className={reviewCardTab === "closed" ? "active" : undefined}>
            <button type="button" onClick={() => setReviewCardTab("closed")}>
              {t("issue.state.closed")} {closedThreads.length}
            </button>
          </li>
        </ul>

        <div className="tab-content review-list">
          <ReviewCards
            id="reviewcards-open"
            isActive={reviewCardTab === "open"}
            pullRequest={pullRequest}
            threads={openThreads}
          />
          <ReviewCards
            id="reviewcards-closed"
            isActive={reviewCardTab === "closed"}
            pullRequest={pullRequest}
            threads={closedThreads}
          />
        </div>
      </div>
    </div>
  );
}

function ReviewCards({
  id,
  isActive = false,
  pullRequest,
  threads,
}: {
  id: string;
  isActive?: boolean;
  pullRequest: PullRequestDetailResponse;
  threads: ReviewThread[];
}) {
  return (
    <div id={id} className={`tab-pane${isActive ? " active" : ""}`}>
      {threads.map((thread) => (
        <ReviewCard key={thread.id} pullRequest={pullRequest} thread={thread} />
      ))}
    </div>
  );
}

function ReviewCard({
  pullRequest,
  thread,
}: {
  pullRequest: PullRequestDetailResponse;
  thread: ReviewThread;
}) {
  const { runtimeConfig } = Route.useRouteContext();
  const { t } = useLegacyMessages();
  const remainingCommentCount = Math.max(0, thread.comments.length - 1);

  return (
    <Link
      to={reviewThreadPath(pullRequest, thread)}
      hash={`thread-${thread.id}`}
      activeOptions={legacyHashLinkActiveOptions}
      activeProps={legacyLinkActiveProps}
      className={`review-card ${thread.state.toLowerCase()}${thread.isOutdated ? " outdated" : ""}`}
    >
      <p className="content">{thread.comments[0]?.contentsMarkdown ?? ""}</p>
      <p className="info">
        {remainingCommentCount > 0 ? (
          <span className="comments pull-left">
            <i className="yobicon-comments"></i> {remainingCommentCount}
          </span>
        ) : null}
        <span className="outdated-label">{t("review.outdated")}</span>
        <span className="date" title={thread.createdLabel}>
          {thread.createdLabel}
        </span>
        <span className="avatar-wrap smaller ml5">
          <img
            src={
              thread.authorAvatarUrl ||
              prefixBasePath(runtimeConfig.basePath, "/assets/images/default-avatar-32.png")
            }
            alt={thread.authorLabel}
          />
        </span>
      </p>
    </Link>
  );
}

function PullRequestFileDiff({
  activeInlineReview,
  currentUser,
  file,
  inlineThreads,
  onCommentDelete,
  onThreadStateToggle,
  onInlineReviewChange,
  pullRequest,
  runtimeConfig,
}: {
  activeInlineReview: ActiveInlineReview | null;
  currentUser: CurrentUserSummary;
  file: PullRequestChangedFileWithError;
  inlineThreads: ReviewThread[];
  onCommentDelete: (requestUri: string) => void;
  onThreadStateToggle: (threadId: number, state: string) => void;
  onInlineReviewChange: (review: ActiveInlineReview | null) => void;
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const errorMessageKey = fileDiffErrorMessageKey(file);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectionStart, setSelectionStart] = useState<DiffSelectionStart | null>(null);
  const [pendingBlock, setPendingBlock] = useState<{
    afterLineKey: string;
    fields: ReviewBlockInfo;
    left: number;
    top: number;
  } | null>(null);
  const codeStyle = isExpanded ? undefined : { display: "none" };
  const toggleExpanded = () => setIsExpanded((current) => !current);
  const parsed = parseUnifiedDiff(file.path, file.patch);
  const pathA = isNullDiffPath(parsed.pathA) ? "" : parsed.pathA;
  const pathB = isNullDiffPath(parsed.pathB) ? "" : parsed.pathB;
  const filePath = pathB || pathA || file.path;
  const fileInlineThreads = inlineThreads.filter((thread) => thread.path === filePath);

  return (
    <div id={filePath.replace(/\//g, "-").replace(/\./g, "-")} className="diff-partial-outer">
      <div className="diff-partial-inner">
        {/* oxlint-disable jsx-a11y/click-events-have-key-events -- legacy partial_filediff.scala.html uses a clickable plain div here. */}
        {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- legacy partial_filediff.scala.html uses a clickable plain div here. */}
        <div className="diff-partial-meta" onClick={toggleExpanded} style={{ cursor: "pointer" }}>
          <div className="diff-partial-commit">
            <div className="diff-partial-commit-id">{"\u00a0"}</div>
            <div className="diff-partial-commit-id">{"\u00a0"}</div>
          </div>
          <div className="diff-partial-file">
            <span className="filename">{filePath}</span>
          </div>
        </div>
        {/* oxlint-disable jsx-a11y/no-static-element-interactions -- legacy yobi.CodeCommentBlock uses mouse selection on the plain diff container. */}
        <div
          className="diff-partial-code"
          data-hashcode={file.path}
          onMouseDown={(event) => {
            const start = diffSelectionLine(event.target);
            setSelectionStart(start);
            if (start) {
              setPendingBlock(null);
              onInlineReviewChange(null);
            }
          }}
          onMouseUp={(event) => {
            const block = readDiffSelectionBlock(
              event.currentTarget,
              filePath,
              pathA,
              pathB,
              selectionStart,
            );
            setPendingBlock(block);
          }}
          style={codeStyle}
        >
          <div className="patch-header">
            {pathA ? <div className="path">{`--- ${pathA}`}</div> : null}
            {pathB ? <div className="path">{`+++ ${pathB}`}</div> : null}
          </div>
          <table
            className="diff-container show-comments"
            data-path-a={pathA}
            data-path-b={pathB}
            data-file-path={filePath}
          >
            <tbody>
              {errorMessageKey ? (
                <FileDiffErrorRow messageKey={errorMessageKey} />
              ) : parsed.lines.length === 0 ? (
                <tr>
                  <td colSpan={3}>{t("code.noChanges")}</td>
                </tr>
              ) : (
                parsed.lines.flatMap((line) => {
                  if (line.kind === "range") {
                    return [
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
                      </tr>,
                    ];
                  }

                  const lineKey = diffLineKey(line);
                  const threadsOnLine = fileInlineThreads.filter(
                    (thread) =>
                      thread.endLine === line.lineNumber &&
                      (thread.endSide ?? "B") === (line.type === "remove" ? "A" : "B"),
                  );
                  return [
                    <DiffLineView key={lineKey} line={line} />,
                    ...renderInlineRows({
                      activeInlineReview,
                      currentUser,
                      lineKey,
                      onCommentDelete,
                      onInlineReviewChange,
                      onThreadStateToggle,
                      pullRequest,
                      runtimeConfig,
                      threads: threadsOnLine,
                    }),
                  ];
                })
              )}
            </tbody>
          </table>
          {pendingBlock ? (
            /* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- legacy btnPop is a plain positioned div around the post button. */
            <div
              className="btnPop"
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              onMouseUp={(event) => {
                event.stopPropagation();
              }}
              style={{ top: pendingBlock.top, left: pendingBlock.left, display: "block" }}
            >
              <button
                type="button"
                className="ybtn ybtn-info ybtn-small"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onInlineReviewChange({
                    afterLineKey: pendingBlock.afterLineKey,
                    fields: pendingBlock.fields,
                    placement:
                      pendingBlock.fields.startLine > pendingBlock.fields.endLine
                        ? "top"
                        : "bottom",
                  });
                }}
              >
                <i className="yobicon-post2"></i>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function renderInlineRows({
  activeInlineReview,
  currentUser,
  lineKey,
  onCommentDelete,
  onInlineReviewChange,
  onThreadStateToggle,
  pullRequest,
  runtimeConfig,
  threads,
}: {
  activeInlineReview: ActiveInlineReview | null;
  currentUser: CurrentUserSummary;
  lineKey: string;
  onCommentDelete: (requestUri: string) => void;
  onInlineReviewChange: (review: ActiveInlineReview | null) => void;
  onThreadStateToggle: (threadId: number, state: string) => void;
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
  threads: ReviewThread[];
}) {
  const rows = [];
  const topReview =
    activeInlineReview?.afterLineKey === lineKey && activeInlineReview.placement === "top";
  const bottomReview =
    activeInlineReview?.afterLineKey === lineKey && activeInlineReview.placement === "bottom";

  if (topReview) {
    rows.push(
      <InlineReviewFormRow
        activeInlineReview={activeInlineReview}
        currentUser={currentUser}
        key={`${lineKey}-review-top`}
        onClose={() => onInlineReviewChange(null)}
        pullRequest={pullRequest}
        runtimeConfig={runtimeConfig}
      />,
    );
  }

  if (bottomReview) {
    rows.push(
      <InlineReviewFormRow
        activeInlineReview={activeInlineReview}
        currentUser={currentUser}
        key={`${lineKey}-review-bottom`}
        onClose={() => onInlineReviewChange(null)}
        pullRequest={pullRequest}
        runtimeConfig={runtimeConfig}
      />,
    );
  }

  if (threads.length > 0) {
    rows.push(
      <tr
        className="comments board-comment-wrap"
        data-commit-id={threads[0]?.commitId}
        key={`${lineKey}-threads`}
      >
        <td colSpan={3}>
          {threads.map((thread) => (
            <InlineThread
              currentUser={currentUser}
              key={thread.id}
              onCommentDelete={onCommentDelete}
              onThreadStateToggle={onThreadStateToggle}
              pullRequest={pullRequest}
              runtimeConfig={runtimeConfig}
              thread={thread}
            />
          ))}
        </td>
      </tr>,
    );
  }

  return rows;
}

function InlineThread({
  currentUser,
  onCommentDelete,
  onThreadStateToggle,
  pullRequest,
  runtimeConfig,
  thread,
}: {
  currentUser: CurrentUserSummary;
  onCommentDelete: (requestUri: string) => void;
  onThreadStateToggle: (threadId: number, state: string) => void;
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
  thread: ReviewThread;
}) {
  const { t } = useLegacyMessages();
  const state = thread.state.toLowerCase();
  const isClosed = state === "closed";

  return (
    <div
      id={`thread-${thread.id}`}
      data-state={state}
      className={`comment-thread-wrap ${state}${isClosed ? " fold" : ""}`}
      data-range-path={thread.path}
      data-range-startside={thread.startSide}
      data-range-startline={thread.startLine}
      data-range-startcolumn="0"
      data-range-endside={thread.endSide}
      data-range-endline={thread.endLine}
      data-range-endcolumn="0"
    >
      <div className="btn-thread-here btn-thread-minimize">
        <button type="button" className="ybtn ybtn-default ybtn-small">
          <i className="yobicon-post2"></i>
        </button>
      </div>
      <div className="thread-header">
        <span className={`badge state ${state}`}>{t(`issue.state.${state}`)}</span>
        <button type="button" className="ybtn ybtn-default ybtn-small btn-thread-minimize">
          <i className="yobicon-maximize"></i>
        </button>
      </div>
      <ul className="comments">
        {thread.comments.map((comment) => (
          <NonRangedThreadComment
            comment={comment}
            key={comment.id}
            onCommentDelete={onCommentDelete}
            runtimeConfig={runtimeConfig}
          />
        ))}
      </ul>
      <div className="write-comment-form">
        <form
          action={pullRequestCommentHref(runtimeConfig.basePath, pullRequest, thread.commitId)}
          method="post"
          encType="multipart/form-data"
          className="review-form"
          style={{ display: "block" }}
        >
          <input type="hidden" name="thread.id" value={thread.id} />
          <ThreadReplyFormBody
            currentUser={currentUser}
            onThreadStateToggle={onThreadStateToggle}
            state={state}
            threadId={thread.id}
            wrapId={`thread-${thread.id}`}
          />
        </form>
      </div>
    </div>
  );
}

function InlineReviewFormRow({
  activeInlineReview,
  currentUser,
  onClose,
  pullRequest,
  runtimeConfig,
}: {
  activeInlineReview: ActiveInlineReview;
  currentUser: CurrentUserSummary;
  onClose: () => void;
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <tr className="comment-form">
      <td colSpan={3} className="write-comment-form">
        <ReviewForm
          action={pullRequestCommentHref(
            runtimeConfig.basePath,
            pullRequest,
            activeInlineReview.fields.commitId,
          )}
          currentUser={currentUser}
          hiddenFields={reviewBlockHiddenFields(activeInlineReview.fields)}
          onClose={onClose}
          visible
        />
      </td>
    </tr>
  );
}

function diffSelectionLine(target: EventTarget | null): DiffSelectionStart | null {
  const element = target instanceof Element ? target : null;
  const row = element?.closest("tr[data-line]");
  const lineNumber = Number(row?.getAttribute("data-line") ?? "");
  return row && Number.isFinite(lineNumber) ? { lineNumber, rowIndex: tableRowIndex(row) } : null;
}

function readDiffSelectionBlock(
  container: HTMLElement,
  filePath: string,
  pathA: string,
  pathB: string,
  selectionStart: DiffSelectionStart | null,
): { afterLineKey: string; fields: ReviewBlockInfo; left: number; top: number } | null {
  if (!selectionStart) {
    return null;
  }

  const selection = container.ownerDocument.getSelection();
  const selectionText = selection?.toString() ?? "";
  if (selectionText.length === 0 || !selection?.rangeCount) {
    return null;
  }

  const range = selection.getRangeAt(selection.rangeCount - 1);
  const startRow = closestDiffRow(range.startContainer);
  const endRow = closestDiffRow(range.endContainer);
  if (!startRow || !endRow || startRow.closest("table") !== endRow.closest("table")) {
    return null;
  }

  const startIndex = tableRowIndex(startRow);
  const endIndex = tableRowIndex(endRow);
  const isReversed =
    startIndex < selectionStart.rowIndex ||
    (startIndex === endIndex && range.startOffset > range.endOffset);
  const firstRow = isReversed ? endRow : startRow;
  const lastRow = isReversed ? startRow : endRow;
  const rows = siblingRows(firstRow, lastRow);
  if (
    rows.some(
      (row) => !row.matches("tr[data-line]") && !row.matches("tr.comments") && !rowHasCodeCell(row),
    )
  ) {
    return null;
  }

  const startLine = Number(firstRow.getAttribute("data-line") ?? "");
  const endLine = Number(lastRow.getAttribute("data-line") ?? "");
  const startType = diffRowType(firstRow);
  const endType = diffRowType(lastRow);
  if (!Number.isFinite(startLine) || !Number.isFinite(endLine)) {
    return null;
  }

  const codeBox = diffRowCodeCell(lastRow)?.getBoundingClientRect();
  const containerBox = container.getBoundingClientRect();
  const endColumn = isReversed ? range.startOffset : range.endOffset;

  return {
    afterLineKey: lastRow.getAttribute("data-line-key") ?? "",
    fields: {
      commitId: "",
      endColumn,
      endLine,
      endSide: endType === "remove" ? "A" : "B",
      endType,
      filePath,
      path: filePath,
      pathA,
      pathB,
      prevCommitId: "",
      startColumn: isReversed ? range.endOffset : range.startOffset,
      startLine,
      startSide: startType === "remove" ? "A" : "B",
      startType,
    },
    left: Math.min(
      (codeBox?.left ?? containerBox.left) - containerBox.left + endColumn * 7,
      Math.max(0, containerBox.width - 80),
    ),
    top: Math.max(0, (codeBox?.top ?? containerBox.top) - containerBox.top - 24),
  };
}

function closestDiffRow(node: Node) {
  const element = node instanceof Element ? node : node.parentNode;
  if (!(element instanceof Element)) {
    return null;
  }
  return element?.closest("tr[data-line]") ?? null;
}

function diffRowCodeCell(row: Element) {
  const cell = row.children.item(2);
  return cell instanceof HTMLElement && /\bcode\b/u.test(cell.getAttribute("class") ?? "")
    ? cell
    : null;
}

function rowHasCodeCell(row: Element) {
  const cell = diffRowCodeCell(row);
  return cell?.firstElementChild instanceof HTMLElement && cell.firstElementChild.tagName === "PRE";
}

function diffRowType(row: Element): "add" | "context" | "remove" {
  const className = row.getAttribute("class") ?? "";
  if (/\badd\b/u.test(className)) return "add";
  if (/\bremove\b/u.test(className)) return "remove";
  return "context";
}

function siblingRows(startRow: Element, endRow: Element) {
  const parent = startRow.parentElement;
  if (!parent || parent !== endRow.parentElement) {
    return [];
  }
  const rows = Array.from(parent.children);
  const start = rows.indexOf(startRow);
  const end = rows.indexOf(endRow);
  return rows.slice(Math.min(start, end), Math.max(start, end) + 1);
}

function tableRowIndex(row: Element) {
  return Array.from(row.parentElement?.children ?? []).indexOf(row);
}

function reviewBlockHiddenFields(fields: ReviewBlockInfo) {
  return [
    ["startLine", fields.startLine],
    ["startSide", fields.startSide],
    ["startColumn", fields.startColumn],
    ["endLine", fields.endLine],
    ["endSide", fields.endSide],
    ["endColumn", fields.endColumn],
    ["path", fields.path],
    ["pathA", fields.pathA],
    ["pathB", fields.pathB],
    ["filePath", fields.filePath],
    ["prevCommitId", fields.prevCommitId],
    ["commitId", fields.commitId],
  ] as const;
}

function DiffLineView({ line }: { line: Extract<ParsedDiffLine, { kind: "line" }> }) {
  const oldLine = line.oldLineNumber === null ? "" : String(line.oldLineNumber);
  const newLine = line.newLineNumber === null ? "" : String(line.newLineNumber);

  return (
    <tr
      className={line.type}
      data-line={line.lineNumber}
      data-line-key={diffLineKey(line)}
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

function FileDiffErrorRow({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();

  return (
    <tr>
      <td colSpan={3}>{t(messageKey)}</td>
    </tr>
  );
}

function fileDiffErrorMessageKey(file: PullRequestChangedFileWithError) {
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

function diffLineKey(line: ParsedDiffLine) {
  if (line.kind === "range") {
    return `range-${line.text}`;
  }

  return `line-${line.oldLineNumber ?? ""}-${line.newLineNumber ?? ""}-${line.prefix}${line.text}`;
}

function parseUnifiedDiff(path: string, patch: string): ParsedFileDiff {
  let pathA = path;
  let pathB = path;
  let oldLineNumber = 0;
  let newLineNumber = 0;
  const lines: ParsedDiffLine[] = [];

  for (const rawLine of patch.split(/\r?\n/u)) {
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
    if (rawLine.startsWith("+")) {
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
    if (rawLine.startsWith("-")) {
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

  return { lines, pathA, pathB };
}

function normalizeDiffPath(input: string) {
  const path = input.trim().split(/\s+/u)[0] ?? "";
  return path.replace(/^[ab]\//u, "");
}

function isNullDiffPath(path: string) {
  return path === "/dev/null" || path === "dev/null";
}

function reviewThreadPath(pullRequest: PullRequestDetailResponse, thread: ReviewThread) {
  const changesPath = pullRequestChangesPath(pullRequest);
  const commitPath = thread.commitId ? `/${encodeURIComponent(thread.commitId)}` : "";
  return `${changesPath}${commitPath}`;
}

function CommitDropdown({
  commitId,
  commits,
  pullRequest,
  selectedCommit,
}: {
  commitId: string;
  commits: PullRequestCommit[];
  pullRequest: PullRequestDetailResponse;
  selectedCommit?: PullRequestCommit;
}) {
  const { t } = useLegacyMessages();
  const [isOpen, setIsOpen] = useState(false);
  const changesPath = pullRequestChangesPath(pullRequest);
  const closeDropdown = () => setIsOpen(false);

  return (
    <div id="commits" className={`btn-group auto mb10${isOpen ? " open" : ""}`}>
      <button
        className="btn dropdown-toggle auto"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
      >
        <span className="d-label">
          {selectedCommit ? (
            <>
              <strong className="blue-txt mr10 commit-hash">{selectedCommit.commitShortId}</strong>
              <span>{selectedCommitLabel(selectedCommit, t("review.outdated"))}</span>
            </>
          ) : commitId ? (
            <>
              {`${t("pullRequest.changes.all")} (${t("review.outdated")} - `}
              <strong className="blue-txt mr10">{shortId(commitId)}</strong>)
            </>
          ) : (
            t("pullRequest.changes.all")
          )}
        </span>
        <span className="d-caret">
          <span className="caret"></span>
        </span>
      </button>
      <ul className="dropdown-menu">
        <li>
          <Link
            to={changesPath}
            activeOptions={legacyLinkActiveOptions}
            activeProps={legacyLinkActiveProps}
            onClick={closeDropdown}
          >
            {t("pullRequest.changes.all")}
          </Link>
        </li>
        <li className="divider"></li>
        {commits.map((commit) =>
          commit.state === "CURRENT" ? (
            <li key={commit.commitId}>
              <Link
                to="/" href={`${changesPath}/${encodeURIComponent(commit.commitId)}`} reloadDocument
                activeOptions={legacyLinkActiveOptions}
                activeProps={legacyLinkActiveProps}
                onClick={closeDropdown}
              >
                <strong className="blue-txt mr10 commit-hash">{commit.commitShortId}</strong>
                <span>{commitSummary(commit)}</span>
              </Link>
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}

function SelectedCommitInfo({ commit }: { commit: PullRequestCommit }) {
  const { runtimeConfig } = Route.useRouteContext();
  const { t } = useLegacyMessages();

  return (
    <>
      <p className="commitInfo">
        <span className="avatar-wrap smaller">
          <img
            src={prefixBasePath(runtimeConfig.basePath, "/assets/images/default-avatar-32.png")}
            width="32"
            height="32"
            alt=""
          />
        </span>
        <strong>{commit.authorEmail || t("user.role.anonymous")}</strong>
        <span className="ago" title={commit.authorDateLabel}>
          {commit.authorDateLabel}
        </span>
      </p>
      <pre className="commitMsg mt5">{commit.commitMessage}</pre>
    </>
  );
}

function CommentForm({ action }: { action: string }) {
  const { t } = useLegacyMessages();
  return (
    <form id="comment-form" action={action} method="post" encType="multipart/form-data">
      <div className="write-comment-box">
        <Editor editorMode="comment-body" wrapId="comment" />
        <UploadForm formId="upload" />
        <div className="write-comment-wrap">
          <div className="right-txt">
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

function ReviewForm({
  action,
  currentUser,
  hiddenFields = emptyReviewHiddenFields,
  onClose,
  visible = false,
}: {
  action: string;
  currentUser: CurrentUserSummary;
  hiddenFields?: readonly ReviewHiddenField[];
  onClose?: () => void;
  visible?: boolean;
}) {
  const { t } = useLegacyMessages();
  return (
    <div
      id="review-form"
      className="review-form"
      style={visible ? { display: "block" } : undefined}
    >
      <form action={action} method="post" encType="multipart/form-data">
        {hiddenFields.map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <div className="author-info-wrap pull-left hide-in-mobile">
          <div className="author-info">
            <Link
              to="/$user"
              params={{ user: currentUser.loginId }}
              activeOptions={legacyLinkActiveOptions}
              activeProps={legacyLinkActiveProps}
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
            <UploadForm />
            <div className="right-txt">
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
  return typeof value === "string" ? value : fallback;
}

function Editor({
  editorMode,
  textareaStyle,
  wrapId,
}: {
  editorMode: string;
  textareaStyle?: { height: string };
  wrapId: string;
}) {
  const { t } = useLegacyMessages();
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  return (
    <div className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className={mode === "edit" ? "active" : undefined}>
          <button type="button" onClick={() => setMode("edit")}>
            {t("common.editor.edit")}
          </button>
        </li>
        <li className={mode === "preview" ? "active" : undefined}>
          <button type="button" onClick={() => setMode("preview")}>
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
      <div className="tab-content" style={{ position: "relative", overflow: "visible" }}>
        <LegacyMarkdownHelp />
        <div id={`edit-${wrapId}`} className={`tab-pane${mode === "edit" ? " active" : ""}`}>
          <div className="textarea-box">
            <textarea
              name="contents"
              className="editorSeries content comment nm"
              data-editor-mode={editorMode}
              id={`editor-contents-${wrapId}`}
              style={textareaStyle}
              {...legacyMarkdownTextareaAttr}
            ></textarea>
          </div>
        </div>
        <div id={`preview-${wrapId}`} className={`tab-pane${mode === "preview" ? " active" : ""}`}>
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

function UploadForm({ formId }: { formId?: string }) {
  const { t } = useLegacyMessages();
  return (
    <div className="upload-wrap content-footer" data-resource-type="REVIEW_COMMENT" id={formId}>
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
      <p className="right-txt help">
        <i className="yobicon-supportrequest"></i> {t("common.attach.attachIfYouSave")}
      </p>
    </div>
  );
}

function pullRequestChangesPath(pullRequest: PullRequestDetailResponse) {
  return `/${pullRequest.ownerName}/${pullRequest.projectName}/pullRequest/${pullRequest.pullRequestNumber}/changes`;
}

function pullRequestCommentHref(
  basePath: string,
  pullRequest: PullRequestDetailResponse,
  commitId: string,
) {
  const path = prefixBasePath(
    basePath,
    `/${pullRequest.ownerName}/${pullRequest.projectName}/pullRequest/${pullRequest.id}/comments`,
  );
  return commitId ? `${path}?commitId=${encodeURIComponent(commitId)}` : path;
}

function commitSummary(commit: PullRequestCommit) {
  return commit.commitMessage.split("\n")[0] || commit.commitShortId;
}

function selectedCommitLabel(commit: PullRequestCommit, outdatedLabel: string) {
  const summary = commitSummary(commit);
  return commit.state === "PRIOR" ? `${summary} (${outdatedLabel})` : summary;
}

function shortId(commitId: string) {
  return commitId.slice(0, 7);
}
