import * as React from "react";
import type { IssueAssignableUserItem, IssueAssignableUsersResponse } from "../api/issue-meta";
import type { RuntimeConfig } from "../runtime-config";
import { buildProjectHref, ProjectMenu } from "./-project-views";
import type {
  ProjectDetailViewModel,
  ProjectIssueDetailViewModel,
  ProjectIssueListViewModel,
  UserIssueListViewModel,
} from "./-view-models";
import { prefixBasePath } from "../runtime-config";

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

export function ProjectIssueListPage(props: {
  detail: ProjectDetailViewModel | null;
  issueList: ProjectIssueListViewModel | null;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Issue List</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <section>
        <form
          action={buildProjectHref(
            props.runtimeConfig,
            detail.ownerName,
            detail.projectName,
            "issues",
          )}
        >
          <select name="state" defaultValue="">
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <input name="authorLoginId" placeholder="Author" />
          <input name="assigneeLoginId" placeholder="Assignee" />
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

export function ProjectIssueDetailPage(props: {
  detail: ProjectDetailViewModel | null;
  issue: ProjectIssueDetailViewModel | null;
  onAssign?: (assigneeLoginId: string) => Promise<void>;
  onSearchAssignableUsers?: (query: string) => Promise<IssueAssignableUsersResponse>;
  onCommentDelete?: (commentId: number) => Promise<void>;
  onCommentSubmit?: (contentsMarkdown: string) => Promise<void>;
  onCommentUpdate?: (commentId: number, contentsMarkdown: string) => Promise<void>;
  onCommentVoteToggle?: (commentId: number, viewerHasVoted: boolean) => Promise<void>;
  onDeleteIssue?: () => Promise<void>;
  onFavoriteToggle?: () => Promise<void>;
  onShareIssue?: (loginId: string) => Promise<void>;
  onStateChange?: (state: string) => Promise<void>;
  onUnshareIssue?: (loginId: string) => Promise<void>;
  onVoteToggle?: () => Promise<void>;
  onWatchToggle?: () => Promise<void>;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const issue = props.issue;
  const onDeleteIssue = props.onDeleteIssue;
  const onStateChange = props.onStateChange;

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>
        {issue?.title ?? "Issue"}
        {issue && props.onFavoriteToggle ? (
          <button
            aria-label={issue.isFavorited ? "Unfavorite issue" : "Favorite issue"}
            className="favorite-issue"
            onClick={() => void props.onFavoriteToggle?.()}
            type="button"
          >
            <span
              className={`${issue.isFavorited ? "starred " : ""}star material-icons va-text-top`}
            >
              star
            </span>
          </button>
        ) : null}
      </h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <section>
        <p>{issue ? `#${issue.issueNumber}` : ""}</p>
        <p>{issue?.state ?? ""}</p>
        <p>{`Author: ${issue?.authorLabel || "Unknown"}`}</p>
        <p>{`Assignee: ${issue?.assigneeLabel || "none"}`}</p>
        <p>{`Milestone: ${issue?.milestoneTitle || "none"}`}</p>
        <p>{`Watchers: ${issue?.watcherCount ?? 0}`}</p>
        <p>{`Voters: ${issue?.voterCount ?? 0}`}</p>
        {issue?.labels.map((label) => (
          <span key={label.id} style={{ backgroundColor: label.color || "#ddd" }}>
            {label.name}
          </span>
        ))}
        {issue?.viewerCanUpdate ? (
          <a
            href={buildProjectHref(
              props.runtimeConfig,
              detail.ownerName,
              detail.projectName,
              `issue/${issue.issueNumber}/editform`,
            )}
          >
            Edit
          </a>
        ) : null}
        {issue?.viewerCanUpdate && onStateChange ? (
          <button
            onClick={() => void onStateChange(issue.state === "open" ? "closed" : "open")}
            type="button"
          >
            {issue.state === "open" ? "Close" : "Reopen"}
          </button>
        ) : null}
        {issue && props.onWatchToggle ? (
          <button onClick={() => void props.onWatchToggle?.()} type="button">
            {issue.isWatching ? "Unwatch" : "Watch"}
          </button>
        ) : null}
        {issue && props.onVoteToggle ? (
          <button onClick={() => void props.onVoteToggle?.()} type="button">
            {issue.hasVoted ? "Unvote" : "Vote"}
          </button>
        ) : null}
        {issue?.viewerCanUpdate && props.onAssign ? (
          <IssueAssignForm
            initialAssignee={issue.assigneeLoginId}
            onSearchAssignableUsers={props.onSearchAssignableUsers}
            onSubmit={props.onAssign}
          />
        ) : null}
        {issue?.viewerCanDelete && onDeleteIssue ? (
          <button onClick={() => void onDeleteIssue()} type="button">
            Delete
          </button>
        ) : null}
        {issue ? (
          <IssueSharerPanel
            issue={issue}
            onShareIssue={issue.viewerCanManageSharers ? props.onShareIssue : undefined}
            onUnshareIssue={issue.viewerCanManageSharers ? props.onUnshareIssue : undefined}
          />
        ) : null}
      </section>
      <section>
        <div
          className="markdown-wrap"
          dangerouslySetInnerHTML={{ __html: issue?.bodyHtml ?? "" }}
        />
        {(issue?.attachments ?? []).map((attachment) => (
          <a href={attachment.url} key={attachment.id}>
            {attachment.name}
          </a>
        ))}
      </section>
      <section id="comments">
        <h2>Comments</h2>
        {(issue?.timeline ?? []).map((item) => (
          <article key={`${item.kind}-${item.id}`}>
            {item.kind === "comment" && item.comment ? (
              <>
                <p>{`${item.comment.authorLabel} ${item.comment.createdLabel}`}</p>
                <div
                  className="comment-body markdown-wrap"
                  dangerouslySetInnerHTML={{ __html: item.comment.contentsHtml }}
                />
                <div className="comment-vote-row">
                  {item.comment.voterCount > 0 ? (
                    <span className="comment-vote-count">
                      {commentAgreementLabel(item.comment.voterCount)}
                    </span>
                  ) : null}
                  {item.comment.voters.map((voter) => (
                    <span className="comment-voter" key={voter.userId} title={voter.userLabel}>
                      {voter.avatarUrl ? (
                        <img alt={`${voter.userLabel} avatar`} src={voter.avatarUrl} />
                      ) : null}
                      <span>{voter.userLabel || voter.loginId}</span>
                    </span>
                  ))}
                  {issue?.viewerCanComment && props.onCommentVoteToggle ? (
                    <button
                      aria-label={
                        item.comment.viewerHasVoted
                          ? "Withdraw comment agreement"
                          : "Agree with comment"
                      }
                      className="comment-vote btn-transparent-with-fontsize-lineheight"
                      onClick={() =>
                        void props.onCommentVoteToggle?.(
                          item.comment!.id,
                          item.comment!.viewerHasVoted,
                        )
                      }
                      title={item.comment.viewerHasVoted ? "Withdraw" : "Agree"}
                      type="button"
                    >
                      <span
                        className={`yobicon-hearts ${
                          item.comment.viewerHasVoted ? "vote-heart-on" : "vote-heart-off"
                        }`}
                      />
                    </button>
                  ) : null}
                </div>
                {item.comment.viewerCanUpdate && props.onCommentUpdate ? (
                  <IssueCommentEditForm
                    commentId={item.comment.id}
                    initialContents={item.comment.contentsMarkdown}
                    onSubmit={props.onCommentUpdate}
                  />
                ) : null}
                {item.comment.viewerCanDelete && props.onCommentDelete ? (
                  <button
                    onClick={() => void props.onCommentDelete?.(item.comment!.id)}
                    type="button"
                  >
                    Delete comment
                  </button>
                ) : null}
              </>
            ) : (
              <p>{`${item.eventType} ${item.createdLabel}`}</p>
            )}
          </article>
        ))}
        {issue?.viewerCanComment && props.onCommentSubmit ? (
          <IssueCommentForm onSubmit={props.onCommentSubmit} />
        ) : null}
      </section>
    </main>
  );
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
  onShareIssue?: (loginId: string) => Promise<void>;
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
            const nextLoginId = loginId.trim();
            if (!nextLoginId) {
              return;
            }
            setSubmitting(true);
            void onShareIssue(nextLoginId).finally(() => {
              setLoginId("");
              setSubmitting(false);
            });
          }}
        >
          <input
            name="issueSharer"
            onChange={(event) => setLoginId(event.currentTarget.value)}
            placeholder="Issue sharer login ID"
            value={loginId}
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
  onSelect: (suggestion: IssueAssignableUserItem) => void;
  state: IssueAssigneeSearchState;
}) {
  if (props.state.status === "idle") {
    return null;
  }
  if (props.state.status === "loading") {
    return <p className="assignee-autocomplete-status">Searching...</p>;
  }
  if (props.state.status === "error") {
    return <p className="assignee-autocomplete-status">Assignable user search failed.</p>;
  }
  if (props.state.items.length === 0) {
    return <p className="assignee-autocomplete-status">No matching users</p>;
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
  name: string;
  onChange: (value: string) => void;
  onSearchAssignableUsers?: (query: string) => Promise<IssueAssignableUsersResponse>;
  onSelect: (suggestion: IssueAssignableUserItem) => void;
  placeholder: string;
  value: string;
}) {
  const [searchState, setSearchState] = React.useState<IssueAssigneeSearchState>({
    items: [],
    status: "idle",
    truncated: false,
  });

  React.useEffect(() => {
    const query = props.value.trim();
    if (!props.onSearchAssignableUsers || !shouldSearchIssueAssignee(query)) {
      setSearchState({ items: [], status: "idle", truncated: false });
      return undefined;
    }

    let cancelled = false;
    setSearchState({ items: [], status: "loading", truncated: false });
    const timer = window.setTimeout(() => {
      props
        .onSearchAssignableUsers?.(query)
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
  }, [props.value, props.onSearchAssignableUsers]);

  return (
    <>
      <input
        name={props.name}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        placeholder={props.placeholder}
        value={props.value}
      />
      <IssueAssignableUserSuggestions onSelect={props.onSelect} state={searchState} />
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

function IssueCommentForm(props: { onSubmit: (contentsMarkdown: string) => Promise<void> }) {
  const [contentsMarkdown, setContentsMarkdown] = React.useState("");
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
        void props.onSubmit(nextContents).finally(() => {
          setContentsMarkdown("");
          setSubmitting(false);
        });
      }}
    >
      <textarea
        name="contents"
        onChange={(event) => setContentsMarkdown(event.currentTarget.value)}
        placeholder="Leave a comment"
        value={contentsMarkdown}
      />
      <button disabled={submitting} type="submit">
        Comment
      </button>
    </form>
  );
}

function IssueCommentEditForm(props: {
  commentId: number;
  initialContents: string;
  onSubmit: (commentId: number, contentsMarkdown: string) => Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [contentsMarkdown, setContentsMarkdown] = React.useState(props.initialContents);
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} type="button">
        Edit comment
      </button>
    );
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const nextContents = contentsMarkdown.trim();
        if (!nextContents) {
          return;
        }
        void props.onSubmit(props.commentId, nextContents).then(() => setEditing(false));
      }}
    >
      <textarea
        onChange={(event) => setContentsMarkdown(event.currentTarget.value)}
        value={contentsMarkdown}
      />
      <button type="submit">Save comment</button>
      <button onClick={() => setEditing(false)} type="button">
        Cancel
      </button>
    </form>
  );
}

