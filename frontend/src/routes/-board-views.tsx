import * as React from "react";
import type {
  BoardLabel,
  BoardPostDetail,
  BoardPostListItem,
  OrganizationBoardsResponse,
  ProjectPostsResponse,
} from "../api/boards";
import { uploadTemporaryAttachment, type UploadedAttachment } from "../api/attachments";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { buildProjectHref, ProjectMenu } from "./-project-views";
import type { ProjectDetailViewModel } from "./-view-models";

function projectPostHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  postNumber: string | number,
) {
  return prefixBasePath(
    runtimeConfig.basePath,
    `/${ownerName}/${projectName}/post/${String(postNumber)}`,
  );
}

function boardListHref(
  runtimeConfig: RuntimeConfig,
  pathname: string,
  values: Record<string, Array<number | string> | number | string | undefined>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === "") {
      continue;
    }
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      query.append(key, String(item));
    }
  }
  const serialized = query.toString();
  return prefixBasePath(
    runtimeConfig.basePath,
    serialized ? `${pathname}?${serialized}` : pathname,
  );
}

function nextOrderDir(currentOrderBy: string, currentOrderDir: string, fieldName: string) {
  return currentOrderBy === fieldName && currentOrderDir === "desc" ? "asc" : "desc";
}

function BoardSortLinks(props: {
  basePathname: string;
  filter: string;
  labelIds?: string[];
  orderBy: string;
  orderDir: string;
  projectNames?: string[];
  runtimeConfig: RuntimeConfig;
}) {
  const fields = [
    ["updatedDate", "Updated"],
    ["createdDate", "Date"],
    ["numOfComments", "Comments"],
  ] as const;

  return (
    <div className="filter-wrap board">
      <div className="filters">
        {fields.map(([fieldName, label]) => (
          <a
            className={props.orderBy === fieldName ? "filter active" : "filter"}
            href={boardListHref(props.runtimeConfig, props.basePathname, {
              filter: props.filter,
              "labelIds[]": props.labelIds,
              orderBy: fieldName,
              orderDir: nextOrderDir(props.orderBy, props.orderDir, fieldName),
              "projectNames[]": props.projectNames,
            })}
            key={fieldName}
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

function BoardPagination(props: {
  basePathname: string;
  filter: string;
  labelIds?: string[];
  orderBy: string;
  orderDir: string;
  pageNum: number;
  pageSize: number;
  projectNames?: string[];
  runtimeConfig: RuntimeConfig;
  totalCount: number;
}) {
  const pageSize = Math.max(1, props.pageSize || 15);
  const pageCount = Math.max(1, Math.ceil(Math.max(0, props.totalCount) / pageSize));
  const currentPage = Math.min(Math.max(1, props.pageNum || 1), pageCount);

  if (pageCount <= 1) {
    return null;
  }

  const pageHref = (pageNum: number) =>
    boardListHref(props.runtimeConfig, props.basePathname, {
      filter: props.filter,
      "labelIds[]": props.labelIds,
      orderBy: props.orderBy,
      orderDir: props.orderDir,
      pageNum,
      "projectNames[]": props.projectNames,
    });

  return (
    <nav aria-label="Board pagination" className="board-pagination pagination">
      {currentPage > 1 ? (
        <a className="ybtn" href={pageHref(currentPage - 1)}>
          Previous
        </a>
      ) : (
        <span aria-disabled="true" className="ybtn disabled">
          Previous
        </span>
      )}
      <span className="page-count">{`Page ${currentPage} of ${pageCount}`}</span>
      {currentPage < pageCount ? (
        <a className="ybtn" href={pageHref(currentPage + 1)}>
          Next
        </a>
      ) : (
        <span aria-disabled="true" className="ybtn disabled">
          Next
        </span>
      )}
    </nav>
  );
}

function boardLabels(labels: BoardLabel[]) {
  return labels.length === 0 ? null : (
    <span className="board-labels">
      {labels.map((label) => (
        <span
          className="board-label"
          key={label.id}
          style={{ borderColor: label.color || undefined }}
        >
          {label.name}
        </span>
      ))}
    </span>
  );
}

function postBadges(post: Pick<BoardPostListItem, "notice" | "readme">) {
  return (
    <span className="board-badges">
      {post.notice ? <span className="board-badge notice">Notice</span> : null}
      {post.readme ? <span className="board-badge readme">README</span> : null}
    </span>
  );
}

function boardImageFilesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
  const itemFiles: File[] = [];
  for (const item of Array.from(dataTransfer?.items ?? [])) {
    if (item.kind !== "file" || !item.type.toLowerCase().startsWith("image/")) {
      continue;
    }
    const file = item.getAsFile();
    if (file) {
      itemFiles.push(file);
    }
  }
  if (itemFiles.length > 0) {
    return itemFiles;
  }
  return Array.from(dataTransfer?.files ?? []).filter((file) =>
    file.type.toLowerCase().startsWith("image/"),
  );
}

function boardMarkdownTextForAttachment(attachment: UploadedAttachment): string {
  const name = attachment.name || "image.png";
  const link = `[${name}](${attachment.url}) `;
  return attachment.mimeType.toLowerCase().startsWith("image/") ? `!${link}` : link;
}

function insertBoardMarkdownText(value: string, cursorIndex: number, markdownText: string) {
  const cursor = Math.max(0, Math.min(cursorIndex, value.length));
  return {
    cursorIndex: cursor + markdownText.length,
    value: `${value.slice(0, cursor)}${markdownText}${value.slice(cursor)}`,
  };
}

function BoardMarkdownTextarea(props: {
  ariaLabel?: string;
  csrfToken?: string;
  id?: string;
  name?: string;
  onAttachmentUpload: (attachment: UploadedAttachment) => void;
  onChange: (value: string) => void;
  placeholder?: string;
  runtimeConfig: RuntimeConfig;
  value: string;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const handleImageFiles = async (textarea: HTMLTextAreaElement, files: File[]) => {
    if (!props.csrfToken || files.length === 0) {
      return;
    }
    const attachments = await Promise.all(
      files.map((file) => uploadTemporaryAttachment(props.runtimeConfig, props.csrfToken!, file)),
    );
    let nextValue = textarea.value;
    let nextCursor = textarea.selectionStart ?? nextValue.length;
    for (const attachment of attachments) {
      const inserted = insertBoardMarkdownText(
        nextValue,
        nextCursor,
        boardMarkdownTextForAttachment(attachment),
      );
      nextValue = inserted.value;
      nextCursor = inserted.cursorIndex;
      props.onAttachmentUpload(attachment);
    }
    props.onChange(nextValue);
    window.requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
      textareaRef.current?.focus();
    });
  };

  return (
    <textarea
      aria-label={props.ariaLabel}
      id={props.id}
      name={props.name}
      onChange={(event) => props.onChange(event.target.value)}
      onDragOver={(event) => {
        if (props.csrfToken && boardImageFilesFromDataTransfer(event.dataTransfer).length > 0) {
          event.preventDefault();
        }
      }}
      onDrop={(event) => {
        const files = boardImageFilesFromDataTransfer(event.dataTransfer);
        if (files.length === 0) {
          return;
        }
        event.preventDefault();
        void handleImageFiles(event.currentTarget, files);
      }}
      onPaste={(event) => {
        const files = boardImageFilesFromDataTransfer(event.clipboardData);
        if (files.length === 0) {
          return;
        }
        event.preventDefault();
        void handleImageFiles(event.currentTarget, files);
      }}
      placeholder={props.placeholder}
      ref={textareaRef}
      value={props.value}
    />
  );
}

function PostRows(props: {
  items: BoardPostListItem[];
  runtimeConfig: RuntimeConfig;
  showProject?: boolean;
}) {
  if (props.items.length === 0) {
    return <div className="warning-none">No post has been added.</div>;
  }

  return (
    <ul className="post-list unstyled">
      {props.items.map((post) => (
        <li
          className="post-item title post-row"
          key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
        >
          <div className="post-row-main">
            <a
              className="post-title"
              href={projectPostHref(
                props.runtimeConfig,
                post.ownerName,
                post.projectName,
                post.postNumber,
              )}
            >
              {post.title || "(no title)"}
            </a>
            {postBadges(post)}
            {boardLabels(post.labels)}
          </div>
          <div className="post-row-meta">
            <span>{`#${post.postNumber}`}</span>
            {props.showProject ? (
              <a
                href={buildProjectHref(
                  props.runtimeConfig,
                  post.ownerName,
                  post.projectName,
                  "posts",
                )}
              >
                {`${post.ownerName}/${post.projectName}`}
              </a>
            ) : null}
            <span>{post.authorLabel || post.authorLoginId}</span>
            <span>{post.updatedLabel || post.createdLabel}</span>
            <span>{`Comments ${post.commentCount}`}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProjectBoardListPage(props: {
  canCreate: boolean;
  detail: ProjectDetailViewModel | null | undefined;
  filter: string;
  labelIds: string[];
  labels: BoardLabel[];
  orderBy: string;
  orderDir: string;
  posts: ProjectPostsResponse | null | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail;
  const ownerName = props.posts?.ownerName || detail?.ownerName || "";
  const projectName = props.posts?.projectName || detail?.projectName || "";

  return (
    <main className="app-shell board-page">
      <h1>Boards</h1>
      {detail ? <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} /> : null}
      <div className="search-wrap underline board-toolbar">
        <form
          action={prefixBasePath(
            props.runtimeConfig.basePath,
            `/${ownerName}/${projectName}/posts`,
          )}
        >
          <input
            defaultValue={props.filter}
            name="filter"
            placeholder="Search posts"
            type="search"
          />
          {props.labels.length ? (
            <select aria-label="Labels" defaultValue={props.labelIds} multiple name="labelIds[]">
              {props.labels.map((label) => (
                <option key={label.id} value={label.id}>
                  {label.name}
                </option>
              ))}
            </select>
          ) : null}
          <input defaultValue={props.orderBy} name="orderBy" type="hidden" />
          <input defaultValue={props.orderDir} name="orderDir" type="hidden" />
          <button className="ybtn" type="submit">
            Search
          </button>
        </form>
        {props.canCreate ? (
          <a
            className="ybtn primary"
            href={prefixBasePath(
              props.runtimeConfig.basePath,
              `/${ownerName}/${projectName}/postform`,
            )}
          >
            New post
          </a>
        ) : null}
      </div>
      <BoardSortLinks
        basePathname={`/${ownerName}/${projectName}/posts`}
        filter={props.filter}
        labelIds={props.labelIds}
        orderBy={props.orderBy}
        orderDir={props.orderDir}
        runtimeConfig={props.runtimeConfig}
      />
      {props.posts?.notices.length ? (
        <section className="notice-wrap">
          <h2>Notice</h2>
          <PostRows items={props.posts.notices} runtimeConfig={props.runtimeConfig} />
        </section>
      ) : null}
      <section className="post-list-wrap">
        <PostRows items={props.posts?.items ?? []} runtimeConfig={props.runtimeConfig} />
      </section>
      {props.posts ? (
        <BoardPagination
          basePathname={`/${ownerName}/${projectName}/posts`}
          filter={props.filter}
          labelIds={props.labelIds}
          orderBy={props.orderBy}
          orderDir={props.orderDir}
          pageNum={props.posts.pageNum}
          pageSize={props.posts.pageSize}
          runtimeConfig={props.runtimeConfig}
          totalCount={props.posts.totalCount}
        />
      ) : null}
    </main>
  );
}

export function ProjectBoardDetailPage(props: {
  csrfToken?: string;
  post: BoardPostDetail | null | undefined;
  runtimeConfig: RuntimeConfig;
  viewerId?: string;
  onCommentDelete?: (commentId: string) => Promise<void>;
  onCommentSubmit?: (contentsMarkdown: string, attachmentIds?: number[]) => Promise<void>;
  onCommentUpdate?: (
    commentId: string,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void>;
  onDeletePost?: () => Promise<void>;
  onWatchToggle?: () => Promise<void>;
}) {
  const [commentDraft, setCommentDraft] = React.useState("");
  const [commentAttachmentIds, setCommentAttachmentIds] = React.useState<number[]>([]);
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [editingCommentDraft, setEditingCommentDraft] = React.useState("");
  const [editingCommentAttachmentIds, setEditingCommentAttachmentIds] = React.useState<number[]>(
    [],
  );
  const post = props.post;

  if (!post) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }

  return (
    <main className="app-shell board-page">
      <article className="project-page-wrap board-view">
        <header className="board-header issue">
          <div className="post-row-meta">
            <a
              href={buildProjectHref(
                props.runtimeConfig,
                post.ownerName,
                post.projectName,
                "posts",
              )}
            >
              Boards
            </a>
            <span>{`#${post.postNumber}`}</span>
            <span>{post.authorLabel || post.authorLoginId}</span>
            <span>{post.updatedLabel || post.createdLabel}</span>
          </div>
          <h1>{post.title}</h1>
          <div className="issue-info board-labels">
            {postBadges(post)}
            {boardLabels(post.labels)}
          </div>
        </header>
        <div className="board-body" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
        <div className="board-actions">
          {post.permissions.canWatch ? (
            <button className="ybtn" onClick={props.onWatchToggle} type="button">
              {post.isWatching ? "Unwatch" : "Watch"}
            </button>
          ) : null}
          <span>{`Watchers ${post.watcherCount}`}</span>
          {post.permissions.canUpdate ? (
            <a
              className="ybtn"
              href={prefixBasePath(
                props.runtimeConfig.basePath,
                `/${post.ownerName}/${post.projectName}/post/${post.postNumber}/editform`,
              )}
            >
              Edit
            </a>
          ) : null}
          {post.permissions.canDelete ? (
            <button className="ybtn danger" onClick={props.onDeletePost} type="button">
              Delete
            </button>
          ) : null}
        </div>
      </article>
      <section className="board-comment-wrap">
        <h2>{`Comments ${post.commentCount}`}</h2>
        {post.comments.length === 0 ? (
          <div className="warning-none">No comments yet.</div>
        ) : (
          <ol className="board-comments">
            {post.comments.map((comment) => (
              <li className="board-comment" id={`comment-${comment.id}`} key={comment.id}>
                <div className="post-row-meta">
                  <span>{comment.authorLabel || comment.authorLoginId}</span>
                  <span>{comment.createdLabel}</span>
                </div>
                {editingCommentId === comment.id ? (
                  <form
                    className="board-comment-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const contents = editingCommentDraft.trim();
                      if (!contents) {
                        return;
                      }
                      void props
                        .onCommentUpdate?.(comment.id, contents, editingCommentAttachmentIds)
                        .then(() => {
                          setEditingCommentAttachmentIds([]);
                          setEditingCommentId(null);
                        });
                    }}
                  >
                    <BoardMarkdownTextarea
                      ariaLabel="Edit comment"
                      csrfToken={props.csrfToken}
                      onAttachmentUpload={(attachment) =>
                        setEditingCommentAttachmentIds((current) => [...current, attachment.id])
                      }
                      onChange={setEditingCommentDraft}
                      runtimeConfig={props.runtimeConfig}
                      value={editingCommentDraft}
                    />
                    <button className="ybtn primary" type="submit">
                      Save
                    </button>
                    <button
                      className="ybtn"
                      onClick={() => setEditingCommentId(null)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: comment.contentsHtml }} />
                )}
                {post.permissions.canUpdate || props.viewerId === comment.authorId ? (
                  <button
                    className="ybtn"
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditingCommentDraft(comment.contentsMarkdown);
                      setEditingCommentAttachmentIds([]);
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                ) : null}
                {post.permissions.canDelete || props.viewerId === comment.authorId ? (
                  <button
                    className="ybtn danger"
                    onClick={() => void props.onCommentDelete?.(comment.id)}
                    type="button"
                  >
                    Delete
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        )}
        {post.permissions.canComment ? (
          <form
            className="board-comment-form"
            onSubmit={(event) => {
              event.preventDefault();
              const contents = commentDraft.trim();
              if (!contents) {
                return;
              }
              void props.onCommentSubmit?.(contents, commentAttachmentIds).then(() => {
                setCommentAttachmentIds([]);
                setCommentDraft("");
              });
            }}
          >
            <BoardMarkdownTextarea
              csrfToken={props.csrfToken}
              name="contentsMarkdown"
              onAttachmentUpload={(attachment) =>
                setCommentAttachmentIds((current) => [...current, attachment.id])
              }
              onChange={setCommentDraft}
              placeholder="Leave a comment"
              runtimeConfig={props.runtimeConfig}
              value={commentDraft}
            />
            <button className="ybtn primary" type="submit">
              Comment
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}

export function ProjectPostFormPage(props: {
  canMarkNotice: boolean;
  canMarkReadme: boolean;
  csrfToken?: string;
  initialPost?: BoardPostDetail | null;
  labels: BoardLabel[];
  mode: "create" | "edit";
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  onSubmit: (input: {
    bodyMarkdown: string;
    attachmentIds: number[];
    labelIds: string[];
    notice: boolean;
    readme: boolean;
    title: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = React.useState(props.initialPost?.title ?? "");
  const [bodyMarkdown, setBodyMarkdown] = React.useState(props.initialPost?.bodyMarkdown ?? "");
  const [attachmentIds, setAttachmentIds] = React.useState<number[]>([]);
  const [notice, setNotice] = React.useState(props.initialPost?.notice ?? false);
  const [readme, setReadme] = React.useState(props.initialPost?.readme ?? false);
  const [selectedLabelIds, setSelectedLabelIds] = React.useState(
    () => new Set((props.initialPost?.labels ?? []).map((label) => label.id)),
  );

  React.useEffect(() => {
    setTitle(props.initialPost?.title ?? "");
    setBodyMarkdown(props.initialPost?.bodyMarkdown ?? "");
    setAttachmentIds([]);
    setNotice(props.initialPost?.notice ?? false);
    setReadme(props.initialPost?.readme ?? false);
    setSelectedLabelIds(new Set((props.initialPost?.labels ?? []).map((label) => label.id)));
  }, [props.initialPost]);

  return (
    <main className="app-shell board-page">
      <h1>{props.mode === "create" ? "New post" : "Edit post"}</h1>
      <form
        className="board-form"
        onSubmit={(event) => {
          event.preventDefault();
          void props.onSubmit({
            attachmentIds,
            bodyMarkdown,
            labelIds: [...selectedLabelIds],
            notice,
            readme,
            title,
          });
        }}
      >
        <label>
          <span>Title</span>
          <input
            name="title"
            onChange={(event) => setTitle(event.target.value)}
            required
            type="text"
            value={title}
          />
        </label>
        <label htmlFor="board-post-body-markdown">
          <span>Body</span>
          <BoardMarkdownTextarea
            csrfToken={props.csrfToken}
            id="board-post-body-markdown"
            name="bodyMarkdown"
            onAttachmentUpload={(attachment) =>
              setAttachmentIds((current) => [...current, attachment.id])
            }
            onChange={setBodyMarkdown}
            runtimeConfig={props.runtimeConfig}
            value={bodyMarkdown}
          />
        </label>
        {props.labels.length ? (
          <fieldset className="board-label-picker">
            <legend>Labels</legend>
            {props.labels.map((label) => (
              <label key={label.id}>
                <input
                  checked={selectedLabelIds.has(label.id)}
                  onChange={(event) => {
                    setSelectedLabelIds((current) => {
                      const next = new Set(current);
                      if (event.target.checked) {
                        next.add(label.id);
                      } else {
                        next.delete(label.id);
                      }
                      return next;
                    });
                  }}
                  type="checkbox"
                />
                <span>{label.name}</span>
              </label>
            ))}
          </fieldset>
        ) : null}
        {props.canMarkNotice ? (
          <label className="board-check">
            <input
              checked={notice}
              onChange={(event) => setNotice(event.target.checked)}
              type="checkbox"
            />
            <span>Notice</span>
          </label>
        ) : null}
        {props.canMarkReadme ? (
          <label className="board-check">
            <input
              checked={readme}
              onChange={(event) => setReadme(event.target.checked)}
              type="checkbox"
            />
            <span>README</span>
          </label>
        ) : null}
        <div className="board-actions">
          <button className="ybtn primary" type="submit">
            {props.mode === "create" ? "Create" : "Save"}
          </button>
          <a
            className="ybtn"
            href={buildProjectHref(
              props.runtimeConfig,
              props.ownerName,
              props.projectName,
              "posts",
            )}
          >
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}

export function OrganizationBoardListPage(props: {
  boards: OrganizationBoardsResponse | null | undefined;
  filter: string;
  organizationName: string;
  orderBy: string;
  orderDir: string;
  projectNames: string[];
  runtimeConfig: RuntimeConfig;
}) {
  const action = prefixBasePath(
    props.runtimeConfig.basePath,
    `/organizations/${props.organizationName}/boards`,
  );

  return (
    <main className="app-shell board-page">
      <h1>Boards</h1>
      <div className="search-wrap underline board-toolbar">
        <form action={action}>
          <input
            defaultValue={props.filter}
            name="filter"
            placeholder="Search posts"
            type="search"
          />
          <select
            aria-label="Projects"
            defaultValue={props.projectNames}
            key={`${props.projectNames.join(",")}-${props.boards?.visibleProjects.length ?? 0}`}
            multiple
            name="projectNames[]"
          >
            {(props.boards?.visibleProjects ?? []).map((project) => (
              <option key={project.projectName} value={project.projectName}>
                {project.projectName}
              </option>
            ))}
          </select>
          <input defaultValue={props.orderBy} name="orderBy" type="hidden" />
          <input defaultValue={props.orderDir} name="orderDir" type="hidden" />
          <button className="ybtn" type="submit">
            Search
          </button>
        </form>
      </div>
      <BoardSortLinks
        basePathname={`/organizations/${props.organizationName}/boards`}
        filter={props.filter}
        orderBy={props.orderBy}
        orderDir={props.orderDir}
        projectNames={props.projectNames}
        runtimeConfig={props.runtimeConfig}
      />
      <section className="post-list-wrap">
        <PostRows
          items={props.boards?.items ?? []}
          runtimeConfig={props.runtimeConfig}
          showProject
        />
      </section>
      {props.boards ? (
        <BoardPagination
          basePathname={`/organizations/${props.organizationName}/boards`}
          filter={props.filter}
          orderBy={props.orderBy}
          orderDir={props.orderDir}
          pageNum={props.boards.pageNum}
          pageSize={props.boards.pageSize}
          projectNames={props.projectNames}
          runtimeConfig={props.runtimeConfig}
          totalCount={props.boards.totalCount}
        />
      ) : null}
    </main>
  );
}
