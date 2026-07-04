import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { Fragment, type FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createPostCommentRest,
  deleteProjectPostRest,
  deletePostCommentRest,
  readProjectPostQueryOptions,
  unwatchPostRest,
  updatePostCommentRest,
  watchPostRest,
  type BoardAttachment,
  type BoardLabel,
  type BoardPostComment,
  type BoardPostDetail,
} from "../../../../api/boards";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import { apiQueryKeys } from "../../../../api/query-keys";
import type { ProjectContainer } from "../../../../api/types";
import { readSessionBootstrap } from "../../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { LegacyMarkdownHelp } from "../../../-legacy-markdown-help";
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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isEditChildRoute = pathname.endsWith(`/post/${postNumber}/editform`);
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
      {isEditChildRoute ? (
        <Outlet />
      ) : (
        <ProjectPostDetailBody
          post={postQuery.data}
          project={projectQuery.data}
          runtimeConfig={runtimeConfig}
        />
      )}
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [commentDeleteRequestUri, setCommentDeleteRequestUri] = useState<string | null>(null);
  const modalBackdropOpen = deleteModalOpen || commentDeleteRequestUri !== null;
  const ownerName = stringField(project.ownerName, post.ownerName);
  const projectName = stringField(project.projectName, post.projectName);
  const postNumber = stringField(post.postNumber);
  const postQueryOptions = readProjectPostQueryOptions(runtimeConfig, {
    ownerName,
    postNumber,
    projectName,
  });
  const basePath = runtimeConfig.basePath;
  const postRoutePath = `/${ownerName}/${projectName}/post/${postNumber}`;
  const postHref = prefixBasePath(basePath, postRoutePath);
  const editRoutePath = `${postRoutePath}/editform`;
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
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteProjectPostRest(runtimeConfig, csrfToken, {
        ownerName,
        postNumber,
        projectName,
      });
    },
    onSuccess() {
      queryClient.removeQueries({ queryKey: postQueryOptions.queryKey });
      queryClient.invalidateQueries({
        queryKey: [...apiQueryKeys.project.base(ownerName, projectName), "posts"],
      });
      router.history.push(prefixBasePath(basePath, `/${ownerName}/${projectName}/posts`));
    },
  });
  const commentDeleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deletePostCommentRest(runtimeConfig, csrfToken, {
        commentId,
        ownerName,
        postNumber,
        projectName,
      });
    },
    onSuccess(updatedPost) {
      queryClient.setQueryData(postQueryOptions.queryKey, updatedPost);
      setCommentDeleteRequestUri(null);
    },
  });
  const commentCreateMutation = useMutation({
    mutationFn: async (contentsMarkdown: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createPostCommentRest(runtimeConfig, csrfToken, {
        contentsMarkdown,
        ownerName,
        postNumber,
        projectName,
      });
    },
    onSuccess(updatedPost) {
      queryClient.setQueryData(postQueryOptions.queryKey, updatedPost);
    },
  });
  const commentUpdateMutation = useMutation({
    mutationFn: async ({
      commentId,
      contentsMarkdown,
    }: {
      commentId: string;
      contentsMarkdown: string;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updatePostCommentRest(runtimeConfig, csrfToken, {
        commentId,
        contentsMarkdown,
        ownerName,
        postNumber,
        projectName,
      });
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
              <Link
                to="/$user"
                params={{ user: stringField(post.authorLoginId) }}
                search={{} as never}
                activeProps={{ className: undefined }}
                className="usf-group"
              >
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
              </Link>
              <PostingHistory historyMarkdown={post.historyMarkdown} />
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
                  <div className="content markdown-wrap" data-allowed-update={String(canUpdate)}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.bodyMarkdown}</ReactMarkdown>
                  </div>
                </div>
              </>
            ) : (
              <div className="content empty-content"></div>
            )}
            <div
              className="attachments"
              id="attachments"
              data-attachments={JSON.stringify(post.attachments ?? [])}
            >
              <AttachedFiles basePath={basePath} attachments={post.attachments} />
            </div>
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
              <PostActionButtons
                canDelete={canDelete}
                canUpdate={canUpdate}
                editRoutePath={editRoutePath}
                onDeleteClick={() => setDeleteModalOpen(true)}
              />
            </div>
            <div className="watcher-list"></div>
            <PostComments
              basePath={basePath}
              canDelete={canDelete}
              canUpdate={canUpdate}
              onCreateComment={(contentsMarkdown) =>
                commentCreateMutation.mutateAsync(contentsMarkdown)
              }
              onCommentDeleteRequest={setCommentDeleteRequestUri}
              onUpdateComment={(commentId, contentsMarkdown) =>
                commentUpdateMutation.mutateAsync({ commentId, contentsMarkdown })
              }
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
                    <Link
                      to="/$ownerName/$projectName/postform"
                      params={{ ownerName, projectName }}
                      search={{} as never}
                      activeProps={{ className: undefined }}
                      className="ybtn ybtn-success"
                    >
                      {t("post.write")}
                    </Link>
                  </dd>
                ) : null}
              </dl>
              {!canUpdate ? (
                <PostSelectedLabels
                  labels={post.labels}
                  ownerName={ownerName}
                  projectName={projectName}
                />
              ) : null}
              <div className="right-menu-icons">
                <PostActionButtons
                  canDelete={canDelete}
                  canUpdate={canUpdate}
                  editRoutePath={editRoutePath}
                  onDeleteClick={() => setDeleteModalOpen(true)}
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

      <div
        id="deleteConfirm"
        className={`modal ${deleteModalOpen ? "in " : "hide "}fade`}
        style={deleteModalOpen ? { display: "block" } : undefined}
        aria-hidden={deleteModalOpen ? "false" : undefined}
      >
        <div className="modal-header">
          <button
            type="button"
            className="close"
            data-dismiss="modal"
            onClick={(event) => {
              event.stopPropagation();
              setDeleteModalOpen(false);
            }}
          >
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
            onClick={(event) => {
              event.stopPropagation();
              deleteMutation.mutate();
            }}
          >
            {t("button.yes")}
          </button>
          <button
            type="button"
            className="ybtn"
            data-dismiss="modal"
            onClick={(event) => {
              event.stopPropagation();
              setDeleteModalOpen(false);
            }}
          >
            {t("button.no")}
          </button>
        </div>
      </div>
      {modalBackdropOpen ? <div className="modal-backdrop fade in"></div> : null}
      <CommentDeleteConfirm
        cancelLabel={t("button.no")}
        confirmLabel={t("button.yes")}
        message={t("common.comment.delete.confirm")}
        onCancel={() => setCommentDeleteRequestUri(null)}
        onConfirm={(requestUri) => {
          const commentId = requestUri.match(/\/comment\/(\d+)(?:\/delete)?(?:[?#].*)?$/u)?.[1];
          if (commentId) {
            commentDeleteMutation.mutate(commentId);
          }
        }}
        open={commentDeleteRequestUri !== null}
        requestUri={commentDeleteRequestUri}
        title={t("common.comment.delete")}
      />
    </div>
  );
}

function PostingHistory({ historyMarkdown }: { historyMarkdown: string }) {
  const { t } = useLegacyMessages();
  const [open, setOpen] = useState(false);

  if (!historyMarkdown) {
    return null;
  }

  return (
    <div className="posting-history">
      <button
        type="button"
        data-toggle="modal"
        data-target="#-yona-posting-history"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {t("change.history")}
      </button>
      <div
        id="-yona-posting-history"
        className={`modal ${open ? "in" : "hide"}`}
        style={open ? { display: "block" } : undefined}
        aria-hidden={open ? "false" : undefined}
      >
        <div className="modal-header">
          <button
            type="button"
            className="close"
            data-dismiss="modal"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
            }}
          >
            ×
          </button>
          <h5 className="nm">{t("change.history")}</h5>
        </div>
        <div className="modal-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{historyMarkdown}</ReactMarkdown>
        </div>
        <div className="modal-footer">
          <button
            className="ybtn ybtn-info ybtn-small"
            data-dismiss="modal"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
            }}
          >
            {t("button.confirm")}
          </button>
        </div>
      </div>
      {open ? <div className="modal-backdrop fade in"></div> : null}
    </div>
  );
}

