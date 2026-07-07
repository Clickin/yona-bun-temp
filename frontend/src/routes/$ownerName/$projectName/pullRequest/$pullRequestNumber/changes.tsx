import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LegacyMarkdownHelp } from "../../../../-legacy-markdown-help";
import {
  pullRequestChangesQueryOptions,
  type PullRequestChangesResponse,
  type PullRequestCommit,
  type PullRequestDetailResponse,
  type ReviewComment,
  type ReviewThread,
} from "../../../../../api/pull-requests";
import { currentSessionQueryOptions } from "../../../../../api/session";
import { readProjectContainerQueryOptions } from "../../../../../api/org-project";
import type { ProjectContainer } from "../../../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../../i18n";
import { YonaQueryProvider } from "../../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
import { ProjectHeader, ProjectMenu } from "../../../$projectName";
import {
  PullRequestBranchInfo,
  PullRequestHeader,
  PullRequestStateInfo,
} from "../$pullRequestNumber";

const legacyMarkdownTextareaAttr = { markdown: "true" };
const legacyLinkActiveOptions = { exact: true, explicitUndefined: true };
const legacyHashLinkActiveOptions = { exact: true, explicitUndefined: true, includeHash: true };
const legacyLinkInactiveSearch = { __legacyActive: undefined };
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

export const Route = createFileRoute(
  "/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes",
)({
  component: ProjectPullRequestChangesRoute,
});

function ProjectPullRequestChangesRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName, pullRequestNumber } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const commitPathMarker = `/${ownerName}/${projectName}/pullRequest/${pullRequestNumber}/changes/`;
  const markerIndex = pathname.indexOf(commitPathMarker);
  const commitId =
    markerIndex === -1
      ? ""
      : decodeURIComponent(pathname.slice(markerIndex + commitPathMarker.length));

  return <ProjectPullRequestChangesPage commitId={commitId} runtimeConfig={runtimeConfig} />;
}

