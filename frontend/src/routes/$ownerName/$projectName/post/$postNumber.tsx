import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import { readProjectPostQueryOptions, type BoardPostDetail } from "../../../../api/boards";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import type { ProjectContainer } from "../../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/post/$postNumber")({
  component: ProjectPostDetailRoute,
});

function ProjectPostDetailRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectPostDetailScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectPostDetailScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, postNumber, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const postQuery = useQuery(
    readProjectPostQueryOptions(runtimeConfig, { ownerName, postNumber, projectName }),
  );

  if (!projectQuery.data || !postQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="board" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectPostDetailBody
        post={postQuery.data}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectPostDetailBody({
  post,
  project,
  runtimeConfig,
}: {
  post: BoardPostDetail;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, post.ownerName);
  const projectName = stringField(project.projectName, post.projectName);
  const postNumber = stringField(post.postNumber);
  const basePath = runtimeConfig.basePath;
  const postHref = prefixBasePath(basePath, `/${ownerName}/${projectName}/post/${postNumber}`);
  const editHref = `${postHref}/editform`;
  const canUpdate = booleanField(post.permissions.canUpdate);
  const canDelete = booleanField(post.permissions.canDelete);
  const canWatch = booleanField(post.permissions.canWatch);
  const canCreate = booleanField(post.permissions.canCreate);

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap board-view">
        <div className="board-header issue">
          <div className="pull-right mr10 mt10 hide-in-mobile">
            <div className="date" title={post.createdLabel}>
              {post.createdLabel}
            </div>
          </div>
          <div className="title">
            <strong className="board-id">#{postNumber}</strong> {post.title}
            <div className="pull-right hide show-in-mobile" style={{ fontSize: "0.7em" }}>
              <span className="date" title={post.createdLabel}>
                {post.createdLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="board-body row-fluid">
          <div className="span9 span-left-pane">
            <div className="author-info">
              <a href={prefixBasePath(basePath, `/${post.authorLoginId}`)} className="usf-group">
                <span className="avatar-wrap smaller">
                  <img
                    src={post.authorAvatarUrl || "/assets/images/default-avatar-32.png"}
                    width="20"
                    height="20"
                    alt=""
                  />
                </span>
                {post.authorLoginId ? (
                  <>
                    <strong className="name">{post.authorLabel}</strong>
                    <span className="loginid">
                      {" "}
                      <strong>@</strong>
                      {post.authorLoginId}
                    </span>
                  </>
                ) : (
                  <strong className="name">{t("common.noAuthor")}</strong>
                )}
              </a>
            </div>
            {post.bodyMarkdown ? (
              <>
                <div id={`post-${postNumber}`} className="hide">
                  <form
                    action={prefixBasePath(
                      basePath,
                      `/api/v1/projects/${ownerName}/${projectName}/posts/${postNumber}/content`,
                    )}
                  >
                    <textarea defaultValue={post.bodyMarkdown}></textarea>
                  </form>
                </div>
                <div id={`post-body-${postNumber}`}>
                  <TasklistBar />
                  <div
                    className="content markdown-wrap"
                    data-allowed-update={String(canUpdate)}
                    dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
                  />
                </div>
              </>
            ) : (
              <div className="content empty-content"></div>
            )}
            <div
              className="attachments"
              id="attachments"
              data-attachments={JSON.stringify(post.attachments ?? [])}
            ></div>
            <div className="board-actrow right-txt">
              <div className="pull-left">
                <div>
                  {canWatch ? (
                    <button
                      id="watch-button"
                      type="button"
                      className={`ybtn ${post.isWatching ? "ybtn-watching" : ""}`}
                      data-toggle="tooltip"
                      data-placement="top"
                      title={t("issue.watch.description")}
                      data-watching={String(post.isWatching)}
                    >
                      {post.isWatching ? t("post.unwatch") : t("post.watch")}
                    </button>
                  ) : null}
                </div>
              </div>
              <PostActionButtons canDelete={canDelete} canUpdate={canUpdate} editHref={editHref} />
            </div>
            <div className="watcher-list"></div>
            <PostComments post={post} />
          </div>

          <div className="span3 span-right-pane mb20">
            <div className="issue-info board-labels">
              <dl>
                {canCreate ? (
                  <dd className="project-btn-item">
                    <a
                      href={prefixBasePath(basePath, `/${ownerName}/${projectName}/postform`)}
                      className="ybtn ybtn-success"
                    >
                      {t("post.write")}
                    </a>
                  </dd>
                ) : null}
              </dl>
              <div className="right-menu-icons">
                <PostActionButtons
                  canDelete={canDelete}
                  canUpdate={canUpdate}
                  editHref={editHref}
                  wrap={false}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="board-footer">
          <BoardDetailKeymap />
        </div>
      </div>

      <script type="text/x-jquery-tmpl" id="tplAttachedFile"></script>
      <div id="deleteConfirm" className="modal hide fade">
        <div className="modal-header">
          <button type="button" className="close" data-dismiss="modal">
            ×
          </button>
          <h3>{t("issue.delete")}</h3>
        </div>
        <div className="modal-body">
          <p>{t("post.delete.confirm")}</p>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="ybtn ybtn-danger"
            data-request-method="delete"
            data-request-uri={postHref}
          >
            {t("button.yes")}
          </button>
          <button type="button" className="ybtn" data-dismiss="modal">
            {t("button.no")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PostActionButtons({
  canDelete,
  canUpdate,
  editHref,
  wrap = true,
}: {
  canDelete: boolean;
  canUpdate: boolean;
  editHref: string;
  wrap?: boolean;
}) {
  const { t } = useLegacyMessages();
  const content = (
    <>
      {canUpdate ? (
        <button
          type="button"
          className="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"
          data-toggle="tooltip"
          title={t("button.edit")}
        >
          <i className="yobicon-edit-2"></i>
        </button>
      ) : (
        <a href={editHref}>
          <button
            type="button"
            className="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"
            data-toggle="tooltip"
            title={t("button.show.original")}
          >
            <i className="yobicon-edit-2"></i>
          </button>
        </a>
      )}
      {canDelete ? (
        <a href="#deleteConfirm" data-toggle="modal">
          <button
            type="button"
            className="icon btn-transparent-with-fontsize-lineheight ml6"
            data-toggle="tooltip"
            title={t("button.delete")}
          >
            <i className="yobicon-trash"></i>
          </button>
        </a>
      ) : null}
    </>
  );
  return wrap ? <span className="">{content}</span> : content;
}

function PostComments({ post }: { post: BoardPostDetail }) {
  const { t } = useLegacyMessages();
  return (
    <div id="comments" className="board-comment-wrap">
      <div id="timeline">
        <div className="timeline-list">
          <div className="comment-header">
            <i className="yobicon-comments"></i> <strong>{t("common.comment")}</strong>{" "}
            <strong className="num">{post.comments.length}</strong>
          </div>
          <hr className="nm" />
          <ul className="comments"></ul>
        </div>
      </div>
    </div>
  );
}

function TasklistBar() {
  return (
    <div className="tasklist">
      <div className="task-title">
        Tasks<span className="done-counter"></span>
      </div>
      <div className="task-progress">
        <div className="bar red" style={{ width: 0 }} title="Tasklist"></div>
      </div>
    </div>
  );
}

function BoardDetailKeymap() {
  const { t } = useLegacyMessages();
  return (
    <div className="pull-left" style={{ padding: "10px 0px", marginLeft: 55 }}>
      <a href="#helpKeys" data-toggle="modal" className="ybtn ybtn-inverse ybtn-mini">
        {t("title.keymap")}
      </a>
      <div id="helpKeys" className="modal hide fade keymap-help" tabIndex={-1} role="dialog">
        <div className="row-fluid">
          <div className="span3">
            <h5>projects</h5>
            <KeymapEntry keys={["H"]} label="Home" />
            <KeymapEntry keys={["B"]} label="Board" />
            <KeymapEntry keys={["I"]} label="Issue" />
            <KeymapEntry keys={["C"]} label="Code" />
            <KeymapEntry keys={["M"]} label="Milestone" />
            <KeymapEntry keys={["P"]} label="Pull request" />
            <KeymapEntry keys={["Q"]} label="Settings" />
          </div>
          <div className="span9">
            <div className="row-fluid">
              <div className="span5">
                <h5>Board details</h5>
                <KeymapEntry keys={["N"]} label={t("post.write")} />
                <KeymapEntry keys={["L"]} label="List" />
                <KeymapEntry keys={["E"]} label={t("button.edit")} />
              </div>
              <div className="span7">
                <h5>Site</h5>
                <KeymapEntry keys={["A"]} label="My Issues" />
                <KeymapEntry keys={["U"]} label="Profile" />
                <KeymapEntry keys={["F"]} label="User menu" />
                <KeymapEntry keys={siteSearchKeys()} label="Site search" join=" + " />
                <KeymapEntry keys={[ctrlKey(), "ENTER"]} label="Submit form" join=" + " />
              </div>
            </div>
            <div className="row-fluid mt20">
              <div className="span12"></div>
            </div>
          </div>
        </div>
        <p className="actrow">
          <button type="button" className="ybtn ybtn-info" data-dismiss="modal">
            Confirm
          </button>
        </p>
      </div>
    </div>
  );
}

function KeymapEntry({ join = "", keys, label }: { join?: string; keys: string[]; label: string }) {
  return (
    <>
      {keys.map((key, index) => (
        <Fragment key={`${label}-${key}`}>
          {index > 0 ? join : ""}
          <span className="ybtn ybtn-small">{key}</span>
        </Fragment>
      ))}
      <span className="help-inline">{label}</span>
      <br />
    </>
  );
}

function ctrlKey() {
  return navigator.platform.toLowerCase().includes("mac") ? "⌘" : "CTRL";
}

function siteSearchKeys() {
  return navigator.platform.toLowerCase().includes("mac") ? ["CTRL", "ALT", "S"] : ["ALT", "S"];
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function booleanField(value: unknown) {
  return value === true;
}
