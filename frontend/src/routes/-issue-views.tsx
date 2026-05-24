import * as React from "react";
import type {
  IssueAssignableUserItem,
  IssueAssignableUsersResponse,
  IssueMentionUserItem,
  IssueMentionUserSearchContext,
  IssueMentionUsersResponse,
  ProjectIssueReferenceItem,
  ProjectIssueReferencesResponse,
} from "../api/issue-meta";
import { uploadTemporaryAttachment, type UploadedAttachment } from "../api/attachments";
import type { RuntimeConfig } from "../runtime-config";
import { MarkdownRenderer } from "./-markdown-renderer";
import { buildProjectHref, ProjectMenu } from "./-project-views";
import type {
  ProjectDetailViewModel,
  ProjectIssueDetailViewModel,
  ProjectIssueListViewModel,
  UserIssueListViewModel,
} from "./-view-models";
import { prefixBasePath } from "../runtime-config";

type IssueTimelineCommentViewModel = NonNullable<
  ProjectIssueDetailViewModel["timeline"][number]["comment"]
>;

function fallbackProjectDetail(): ProjectDetailViewModel {
  return {
    enrollmentRequested: false,
    isFavorited: false,
    organizationName: "",
    overview: "",
    ownerName: "",
    projectName: "",
    projectScope: "public",
    viewerCanEnroll: false,
    viewerCanUpdate: false,
  };
}

