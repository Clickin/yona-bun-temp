import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import legacyMarkdownHelpTemplate from "../../../../../../../yona-original/app/views/help/markdown.scala.html?raw";
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
import { SiteLayoutShell } from "../../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../../$projectName";
import {
  PullRequestBranchInfo,
  PullRequestHeader,
  PullRequestStateInfo,
} from "../$pullRequestNumber";

const legacyMarkdownTextareaAttr = { markdown: "true" };
const legacyMarkdownHelpHtml = legacyMarkdownHelpTemplate
  .replace(/@Messages\("title\.markdown\.help"\)/g, "Markdown help")
  .replace(/@\{"@"\}/g, "@")
  .replace(/<script[\s\S]*$/u, "")
  .replace(/^[\s\S]*?<div class="markdown-help">/u, "")
  .replace(/<\/div>\s*$/u, "");

type CurrentUserSummary = {
  avatarUrl: string;
  loginId: string;
  userLabel: string;
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
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectPullRequestChangesScreen commitId={commitId} runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectPullRequestChangesScreen({
  commitId,
  runtimeConfig,
}: {
  commitId: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName, pullRequestNumber } = Route.useParams();
  const prNumber = Number(pullRequestNumber) || 0;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const changesQuery = useQuery(
    pullRequestChangesQueryOptions(runtimeConfig, {
      ownerName,
      projectName,
      pullRequestNumber: prNumber,
      commitId,
    }),
  );
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));

  if (!projectQuery.data || !changesQuery.data || !sessionQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu
        active="pullRequest"
        basePath={runtimeConfig.basePath}
        project={projectQuery.data}
      />
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
        project={projectQuery.data}
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
                <a
                  href={prefixBasePath(
                    runtimeConfig.basePath,
                    `/${pullRequest.contributor.loginId}`,
                  )}
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
                </a>
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
                  runtimeConfig={runtimeConfig}
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
                    <div className="diff-partial-outer" key={file.path}>
                      <div className="diff-partial-inner">
                        <div className="diff-partial-meta">
                          <div className="diff-partial-file">
                            <span className="filename">{file.path}</span>
                          </div>
                        </div>
                        <pre className="diff-body">{file.patch}</pre>
                      </div>
                    </div>
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
                    runtimeConfig={runtimeConfig}
                  />
                ) : null}
              </div>
              {hasReviewCards ? (
                <ReviewWrap
                  pullRequest={pullRequest}
                  runtimeConfig={runtimeConfig}
                  threads={changes.threads}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <CommentDeleteModal />
    </>
  );
}

function NonRangedThread({
  currentUser,
  pullRequest,
  runtimeConfig,
  thread,
}: {
  currentUser: CurrentUserSummary;
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
              <a
                href={prefixBasePath(runtimeConfig.basePath, `/${currentUser.loginId}`)}
                className="avatar-wrap medium"
                title={currentUser.userLabel}
                data-toggle="tooltip"
                data-placement="top"
              >
                <img src={currentUser.avatarUrl} width="32" height="32" alt="" />
              </a>
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
  runtimeConfig,
}: {
  comment: ReviewComment;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  return (
    <li id={`comment-${comment.id}`} className="comment">
      <div className="comment-avatar">
        <a
          href={prefixBasePath(runtimeConfig.basePath, `/${comment.authorLoginId}`)}
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
        </a>
      </div>
      <div className="media-body">
        <div className="meta-info">
          <span className="comment_author pull-left">
            <a
              href={prefixBasePath(runtimeConfig.basePath, `/${comment.authorLoginId}`)}
              data-toggle="tooltip"
              data-placement="top"
              title={comment.authorLabel}
            >
              <strong>{`${comment.authorLoginId} `}</strong>
            </a>
          </span>
          <span className="ago">
            <Link
              to="."
              hash={`comment-${comment.id}`}
              activeOptions={{ includeHash: true }}
              activeProps={{ className: undefined }}
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
                data-request-uri={prefixBasePath(
                  runtimeConfig.basePath,
                  `/comments/review_comment/${comment.id}`,
                )}
                title={t("common.comment.delete")}
              >
                <i className="yobicon-trash"></i>
              </button>
            </span>
          ) : null}
        </div>
        <div className="comment-body markdown-wrap" data-via-email={String(comment.viaEmail)}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.contentsMarkdown}</ReactMarkdown>
        </div>
        <div
          className="attachments"
          data-attachments={JSON.stringify(comment.attachments ?? [])}
        ></div>
      </div>
    </li>
  );
}

