import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createPostCommentRest,
  deleteProjectPostRest,
  deletePostCommentRest,
  readProjectPostFormOptionsQueryOptions,
  readProjectPostQueryOptions,
  unwatchPostRest,
  updatePostCommentRest,
  updateProjectPostLabelsRest,
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
import { useLegacyMessages } from "../../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { LegacyMarkdownHelp } from "../../../-legacy-markdown-help";
import legacySpriteUrl from "../../../../assets/legacy/sprite.png";
import { styles } from "./-post-detail.stylex";

const sx = {
  page: stylex.props(styles.page),
  header: stylex.props(styles.header),
  title: stylex.props(styles.title),
  boardId: stylex.props(styles.boardId),
  date: stylex.props(styles.date),
  body: stylex.props(styles.body),
  author: stylex.props(styles.author),
  content: stylex.props(styles.content),
  actions: stylex.props(styles.actions),
  postEditAction: stylex.props(styles.postEditAction),
  postDeleteAction: stylex.props(styles.postDeleteAction),
  commentEditAction: stylex.props(styles.commentActionButton, styles.commentEditAction),
  commentDeleteAction: stylex.props(styles.commentActionButton, styles.commentDeleteAction),
  commentAuthor: stylex.props(styles.commentAuthor),
  commentResponsiveAvatar: stylex.props(styles.commentResponsiveAvatar),
  commentResponsiveAvatarWrap: stylex.props(styles.commentResponsiveAvatarWrap),
  commentAgo: stylex.props(styles.commentAgo),
  commentEditIcon: stylex.props(styles.commentActionIcon, styles.commentEditIcon),
  commentDeleteIcon: stylex.props(styles.commentActionIcon, styles.commentDeleteIcon),
  commentBody: stylex.props(styles.commentBody),
  commentActionRow: stylex.props(styles.commentActionRow),
  commentList: stylex.props(styles.commentList),
  commentRow: stylex.props(styles.commentRow),
  commentAvatar: stylex.props(styles.commentAvatar),
  commentAvatarWrap: stylex.props(styles.commentAvatarWrap),
  commentMeta: stylex.props(styles.commentMeta),
  commentCreateForm: stylex.props(styles.commentCreateForm),
  commentCreateWriteBox: stylex.props(styles.commentCreateWriteBox),
  commentUploadWrap: stylex.props(styles.commentUploadWrap),
  commentUploadAttachWrap: stylex.props(styles.commentUploadAttachWrap),
  commentUploadButtonWrap: stylex.props(styles.commentUploadButtonWrap),
  commentUploadFileButton: stylex.props(styles.commentUploadFileButton),
  commentUploadFileInput: stylex.props(styles.commentUploadFileInput),
  commentUploadDroppable: stylex.props(styles.commentUploadDroppable),
  commentUploadPlain: stylex.props(styles.commentUploadPlain),
  commentUploadPastable: stylex.props(styles.commentUploadPastable),
  commentUploadAttachedFiles: stylex.props(styles.commentUploadAttachedFiles),
  commentUploadHelp: stylex.props(styles.commentUploadHelp),
  commentCreateWriteWrap: stylex.props(styles.commentCreateWriteWrap),
  commentActions: stylex.props(styles.commentActions),
  commentCreateDynamicButton: stylex.props(
    styles.commentUpdateActionButton,
    styles.commentCreateDynamicButton,
  ),
  commentCreateSubmitButton: stylex.props(
    styles.commentUpdateActionButton,
    styles.commentCreateSubmitButton,
  ),
  comments: stylex.props(styles.comments),
  commentHeader: stylex.props(styles.commentHeader),
  commentHeaderIcon: stylex.props(styles.commentHeaderIcon),
  commentDivider: stylex.props(styles.commentDivider),
  sidebar: stylex.props(styles.sidebar),
  footer: stylex.props(styles.footer),
  watchWrapper: stylex.props(styles.watchWrapper),
  editorTabContent: stylex.props(styles.editorTabContent),
  originalMessageToggle: stylex.props(styles.originalMessageToggle),
  tasklist: stylex.props(styles.tasklist),
  tasklistProgress: stylex.props(styles.tasklistProgress),
  keymapWrapper: stylex.props(styles.keymapWrapper),
  desktopMetadata: stylex.props(styles.desktopMetadata),
  mobileMetadata: stylex.props(styles.mobileMetadata),
  errorWrap: stylex.props(styles.errorWrap),
  errorIcon: stylex.props(styles.errorIcon(legacySpriteUrl)),
  errorMessage: stylex.props(styles.errorMessage),
} as const;

type PostDetailModalId = "deleteConfirm" | "helpKeys" | "postingHistory";

const LEGACY_EMPTY_PROFILE_SEARCH = {
  daysAgo: undefined!,
  selected: undefined!,
};
const LEGACY_EMPTY_POST_FORM_SEARCH = {
  branch: undefined!,
  edit: undefined!,
  issueTemplate: undefined!,
  path: undefined!,
  readme: undefined!,
};
const legacyRouteLocalActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

export const Route = createFileRoute("/$ownerName/$projectName/post/$postNumber")({
  component: ProjectPostDetailRoute,
});

function ProjectPostDetailRoute() {
  // This leaf may be reached directly from the home notification stream, whose
  // independently owned SiteLayoutShell is replaced by the project shell. A
  // mode="wait" outlet transition here leaves that cross-shell boundary blank;
  // keep the legacy immediate document handoff instead.
  return <Outlet />;
}

export function ProjectPostDetailIndexScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, postNumber, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const postQuery = useQuery({
    ...readProjectPostQueryOptions(runtimeConfig, { ownerName, postNumber, projectName }),
    retry(failureCount, error) {
      return restApiErrorStatus(error) !== 404 && failureCount < 3;
    },
  });

  if (!projectQuery.data) {
    return null;
  }

  return <ProjectPostDetailScreen project={projectQuery.data} runtimeConfig={runtimeConfig} />;
}