export function ProjectPullRequestChangesPage({
  commitId = "",
  runtimeConfig,
}: {
  commitId?: string;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectPullRequestChangesShell commitId={commitId} runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectPullRequestChangesShell({
  commitId,
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

  if (!changesQuery.data || !sessionQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
      <ProjectMenu active="pullRequest" basePath={runtimeConfig.basePath} project={project} />
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
                  search={legacyLinkInactiveSearch}
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
                      file={file as PullRequestChangedFileWithError}
                      key={file.path}
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
                  <ReviewForm
                    action={pullRequestCommentHref(runtimeConfig.basePath, pullRequest, commitId)}
                    currentUser={currentUser}
                  />
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
  pullRequest,
  runtimeConfig,
  thread,
}: {
  currentUser: CurrentUserSummary;
  onCommentDelete: (requestUri: string) => void;
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
  thread: ReviewThread;
}) {
  const { t } = useLegacyMessages();
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
          <div className="author-info-wrap pull-left hide-in-mobile">
            <div className="author-info">
              <Link
                to="/$user"
                params={{ user: currentUser.loginId }}
                search={legacyLinkInactiveSearch}
                activeOptions={legacyLinkActiveOptions}
                activeProps={legacyLinkActiveProps}
                className="avatar-wrap medium"
                title={currentUser.userLabel}
                data-toggle="tooltip"
                data-placement="top"
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
                wrapId={`thread-${thread.id}`}
              />
              <UploadForm />
              <div className="right-txt">
                <button
                  type="button"
                  data-request-method="post"
                  data-request-uri={prefixBasePath(
                    runtimeConfig.basePath,
                    `/threads/${thread.id}/${state === "open" ? "close" : "open"}`,
                  )}
                  className="ybtn ybtn-default ybtn-small"
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
          search={legacyLinkInactiveSearch}
          activeOptions={legacyLinkActiveOptions}
          activeProps={legacyLinkActiveProps}
          className="avatar-wrap"
          data-toggle="tooltip"
          data-placement="top"
          title={comment.authorLabel}
        >
          <img
            src={comment.authorAvatarUrl || "/assets/images/default-avatar-32.png"}
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
              search={legacyLinkInactiveSearch}
              activeOptions={legacyLinkActiveOptions}
              activeProps={legacyLinkActiveProps}
              data-toggle="tooltip"
              data-placement="top"
              title={comment.authorLabel}
            >
              <strong>{`${comment.authorLoginId} `}</strong>
            </Link>
          </span>
          <span className="ago">
            <Link
              to="."
              hash={`comment-${comment.id}`}
              search={legacyLinkInactiveSearch}
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
                data-toggle="comment-delete"
                data-request-uri={deleteUri}
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
  return (
    <>
      <div
        id="comment-delete-modal"
        className={isOpen ? "modal fade in" : "modal hide fade"}
        style={isOpen ? { display: "block" } : undefined}
      >
        <div className="modal-header">
          <button type="button" className="close" data-dismiss="modal" onClick={onClose}>
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
            data-request-uri={requestUri ?? undefined}
            data-request-method={isOpen ? "delete" : undefined}
          >
            {t("button.yes")}
          </button>
          <button type="button" className="ybtn" data-dismiss="modal" onClick={onClose}>
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
            <button type="button" data-toggle="tab" onClick={() => setReviewCardTab("open")}>
              {t("issue.state.open")} {openThreads.length}
            </button>
          </li>
          <li className={reviewCardTab === "closed" ? "active" : undefined}>
            <button type="button" data-toggle="tab" onClick={() => setReviewCardTab("closed")}>
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
  const { t } = useLegacyMessages();
  const remainingCommentCount = Math.max(0, thread.comments.length - 1);

  return (
    <Link
      to={reviewThreadPath(pullRequest, thread)}
      hash={`thread-${thread.id}`}
      search={legacyLinkInactiveSearch}
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
            src={thread.authorAvatarUrl || "/assets/images/default-avatar-32.png"}
            alt={thread.authorLabel}
          />
        </span>
      </p>
    </Link>
  );
}

function PullRequestFileDiff({ file }: { file: PullRequestChangedFileWithError }) {
  const errorMessageKey = fileDiffErrorMessageKey(file);
  const [isExpanded, setIsExpanded] = useState(true);
  const codeStyle = isExpanded ? undefined : { display: "none" };
  const toggleExpanded = () => setIsExpanded((current) => !current);

  return (
    <div className="diff-partial-outer">
      <div className="diff-partial-inner">
        {/* oxlint-disable jsx-a11y/click-events-have-key-events -- legacy partial_filediff.scala.html uses a clickable plain div here. */}
        {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- legacy partial_filediff.scala.html uses a clickable plain div here. */}
        <div className="diff-partial-meta" onClick={toggleExpanded} style={{ cursor: "pointer" }}>
          <div className="diff-partial-file">
            <span className="filename">{file.path}</span>
          </div>
        </div>
        {errorMessageKey ? (
          <div className="diff-partial-code" data-hashcode={file.path} style={codeStyle}>
            <table
              className="diff-container show-comments"
              data-path-a={file.path}
              data-path-b={file.path}
              data-file-path={file.path}
            >
              <tbody>
                <FileDiffErrorRow messageKey={errorMessageKey} />
              </tbody>
            </table>
          </div>
        ) : (
          <div className="diff-partial-code" data-hashcode={file.path} style={codeStyle}>
            <pre className="diff-body">{file.patch}</pre>
          </div>
        )}
      </div>
    </div>
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
        data-toggle="dropdown"
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
        <li data-value="All">
          <Link
            to={changesPath}
            search={legacyLinkInactiveSearch}
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
            <li data-value={commit.commitId} key={commit.commitId}>
              <Link
                to={`${changesPath}/${encodeURIComponent(commit.commitId)}`}
                search={legacyLinkInactiveSearch}
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
  return (
    <>
      <p className="commitInfo">
        <span className="avatar-wrap smaller">
          <img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="" />
        </span>
        <strong>{commit.authorEmail || "Anonymous"}</strong>
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

function ReviewForm({ action, currentUser }: { action: string; currentUser: CurrentUserSummary }) {
  const { t } = useLegacyMessages();
  return (
    <div id="review-form" className="review-form">
      <form action={action} method="post" encType="multipart/form-data">
        <div className="author-info-wrap pull-left hide-in-mobile">
          <div className="author-info">
            <Link
              to="/$user"
              params={{ user: currentUser.loginId }}
              search={legacyLinkInactiveSearch}
              activeOptions={legacyLinkActiveOptions}
              activeProps={legacyLinkActiveProps}
              className="avatar-wrap medium"
              data-toggle="tooltip"
              data-placement="top"
              title=""
              data-original-title={currentUser.userLabel}
            >
              <img src={currentUser.avatarUrl} width="32" height="32" alt="" />
            </Link>
          </div>
        </div>
        <div className="write-comment-box">
          <div className="write-comment-wrap">
            <div className="pull-right">
              <button type="button" className="ybtn ybtn-default ybtn-small" data-toggle="close">
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
    <div data-toggle="markdown-editor" className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className={mode === "edit" ? "active" : undefined}>
          <button type="button" data-toggle="tab" data-mode="edit" onClick={() => setMode("edit")}>
            {t("common.editor.edit")}
          </button>
        </li>
        <li className={mode === "preview" ? "active" : undefined}>
          <button
            type="button"
            data-toggle="tab"
            data-mode="preview"
            onClick={() => setMode("preview")}
          >
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