function CommentDeleteModal() {
  const { t } = useLegacyMessages();
  return (
    <div id="comment-delete-modal" className="modal hide fade">
      <div className="modal-header">
        <button type="button" className="close" data-dismiss="modal">
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
        <button type="button" className="ybtn" data-dismiss="modal">
          {t("button.no")}
        </button>
      </div>
    </div>
  );
}

function ReviewWrap({
  pullRequest,
  runtimeConfig,
  threads,
}: {
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
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
            runtimeConfig={runtimeConfig}
            threads={openThreads}
          />
          <ReviewCards
            id="reviewcards-closed"
            isActive={reviewCardTab === "closed"}
            pullRequest={pullRequest}
            runtimeConfig={runtimeConfig}
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
  runtimeConfig,
  threads,
}: {
  id: string;
  isActive?: boolean;
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
  threads: ReviewThread[];
}) {
  return (
    <div id={id} className={`tab-pane${isActive ? " active" : ""}`}>
      {threads.map((thread) => (
        <ReviewCard
          key={thread.id}
          pullRequest={pullRequest}
          runtimeConfig={runtimeConfig}
          thread={thread}
        />
      ))}
    </div>
  );
}

function ReviewCard({
  pullRequest,
  runtimeConfig,
  thread,
}: {
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
  thread: ReviewThread;
}) {
  const { t } = useLegacyMessages();
  const remainingCommentCount = Math.max(0, thread.comments.length - 1);

  return (
    <a
      href={reviewThreadHref(runtimeConfig.basePath, pullRequest, thread)}
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
    </a>
  );
}

function reviewThreadHref(
  basePath: string,
  pullRequest: PullRequestDetailResponse,
  thread: ReviewThread,
) {
  const changesPath = pullRequestChangesPath(pullRequest);
  const commitPath = thread.commitId ? `/${encodeURIComponent(thread.commitId)}` : "";
  return `${prefixBasePath(basePath, `${changesPath}${commitPath}`)}#thread-${thread.id}`;
}

function CommitDropdown({
  commitId,
  commits,
  pullRequest,
  runtimeConfig,
  selectedCommit,
}: {
  commitId: string;
  commits: PullRequestCommit[];
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
  selectedCommit?: PullRequestCommit;
}) {
  const { t } = useLegacyMessages();
  const [isOpen, setIsOpen] = useState(false);
  const changesPath = pullRequestChangesPath(pullRequest);

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
          <a href={prefixBasePath(runtimeConfig.basePath, changesPath)}>
            {t("pullRequest.changes.all")}
          </a>
        </li>
        <li className="divider"></li>
        {commits.map((commit) =>
          commit.state === "CURRENT" ? (
            <li data-value={commit.commitId} key={commit.commitId}>
              <a href={prefixBasePath(runtimeConfig.basePath, `${changesPath}/${commit.commitId}`)}>
                <strong className="blue-txt mr10 commit-hash">{commit.commitShortId}</strong>
                <span>{commitSummary(commit)}</span>
              </a>
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

function ReviewForm({
  action,
  currentUser,
  runtimeConfig,
}: {
  action: string;
  currentUser: CurrentUserSummary;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  return (
    <div id="review-form" className="review-form">
      <form action={action} method="post" encType="multipart/form-data">
        <div className="author-info-wrap pull-left hide-in-mobile">
          <div className="author-info">
            <a
              href={prefixBasePath(runtimeConfig.basePath, `/${currentUser.loginId}`)}
              className="avatar-wrap medium"
              data-toggle="tooltip"
              data-placement="top"
              title=""
              data-original-title={currentUser.userLabel}
            >
              <img src={currentUser.avatarUrl} width="32" height="32" alt="" />
            </a>
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
        <div
          className="markdown-help"
          dangerouslySetInnerHTML={{ __html: legacyMarkdownHelpHtml }}
        />
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