function CommentDeleteConfirm({
  cancelLabel,
  confirmLabel,
  message,
  onCancel,
  onConfirm,
  open,
  requestUri,
  title,
}: {
  cancelLabel: string;
  confirmLabel: string;
  message: string;
  onCancel: () => void;
  onConfirm: (requestUri: string) => void;
  open: boolean;
  requestUri: string | null;
  title: string;
}) {
  return (
    <>
      <div
        id="comment-delete-modal"
        className={`modal ${open ? "in " : "hide "}fade`}
        style={open ? { display: "block" } : undefined}
        aria-hidden={open ? "false" : undefined}
      >
        <div className="modal-header">
          <button type="button" className="close" data-dismiss="modal" onClick={onCancel}>
            ×
          </button>
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button
            id="comment-delete-confirm"
            type="button"
            className="ybtn ybtn-danger"
            data-request-method={requestUri ? "delete" : undefined}
            data-request-uri={requestUri ?? undefined}
            onClick={() => {
              if (requestUri) {
                onConfirm(requestUri);
              }
            }}
          >
            {confirmLabel}
          </button>
          <button type="button" className="ybtn" data-dismiss="modal" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </>
  );
}

function PostSelectedLabels({
  labels,
  ownerName,
  projectName,
}: {
  labels: BoardLabel[];
  ownerName: string;
  projectName: string;
}) {
  if (!labels.length) {
    return null;
  }

  const listRoutePath = `/${ownerName}/${projectName}/posts`;

  return (
    <dl>
      <dt>Label</dt>
      <dd>
        {labels.map((label) => (
          <Link
            to={`${listRoutePath}?labelIds=${encodeURIComponent(label.id)}` as never}
            activeProps={{ className: undefined }}
            className="label issue-label active static"
            key={label.id}
            style={{ background: label.color }}
          >
            {label.name}
          </Link>
        ))}
      </dd>
    </dl>
  );
}

