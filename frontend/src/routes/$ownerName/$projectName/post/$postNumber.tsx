import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  use,
  useState,
} from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { type Options as RehypeSanitizeOptions } from "rehype-sanitize";
import { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

// Post body/history markdown carries legacy HTML (history-made-by diff wraps,
// video/iframe embeds) — legacy Markdown.render sanitizes and emits the HTML.
// Reuse the issue-detail sanitize contract so issue/post history parity holds.
const POST_LEGACY_GLOBAL_MARKDOWN_ATTRIBUTES: Record<string, true> = {
  className: true,
  height: true,
  id: true,
  width: true,
};
const POST_MARKDOWN_BASE_ATTRIBUTES = Object.fromEntries(
  Object.entries(defaultSchema.attributes ?? {}).map(([tagName, attributes]) => [
    tagName,
    attributes.filter(
      (attribute) =>
        !Array.isArray(attribute) ||
        !(String(attribute[0]) in POST_LEGACY_GLOBAL_MARKDOWN_ATTRIBUTES),
    ),
  ]),
) as NonNullable<RehypeSanitizeOptions["attributes"]>;
const POST_MARKDOWN_SANITIZE_SCHEMA: RehypeSanitizeOptions = {
  ...defaultSchema,
  clobber: [],
  attributes: {
    ...POST_MARKDOWN_BASE_ATTRIBUTES,
    "*": [...(POST_MARKDOWN_BASE_ATTRIBUTES["*"] ?? []), "className", "id", "width", "height"],
    a: [...(POST_MARKDOWN_BASE_ATTRIBUTES.a ?? []), "href", "name", "target"],
    iframe: [
      ...(POST_MARKDOWN_BASE_ATTRIBUTES.iframe ?? []),
      "width",
      "height",
      "src",
      "frameBorder",
      "allow",
      "allowFullScreen",
    ],
    input: [...(POST_MARKDOWN_BASE_ATTRIBUTES.input ?? []), "type", "disabled", "checked"],
    ol: [...(POST_MARKDOWN_BASE_ATTRIBUTES.ol ?? []), "start"],
    source: [...(POST_MARKDOWN_BASE_ATTRIBUTES.source ?? []), "src", "type"],
    video: [
      ...(POST_MARKDOWN_BASE_ATTRIBUTES.video ?? []),
      "dataSetup",
      "controls",
      "preload",
      "type",
      "autoPlay",
      "height",
      "width",
      "src",
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto", "file", "zpl"],
    src: ["http", "https", "file", "zpl"],
  },
  tagNames: [
    ...new Set([
      ...(defaultSchema.tagNames ?? []),
      "video",
      "source",
      "iframe",
      "input",
      "pre",
      "br",
      "hr",
      "ol",
      "span",
    ]),
  ],
};
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
import type { CommitReferenceMetadata } from "../../../../api/issue-meta";
import { useLegacyMessages } from "../../../../i18n";
import { useWireframeContentProgress } from "../../../../components/route-fetch-lock";
import { MarkdownCodeBlock } from "../../../../components/markdown-code-block";
import { MarkdownEditor, type MarkdownEditorProps } from "../../../../components/markdown-editor";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { ProjectNestedShellContext } from "../../$projectName";
import { LegacyMarkdownHelp } from "../../../-legacy-markdown-help";

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
  const nestedProjectShell = use(ProjectNestedShellContext);
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  useWireframeContentProgress([
    ["api", "v1", "owners", ownerName, "projects", projectName, "posts"],
  ]);
  const postQuery = useQuery({
    ...readProjectPostQueryOptions(runtimeConfig, { ownerName, postNumber, projectName }),
    retry(failureCount, error) {
      return restApiErrorStatus(error) !== 404 && failureCount < 3;
    },
  });

  if (!projectQuery.data) {
    if (nestedProjectShell) {
      return null;
    }
    const projectSearchScope = { ownerName, projectName };
    return (
      <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
        {null}
      </SiteLayoutShell>
    );
  }

  const projectSearchScope = {
    organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
    ownerName,
    projectName,
  };

  return (
    <ProjectPostDetailScreen
      project={projectQuery.data}
      projectSearchScope={projectSearchScope}
      runtimeConfig={runtimeConfig}
    />
  );
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  return (
    project.organizationName ||
    (stringField(project.projectScope, "").toUpperCase() === "PROTECTED" ? ownerName : undefined)
  );
}

function ProjectPostDetailScreen({
  project,
  projectSearchScope,
  runtimeConfig,
}: {
  project: ProjectContainer;
  projectSearchScope: { organizationName?: string; ownerName: string; projectName: string };
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, postNumber, projectName } = Route.useParams();
  const nestedProjectShell = use(ProjectNestedShellContext);
  const postQuery = useQuery({
    ...readProjectPostQueryOptions(runtimeConfig, { ownerName, postNumber, projectName }),
    retry(failureCount, error) {
      return restApiErrorStatus(error) !== 404 && failureCount < 3;
    },
  });

  if (restApiErrorStatus(postQuery.error) === 404) {
    const notFoundContent = (
      <>
        <ProjectPostNotFoundTitle ownerName={ownerName} projectName={projectName} />
        <ProjectPostNotFoundBody ownerName={ownerName} projectName={projectName} />
      </>
    );
    if (nestedProjectShell) {
      return notFoundContent;
    }
    return (
      <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
        {notFoundContent}
      </SiteLayoutShell>
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
    <div data-owner="post-detail-page">
      <div className="project-page-wrap">
        <div className="error-wrap" data-owner="post-detail-error-wrap">
          <i className="ico ico-err2" data-owner="post-detail-error-icon"></i>
          <p data-owner="post-detail-error-message">{t("error.notfound.board_post")}</p>
          <Link
            to="/$ownerName/$projectName/posts"
            params={{ ownerName, projectName }}
            className="ybtn ybtn-primary"
            data-owner="post-detail-error-list"
          >
            {t("button.list")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ProjectPostEditNotFoundTitle() {
  const { t } = useLegacyMessages();

  return <title>{t("error.internalServerError")}</title>;
}

export function ProjectPostEditNotFoundBody() {
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
      <div className="project-page-wrap board-view" data-owner="post-detail-shell">
        <div className="board-header issue" data-owner="post-detail-header">
          <div data-owner="post-detail-desktop-metadata">
            <div className="date" data-owner="post-detail-date" title={post.createdLabel}>
              {legacyRelativeDateLabel(post.createdLabel, language)}
            </div>
          </div>
          <div className="title" data-owner="post-detail-title">
            <strong className="board-id" data-owner="post-detail-board-id">
              #{postNumber}
            </strong>{" "}
            {post.title}
            <div data-owner="post-detail-mobile-metadata">
              <span className="date" data-owner="post-detail-date" title={post.createdLabel}>
                {legacyRelativeDateLabel(post.createdLabel, language)}
              </span>
            </div>
          </div>
        </div>

        <div className="board-body row-fluid" data-owner="post-detail-body">
          <div className="span9 span-left-pane">
            <div className="author-info" data-owner="post-detail-author">
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
                    className="content markdown-wrap"
                    data-owner="post-detail-content"
                    data-allowed-update={String(canUpdate)}
                  >
                    <ReactMarkdown
                      components={POST_BODY_MARKDOWN_COMPONENTS}
                      rehypePlugins={[rehypeRaw, [rehypeSanitize, POST_MARKDOWN_SANITIZE_SCHEMA]]}
                      remarkPlugins={[remarkGfm]}
                    >
                      {post.bodyMarkdown}
                    </ReactMarkdown>
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
            <div className="board-actrow" data-owner="post-detail-actions">
              <div data-owner="post-detail-watch-wrapper">
                <div>
                  {canWatch ? (
                    <button
                      id="watch-button"
                      type="button"
                      className={`ybtn${post.isWatching ? " ybtn-watching" : ""}`}
                      data-owner="post-detail-watch"
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
            <div className="issue-info board-labels" data-owner="post-detail-sidebar">
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
              <div className="act-row right-menu-icons" data-owner="post-detail-sidebar-actions">
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

        <div className="board-footer" data-owner="post-detail-footer">
          <BoardDetailKeymap
            onClose={() => setOpenPostModal(null)}
            onOpen={() => setOpenPostModal("helpKeys")}
            open={openPostModal === "helpKeys"}
          />
        </div>
      </div>

      <div
        id="deleteConfirm"
        className={`modal ${deleteModalOpen ? "in " : "hide "}fade`.trim()}
        data-owner="post-detail-delete-modal"
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
        className={`modal ${open ? "in" : "hide"}`.trim()}
        data-owner="post-detail-history-modal"
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
          <ReactMarkdown
            components={POST_BODY_MARKDOWN_COMPONENTS}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, POST_MARKDOWN_SANITIZE_SCHEMA]]}
            remarkPlugins={[remarkGfm]}
          >
            {historyMarkdown}
          </ReactMarkdown>
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
        className={`modal ${open ? "in " : "hide "}fade`.trim()}
        data-owner="post-detail-comment-delete-modal"
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

// Legacy `BoardApp.posts` filter links carry a plain `labelIds` value, never a JSON array.
function postsLabelFilterRoutePath(
  ownerName: string,
  projectName: string,
  labelId: string,
): string {
  return `/${ownerName}/${projectName}/posts?labelIds=${labelId}`;
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
          return (
            <Link
              to={postsLabelFilterRoutePath(ownerName, projectName, label.id)}
              activeProps={legacyRouteLocalActiveProps}
              style={{ "--x-backgroundColor": label.color } as CSSProperties}
              className="label issue-label active static"
              data-owner="post-detail-label-background"
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
          className="icon btn-transparent-with-fontsize-lineheight"
          data-owner="post-detail-post-edit-action"
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
            className="icon btn-transparent-with-fontsize-lineheight"
            data-owner="post-detail-post-edit-action"
            title={t("button.show.original")}
          >
            <i className="yobicon-edit-2"></i>
          </button>
        </Link>
      )}
      {canDelete ? (
        <button
          type="button"
          className="icon btn-transparent-with-fontsize-lineheight"
          data-owner="post-detail-post-delete-action"
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
    <div id="comments" className="board-comment-wrap" data-owner="post-detail-comments">
      <div id="timeline">
        <div className="timeline-list">
          <div className="comment-header" data-owner="post-detail-comment-header">
            <i className="yobicon-comments" data-owner="post-detail-comment-header-icon"></i>{" "}
            <strong>{t("common.comment")}</strong>{" "}
            <strong className="num">{post.comments.length}</strong>
          </div>
          <hr className="nm" data-owner="post-detail-comment-divider" />
          <ul className="comments" data-owner="post-detail-comment-list">
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
        data-owner="post-detail-disabled-comment-box"
        title={t("error.auth.unauthorized.comment")}
        data-login="required"
      >
        <div className="write-comment-wrap" data-owner="post-detail-disabled-comment-wrap">
          <div className="textarea-box" data-owner="post-detail-disabled-comment-textarea-box">
            <textarea
              className="comment disabled"
              data-owner="post-detail-disabled-comment"
              disabled
            />
          </div>
          <div className="mt10" data-owner="post-detail-disabled-comment-actions">
            <span className="ybtn ybtn-disabled" data-owner="post-detail-disabled-comment-button">
              {t("button.comment.new")}
            </span>
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
      data-owner="post-detail-comment-create-form"
      id="comment-form"
      action={prefixBasePath(basePath, `/${ownerName}/${projectName}/post/${postNumber}/comments`)}
      method="post"
      encType="multipart/form-data"
      onSubmit={handleSubmit}
    >
      <div className="write-comment-box" data-owner="post-detail-comment-create-write-box">
        <div className="write-comment-wrap" data-owner="post-detail-comment-create-write-wrap">
          <MarkdownEditor
            key={editorResetKey}
            {...postDetailMarkdownEditorProps("comment-body", "contents", "", "contents")}
          />
          <div
            className="upload-wrap content-footer"
            data-resource-type="NONISSUE_COMMENT"
            data-owner="post-detail-comment-upload-wrap"
            id="upload"
          >
            <div className="attach-wrap" data-owner="post-detail-comment-upload-attach-wrap">
              <span
                className="help help-droppable"
                data-owner="post-detail-comment-upload-droppable"
              >
                {t("common.attach.drophere")}
              </span>
              <div className="btn-wrap" data-owner="post-detail-comment-upload-button-wrap">
                <div
                  className="nbtn medium white fake-file-wrap"
                  data-owner="post-detail-comment-upload-file-button"
                >
                  <i className="yobicon-upload"></i> {t("button.upload")}
                  <input
                    type="file"
                    className="file"
                    data-owner="post-detail-comment-upload-file-input"
                    name="filePath"
                    multiple
                  />
                </div>
              </div>
              <span className="plain" data-owner="post-detail-comment-upload-plain">
                {t("common.attach.clickbutton")}
              </span>
              <span className="help help-pastable" data-owner="post-detail-comment-upload-pastable">
                {t("common.attach.pastehere")}
              </span>
            </div>
            <ul
              className="attached-files unstyled"
              data-owner="post-detail-comment-upload-attached-files"
            ></ul>
            <p className="help" data-owner="post-detail-comment-upload-help">
              <i className="yobicon-supportrequest"></i> {t("common.attach.attachIfYouSave")}
            </p>
          </div>
          <div className="right-txt" data-owner="post-detail-comment-actions">
            <button
              type="button"
              className="ybtn hidden"
              data-owner="post-detail-comment-create-dynamic-button"
              id="dynamic-comment-btn"
            ></button>
            <button
              type="submit"
              className="ybtn ybtn-success"
              data-owner="post-detail-comment-create-submit"
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
      className="comment"
      data-owner="post-detail-comment-row"
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
      <div className="comment-avatar" data-owner="post-detail-comment-avatar">
        <Link
          to="/$user"
          params={{ user: authorLoginId }}
          search={LEGACY_EMPTY_PROFILE_SEARCH}
          activeProps={legacyRouteLocalActiveProps}
          className="avatar-wrap"
          data-owner="post-detail-comment-avatar-wrap"
        >
          <img src={avatarUrl} width="32" height="32" alt={authorLoginId} />
        </Link>
      </div>
      <div className="media-body" data-owner="post-detail-comment-media">
        <div className="meta-info" data-owner="post-detail-comment-meta">
          <span className="comment_author" data-owner="post-detail-comment-author">
            <span
              className="resp-comment-avatar"
              data-owner="post-detail-comment-responsive-avatar"
            >
              <Link
                to="/$user"
                params={{ user: authorLoginId }}
                search={LEGACY_EMPTY_PROFILE_SEARCH}
                activeProps={legacyRouteLocalActiveProps}
                className="avatar-wrap"
                data-owner="post-detail-comment-responsive-avatar-wrap"
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
              data-owner="post-detail-comment-ago"
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
              data-owner="post-detail-share-link"
            >
              [Link]
            </Link>
          </span>
          <span className="act-row" data-owner="post-detail-comment-action-row">
            {canUpdate ? (
              <button
                type="button"
                className="btn-transparent"
                data-comment-id={commentId}
                data-owner="post-detail-comment-edit-action"
                title={t("common.comment.edit")}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCommentEditRequest(commentId);
                }}
              >
                <i className="yobicon-edit-2" data-owner="post-detail-comment-edit-icon"></i>
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className="btn-transparent"
                data-owner="post-detail-comment-delete-action"
                title={t("common.comment.delete")}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCommentDeleteRequest(commentId);
                }}
              >
                <i className="yobicon-trash" data-owner="post-detail-comment-delete-icon"></i>
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
          className={isEditing ? "is-editing" : undefined}
          data-owner="post-detail-comment-body"
        >
          <TasklistBar />
          <div
            className="comment-body markdown-wrap"
            data-owner="post-detail-comment-body-content"
            data-via-email={String(viaEmail)}
            data-allowed-update={String(canUpdate)}
            data-yobi-original-message-processed={hasRouteOwnedOriginalMessage ? "true" : undefined}
          >
            <OriginalMessageMarkdown
              comment={comment}
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
  comment,
  contentsMarkdown,
  viaEmail,
}: {
  comment: BoardPostComment;
  contentsMarkdown: string;
  viaEmail: boolean;
}) {
  const [showsOriginalMessage, setShowsOriginalMessage] = useState(false);
  const originalMessage = viaEmail ? splitOriginalMessageMarkdown(contentsMarkdown) : null;
  const markdownAutoLinkPlugin = createParentCommentMarkdownAutoLinkPlugin(comment);
  const components = createParentCommentMarkdownComponents();

  if (!originalMessage) {
    return (
      <ReactMarkdown
        components={components}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, POST_MARKDOWN_SANITIZE_SCHEMA]]}
        remarkPlugins={[remarkGfm, markdownAutoLinkPlugin]}
      >
        {contentsMarkdown}
      </ReactMarkdown>
    );
  }

  return (
    <>
      <ReactMarkdown
        components={components}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, POST_MARKDOWN_SANITIZE_SCHEMA]]}
        remarkPlugins={[remarkGfm, markdownAutoLinkPlugin]}
      >
        {originalMessage.visibleMarkdown}
      </ReactMarkdown>
      <button
        type="button"
        data-owner="post-detail-original-message-toggle"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setShowsOriginalMessage((current) => !current);
        }}
      >
        ...
      </button>
      <div data-original-message-owner="route" hidden={!showsOriginalMessage}>
        <ReactMarkdown
          components={components}
          rehypePlugins={[rehypeRaw, [rehypeSanitize, POST_MARKDOWN_SANITIZE_SCHEMA]]}
          remarkPlugins={[remarkGfm, markdownAutoLinkPlugin]}
        >
          {originalMessage.hiddenMarkdown}
        </ReactMarkdown>
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

