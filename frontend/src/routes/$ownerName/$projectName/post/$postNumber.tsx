import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import {
  Fragment,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  use,
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
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { LegacyMarkdownHelp } from "../../../-legacy-markdown-help";
import { ProjectHeader, ProjectMenu, ProjectNestedShellContext } from "../../$projectName";

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
  const { runtimeConfig } = Route.useRouteContext();
  const { postNumber } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const nestedProjectShell = use(ProjectNestedShellContext);

  if (nestedProjectShell && pathname.endsWith(`/post/${postNumber}/editform`)) {
    return <Outlet />;
  }

  if (nestedProjectShell) {
    return <ProjectPostDetailShell nestedProjectShell runtimeConfig={runtimeConfig} />;
  }

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectPostDetailShell nestedProjectShell={false} runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectPostDetailShell({
  nestedProjectShell,
  runtimeConfig,
}: {
  nestedProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, postNumber, projectName } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isEditChildRoute = pathname.endsWith(`/post/${postNumber}/editform`);
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const postQuery = useQuery({
    ...readProjectPostQueryOptions(runtimeConfig, { ownerName, postNumber, projectName }),
    enabled: !nestedProjectShell,
    retry(failureCount, error) {
      return restApiErrorStatus(error) !== 404 && failureCount < 3;
    },
  });

  if (isEditChildRoute && restApiErrorStatus(postQuery.error) === 404) {
    return (
      <SiteLayoutShell runtimeConfig={runtimeConfig}>
        <ProjectPostEditNotFoundTitle />
        <ProjectPostEditNotFoundBody />
      </SiteLayoutShell>
    );
  }

  if (!projectQuery.data) {
    return null;
  }

  if (nestedProjectShell) {
    return (
      <ProjectPostDetailScreen
        nestedProjectShell
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
    );
  }

  const projectSearchScope = {
    organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
    ownerName,
    projectName,
  };

  return (
    <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
      <ProjectPostDetailScreen
        nestedProjectShell={false}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </SiteLayoutShell>
  );
}

function ProjectPostDetailScreen({
  nestedProjectShell,
  project,
  runtimeConfig,
}: {
  nestedProjectShell: boolean;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, postNumber, projectName } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isEditChildRoute = pathname.endsWith(`/post/${postNumber}/editform`);
  const postQuery = useQuery({
    ...readProjectPostQueryOptions(runtimeConfig, { ownerName, postNumber, projectName }),
    retry(failureCount, error) {
      return restApiErrorStatus(error) !== 404 && failureCount < 3;
    },
  });

  if (!isEditChildRoute && restApiErrorStatus(postQuery.error) === 404) {
    return (
      <>
        <ProjectPostNotFoundTitle ownerName={ownerName} projectName={projectName} />
        {nestedProjectShell ? null : (
          <>
            <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
            <ProjectMenu active="board" basePath={runtimeConfig.basePath} project={project} />
          </>
        )}
        <ProjectPostNotFoundBody ownerName={ownerName} projectName={projectName} />
      </>
    );
  }

  if (!postQuery.data) {
    return null;
  }

  return (
    <>
      {!isEditChildRoute ? (
        <ProjectPostDetailTitle postTitle={stringField(postQuery.data.title)} />
      ) : null}
      {nestedProjectShell ? null : (
        <>
          <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
          <ProjectMenu active="board" basePath={runtimeConfig.basePath} project={project} />
        </>
      )}
      {isEditChildRoute ? (
        <Outlet />
      ) : (
        <ProjectPostDetailBody
          post={postQuery.data}
          project={project}
          runtimeConfig={runtimeConfig}
        />
      )}
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
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="error-wrap">
          <i className="ico ico-err2"></i>
          <p>{t("error.notfound.board_post")}</p>
          <Link
            to="/$ownerName/$projectName/posts"
            params={{ ownerName, projectName }}
            className="ybtn ybtn-primary"
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
  const canCreate = booleanField(post.permissions.canCreate);
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
      <div className="project-page-wrap board-view">
        <div className="board-header issue">
          <div className="pull-right mr10 mt10 hide-in-mobile">
            <div className="date" title={post.createdLabel}>
              {legacyRelativeDateLabel(post.createdLabel, language)}
            </div>
          </div>
          <div className="title">
            <strong className="board-id">#{postNumber}</strong> {post.title}
            <div className="pull-right hide show-in-mobile" style={{ fontSize: "0.7em" }}>
              <span className="date" title={post.createdLabel}>
                {legacyRelativeDateLabel(post.createdLabel, language)}
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
              <AttachedFiles attachments={post.attachments} />
            </div>
            <div className="board-actrow right-txt">
              <div className="pull-left">
                <div>
                  {canWatch ? (
                    <button
                      id="watch-button"
                      type="button"
                      className={`ybtn ${post.isWatching ? "ybtn-watching" : ""}`}
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
            <div className="issue-info board-labels">
              <dl>
                {canCreate ? (
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
              <div className="right-menu-icons">
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

        <div className="board-footer">
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
        style={deleteModalOpen ? { display: "block" } : undefined}
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
        className={`modal ${open ? "in" : "hide"}`}
        style={open ? { display: "block" } : undefined}
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
  return (
    <>
      <div
        id="comment-delete-modal"
        className={`modal ${open ? "in " : "hide "}fade`}
        style={open ? { display: "block" } : undefined}
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
          to="/$ownerName/$projectName/issue/labelsform" params={{ ownerName, projectName }}
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
        {labels.map((label) => (
          <Link
            to="/$ownerName/$projectName/posts"
            params={{ ownerName, projectName }}
            search={{ labelIds: [label.id] }}
            activeProps={legacyRouteLocalActiveProps}
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
          className="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"
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
            <textarea className="comment disabled" disabled style={{ cursor: "text" }}></textarea>
          </div>
          <div className="right-txt mt10">
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
      id="comment-form"
      action={prefixBasePath(basePath, `/${ownerName}/${projectName}/post/${postNumber}/comments`)}
      method="post"
      encType="multipart/form-data"
      onSubmit={handleSubmit}
    >
      <div className="write-comment-box">
        <MarkdownEditor
          editorMode="comment-body"
          key={editorResetKey}
          name="contents"
          value=""
          wrapId="contents"
        />
        <div
          className="upload-wrap content-footer"
          data-resource-type="NONISSUE_COMMENT"
          id="upload"
        >
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
  const authorLoginId = stringField(comment.authorLoginId);
  const authorLabel = stringField(comment.authorLabel, authorLoginId);
  const avatarUrl = prefixBasePath(basePath, "/legacy-assets/images/default-avatar-128.png");
  const isEditing = editingCommentId === commentId;
  const viaEmail = booleanField(comment.viaEmail);
  const hasRouteOwnedOriginalMessage =
    viaEmail && splitOriginalMessageMarkdown(comment.contentsMarkdown) !== null;

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
          search={LEGACY_EMPTY_PROFILE_SEARCH}
          activeProps={legacyRouteLocalActiveProps}
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
                search={LEGACY_EMPTY_PROFILE_SEARCH}
                activeProps={legacyRouteLocalActiveProps}
                className={"avatar-wrap"}
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
              className="ago"
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
            {canDelete ? (
              <button
                type="button"
                className="btn-transparent ml6"
                title={t("common.comment.delete")}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCommentDeleteRequest(commentId);
                }}
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
        onCommentDeleteRequest={onCommentDeleteRequest}
        ownerName={ownerName}
        parentCommentId={commentId}
        postNumber={postNumber}
        projectName={projectName}
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
                <div className="msg">{t("common.attach.dropFilesHere")}</div>
              </div>
            </div>
            <div className="right-txt comment-update-button upload-button-line">
              <span className="file-upload">
                <label htmlFor={`upload-${commentId}`} className="file-upload__label ybtn">
                  {t("button.upload")}
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
                {t("button.cancel")}
              </button>
              {canUpdate ? (
                <button type="submit" className="ybtn ybtn-info">
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
  hideReplyPrompt: boolean;
  onCommentDeleteRequest: (commentId: string) => void;
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
      <div className="add-a-comment pull-right" hidden={hideReplyPrompt}>
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

  return (
    <div className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className={activeMode === "edit" ? "active" : undefined}>
          <Link to="." hash={`edit-${wrapId}`} onClick={(event) => selectMode("edit", event)}>
            {t("common.editor.edit")}
          </Link>
        </li>
        <li className={activeMode === "preview" ? "active" : undefined}>
          <Link to="." hash={`preview-${wrapId}`} onClick={(event) => selectMode("preview", event)}>
            {t("common.editor.preview")}
          </Link>
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
        <div id={`edit-${wrapId}`} className={`tab-pane${activeMode === "edit" ? " active" : ""}`}>
          <div className="textarea-box">
            <textarea
              name={name}
              className="editorSeries content comment nm"
              data-editor-mode={editorMode}
              {...{ markdown: "true" }}
              id={`editor-${name}-${wrapId}`}
              value={editorValue}
              onChange={(event) => setEditorValue(event.currentTarget.value)}
            ></textarea>
          </div>
        </div>
        <div
          id={`preview-${wrapId}`}
          className={`tab-pane${activeMode === "preview" ? " active" : ""}`}
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
    <div className="pull-left" style={{ padding: "10px 0px", marginLeft: 55 }}>
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
        style={open ? { display: "block" } : undefined}
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

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return booleanField(project.isProtected) ? ownerName : undefined;
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