function ProjectPostDetailScreen({
  project,
  runtimeConfig,
}: {
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, postNumber, projectName } = Route.useParams();
  const postQuery = useQuery({
    ...readProjectPostQueryOptions(runtimeConfig, { ownerName, postNumber, projectName }),
    retry(failureCount, error) {
      return restApiErrorStatus(error) !== 404 && failureCount < 3;
    },
  });

  if (restApiErrorStatus(postQuery.error) === 404) {
    return (
      <>
        <ProjectPostNotFoundTitle ownerName={ownerName} projectName={projectName} />
        <ProjectPostNotFoundBody ownerName={ownerName} projectName={projectName} />
      </>
    );
  }

  if (!postQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectPostDetailTitle postTitle={stringField(postQuery.data.title)} />
      <ProjectPostDetailBody
        post={postQuery.data}
        project={project}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectPostDetailTitle({ postTitle }: { postTitle: string }) {
  return postTitle ? <title>{postTitle}</title> : null;
}

function ProjectPostNotFoundTitle({
  ownerName,
  projectName,
}: {
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();

  return <title>{`${t("error.notfound")} - ${ownerName}/${projectName}`}</title>;
}

function ProjectPostNotFoundBody({
  ownerName,
  projectName,
}: {
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <div {...sx.page} data-stylex-owner="post-detail-page">
      <div className="project-page-wrap">
        <div
          {...sx.errorWrap}
          className={`${sx.errorWrap.className} error-wrap`}
          data-stylex-owner="post-detail-error-wrap"
        >
          <i
            {...sx.errorIcon}
            className={`${sx.errorIcon.className} ico ico-err2`}
            data-stylex-owner="post-detail-error-icon"
          ></i>
          <p {...sx.errorMessage} data-stylex-owner="post-detail-error-message">
            {t("error.notfound.board_post")}
          </p>
          <Link
            to="/$ownerName/$projectName/posts"
            params={{ ownerName, projectName }}
            className="ybtn ybtn-primary"
            data-stylex-owner="post-detail-error-list"
          >
            {t("button.list")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProjectPostEditNotFoundTitle() {
  const { t } = useLegacyMessages();

  return <title>{t("error.internalServerError")}</title>;
}

function ProjectPostEditNotFoundBody() {
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="error-wrap">
          <i className="ico-404"></i>
          <p>{t("error.internalServerError")}</p>
          <Link to="/" className="ybtn ybtn-primary">
            {t("menu.home")}
          </Link>
        </div>
      </div>
    </div>
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
  const { language, t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [openPostModal, setOpenPostModal] = useState<PostDetailModalId | null>(null);
  const [commentDeleteCommentId, setCommentDeleteCommentId] = useState<string | null>(null);
  const deleteModalOpen = openPostModal === "deleteConfirm";
  const modalBackdropOpen = openPostModal !== null || commentDeleteCommentId !== null;
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
  const editRoutePath = `${postRoutePath}/editform`;
  const canUpdate = booleanField(post.permissions.canUpdate);
  const canDelete = booleanField(post.permissions.canDelete);
  const canWatch = booleanField(post.permissions.canWatch);
  const watchButtonStyle = stylex.props(styles.watch, post.isWatching && styles.watchWatching);
  // board/view.scala.html keys this rail entry off the enabled board menu;
  // creation authorization is enforced after navigation, not by hiding it.
  const boardMenuEnabled = projectMenuEnabled(project, "board");
  const formOptionsQuery = useQuery({
    ...readProjectPostFormOptionsQueryOptions(runtimeConfig, { ownerName, projectName }),
    enabled: canUpdate,
  });
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
      setCommentDeleteCommentId(null);
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
  const labelUpdateMutation = useMutation({
    mutationFn: async (labelIds: string[]) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updateProjectPostLabelsRest(runtimeConfig, csrfToken, {
        labelIds,
        ownerName,
        postNumber,
        projectName,
      });
    },
    onSuccess(updatedPost) {
      queryClient.setQueryData(postQueryOptions.queryKey, updatedPost);
    },
  });
  const closeCurrentModal = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenPostModal(null);
    setCommentDeleteCommentId(null);
  };

  return (
    <div className="page-wrap-outer">
      <link
        rel="stylesheet"
        href={prefixBasePath(
          basePath,
          "/legacy-assets/javascripts/lib/elevator/jquery.elevator.css",
        )}
      />
      <div className="project-page-wrap board-view" data-stylex-owner="post-detail-shell">
        <div
          {...sx.header}
          className={`${sx.header.className} board-header issue`}
          data-stylex-owner="post-detail-header"
        >
          <div
            {...sx.desktopMetadata}
            className={sx.desktopMetadata.className}
            data-stylex-owner="post-detail-desktop-metadata"
          >
            <div
              {...sx.date}
              className={`${sx.date.className} date`}
              data-stylex-owner="post-detail-date"
              title={post.createdLabel}
            >
              {legacyRelativeDateLabel(post.createdLabel, language)}
            </div>
          </div>
          <div
            {...sx.title}
            className={`${sx.title.className} title`}
            data-stylex-owner="post-detail-title"
          >
            <strong
              {...sx.boardId}
              className={`${sx.boardId.className} board-id`}
              data-stylex-owner="post-detail-board-id"
            >
              #{postNumber}
            </strong>{" "}
            {post.title}
            <div
              {...sx.mobileMetadata}
              className={sx.mobileMetadata.className}
              data-stylex-owner="post-detail-mobile-metadata"
            >
              <span
                {...sx.date}
                className={`${sx.date.className} date`}
                data-stylex-owner="post-detail-date"
                title={post.createdLabel}
              >
                {legacyRelativeDateLabel(post.createdLabel, language)}
              </span>
            </div>
          </div>
        </div>

        <div
          {...sx.body}
          className={`${sx.body.className} board-body row-fluid`}
          data-stylex-owner="post-detail-body"
        >
          <div className="span9 span-left-pane">
            <div
              className={`${sx.author.className} author-info`}
              data-stylex-owner="post-detail-author"
            >
              <Link
                to="/$user"
                params={{ user: stringField(post.authorLoginId) }}
                search={LEGACY_EMPTY_PROFILE_SEARCH}
                activeProps={legacyRouteLocalActiveProps}
                className="usf-group"
              >
                <span className="avatar-wrap smaller">
                  <img
                    src={prefixBasePath(
                      basePath,
                      post.authorAvatarUrl || "/legacy-assets/images/default-avatar-128.png",
                    )}
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
              <PostingHistory
                historyMarkdown={post.historyMarkdown}
                onClose={() => setOpenPostModal(null)}
                onOpen={() => setOpenPostModal("postingHistory")}
                open={openPostModal === "postingHistory"}
              />
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
                    {...sx.content}
                    className={`${sx.content.className} content markdown-wrap`}
                    data-stylex-owner="post-detail-content"
                    data-allowed-update={String(canUpdate)}
                  >
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
              <AttachedFiles attachments={post.attachments} />
            </div>
            <div
              {...sx.actions}
              className={`${sx.actions.className} board-actrow`}
              data-stylex-owner="post-detail-actions"
            >
              <div
                {...sx.watchWrapper}
                className={sx.watchWrapper.className}
                data-stylex-owner="post-detail-watch-wrapper"
              >
                <div>
                  {canWatch ? (
                    <button
                      id="watch-button"
                      type="button"
                      {...watchButtonStyle}
                      className={`${watchButtonStyle.className} ybtn${post.isWatching ? " ybtn-watching" : ""}`}
                      data-stylex-owner="post-detail-watch"
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
                onDeleteClick={() => setOpenPostModal("deleteConfirm")}
                onEditClick={() => router.history.push(prefixBasePath(basePath, editRoutePath))}
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
              onCommentDeleteRequest={setCommentDeleteCommentId}
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
            <div
              className={`${sx.sidebar.className} issue-info board-labels`}
              data-stylex-owner="post-detail-sidebar"
            >
              <dl>
                {boardMenuEnabled ? (
                  <dd className="project-btn-item">
                    <Link
                      to="/$ownerName/$projectName/postform"
                      params={{ ownerName, projectName }}
                      search={LEGACY_EMPTY_POST_FORM_SEARCH}
                      activeProps={legacyRouteLocalActiveProps}
                      className="ybtn ybtn-success"
                    >
                      {t("post.write")}
                    </Link>
                  </dd>
                ) : null}
              </dl>
              {canUpdate ? (
                <PostEditableLabels
                  labels={formOptionsQuery.data?.labels ?? []}
                  onChange={(labelIds) => labelUpdateMutation.mutate(labelIds)}
                  ownerName={ownerName}
                  projectName={projectName}
                  selectedLabelIds={post.labels.map((label) => label.id)}
                />
              ) : (
                <PostSelectedLabels
                  labels={post.labels}
                  ownerName={ownerName}
                  projectName={projectName}
                />
              )}
              <div
                className="act-row right-menu-icons"
                data-stylex-owner="post-detail-sidebar-actions"
              >
                <PostActionButtons
                  canDelete={canDelete}
                  canUpdate={canUpdate}
                  editRoutePath={editRoutePath}
                  onDeleteClick={() => setOpenPostModal("deleteConfirm")}
                  onEditClick={() => router.history.push(prefixBasePath(basePath, editRoutePath))}
                  wrap={false}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className={`${sx.footer.className} board-footer`}
          data-stylex-owner="post-detail-footer"
        >
          <BoardDetailKeymap
            onClose={() => setOpenPostModal(null)}
            onOpen={() => setOpenPostModal("helpKeys")}
            open={openPostModal === "helpKeys"}
          />
        </div>
      </div>

      <div
        id="deleteConfirm"
        className={`modal ${deleteModalOpen ? "in " : "hide "}fade`}
        {...(deleteModalOpen ? stylex.props(styles.deleteModalVisible) : {})}
        data-stylex-owner="post-detail-delete-modal"
        aria-hidden={deleteModalOpen ? "false" : undefined}
      >
        <div className="modal-header">
          <button
            type="button"
            className="close"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpenPostModal(null);
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
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpenPostModal(null);
            }}
          >
            {t("button.no")}
          </button>
        </div>
      </div>
      {modalBackdropOpen ? (
        <div
          className="modal-backdrop fade in"
          role="presentation"
          onClick={closeCurrentModal}
        ></div>
      ) : null}
      <CommentDeleteConfirm
        cancelLabel={t("button.no")}
        confirmLabel={t("button.yes")}
        message={t("common.comment.delete.confirm")}
        onCancel={() => setCommentDeleteCommentId(null)}
        onConfirm={(commentId) => {
          commentDeleteMutation.mutate(commentId);
        }}
        open={commentDeleteCommentId !== null}
        commentId={commentDeleteCommentId}
        title={t("common.comment.delete")}
      />
      <PostElevator />
    </div>
  );
}

function PostElevator() {
  const [atTop, setAtTop] = useState(true);
  const scrollTo = (top: number) => {
    window.scrollTo({ behavior: "smooth", top });
    setAtTop(top === 0);
  };
  const activate = (event: ReactKeyboardEvent<HTMLElement>, top: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      scrollTo(top);
    }
  };
  return (
    <div className="jq-elevator align-bottom align-right rounded glass">
      <span
        className={`jq-top ${atTop ? "jq-sml" : "jq-big"}`}
        role="button"
        tabIndex={0}
        title="Move to Top"
        onClick={() => scrollTo(0)}
        onKeyDown={(event) => activate(event, 0)}
      >
        ▲
      </span>
      <span
        className={`jq-bottom ${atTop ? "jq-big" : "jq-sml"}`}
        role="button"
        tabIndex={0}
        title="Move to Bottom"
        onClick={() => scrollTo(Number.MAX_SAFE_INTEGER)}
        onKeyDown={(event) => activate(event, Number.MAX_SAFE_INTEGER)}
      >
        ▼
      </span>
    </div>
  );
}

function PostingHistory({
  historyMarkdown,
  onClose,
  onOpen,
  open,
}: {
  historyMarkdown: string;
  onClose: () => void;
  onOpen: () => void;
  open: boolean;
}) {
  const { t } = useLegacyMessages();
  const historyModalStyleProps = open ? stylex.props(styles.historyModalVisible) : undefined;

  if (!historyMarkdown) {
    return null;
  }

  return (
    <div className="posting-history">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpen();
        }}
      >
        {t("change.history")}
      </button>
      <div
        id="-yona-posting-history"
        {...historyModalStyleProps}
        className={`modal ${open ? "in" : "hide"} ${historyModalStyleProps?.className ?? ""}`.trim()}
        data-stylex-owner="post-detail-history-modal"
        aria-hidden={open ? "false" : undefined}
      >
        <div className="modal-header">
          <button
            type="button"
            className="close"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
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
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
          >
            {t("button.confirm")}
          </button>
        </div>
      </div>
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
  commentId,
  title,
}: {
  cancelLabel: string;
  commentId: string | null;
  confirmLabel: string;
  message: string;
  onCancel: () => void;
  onConfirm: (commentId: string) => void;
  open: boolean;
  title: string;
}) {
  const commentDeleteStyleProps = open ? stylex.props(styles.commentDeleteVisible) : undefined;

  return (
    <>
      <div
        id="comment-delete-modal"
        {...commentDeleteStyleProps}
        className={`modal ${open ? "in " : "hide "}fade ${commentDeleteStyleProps?.className ?? ""}`.trim()}
        data-stylex-owner="post-detail-comment-delete-modal"
        aria-hidden={open ? "false" : undefined}
      >
        <div className="modal-header">
          <button
            type="button"
            className="close"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onCancel();
            }}
          >
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
            onClick={() => {
              if (commentId) {
                onConfirm(commentId);
              }
            }}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            className="ybtn"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onCancel();
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </>
  );
}