function createParentCommentMarkdownAutoLinkPlugin(comment: BoardPostComment) {
  return createChildCommentMarkdownAutoLinkPlugin(comment);
}

const POST_BODY_MARKDOWN_COMPONENTS: Components = {
  code: ({ className, node: _node, ...props }) => {
    return <code {...props} className={className ?? ""} />;
  },
  pre: PostMarkdownPre,
};

function PostMarkdownPre({
  children,
  className,
  node: _node,
  ...props
}: ComponentPropsWithoutRef<"pre"> & ExtraProps) {
  const code = Array.isArray(children) ? children[0] : children;
  if (isValidElement<{ children?: ReactNode; className?: string }>(code)) {
    const language = code.props.className?.match(/(?:^|\s)language-([^\s]+)/u)?.[1];
    if (language) {
      return (
        <MarkdownCodeBlock className={code.props.className} language={language}>
          {code.props.children}
        </MarkdownCodeBlock>
      );
    }
  }
  return (
    <pre {...props} className={className ?? ""} data-owner="post-detail-markdown-pre">
      {children}
    </pre>
  );
}

function createParentCommentMarkdownComponents(): Components {
  return {
    code: ({ className, node: _node, ...props }) => {
      return <code {...props} className={className ?? ""} />;
    },
    pre: PostMarkdownPre,
    span: ({ children, className, node: _node, ...props }) => {
      if (className === "issue-state open") {
        return (
          <span
            {...props}
            className={className}
            data-owner="post-detail-parent-comment-issue-state-open"
          >
            {children}
          </span>
        );
      }
      if (className === "issue-state closed") {
        return (
          <span
            {...props}
            className={className}
            data-owner="post-detail-parent-comment-issue-state-closed"
          >
            {children}
          </span>
        );
      }
      if (className === "project-link") {
        return (
          <span
            {...props}
            className={className}
            data-owner="post-detail-parent-comment-project-link"
          >
            {children}
          </span>
        );
      }
      if (className === "org-link") {
        return (
          <span
            {...props}
            className={className}
            data-owner="post-detail-parent-comment-organization-link"
          >
            {children}
          </span>
        );
      }
      return (
        <span {...props} className={className}>
          {children}
        </span>
      );
    },
    a: ({ children, className, href, node: _node, ...props }) => {
      if (!href) return <>{children}</>;
      const noTextDecoration = className?.split(" ").includes("no-text-decoration") ?? false;
      if (noTextDecoration) {
        return (
          <Link
            {...props}
            to={href as "/"}
            className={`${className} user-link`}
            data-owner="post-detail-parent-comment-user-link"
            activeProps={legacyRouteLocalActiveProps}
          >
            <span data-owner="post-detail-parent-comment-no-text-decoration">{children}</span>
          </Link>
        );
      }
      return (
        <Link
          {...props}
          to={href as "/"}
          className={className}
          activeProps={legacyRouteLocalActiveProps}
        >
          {children}
        </Link>
      );
    },
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
      className={`comment-update-form${isEditing ? " is-editing" : ""}`}
      data-owner="post-detail-comment-editor"
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
        <div className="write-comment-box" data-owner="post-detail-comment-update-write-box">
          <div className="write-comment-wrap">
            <MarkdownEditor
              {...postDetailMarkdownEditorProps(
                "update-comment-body",
                "contents",
                comment.contentsMarkdown,
                commentId,
              )}
            />
            <div className="upload-drop-here" data-owner="post-detail-comment-update-drop-overlay">
              <div className="msg-wrap" data-owner="post-detail-comment-update-drop-message-wrap">
                <div className="msg" data-owner="post-detail-comment-update-drop-message">
                  {t("common.attach.dropFilesHere")}
                </div>
              </div>
            </div>
            <div
              className="comment-update-button upload-button-line"
              data-owner="post-detail-comment-update-actions"
            >
              <span className="file-upload" data-owner="post-detail-comment-update-file-upload">
                <label
                  htmlFor={`upload-${commentId}`}
                  className="file-upload__label ybtn"
                  data-owner="post-detail-comment-update-file-upload-label"
                >
                  {t("button.upload")}
                </label>
                <input
                  id={`upload-${commentId}`}
                  className="file-upload__input"
                  data-owner="post-detail-comment-update-file-upload-input"
                  type="file"
                  name="filePath"
                  multiple
                />
              </span>
              <button
                type="button"
                className="ybtn ybtn-cancel"
                data-owner="post-detail-comment-update-cancel"
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
                  type="submit"
                  className="ybtn ybtn-info"
                  data-owner="post-detail-comment-update-save"
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
        className={`add-a-comment${
          replyVisible && !hideReplyPrompt ? " is-visible" : " is-hidden"
        }`}
        data-owner="post-detail-child-comment-reply"
        onClick={() => {
          toggleForm();
          if (!formOpen) {
            requestAnimationFrame(() => textareaRef.current?.focus());
          }
        }}
      >
        {t("comment.oneline.comment.placeholder")}
      </div>
      <div className="subcomment-media-body" data-owner="post-detail-child-comment-media-body">
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
            className={`child-comment-input-form${formOpen ? " is-open" : ""}`}
            data-owner="post-detail-child-comment-form"
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
              <div
                className="oneline-comment-box"
                data-owner="post-detail-child-comment-oneline-box"
              >
                <textarea
                  ref={textareaRef}
                  className="editorSeries"
                  data-owner="post-detail-child-comment-textarea"
                  name="contents"
                  {...{ markdown: "true" }}
                  rows={1}
                  placeholder={`${t("comment.oneline.comment.placeholder")} (${ctrlKey()} + ENTER)`}
                ></textarea>
                <button
                  type="submit"
                  className="ybtn ybtn-success"
                  data-owner="post-detail-child-comment-submit"
                >
                  OK
                </button>
              </div>
              <div
                className="notification-receiver"
                data-owner="post-detail-child-comment-notification-receiver"
              >
                <span
                  className="notification-receiver-title"
                  data-owner="post-detail-child-comment-notification-receiver-title"
                >
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
  const markdownAutoLinkPlugin = createChildCommentMarkdownAutoLinkPlugin(comment);
  const metadata = (
    <>
      -{" "}
      <Link
        to="/$user"
        params={{ user: authorLoginId }}
        search={LEGACY_EMPTY_PROFILE_SEARCH}
        className="usf-group"
        data-owner="post-detail-child-comment-author-link"
        activeOptions={{ exact: true }}
        activeProps={legacyRouteLocalActiveProps}
      >
        <strong data-owner="post-detail-child-comment-author-strong">{authorLabel}</strong>
      </Link>{" "}
      <Link
        to="."
        hash={`comment-${commentId}`}
        activeOptions={{ includeHash: true }}
        activeProps={legacyRouteLocalActiveProps}
        className="ago"
        data-owner="post-detail-child-comment-ago-link"
        title={comment.createdLabel}
      >
        {comment.createdLabel}
      </Link>
      {canDelete ? (
        <button
          type="button"
          className="btn-transparent deleteButtonX"
          data-owner="post-detail-child-comment-delete"
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
    </>
  );
  const components: Components = {
    p: ({ children, node: _node, ...props }) => {
      const {
        [CHILD_COMMENT_BLOCKQUOTE_PARAGRAPH_ATTRIBUTE]: blockquoteParagraph,
        [CHILD_COMMENT_METADATA_ATTRIBUTE]: metadataPlacement,
        ...paragraphProps
      } = props as Record<string, unknown>;
      if (metadataPlacement === "root") {
        return metadata;
      }
      if (blockquoteParagraph === "true") {
        return (
          <p {...paragraphProps} data-owner="post-detail-child-comment-blockquote-paragraph">
            {children}
            {metadataPlacement === "paragraph" ? metadata : null}
          </p>
        );
      }
      return (
        <p {...paragraphProps} data-owner="post-detail-child-comment-paragraph">
          {children}
          {metadataPlacement === "paragraph" ? metadata : null}
        </p>
      );
    },
    strong: ({ children, node: _node, ...props }) => (
      <strong {...props} data-owner="post-detail-child-comment-strong">
        {children}
      </strong>
    ),
    span: ({ children, className, node: _node, ...props }) => {
      if (className === "issue-state open") {
        return (
          <span
            {...props}
            className={className}
            data-owner="post-detail-child-comment-issue-state-open"
          >
            {children}
          </span>
        );
      }
      if (className === "issue-state closed") {
        return (
          <span
            {...props}
            className={className}
            data-owner="post-detail-child-comment-issue-state-closed"
          >
            {children}
          </span>
        );
      }
      if (className === "org-link") {
        return (
          <span
            {...props}
            className={className}
            data-owner="post-detail-child-comment-organization-link"
          >
            {children}
          </span>
        );
      }
      if (className === "project-link") {
        return (
          <span
            {...props}
            className={className}
            data-owner="post-detail-child-comment-project-link"
          >
            {children}
          </span>
        );
      }
      return (
        <span {...props} className={className}>
          {children}
        </span>
      );
    },
    a: ({ children, className, href, node: _node, ...props }) => {
      if (!href) return <>{children}</>;
      const issueLink = className?.split(" ").includes("issueLink") ?? false;
      const noTextDecoration = className?.split(" ").includes("no-text-decoration") ?? false;
      if (issueLink) {
        return (
          <Link
            {...props}
            to={href as "/"}
            className={className}
            data-owner="post-detail-child-comment-issue-link"
            activeProps={legacyRouteLocalActiveProps}
          >
            {children}
          </Link>
        );
      }
      if (noTextDecoration) {
        return (
          <Link
            {...props}
            to={href as "/"}
            className={className}
            data-owner="post-detail-child-comment-no-text-decoration"
            activeProps={legacyRouteLocalActiveProps}
          >
            {children}
          </Link>
        );
      }
      return (
        <Link
          {...props}
          to={href as "/"}
          className={className}
          activeProps={legacyRouteLocalActiveProps}
        >
          {children}
        </Link>
      );
    },
    blockquote: ({ children, node: _node, ...props }) => (
      <blockquote {...props} data-owner="post-detail-child-comment-blockquote">
        {children}
      </blockquote>
    ),
  };
  return (
    <div className="one-line-comment">
      <div className="contents" data-owner="post-detail-child-comment-contents">
        <ReactMarkdown
          components={components}
          remarkPlugins={[remarkGfm, markdownAutoLinkPlugin, remarkChildCommentMetadata]}
        >
          {comment.contentsMarkdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}

const CHILD_COMMENT_METADATA_ATTRIBUTE = "data-child-comment-metadata";
const CHILD_COMMENT_BLOCKQUOTE_PARAGRAPH_ATTRIBUTE = "data-child-comment-blockquote-paragraph";

type ChildCommentMarkdownNode = {
  children?: ChildCommentMarkdownNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
  type: string;
  url?: string;
  value?: string;
};

type ChildCommentMarkdownReplacement = {
  children: ChildCommentMarkdownNode[];
  className?: string[];
  token: string;
  url: string;
};

function createChildCommentMarkdownAutoLinkPlugin(comment: BoardPostComment) {
  const commitReferences = comment.commitReferences ?? [];
  const replacements: ChildCommentMarkdownReplacement[] = (comment.issueReferences ?? []).map(
    (reference) => ({
      children: [
        { type: "text", value: `#${reference.issueNumber}.${reference.title}` },
        {
          data: {
            hName: "span",
            hProperties: { className: ["issue-state", reference.state.toLowerCase()] },
          },
          type: "text",
          value: reference.state,
        },
      ],
      className: ["issueLink"],
      token: `#${reference.issueNumber}`,
      url: `/${reference.ownerName}/${reference.projectName}/issue/${reference.issueNumber}`,
    }),
  );
  for (const reference of commitReferences) {
    const token = commitReferenceToken(comment.contentsMarkdown, reference);
    if (token) {
      const separator = token.lastIndexOf("@");
      const prefix = separator > 0 ? token.slice(0, separator) : "";
      replacements.push({
        children: [
          {
            type: "text",
            value: prefix ? `${prefix}@${reference.shortId}` : reference.shortId,
          },
        ],
        token,
        url: `/${reference.ownerName}/${reference.projectName}/commit/${reference.commitId}`,
      });
    }
  }
  for (const reference of comment.mentionReferences ?? []) {
    if (reference.kind === "organization") {
      replacements.push({
        children: [
          {
            data: { hName: "span", hProperties: { className: ["org-link"] } },
            type: "text",
            value: `@${reference.label || reference.loginId}`,
          },
        ],
        token: `@${reference.loginId}`,
        url: `/organizations/${reference.loginId}`,
      });
      continue;
    }
    if (reference.kind === "project") {
      replacements.push({
        children: [
          {
            data: { hName: "span", hProperties: { className: ["project-link"] } },
            type: "text",
            value: `@${reference.label || reference.loginId}`,
          },
        ],
        token: `@${reference.loginId}`,
        url: `/${reference.ownerName}/${reference.projectName}`,
      });
      continue;
    }
    replacements.push({
      children: [{ type: "text", value: `@${reference.label || reference.loginId}` }],
      className: ["no-text-decoration", "user-link"],
      token: `@${reference.loginId}`,
      url: `/${reference.loginId}`,
    });
  }
  return function childCommentMarkdownAutoLinkPlugin() {
    return (tree: ChildCommentMarkdownNode) =>
      transformChildCommentMarkdownAutoLinks(tree, replacements);
  };
}

function commitReferenceToken(markdown: string, reference: CommitReferenceMetadata) {
  const candidates = [
    `${reference.ownerName}/${reference.projectName}@${reference.commitId}`,
    `${reference.ownerName}@${reference.commitId}`,
    `@${reference.commitId}`,
  ];
  return candidates.find((candidate) => markdown.includes(candidate));
}

const CHILD_COMMENT_MARKDOWN_AUTOLINK_EXCLUDED_NODES = new Set([
  "code",
  "definition",
  "html",
  "image",
  "inlineCode",
  "link",
  "linkReference",
]);

function transformChildCommentMarkdownAutoLinks(
  node: ChildCommentMarkdownNode,
  replacements: ChildCommentMarkdownReplacement[],
) {
  if (!node.children || CHILD_COMMENT_MARKDOWN_AUTOLINK_EXCLUDED_NODES.has(node.type)) {
    return;
  }
  node.children = node.children.flatMap((child) => {
    if (child.type !== "text" || child.value === undefined) {
      transformChildCommentMarkdownAutoLinks(child, replacements);
      return [child];
    }
    return childCommentMarkdownAutoLinkTextNodes(child.value, replacements);
  });
}

function childCommentMarkdownAutoLinkTextNodes(
  value: string,
  replacements: ChildCommentMarkdownReplacement[],
) {
  const nodes: ChildCommentMarkdownNode[] = [];
  let cursor = 0;
  while (cursor < value.length) {
    let index = value.length;
    let match: ChildCommentMarkdownReplacement | undefined;
    for (const replacement of replacements) {
      const relativeCandidate = value.slice(cursor).search(escapeRegExp(replacement.token));
      const candidate = relativeCandidate < 0 ? -1 : cursor + relativeCandidate;
      if (
        candidate >= 0 &&
        candidate < index &&
        childCommentMarkdownReferenceBoundaryIsValid(value, candidate, replacement.token)
      ) {
        index = candidate;
        match = replacement;
      }
    }
    if (!match) {
      nodes.push({ type: "text", value: value.slice(cursor) });
      break;
    }
    if (index > cursor) nodes.push({ type: "text", value: value.slice(cursor, index) });
    nodes.push({
      children: match.children,
      data: { hProperties: { className: match.className } },
      type: "link",
      url: match.url,
    });
    cursor = index + match.token.length;
  }
  return nodes.length > 0 ? nodes : [{ type: "text", value }];
}

function escapeRegExp(value: string) {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u");
}

function childCommentMarkdownReferenceBoundaryIsValid(value: string, index: number, token: string) {
  const previousCharacter = value.slice(0, index).match(/.$/u)?.[0] ?? "";
  const nextCharacter = value.slice(index + token.length).match(/^./u)?.[0] ?? "";
  const wordCharacter = /[A-Za-z0-9_]/u;
  return !wordCharacter.test(previousCharacter) && !wordCharacter.test(nextCharacter);
}

function remarkChildCommentMetadata() {
  return (tree: ChildCommentMarkdownNode) => {
    let lastParagraph: ChildCommentMarkdownNode | undefined;
    const visit = (node: ChildCommentMarkdownNode, insideBlockquote = false) => {
      if (node.type === "paragraph") {
        lastParagraph = node;
        if (insideBlockquote) {
          node.data = {
            ...node.data,
            hProperties: {
              ...node.data?.hProperties,
              [CHILD_COMMENT_BLOCKQUOTE_PARAGRAPH_ATTRIBUTE]: "true",
            },
          };
        }
      }
      node.children?.forEach((child) =>
        visit(child, insideBlockquote || node.type === "blockquote"),
      );
    };
    visit(tree);
    if (lastParagraph) {
      lastParagraph.data = {
        ...lastParagraph.data,
        hProperties: {
          ...lastParagraph.data?.hProperties,
          [CHILD_COMMENT_METADATA_ATTRIBUTE]: "paragraph",
        },
      };
      return;
    }
    tree.children ??= [];
    tree.children.push({
      type: "paragraph",
      children: [],
      data: { hProperties: { [CHILD_COMMENT_METADATA_ATTRIBUTE]: "root" } },
    });
  };
}

function postDetailMarkdownEditorProps(
  editorMode: string,
  name: string,
  value: string,
  wrapId: string,
): MarkdownEditorProps {
  const isCommentUpdateEditor = editorMode === "update-comment-body";
  const isCommentCreateEditor = editorMode === "comment-body";
  return {
    value,
    internalValue: true,
    wrapperClassName: "mt10",
    wrapperOwner: isCommentUpdateEditor
      ? "post-detail-comment-update-editor-wrapper"
      : isCommentCreateEditor
        ? "post-detail-comment-create-editor-wrapper"
        : undefined,
    wrapperInstance: wrapId,
    tabAs: "link",
    tabClickPreventDefault: true,
    tabListClassName: "nav nav-tabs nm small",
    tabListOwner: isCommentUpdateEditor
      ? "post-detail-comment-update-editor-nav"
      : isCommentCreateEditor
        ? "post-detail-comment-create-editor-nav"
        : undefined,
    tabLiOwner: isCommentUpdateEditor
      ? "post-detail-comment-update-editor-nav-item"
      : isCommentCreateEditor
        ? "post-detail-comment-create-editor-nav-item"
        : undefined,
    tabContentOwner: (tab, active) => {
      if (isCommentUpdateEditor) {
        return active
          ? "post-detail-comment-update-editor-tab-active"
          : "post-detail-comment-update-editor-tab";
      }
      if (isCommentCreateEditor) {
        return active
          ? "post-detail-comment-create-editor-tab-active"
          : "post-detail-comment-create-editor-tab";
      }
      return undefined;
    },
    tabLinkProps: {
      edit: { hash: `edit-${wrapId}` },
      preview: { hash: `preview-${wrapId}` },
    },
    checklistClassName: "task-list-button",
    checklistOwner: isCommentUpdateEditor
      ? "post-detail-comment-update-checklist-wrap"
      : isCommentCreateEditor
        ? "post-detail-comment-create-checklist-wrap"
        : undefined,
    checklistButtonClassName: "add-task-list-button ybtn ybtn-small ybtn-danger-no-outline",
    checklistButtonOwner: isCommentUpdateEditor
      ? "post-detail-comment-update-checklist-button"
      : isCommentCreateEditor
        ? "post-detail-comment-create-checklist-button"
        : undefined,
    checklistIconClassName: "yobicon-list task-list-icon",
    checklistIconOwner: isCommentUpdateEditor
      ? "post-detail-comment-update-checklist-icon"
      : isCommentCreateEditor
        ? "post-detail-comment-create-checklist-icon"
        : undefined,
    clearTemporaryClassName: "editor-clear-temporary",
    clearTemporaryOwner: isCommentUpdateEditor
      ? "post-detail-comment-update-clear-temporary"
      : isCommentCreateEditor
        ? "post-detail-comment-create-clear-temporary"
        : undefined,
    noticeLabelClassName: "editor-notice-label",
    noticeLabelOwner: isCommentCreateEditor
      ? "post-detail-comment-create-editor-notice-label"
      : undefined,
    tabContentClassName: "tab-content",
    tabContentPaneOwner: "post-detail-editor-tab-content",
    help: <PostDetailMarkdownHelp />,
    editPaneId: `edit-${wrapId}`,
    editPaneOwner: "post-detail-editor-pane",
    textareaBoxOwner: isCommentUpdateEditor
      ? "post-detail-comment-update-textarea-box"
      : isCommentCreateEditor
        ? "post-detail-comment-create-textarea-box"
        : undefined,
    textareaName: name,
    textareaId: `editor-${name}-${wrapId}`,
    textareaOwner: isCommentUpdateEditor
      ? "post-detail-comment-update-textarea"
      : isCommentCreateEditor
        ? "post-detail-comment-create-textarea"
        : undefined,
    textareaMode: editorMode,
    previewPaneId: `preview-${wrapId}`,
    previewPaneOwner: "post-detail-editor-pane",
    previewClassName: `markdown-preview markdown-wrap ${editorMode}`,
    previewChildren: (active, editorValue) =>
      active ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{editorValue}</ReactMarkdown> : null,
    notificationClassName: "notification-receiver",
    notificationOwner: isCommentUpdateEditor
      ? "post-detail-comment-update-notification-receiver"
      : isCommentCreateEditor
        ? "post-detail-comment-create-notification-receiver"
        : undefined,
    notificationTitleClassName: "notification-receiver-title",
    notificationTitleOwner: isCommentUpdateEditor
      ? "post-detail-comment-update-notification-receiver-title"
      : isCommentCreateEditor
        ? "post-detail-comment-create-notification-receiver-title"
        : undefined,
    notificationTitleTrailingSpace: true,
  };
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
    <div className="tasklist" data-owner="post-detail-tasklist">
      <div className="task-title" data-owner="post-detail-task-title">
        Tasks
        <span className="done-counter" data-owner="post-detail-task-done-counter"></span>
      </div>
      <div className="task-progress" data-owner="post-detail-task-progress">
        <div
          className="bar red"
          data-owner="post-detail-tasklist-progress"
          style={{ width: 0 }}
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
    <div data-owner="post-detail-keymap-wrapper">
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
        className={`modal ${open ? "in " : "hide "}fade keymap-help`.trim()}
        data-owner="post-detail-keymap-modal"
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