function PostActionButtons({
  canDelete,
  canUpdate,
  editRoutePath,
  onDeleteClick,
  wrap = true,
}: {
  canDelete: boolean;
  canUpdate: boolean;
  editRoutePath: string;
  onDeleteClick: () => void;
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
        <Link to={editRoutePath} activeProps={{ className: undefined }}>
          <button
            type="button"
            className="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"
            title={t("button.show.original")}
          >
            <i className="yobicon-edit-2"></i>
          </button>
        </Link>
      )}
      {canDelete ? (
        <button
          type="button"
          className="icon btn-transparent-with-fontsize-lineheight ml6"
          data-toggle="modal"
          data-target="#deleteConfirm"
          title={t("button.delete")}
          onClick={(event) => {
            event.stopPropagation();
            onDeleteClick();
          }}
        >
          <i className="yobicon-trash"></i>
        </button>
      ) : null}
    </>
  );
  return wrap ? <span className="">{content}</span> : content;
}

function PostComments({
  basePath,
  canDelete,
  canUpdate,
  onCreateComment,
  onCommentDeleteRequest,
  onUpdateComment,
  ownerName,
  post,
  postNumber,
  projectName,
}: {
  basePath: string;
  canDelete: boolean;
  canUpdate: boolean;
  onCreateComment: (contentsMarkdown: string) => Promise<unknown>;
  onCommentDeleteRequest: (requestUri: string) => void;
  onUpdateComment: (commentId: string, contentsMarkdown: string) => Promise<unknown>;
  ownerName: string;
  post: BoardPostDetail;
  postNumber: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const comments = post.comments.filter((comment) => !stringField(comment.parentCommentId));
  const canComment = booleanField(post.permissions.canComment);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
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
                editingCommentId={editingCommentId}
                key={comment.id}
                onCommentEditRequest={setEditingCommentId}
                onCommentDeleteRequest={onCommentDeleteRequest}
                onUpdateComment={async (commentId, contentsMarkdown) => {
                  await onUpdateComment(commentId, contentsMarkdown);
                  setEditingCommentId(null);
                }}
                ownerName={ownerName}
                postNumber={postNumber}
                projectName={projectName}
              />
            ))}
          </ul>
        </div>
      </div>
      <PostCommentForm
        basePath={basePath}
        canComment={canComment}
        onCreateComment={onCreateComment}
        ownerName={ownerName}
        postNumber={postNumber}
        projectName={projectName}
      />
    </div>
  );
}