function PostingHistoryModal(props: { historyMarkdown?: string; linkLabel: string }) {
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
        <MarkdownRenderer className="modal-body" markdown={historyMarkdown} />
        <div className="modal-footer">
          <button className="ybtn ybtn-info ybtn-small" data-dismiss="modal" type="button">
            button.confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function IssueCommentAvatar(props: {
  basePath: string;
  className?: string;
  comment: IssueTimelineCommentViewModel;
}) {
  const authorLoginId = props.comment.authorLoginId.trim();
  const authorLabel = props.comment.authorLabel || authorLoginId || "anonymous";
  const href = authorLoginId ? prefixBasePath(props.basePath, `/${authorLoginId}`) : "#";
  const fallbackLabel = authorLabel.slice(0, 1).toUpperCase() || "?";

  return (
    <a
      className={props.className ?? "avatar-wrap"}
      data-placement="top"
      data-toggle="tooltip"
      href={href}
      title={authorLoginId || authorLabel}
    >
      {props.comment.authorAvatarUrl ? (
        <img alt={authorLabel} height={32} src={props.comment.authorAvatarUrl} width={32} />
      ) : (
        <span>{fallbackLabel}</span>
      )}
    </a>
  );
}

export function ProjectIssueListPage(props: {
  detail: ProjectDetailViewModel | null;
  labels?: IssueListFilterLabel[];
  issueList: ProjectIssueListViewModel | null;
  milestones?: IssueListFilterMilestone[];
  query?: ProjectIssueListQuery;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const query = props.query ?? {
    assigneeLoginId: "",
    authorLoginId: "",
    labelIds: [],
    milestoneId: 0,
    pageNum: 1,
    state: "",
  };
  const selectedLabelIds = query.labelIds.map(String);

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Issue List</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <section>
        <form
          className="issue-search-form"
          action={buildProjectHref(
            props.runtimeConfig,
            detail.ownerName,
            detail.projectName,
            "issues",
          )}
        >
          <input name="pageNum" type="hidden" value="1" />
          {query.assigneeId !== undefined ? (
            <input name="assigneeId" type="hidden" value={query.assigneeId} />
          ) : null}
          <select name="state" defaultValue={query.state}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <input name="authorLoginId" placeholder="Author" defaultValue={query.authorLoginId} />
          <input
            name="assigneeLoginId"
            placeholder="Assignee"
            defaultValue={query.assigneeLoginId}
          />
          <select
            name="milestoneId"
            defaultValue={query.milestoneId ? String(query.milestoneId) : ""}
          >
            <option value="">All milestones</option>
            {(props.milestones ?? []).map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Labels"
            className="issue-label-filter"
            defaultValue={selectedLabelIds}
            multiple
            name="labelIds"
          >
            {(props.labels ?? []).map((label) => (
              <option key={label.id} value={label.id}>
                {label.categoryName ? `${label.categoryName}: ${label.name}` : label.name}
              </option>
            ))}
          </select>
          <button type="submit">Search</button>
        </form>
        <a
          className="ybtn ybtn-success"
          href={buildProjectHref(
            props.runtimeConfig,
            detail.ownerName,
            detail.projectName,
            "issueform",
          )}
        >
          New Issue
        </a>
      </section>
      <section>
        <p>{`Total ${props.issueList?.totalCount ?? 0}`}</p>
        <ul>
          {(props.issueList?.items ?? []).map((item) => (
            <li key={item.issueNumber}>
              <input
                aria-label={`select issue ${item.issueNumber}`}
                type="checkbox"
                value={item.issueNumber}
              />
              <a
                href={buildProjectHref(
                  props.runtimeConfig,
                  detail.ownerName,
                  detail.projectName,
                  `issue/${item.issueNumber}`,
                )}
              >
                {item.title}
              </a>
              <span>{item.state}</span>
              <span>{`Author: ${item.authorLabel || "Unknown"}`}</span>
              <span>{`Assignee: ${item.assigneeLabel || "none"}`}</span>
              <span>{`Milestone: ${item.milestoneTitle || "none"}`}</span>
              <span>{`Comments: ${item.commentCount}`}</span>
              <span>{`Votes: ${item.voterCount}`}</span>
              <span>{`Watchers: ${item.watcherCount}`}</span>
              <span>{item.updatedLabel}</span>
              {item.labels.map((label) => (
                <span key={label.id} style={{ backgroundColor: label.color || "#ddd" }}>
                  {label.name}
                </span>
              ))}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export interface ProjectIssueListQuery {
  assigneeId?: number;
  assigneeLoginId: string;
  authorLoginId: string;
  labelIds: number[];
  milestoneId: number;
  pageNum: number;
  state: string;
}

export interface IssueListFilterLabel {
  categoryName: string;
  color: string;
  id: number;
  name: string;
}

export interface IssueListFilterMilestone {
  id: number;
  state: string;
  title: string;
}

export function ProjectIssueDetailPage(props: {
  detail: ProjectDetailViewModel | null;
  getIssueReferencesQueryOptions?: IssueReferenceQueryOptionsFactory;
  issue: ProjectIssueDetailViewModel | null;
  onAssign?: (assigneeLoginId: string) => Promise<void>;
  onSearchAssignableUsers?: (query: string) => Promise<IssueAssignableUsersResponse>;
  onSearchMentionUsers?: (
    query: string,
    context: IssueMentionUserSearchContext,
  ) => Promise<IssueMentionUsersResponse>;
  onSearchSharableUsers?: (query: string) => Promise<IssueAssignableUsersResponse>;
  onCommentDelete?: (commentId: number) => Promise<void>;
  onCommentSubmit?: (contentsMarkdown: string, attachmentIds?: number[]) => Promise<void>;
  onCommentUpdate?: (
    commentId: number,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void>;
  onCommentVoteToggle?: (commentId: number, viewerHasVoted: boolean) => Promise<void>;
  onDeleteIssue?: () => Promise<void>;
  onFavoriteToggle?: () => Promise<void>;
  onShareIssue?: (loginId: string, targetType?: IssueAssignableUserItem["type"]) => Promise<void>;
  onStateChange?: (state: string) => Promise<void>;
  onUnshareIssue?: (loginId: string) => Promise<void>;
  onVoteToggle?: () => Promise<void>;
  onWatchToggle?: () => Promise<void>;
  csrfToken?: string;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const issue = props.issue;
  const onDeleteIssue = props.onDeleteIssue;
  const onStateChange = props.onStateChange;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [commentDeleteTargetId, setCommentDeleteTargetId] = React.useState<number | null>(null);
  const [editingCommentIds, setEditingCommentIds] = React.useState<Set<number>>(() => new Set());
  const issueAuthorLoginId = issue?.authorLoginId ?? "";
  const issueAuthorLabel = issue?.authorLabel || issueAuthorLoginId || "Unknown";
  const issueAuthorHref = issueAuthorLoginId
    ? prefixBasePath(props.runtimeConfig.basePath, `/${issueAuthorLoginId}`)
    : "#";
  const issueAssigneeLoginId = issue?.assigneeLoginId ?? "";
  const issueAssigneeLabel = issue?.assigneeLabel || issueAssigneeLoginId || "issue.noAssignee";
  const issueAssigneeHref = issueAssigneeLoginId
    ? prefixBasePath(props.runtimeConfig.basePath, `/${issueAssigneeLoginId}`)
    : "#";
  const issueState = issue?.state ?? "";
  const issueStateClass = issueState.toLowerCase();
  const issueTitle = issue?.title ?? "Issue";
  const issueNumberLabel = issue ? `#${issue.issueNumber}` : "";
  const issueNumber = issue?.issueNumber ?? 0;
  const voteWrapClass = issue && issue.voterCount > 0 ? "vote-wrap voter-exists" : "vote-wrap";
  const commentDeleteRequestUri =
    issue && commentDeleteTargetId !== null
      ? buildProjectHref(
          props.runtimeConfig,
          detail.ownerName,
          detail.projectName,
          `issue/${issue.issueNumber}/comment/${commentDeleteTargetId}/delete`,
        )
      : undefined;

  return (
    <main className="app-shell issue-detail-page page-wrap-outer">
      <p className="eyebrow">Yona Rust Project</p>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="project-page-wrap board-view">
        <header className="board-header issue">
          <div className="pull-right mr10 mt10 hide-in-mobile">
            {issueState ? (
              <span className={`badge badge-issue-${issueStateClass}`}>{issueState}</span>
            ) : null}
          </div>
          <div className="title">
            {issueNumberLabel ? <strong className="board-id">{issueNumberLabel}</strong> : null}
            <h1>
              {issueTitle}
              {issue && props.onFavoriteToggle ? (
                <button
                  aria-label={issue.isFavorited ? "Unfavorite issue" : "Favorite issue"}
                  className="favorite-issue"
                  onClick={() => void props.onFavoriteToggle?.()}
                  type="button"
                >
                  <span
                    className={`${
                      issue.isFavorited ? "starred " : ""
                    }star material-icons va-text-top`}
                  >
                    star
                  </span>
                </button>
              ) : null}
            </h1>
            {issueState ? (
              <div className="pull-right hide show-in-mobile">
                <span className={`badge badge-small badge-issue-${issueStateClass}`}>
                  {issueState}
                </span>
              </div>
            ) : null}
          </div>
          {issue ? (
            <PostingHistoryModal
              historyMarkdown={issue.historyMarkdown}
              linkLabel="change.edited"
            />
          ) : null}
        </header>
        <div className="board-body row-fluid">
          <div className="span9 span-left-pane">
            <div className="author-info">
              <a className="usf-group" href={issueAuthorHref}>
                <span className="avatar-wrap smaller">
                  {issue?.authorAvatarUrl ? (
                    <img
                      alt={issueAuthorLabel}
                      height={20}
                      src={issue.authorAvatarUrl}
                      width={20}
                    />
                  ) : null}
                </span>
                <strong className="name">{issueAuthorLabel}</strong>
                {issueAuthorLoginId ? (
                  <span className="loginid">
                    {" "}
                    <strong>@</strong>
                    {issueAuthorLoginId}
                  </span>
                ) : null}
              </a>
            </div>
            <div id={issue ? `issue-body-${issue.issueNumber}` : undefined}>
              <MarkdownRenderer
                className="content markdown-wrap"
                basePath={props.runtimeConfig.basePath}
                data-allowed-update={issue ? String(issue.viewerCanUpdate) : undefined}
                issueReferences={issue?.issueReferences}
                markdown={issue?.bodyMarkdown ?? ""}
                ownerName={detail.ownerName}
                projectName={detail.projectName}
                showTasklistBar
              />
            </div>
            <div className="attachments" id="attachments">
              {(issue?.attachments ?? []).map((attachment) => (
                <a href={attachment.url} key={attachment.id}>
                  {attachment.name}
                </a>
              ))}
            </div>
            <div className="board-actrow right-txt">
              <div className="pull-left">
                {issue && props.onWatchToggle ? (
                  <button
                    className={`ybtn${issue.isWatching ? " ybtn-watching" : ""}`}
                    data-watching={String(issue.isWatching)}
                    id="watch-button"
                    onClick={() => void props.onWatchToggle?.()}
                    title="issue.watch.description"
                    type="button"
                  >
                    {issue.isWatching ? "Unwatch" : "Watch"}
                  </button>
                ) : null}
              </div>
              {issue ? (
                <div className={voteWrapClass} id="vote">
                  {props.onVoteToggle ? (
                    <button
                      className={`ybtn${issue.hasVoted ? " ybtn-watching" : ""}`}
                      data-request-method="post"
                      data-toggle="tooltip"
                      onClick={() => void props.onVoteToggle?.()}
                      title={issue.hasVoted ? "issue.unvote.description" : "issue.vote.description"}
                      type="button"
                    >
                      <span className="heart">
                        <i className="yobicon-hearts"></i>
                      </span>
                      {issue.hasVoted ? "Unvote" : "Vote"}
                    </button>
                  ) : null}
                  <span className="voter-count">{`Voters: ${issue.voterCount}`}</span>
                </div>
              ) : null}
              <span className="act-row">
                {issue?.viewerCanUpdate ? (
                  <a
                    className="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"
                    href={buildProjectHref(
                      props.runtimeConfig,
                      detail.ownerName,
                      detail.projectName,
                      `issue/${issue.issueNumber}/editform`,
                    )}
                    title="button.edit"
                  >
                    <i className="yobicon-edit-2"></i>
                    Edit
                  </a>
                ) : null}
                {issue?.viewerCanUpdate && onStateChange ? (
                  <button
                    className="ybtn"
                    onClick={() => void onStateChange(issue.state === "open" ? "closed" : "open")}
                    type="button"
                  >
                    {issue.state === "open" ? "Close" : "Reopen"}
                  </button>
                ) : null}
                {issue?.viewerCanDelete && onDeleteIssue ? (
                  <a
                    data-toggle="modal"
                    href="#deleteConfirm"
                    onClick={(event) => {
                      event.preventDefault();
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    <button
                      className="icon btn-transparent-with-fontsize-lineheight ml6"
                      title="button.delete"
                      type="button"
                    >
                      <i className="yobicon-trash"></i>
                      Delete
                    </button>
                  </a>
                ) : null}
              </span>
            </div>
            <section className="board-comment-wrap" id="comments">
              <div id="timeline">
                <div className="timeline-list">
                  <div className="comment-header">
                    <i></i>
                    <strong>common.comment</strong>{" "}
                    <strong className="num">{issue?.commentCount ?? 0}</strong>
                  </div>
                  <hr className="nm" />
                  <ul className="comments">
                    {(issue?.timeline ?? []).map((item) => {
                      if (item.kind !== "comment" || !item.comment) {
                        return (
                          <IssueTimelineEvent
                            basePath={props.runtimeConfig.basePath}
                            item={item}
                            key={`${item.kind}-${item.id}`}
                          />
                        );
                      }

                      const comment = item.comment;
                      const authorLoginId = comment.authorLoginId || comment.authorLabel;
                      const commentEditAction = buildProjectHref(
                        props.runtimeConfig,
                        detail.ownerName,
                        detail.projectName,
                        `issue/${issueNumber}/comments/${comment.id}`,
                      );
                      const commentIsEditing = editingCommentIds.has(comment.id);
                      const commentDeleteUri = buildProjectHref(
                        props.runtimeConfig,
                        detail.ownerName,
                        detail.projectName,
                        `issue/${issueNumber}/comment/${comment.id}/delete`,
                      );
                      const commentVoteUri = buildProjectHref(
                        props.runtimeConfig,
                        detail.ownerName,
                        detail.projectName,
                        `issue/${issueNumber}/comment/${comment.id}/${
                          comment.viewerHasVoted ? "unvote" : "vote"
                        }`,
                      );
                      const newIssueByCommentHref = `${prefixBasePath(
                        props.runtimeConfig.basePath,
                        "/user/issues/new",
                      )}?commentId=${comment.id}`;

                      return (
                        <li
                          className="comment"
                          id={`comment-${comment.id}`}
                          key={`${item.kind}-${item.id}`}
                        >
                          <div className="comment-avatar">
                            <IssueCommentAvatar
                              basePath={props.runtimeConfig.basePath}
                              comment={comment}
                            />
                          </div>
                          <div className="media-body">
                            <div className="meta-info">
                              <span className="comment_author">
                                <span className="resp-comment-avatar">
                                  <IssueCommentAvatar
                                    basePath={props.runtimeConfig.basePath}
                                    comment={comment}
                                  />
                                </span>
                                <a
                                  data-placement="top"
                                  data-toggle="tooltip"
                                  href={
                                    authorLoginId
                                      ? prefixBasePath(
                                          props.runtimeConfig.basePath,
                                          `/${authorLoginId}`,
                                        )
                                      : "#"
                                  }
                                  title={comment.authorLoginId || comment.authorLabel}
                                >
                                  <strong>{comment.authorLabel || comment.authorLoginId}</strong>
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
                                <span className="new-issue-by">
                                  <a href={newIssueByCommentHref}>issue.menu.new.by</a>
                                </span>
                                <span className="comment-vote-row">
                                  {comment.voterCount > 0 ? (
                                    <span className="comment-vote-count">
                                      {commentAgreementLabel(comment.voterCount)}
                                    </span>
                                  ) : null}
                                  {comment.voters.map((voter) => (
                                    <span
                                      className="comment-voter"
                                      key={voter.userId}
                                      title={voter.userLabel}
                                    >
                                      {voter.avatarUrl ? (
                                        <img
                                          alt={`${voter.userLabel} avatar`}
                                          src={voter.avatarUrl}
                                        />
                                      ) : null}
                                      <span>{voter.userLabel || voter.loginId}</span>
                                    </span>
                                  ))}
                                  {issue?.viewerCanComment && props.onCommentVoteToggle ? (
                                    <button
                                      aria-label={
                                        comment.viewerHasVoted
                                          ? "Withdraw comment agreement"
                                          : "Agree with comment"
                                      }
                                      className="comment-vote btn-transparent-with-fontsize-lineheight"
                                      data-request-type="comment-vote"
                                      data-request-uri={commentVoteUri}
                                      onClick={() =>
                                        void props.onCommentVoteToggle?.(
                                          comment.id,
                                          comment.viewerHasVoted,
                                        )
                                      }
                                      title={
                                        comment.viewerHasVoted
                                          ? "common.comment.unvote"
                                          : "common.comment.vote"
                                      }
                                      type="button"
                                    >
                                      <span
                                        className={`yobicon-hearts ${
                                          comment.viewerHasVoted
                                            ? "vote-heart-on"
                                            : "vote-heart-off"
                                        }`}
                                      />
                                    </button>
                                  ) : null}
                                </span>
                                {comment.viewerCanUpdate && props.onCommentUpdate ? (
                                  <button
                                    className="btn-transparent-with-fontsize-lineheight ml10"
                                    data-comment-id={comment.id}
                                    data-toggle="comment-edit"
                                    onClick={() =>
                                      setEditingCommentIds((current) => {
                                        const next = new Set(current);
                                        next.add(comment.id);
                                        return next;
                                      })
                                    }
                                    title="common.comment.edit"
                                    type="button"
                                  >
                                    <i className="yobicon-edit-2"></i>
                                  </button>
                                ) : null}
                                {comment.viewerCanDelete && props.onCommentDelete ? (
                                  <button
                                    className="btn-transparent-with-fontsize-lineheight ml6"
                                    data-request-uri={commentDeleteUri}
                                    data-toggle="comment-delete"
                                    onClick={() => setCommentDeleteTargetId(comment.id)}
                                    title="common.comment.delete"
                                    type="button"
                                  >
                                    <i className="yobicon-trash"></i>
                                  </button>
                                ) : null}
                              </span>
                            </div>
                            {comment.viewerCanUpdate &&
                            props.onCommentUpdate &&
                            commentIsEditing ? (
                              <IssueCommentEditForm
                                action={commentEditAction}
                                commentId={comment.id}
                                csrfToken={props.csrfToken}
                                getIssueReferencesQueryOptions={
                                  props.getIssueReferencesQueryOptions
                                }
                                initialContents={comment.contentsMarkdown}
                                onCancel={() =>
                                  setEditingCommentIds((current) => {
                                    const next = new Set(current);
                                    next.delete(comment.id);
                                    return next;
                                  })
                                }
                                onSearchMentionUsers={props.onSearchMentionUsers}
                                onSubmit={props.onCommentUpdate}
                                runtimeConfig={props.runtimeConfig}
                              />
                            ) : null}
                            <div
                              id={`comment-body-${comment.id}`}
                              style={commentIsEditing ? { display: "none" } : undefined}
                            >
                              <MarkdownRenderer
                                className="comment-body markdown-wrap"
                                basePath={props.runtimeConfig.basePath}
                                data-allowed-update={String(comment.viewerCanUpdate)}
                                data-via-email={comment.viaEmail ? "true" : undefined}
                                issueReferences={comment.issueReferences}
                                markdown={comment.contentsMarkdown}
                                ownerName={detail.ownerName}
                                projectName={detail.projectName}
                                showTasklistBar
                              />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              {issue?.viewerCanComment && props.onCommentSubmit ? (
                <IssueCommentForm
                  csrfToken={props.csrfToken}
                  getIssueReferencesQueryOptions={props.getIssueReferencesQueryOptions}
                  onSearchMentionUsers={props.onSearchMentionUsers}
                  onSubmit={props.onCommentSubmit}
                  runtimeConfig={props.runtimeConfig}
                />
              ) : null}
            </section>
          </div>
          <aside className="span3 right-menu">
            <div className="assignee-info">
              {issueAssigneeLoginId ? (
                <a className="usf-group" href={issueAssigneeHref}>
                  <span className="avatar-wrap smaller">
                    {issue?.assigneeAvatarUrl ? (
                      <img
                        alt={issueAssigneeLabel}
                        height={20}
                        src={issue.assigneeAvatarUrl}
                        width={20}
                      />
                    ) : null}
                  </span>
                  <strong className="name">{issueAssigneeLabel}</strong>
                  <span className="loginid">
                    {" "}
                    <strong>@</strong>
                    {issueAssigneeLoginId}
                  </span>
                </a>
              ) : (
                <div>{issueAssigneeLabel}</div>
              )}
            </div>
            <dl className="issue-info">
              <dt>issue.milestone</dt>
              <dd>{issue?.milestoneTitle || "issue.noMilestone"}</dd>
            </dl>
            <div className="watcher-list">{`Watchers: ${issue?.watcherCount ?? 0}`}</div>
            <div className="issue-labels">
              {issue?.labels.map((label) => (
                <span
                  className="label issue-label list-label active"
                  key={label.id}
                  style={{ backgroundColor: label.color || "#ddd" }}
                >
                  {label.name}
                </span>
              ))}
            </div>
            {issue?.viewerCanUpdate && props.onAssign ? (
              <IssueAssignForm
                initialAssignee={issue.assigneeLoginId}
                onSearchAssignableUsers={props.onSearchAssignableUsers}
                onSubmit={props.onAssign}
              />
            ) : null}
            {issue ? (
              <IssueSharerPanel
                issue={issue}
                onSearchSharableUsers={props.onSearchSharableUsers}
                onShareIssue={issue.viewerCanManageSharers ? props.onShareIssue : undefined}
                onUnshareIssue={issue.viewerCanManageSharers ? props.onUnshareIssue : undefined}
              />
            ) : null}
          </aside>
        </div>
        {issue?.viewerCanDelete && onDeleteIssue ? (
          <div
            aria-hidden={deleteConfirmOpen ? "false" : "true"}
            className={`modal hide fade${deleteConfirmOpen ? " in" : ""}`}
            id="deleteConfirm"
            style={deleteConfirmOpen ? { display: "block" } : undefined}
          >
            <div className="modal-header">
              <button className="close" onClick={() => setDeleteConfirmOpen(false)} type="button">
                x
              </button>
              <h3>issue.delete</h3>
            </div>
            <div className="modal-body">
              <p>post.delete.confirm</p>
            </div>
            <div className="modal-footer">
              <button
                className="ybtn ybtn-danger"
                data-request-method="delete"
                onClick={() => void onDeleteIssue()}
                type="button"
              >
                button.yes
              </button>
              <button className="ybtn" onClick={() => setDeleteConfirmOpen(false)} type="button">
                button.no
              </button>
            </div>
          </div>
        ) : null}
        {issue ? (
          <div
            aria-hidden={commentDeleteTargetId === null ? "true" : "false"}
            className={`modal hide fade${commentDeleteTargetId !== null ? " in" : ""}`}
            id="comment-delete-modal"
            style={commentDeleteTargetId !== null ? { display: "block" } : undefined}
          >
            <div className="modal-header">
              <button
                className="close"
                data-dismiss="modal"
                onClick={() => setCommentDeleteTargetId(null)}
                type="button"
              >
                x
              </button>
              <h3>common.comment.delete</h3>
            </div>
            <div className="modal-body">
              <p>common.comment.delete.confirm</p>
            </div>
            <div className="modal-footer">
              <button
                className="ybtn ybtn-danger"
                data-request-method="delete"
                data-request-uri={commentDeleteRequestUri}
                id="comment-delete-confirm"
                onClick={() => {
                  if (commentDeleteTargetId === null || !props.onCommentDelete) {
                    return;
                  }
                  const targetId = commentDeleteTargetId;
                  setCommentDeleteTargetId(null);
                  void props.onCommentDelete(targetId);
                }}
                type="button"
              >
                button.yes
              </button>
              <button
                className="ybtn"
                data-dismiss="modal"
                onClick={() => setCommentDeleteTargetId(null)}
                type="button"
              >
                button.no
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

type IssueTimelineEventItem = ProjectIssueDetailViewModel["timeline"][number];

function IssueTimelineEvent(props: { basePath: string; item: IssueTimelineEventItem }) {
  const item = props.item;
  if (item.eventType === "ISSUE_BODY_CHANGED") {
    return null;
  }

  const eventState = issueEventState(item);
  const senderHref = item.senderLoginId
    ? prefixBasePath(props.basePath, `/${item.senderLoginId}`)
    : "#";

  return (
    <li className="event" id={`event-${item.id}`}>
      <span className={eventState.className}>{eventState.label}</span>{" "}
      <span className="event-message">
        {issueEventMessageKey(item)}{" "}
        {item.senderLoginId ? (
          <a className="user-link" href={senderHref}>
            {item.senderLoginId}
          </a>
        ) : null}
      </span>
      <span className="date">
        <a href={`#event-${item.id}`}>{item.createdLabel}</a>
      </span>
    </li>
  );
}

function issueEventState(item: IssueTimelineEventItem): { className: string; label: string } {
  switch (item.eventType) {
    case "ISSUE_STATE_CHANGED":
      return {
        className: `state ${item.newValue}`,
        label: item.newValue ? `issue.state.${item.newValue}` : "issue.state",
      };
    case "ISSUE_ASSIGNEE_CHANGED":
      return { className: "state changed", label: "issue.state.assigned" };
    case "ISSUE_MILESTONE_CHANGED":
      return { className: "state milestone-changed", label: "issue.update.milestone.id" };
    case "ISSUE_REFERRED_FROM_COMMIT":
    case "ISSUE_MOVED":
    case "ISSUE_REFERRED_FROM_PULL_REQUEST":
      return { className: "state changed", label: issueEventMessageKey(item) };
    case "ISSUE_SHARER_CHANGED":
      return issueAddDeleteState(item, "sharer-added", "sharer-deleted", "issue.sharer");
    case "ISSUE_LABEL_CHANGED":
      return issueAddDeleteState(
        item,
        "label-added",
        "label-deleted",
        issueIsAddingEvent(item)
          ? "issue.event.label.added.title"
          : "issue.event.label.deleted.title",
      );
    default:
      return { className: "state changed", label: item.eventType };
  }
}

function issueAddDeleteState(
  item: IssueTimelineEventItem,
  addClassName: string,
  deleteClassName: string,
  label: string,
): { className: string; label: string } {
  if (issueIsAddingEvent(item)) {
    return { className: `state ${addClassName}`, label };
  }
  if (issueIsDeletingEvent(item)) {
    return { className: `state ${deleteClassName}`, label };
  }
  return { className: "state", label: "" };
}

function issueIsAddingEvent(item: IssueTimelineEventItem): boolean {
  return item.oldValue.trim() === "" && item.newValue.trim() !== "";
}

function issueIsDeletingEvent(item: IssueTimelineEventItem): boolean {
  return item.newValue.trim() === "" && item.oldValue.trim() !== "";
}

function issueEventMessageKey(item: IssueTimelineEventItem): string {
  switch (item.eventType) {
    case "ISSUE_STATE_CHANGED":
      return item.newValue ? `issue.event.${item.newValue}` : "ISSUE_STATE_CHANGED";
    case "ISSUE_ASSIGNEE_CHANGED":
      return item.newValue ? "issue.event.assigned" : "issue.event.unassigned";
    case "ISSUE_MILESTONE_CHANGED":
      return "issue.event.milestone.changed";
    case "ISSUE_REFERRED_FROM_COMMIT":
    case "ISSUE_REFERRED_FROM_PULL_REQUEST":
      return "issue.event.referred";
    case "ISSUE_MOVED":
      return "issue.event.moved";
    case "ISSUE_SHARER_CHANGED":
      return issueIsAddingEvent(item) ? "issue.event.sharer.added" : "issue.event.sharer.deleted";
    case "ISSUE_LABEL_CHANGED":
      return issueIsAddingEvent(item) ? "issue.event.label.added" : "issue.event.label.deleted";
    default:
      return item.newValue ? `${item.newValue} by` : item.eventType;
  }
}

function commentAgreementLabel(count: number): string {
  return count === 1 ? "1 Agreement" : `${count} Agreements`;
}

export interface UserIssueListQuery {
  filter: string;
  orderBy: string;
  orderDir: string;
  pageNum: number;
  query: string;
  state: string;
}

export function UserIssueListPage(props: {
  issueList: UserIssueListViewModel | null;
  query: UserIssueListQuery;
  runtimeConfig: RuntimeConfig;
}) {
  const issueList = props.issueList;
  const query = props.query;
  const action = prefixBasePath(props.runtimeConfig.basePath, "/user/issues");
  const filters = [
    { label: "Assigned to me", value: "assigned" },
    { label: "Authored by me", value: "authored" },
    { label: "Commented by me", value: "commented" },
    { label: "Mentioned of me", value: "mentioned" },
    { label: "Shared with me", value: "shared" },
    { label: "Favorite", value: "favorite" },
  ];

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust User Issues</p>
      <h1>Issue List</h1>
      <div className="row-fluid issue-list-wrap">
        <aside className="left-menu span2 span-hard-wrap">
          <ul className="lst-stacked unstyled">
            {filters.map((filter) => (
              <li
                className={query.filter === filter.value ? "active" : undefined}
                key={filter.value}
              >
                <a href={`${action}?filter=${filter.value}&state=${query.state}`}>
                  <span className={`${filter.value}-issue`}>{filter.label}</span>
                  {filter.value === "favorite" && issueList ? (
                    <span>{` (${issueList.openIssueCount})`}</span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
          <form action={action} id="search" method="get" name="search">
            <input name="filter" type="hidden" value={query.filter} />
            <input name="orderBy" type="hidden" value={query.orderBy} />
            <input name="orderDir" type="hidden" value={query.orderDir} />
            <input name="state" type="hidden" value={query.state} />
            <div className="search myissues-search-input">
              <div className="search-bar">
                <input
                  className="textbox full"
                  defaultValue={query.query}
                  name="query"
                  placeholder="Search issues"
                  type="text"
                />
                <button className="search-btn" type="submit">
                  Search
                </button>
              </div>
            </div>
          </form>
        </aside>
        <section className="span10 span-hard-wrap">
          <ul className="nav nav-tabs nm">
            {(["open", "closed"] as const).map((state) => (
              <li className={query.state === state ? "active" : undefined} key={state}>
                <a href={`${action}?filter=${query.filter}&state=${state}&query=${query.query}`}>
                  {state === "open" ? "Open" : "Closed"}
                  <span className="num-badge">
                    {state === "open"
                      ? (issueList?.openIssueCount ?? 0)
                      : (issueList?.closedIssueCount ?? 0)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="filter-wrap small-heights">
            <a
              className="filter"
              href={`${action}?filter=${query.filter}&state=${query.state}&orderBy=dueDate&orderDir=desc`}
            >
              Due date
            </a>
            <a
              className="filter"
              href={`${action}?filter=${query.filter}&state=${query.state}&orderBy=updatedDate&orderDir=desc`}
            >
              Updated date
            </a>
            <a
              className="filter"
              href={`${action}?filter=${query.filter}&state=${query.state}&orderBy=createdDate&orderDir=desc`}
            >
              Created date
            </a>
            <a
              className="filter"
              href={`${action}?filter=${query.filter}&state=${query.state}&orderBy=numOfComments&orderDir=desc`}
            >
              Comments
            </a>
          </div>
          <p>{`Total ${issueList?.totalCount ?? 0}`}</p>
          {(issueList?.items ?? []).length === 0 ? (
            <p>No issues found.</p>
          ) : (
            <ul>
              {(issueList?.items ?? []).map((item) => (
                <li key={`${item.ownerName}/${item.projectName}/${item.issueNumber}`}>
                  <a
                    href={buildProjectHref(
                      props.runtimeConfig,
                      item.ownerName,
                      item.projectName,
                      `issue/${item.issueNumber}`,
                    )}
                  >
                    {item.title}
                  </a>
                  <span>{`${item.ownerName}/${item.projectName}`}</span>
                  <span>{item.state}</span>
                  <span>{`Author: ${item.authorLabel || "Unknown"}`}</span>
                  <span>{`Assignee: ${item.assigneeLabel || "none"}`}</span>
                  <span>{`Comments: ${item.commentCount}`}</span>
                  <span>{item.updatedLabel}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function IssueSharerPanel(props: {
  issue: ProjectIssueDetailViewModel;
  onSearchSharableUsers?: (query: string) => Promise<IssueAssignableUsersResponse>;
  onShareIssue?: (loginId: string, targetType?: IssueAssignableUserItem["type"]) => Promise<void>;
  onUnshareIssue?: (loginId: string) => Promise<void>;
}) {
  const [loginId, setLoginId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const canManage = props.issue.viewerCanManageSharers;
  const hasSharers = props.issue.sharers.length > 0;
  const onShareIssue = props.onShareIssue;

  if (!hasSharers && !canManage) {
    return null;
  }

  const submitSharerLoginId = (
    nextLoginId: string,
    targetType: IssueAssignableUserItem["type"] = "user",
  ) => {
    const trimmedLoginId = nextLoginId.trim();
    if (!trimmedLoginId || submitting || !onShareIssue) {
      return;
    }
    setSubmitting(true);
    void onShareIssue(trimmedLoginId, targetType).finally(() => {
      setLoginId("");
      setSubmitting(false);
    });
  };

  const selectSharerSuggestion = (suggestion: IssueAssignableUserItem) => {
    setLoginId(suggestion.loginId);
    submitSharerLoginId(suggestion.loginId, suggestion.type);
  };

  return (
    <div className="sharer-list">
      <h2>
        Issue Sharer <span className="num issue-sharer-count">{props.issue.sharers.length}</span>
      </h2>
      {hasSharers ? (
        <ul>
          {props.issue.sharers.map((sharer) => (
            <li className="sharer-item" key={sharer.loginId}>
              <span>{sharer.userLabel || sharer.loginId}</span>
              {canManage && props.onUnshareIssue ? (
                <button onClick={() => void props.onUnshareIssue?.(sharer.loginId)} type="button">
                  Remove sharer
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canManage && onShareIssue ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitSharerLoginId(loginId);
          }}
        >
          <IssueAssigneeAutocompleteField
            name="issueSharer"
            onChange={setLoginId}
            onSearchAssignableUsers={props.onSearchSharableUsers}
            onSelect={selectSharerSuggestion}
            placeholder="Issue sharer login ID"
            value={loginId}
            emptyMessage="No matching users"
            errorMessage="Sharable user search failed."
          />
          <button disabled={submitting} type="submit">
            Share
          </button>
        </form>
      ) : null}
    </div>
  );
}

export const ISSUE_ASSIGNEE_SEARCH_DEBOUNCE_MS = 300;

type IssueAssigneeSearchState = {
  items: IssueAssignableUserItem[];
  status: "error" | "idle" | "loaded" | "loading";
  truncated: boolean;
};

export function shouldSearchIssueAssignee(value: string): boolean {
  return value.trim() !== "";
}

export function submitIssueAssigneeText(
  value: string,
  onSubmit: (assigneeLoginId: string) => Promise<void>,
): Promise<void> {
  return onSubmit(value.trim());
}

export function submitIssueAssigneeSuggestion(
  suggestion: IssueAssignableUserItem,
  onSubmit: (assigneeLoginId: string) => Promise<void>,
): Promise<void> {
  return onSubmit(suggestion.loginId);
}

export function IssueAssignableUserSuggestions(props: {
  emptyMessage?: string;
  errorMessage?: string;
  onSelect: (suggestion: IssueAssignableUserItem) => void;
  state: IssueAssigneeSearchState;
}) {
  if (props.state.status === "idle") {
    return null;
  }
  if (props.state.status === "loading") {
    return <p className="assignee-autocomplete-status">Searching…</p>;
  }
  if (props.state.status === "error") {
    return (
      <p className="assignee-autocomplete-status">
        {props.errorMessage ?? "Assignable user search failed."}
      </p>
    );
  }
  if (props.state.items.length === 0) {
    return (
      <p className="assignee-autocomplete-status">{props.emptyMessage ?? "No matching users"}</p>
    );
  }

  return (
    <div className="assignee-autocomplete">
      <ul>
        {props.state.items.map((item) => (
          <li key={item.loginId}>
            <button onClick={() => props.onSelect(item)} type="button">
              {item.avatarUrl ? (
                <img alt={`${item.displayName} avatar`} src={item.avatarUrl} />
              ) : null}
              <span>{item.displayName || item.loginId}</span>
              <span>{`@${item.loginId}`}</span>
            </button>
          </li>
        ))}
      </ul>
      {props.state.truncated ? (
        <p className="assignee-autocomplete-status">More matches available</p>
      ) : null}
    </div>
  );
}

function IssueAssigneeAutocompleteField(props: {
  emptyMessage?: string;
  errorMessage?: string;
  name: string;
  onChange: (value: string) => void;
  onSearchAssignableUsers?: (query: string) => Promise<IssueAssignableUsersResponse>;
  onSelect: (suggestion: IssueAssignableUserItem) => void;
  placeholder: string;
  value: string;
}) {
  const onSearchAssignableUsers = props.onSearchAssignableUsers;
  const value = props.value;
  const [searchState, setSearchState] = React.useState<IssueAssigneeSearchState>({
    items: [],
    status: "idle",
    truncated: false,
  });

  React.useEffect(() => {
    const query = value.trim();
    if (!onSearchAssignableUsers || !shouldSearchIssueAssignee(query)) {
      setSearchState({ items: [], status: "idle", truncated: false });
      return undefined;
    }

    let cancelled = false;
    setSearchState({ items: [], status: "loading", truncated: false });
    const timer = window.setTimeout(() => {
      onSearchAssignableUsers(query)
        .then((response) => {
          if (!cancelled) {
            setSearchState({
              items: response.items,
              status: "loaded",
              truncated: response.truncated,
            });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSearchState({ items: [], status: "error", truncated: false });
          }
        });
    }, ISSUE_ASSIGNEE_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [onSearchAssignableUsers, value]);

  return (
    <>
      <input
        name={props.name}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        placeholder={props.placeholder}
        value={props.value}
      />
      <IssueAssignableUserSuggestions
        emptyMessage={props.emptyMessage}
        errorMessage={props.errorMessage}
        onSelect={props.onSelect}
        state={searchState}
      />
    </>
  );
}

function IssueAssignForm(props: {
  initialAssignee: string;
  onSearchAssignableUsers?: (query: string) => Promise<IssueAssignableUsersResponse>;
  onSubmit: (assigneeLoginId: string) => Promise<void>;
}) {
  const [assigneeLoginId, setAssigneeLoginId] = React.useState(props.initialAssignee);

  React.useEffect(() => {
    setAssigneeLoginId(props.initialAssignee);
  }, [props.initialAssignee]);

  const selectSuggestion = (suggestion: IssueAssignableUserItem) => {
    setAssigneeLoginId(suggestion.loginId);
    void submitIssueAssigneeSuggestion(suggestion, props.onSubmit);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submitIssueAssigneeText(assigneeLoginId, props.onSubmit);
      }}
    >
      <IssueAssigneeAutocompleteField
        name="assigneeLoginId"
        onChange={setAssigneeLoginId}
        onSearchAssignableUsers={props.onSearchAssignableUsers}
        onSelect={selectSuggestion}
        placeholder="Assignee"
        value={assigneeLoginId}
      />
      <button type="submit">Assign</button>
    </form>
  );
}

export const ISSUE_MENTION_SEARCH_DEBOUNCE_MS = 300;

type IssueReferenceQueryOptionsFactory = (query: string) => {
  queryFn: () => Promise<ProjectIssueReferencesResponse>;
  queryKey: readonly unknown[];
};

type IssueMentionSearchMatch = {
  end: number;
  query: string;
  start: number;
};

type IssueMentionSearchState = {
  items: IssueMentionUserItem[];
  status: "error" | "idle" | "loaded" | "loading";
  truncated: boolean;
};

type IssueReferenceSearchState = {
  items: ProjectIssueReferenceItem[];
  status: "error" | "idle" | "loaded" | "loading";
  truncated: boolean;
};

function findIssueMentionSearchMatch(
  value: string,
  cursorIndex = value.length,
): IssueMentionSearchMatch | null {
  const end = Math.max(0, Math.min(cursorIndex, value.length));
  const beforeCursor = value.slice(0, end);
  const match = /(^|[\s([{<])@([A-Za-z0-9_.\-/]*)$/.exec(beforeCursor);
  if (!match || match.index === undefined) {
    return null;
  }
  const start = match.index + match[1].length;
  return {
    end,
    query: match[2] ?? "",
    start,
  };
}

export function findIssueMentionQuery(value: string, cursorIndex = value.length): null | string {
  return findIssueMentionSearchMatch(value, cursorIndex)?.query ?? null;
}

function findIssueReferenceSearchMatch(
  value: string,
  cursorIndex = value.length,
): IssueMentionSearchMatch | null {
  const end = Math.max(0, Math.min(cursorIndex, value.length));
  const beforeCursor = value.slice(0, end);
  const match = /(^|[\s([{<])#([^\s#@]*)$/u.exec(beforeCursor);
  if (!match || match.index === undefined) {
    return null;
  }
  const start = match.index + match[1].length;
  return {
    end,
    query: match[2] ?? "",
    start,
  };
}

export function findIssueReferenceQuery(value: string, cursorIndex = value.length): null | string {
  return findIssueReferenceSearchMatch(value, cursorIndex)?.query ?? null;
}

export function issueMentionTextForItem(item: IssueMentionUserItem): string {
  return `@${item.loginId}`;
}

export function issueReferenceTextForItem(item: ProjectIssueReferenceItem): string {
  return `#${item.issueNumber}`;
}

export function insertIssueMentionText(
  value: string,
  cursorIndex: number,
  item: IssueMentionUserItem,
): { cursorIndex: number; value: string } {
  const match = findIssueMentionSearchMatch(value, cursorIndex);
  const start = match?.start ?? Math.max(0, Math.min(cursorIndex, value.length));
  const end = match?.end ?? start;
  const mentionText = `${issueMentionTextForItem(item)}${/\s/.test(value[end] ?? "") ? "" : " "}`;
  const nextValue = `${value.slice(0, start)}${mentionText}${value.slice(end)}`;
  return {
    cursorIndex: start + mentionText.length,
    value: nextValue,
  };
}

export function insertIssueReferenceText(
  value: string,
  cursorIndex: number,
  item: ProjectIssueReferenceItem,
): { cursorIndex: number; value: string } {
  const match = findIssueReferenceSearchMatch(value, cursorIndex);
  const start = match?.start ?? Math.max(0, Math.min(cursorIndex, value.length));
  const end = match?.end ?? start;
  const referenceText = `${issueReferenceTextForItem(item)}${/\s/.test(value[end] ?? "") ? "" : " "}`;
  const nextValue = `${value.slice(0, start)}${referenceText}${value.slice(end)}`;
  return {
    cursorIndex: start + referenceText.length,
    value: nextValue,
  };
}

function isImageFile(file: File): boolean {
  return file.type.toLowerCase().startsWith("image/");
}

function imageFilesFromList(files: FileList | null | undefined): File[] {
  return Array.from(files ?? []).filter(isImageFile);
}

function imageFilesFromItems(items: DataTransferItemList | null | undefined): File[] {
  const files: File[] = [];
  for (const item of Array.from(items ?? [])) {
    if (item.kind !== "file" || !item.type.toLowerCase().startsWith("image/")) {
      continue;
    }
    const file = item.getAsFile();
    if (file) {
      files.push(file);
    }
  }
  return files;
}

function imageFilesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
  const itemFiles = imageFilesFromItems(dataTransfer?.items);
  return itemFiles.length > 0 ? itemFiles : imageFilesFromList(dataTransfer?.files);
}

function markdownTextForAttachment(attachment: UploadedAttachment): string {
  const name = attachment.name || "image.png";
  const link = `[${name}](${attachment.url}) `;
  return attachment.mimeType.toLowerCase().startsWith("image/") ? `!${link}` : link;
}

function insertMarkdownText(
  value: string,
  cursorIndex: number,
  markdownText: string,
): { cursorIndex: number; value: string } {
  const cursor = Math.max(0, Math.min(cursorIndex, value.length));
  return {
    cursorIndex: cursor + markdownText.length,
    value: `${value.slice(0, cursor)}${markdownText}${value.slice(cursor)}`,
  };
}

function IssueMentionUserSuggestions(props: {
  onSelect: (suggestion: IssueMentionUserItem) => void;
  state: IssueMentionSearchState;
}) {
  if (props.state.status === "idle") {
    return null;
  }
  if (props.state.status === "loading") {
    return <p className="mention-autocomplete-status">Searching…</p>;
  }
  if (props.state.status === "error") {
    return <p className="mention-autocomplete-status">Mention user search failed.</p>;
  }
  if (props.state.items.length === 0) {
    return <p className="mention-autocomplete-status">No matching mentions</p>;
  }

  return (
    <div className="mention-autocomplete">
      <ul>
        {props.state.items.map((item) => (
          <li key={`${item.type}-${item.loginId}`}>
            <button onClick={() => props.onSelect(item)} type="button">
              {item.avatarUrl ? (
                <img alt={`${item.displayName} avatar`} src={item.avatarUrl} />
              ) : null}
              <span>{item.displayName || item.loginId}</span>
              <span>{issueMentionTextForItem(item)}</span>
            </button>
          </li>
        ))}
      </ul>
      {props.state.truncated ? (
        <p className="mention-autocomplete-status">More matches available</p>
      ) : null}
    </div>
  );
}

function IssueReferenceSuggestions(props: {
  onSelect: (suggestion: ProjectIssueReferenceItem) => void;
  state: IssueReferenceSearchState;
}) {
  if (props.state.status === "idle") {
    return null;
  }
  if (props.state.status === "loading") {
    return <p className="mention-autocomplete-status">Searching…</p>;
  }
  if (props.state.status === "error") {
    return <p className="mention-autocomplete-status">Issue reference search failed.</p>;
  }
  if (props.state.items.length === 0) {
    return <p className="mention-autocomplete-status">No matching issues</p>;
  }

  return (
    <div className="mention-autocomplete">
      <ul>
        {props.state.items.map((item) => (
          <li key={item.issueNumber}>
            <button onClick={() => props.onSelect(item)} type="button">
              <span>{issueReferenceTextForItem(item)}</span>
              <span>{item.title}</span>
              <span>{item.state}</span>
            </button>
          </li>
        ))}
      </ul>
      {props.state.truncated ? (
        <p className="mention-autocomplete-status">More matches available</p>
      ) : null}
    </div>
  );
}

function IssueMentionTextarea(props: {
  className?: string;
  context: IssueMentionUserSearchContext;
  csrfToken?: string;
  getIssueReferencesQueryOptions?: IssueReferenceQueryOptionsFactory;
  name?: string;
  onChange: (value: string) => void;
  onAttachmentUpload?: (attachment: UploadedAttachment) => void;
  onSearchMentionUsers?: (
    query: string,
    context: IssueMentionUserSearchContext,
  ) => Promise<IssueMentionUsersResponse>;
  placeholder: string;
  runtimeConfig?: RuntimeConfig;
  value: string;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const context = props.context;
  const onSearchMentionUsers = props.onSearchMentionUsers;
  const value = props.value;
  const [cursorIndex, setCursorIndex] = React.useState(props.value.length);
  const [mentionSearchState, setMentionSearchState] = React.useState<IssueMentionSearchState>({
    items: [],
    status: "idle",
    truncated: false,
  });
  const [issueReferenceSearchState, setIssueReferenceSearchState] =
    React.useState<IssueReferenceSearchState>({
      items: [],
      status: "idle",
      truncated: false,
    });

  React.useEffect(() => {
    const referenceQuery = findIssueReferenceQuery(value, cursorIndex);
    const query = referenceQuery === null ? findIssueMentionQuery(value, cursorIndex) : null;
    if (query === null || !onSearchMentionUsers) {
      setMentionSearchState({ items: [], status: "idle", truncated: false });
      return undefined;
    }

    let cancelled = false;
    setMentionSearchState({ items: [], status: "loading", truncated: false });
    const timer = window.setTimeout(() => {
      onSearchMentionUsers(query, context)
        .then((response) => {
          if (!cancelled) {
            setMentionSearchState({
              items: response.items,
              status: "loaded",
              truncated: response.truncated,
            });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setMentionSearchState({ items: [], status: "error", truncated: false });
          }
        });
    }, ISSUE_MENTION_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [context, cursorIndex, onSearchMentionUsers, value]);

  React.useEffect(() => {
    const query = findIssueReferenceQuery(props.value, cursorIndex);
    const getIssueReferencesQueryOptions = props.getIssueReferencesQueryOptions;
    if (query === null || !getIssueReferencesQueryOptions) {
      setIssueReferenceSearchState({ items: [], status: "idle", truncated: false });
      return undefined;
    }

    let cancelled = false;
    setIssueReferenceSearchState({ items: [], status: "loading", truncated: false });
    const timer = window.setTimeout(() => {
      getIssueReferencesQueryOptions(query)
        .queryFn()
        .then((response: ProjectIssueReferencesResponse) => {
          if (!cancelled) {
            setIssueReferenceSearchState({
              items: response.items,
              status: "loaded",
              truncated: response.truncated,
            });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setIssueReferenceSearchState({ items: [], status: "error", truncated: false });
          }
        });
    }, ISSUE_MENTION_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cursorIndex, props.getIssueReferencesQueryOptions, props.value]);

  const updateCursorIndex = (textarea: HTMLTextAreaElement) => {
    setCursorIndex(textarea.selectionStart ?? textarea.value.length);
  };

  const handleMarkdownImageFiles = async (textarea: HTMLTextAreaElement, files: File[]) => {
    const runtimeConfig = props.runtimeConfig;
    const csrfToken = props.csrfToken;
    if (files.length === 0 || !runtimeConfig || !csrfToken) {
      return false;
    }

    const attachments = await Promise.all(
      files.map((file) => uploadTemporaryAttachment(runtimeConfig, csrfToken, file)),
    );
    let nextValue = textarea.value;
    let nextCursor = textarea.selectionStart ?? nextValue.length;
    for (const attachment of attachments) {
      const inserted = insertMarkdownText(
        nextValue,
        nextCursor,
        markdownTextForAttachment(attachment),
      );
      nextValue = inserted.value;
      nextCursor = inserted.cursorIndex;
      props.onAttachmentUpload?.(attachment);
    }

    props.onChange(nextValue);
    setCursorIndex(nextCursor);
    window.requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
      textareaRef.current?.focus();
    });
    return true;
  };

  const selectIssueReference = (suggestion: ProjectIssueReferenceItem) => {
    const cursor = textareaRef.current?.selectionStart ?? cursorIndex;
    const inserted = insertIssueReferenceText(props.value, cursor, suggestion);
    props.onChange(inserted.value);
    setCursorIndex(inserted.cursorIndex);
    setMentionSearchState({ items: [], status: "idle", truncated: false });
    setIssueReferenceSearchState({ items: [], status: "idle", truncated: false });
    window.requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(inserted.cursorIndex, inserted.cursorIndex);
      textareaRef.current?.focus();
    });
  };

  const selectMention = (suggestion: IssueMentionUserItem) => {
    const cursor = textareaRef.current?.selectionStart ?? cursorIndex;
    const inserted = insertIssueMentionText(props.value, cursor, suggestion);
    props.onChange(inserted.value);
    setCursorIndex(inserted.cursorIndex);
    setMentionSearchState({ items: [], status: "idle", truncated: false });
    setIssueReferenceSearchState({ items: [], status: "idle", truncated: false });
    window.requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(inserted.cursorIndex, inserted.cursorIndex);
      textareaRef.current?.focus();
    });
  };

  return (
    <>
      <textarea
        className={props.className}
        name={props.name}
        onChange={(event) => {
          props.onChange(event.currentTarget.value);
          updateCursorIndex(event.currentTarget);
        }}
        onClick={(event) => updateCursorIndex(event.currentTarget)}
        onDragOver={(event) => {
          if (
            props.runtimeConfig &&
            props.csrfToken &&
            imageFilesFromDataTransfer(event.dataTransfer).length > 0
          ) {
            event.preventDefault();
          }
        }}
        onDrop={(event) => {
          const files = imageFilesFromDataTransfer(event.dataTransfer);
          if (files.length === 0) {
            return;
          }
          event.preventDefault();
          void handleMarkdownImageFiles(event.currentTarget, files);
        }}
        onKeyUp={(event) => updateCursorIndex(event.currentTarget)}
        onPaste={(event) => {
          const files = imageFilesFromDataTransfer(event.clipboardData);
          if (files.length === 0) {
            return;
          }
          event.preventDefault();
          void handleMarkdownImageFiles(event.currentTarget, files);
        }}
        placeholder={props.placeholder}
        ref={textareaRef}
        value={props.value}
      />
      <IssueMentionUserSuggestions onSelect={selectMention} state={mentionSearchState} />
      <IssueReferenceSuggestions
        onSelect={selectIssueReference}
        state={issueReferenceSearchState}
      />
    </>
  );
}

function IssueCommentForm(props: {
  csrfToken?: string;
  getIssueReferencesQueryOptions?: IssueReferenceQueryOptionsFactory;
  onSearchMentionUsers?: (
    query: string,
    context: IssueMentionUserSearchContext,
  ) => Promise<IssueMentionUsersResponse>;
  onSubmit: (contentsMarkdown: string, attachmentIds?: number[]) => Promise<void>;
  runtimeConfig: RuntimeConfig;
}) {
  const [contentsMarkdown, setContentsMarkdown] = React.useState("");
  const [attachmentIds, setAttachmentIds] = React.useState<number[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const nextContents = contentsMarkdown.trim();
        if (!nextContents) {
          return;
        }
        setSubmitting(true);
        void props.onSubmit(nextContents, attachmentIds).finally(() => {
          setAttachmentIds([]);
          setContentsMarkdown("");
          setSubmitting(false);
        });
      }}
    >
      <IssueMentionTextarea
        context="issue-comment"
        csrfToken={props.csrfToken}
        getIssueReferencesQueryOptions={props.getIssueReferencesQueryOptions}
        name="contents"
        onAttachmentUpload={(attachment) =>
          setAttachmentIds((current) => [...current, attachment.id])
        }
        onChange={setContentsMarkdown}
        onSearchMentionUsers={props.onSearchMentionUsers}
        placeholder="Leave a comment"
        runtimeConfig={props.runtimeConfig}
        value={contentsMarkdown}
      />
      <button disabled={submitting} type="submit">
        Comment
      </button>
    </form>
  );
}

function IssueCommentEditForm(props: {
  action: string;
  commentId: number;
  csrfToken?: string;
  getIssueReferencesQueryOptions?: IssueReferenceQueryOptionsFactory;
  initialContents: string;
  onCancel: () => void;
  onSearchMentionUsers?: (
    query: string,
    context: IssueMentionUserSearchContext,
  ) => Promise<IssueMentionUsersResponse>;
  onSubmit: (
    commentId: number,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void>;
  runtimeConfig: RuntimeConfig;
}) {
  const [contentsMarkdown, setContentsMarkdown] = React.useState(props.initialContents);
  const [attachmentIds, setAttachmentIds] = React.useState<number[]>([]);
  return (
    <div className="comment-update-form" id={`comment-editform-${props.commentId}`}>
      <form
        action={props.action}
        encType="multipart/form-data"
        method="post"
        onSubmit={(event) => {
          event.preventDefault();
          const nextContents = contentsMarkdown.trim();
          if (!nextContents) {
            return;
          }
          void props.onSubmit(props.commentId, nextContents, attachmentIds).then(() => {
            setAttachmentIds([]);
            props.onCancel();
          });
        }}
      >
        <input name="id" type="hidden" defaultValue={props.commentId} />
        <div className="write-comment-box">
          <div className="write-comment-wrap">
            <IssueMentionTextarea
              context="issue-comment"
              csrfToken={props.csrfToken}
              getIssueReferencesQueryOptions={props.getIssueReferencesQueryOptions}
              name="contents"
              onAttachmentUpload={(attachment) =>
                setAttachmentIds((current) => [...current, attachment.id])
              }
              onChange={setContentsMarkdown}
              onSearchMentionUsers={props.onSearchMentionUsers}
              placeholder="Leave a comment"
              runtimeConfig={props.runtimeConfig}
              value={contentsMarkdown}
            />
            <div className="right-txt comment-update-button upload-button-line">
              <button
                className="ybtn ybtn-cancel"
                data-comment-id={props.commentId}
                onClick={props.onCancel}
                type="button"
              >
                button.cancel
              </button>
              <button className="ybtn ybtn-info" type="submit">
                button.save
              </button>
            </div>
          </div>
          <input
            className="temporaryUploadFiles"
            name="temporaryUploadFiles"
            type="hidden"
            defaultValue=""
          />
          <div className={`preview-${props.commentId}`}></div>
          <div className="attachment-files"></div>
          <div
            data-resourceid={props.commentId}
            data-resourcetype="ISSUE_COMMENT"
            id={`upload-${props.commentId}`}
          ></div>
        </div>
      </form>
    </div>
  );
}

export function ProjectIssueFormPage(props: {
  csrfToken?: string;
  detail: ProjectDetailViewModel | null;
  getIssueReferencesQueryOptions?: IssueReferenceQueryOptionsFactory;
  initialBodyMarkdown?: string;
  initialIssue?: ProjectIssueDetailViewModel | null;
  mode: "create" | "edit";
  onSearchAssignableUsers?: (query: string) => Promise<IssueAssignableUsersResponse>;
  onSearchMentionUsers?: (
    query: string,
    context: IssueMentionUserSearchContext,
  ) => Promise<IssueMentionUsersResponse>;
  onSubmit: (input: ProjectIssueFormSubmitInput) => Promise<void>;
  referCommentId?: string;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const [title, setTitle] = React.useState(props.initialIssue?.title ?? "");
  const [bodyMarkdown, setBodyMarkdown] = React.useState(
    props.initialIssue?.bodyMarkdown ?? props.initialBodyMarkdown ?? "",
  );
  const [attachmentIds, setAttachmentIds] = React.useState<number[]>([]);
  const [assigneeLoginId, setAssigneeLoginId] = React.useState(
    props.initialIssue?.assigneeLoginId ?? "",
  );
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    setTitle(props.initialIssue?.title ?? "");
    setBodyMarkdown(props.initialIssue?.bodyMarkdown ?? props.initialBodyMarkdown ?? "");
    setAttachmentIds([]);
    setAssigneeLoginId(props.initialIssue?.assigneeLoginId ?? "");
  }, [
    props.initialIssue?.assigneeLoginId,
    props.initialIssue?.bodyMarkdown,
    props.initialIssue?.title,
    props.initialBodyMarkdown,
  ]);

  const selectAssigneeSuggestion = (suggestion: IssueAssignableUserItem) => {
    setAssigneeLoginId(suggestion.loginId);
  };

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>{props.mode === "create" ? "New Issue" : "Edit Issue"}</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <form
        id="issue-form"
        onSubmit={(event) => {
          event.preventDefault();
          const input = buildProjectIssueFormSubmitInput({
            assigneeLoginId,
            attachmentIds,
            bodyMarkdown,
            title,
          });
          if (!input) {
            return;
          }
          setSubmitting(true);
          void props.onSubmit(input).finally(() => setSubmitting(false));
        }}
      >
        <input name="referCommentId" type="hidden" value={props.referCommentId ?? ""} />
        <input
          name="title"
          onChange={(event) => setTitle(event.currentTarget.value)}
          placeholder="Title"
          value={title}
        />
        <IssueAssigneeAutocompleteField
          name="assigneeLoginId"
          onChange={setAssigneeLoginId}
          onSearchAssignableUsers={props.onSearchAssignableUsers}
          onSelect={selectAssigneeSuggestion}
          placeholder="Assignee"
          value={assigneeLoginId}
        />
        <IssueMentionTextarea
          className="editorSeries content"
          context="issue-body"
          csrfToken={props.csrfToken}
          getIssueReferencesQueryOptions={props.getIssueReferencesQueryOptions}
          name="body"
          onAttachmentUpload={(attachment) =>
            setAttachmentIds((current) => [...current, attachment.id])
          }
          onChange={setBodyMarkdown}
          onSearchMentionUsers={props.onSearchMentionUsers}
          placeholder="Leave a comment"
          runtimeConfig={props.runtimeConfig}
          value={bodyMarkdown}
        />
        <button disabled={submitting} type="submit">
          {props.mode === "create" ? "Create" : "Save"}
        </button>
      </form>
    </main>
  );
}

export type ProjectIssueFormSubmitInput = {
  assigneeLoginId: string;
  attachmentIds: number[];
  bodyMarkdown: string;
  title: string;
};

export function buildProjectIssueFormSubmitInput(input: {
  assigneeLoginId: string;
  attachmentIds?: number[];
  bodyMarkdown: string;
  title: string;
}): ProjectIssueFormSubmitInput | null {
  const title = input.title.trim();
  if (!title) {
    return null;
  }

  return {
    assigneeLoginId: input.assigneeLoginId.trim(),
    attachmentIds: input.attachmentIds ?? [],
    bodyMarkdown: input.bodyMarkdown,
    title,
  };
}
