import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DiffLineView, type ParsedDiffLine } from "../../../../../components/diff-line-view";
import { UploadForm } from "../../../../../components/file-uploader";
import { FileDiffErrorRow } from "../../../../../components/file-diff-error-row";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
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
import legacySpriteUrl from "../../../../../assets/legacy/sprite.png";
import { useLegacyMessages } from "../../../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
import {
  PullRequestBranchInfo,
  PullRequestHeader,
  PullRequestStateInfo,
} from "../$pullRequestNumber";
import { styles } from "./-pull-request-changes.stylex";
import { styles as detailStyles } from "../-pull-request-detail.stylex";

const sx = {
  page: stylex.props(styles.page),
  codediffWrap: stylex.props(styles.codediffWrap),
  errorWrap: stylex.props(styles.errorWrap),
  errorIcon: (backgroundImage: string) => stylex.props(styles.errorIcon(backgroundImage)),
  errorMessage: stylex.props(styles.errorMessage),
  browse: stylex.props(styles.browse),
  author: stylex.props(styles.author),
  diffs: stylex.props(styles.diffs),
  threadActions: stylex.props(styles.threadActions),
  commentActions: stylex.props(styles.commentActions),
  reviewActions: stylex.props(styles.reviewActions),
  uploadHelp: stylex.props(styles.uploadHelp),
  commentDeleteModalVisible: stylex.props(styles.commentDeleteModalVisible),
  reviewCard: stylex.props(styles.reviewCard),
  reviewCardOpen: stylex.props(styles.reviewCardOpen),
  reviewCardClosed: stylex.props(styles.reviewCardClosed),
  reviewCardOutdatedLabel: stylex.props(styles.reviewCardOutdatedLabel),
  reviewCardOutdatedLabelHidden: stylex.props(styles.reviewCardOutdatedLabelHidden),
  reviewCardContent: stylex.props(styles.reviewCardContent),
  reviewCardInfo: stylex.props(styles.reviewCardInfo),
  reviewCardDate: stylex.props(styles.reviewCardDate),
  reviewCardAvatar: stylex.props(styles.reviewCardAvatar),
  reviewCardComments: stylex.props(styles.reviewCardComments),
} as const;

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
    <div className="page-wrap-outer" data-stylex-owner="pull-request-changes-error-page">
      <div className="project-page-wrap">
        <div
          {...sx.errorWrap}
          className={`${sx.errorWrap.className ?? ""} error-wrap`.trim()}
          data-stylex-owner="pull-request-changes-error-wrap"
        >
          <i
            {...sx.errorIcon(`url(${legacySpriteUrl})`)}
            className={`${sx.errorIcon(`url(${legacySpriteUrl})`).className ?? ""} ico ico-err2`.trim()}
            data-stylex-owner="pull-request-changes-error-icon"
          ></i>
          <p
            {...sx.errorMessage}
            className={sx.errorMessage.className}
            data-stylex-owner="pull-request-changes-error-message"
          >
            {t(status === 404 ? "error.notfound" : "error.forbidden")}
          </p>
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
      <div
        {...sx.page}
        className={`page-wrap-outer ${sx.page.className ?? ""}`.trim()}
        data-stylex-owner="pull-request-changes-page"
      >
        <div className="project-page-wrap" data-stylex-owner="pull-request-changes-shell">
          <div
            {...sx.browse}
            className={`code-browse-wrap ${sx.browse.className ?? ""}`.trim()}
            data-stylex-owner="pull-request-changes-browse"
          >
            <PullRequestHeader
              activeTab="changes"
              project={project}
              pullRequest={pullRequest}
              runtimeConfig={runtimeConfig}
            />

            <div className="board-body mb20" data-stylex-owner="pull-request-changes-body">
              <div
                {...sx.author}
                className={`author-info right-txt ${sx.author.className ?? ""}`.trim()}
                style={{ marginTop: "20px" }}
                data-stylex-owner="pull-request-changes-author"
              >
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

            <div
              {...sx.codediffWrap}
              className={`${codediffClassName} ${sx.codediffWrap.className ?? ""}`.trim()}
              data-stylex-owner="pull-request-changes-codediff-wrap"
            >
              {hasReviewCards ? (
                <button type="button" className="ybtn ybtn-default btn-show-reviewcards">
                  <i className="yobicon-restore"></i>
                </button>
              ) : null}
              <div
                {...sx.diffs}
                className={`diffs-wrap ${sx.diffs.className ?? ""}`.trim()}
                data-stylex-owner="pull-request-changes-diffs"
                id="changes"
              >
                <CommitDropdown
                  commitId={commitId}
                  commits={changes.commits}
                  pullRequest={pullRequest}
                  selectedCommit={selectedCommit}
                />
                {selectedCommit ? <SelectedCommitInfo commit={selectedCommit} /> : null}
                <div className="diff-body diffs-wrap-scroll">
                  <div
                    id="state"
                    className={`${stylex.props(detailStyles.state).className} pullRequest-stateInfo`}
                    data-stylex-owner="pull-request-changes-state"
                  >
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
          className={`review-form ${stylex.props(styles.threadReviewForm).className ?? ""}`}
          data-stylex-owner="pull-request-changes-non-ranged-review-form"
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
          <Editor editorMode="code-review-body" wrapId={wrapId} />
          <UploadForm
            resourceType="REVIEW_COMMENT"
            helpClassName={`help ${sx.uploadHelp.className ?? ""}`.trim()}
            helpOwner="pull-request-changes-upload-help"
          />
          <div
            {...sx.threadActions}
            className={`right-txt ${sx.threadActions.className ?? ""}`.trim()}
            data-stylex-owner="pull-request-changes-thread-actions"
          >
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
        {...stylex.props(styles.originalMessageToggle)}
        data-stylex-owner="pull-request-changes-original-message-toggle"
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
        {...(isOpen ? sx.commentDeleteModalVisible : undefined)}
        id="comment-delete-modal"
        className={`${
          isOpen ? "modal hide fade in" : "modal hide fade"
        } ${(isOpen ? sx.commentDeleteModalVisible.className : undefined) ?? ""}`.trim()}
        data-stylex-owner="pull-request-changes-comment-delete-modal"
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

        <ul
          className={`${stylex.props(styles.reviewTabs).className} nav nav-tabs`}
          data-stylex-owner="pull-request-changes-review-tabs"
        >
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
  const reviewCardState =
    thread.state.toLowerCase() === "open" ? sx.reviewCardOpen : sx.reviewCardClosed;
  const reviewCardClassName = [
    "review-card",
    thread.state.toLowerCase(),
    thread.isOutdated ? "outdated" : "",
    sx.reviewCard.className,
    reviewCardState.className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      to={reviewThreadPath(pullRequest, thread)}
      hash={`thread-${thread.id}`}
      activeOptions={legacyHashLinkActiveOptions}
      activeProps={legacyLinkActiveProps}
      className={reviewCardClassName}
      data-stylex-owner="pull-request-changes-review-card"
    >
      <p
        className={`content ${sx.reviewCardContent.className}`}
        data-stylex-owner="pull-request-changes-review-card-content"
      >
        {thread.comments[0]?.contentsMarkdown ?? ""}
      </p>
      <p
        className={`info ${sx.reviewCardInfo.className}`}
        data-stylex-owner="pull-request-changes-review-card-info"
      >
        {remainingCommentCount > 0 ? (
          <span
            className={`comments pull-left ${sx.reviewCardComments.className}`}
            data-stylex-owner="pull-request-changes-review-card-comments"
          >
            <i className="yobicon-comments"></i> {remainingCommentCount}
          </span>
        ) : null}
        <span
          className={`outdated-label ${
            thread.isOutdated
              ? sx.reviewCardOutdatedLabel.className
              : `${sx.reviewCardOutdatedLabel.className} ${sx.reviewCardOutdatedLabelHidden.className}`
          }`}
          data-stylex-owner="pull-request-changes-review-card-outdated-label"
        >
          {t("review.outdated")}
        </span>
        <span
          className={`date ${sx.reviewCardDate.className}`}
          data-stylex-owner="pull-request-changes-review-card-date"
          title={thread.createdLabel}
        >
          {thread.createdLabel}
        </span>
        <span
          {...sx.reviewCardAvatar}
          className={`avatar-wrap smaller ml5 ${sx.reviewCardAvatar.className}`}
          data-stylex-owner="pull-request-changes-review-card-avatar"
        >
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
        <div
          className={`${stylex.props(styles.diffMeta).className ?? ""} diff-partial-meta`}
          data-stylex-owner="pull-request-changes-diff-meta"
          onClick={toggleExpanded}
        >
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
          className={`diff-partial-code ${
            isExpanded ? "" : (stylex.props(styles.diffCodeHidden).className ?? "")
          }`.trim()}
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
                    <DiffLineView key={lineKey} line={line} dataLineKey={lineKey} />,
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
              {...stylex.props(
                styles.pendingBlockPosition(pendingBlock.top, pendingBlock.left),
                styles.pendingBlockVisible,
              )}
              className={`btnPop ${stylex
                .props(styles.pendingBlockPosition(pendingBlock.top, pendingBlock.left), styles.pendingBlockVisible)
                .className ?? ""}`.trim()}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              onMouseUp={(event) => {
                event.stopPropagation();
              }}
              data-stylex-owner="pull-request-changes-pending-block"
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
  const [isFolded, setIsFolded] = useState(() => isClosed);
  const threadShellProps = stylex.props(
    styles.rangedThreadWrap,
    state === "closed" ? styles.rangedThreadClosed : styles.rangedThreadOpen,
    isFolded && styles.rangedThreadClosedFold,
  );
  const threadFoldHereProps = stylex.props(isFolded && styles.rangedThreadFoldHere);
  const threadFoldButtonProps = stylex.props(
    isFolded
      ? state === "closed"
        ? styles.rangedThreadFoldHereClosed
        : styles.rangedThreadFoldHereOpen
      : null,
  );
  const threadFoldHiddenHeaderProps = stylex.props(isFolded && styles.rangedThreadFoldHiddenHeader);
  const threadFoldHiddenCommentsProps = stylex.props(
    isFolded && styles.rangedThreadFoldHiddenComments,
  );
  const threadFoldHiddenFormProps = stylex.props(isFolded && styles.rangedThreadFoldHiddenForm);
  const toggleFold = () => setIsFolded((current) => !current);

  return (
    <div
      id={`thread-${thread.id}`}
      data-state={state}
      {...threadShellProps}
      className={`${threadShellProps.className ?? ""} comment-thread-wrap ${state}${isFolded ? " fold" : ""}`}
      data-stylex-owner="pull-request-changes-ranged-thread-shell"
      data-thread-folded={isFolded ? "true" : "false"}
      data-range-path={thread.path}
      data-range-startside={thread.startSide}
      data-range-startline={thread.startLine}
      data-range-startcolumn="0"
      data-range-endside={thread.endSide}
      data-range-endline={thread.endLine}
      data-range-endcolumn="0"
    >
      <div
        {...threadFoldHereProps}
        className={`${threadFoldHereProps.className ?? ""} btn-thread-here btn-thread-minimize`}
        data-stylex-owner="pull-request-changes-ranged-thread-fold-here"
      >
        <button
          type="button"
          {...threadFoldButtonProps}
          className={`${threadFoldButtonProps.className ?? ""} ybtn ybtn-default ybtn-small`}
          onClick={toggleFold}
        >
          <i className="yobicon-post2"></i>
        </button>
      </div>
      <div
        {...threadFoldHiddenHeaderProps}
        className={`${threadFoldHiddenHeaderProps.className ?? ""} thread-header`}
        data-stylex-owner="pull-request-changes-ranged-thread-header"
      >
        <span
          {...stylex.props(styles.rangedThreadBadge)}
          className={`${stylex.props(styles.rangedThreadBadge).className ?? ""} badge state ${state}`}
          data-stylex-owner="pull-request-changes-ranged-thread-badge"
        >
          {t(`issue.state.${state}`)}
        </span>
        <button
          {...stylex.props(styles.rangedThreadMinimize)}
          {...threadFoldHiddenHeaderProps}
          type="button"
          className={`${stylex.props(styles.rangedThreadMinimize).className ?? ""} ${threadFoldHiddenHeaderProps.className ?? ""} ybtn ybtn-default ybtn-small btn-thread-minimize`}
          onClick={toggleFold}
          data-stylex-owner="pull-request-changes-ranged-thread-minimize"
        >
          <i className="yobicon-maximize"></i>
        </button>
      </div>
      <ul
        {...threadFoldHiddenCommentsProps}
        className={`${threadFoldHiddenCommentsProps.className ?? ""} comments`}
        data-stylex-owner="pull-request-changes-ranged-thread-comments"
      >
        {thread.comments.map((comment) => (
          <NonRangedThreadComment
            comment={comment}
            key={comment.id}
            onCommentDelete={onCommentDelete}
            runtimeConfig={runtimeConfig}
          />
        ))}
      </ul>
      <div
        {...threadFoldHiddenFormProps}
        className={`${threadFoldHiddenFormProps.className ?? ""} write-comment-form`}
        data-stylex-owner="pull-request-changes-ranged-thread-form"
      >
        <form
          action={pullRequestCommentHref(runtimeConfig.basePath, pullRequest, thread.commitId)}
          method="post"
          encType="multipart/form-data"
          className={`review-form ${stylex.props(styles.threadReviewForm).className ?? ""}`}
          data-stylex-owner="pull-request-changes-ranged-review-form"
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
              <strong
                className={`${stylex.props(styles.commitHash).className} mr10 commit-hash`}
                data-stylex-owner="pull-request-changes-commit-hash"
              >
                {selectedCommit.commitShortId}
              </strong>
              <span>{selectedCommitLabel(selectedCommit, t("review.outdated"))}</span>
            </>
          ) : commitId ? (
            <>
              {`${t("pullRequest.changes.all")} (${t("review.outdated")} - `}
              <strong
                className={`${stylex.props(styles.commitHash).className} mr10`}
                data-stylex-owner="pull-request-changes-commit-hash"
              >
                {shortId(commitId)}
              </strong>
              )
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
            hash="pull-request-changes-all-active-sentinel"
            mask={{ to: changesPath }}
            activeOptions={legacyHashLinkActiveOptions}
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
                to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes/$commitId"
                params={{
                  ownerName: pullRequest.ownerName,
                  projectName: pullRequest.projectName,
                  pullRequestNumber: String(pullRequest.pullRequestNumber),
                  commitId: commit.commitId,
                }}
                activeOptions={legacyLinkActiveOptions}
                activeProps={legacyLinkActiveProps}
                onClick={closeDropdown}
              >
                <strong
                  className={`${stylex.props(styles.commitHash).className} mr10 commit-hash`}
                  data-stylex-owner="pull-request-changes-commit-hash"
                >
                  {commit.commitShortId}
                </strong>
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
        <UploadForm
          resourceType="REVIEW_COMMENT"
          wrapperId="upload"
          helpClassName={`help ${sx.uploadHelp.className ?? ""}`.trim()}
          helpOwner="pull-request-changes-upload-help"
        />
        <div className="write-comment-wrap">
          <div {...sx.commentActions} data-stylex-owner="pull-request-changes-comment-actions">
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
      className={`${(visible ? stylex.props(styles.visibleForm).className : "") ?? ""} review-form`}
      data-stylex-owner={visible ? "pull-request-changes-visible-form" : undefined}
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
            <UploadForm
              resourceType="REVIEW_COMMENT"
              helpClassName={`help ${sx.uploadHelp.className ?? ""}`.trim()}
              helpOwner="pull-request-changes-upload-help"
            />
            <div {...sx.reviewActions} data-stylex-owner="pull-request-changes-review-actions">
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

function Editor({ editorMode, wrapId }: { editorMode: string; wrapId: string }) {
  const { t } = useLegacyMessages();
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const editorStyleProps = stylex.props(
    editorMode === "code-review-body" && styles.reviewEditorWrapper,
  );
  return (
    <div
      {...editorStyleProps}
      className={`mt10 ${editorStyleProps.className ?? ""}`.trim()}
      data-stylex-owner={
        editorMode === "code-review-body" ? "pull-request-changes-review-editor-wrapper" : undefined
      }
    >
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
      <div
        className={`${stylex.props(styles.editorTabContent).className} tab-content`}
        data-stylex-owner="pull-request-changes-editor-tab-content"
      >
        <LegacyMarkdownHelp />
        <div id={`edit-${wrapId}`} className={`tab-pane${mode === "edit" ? " active" : ""}`}>
          <div className="textarea-box">
            <textarea
              name="contents"
              className={`editorSeries content comment nm ${editorMode === "code-review-body" ? (stylex.props(styles.reviewTextarea).className ?? "") : ""}`.trim()}
              data-editor-mode={editorMode}
              id={`editor-contents-${wrapId}`}
              data-stylex-owner={
                editorMode === "code-review-body"
                  ? "pull-request-changes-review-textarea"
                  : undefined
              }
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