export function ProjectIssueFormPage(props: {
  detail: ProjectDetailViewModel | null;
  initialIssue?: ProjectIssueDetailViewModel | null;
  mode: "create" | "edit";
  onSearchAssignableUsers?: (query: string) => Promise<IssueAssignableUsersResponse>;
  onSubmit: (input: ProjectIssueFormSubmitInput) => Promise<void>;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const [title, setTitle] = React.useState(props.initialIssue?.title ?? "");
  const [bodyMarkdown, setBodyMarkdown] = React.useState(props.initialIssue?.bodyMarkdown ?? "");
  const [assigneeLoginId, setAssigneeLoginId] = React.useState(
    props.initialIssue?.assigneeLoginId ?? "",
  );
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    setTitle(props.initialIssue?.title ?? "");
    setBodyMarkdown(props.initialIssue?.bodyMarkdown ?? "");
    setAssigneeLoginId(props.initialIssue?.assigneeLoginId ?? "");
  }, [
    props.initialIssue?.assigneeLoginId,
    props.initialIssue?.bodyMarkdown,
    props.initialIssue?.title,
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
        <textarea
          className="editorSeries content"
          name="body"
          onChange={(event) => setBodyMarkdown(event.currentTarget.value)}
          placeholder="Leave a comment"
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
  bodyMarkdown: string;
  title: string;
};

export function buildProjectIssueFormSubmitInput(input: {
  assigneeLoginId: string;
  bodyMarkdown: string;
  title: string;
}): ProjectIssueFormSubmitInput | null {
  const title = input.title.trim();
  if (!title) {
    return null;
  }

  return {
    assigneeLoginId: input.assigneeLoginId.trim(),
    bodyMarkdown: input.bodyMarkdown,
    title,
  };
}
