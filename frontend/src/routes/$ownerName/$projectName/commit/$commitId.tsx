import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  codeCommitDetailQueryOptions,
  type CodeCommitDetailResponse,
  type CodeReviewThread,
} from "../../../../api/code-commits";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import type { ProjectContainer } from "../../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../$projectName";

const legacyMarkdownTextareaAttr = { markdown: "true" };

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
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectCommitDetailScreen
            branch={search.branch}
            path={search.path}
            routeParams={routeParams}
            runtimeConfig={runtimeConfig}
          />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
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

  if (!projectQuery.data || !detailQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="code" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectCommitDetailBody
        detail={detailQuery.data}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
      <CommentDeleteModal />
    </>
  );
}

function ProjectCommitDetailBody({
  detail,
  project,
  runtimeConfig,
}: {
  detail: CodeCommitDetailResponse;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const { commitId, ownerName, projectName } = Route.useParams();
  const { branch, path } = Route.useSearch();
  const selectedBranch = detail.selectedBranch || branch;
  const encodedBranch = encodeURIComponent(selectedBranch);
  const commit = detail.commit;
  const openThreads = detail.threads.filter((thread) => thread.state.toLowerCase() === "open");
  const closedThreads = detail.threads.filter((thread) => thread.state.toLowerCase() === "closed");

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div id="code-browse-wrap" className="code-browse-wrap">
          <ul className="nav nav-tabs" style={{ marginBottom: "20px" }}>
            <li>
              <a href={projectHref(runtimeConfig.basePath, ownerName, projectName, "code")}>
                {t("code.files")}
              </a>
            </li>
            <li className="active">
              <a href={projectHref(runtimeConfig.basePath, ownerName, projectName, "commits")}>
                {t("code.commits")}
              </a>
            </li>
            {project.vcs === "GIT" ? (
              <li>
                <a href={projectHref(runtimeConfig.basePath, ownerName, projectName, "branches")}>
                  {t("title.branches")}
                </a>
              </li>
            ) : null}
          </ul>

          <div className="codediff-wrap">
            <button type="button" className="ybtn ybtn-default btn-show-reviewcards">
              <i className="yobicon-restore"></i>
            </button>
            <div className="diffs-wrap">
              <div className="commitInfo">
                <div className="commitAuthor">
                  <CommitAuthor detail={detail} />
                  <span className="ago" title={commit?.authorDate ?? ""}>
                    {commit?.authorDate ?? ""}
                  </span>
                </div>
                <div className="commitMsg-wrap">
                  <CommitMessage
                    message={commit?.message ?? ""}
                    shortMessage={commit?.shortMessage ?? ""}
                  />
                </div>
                <div className="commitId-wrap">
                  <strong className="commitId">@{commit?.commitId ?? commitId}</strong>
                </div>
              </div>

              <div className="diff-body">
                {detail.files.map((file) => (
                  <pre className="diff-file" key={file.path}>
                    {file.patch}
                  </pre>
                ))}
                <div className="btnPop">
                  <button type="button" className="ybtn ybtn-info ybtn-small">
                    <i className="yobicon-post2"></i>
                  </button>
                </div>
              </div>

              <div className="board-comment-wrap">
                <div className="non-ranged-threads-wrap"></div>
                {detail.permissions.canComment ? (
                  <CommentForm
                    action={commitCommentsHref(
                      runtimeConfig.basePath,
                      ownerName,
                      projectName,
                      commitId,
                    )}
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
                />
              ) : null}
            </div>

            <div className="review-wrap span-hard-wrap">
              <div className="review-container">
                <button type="button" className="ybtn ybtn-default btn-hide-reviewcards">
                  <i className="yobicon-maximize"></i>
                </button>
                <ul className="nav nav-tabs" style={{ marginBottom: "10px" }}>
                  <li className="active">
                    <a href="#reviewcards-open" data-toggle="tab">
                      {`${t("issue.state.open")} ${openThreads.length}`}
                    </a>
                  </li>
                  <li>
                    <a href="#reviewcards-closed" data-toggle="tab">
                      {`${t("issue.state.closed")} ${closedThreads.length}`}
                    </a>
                  </li>
                </ul>
                <div className="tab-content review-list">
                  <ReviewCards id="reviewcards-open" isActive threads={openThreads} />
                  <ReviewCards id="reviewcards-closed" threads={closedThreads} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          id="watch-button"
          type="button"
          className={`pull-left ybtn ${detail.isWatching ? "active ybtn-watching" : ""}`}
          data-toggle="button"
        >
          {t("notification.watch")}
        </button>

        <a
          href={projectHref(
            runtimeConfig.basePath,
            ownerName,
            projectName,
            "commits",
            encodedBranch,
            path,
          )}
          className="ybtn pull-right"
        >
          {t("button.list")}
        </a>
      </div>
    </div>
  );
}

function CommitAuthor({ detail }: { detail: CodeCommitDetailResponse }) {
  const commit = detail.commit;
  if (!commit) {
    return <strong>Anonymous</strong>;
  }
  return (
    <>
      <span className="avatar-wrap smaller">
        <img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="" />
      </span>
      <strong>{commit.authorName || commit.authorEmail || "Anonymous"}</strong>
    </>
  );
}

function CommitMessage({ message, shortMessage }: { message: string; shortMessage: string }) {
  const { t } = useLegacyMessages();
  const lines = message.split("\n");
  const detail = lines.slice(1).join("\n");
  return (
    <>
      <span className="commitMsg short">{shortMessage || t("code.commitMsg.empty")}</span>
      {detail ? <pre className="commitMsg desc">{detail}</pre> : null}
    </>
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

function ReviewCards({
  id,
  isActive = false,
  threads,
}: {
  id: string;
  isActive?: boolean;
  threads: CodeReviewThread[];
}) {
  return (
    <div id={id} className={`tab-pane${isActive ? " active" : ""}`}>
      {threads.map((thread) => (
        <a
          href={`#thread-${thread.id}`}
          className={`review-card ${thread.state.toLowerCase()}`}
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
            {thread.createdLabel}
          </span>
        </a>
      ))}
    </div>
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

function projectHref(basePath: string, ownerName: string, projectName: string, ...parts: string[]) {
  return prefixBasePath(
    basePath,
    `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`,
  );
}

function commitCommentsHref(
  basePath: string,
  ownerName: string,
  projectName: string,
  commitId: string,
) {
  return projectHref(basePath, ownerName, projectName, "commit", commitId, "comments");
}
