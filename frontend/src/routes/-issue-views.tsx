import * as React from "react";
import type { RuntimeConfig } from "../runtime-config";
import { buildProjectHref, ProjectMenu } from "./-project-views";
import type {
  ProjectDetailViewModel,
  ProjectIssueDetailViewModel,
  ProjectIssueListViewModel,
} from "./-view-models";

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
  onCommentDelete?: (commentId: number) => Promise<void>;
  onCommentSubmit?: (contentsMarkdown: string) => Promise<void>;
  onCommentUpdate?: (commentId: number, contentsMarkdown: string) => Promise<void>;
  onDeleteIssue?: () => Promise<void>;
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
      <h1>{issue?.title ?? "Issue"}</h1>
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
          <IssueAssignForm initialAssignee={issue.assigneeLoginId} onSubmit={props.onAssign} />
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

function IssueAssignForm(props: {
  initialAssignee: string;
  onSubmit: (assigneeLoginId: string) => Promise<void>;
}) {
  const [assigneeLoginId, setAssigneeLoginId] = React.useState(props.initialAssignee);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void props.onSubmit(assigneeLoginId.trim());
      }}
    >
      <input
        name="assigneeLoginId"
        onChange={(event) => setAssigneeLoginId(event.currentTarget.value)}
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
  onSubmit: (input: { bodyMarkdown: string; title: string }) => Promise<void>;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const [title, setTitle] = React.useState(props.initialIssue?.title ?? "");
  const [bodyMarkdown, setBodyMarkdown] = React.useState(props.initialIssue?.bodyMarkdown ?? "");
  const [submitting, setSubmitting] = React.useState(false);
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
          const nextTitle = title.trim();
          if (!nextTitle) {
            return;
          }
          setSubmitting(true);
          void props
            .onSubmit({ bodyMarkdown, title: nextTitle })
            .finally(() => setSubmitting(false));
        }}
      >
        <input
          name="title"
          onChange={(event) => setTitle(event.currentTarget.value)}
          placeholder="Title"
          value={title}
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
