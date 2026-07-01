import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import {
  readProjectPostQueryOptions,
  unwatchPostRest,
  watchPostRest,
  type BoardAttachment,
  type BoardLabel,
  type BoardPostComment,
  type BoardPostDetail,
} from "../../../../api/boards";
import { readSessionBootstrap } from "../../../../auth-workspace-client";
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
  const queryClient = useQueryClient();
  const ownerName = stringField(project.ownerName, post.ownerName);
  const projectName = stringField(project.projectName, post.projectName);
  const postNumber = stringField(post.postNumber);
  const postQueryOptions = readProjectPostQueryOptions(runtimeConfig, {
    ownerName,
    postNumber,
    projectName,
  });
  const basePath = runtimeConfig.basePath;
  const postHref = prefixBasePath(basePath, `/${ownerName}/${projectName}/post/${postNumber}`);
  const editHref = `${postHref}/editform`;
  const canUpdate = booleanField(post.permissions.canUpdate);
  const canDelete = booleanField(post.permissions.canDelete);
  const canWatch = booleanField(post.permissions.canWatch);
  const canCreate = booleanField(post.permissions.canCreate);
  const watchMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      const input = { ownerName, postNumber, projectName };
      return post.isWatching
        ? unwatchPostRest(runtimeConfig, csrfToken, input)
        : watchPostRest(runtimeConfig, csrfToken, input);
    },
    onSuccess(updatedPost) {
      queryClient.setQueryData(postQueryOptions.queryKey, updatedPost);
    },
  });

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
              dangerouslySetInnerHTML={{
                __html: attachedFilesHtml(basePath, post.attachments),
              }}
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
                      onClick={() => watchMutation.mutate()}
                    >
                      {post.isWatching ? t("post.unwatch") : t("post.watch")}
                    </button>
                  ) : null}
                </div>
              </div>
              <PostActionButtons canDelete={canDelete} canUpdate={canUpdate} editHref={editHref} />
            </div>
            <div className="watcher-list"></div>
            <PostComments
              basePath={basePath}
              canDelete={canDelete}
              canUpdate={canUpdate}
              ownerName={ownerName}
              post={post}
              postNumber={postNumber}
              projectName={projectName}
            />
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
              {!canUpdate ? (
                <PostSelectedLabels
                  basePath={basePath}
                  labels={post.labels}
                  ownerName={ownerName}
                  projectName={projectName}
                />
              ) : null}
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

