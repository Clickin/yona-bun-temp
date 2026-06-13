import * as React from "react";
import type {
  BoardLabel,
  BoardPostDetail,
  BoardPostListItem,
  OrganizationBoardsResponse,
  ProjectPostsResponse,
} from "../api/boards";
import { uploadTemporaryAttachment, type UploadedAttachment } from "../api/attachments";
import { translateLegacyResource } from "../api/translation";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { LegacyMarkdownEditorShell, MarkdownRenderer } from "./-markdown-renderer";
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

function userInfoHref(runtimeConfig: RuntimeConfig, loginId: string) {
  return prefixBasePath(runtimeConfig.basePath, `/${loginId}`);
}

function boardPostCommentAction(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  postNumber: string | number,
  commentId?: string,
) {
  const base = `/${ownerName}/${projectName}/post/${String(postNumber)}/comment`;
  return prefixBasePath(runtimeConfig.basePath, commentId ? `${base}/${commentId}` : base);
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

function PostingHistoryModal(props: {
  historyMarkdown?: string;
  issueReferences?: BoardPostDetail["issueReferences"];
  linkLabel: string;
  mentionReferences?: BoardPostDetail["mentionReferences"];
  ownerName?: string;
  basePath?: string;
  projectName?: string;
}) {
  const historyMarkdown = props.historyMarkdown ?? "";
  if (!historyMarkdown.trim()) {
    return null;
  }

  return (
    <div className="posting-history">
      <a data-toggle="modal" href="#-yona-posting-history">
        <span>{props.linkLabel}</span>
      </a>
      <div className="modal hide" id="-yona-posting-history">
        <div className="modal-header">
          <button className="close" data-dismiss="modal" type="button">
            x
          </button>
          <h5 className="nm">change.history</h5>
        </div>
        <MarkdownRenderer
          className="modal-body"
          basePath={props.basePath}
          issueReferences={props.issueReferences}
          markdown={historyMarkdown}
          mentionReferences={props.mentionReferences}
          ownerName={props.ownerName}
          projectName={props.projectName}
        />
        <div className="modal-footer">
          <button className="ybtn ybtn-info ybtn-small" data-dismiss="modal" type="button">
            button.confirm
          </button>
        </div>
      </div>
    </div>
  );
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
    ["updatedDate", "common.order.updatedDate"],
    ["createdDate", "common.order.date"],
    ["numOfComments", "common.order.comments"],
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
    return <div className="page-navigation-wrap" id="pagination" />;
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
    <div className="page-navigation-wrap" id="pagination">
      <ul className="page-nums">
        <li className="page-num ikon">
          {currentPage > 1 ? (
            <a href={pageHref(currentPage - 1)} pjax-page="">
              <i className="ico btn-pg-prev"></i>
              <span>button.prevPage</span>
            </a>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">button.prevPage</span>
            </>
          )}
        </li>
        <li className="page-num">
          <input
            className="input-mini nospinner"
            defaultValue={currentPage}
            max={pageCount}
            min={1}
            name="pageNum"
            pattern="[0-9]*"
            type="number"
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{pageCount}</li>
        <li className="page-num ikon">
          {currentPage < pageCount ? (
            <a href={pageHref(currentPage + 1)} pjax-page="">
              <i className="ico btn-pg-next"></i>
              <span>button.nextPage</span>
            </a>
          ) : (
            <>
              <i className="ico btn-pg-next off"></i>
              <span className="off">button.nextPage</span>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function boardLabels(labels: BoardLabel[]) {
  return labels.length === 0 ? null : (
    <dl>
      <dt>label</dt>
      <dd>
        {labels.map((label) => (
          <a
            className="label issue-label active static"
            data-label-id={label.id}
            href={`&labelIds=${label.id}`}
            key={label.id}
            style={{ background: label.color || undefined }}
          >
            {label.name}
          </a>
        ))}
      </dd>
    </dl>
  );
}

function splitBoardTitleHeaderWords(title: string) {
  const segments = title.split(/(?<=\])/);
  const prefixes = segments.filter((segment) => {
    const trimmed = segment.trim();
    return trimmed.startsWith("[") && trimmed.includes("]");
  });
  const prefixSource = prefixes.join("");
  const titleWithoutPrefixes = prefixSource ? title.replace(prefixSource, "") : title;
  const madeByHeaderWordsOnly =
    title.trim().indexOf("]") + 1 === title.trim().length ||
    titleWithoutPrefixes.trim().length === 0;

  return {
    prefixes: madeByHeaderWordsOnly ? [] : prefixes.map((prefix) => prefix.trim()),
    title: madeByHeaderWordsOnly ? title : titleWithoutPrefixes,
  };
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
  className?: string;
  csrfToken?: string;
  dataEditorMode?: string;
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
      className={props.className}
      data-editor-mode={props.dataEditorMode}
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
  className?: string;
  items: BoardPostListItem[];
  runtimeConfig: RuntimeConfig;
  showProject?: boolean;
}) {
  if (props.items.length === 0) {
    return (
      <div className="error-wrap">
        <i className="ico ico-err1" />
        <p>post.is.empty</p>
      </div>
    );
  }

  return (
    <ul className={props.className ?? "post-list-wrap"}>
      {props.items.map((post) => {
        const splitTitle = splitBoardTitleHeaderWords(post.title || "");
        return (
          <li
            className="post-item title post-row"
            key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
          >
          <a
            className={`avatar-wrap mlarge hide-in-mobile${
              post.authorAvatarUrl ? "" : " empty-avatar-wrap"
            }`}
            data-placement="bottom"
            data-toggle="tooltip"
            href={userInfoHref(props.runtimeConfig, post.authorLoginId)}
            title={post.authorLoginId}
          >
            {post.authorAvatarUrl ? (
              <img
                alt={post.authorLabel}
                height={32}
                src={post.authorAvatarUrl}
                width={32}
              />
            ) : (
              "\u00a0"
            )}
          </a>
          <div className="title-wrap post-row-main">
            {post.notice ? (
              <>
                <span className="label label-notice">post.notice</span>{" "}
              </>
            ) : null}
            {post.readme ? (
              <>
                <span className="label label-important">README</span>{" "}
              </>
            ) : props.showProject ? null : (
              <span className="post-id">{post.postNumber}</span>
            )}
            {splitTitle.prefixes.map((prefix, index) => (
              <a className="title-prefix" href="#!" key={`${prefix}-${index}`}>
                {prefix}
              </a>
            ))}
            <a
              className="title post-title"
              href={projectPostHref(
                props.runtimeConfig,
                post.ownerName,
                post.projectName,
                post.postNumber,
              )}
            >
              {splitTitle.title || "(no title)"}
            </a>
          </div>
          <div className="infos post-row-meta">
            {props.showProject ? (
              <a
                className="infos-item infos-link-item group-project-name"
                href={buildProjectHref(
                  props.runtimeConfig,
                  post.ownerName,
                  post.projectName,
                  "posts",
                )}
              >
                {post.projectName}
              </a>
            ) : null}
            {props.showProject ? <span className="post-id">#{post.postNumber}</span> : null}
            <a
              className="infos-item infos-link-item"
              data-placement="bottom"
              data-toggle="tooltip"
              href={userInfoHref(props.runtimeConfig, post.authorLoginId)}
              title={post.authorLoginId}
            >
              {post.authorLabel || post.authorLoginId || "issue.noAuthor"}
            </a>
            <span
              className="infos-item"
              data-placement="bottom"
              data-toggle="tooltip"
              title={post.createdLabel}
            >
              {post.updatedLabel || post.createdLabel}
            </span>
            {post.commentCount > 0 ? (
              <span className="infos-item item-count-groups">
                <a
                  className="comments-count comments-count-color"
                  href={`${projectPostHref(
                    props.runtimeConfig,
                    post.ownerName,
                    post.projectName,
                    post.postNumber,
                  )}#comments`}
                >
                  <span className="count-groups item-icon">
                    <i className="yobicon-comment2" />
                  </span>
                  <span className="count-groups item-count">{post.commentCount}</span>
                </a>
              </span>
            ) : null}
            {post.labels.map((label) => (
              <a
                className="label issue-label list-label active board-label"
                data-category-id={label.categoryId}
                data-label-id={label.id}
                href="#"
                key={label.id}
                style={{ borderColor: label.color || undefined }}
              >
                {label.name}
              </a>
            ))}
          </div>
          </li>
        );
      })}
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

  const totalRows = (props.posts?.items.length ?? 0) + (props.posts?.notices.length ?? 0);

  return (
    <main className="app-shell board-page page-wrap-outer">
      {detail ? <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} /> : null}
      <div className="post-list project-page-wrap">
        <div className="search-wrap underline board-toolbar">
          <form
            action={prefixBasePath(
              props.runtimeConfig.basePath,
              `/${ownerName}/${projectName}/posts`,
            )}
            className="pull-left"
            id="option_form"
            method="get"
          >
            <input defaultValue={props.orderBy} name="orderBy" type="hidden" />
            <input defaultValue={props.orderDir} name="orderDir" type="hidden" />
            <div className="search-bar">
              <input
                className="textbox"
                defaultValue={props.filter}
                name="filter"
                placeholder="project.searchPlaceholder"
                type="text"
              />
              <button className="search-btn" type="submit">
                <i className="yobicon-search" />
              </button>
            </div>
            {props.labels.length ? (
              <div className="board-labels">
                <select aria-label="Labels" defaultValue={props.labelIds} multiple name="labelIds[]">
                  {props.labels.map((label) => (
                    <option key={label.id} value={label.id}>
                      {label.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="two-column-mode-checkbox-area" />
          </form>
          <div className="pull-right">
            {props.canCreate ? (
              <a
                className="ybtn ybtn-success"
                href={prefixBasePath(
                  props.runtimeConfig.basePath,
                  `/${ownerName}/${projectName}/postform`,
                )}
              >
                post.write
              </a>
            ) : null}
          </div>
        </div>
        {totalRows === 0 ? (
          <div className="error-wrap">
            <i className="ico ico-err1" />
            <p>post.is.empty</p>
          </div>
        ) : (
          <>
            {props.posts && props.posts.totalCount > 1 ? (
              <BoardSortLinks
                basePathname={`/${ownerName}/${projectName}/posts`}
                filter={props.filter}
                labelIds={props.labelIds}
                orderBy={props.orderBy}
                orderDir={props.orderDir}
                runtimeConfig={props.runtimeConfig}
              />
            ) : null}
            {props.posts?.notices.length ? (
              <PostRows
                className="post-list-wrap notice-wrap"
                items={props.posts.notices}
                runtimeConfig={props.runtimeConfig}
              />
            ) : null}
            <PostRows items={props.posts?.items ?? []} runtimeConfig={props.runtimeConfig} />
          </>
        )}
        <div className="write-btn-wrap" />
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
        ) : (
          <div className="page-navigation-wrap" id="pagination" />
        )}
      </div>
    </main>
  );
}

export function ProjectBoardDetailPage(props: {
  csrfToken?: string;
  post: BoardPostDetail | null | undefined;
  runtimeConfig: RuntimeConfig;
  viewerId?: string;
  onCommentDelete?: (commentId: string) => Promise<void>;
  onCommentSubmit?: (
    contentsMarkdown: string,
    attachmentIds?: number[],
    parentCommentId?: string,
  ) => Promise<void>;
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
  const [childCommentDrafts, setChildCommentDrafts] = React.useState<Record<string, string>>({});
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [editingCommentDraft, setEditingCommentDraft] = React.useState("");
  const [editingCommentAttachmentIds, setEditingCommentAttachmentIds] = React.useState<number[]>(
    [],
  );
  const [translatedPostMarkdown, setTranslatedPostMarkdown] = React.useState<string | null>(null);
  const [translatedCommentMarkdownById, setTranslatedCommentMarkdownById] = React.useState<
    Record<string, string>
  >({});
  const [translatingPost, setTranslatingPost] = React.useState(false);
  const [translatingCommentIds, setTranslatingCommentIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const post = props.post;

  if (!post) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }

  const authorName = post.authorLabel || post.authorLoginId || "common.noAuthor";
  const authorHref = post.authorLoginId ? userInfoHref(props.runtimeConfig, post.authorLoginId) : "#";
  const topLevelComments = post.comments.filter((comment) => !comment.parentCommentId);
  const childCommentsByParent = post.comments.reduce<
    Map<string, BoardPostDetail["comments"][number][]>
  >((commentsByParent, comment) => {
    if (!comment.parentCommentId) {
      return commentsByParent;
    }
    const comments = commentsByParent.get(comment.parentCommentId) ?? [];
    comments.push(comment);
    commentsByParent.set(comment.parentCommentId, comments);
    return commentsByParent;
  }, new Map());
  const editPostHref = prefixBasePath(
    props.runtimeConfig.basePath,
    `/${post.ownerName}/${post.projectName}/post/${post.postNumber}/editform`,
  );
  const translatePost = async () => {
    if (translatingPost || translatedPostMarkdown !== null) {
      return;
    }
    setTranslatingPost(true);
    try {
      const translatedMarkdown = await translateLegacyResource(
        props.runtimeConfig,
        props.csrfToken,
        {
          number: Number(post.postNumber),
          owner: post.ownerName,
          projectName: post.projectName,
          type: "posting",
        },
      );
      setTranslatedPostMarkdown(translatedMarkdown);
    } catch {
      // Legacy translation failures leave the original Markdown visible.
    } finally {
      setTranslatingPost(false);
    }
  };
  const translatePostComment = async (comment: BoardPostDetail["comments"][number]) => {
    if (translatingCommentIds.has(comment.id) || translatedCommentMarkdownById[comment.id]) {
      return;
    }
    setTranslatingCommentIds((current) => new Set(current).add(comment.id));
    try {
      const translatedMarkdown = await translateLegacyResource(
        props.runtimeConfig,
        props.csrfToken,
        {
          number: Number(comment.id),
          owner: post.ownerName,
          projectName: post.projectName,
          type: "post-comment",
        },
      );
      setTranslatedCommentMarkdownById((current) => ({
        ...current,
        [comment.id]: translatedMarkdown,
      }));
    } catch {
      // Legacy translation failures leave the original Markdown visible.
    } finally {
      setTranslatingCommentIds((current) => {
        const next = new Set(current);
        next.delete(comment.id);
        return next;
      });
    }
  };

  return (
    <main className="app-shell board-page page-wrap-outer">
      <div className="project-page-wrap board-view">
        <div className="board-header issue">
          <div className="pull-right mr10 mt10 hide-in-mobile">
            <div className="date" title={post.createdLabel}>
              {post.createdLabel}
            </div>
          </div>
          <div className="title">
            <strong className="board-id">{`#${post.postNumber}`}</strong> {post.title}
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
              <a className="usf-group" href={authorHref}>
                <span className="avatar-wrap smaller">
                  <span aria-hidden="true" className="avatar-placeholder" />
                </span>
                <strong className="name">{authorName}</strong>
                {post.authorLoginId ? (
                  <span className="loginid">
                    {" "}
                    <strong>@</strong>
                    {post.authorLoginId}
                  </span>
                ) : null}
              </a>
              <PostingHistoryModal
                historyMarkdown={post.historyMarkdown}
                basePath={props.runtimeConfig.basePath}
                issueReferences={post.issueReferences}
                linkLabel="change.history"
                mentionReferences={post.mentionReferences}
                ownerName={post.ownerName}
                projectName={post.projectName}
              />
            </div>
            {post.bodyMarkdown.trim() ? (
              <>
                <div className="hide" id={`post-${post.postNumber}`}>
                  <form
                    action={prefixBasePath(
                      props.runtimeConfig.basePath,
                      `/api/v1/projects/${post.ownerName}/${post.projectName}/posts/${post.postNumber}/content`,
                    )}
                  >
                    <textarea defaultValue={post.bodyMarkdown} />
                  </form>
                </div>
                <div id={`post-body-${post.postNumber}`}>
                  <MarkdownRenderer
                    className="content markdown-wrap"
                    basePath={props.runtimeConfig.basePath}
                    data-allowed-update={post.permissions.canUpdate ? "true" : "false"}
                    issueReferences={post.issueReferences}
                    markdown={translatedPostMarkdown ?? post.bodyMarkdown}
                    mentionReferences={post.mentionReferences}
                    ownerName={post.ownerName}
                    projectName={post.projectName}
                    showTasklistBar
                  />
                </div>
              </>
            ) : (
              <div className="content empty-content" />
            )}
            <div className="attachments" id="attachments" />
            <div className="board-actrow right-txt board-actions">
              <div className="pull-left">
                <div>
                  {post.permissions.canWatch ? (
                    <button
                      id="watch-button"
                      className={post.isWatching ? "ybtn ybtn-watching" : "ybtn"}
                      data-placement="top"
                      data-toggle="tooltip"
                      data-watching={post.isWatching ? "true" : "false"}
                      onClick={props.onWatchToggle}
                      title="issue.watch.description"
                      type="button"
                    >
                      {post.isWatching ? "post.unwatch" : "post.watch"}
                    </button>
                  ) : null}
                </div>
              </div>
              <span>
                <button
                  className="icon btn-transparent-with-fontsize-lineheight ml10"
                  data-toggle="tooltip"
                  disabled={translatingPost || translatedPostMarkdown !== null}
                  id="translate"
                  onClick={() => void translatePost()}
                  title="button.translation"
                  type="button"
                >
                  <i className="yobicon-lang" />
                </button>
                {post.permissions.canUpdate ? (
                  <a
                    aria-label="Edit"
                    className="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"
                    data-toggle="tooltip"
                    href={editPostHref}
                    title="button.edit"
                  >
                    <i className="yobicon-edit-2" />
                    <span className="sr-only">Edit</span>
                  </a>
                ) : (
                  <a href={editPostHref}>
                    <button
                      className="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"
                      data-toggle="tooltip"
                      title="button.show.original"
                      type="button"
                    >
                      <i className="yobicon-edit-2" />
                      <span className="sr-only">Edit</span>
                    </button>
                  </a>
                )}
                {post.permissions.canDelete ? (
                  <a href="#deleteConfirm" data-toggle="modal">
                    <button
                      className="icon btn-transparent-with-fontsize-lineheight ml6 danger"
                      data-toggle="tooltip"
                      onClick={props.onDeletePost}
                      title="button.delete"
                      type="button"
                    >
                      <i className="yobicon-trash" />
                      <span className="sr-only">Delete</span>
                    </button>
                  </a>
                ) : null}
              </span>
            </div>
            <div className="watcher-list" />
            <div className="board-comment-wrap" id="comments">
              <div id="timeline">
                <div className="timeline-list">
                  <div className="comment-header">
                    <i className="yobicon-comments" /> <strong>common.comment</strong>{" "}
                    <strong className="num">{post.comments.length}</strong>
                  </div>
                  <hr className="nm" />
                  <ul className="comments board-comments">
                    {topLevelComments.map((comment) => {
                      const canEdit = post.permissions.canUpdate || props.viewerId === comment.authorId;
                      const canDelete =
                        post.permissions.canDelete || props.viewerId === comment.authorId;
                      const childComments = childCommentsByParent.get(comment.id) ?? [];
                      const commentAuthorName =
                        comment.authorLabel || comment.authorLoginId || "common.noAuthor";
                      const commentAuthorHref = comment.authorLoginId
                        ? userInfoHref(props.runtimeConfig, comment.authorLoginId)
                        : "#";
                      const commentAction = boardPostCommentAction(
                        props.runtimeConfig,
                        post.ownerName,
                        post.projectName,
                        post.postNumber,
                        comment.id,
                      );
                      return (
                        <li
                          className={`comment board-comment${
                            comment.authorLoginId === post.authorLoginId ? " author" : ""
                          }`}
                          id={`comment-${comment.id}`}
                          key={comment.id}
                        >
                          <div className="comment-avatar">
                            <a
                              className="avatar-wrap"
                              data-placement="top"
                              data-toggle="tooltip"
                              href={commentAuthorHref}
                              title={commentAuthorName}
                            >
                              <span aria-hidden="true" className="avatar-placeholder" />
                            </a>
                          </div>
                          <div className="media-body">
                            <div className="meta-info">
                              <span className="comment_author">
                                <span className="resp-comment-avatar">
                                  <a
                                    className="avatar-wrap"
                                    data-placement="top"
                                    data-toggle="tooltip"
                                    href={commentAuthorHref}
                                    title={commentAuthorName}
                                  >
                                    <span aria-hidden="true" className="avatar-placeholder" />
                                  </a>
                                </span>
                                <a
                                  data-placement="top"
                                  data-toggle="tooltip"
                                  href={commentAuthorHref}
                                  title={comment.authorLoginId}
                                >
                                  <strong>{commentAuthorName}</strong>
                                </a>
                              </span>
                              <span className="ago-date">
                                <a
                                  className="ago"
                                  href={`#comment-${comment.id}`}
                                  title={comment.createdLabel}
                                >
                                  {comment.createdLabel}
                                </a>
                                <a
                                  className="share-link"
                                  href={`#comment-${comment.id}`}
                                  style={{ display: "none" }}
                                >
                                  [Link]
                                </a>
                              </span>
                              <span className="act-row pull-right">
                                <button
                                  className="icon btn-transparent ml10 comment-translate"
                                  data-comment-id={comment.id}
                                  data-toggle="tooltip"
                                  disabled={
                                    translatingCommentIds.has(comment.id) ||
                                    Boolean(translatedCommentMarkdownById[comment.id])
                                  }
                                  onClick={() => void translatePostComment(comment)}
                                  title="button.translation"
                                  type="button"
                                >
                                  <i className="yobicon-lang" />
                                </button>
                                {canEdit ? (
                                  <button
                                    aria-label="Edit"
                                    className="btn-transparent ml10"
                                    data-comment-id={comment.id}
                                    data-toggle="comment-edit"
                                    onClick={() => {
                                      setEditingCommentId(comment.id);
                                      setEditingCommentDraft(comment.contentsMarkdown);
                                      setEditingCommentAttachmentIds([]);
                                    }}
                                    title="common.comment.edit"
                                    type="button"
                                  >
                                    <i className="yobicon-edit-2" />
                                    <span className="sr-only">Edit</span>
                                  </button>
                                ) : null}
                                {canDelete ? (
                                  <button
                                    aria-label="Delete"
                                    className="btn-transparent ml6 danger"
                                    data-request-uri={commentAction}
                                    data-toggle="comment-delete"
                                    onClick={() => void props.onCommentDelete?.(comment.id)}
                                    title="common.comment.delete"
                                    type="button"
                                  >
                                    <i className="yobicon-trash" />
                                    <span className="sr-only">Delete</span>
                                  </button>
                                ) : null}
                              </span>
                            </div>
                            <div
                              className="comment-update-form"
                              hidden={editingCommentId !== comment.id}
                              id={`comment-editform-${comment.id}`}
                            >
                              <form
                                action={commentAction}
                                encType="multipart/form-data"
                                method="post"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  const contents = editingCommentDraft.trim();
                                  if (!contents) {
                                    return;
                                  }
                                  void props
                                    .onCommentUpdate?.(
                                      comment.id,
                                      contents,
                                      editingCommentAttachmentIds,
                                    )
                                    .then(() => {
                                      setEditingCommentAttachmentIds([]);
                                      setEditingCommentId(null);
                                    });
                                }}
                              >
                                <input name="id" type="hidden" value={comment.id} />
                                <div className="write-comment-box">
                                  <div className="write-comment-wrap">
                                    <LegacyMarkdownEditorShell
                                      editId={`edit-${comment.id}`}
                                      editorMode="update-comment-body"
                                      previewId={`preview-${comment.id}`}
                                    >
                                      <BoardMarkdownTextarea
                                        ariaLabel="Edit comment"
                                        className="editorSeries content comment nm"
                                        csrfToken={props.csrfToken}
                                        dataEditorMode="update-comment-body"
                                        id={`editor-contents-${comment.id}`}
                                        name={`contents-${comment.id}`}
                                        onAttachmentUpload={(attachment) =>
                                          setEditingCommentAttachmentIds((current) => [
                                            ...current,
                                            attachment.id,
                                          ])
                                        }
                                        onChange={setEditingCommentDraft}
                                        runtimeConfig={props.runtimeConfig}
                                        value={editingCommentDraft}
                                      />
                                    </LegacyMarkdownEditorShell>
                                    <div className="upload-drop-here">
                                      <div className="msg-wrap">
                                        <div className="msg">common.attach.dropFilesHere</div>
                                      </div>
                                    </div>
                                    <div className="right-txt comment-update-button upload-button-line">
                                      <button
                                        className="ybtn ybtn-cancel"
                                        data-comment-id={comment.id}
                                        onClick={() => setEditingCommentId(null)}
                                        type="button"
                                      >
                                        button.cancel
                                      </button>
                                      <button className="ybtn ybtn-info" type="submit">
                                        button.save
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <div className={`preview-${comment.id}`} />
                                <div
                                  data-resource-id={comment.id}
                                  data-resource-type="NONISSUE_COMMENT"
                                  id={`upload-${comment.id}`}
                                />
                              </form>
                            </div>
                            {editingCommentId === comment.id ? null : (
                              <div id={`comment-body-${comment.id}`}>
                                <MarkdownRenderer
                                  className="comment-body markdown-wrap"
                                  basePath={props.runtimeConfig.basePath}
                                  data-allowed-update={canEdit ? "true" : "false"}
                                  data-via-email={comment.viaEmail ? "true" : undefined}
                                  issueReferences={comment.issueReferences}
                                  markdown={
                                    translatedCommentMarkdownById[comment.id] ??
                                    comment.contentsMarkdown
                                  }
                                  mentionReferences={comment.mentionReferences}
                                  ownerName={post.ownerName}
                                  projectName={post.projectName}
                                  showTasklistBar
                                />
                                <div className="attachments" />
                              </div>
                            )}
                            <div className="add-a-comment pull-right">
                              comment.oneline.comment.placeholder
                            </div>
                            <div className="subcomment-media-body">
                              <div className="child-comments">
                                {childComments.map((childComment) => {
                                  const childAuthorName =
                                    childComment.authorLabel ||
                                    childComment.authorLoginId ||
                                    "common.noAuthor";
                                  const childAuthorHref = childComment.authorLoginId
                                    ? userInfoHref(props.runtimeConfig, childComment.authorLoginId)
                                    : "#";
                                  const childCanDelete =
                                    post.permissions.canDelete ||
                                    props.viewerId === childComment.authorId;
                                  return (
                                    <div className="one-line-comment" key={childComment.id}>
                                      <div className="contents">
                                        <MarkdownRenderer
                                          basePath={props.runtimeConfig.basePath}
                                          issueReferences={childComment.issueReferences}
                                          markdown={
                                            translatedCommentMarkdownById[childComment.id] ??
                                            childComment.contentsMarkdown
                                          }
                                          mentionReferences={childComment.mentionReferences}
                                          ownerName={post.ownerName}
                                          projectName={post.projectName}
                                        />
                                        <span className="subcomment-author hide">
                                          {" - "}
                                          <a
                                            className="usf-group"
                                            data-placement="top"
                                            data-toggle="tooltip"
                                            href={childAuthorHref}
                                            title={childComment.authorLoginId}
                                          >
                                            <strong>{childAuthorName}</strong>
                                          </a>{" "}
                                          <a
                                            className="ago"
                                            href={`#comment-${childComment.id}`}
                                            title={childComment.createdLabel}
                                          >
                                            {childComment.createdLabel}
                                          </a>
                                          {childCanDelete && props.onCommentDelete ? (
                                            <button
                                              className="btn-transparent deleteButtonX"
                                              data-request-uri={boardPostCommentAction(
                                                props.runtimeConfig,
                                                post.ownerName,
                                                post.projectName,
                                                post.postNumber,
                                                childComment.id,
                                              )}
                                              data-toggle="comment-delete"
                                              onClick={() =>
                                                void props.onCommentDelete?.(childComment.id)
                                              }
                                              title="common.comment.delete"
                                              type="button"
                                            >
                                              x
                                            </button>
                                          ) : null}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {post.permissions.canComment ? (
                                <div className="child-comment-input-form">
                                  <form
                                    action={boardPostCommentAction(
                                      props.runtimeConfig,
                                      post.ownerName,
                                      post.projectName,
                                      post.postNumber,
                                    )}
                                    encType="multipart/form-data"
                                    method="post"
                                    onSubmit={(event) => {
                                      event.preventDefault();
                                      const contents = (childCommentDrafts[comment.id] ?? "").trim();
                                      if (!contents) {
                                        return;
                                      }
                                      void props
                                        .onCommentSubmit?.(contents, [], comment.id)
                                        .then(() =>
                                          setChildCommentDrafts((current) => ({
                                            ...current,
                                            [comment.id]: "",
                                          })),
                                        );
                                    }}
                                  >
                                    <input
                                      className="parentCommentId"
                                      name="parentCommentId"
                                      type="hidden"
                                      value={comment.id}
                                    />
                                    <div className="oneline-comment-box">
                                      <textarea
                                        className="editorSeries"
                                        name="contents"
                                        onChange={(event) =>
                                          setChildCommentDrafts((current) => ({
                                            ...current,
                                            [comment.id]: event.target.value,
                                          }))
                                        }
                                        placeholder="comment.oneline.comment.placeholder (CTRL + ENTER)"
                                        rows={1}
                                        value={childCommentDrafts[comment.id] ?? ""}
                                        {...({
                                          markdown: "true",
                                        } as unknown as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
                                      />
                                      <button className="ybtn ybtn-success" type="submit">
                                        OK
                                      </button>
                                    </div>
                                    <div className="notification-receiver">
                                      <span className="notification-receiver-title">
                                        notification.receiver.list.title
                                      </span>
                                      <span className="notification-receiver-list"></span>
                                    </div>
                                  </form>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              {post.permissions.canComment ? (
                <form
                  action={boardPostCommentAction(
                    props.runtimeConfig,
                    post.ownerName,
                    post.projectName,
                    post.postNumber,
                  )}
                  className="board-comment-form"
                  encType="multipart/form-data"
                  id="comment-form"
                  method="post"
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
                  <div className="write-comment-box">
                    <BoardMarkdownTextarea
                      csrfToken={props.csrfToken}
                      id="editor-contents-comment-body"
                      name="contents"
                      onAttachmentUpload={(attachment) =>
                        setCommentAttachmentIds((current) => [...current, attachment.id])
                      }
                      onChange={setCommentDraft}
                      runtimeConfig={props.runtimeConfig}
                      value={commentDraft}
                    />
                    <div className="write-comment-wrap">
                      <div className="right-txt">
                        <button className="ybtn hidden" id="dynamic-comment-btn" type="button" />
                        <button className="ybtn ybtn-success" type="submit">
                          button.comment.new
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <div
                  className="write-comment-box mt20"
                  data-login="required"
                  title="error.auth.unauthorized.comment"
                >
                  <div className="write-comment-wrap">
                    <div className="textarea-box">
                      <textarea className="comment disabled" disabled style={{ cursor: "text" }} />
                    </div>
                    <div className="right-txt mt10">
                      <span className="ybtn ybtn-disabled">button.comment.new</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="span3 span-right-pane mb20">
            <div className="issue-info board-labels">
              <dl>
                {post.permissions.canCreate ? (
                  <dd className="project-btn-item">
                    <a
                      className="ybtn ybtn-success"
                      href={prefixBasePath(
                        props.runtimeConfig.basePath,
                        `/${post.ownerName}/${post.projectName}/postform`,
                      )}
                    >
                      post.write
                    </a>
                  </dd>
                ) : null}
              </dl>
              {boardLabels(post.labels)}
              <div className="right-menu-icons">
                <a href={editPostHref}>
                  <button
                    className="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"
                    data-toggle="tooltip"
                    title={post.permissions.canUpdate ? "button.edit" : "button.show.original"}
                    type="button"
                  >
                    <i className="yobicon-edit-2" />
                    <span className="sr-only">Edit</span>
                  </button>
                </a>
                {post.permissions.canDelete ? (
                  <a href="#deleteConfirm" data-toggle="modal">
                    <button
                      className="icon btn-transparent-with-fontsize-lineheight ml6 danger"
                      data-toggle="tooltip"
                      onClick={props.onDeletePost}
                      title="button.delete"
                      type="button"
                    >
                      <i className="yobicon-trash" />
                      <span className="sr-only">Delete</span>
                    </button>
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="board-footer" />
      </div>
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
  onlineCommit?: {
    branch: string;
    edit: boolean;
    issueTemplate: boolean;
    path: string;
    preparedBodyMarkdown: string;
    title: string;
  };
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
    newFileName?: string;
  }) => Promise<void>;
}) {
  const onlineCommit = props.onlineCommit;
  const isOnlineCommit = Boolean(onlineCommit?.path || onlineCommit?.issueTemplate);
  const [title, setTitle] = React.useState(props.initialPost?.title ?? onlineCommit?.title ?? "");
  const [bodyMarkdown, setBodyMarkdown] = React.useState(
    props.initialPost?.bodyMarkdown ?? onlineCommit?.preparedBodyMarkdown ?? "",
  );
  const [newFileName, setNewFileName] = React.useState("");
  const [attachmentIds, setAttachmentIds] = React.useState<number[]>([]);
  const [notice, setNotice] = React.useState(props.initialPost?.notice ?? false);
  const [readme, setReadme] = React.useState(props.initialPost?.readme ?? false);
  const [selectedLabelIds, setSelectedLabelIds] = React.useState(
    () => new Set((props.initialPost?.labels ?? []).map((label) => label.id)),
  );

  React.useEffect(() => {
    setTitle(props.initialPost?.title ?? onlineCommit?.title ?? "");
    setBodyMarkdown(props.initialPost?.bodyMarkdown ?? onlineCommit?.preparedBodyMarkdown ?? "");
    setNewFileName("");
    setAttachmentIds([]);
    setNotice(props.initialPost?.notice ?? false);
    setReadme(props.initialPost?.readme ?? false);
    setSelectedLabelIds(new Set((props.initialPost?.labels ?? []).map((label) => label.id)));
  }, [props.initialPost, onlineCommit?.preparedBodyMarkdown, onlineCommit?.title]);

  const formAction =
    props.mode === "edit" && props.initialPost?.postNumber
      ? prefixBasePath(
          props.runtimeConfig.basePath,
          `/${props.ownerName}/${props.projectName}/post/${props.initialPost.postNumber}`,
        )
      : prefixBasePath(props.runtimeConfig.basePath, `/${props.ownerName}/${props.projectName}/post`);
  const titlePlaceholder = isOnlineCommit ? "code.commitMsg" : "title";
  const textareaTabIndex = props.mode === "create" ? 3 : 2;

  return (
    <main className="app-shell board-page page-wrap-outer">
      <h1 className="sr-only">{props.mode === "create" ? "New post" : "Edit post"}</h1>
      <div className="project-page-wrap">
      <form
        action={formAction}
        className="nm board-form"
        encType="multipart/form-data"
        method="post"
        onSubmit={(event) => {
          event.preventDefault();
          void props.onSubmit({
            attachmentIds,
            bodyMarkdown,
            labelIds: [...selectedLabelIds],
            newFileName,
            notice,
            readme,
            title,
          });
        }}
      >
        <div className="content-wrap frm-wrap">
          <dl>
            {props.mode === "edit" ? (
              <dt>
                <label htmlFor="title">title</label>
              </dt>
            ) : null}
            <dd>
              <input
                autoComplete="off"
                className="zen-mode text title"
                id="title"
                maxLength={250}
                name="title"
                onChange={(event) => setTitle(event.target.value)}
                placeholder={titlePlaceholder}
                required
                tabIndex={1}
                type="text"
                value={title}
              />
            </dd>
            <dd>
              {onlineCommit?.issueTemplate ? (
                <div className="attach-wrap">
                  <span className="help help-droppable">
                    issue.template.no.attachment.allow
                  </span>
                </div>
              ) : null}
              {isOnlineCommit ? (
                <div className="file-path-wrap">
                  <span className="help file-path">
                    {onlineCommit?.branch}: /{onlineCommit?.path}{" "}
                    {!onlineCommit?.edit && !onlineCommit?.issueTemplate ? (
                      <input
                        className="new-file-name"
                        name="new-file-name"
                        onChange={(event) => setNewFileName(event.target.value)}
                        placeholder="filename.."
                        required
                        tabIndex={2}
                        type="text"
                        value={newFileName}
                      />
                    ) : null}
                  </span>
                </div>
              ) : null}
            </dd>
            <dd style={{ position: "relative" }}>
              <span className="sr-only" id="board-post-body-label">
                Body
              </span>
              <LegacyMarkdownEditorShell
                editId="edit-content-body"
                editorMode="content-body"
                previewId="preview-content-body"
              >
                <BoardMarkdownTextarea
                  ariaLabel="Body"
                  className="editorSeries content comment nm"
                  csrfToken={props.csrfToken}
                  dataEditorMode="content-body"
                  id="editor-body-content-body"
                  name="body"
                  onAttachmentUpload={(attachment) =>
                    setAttachmentIds((current) => [...current, attachment.id])
                  }
                  onChange={setBodyMarkdown}
                  runtimeConfig={props.runtimeConfig}
                  value={bodyMarkdown}
                />
              </LegacyMarkdownEditorShell>
            </dd>
          </dl>
          {props.labels.length && !isOnlineCommit ? (
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
          <div className="right-txt mt10 mb10">
            {props.canMarkNotice && !isOnlineCommit ? (
              <label className="checkbox">
                <input
                  checked={notice}
                  id="notice"
                  name="notice"
                  onChange={(event) => setNotice(event.target.checked)}
                  type="checkbox"
                />
                post.notice.label
              </label>
            ) : null}
            <input
              id="issueTemplate"
              name="issueTemplate"
              type="hidden"
              value={onlineCommit?.issueTemplate ? "true" : ""}
            />
            <input id="branch" name="branch" type="hidden" value={onlineCommit?.branch ?? ""} />
            <input
              id="path"
              name="path"
              type="hidden"
              value={
                isOnlineCommit && !onlineCommit?.edit && !onlineCommit?.issueTemplate
                  ? `${onlineCommit?.path ?? ""}${newFileName}`
                  : (onlineCommit?.path ?? "")
              }
            />
            <input id="lineEnding" name="lineEnding" type="hidden" value="LF" />
            {props.canMarkReadme && !isOnlineCommit ? (
              <label className="checkbox">
                <input
                  checked={readme}
                  id="readme"
                  name="readme"
                  onChange={(event) => setReadme(event.target.checked)}
                  type="checkbox"
                />
                post.readmefy
              </label>
            ) : null}
          </div>
          <div className="actions board-actions">
            {props.mode === "edit" && !props.initialPost?.readme ? (
              <span className="send-notification-check">
                <label className="checkbox inline">
                  <input
                    defaultChecked
                    id="notificationMail"
                    name="notificationMail"
                    type="checkbox"
                    value="yes"
                  />
                  <strong>notification.send.mail</strong>
                </label>
              </span>
            ) : null}
            <button
              className={props.mode === "edit" ? "ybtn ybtn-info" : "ybtn ybtn-success"}
              tabIndex={3}
              type="submit"
            >
              button.save
            </button>
            <a
              className="ybtn"
              href={buildProjectHref(
                props.runtimeConfig,
                props.ownerName,
                props.projectName,
                "posts",
              )}
              tabIndex={4}
            >
              button.cancel
            </a>
          </div>
        </div>
      </form>
      </div>
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
  const totalRows = props.boards?.items.length ?? 0;

  return (
    <main className="app-shell board-page page-wrap-outer">
      <div className="project-page-wrap">
        <div className="search-wrap underline board-toolbar">
          <form action={action} className="pull-left" id="option_form" method="get">
            <input defaultValue={props.orderBy} name="orderBy" type="hidden" />
            <input defaultValue={props.orderDir} name="orderDir" type="hidden" />
            <div className="project-selects span7">
              <select
                aria-label="Projects"
                data-container-css-class="fullsize"
                data-format="projects"
                data-placeholder="organization.choose.projects"
                data-toggle="select2"
                defaultValue={props.projectNames}
                id="projects"
                key={`${props.projectNames.join(",")}-${props.boards?.visibleProjects.length ?? 0}`}
                multiple
                name="projectNames[]"
              >
                {(props.boards?.visibleProjects ?? []).map((project) => (
                  <option
                    data-avatar-url=""
                    key={project.projectName}
                    value={project.projectName}
                  >
                    {project.projectName}
                  </option>
                ))}
              </select>
            </div>
            <div className="search-bar span4">
              <input
                className="textbox group-board"
                defaultValue={props.filter}
                name="filter"
                placeholder="title.searchByKeyword"
                type="text"
              />
              <button className="search-btn" type="submit">
                <i className="yobicon-search" />
              </button>
            </div>
            <div className="two-column-mode-checkbox-area" />
          </form>
        </div>
        {totalRows === 0 ? (
          <div className="error-wrap">
            <i className="ico ico-err1" />
            <p>post.is.empty</p>
          </div>
        ) : (
          <>
            {props.boards && props.boards.totalCount > 1 ? (
              <BoardSortLinks
                basePathname={`/organizations/${props.organizationName}/boards`}
                filter={props.filter}
                orderBy={props.orderBy}
                orderDir={props.orderDir}
                projectNames={props.projectNames}
                runtimeConfig={props.runtimeConfig}
              />
            ) : null}
            <PostRows
              items={props.boards?.items ?? []}
              runtimeConfig={props.runtimeConfig}
              showProject
            />
          </>
        )}
        <div className="write-btn-wrap" />
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
        ) : (
          <div className="page-navigation-wrap" id="pagination" />
        )}
      </div>
    </main>
  );
}