function PostEditableLabels({
  labels,
  onChange,
  ownerName,
  projectName,
  selectedLabelIds,
}: {
  labels: BoardLabel[];
  onChange: (labelIds: string[]) => void;
  ownerName: string;
  projectName: string;
  selectedLabelIds: string[];
}) {
  const { t } = useLegacyMessages();
  const labelsByCategory = labels.reduce<Map<string, BoardLabel[]>>((groups, label) => {
    const key = `${label.categoryId}:${label.categoryName}:${String(label.categoryIsExclusive)}`;
    const categoryLabels = groups.get(key) ?? [];
    categoryLabels.push(label);
    groups.set(key, categoryLabels);
    return groups;
  }, new Map());

  if (!labels.length) {
    return null;
  }

  const selectLabelIds = (select: HTMLSelectElement) => {
    onChange(nextPostLabelIds(labels, selectedLabelIds, select));
  };

  return (
    <dl className="">
      <dt>
        {t("label")}{" "}
        <Link
          to="/$ownerName/$projectName/issue/labelsform"
          params={{ ownerName, projectName }}
          activeProps={legacyRouteLocalActiveProps}
          target="_blank"
          className="label-edit"
        >
          [{t("button.edit")}]
        </Link>
      </dt>
      <dd>
        <div
          id="s2id_labelIds"
          className="select2-container select2-container-multi issue-labels bordered fullsize"
        >
          <ul className="select2-choices">
            <li className="select2-search-field">
              <input type="text" placeholder={t("label.select")} readOnly />
            </li>
          </ul>
        </div>
        <select
          id="labelIds"
          name="labelIds"
          multiple
          data-format="issuelabel"
          data-allow-clear="true"
          data-dropdown-css-class="issue-labels"
          data-container-css-class="issue-labels bordered fullsize"
          data-placeholder={t("label.select")}
          className="hide"
          value={selectedLabelIds}
          onChange={(event) => selectLabelIds(event.currentTarget)}
        >
          <option></option>
          {Array.from(labelsByCategory.entries()).map(([categoryKey, categoryLabels]) => {
            const [categoryId, categoryName, categoryIsExclusive] = categoryKey.split(":");
            return (
              <optgroup
                label={categoryName}
                data-category-id={categoryId}
                data-category-is-exclusive={categoryIsExclusive}
                key={categoryKey}
              >
                {categoryLabels.map((label) => (
                  <option
                    value={label.id}
                    data-category-id={label.categoryId}
                    data-category-is-exclusive={String(label.categoryIsExclusive)}
                    key={label.id}
                  >
                    {label.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </dd>
    </dl>
  );
}

function nextPostLabelIds(
  labels: BoardLabel[],
  selectedLabelIds: string[],
  select: HTMLSelectElement,
) {
  const previousSelection = new Set(selectedLabelIds);
  const optionSelection = new Set<string>();

  for (const option of select.options) {
    if (option.value && option.selected) {
      optionSelection.add(option.value);
    }
  }

  const addedLabelId = labels.find(
    (label) => optionSelection.has(label.id) && !previousSelection.has(label.id),
  )?.id;
  const addedLabel = addedLabelId ? labels.find((label) => label.id === addedLabelId) : undefined;
  const nextLabelIds: string[] = [];

  for (const label of labels) {
    if (!optionSelection.has(label.id)) {
      continue;
    }
    if (
      addedLabel?.categoryIsExclusive &&
      label.categoryId === addedLabel.categoryId &&
      label.id !== addedLabel.id
    ) {
      continue;
    }
    nextLabelIds.push(label.id);
  }

  return nextLabelIds;
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
  const { t } = useLegacyMessages();

  if (!labels.length) {
    return null;
  }

  return (
    <dl>
      <dt>{t("label")}</dt>
      <dd>
        {labels.map((label) => {
          const labelStyle = stylex.props(styles.labelBackground(label.color));
          return (
            <Link
              to="/$ownerName/$projectName/posts"
              params={{ ownerName, projectName }}
              search={{ labelIds: [label.id] }}
              activeProps={legacyRouteLocalActiveProps}
              {...labelStyle}
              className={`${labelStyle.className} label issue-label active static`}
              data-stylex-owner="post-detail-label-background"
              key={label.id}
            >
              {label.name}
            </Link>
          );
        })}
      </dd>
    </dl>
  );
}

function PostActionButtons({
  canDelete,
  canUpdate,
  editRoutePath,
  onDeleteClick,
  onEditClick,
  wrap = true,
}: {
  canDelete: boolean;
  canUpdate: boolean;
  editRoutePath: string;
  onDeleteClick: () => void;
  onEditClick: () => void;
  wrap?: boolean;
}) {
  const { t } = useLegacyMessages();
  const content = (
    <>
      {canUpdate ? (
        <button
          type="button"
          className={`${sx.postEditAction.className} icon btn-transparent-with-fontsize-lineheight`}
          data-stylex-owner="post-detail-post-edit-action"
          title={t("button.edit")}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onEditClick();
          }}
        >
          <i className="yobicon-edit-2"></i>
        </button>
      ) : (
        <Link to={editRoutePath} activeProps={legacyRouteLocalActiveProps}>
          <button
            type="button"
            className={`${sx.postEditAction.className} icon btn-transparent-with-fontsize-lineheight`}
            data-stylex-owner="post-detail-post-edit-action"
            title={t("button.show.original")}
          >
            <i className="yobicon-edit-2"></i>
          </button>
        </Link>
      )}
      {canDelete ? (
        <button
          type="button"
          className={`${sx.postDeleteAction.className} icon btn-transparent-with-fontsize-lineheight`}
          data-stylex-owner="post-detail-post-delete-action"
          title={t("button.delete")}
          onClick={(event) => {
            event.preventDefault();
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
  onCommentDeleteRequest: (commentId: string) => void;
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
    <div
      id="comments"
      className={`${sx.comments.className} board-comment-wrap`}
      data-stylex-owner="post-detail-comments"
    >
      <div id="timeline">
        <div className="timeline-list">
          <div
            {...sx.commentHeader}
            className={`${sx.commentHeader.className} comment-header`}
            data-stylex-owner="post-detail-comment-header"
          >
            <i
              {...sx.commentHeaderIcon}
              className={`${sx.commentHeaderIcon.className} yobicon-comments`}
              data-stylex-owner="post-detail-comment-header-icon"
            ></i>{" "}
            <strong>{t("common.comment")}</strong>{" "}
            <strong className="num">{post.comments.length}</strong>
          </div>
          <hr
            {...sx.commentDivider}
            className={`${sx.commentDivider.className} nm`}
            data-stylex-owner="post-detail-comment-divider"
          />
          <ul
            {...sx.commentList}
            className={`${sx.commentList.className} comments`}
            data-stylex-owner="post-detail-comment-list"
          >
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
                onCommentEditRequest={(commentId) =>
                  setEditingCommentId((currentCommentId) =>
                    currentCommentId === commentId ? null : commentId,
                  )
                }
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
  const { t } = useLegacyMessages();
  const [editorResetKey, setEditorResetKey] = useState(0);

  if (!canComment) {
    return (
      <div
        className="write-comment-box mt20"
        title={t("error.auth.unauthorized.comment")}
        data-login="required"
      >
        <div className="write-comment-wrap">
          <div className="textarea-box">
            <textarea
              className="comment disabled"
              disabled
              {...stylex.props(styles.disabledComment)}
              data-stylex-owner="post-detail-disabled-comment"
            ></textarea>
          </div>
          <div
            {...stylex.props(styles.disabledCommentActions)}
            className="mt10"
            data-stylex-owner="post-detail-disabled-comment-actions"
          >
            <span className="ybtn ybtn-disabled">{t("button.comment.new")}</span>
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
    setEditorResetKey((current) => current + 1);
  }

  return (
    <form
      className={sx.commentCreateForm.className}
      data-stylex-owner="post-detail-comment-create-form"
      id="comment-form"
      action={prefixBasePath(basePath, `/${ownerName}/${projectName}/post/${postNumber}/comments`)}
      method="post"
      encType="multipart/form-data"
      onSubmit={handleSubmit}
    >
      <div
        className={`${sx.commentCreateWriteBox.className} write-comment-box`}
        data-stylex-owner="post-detail-comment-create-write-box"
      >
        <MarkdownEditor
          editorMode="comment-body"
          key={editorResetKey}
          name="contents"
          value=""
          wrapId="contents"
        />
        <div
          className={`${sx.commentUploadWrap.className} upload-wrap content-footer`}
          data-resource-type="NONISSUE_COMMENT"
          data-stylex-owner="post-detail-comment-upload-wrap"
          id="upload"
        >
          <div
            className={`${sx.commentUploadAttachWrap.className} attach-wrap`}
            data-stylex-owner="post-detail-comment-upload-attach-wrap"
          >
            <span
              className={`${sx.commentUploadDroppable.className} help help-droppable`}
              data-stylex-owner="post-detail-comment-upload-droppable"
            >
              {t("common.attach.drophere")}
            </span>
            <div
              className={`${sx.commentUploadButtonWrap.className} btn-wrap`}
              data-stylex-owner="post-detail-comment-upload-button-wrap"
            >
              <div
                className={`${sx.commentUploadFileButton.className} nbtn medium white fake-file-wrap`}
                data-stylex-owner="post-detail-comment-upload-file-button"
              >
                <i className="yobicon-upload"></i> {t("button.upload")}
                <input
                  type="file"
                  className={`${sx.commentUploadFileInput.className} file`}
                  data-stylex-owner="post-detail-comment-upload-file-input"
                  name="filePath"
                  multiple
                />
              </div>
            </div>
            <span
              className={`${sx.commentUploadPlain.className} plain`}
              data-stylex-owner="post-detail-comment-upload-plain"
            >
              {t("common.attach.clickbutton")}
            </span>
            <span
              className={`${sx.commentUploadPastable.className} help help-pastable`}
              data-stylex-owner="post-detail-comment-upload-pastable"
            >
              {t("common.attach.pastehere")}
            </span>
          </div>
          <ul
            className={`${sx.commentUploadAttachedFiles.className} attached-files unstyled`}
            data-stylex-owner="post-detail-comment-upload-attached-files"
          ></ul>
          <p
            className={`${sx.commentUploadHelp.className} help`}
            data-stylex-owner="post-detail-comment-upload-help"
          >
            <i className="yobicon-supportrequest"></i> {t("common.attach.attachIfYouSave")}
          </p>
        </div>
        <div
          className={`${sx.commentCreateWriteWrap.className} write-comment-wrap`}
          data-stylex-owner="post-detail-comment-create-write-wrap"
        >
          <div
            className={`${sx.commentActions.className} right-txt`}
            data-stylex-owner="post-detail-comment-actions"
          >
            <button
              type="button"
              className={`${sx.commentCreateDynamicButton.className} ybtn hidden`}
              data-stylex-owner="post-detail-comment-create-dynamic-button"
              id="dynamic-comment-btn"
            ></button>
            <button
              type="submit"
              className={`${sx.commentCreateSubmitButton.className} ybtn ybtn-success`}
              data-stylex-owner="post-detail-comment-create-submit"
            >
              {t("button.comment.new")}
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
  onCommentDeleteRequest: (commentId: string) => void;
  onUpdateComment: (commentId: string, contentsMarkdown: string) => Promise<unknown>;
  ownerName: string;
  postNumber: string;
  projectName: string;
}) {
  const { language, t } = useLegacyMessages();
  const commentId = stringField(comment.id);
  const hash = useRouterState({ select: (state) => state.location.hash });
  const commentRef = useRef<HTMLLIElement>(null);
  const authorLoginId = stringField(comment.authorLoginId);
  const authorLabel = stringField(comment.authorLabel, authorLoginId);
  const avatarUrl = prefixBasePath(basePath, "/legacy-assets/images/default-avatar-128.png");
  const isEditing = editingCommentId === commentId;
  const viaEmail = booleanField(comment.viaEmail);
  const hasRouteOwnedOriginalMessage =
    viaEmail && splitOriginalMessageMarkdown(comment.contentsMarkdown) !== null;
  const [replyVisible, setReplyVisible] = useState(false);
  const [childFormOpen, setChildFormOpen] = useState(false);
  const commentMediaStyle = stylex.props(
    styles.commentMedia,
    hash === `comment-${commentId}` && styles.commentMediaTarget,
  );

  useEffect(() => {
    if (hash !== `comment-${commentId}`) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      commentRef.current?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [commentId, hash]);

  return (
    <li
      {...sx.commentRow}
      className={`${sx.commentRow.className} comment`}
      data-stylex-owner="post-detail-comment-row"
      id={`comment-${commentId}`}
      ref={commentRef}
      onMouseEnter={() => setReplyVisible(true)}
      onMouseLeave={() => {
        if (!childFormOpen) {
          setReplyVisible(false);
        }
      }}
    >
      {childComments.map((childComment) => (
        <div
          id={`comment-${stringField(childComment.id)}`}
          key={stringField(childComment.id)}
        ></div>
      ))}
      <div
        {...sx.commentAvatar}
        className={`${sx.commentAvatar.className} comment-avatar`}
        data-stylex-owner="post-detail-comment-avatar"
      >
        <Link
          to="/$user"
          params={{ user: authorLoginId }}
          search={LEGACY_EMPTY_PROFILE_SEARCH}
          activeProps={legacyRouteLocalActiveProps}
          {...sx.commentAvatarWrap}
          className={`${sx.commentAvatarWrap.className} avatar-wrap`}
          data-stylex-owner="post-detail-comment-avatar-wrap"
        >
          <img src={avatarUrl} width="32" height="32" alt={authorLoginId} />
        </Link>
      </div>
      <div
        {...commentMediaStyle}
        className={`${commentMediaStyle.className} media-body`}
        data-stylex-owner="post-detail-comment-media"
      >
        <div
          {...sx.commentMeta}
          className={`${sx.commentMeta.className} meta-info`}
          data-stylex-owner="post-detail-comment-meta"
        >
          <span
            {...sx.commentAuthor}
            className={`${sx.commentAuthor.className} comment_author`}
            data-stylex-owner="post-detail-comment-author"
          >
            <span
              {...sx.commentResponsiveAvatar}
              className={`${sx.commentResponsiveAvatar.className} resp-comment-avatar`}
              data-stylex-owner="post-detail-comment-responsive-avatar"
            >
              <Link
                to="/$user"
                params={{ user: authorLoginId }}
                search={LEGACY_EMPTY_PROFILE_SEARCH}
                activeProps={legacyRouteLocalActiveProps}
                {...sx.commentResponsiveAvatarWrap}
                className={`${sx.commentResponsiveAvatarWrap.className} avatar-wrap`}
                data-stylex-owner="post-detail-comment-responsive-avatar-wrap"
              >
                <img src={avatarUrl} width="32" height="32" alt={authorLabel} />
              </Link>
            </span>
            <Link
              to="/$user"
              params={{ user: authorLoginId }}
              search={LEGACY_EMPTY_PROFILE_SEARCH}
              activeProps={legacyRouteLocalActiveProps}
            >
              <strong>{authorLabel}</strong>
            </Link>
          </span>
          <span className="ago-date">
            <Link
              to="."
              hash={`comment-${commentId}`}
              activeOptions={{ includeHash: true }}
              activeProps={legacyRouteLocalActiveProps}
              {...sx.commentAgo}
              className={`${sx.commentAgo.className} ago`}
              data-stylex-owner="post-detail-comment-ago"
              title={comment.createdLabel}
            >
              {legacyRelativeDateLabel(comment.createdLabel, language)}
            </Link>
            <Link
              to="."
              hash={`comment-${commentId}`}
              activeOptions={{ includeHash: true }}
              activeProps={legacyRouteLocalActiveProps}
              className="share-link"
              {...stylex.props(styles.shareLinkHidden)}
              data-stylex-owner="post-detail-share-link"
            >
              [Link]
            </Link>
          </span>
          <span
            className={`${sx.commentActionRow.className} act-row`}
            data-stylex-owner="post-detail-comment-action-row"
          >
            {canUpdate ? (
              <button
                type="button"
                className={`${sx.commentEditAction.className} btn-transparent`}
                data-comment-id={commentId}
                data-stylex-owner="post-detail-comment-edit-action"
                title={t("common.comment.edit")}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCommentEditRequest(commentId);
                }}
              >
                <i
                  {...sx.commentEditIcon}
                  className={`${sx.commentEditIcon.className} yobicon-edit-2`}
                  data-stylex-owner="post-detail-comment-edit-icon"
                ></i>
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className={`${sx.commentDeleteAction.className} btn-transparent`}
                data-stylex-owner="post-detail-comment-delete-action"
                title={t("common.comment.delete")}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCommentDeleteRequest(commentId);
                }}
              >
                <i
                  {...sx.commentDeleteIcon}
                  className={`${sx.commentDeleteIcon.className} yobicon-trash`}
                  data-stylex-owner="post-detail-comment-delete-icon"
                ></i>
              </button>
            ) : null}
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
        <div
          id={`comment-body-${commentId}`}
          {...(isEditing ? stylex.props(styles.commentBodyHidden) : {})}
          data-stylex-owner="post-detail-comment-body"
        >
          <TasklistBar />
          <div
            {...sx.commentBody}
            className={`${sx.commentBody.className} comment-body markdown-wrap`}
            data-stylex-owner="post-detail-comment-body-content"
            data-via-email={String(viaEmail)}
            data-allowed-update={String(canUpdate)}
            data-yobi-original-message-processed={hasRouteOwnedOriginalMessage ? "true" : undefined}
          >
            <OriginalMessageMarkdown
              contentsMarkdown={comment.contentsMarkdown}
              viaEmail={viaEmail}
            />
          </div>
          <div className="attachments" data-attachments={JSON.stringify(comment.attachments ?? [])}>
            <AttachedFiles attachments={comment.attachments} />
          </div>
        </div>
      </div>
      <PostChildComments
        basePath={basePath}
        canComment={canComment}
        canDelete={canDelete}
        childComments={childComments}
        hideReplyPrompt={editingCommentId !== null}
        formOpen={childFormOpen}
        onCommentDeleteRequest={onCommentDeleteRequest}
        ownerName={ownerName}
        parentCommentId={commentId}
        postNumber={postNumber}
        projectName={projectName}
        replyVisible={replyVisible}
        toggleForm={() => {
          setChildFormOpen((current) => !current);
          setReplyVisible(true);
        }}
      />
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
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{originalMessage.visibleMarkdown}</ReactMarkdown>
      <button
        type="button"
        {...sx.originalMessageToggle}
        data-stylex-owner="post-detail-original-message-toggle"
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
    visibleMarkdown: lines.slice(0, delimiterIndex).join("\n").trimEnd(),
    hiddenMarkdown: lines.slice(delimiterIndex).join("\n").trim(),
  };
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
  const { t } = useLegacyMessages();
  const commentId = stringField(comment.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contents = new FormData(event.currentTarget).get("contents");
    await onUpdateComment(commentId, typeof contents === "string" ? contents : "");
  }

  const updateFormStyle = stylex.props(
    styles.commentUpdateForm,
    isEditing && styles.commentUpdateFormVisible,
  );
  const updateWriteBoxStyle = stylex.props(styles.commentUpdateWriteBox);
  const updateActionsStyle = stylex.props(styles.commentUpdateActions);
  const updateFileUploadStyle = stylex.props(styles.commentUpdateFileUpload);
  const updateFileUploadLabelStyle = stylex.props(
    styles.commentUpdateActionButton,
    styles.commentUpdateFileUploadLabel,
  );
  const updateFileUploadInputStyle = stylex.props(styles.commentUpdateFileUploadInput);
  const updateCancelButtonStyle = stylex.props(styles.commentUpdateActionButton);
  const updateSaveButtonStyle = stylex.props(
    styles.commentUpdateActionButton,
    styles.commentUpdateSaveButton,
  );
  const updateDropOverlayStyle = stylex.props(styles.commentUpdateDropOverlay);
  const updateDropMessageWrapStyle = stylex.props(styles.commentUpdateDropMessageWrap);
  const updateDropMessageStyle = stylex.props(styles.commentUpdateDropMessage);

  return (
    <div
      id={`comment-editform-${commentId}`}
      {...updateFormStyle}
      className={`${updateFormStyle.className} comment-update-form`}
      data-stylex-owner="post-detail-comment-editor"
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
        <div
          {...updateWriteBoxStyle}
          className={`${updateWriteBoxStyle.className} write-comment-box`}
          data-stylex-owner="post-detail-comment-update-write-box"
        >
          <div className="write-comment-wrap">
            <MarkdownEditor
              editorMode="update-comment-body"
              name="contents"
              value={comment.contentsMarkdown}
              wrapId={commentId}
            />
            <div
              {...updateDropOverlayStyle}
              className={`${updateDropOverlayStyle.className} upload-drop-here`}
              data-stylex-owner="post-detail-comment-update-drop-overlay"
            >
              <div
                {...updateDropMessageWrapStyle}
                className={`${updateDropMessageWrapStyle.className} msg-wrap`}
                data-stylex-owner="post-detail-comment-update-drop-message-wrap"
              >
                <div
                  {...updateDropMessageStyle}
                  className={`${updateDropMessageStyle.className} msg`}
                  data-stylex-owner="post-detail-comment-update-drop-message"
                >
                  {t("common.attach.dropFilesHere")}
                </div>
              </div>
            </div>
            <div
              {...updateActionsStyle}
              className={`${updateActionsStyle.className} comment-update-button upload-button-line`}
              data-stylex-owner="post-detail-comment-update-actions"
            >
              <span
                {...updateFileUploadStyle}
                className={`${updateFileUploadStyle.className} file-upload`}
                data-stylex-owner="post-detail-comment-update-file-upload"
              >
                <label
                  {...updateFileUploadLabelStyle}
                  htmlFor={`upload-${commentId}`}
                  className={`${updateFileUploadLabelStyle.className} file-upload__label ybtn`}
                  data-stylex-owner="post-detail-comment-update-file-upload-label"
                >
                  {t("button.upload")}
                </label>
                <input
                  {...updateFileUploadInputStyle}
                  id={`upload-${commentId}`}
                  className={`${updateFileUploadInputStyle.className} file-upload__input`}
                  data-stylex-owner="post-detail-comment-update-file-upload-input"
                  type="file"
                  name="filePath"
                  multiple
                />
              </span>
              <button
                {...updateCancelButtonStyle}
                type="button"
                className={`${updateCancelButtonStyle.className} ybtn ybtn-cancel`}
                data-stylex-owner="post-detail-comment-update-cancel"
                data-comment-id={commentId}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCancel();
                }}
              >
                {t("button.cancel")}
              </button>
              {canUpdate ? (
                <button
                  {...updateSaveButtonStyle}
                  type="submit"
                  className={`${updateSaveButtonStyle.className} ybtn ybtn-info`}
                  data-stylex-owner="post-detail-comment-update-save"
                >
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
            <CommentEditAttachmentFiles attachments={comment.attachments} />
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
  hideReplyPrompt,
  formOpen,
  onCommentDeleteRequest,
  ownerName,
  parentCommentId,
  postNumber,
  projectName,
  replyVisible,
  toggleForm,
}: {
  basePath: string;
  canComment: boolean;
  canDelete: boolean;
  childComments: BoardPostComment[];
  hideReplyPrompt: boolean;
  formOpen: boolean;
  onCommentDeleteRequest: (commentId: string) => void;
  ownerName: string;
  parentCommentId: string;
  postNumber: string;
  projectName: string;
  replyVisible: boolean;
  toggleForm: () => void;
}) {
  const { t } = useLegacyMessages();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!childComments.length && !canComment) {
    return null;
  }

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={`${
          stylex.props(
            styles.childCommentReply,
            replyVisible && !hideReplyPrompt
              ? styles.childCommentReplyVisible
              : styles.childCommentReplyHidden,
          ).className
        } add-a-comment`}
        data-stylex-owner="post-detail-child-comment-reply"
        onClick={() => {
          toggleForm();
          if (!formOpen) {
            requestAnimationFrame(() => textareaRef.current?.focus());
          }
        }}
      >
        {t("comment.oneline.comment.placeholder")}
      </div>
      <div className="subcomment-media-body">
        <div className="child-comments">
          {childComments.map((comment) => (
            <PostChildComment
              canDelete={canDelete}
              comment={comment}
              key={stringField(comment.id)}
              onCommentDeleteRequest={onCommentDeleteRequest}
            />
          ))}
        </div>
        {canComment ? (
          <div
            className={
              formOpen
                ? `${stylex.props(styles.childCommentFormVisible).className} child-comment-input-form`
                : "child-comment-input-form"
            }
          >
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
                  ref={textareaRef}
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
                <span className="notification-receiver-title">
                  {t("notification.receiver.list.title")}{" "}
                </span>
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
  canDelete,
  comment,
  onCommentDeleteRequest,
}: {
  canDelete: boolean;
  comment: BoardPostComment;
  onCommentDeleteRequest: (commentId: string) => void;
}) {
  const { t } = useLegacyMessages();
  const commentId = stringField(comment.id);
  const authorLoginId = stringField(comment.authorLoginId);
  const authorLabel = stringField(comment.authorLabel, authorLoginId);
  return (
    <div className="one-line-comment">
      <div className="contents">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.contentsMarkdown}</ReactMarkdown>
        <span className="subcomment-author hide">
          -{" "}
          <Link
            to="/$user"
            params={{ user: authorLoginId }}
            search={LEGACY_EMPTY_PROFILE_SEARCH}
            className="usf-group"
            activeOptions={{ exact: true }}
            activeProps={legacyRouteLocalActiveProps}
          >
            <strong>{authorLabel}</strong>
          </Link>{" "}
          <Link
            to="."
            hash={`comment-${commentId}`}
            activeOptions={{ includeHash: true }}
            activeProps={legacyRouteLocalActiveProps}
            className="ago"
            title={comment.createdLabel}
          >
            {comment.createdLabel}
          </Link>
          {canDelete ? (
            <button
              type="button"
              className="btn-transparent deleteButtonX"
              title={t("common.comment.delete")}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onCommentDeleteRequest(commentId);
              }}
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
  const { t } = useLegacyMessages();
  const [activeMode, setActiveMode] = useState<"edit" | "preview">("edit");
  const [editorValue, setEditorValue] = useState(value);

  const selectMode = (mode: "edit" | "preview", event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveMode(mode);
  };
  const editPaneStyle = stylex.props(
    styles.editorPane,
    activeMode === "edit" && styles.editorPaneActive,
  );
  const previewPaneStyle = stylex.props(
    styles.editorPane,
    activeMode === "preview" && styles.editorPaneActive,
  );
  const isCommentUpdateEditor = editorMode === "update-comment-body";
  const isCommentCreateEditor = editorMode === "comment-body";
  const updateTextareaBoxStyle =
    editorMode === "update-comment-body"
      ? stylex.props(styles.commentUpdateTextareaBox)
      : undefined;
  const updateTextareaStyle =
    editorMode === "update-comment-body"
      ? stylex.props(styles.commentUpdateTextareaControl)
      : undefined;
  const createTextareaBoxStyle = isCommentCreateEditor
    ? stylex.props(styles.commentCreateTextareaBox)
    : undefined;
  const createTextareaStyle = isCommentCreateEditor
    ? stylex.props(styles.commentCreateTextareaControl)
    : undefined;
  const editorNavStyle =
    isCommentUpdateEditor || isCommentCreateEditor
      ? stylex.props(styles.commentUpdateEditorNav)
      : undefined;
  const editorNavItemStyle =
    isCommentUpdateEditor || isCommentCreateEditor
      ? stylex.props(styles.commentUpdateEditorNavItem)
      : undefined;
  const editorTabStyle = (mode: "edit" | "preview") =>
    isCommentUpdateEditor || isCommentCreateEditor
      ? stylex.props(
          styles.commentUpdateEditorTabLink,
          activeMode === mode && styles.commentUpdateEditorTabLinkActive,
        )
      : undefined;
  const createEditorNavItemOwner = isCommentCreateEditor
    ? "post-detail-comment-create-editor-nav-item"
    : undefined;
  const createEditorTabOwner = (mode: "edit" | "preview") =>
    isCommentCreateEditor
      ? activeMode === mode
        ? "post-detail-comment-create-editor-tab-active"
        : "post-detail-comment-create-editor-tab"
      : undefined;
  const checklistWrapStyle =
    isCommentUpdateEditor || isCommentCreateEditor
      ? stylex.props(styles.commentUpdateChecklistWrap)
      : undefined;
  const checklistButtonStyle =
    isCommentUpdateEditor || isCommentCreateEditor
      ? stylex.props(styles.commentUpdateActionButton, styles.commentUpdateChecklistButton)
      : undefined;
  const checklistIconStyle =
    isCommentUpdateEditor || isCommentCreateEditor
      ? stylex.props(styles.commentUpdateChecklistIcon)
      : undefined;
  const clearTemporaryStyle = isCommentUpdateEditor
    ? stylex.props(styles.commentUpdateClearTemporary)
    : isCommentCreateEditor
      ? stylex.props(styles.commentCreateClearTemporary)
      : undefined;
  const createEditorNoticeLabelStyle = isCommentCreateEditor
    ? stylex.props(styles.commentCreateEditorNoticeLabel)
    : undefined;

  return (
    <div className="mt10">
      <ul
        {...editorNavStyle}
        className={`${editorNavStyle?.className ?? ""} nav nav-tabs nm small`.trim()}
        data-stylex-owner={
          isCommentUpdateEditor
            ? "post-detail-comment-update-editor-nav"
            : isCommentCreateEditor
              ? "post-detail-comment-create-editor-nav"
              : undefined
        }
      >
        <li
          {...editorNavItemStyle}
          className={`${editorNavItemStyle?.className ?? ""}${activeMode === "edit" ? " active" : ""}`.trim()}
          data-stylex-owner={
            isCommentUpdateEditor
              ? "post-detail-comment-update-editor-nav-item"
              : createEditorNavItemOwner
          }
        >
          <Link
            {...editorTabStyle("edit")}
            to="."
            hash={`edit-${wrapId}`}
            data-stylex-owner={
              isCommentUpdateEditor
                ? activeMode === "edit"
                  ? "post-detail-comment-update-editor-tab-active"
                  : "post-detail-comment-update-editor-tab"
                : createEditorTabOwner("edit")
            }
            onClick={(event) => selectMode("edit", event)}
          >
            {t("common.editor.edit")}
          </Link>
        </li>
        <li
          {...editorNavItemStyle}
          className={`${editorNavItemStyle?.className ?? ""}${activeMode === "preview" ? " active" : ""}`.trim()}
          data-stylex-owner={
            isCommentUpdateEditor
              ? "post-detail-comment-update-editor-nav-item"
              : createEditorNavItemOwner
          }
        >
          <Link
            {...editorTabStyle("preview")}
            to="."
            hash={`preview-${wrapId}`}
            data-stylex-owner={
              isCommentUpdateEditor
                ? activeMode === "preview"
                  ? "post-detail-comment-update-editor-tab-active"
                  : "post-detail-comment-update-editor-tab"
                : createEditorTabOwner("preview")
            }
            onClick={(event) => selectMode("preview", event)}
          >
            {t("common.editor.preview")}
          </Link>
        </li>
        <li
          {...editorNavItemStyle}
          data-stylex-owner={
            isCommentUpdateEditor
              ? "post-detail-comment-update-editor-nav-item"
              : createEditorNavItemOwner
          }
        >
          <div
            {...checklistWrapStyle}
            className={`${checklistWrapStyle?.className ?? ""} task-list-button`.trim()}
            data-stylex-owner={
              isCommentUpdateEditor
                ? "post-detail-comment-update-checklist-wrap"
                : isCommentCreateEditor
                  ? "post-detail-comment-create-checklist-wrap"
                  : undefined
            }
          >
            <button
              {...checklistButtonStyle}
              type="button"
              className={`${checklistButtonStyle?.className ?? ""} add-task-list-button ybtn ybtn-small ybtn-danger-no-outline`.trim()}
              data-stylex-owner={
                isCommentUpdateEditor
                  ? "post-detail-comment-update-checklist-button"
                  : isCommentCreateEditor
                    ? "post-detail-comment-create-checklist-button"
                    : undefined
              }
            >
              <i
                {...checklistIconStyle}
                className={`${checklistIconStyle?.className ?? ""} yobicon-list task-list-icon`.trim()}
                data-stylex-owner={
                  isCommentUpdateEditor
                    ? "post-detail-comment-update-checklist-icon"
                    : isCommentCreateEditor
                      ? "post-detail-comment-create-checklist-icon"
                      : undefined
                }
              ></i>{" "}
              {t("button.add.checklist")}
            </button>
          </div>
        </li>
        <li
          {...editorNavItemStyle}
          data-stylex-owner={
            isCommentUpdateEditor
              ? "post-detail-comment-update-editor-nav-item"
              : createEditorNavItemOwner
          }
        >
          <div
            {...clearTemporaryStyle}
            className={`${clearTemporaryStyle?.className ?? ""} editor-clear-temporary`.trim()}
            data-stylex-owner={
              isCommentUpdateEditor
                ? "post-detail-comment-update-clear-temporary"
                : isCommentCreateEditor
                  ? "post-detail-comment-create-clear-temporary"
                  : undefined
            }
          >
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
        <li
          {...editorNavItemStyle}
          data-stylex-owner={
            isCommentUpdateEditor
              ? "post-detail-comment-update-editor-nav-item"
              : createEditorNavItemOwner
          }
        >
          <div
            {...createEditorNoticeLabelStyle}
            className={`${createEditorNoticeLabelStyle?.className ?? ""} editor-notice-label`.trim()}
            data-stylex-owner={
              isCommentCreateEditor ? "post-detail-comment-create-editor-notice-label" : undefined
            }
          ></div>
        </li>
      </ul>
      <div
        {...sx.editorTabContent}
        className={`${sx.editorTabContent.className} tab-content`}
        data-stylex-owner="post-detail-editor-tab-content"
      >
        <PostDetailMarkdownHelp />
        <div
          {...editPaneStyle}
          id={`edit-${wrapId}`}
          className={`${editPaneStyle.className} tab-pane${activeMode === "edit" ? " active" : ""}`}
          data-stylex-owner="post-detail-editor-pane"
        >
          <div
            {...updateTextareaBoxStyle}
            {...createTextareaBoxStyle}
            className={`${updateTextareaBoxStyle?.className ?? createTextareaBoxStyle?.className ?? ""} textarea-box`.trim()}
            data-stylex-owner={
              editorMode === "update-comment-body"
                ? "post-detail-comment-update-textarea-box"
                : isCommentCreateEditor
                  ? "post-detail-comment-create-textarea-box"
                  : undefined
            }
          >
            <textarea
              {...updateTextareaStyle}
              {...createTextareaStyle}
              name={name}
              className={`${updateTextareaStyle?.className ?? createTextareaStyle?.className ?? ""} editorSeries content comment nm`.trim()}
              data-stylex-owner={
                editorMode === "update-comment-body"
                  ? "post-detail-comment-update-textarea"
                  : isCommentCreateEditor
                    ? "post-detail-comment-create-textarea"
                    : undefined
              }
              data-editor-mode={editorMode}
              {...{ markdown: "true" }}
              id={`editor-${name}-${wrapId}`}
              value={editorValue}
              onChange={(event) => setEditorValue(event.currentTarget.value)}
            ></textarea>
          </div>
        </div>
        <div
          {...previewPaneStyle}
          id={`preview-${wrapId}`}
          className={`${previewPaneStyle.className} tab-pane${activeMode === "preview" ? " active" : ""}`}
          data-stylex-owner="post-detail-editor-pane"
        >
          <div className={`markdown-preview markdown-wrap ${editorMode}`} data-via-email="false">
            {activeMode === "preview" ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{editorValue}</ReactMarkdown>
            ) : null}
          </div>
        </div>
        <div className="notification-receiver">
          <span className="notification-receiver-title">
            {t("notification.receiver.list.title")}{" "}
          </span>
          <span className="notification-receiver-list"></span>
        </div>
      </div>
    </div>
  );
}

function PostDetailMarkdownHelp() {
  const markdownHelp = LegacyMarkdownHelp();
  if (!isValidElement<{ children?: ReactNode }>(markdownHelp)) return markdownHelp;

  const [nav, ...content] = Children.toArray(markdownHelp.props.children);
  if (!isValidElement<{ children?: ReactNode }>(nav)) return markdownHelp;

  const spacedNavItems = Children.toArray(nav.props.children).flatMap((item) => [item, " "]);
  return cloneElement(
    markdownHelp,
    undefined,
    cloneElement(nav, undefined, spacedNavItems),
    content,
  );
}

function AttachedFiles({ attachments }: { attachments: BoardAttachment[] }) {
  if (!attachments.length) {
    return null;
  }

  return (
    <ul className="attaches wm">
      {attachments.map((file) => {
        const id = stringField(file.id);
        const name = stringField(file.name);
        const mimeType = stringField(file.mimeType);
        const size = String(file.size);

        return (
          <li
            className="attached-file"
            data-name={name}
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
    </ul>
  );
}

function CommentEditAttachmentFiles({ attachments }: { attachments: BoardAttachment[] }) {
  return (
    <>
      {attachments.map((file) => {
        const id = stringField(file.id);
        const name = stringField(file.name);
        const mimeType = stringField(file.mimeType);
        const size = String(file.size);

        return (
          <div
            className="attached-file attached-file-marker"
            data-name={name}
            data-mime={mimeType}
            key={id}
          >
            <i className="mimetype"></i>
            <strong className="name">{name}</strong>
            <span className="size">{size}</span>
            <button type="button" className="btn-transparent btn-delete">
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
    <div className={`${sx.tasklist.className} tasklist`} data-stylex-owner="post-detail-tasklist">
      <div
        className={`${stylex.props(styles.taskTitle).className} task-title`}
        data-stylex-owner="post-detail-task-title"
      >
        Tasks
        <span
          className={`${stylex.props(styles.taskDoneCounter).className} done-counter`}
          data-stylex-owner="post-detail-task-done-counter"
        ></span>
      </div>
      <div
        className={`${stylex.props(styles.taskProgress).className} task-progress`}
        data-stylex-owner="post-detail-task-progress"
      >
        <div
          className={`${stylex.props(styles.taskProgressBar).className} ${sx.tasklistProgress.className} bar red`}
          data-stylex-owner="post-detail-tasklist-progress"
          title="Tasklist"
        ></div>
      </div>
    </div>
  );
}

function BoardDetailKeymap({
  onClose,
  onOpen,
  open,
}: {
  onClose: () => void;
  onOpen: () => void;
  open: boolean;
}) {
  const { t } = useLegacyMessages();
  return (
    <div
      {...sx.keymapWrapper}
      className={sx.keymapWrapper.className}
      data-stylex-owner="post-detail-keymap-wrapper"
    >
      <button
        type="button"
        className="ybtn ybtn-inverse ybtn-mini"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpen();
        }}
      >
        {t("title.keymap")}
      </button>
      <div
        id="helpKeys"
        className={`modal ${open ? "in " : "hide "}fade keymap-help`}
        {...(open ? stylex.props(styles.keymapModalVisible) : {})}
        data-stylex-owner="post-detail-keymap-modal"
        tabIndex={-1}
        role="dialog"
        aria-hidden={open ? "false" : undefined}
        onKeyUp={(event) => {
          closeModalOnEscape(event, onClose);
        }}
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
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
          >
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

function closeModalOnEscape(event: ReactKeyboardEvent<HTMLElement>, onClose: () => void) {
  if (event.key !== "Escape") {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  onClose();
}

function ctrlKey() {
  return navigator.platform.toLowerCase().includes("mac") ? "⌘" : "CTRL";
}

function siteSearchKeys() {
  return navigator.platform.toLowerCase().includes("mac") ? ["CTRL", "ALT", "S"] : ["ALT", "S"];
}

function restApiErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function legacyRelativeDateLabel(rawLabel: string, language: string, now = Date.now()) {
  if (language !== "ko-KR" || rawLabel === "") return rawLabel;
  const timestamp = Date.parse(rawLabel);
  if (Number.isNaN(timestamp)) return rawLabel;
  const elapsedSeconds = Math.floor((now - timestamp) / 1000);
  if (elapsedSeconds < 0) return rawLabel;
  if (elapsedSeconds < 60) return "방금 전";
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}분 전`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)}시간 전`;
  if (elapsedSeconds < 2592000) return `${Math.floor(elapsedSeconds / 86400)}일 전`;
  return rawLabel;
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function booleanField(value: unknown) {
  return value === true;
}

function projectMenuEnabled(project: ProjectContainer, key: string) {
  const menuSetting = (project as Record<string, unknown>).menuSetting;
  return !menuSetting || typeof menuSetting !== "object"
    ? true
    : (menuSetting as Record<string, unknown>)[key] !== false;
}
