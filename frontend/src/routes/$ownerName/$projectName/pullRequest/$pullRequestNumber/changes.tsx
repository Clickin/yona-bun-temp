import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  pullRequestChangesQueryOptions,
  type PullRequestChangesResponse,
  type PullRequestCommit,
  type PullRequestDetailResponse,
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

export const Route = createFileRoute(
  "/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes",
)({
  component: ProjectPullRequestChangesRoute,
});

function ProjectPullRequestChangesRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectPullRequestChangesScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectPullRequestChangesScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
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
        currentUserLoginId={String(sessionQuery.data.loginId ?? "")}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectPullRequestChangesBody({
  changes,
  currentUserLoginId,
  project,
  runtimeConfig,
}: {
  changes: PullRequestChangesResponse;
  currentUserLoginId: string;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const pullRequest = changes.pullRequest;
  const hasReviewCards = changes.cardThreads.length > 0;
  const codediffClassName = `codediff-wrap mt10${hasReviewCards ? "" : " diffs-only"}`;

  return (
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
                href={prefixBasePath(runtimeConfig.basePath, `/${pullRequest.contributor.loginId}`)}
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
                commits={changes.commits}
                pullRequest={pullRequest}
                runtimeConfig={runtimeConfig}
              />
              <div className="diff-body diffs-wrap-scroll">
                <div id="state" className="pullRequest-stateInfo">
                  <PullRequestStateInfo
                    currentUserLoginId={currentUserLoginId}
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
                <div className="non-ranged-threads-wrap"></div>
                {pullRequest.permissions.canComment ? (
                  <CommentForm
                    action={pullRequestCommentHref(runtimeConfig.basePath, pullRequest)}
                  />
                ) : null}
              </div>

              {pullRequest.permissions.canComment ? (
                <ReviewForm action={pullRequestCommentHref(runtimeConfig.basePath, pullRequest)} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommitDropdown({
  commits,
  pullRequest,
  runtimeConfig,
}: {
  commits: PullRequestCommit[];
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const changesPath = pullRequestChangesPath(pullRequest);

  return (
    <div id="commits" className="btn-group auto mb10">
      <button className="btn dropdown-toggle auto" data-toggle="dropdown">
        <span className="d-label">{t("pullRequest.changes.all")}</span>
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
        {commits.map((commit) => (
          <li data-value={commit.commitId} key={commit.commitId}>
            <a href={prefixBasePath(runtimeConfig.basePath, `${changesPath}/${commit.commitId}`)}>
              <strong className="blue-txt mr10 commit-hash">{commit.commitShortId}</strong>
              <span>{commitSummary(commit)}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommentForm({ action }: { action: string }) {
  const { t } = useLegacyMessages();
  return (
    <form id="comment-form" action={action} method="post" encType="multipart/form-data">
      <div className="write-comment-box">
        <Editor editorMode="comment-body" wrapId="comment" />
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

function ReviewForm({ action }: { action: string }) {
  const { t } = useLegacyMessages();
  return (
    <div id="review-form" className="review-form">
      <form action={action} method="post" encType="multipart/form-data">
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

function Editor({ editorMode, wrapId }: { editorMode: string; wrapId: string }) {
  const { t } = useLegacyMessages();
  return (
    <div data-toggle="markdown-editor" className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className="active">
          <a href={`#edit-${wrapId}`} data-toggle="tab" data-mode="edit">
            {t("common.editor.edit")}
          </a>
        </li>
        <li>
          <a href={`#preview-${wrapId}`} data-toggle="tab" data-mode="preview">
            {t("common.editor.preview")}
          </a>
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
        <div id={`edit-${wrapId}`} className="tab-pane active">
          <div className="textarea-box">
            <textarea
              name="contents"
              className="editorSeries content comment nm"
              data-editor-mode={editorMode}
              id={`editor-contents-${wrapId}`}
              {...legacyMarkdownTextareaAttr}
            ></textarea>
          </div>
        </div>
        <div id={`preview-${wrapId}`} className="tab-pane">
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

function UploadForm() {
  const { t } = useLegacyMessages();
  return (
    <div className="upload-wrap content-footer" data-resource-type="REVIEW_COMMENT">
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

function pullRequestCommentHref(basePath: string, pullRequest: PullRequestDetailResponse) {
  return prefixBasePath(
    basePath,
    `/${pullRequest.ownerName}/${pullRequest.projectName}/pullRequest/${pullRequest.id}/comments`,
  );
}

function commitSummary(commit: PullRequestCommit) {
  return commit.commitMessage.split("\n")[0] || commit.commitShortId;
}