function PostSelectedLabels({
  basePath,
  labels,
  ownerName,
  projectName,
}: {
  basePath: string;
  labels: BoardLabel[];
  ownerName: string;
  projectName: string;
}) {
  if (!labels.length) {
    return null;
  }

  const listLink = prefixBasePath(basePath, `/${ownerName}/${projectName}/posts`);

  return (
    <dl>
      <dt>Label</dt>
      <dd>
        {labels.map((label) => (
          <a
            href={`${listLink}?labelIds=${encodeURIComponent(label.id)}`}
            className="label issue-label active static"
            data-label-id={label.id}
            key={label.id}
            style={{ background: label.color }}
          >
            {label.name}
          </a>
        ))}
      </dd>
    </dl>
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

function PostComments({
  basePath,
  canDelete,
  canUpdate,
  ownerName,
  post,
  postNumber,
  projectName,
}: {
  basePath: string;
  canDelete: boolean;
  canUpdate: boolean;
  ownerName: string;
  post: BoardPostDetail;
  postNumber: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const comments = post.comments.filter((comment) => !stringField(comment.parentCommentId));
  const canComment = booleanField(post.permissions.canComment);
  return (
    <div id="comments" className="board-comment-wrap">
      <div id="timeline">
        <div className="timeline-list">
          <div className="comment-header">
            <i className="yobicon-comments"></i> <strong>{t("common.comment")}</strong>{" "}
            <strong className="num">{post.comments.length}</strong>
          </div>
          <hr className="nm" />
          <ul className="comments">
            {comments.map((comment) => (
              <PostCommentRow
                basePath={basePath}
                canDelete={canDelete}
                canComment={canComment}
                canUpdate={canUpdate}
                childComments={post.comments.filter(
                  (childComment) => stringField(childComment.parentCommentId) === comment.id,
                )}
                comment={comment}
                key={comment.id}
                ownerName={ownerName}
                postNumber={postNumber}
                projectName={projectName}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PostCommentRow({
  basePath,
  canDelete,
  canComment,
  canUpdate,
  childComments,
  comment,
  ownerName,
  postNumber,
  projectName,
}: {
  basePath: string;
  canDelete: boolean;
  canComment: boolean;
  canUpdate: boolean;
  childComments: BoardPostComment[];
  comment: BoardPostComment;
  ownerName: string;
  postNumber: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const commentId = stringField(comment.id);
  const authorLoginId = stringField(comment.authorLoginId);
  const authorLabel = stringField(comment.authorLabel, authorLoginId);
  const authorHref = prefixBasePath(basePath, `/${authorLoginId}`);
  const avatarUrl = "/assets/images/default-avatar-32.png";

  return (
    <li className="comment" id={`comment-${commentId}`}>
      {childComments.map((childComment) => (
        <div
          id={`comment-${stringField(childComment.id)}`}
          key={stringField(childComment.id)}
        ></div>
      ))}
      <div className="comment-avatar">
        <a
          href={authorHref}
          className="avatar-wrap"
          data-toggle="tooltip"
          data-placement="top"
          title={authorLabel}
        >
          <img src={avatarUrl} width="32" height="32" alt={authorLoginId} />
        </a>
      </div>
      <div className="media-body">
        <div className="meta-info">
          <span className="comment_author">
            <span className="resp-comment-avatar">
              <a
                href={authorHref}
                className="avatar-wrap"
                data-toggle="tooltip"
                data-placement="top"
                title={authorLabel}
              >
                <img src={avatarUrl} width="32" height="32" alt={authorLabel} />
              </a>
            </span>
            <a href={authorHref} data-toggle="tooltip" data-placement="top" title={authorLoginId}>
              <strong>{authorLabel}</strong>
            </a>
          </span>
          <span className="ago-date">
            <a href={`#comment-${commentId}`} className="ago" title={comment.createdLabel}>
              {comment.createdLabel}
            </a>
            <a href={`#comment-${commentId}`} className="share-link" style={{ display: "none" }}>
              [Link]
            </a>
          </span>
          <span className="act-row pull-right">
            {canUpdate ? (
              <button
                type="button"
                className="btn-transparent ml10"
                data-toggle="comment-edit"
                data-comment-id={commentId}
                title={t("common.comment.edit")}
              >
                <i className="yobicon-edit-2"></i>
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className="btn-transparent ml6"
                data-toggle="comment-delete"
                data-request-uri={prefixBasePath(
                  basePath,
                  `/${ownerName}/${projectName}/post/${postNumber}/comment/${commentId}`,
                )}
                title={t("common.comment.delete")}
              >
                <i className="yobicon-trash"></i>
              </button>
            ) : null}
          </span>
        </div>

        <PostCommentUpdateForm
          basePath={basePath}
          canUpdate={canUpdate}
          comment={comment}
          ownerName={ownerName}
          postNumber={postNumber}
          projectName={projectName}
        />
        <div id={`comment-body-${commentId}`}>
          <TasklistBar />
          <div
            className="comment-body markdown-wrap"
            data-via-email={String(booleanField(comment.viaEmail))}
            data-allowed-update={String(canUpdate)}
            dangerouslySetInnerHTML={{ __html: comment.contentsHtml }}
          />
          <div
            className="attachments"
            data-attachments={JSON.stringify(comment.attachments ?? [])}
            dangerouslySetInnerHTML={{
              __html: attachedFilesHtml(basePath, comment.attachments),
            }}
          ></div>
        </div>
      </div>
      <PostChildComments
        basePath={basePath}
        canComment={canComment}
        canDelete={canDelete}
        childComments={childComments}
        ownerName={ownerName}
        parentCommentId={commentId}
        postNumber={postNumber}
        projectName={projectName}
      />
    </li>
  );
}

function PostCommentUpdateForm({
  basePath,
  canUpdate,
  comment,
  ownerName,
  postNumber,
  projectName,
}: {
  basePath: string;
  canUpdate: boolean;
  comment: BoardPostComment;
  ownerName: string;
  postNumber: string;
  projectName: string;
}) {
  const commentId = stringField(comment.id);

  return (
    <div id={`comment-editform-${commentId}`} className="comment-update-form">
      <form
        action={prefixBasePath(
          basePath,
          `/${ownerName}/${projectName}/post/${postNumber}/comments/${commentId}`,
        )}
        method="post"
        encType="multipart/form-data"
      >
        <input type="hidden" name="id" value={commentId} />
        <div className="write-comment-box">
          <div className="write-comment-wrap">
            <MarkdownEditor
              editorMode="update-comment-body"
              name="contents"
              value={comment.contentsMarkdown}
              wrapId={commentId}
            />
            <div className="upload-drop-here">
              <div className="msg-wrap">
                <div className="msg">Drag &amp; Drop files here to upload.</div>
              </div>
            </div>
            <div className="right-txt comment-update-button upload-button-line">
              <span className="file-upload">
                <label htmlFor={`upload-${commentId}`} className="file-upload__label ybtn">
                  File upload
                </label>
                <input
                  id={`upload-${commentId}`}
                  className="file-upload__input"
                  type="file"
                  name="filePath"
                  multiple
                />
              </span>
              <button type="button" className="ybtn ybtn-cancel" data-comment-id={commentId}>
                Cancel
              </button>
              {canUpdate ? (
                <button type="submit" className="ybtn ybtn-info">
                  Save
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
          <div className="attachment-files"></div>
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

function PostChildComments({
  basePath,
  canComment,
  canDelete,
  childComments,
  ownerName,
  parentCommentId,
  postNumber,
  projectName,
}: {
  basePath: string;
  canComment: boolean;
  canDelete: boolean;
  childComments: BoardPostComment[];
  ownerName: string;
  parentCommentId: string;
  postNumber: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();

  if (!childComments.length && !canComment) {
    return null;
  }

  return (
    <>
      <div className="add-a-comment pull-right">{t("comment.oneline.comment.placeholder")}</div>
      <div className="subcomment-media-body">
        <div className="child-comments">
          {childComments.map((comment) => (
            <PostChildComment
              basePath={basePath}
              canDelete={canDelete}
              comment={comment}
              key={stringField(comment.id)}
              ownerName={ownerName}
              postNumber={postNumber}
              projectName={projectName}
            />
          ))}
        </div>
        {canComment ? (
          <div className="child-comment-input-form">
            <form
              action={prefixBasePath(
                basePath,
                `/${ownerName}/${projectName}/post/${postNumber}/comments`,
              )}
              method="post"
              encType="multipart/form-data"
            >
              <input
                className="parentCommentId"
                type="hidden"
                name="parentCommentId"
                value={parentCommentId}
              />
              <div className="oneline-comment-box">
                <textarea
                  className="editorSeries"
                  name="contents"
                  {...{ markdown: "true" }}
                  rows={1}
                  placeholder={`${t("comment.oneline.comment.placeholder")} (${ctrlKey()} + ENTER)`}
                ></textarea>
                <button type="submit" className="ybtn ybtn-success">
                  OK
                </button>
              </div>
              <div className="notification-receiver">
                <span className="notification-receiver-title">Notification receivers </span>
                <span className="notification-receiver-list"></span>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </>
  );
}

function PostChildComment({
  basePath,
  canDelete,
  comment,
  ownerName,
  postNumber,
  projectName,
}: {
  basePath: string;
  canDelete: boolean;
  comment: BoardPostComment;
  ownerName: string;
  postNumber: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const commentId = stringField(comment.id);
  const authorLoginId = stringField(comment.authorLoginId);
  const authorLabel = stringField(comment.authorLabel, authorLoginId);
  const deleteLink = canDelete
    ? `<a href="javascript:void(0)" type="button" class="btn-transparent deleteButtonX" data-toggle="comment-delete" data-request-uri="${escapeHtml(
        prefixBasePath(
          basePath,
          `/${ownerName}/${projectName}/post/${postNumber}/comment/${commentId}`,
        ),
      )}" title="${escapeHtml(t("common.comment.delete"))}">x</a>`
    : "";
  const contents = `${comment.contentsHtml}<span class="subcomment-author hide">- <a href="${escapeHtml(
    prefixBasePath(basePath, `/${authorLoginId}`),
  )}" class="usf-group" data-toggle="tooltip" data-placement="top" title="${escapeHtml(
    authorLoginId,
  )}"><strong>${escapeHtml(authorLabel)}</strong></a> <a href="#comment-${escapeHtml(
    commentId,
  )}" class="ago" title="${escapeHtml(comment.createdLabel)}">${escapeHtml(
    comment.createdLabel,
  )}</a>${deleteLink}</span>`;

  return (
    <div className="one-line-comment">
      <div className="contents" dangerouslySetInnerHTML={{ __html: contents }} />
    </div>
  );
}

function MarkdownEditor({
  editorMode,
  name,
  value,
  wrapId,
}: {
  editorMode: string;
  name: string;
  value: string;
  wrapId: string;
}) {
  return (
    <div data-toggle="markdown-editor" className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className="active">
          <a href={`#edit-${wrapId}`} data-toggle="tab" data-mode="edit">
            Edit
          </a>
        </li>
        <li>
          <a href={`#preview-${wrapId}`} data-toggle="tab" data-mode="preview">
            Preview
          </a>
        </li>
        <li>
          <div className="task-list-button">
            <button
              type="button"
              className="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"
            >
              <i className="yobicon-list task-list-icon"></i> Add checklist
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
                Clear Temporary
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
              name={name}
              className="editorSeries content comment nm"
              data-editor-mode={editorMode}
              {...{ markdown: "true" }}
              id={`editor-${name}-${wrapId}`}
              defaultValue={value}
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
          <span className="notification-receiver-title">Notification receivers </span>
          <span className="notification-receiver-list"></span>
        </div>
      </div>
    </div>
  );
}

function attachedFilesHtml(basePath: string, attachments: BoardAttachment[]) {
  return attachments
    .map((file) => {
      const id = stringField(file.id);
      const name = stringField(file.name);
      const mimeType = stringField(file.mimeType);
      const size = String(file.size);
      const href = prefixBasePath(basePath, `/files/${id}`);

      return `<li class="attached-file" data-name="${escapeHtml(name)}" data-href="${escapeHtml(href)}" data-mime="${escapeHtml(mimeType)}" data-size="${escapeHtml(size)}"><strong>${escapeHtml(name)}(${escapeHtml(size)})</strong><a class="attached-delete"><i class="ico btn-delete"></i></a></li>`;
    })
    .join("");
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function booleanField(value: unknown) {
  return value === true;
}
