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
            onSearchSharableUsers={props.onSearchSharableUsers}
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
                    csrfToken={props.csrfToken}
                    getIssueReferencesQueryOptions={props.getIssueReferencesQueryOptions}
                    initialContents={item.comment.contentsMarkdown}
                    onSearchMentionUsers={props.onSearchMentionUsers}
                    onSubmit={props.onCommentUpdate}
                    runtimeConfig={props.runtimeConfig}
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
          <IssueCommentForm
            csrfToken={props.csrfToken}
            getIssueReferencesQueryOptions={props.getIssueReferencesQueryOptions}
            onSearchMentionUsers={props.onSearchMentionUsers}
            onSubmit={props.onCommentSubmit}
            runtimeConfig={props.runtimeConfig}
          />
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
  commentId: number;
  csrfToken?: string;
  getIssueReferencesQueryOptions?: IssueReferenceQueryOptionsFactory;
  initialContents: string;
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
  const [editing, setEditing] = React.useState(false);
  const [contentsMarkdown, setContentsMarkdown] = React.useState(props.initialContents);
  const [attachmentIds, setAttachmentIds] = React.useState<number[]>([]);
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
        void props.onSubmit(props.commentId, nextContents, attachmentIds).then(() => {
          setAttachmentIds([]);
          setEditing(false);
        });
      }}
    >
      <IssueMentionTextarea
        context="issue-comment"
        csrfToken={props.csrfToken}
        getIssueReferencesQueryOptions={props.getIssueReferencesQueryOptions}
        onAttachmentUpload={(attachment) =>
          setAttachmentIds((current) => [...current, attachment.id])
        }
        onChange={setContentsMarkdown}
        onSearchMentionUsers={props.onSearchMentionUsers}
        placeholder="Leave a comment"
        runtimeConfig={props.runtimeConfig}
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
  csrfToken?: string;
  detail: ProjectDetailViewModel | null;
  getIssueReferencesQueryOptions?: IssueReferenceQueryOptionsFactory;
  initialIssue?: ProjectIssueDetailViewModel | null;
  mode: "create" | "edit";
  onSearchAssignableUsers?: (query: string) => Promise<IssueAssignableUsersResponse>;
  onSearchMentionUsers?: (
    query: string,
    context: IssueMentionUserSearchContext,
  ) => Promise<IssueMentionUsersResponse>;
  onSubmit: (input: ProjectIssueFormSubmitInput) => Promise<void>;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const [title, setTitle] = React.useState(props.initialIssue?.title ?? "");
  const [bodyMarkdown, setBodyMarkdown] = React.useState(props.initialIssue?.bodyMarkdown ?? "");
  const [attachmentIds, setAttachmentIds] = React.useState<number[]>([]);
  const [assigneeLoginId, setAssigneeLoginId] = React.useState(
    props.initialIssue?.assigneeLoginId ?? "",
  );
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    setTitle(props.initialIssue?.title ?? "");
    setBodyMarkdown(props.initialIssue?.bodyMarkdown ?? "");
    setAttachmentIds([]);
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