function PostCommentForm({
  basePath,
  canComment,
  onCreateComment,
  ownerName,
  postNumber,
  projectName,
}: {
  basePath: string;
  canComment: boolean;
  onCreateComment: (contentsMarkdown: string) => Promise<unknown>;
  ownerName: string;
  postNumber: string;
  projectName: string;
}) {
  if (!canComment) {
    return (
      <div
        className="write-comment-box mt20"
        title="You need to log in to add comments."
        data-login="required"
      >
        <div className="write-comment-wrap">
          <div className="textarea-box">
            <textarea className="comment disabled" disabled style={{ cursor: "text" }}></textarea>
          </div>
          <div className="right-txt mt10">
            <span className="ybtn ybtn-disabled">Add a comment</span>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const contents = new FormData(form).get("contents");
    await onCreateComment(typeof contents === "string" ? contents : "");
    form.reset();
  }

  return (
    <form
      id="comment-form"
      action={prefixBasePath(basePath, `/${ownerName}/${projectName}/post/${postNumber}/comments`)}
      method="post"
      encType="multipart/form-data"
      onSubmit={handleSubmit}
    >
      <div className="write-comment-box">
        <MarkdownEditor editorMode="comment-body" name="contents" value="" wrapId="contents" />
        <div
          className="upload-wrap content-footer"
          data-resource-type="NONISSUE_COMMENT"
          id="upload"
        >
          <div className="attach-wrap">
            <span className="help help-droppable">Drag &amp; Drop files to attach here or</span>
            <div className="btn-wrap">
              <div className="nbtn medium white fake-file-wrap">
                <i className="yobicon-upload"></i> File upload
                <input type="file" className="file" name="filePath" multiple />
              </div>
            </div>
            <span className="plain">Click upload button</span>
            <span className="help help-pastable">Paste the clipboard image</span>
          </div>
          <ul className="attached-files unstyled"></ul>
          <p className="right-txt help">
            <i className="yobicon-supportrequest"></i> Selected file will be attached when your
            comment is saved.
          </p>
        </div>
        <div className="write-comment-wrap">
          <div className="right-txt">
            <button type="button" className="ybtn hidden" id="dynamic-comment-btn"></button>
            <button type="submit" className="ybtn ybtn-success">
              Add a comment
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function PostCommentRow({
  basePath,
  canDelete,
  canComment,
  canUpdate,
  childComments,
  comment,
  editingCommentId,
  onCommentEditRequest,
  onCommentDeleteRequest,
  onUpdateComment,
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
  editingCommentId: string | null;
  onCommentEditRequest: (commentId: string | null) => void;
  onCommentDeleteRequest: (requestUri: string) => void;
  onUpdateComment: (commentId: string, contentsMarkdown: string) => Promise<unknown>;
  ownerName: string;
  postNumber: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const commentId = stringField(comment.id);
  const authorLoginId = stringField(comment.authorLoginId);
  const authorLabel = stringField(comment.authorLabel, authorLoginId);
  const avatarUrl = "/assets/images/default-avatar-32.png";
  const isEditing = editingCommentId === commentId;

  return (
    <li className="comment" id={`comment-${commentId}`}>
      {childComments.map((childComment) => (
        <div
          id={`comment-${stringField(childComment.id)}`}
          key={stringField(childComment.id)}
        ></div>
      ))}
      <div className="comment-avatar">
        <Link
          to="/$user"
          params={{ user: authorLoginId }}
          search={{} as never}
          activeProps={{ className: undefined }}
          className={"avatar-wrap"}
        >
          <img src={avatarUrl} width="32" height="32" alt={authorLoginId} />
        </Link>
      </div>
      <div className="media-body">
        <div className="meta-info">
          <span className="comment_author">
            <span className="resp-comment-avatar">
              <Link
                to="/$user"
                params={{ user: authorLoginId }}
                search={{} as never}
                activeProps={{ className: undefined }}
                className={"avatar-wrap"}
              >
                <img src={avatarUrl} width="32" height="32" alt={authorLabel} />
              </Link>
            </span>
            <Link
              to="/$user"
              params={{ user: authorLoginId }}
              search={{} as never}
              activeProps={{ className: undefined }}
            >
              <strong>{authorLabel}</strong>
            </Link>
          </span>
          <span className="ago-date">
            <Link
              to="."
              hash={`comment-${commentId}`}
              activeOptions={{ includeHash: true }}
              activeProps={{ className: undefined }}
              className="ago"
              title={comment.createdLabel}
            >
              {comment.createdLabel}
            </Link>
            <Link
              to="."
              hash={`comment-${commentId}`}
              activeOptions={{ includeHash: true }}
              activeProps={{ className: undefined }}
              className="share-link"
              style={{ display: "none" }}
            >
              [Link]
            </Link>
          </span>
          <span className="act-row pull-right">
            {canUpdate ? (
              <button
                type="button"
                className="btn-transparent ml10"
                data-toggle="comment-edit"
                data-comment-id={commentId}
                title={t("common.comment.edit")}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCommentEditRequest(commentId);
                }}
              >
                <i className="yobicon-edit-2"></i>
              </button>
            ) : null}
            {canDelete
              ? (() => {
                  const deleteUri = prefixBasePath(
                    basePath,
                    `/${ownerName}/${projectName}/post/${postNumber}/comment/${commentId}`,
                  );
                  return (
                    <button
                      type="button"
                      className="btn-transparent ml6"
                      data-toggle="comment-delete"
                      data-request-uri={deleteUri}
                      title={t("common.comment.delete")}
                      onClick={() => onCommentDeleteRequest(deleteUri)}
                    >
                      <i className="yobicon-trash"></i>
                    </button>
                  );
                })()
              : null}
          </span>
        </div>

        <PostCommentUpdateForm
          basePath={basePath}
          canUpdate={canUpdate}
          comment={comment}
          isEditing={isEditing}
          onCancel={() => onCommentEditRequest(null)}
          onUpdateComment={onUpdateComment}
          ownerName={ownerName}
          postNumber={postNumber}
          projectName={projectName}
        />
        <div id={`comment-body-${commentId}`} style={isEditing ? { display: "none" } : undefined}>
          <TasklistBar />
          <div
            className="comment-body markdown-wrap"
            data-via-email={String(booleanField(comment.viaEmail))}
            data-allowed-update={String(canUpdate)}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.contentsMarkdown}</ReactMarkdown>
          </div>
          <div className="attachments" data-attachments={JSON.stringify(comment.attachments ?? [])}>
            <AttachedFiles basePath={basePath} attachments={comment.attachments} />
          </div>
        </div>
      </div>
      <PostChildComments
        basePath={basePath}
        canComment={canComment}
        canDelete={canDelete}
        childComments={childComments}
        onCommentDeleteRequest={onCommentDeleteRequest}
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
  isEditing,
  onCancel,
  onUpdateComment,
  ownerName,
  postNumber,
  projectName,
}: {
  basePath: string;
  canUpdate: boolean;
  comment: BoardPostComment;
  isEditing: boolean;
  onCancel: () => void;
  onUpdateComment: (commentId: string, contentsMarkdown: string) => Promise<unknown>;
  ownerName: string;
  postNumber: string;
  projectName: string;
}) {
  const commentId = stringField(comment.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contents = new FormData(event.currentTarget).get("contents");
    await onUpdateComment(commentId, typeof contents === "string" ? contents : "");
  }

  return (
    <div
      id={`comment-editform-${commentId}`}
      className="comment-update-form"
      style={isEditing ? { display: "block" } : undefined}
    >
      <form
        action={prefixBasePath(
          basePath,
          `/${ownerName}/${projectName}/post/${postNumber}/comments/${commentId}`,
        )}
        method="post"
        encType="multipart/form-data"
        onSubmit={handleSubmit}
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
          <div className="attachment-files">
            <CommentEditAttachmentFiles basePath={basePath} attachments={comment.attachments} />
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

function PostChildComments({
  basePath,
  canComment,
  canDelete,
  childComments,
  onCommentDeleteRequest,
  ownerName,
  parentCommentId,
  postNumber,
  projectName,
}: {
  basePath: string;
  canComment: boolean;
  canDelete: boolean;
  childComments: BoardPostComment[];
  onCommentDeleteRequest: (requestUri: string) => void;
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
              onCommentDeleteRequest={onCommentDeleteRequest}
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
  onCommentDeleteRequest,
  ownerName,
  postNumber,
  projectName,
}: {
  basePath: string;
  canDelete: boolean;
  comment: BoardPostComment;
  onCommentDeleteRequest: (requestUri: string) => void;
  ownerName: string;
  postNumber: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const commentId = stringField(comment.id);
  const authorLoginId = stringField(comment.authorLoginId);
  const authorLabel = stringField(comment.authorLabel, authorLoginId);
  const deleteUri = prefixBasePath(
    basePath,
    `/${ownerName}/${projectName}/post/${postNumber}/comment/${commentId}`,
  );

  return (
    <div className="one-line-comment">
      <div className="contents">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.contentsMarkdown}</ReactMarkdown>
        <span className="subcomment-author hide">
          -{" "}
          <Link
            to="/$user"
            params={{ user: authorLoginId }}
            search={{} as never}
            className="usf-group"
            activeOptions={{ exact: true }}
            activeProps={{ className: undefined }}
          >
            <strong>{authorLabel}</strong>
          </Link>{" "}
          <Link
            to="."
            hash={`comment-${commentId}`}
            activeOptions={{ includeHash: true }}
            activeProps={{ className: undefined }}
            className="ago"
            title={comment.createdLabel}
          >
            {comment.createdLabel}
          </Link>
          {canDelete ? (
            <button
              type="button"
              className="btn-transparent deleteButtonX"
              data-toggle="comment-delete"
              data-request-uri={deleteUri}
              title={t("common.comment.delete")}
              onClick={() => onCommentDeleteRequest(deleteUri)}
            >
              x
            </button>
          ) : null}
        </span>
      </div>
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
  const [activeMode, setActiveMode] = useState<"edit" | "preview">("edit");

  return (
    <div data-toggle="markdown-editor" className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className={activeMode === "edit" ? "active" : undefined}>
          <button
            type="button"
            data-toggle="tab"
            data-mode="edit"
            onClick={() => setActiveMode("edit")}
          >
            Edit
          </button>
        </li>
        <li className={activeMode === "preview" ? "active" : undefined}>
          <button
            type="button"
            data-toggle="tab"
            data-mode="preview"
            onClick={() => setActiveMode("preview")}
          >
            Preview
          </button>
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
        <LegacyMarkdownHelp />
        <div id={`edit-${wrapId}`} className={`tab-pane${activeMode === "edit" ? " active" : ""}`}>
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
        <div
          id={`preview-${wrapId}`}
          className={`tab-pane${activeMode === "preview" ? " active" : ""}`}
        >
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

function AttachedFiles({
  attachments,
  basePath,
}: {
  attachments: BoardAttachment[];
  basePath: string;
}) {
  return (
    <>
      {attachments.map((file) => {
        const id = stringField(file.id);
        const name = stringField(file.name);
        const mimeType = stringField(file.mimeType);
        const size = String(file.size);
        const href = prefixBasePath(basePath, `/files/${id}`);

        return (
          <li
            className="attached-file"
            data-name={name}
            data-href={href}
            data-mime={mimeType}
            data-size={size}
            key={id}
          >
            <strong>
              {name}({size})
            </strong>
            <button type="button" className="attached-delete">
              <i className="ico btn-delete"></i>
            </button>
          </li>
        );
      })}
    </>
  );
}

function CommentEditAttachmentFiles({
  attachments,
  basePath,
}: {
  attachments: BoardAttachment[];
  basePath: string;
}) {
  return (
    <>
      {attachments.map((file) => {
        const id = stringField(file.id);
        const name = stringField(file.name);
        const mimeType = stringField(file.mimeType);
        const size = String(file.size);
        const href = prefixBasePath(basePath, `/files/${id}`);

        return (
          <div
            className="attached-file attached-file-marker"
            data-name={name}
            data-href={href}
            data-mime={mimeType}
            key={id}
          >
            <i className="mimetype"></i>
            <strong className="name">{name}</strong>
            <span className="size">{size}</span>
            <button type="button" className="btn-transparent btn-delete" data-id={id}>
              ×
            </button>
          </div>
        );
      })}
    </>
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
  const [open, setOpen] = useState(false);
  return (
    <div className="pull-left" style={{ padding: "10px 0px", marginLeft: 55 }}>
      <button
        type="button"
        data-toggle="modal"
        data-target="#helpKeys"
        className="ybtn ybtn-inverse ybtn-mini"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {t("title.keymap")}
      </button>
      <div
        id="helpKeys"
        className={`modal ${open ? "in " : "hide "}fade keymap-help`}
        style={open ? { display: "block" } : undefined}
        tabIndex={-1}
        role="dialog"
        aria-hidden={open ? "false" : undefined}
      >
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
          <button
            type="button"
            className="ybtn ybtn-info"
            data-dismiss="modal"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
            }}
          >
            Confirm
          </button>
        </p>
      </div>
      {open ? <div className="modal-backdrop fade in"></div> : null}
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
