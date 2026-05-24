import * as React from "react";
import type { RuntimeConfig } from "../runtime-config";
import { MarkdownAttachmentTextarea } from "./-markdown-attachment-textarea";
import { MarkdownRenderer } from "./-markdown-renderer";
import { buildProjectHref, ProjectMenu } from "./-project-views";
import type {
  ProjectDetailViewModel,
  ProjectMilestoneIssueViewModel,
  ProjectMilestoneListViewModel,
  ProjectMilestoneViewModel,
} from "./-view-models";

function fallbackProjectDetail(ownerName: string, projectName: string): ProjectDetailViewModel {
  return {
    enrollmentRequested: false,
    isFavorited: false,
    organizationName: "",
    overview: "",
    ownerName,
    projectName,
    projectScope: "public",
    viewerCanEnroll: false,
    viewerCanUpdate: false,
  };
}

function stateLabel(state: string) {
  return state === "closed" ? "Closed" : state === "all" ? "All" : "Open";
}

function tabHref(
  runtimeConfig: RuntimeConfig,
  detail: ProjectDetailViewModel,
  suffix: string,
  state: string,
) {
  return `${buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, suffix)}?state=${state}`;
}

function sortHref(
  runtimeConfig: RuntimeConfig,
  detail: ProjectDetailViewModel,
  list: ProjectMilestoneListViewModel,
  orderBy: string,
) {
  const nextDir = list.orderBy === orderBy && list.orderDir === "desc" ? "asc" : "desc";
  return `${buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "milestones")}?state=${list.state}&orderBy=${orderBy}&orderDir=${nextDir}`;
}

function MilestoneProgress(props: { percent: number }) {
  return (
    <div className="progress progress-success" aria-label={`Completion ${props.percent}%`}>
      <div className="bar" style={{ width: `${props.percent}%` }} />
    </div>
  );
}

function MilestoneIssueLink(props: {
  detail: ProjectDetailViewModel;
  issue: ProjectMilestoneIssueViewModel;
  runtimeConfig: RuntimeConfig;
}) {
  const { detail, issue, runtimeConfig } = props;
  return (
    <a
      className="issue-link"
      href={buildProjectHref(
        runtimeConfig,
        detail.ownerName,
        detail.projectName,
        `issue/${issue.issueNumber}`,
      )}
    >
      <span className={`state-label ${issue.state}`}>{issue.state === "closed" ? "✓" : ""}</span>
      <span className="item-name">
        <span className="number">{`#${issue.issueNumber}`}</span>
        {` ${issue.title}`}
        {issue.assigneeLabel ? ` - ${issue.assigneeLabel}` : ""}
        {issue.labels.map((label) => (
          <span
            className="label issue-label list-label active"
            key={label.id}
            style={{ backgroundColor: label.color }}
          >
            {label.name}
          </span>
        ))}
      </span>
    </a>
  );
}

export function ProjectMilestoneListPage(props: {
  detail: ProjectDetailViewModel | null;
  list: ProjectMilestoneListViewModel | null;
  owner: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail(props.owner, props.projectName);
  const list = props.list ?? {
    milestones: [],
    orderBy: "dueDate",
    orderDir: "asc",
    state: "open",
  };

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Milestones</h1>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="tab-wrap">
        {detail.viewerCanUpdate ? (
          <div className="pull-right btns">
            <a
              className="ybtn ybtn-success"
              href={buildProjectHref(
                props.runtimeConfig,
                detail.ownerName,
                detail.projectName,
                "newMilestoneForm",
              )}
            >
              New Milestone
            </a>
          </div>
        ) : null}
        <ul className="nav nav-tabs">
          {["open", "closed", "all"].map((state) => (
            <li className={list.state === state ? "active" : ""} key={state}>
              <a href={tabHref(props.runtimeConfig, detail, "milestones", state)}>
                {stateLabel(state)}
              </a>
            </li>
          ))}
        </ul>
      </div>
      {list.milestones.length === 0 ? (
        <div className="error-wrap">
          <p>No milestone exists</p>
        </div>
      ) : (
        <>
          {list.milestones.length > 1 ? (
            <div className="filter-wrap milestone">
              <div className="filters">
                <a
                  className={list.orderBy === "dueDate" ? "filter active" : "filter"}
                  href={sortHref(props.runtimeConfig, detail, list, "dueDate")}
                >
                  Due date
                </a>
                <a
                  className={list.orderBy === "completionRate" ? "filter active" : "filter"}
                  href={sortHref(props.runtimeConfig, detail, list, "completionRate")}
                >
                  Completion rate
                </a>
              </div>
            </div>
          ) : null}
          <ul className="milestones">
            {list.milestones.map((milestone) => (
              <li className="milestone" key={milestone.id}>
                <div className="infos">
                  <div className="meta-info">
                    <a
                      className="milestone-name"
                      href={buildProjectHref(
                        props.runtimeConfig,
                        detail.ownerName,
                        detail.projectName,
                        `milestone/${milestone.id}`,
                      )}
                    >
                      {milestone.title}
                    </a>
                    <span className="sp">|</span>
                    <span className="issue-item">{`${milestone.closedIssueCount} / ${milestone.openIssueCount + milestone.closedIssueCount}`}</span>
                    {list.state === "all" ? (
                      <>
                        <span className="sp">|</span>
                        <span className={`state nm ${milestone.state}`}>
                          {stateLabel(milestone.state)}
                        </span>
                      </>
                    ) : null}
                    {milestone.dueDateLabel ? (
                      <>
                        <span className="sp">|</span>
                        <span className="due-date">
                          Due date <strong>{milestone.dueDateLabel}</strong>
                        </span>
                      </>
                    ) : null}
                    <span className="number completion-rate">{`${milestone.completionPercent}%`}</span>
                  </div>
                  <MilestoneProgress percent={milestone.completionPercent} />
                </div>
                <div className="milestone-issues">
                  {milestone.openIssues.map((issue) => (
                    <MilestoneIssueLink
                      detail={detail}
                      issue={issue}
                      key={`open-${issue.issueNumber}`}
                      runtimeConfig={props.runtimeConfig}
                    />
                  ))}
                  {milestone.closedIssues.map((issue) => (
                    <MilestoneIssueLink
                      detail={detail}
                      issue={issue}
                      key={`closed-${issue.issueNumber}`}
                      runtimeConfig={props.runtimeConfig}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

export function ProjectMilestoneDetailPage(props: {
  detail: ProjectDetailViewModel | null;
  issueState: string;
  milestone: ProjectMilestoneViewModel | null;
  onClose?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  onOpen?: () => Promise<void>;
  owner: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail(props.owner, props.projectName);
  const milestone = props.milestone;
  const issueState = ["open", "closed", "all"].includes(props.issueState)
    ? props.issueState
    : "open";
  const issues =
    issueState === "closed"
      ? (milestone?.closedIssues ?? [])
      : issueState === "all"
        ? [...(milestone?.openIssues ?? []), ...(milestone?.closedIssues ?? [])]
        : (milestone?.openIssues ?? []);

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>{milestone?.title ?? "Milestone"}</h1>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      {milestone ? (
        <section className="milesion-wrap">
          <h4>
            <a
              className="title"
              href={buildProjectHref(
                props.runtimeConfig,
                detail.ownerName,
                detail.projectName,
                `milestone/${milestone.id}`,
              )}
            >
              {milestone.title}
            </a>
            <small className="ml10">
              {milestone.dueDateLabel ? (
                <span className="due-date">
                  Due date <strong>{milestone.dueDateLabel}</strong>
                </span>
              ) : null}
              <span className={`badge badge-issue-${milestone.state} margin-left-5`}>
                {stateLabel(milestone.state)}
              </span>
            </small>
          </h4>
          <MilestoneProgress percent={milestone.completionPercent} />
          {milestone.contentsMarkdown.trim() ? (
            <div className="milestone-desc">
              <MarkdownRenderer className="markdown-wrap" markdown={milestone.contentsMarkdown} />
              <div className="attachments">
                {milestone.attachments.map((attachment) => (
                  <a href={attachment.url} key={attachment.id}>
                    {attachment.name}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div className="content empty-content" />
          )}
          <div className="actrow right-txt row-fluid">
            <a
              className="ybtn pull-left"
              href={buildProjectHref(
                props.runtimeConfig,
                detail.ownerName,
                detail.projectName,
                "milestones",
              )}
            >
              List
            </a>
            {milestone.viewerCanDelete && props.onDelete ? (
              <button
                className="ybtn ybtn-danger"
                onClick={() => void props.onDelete?.()}
                type="button"
              >
                Delete
              </button>
            ) : null}
            {milestone.viewerCanUpdate ? (
              <>
                <a
                  className="ybtn"
                  href={buildProjectHref(
                    props.runtimeConfig,
                    detail.ownerName,
                    detail.projectName,
                    `milestone/${milestone.id}/editform`,
                  )}
                >
                  Edit
                </a>
                {milestone.state === "open" && props.onClose ? (
                  <button className="ybtn" onClick={() => void props.onClose?.()} type="button">
                    Close
                  </button>
                ) : null}
                {milestone.state === "closed" && props.onOpen ? (
                  <button className="ybtn" onClick={() => void props.onOpen?.()} type="button">
                    Open
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
          <div id="issues">
            <ul className="nav nav-tabs">
              {["open", "closed", "all"].map((state) => (
                <li className={issueState === state ? "active" : ""} key={state}>
                  <a
                    href={tabHref(props.runtimeConfig, detail, `milestone/${milestone.id}`, state)}
                  >
                    {stateLabel(state)}
                    <span className="num-badge">
                      {state === "open"
                        ? milestone.openIssueCount
                        : state === "closed"
                          ? milestone.closedIssueCount
                          : milestone.openIssueCount + milestone.closedIssueCount}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="issues">
              {issues.map((issue) => (
                <MilestoneIssueLink
                  detail={detail}
                  issue={issue}
                  key={`${issue.state}-${issue.issueNumber}`}
                  runtimeConfig={props.runtimeConfig}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

export function ProjectMilestoneFormPage(props: {
  csrfToken?: string;
  detail: ProjectDetailViewModel | null;
  initialMilestone?: ProjectMilestoneViewModel | null;
  mode: "create" | "edit";
  onSubmit?: (input: {
    attachmentIds: number[];
    contentsMarkdown: string;
    dueDate: string;
    state: string;
    title: string;
  }) => Promise<void>;
  owner: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail(props.owner, props.projectName);
  const initial = props.initialMilestone;
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [contentsMarkdown, setContentsMarkdown] = React.useState(initial?.contentsMarkdown ?? "");
  const [attachmentIds, setAttachmentIds] = React.useState<number[]>([]);
  const [dueDate, setDueDate] = React.useState(initial?.dueDateLabel ?? "");
  const [state, setState] = React.useState(initial?.state ?? "open");
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    setTitle(initial?.title ?? "");
    setContentsMarkdown(initial?.contentsMarkdown ?? "");
    setAttachmentIds([]);
    setDueDate(initial?.dueDateLabel ?? "");
    setState(initial?.state ?? "open");
  }, [initial]);

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>{props.mode === "create" ? "New Milestone" : "Edit Milestone"}</h1>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <form
        id="milestone-form"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void props
            .onSubmit?.({
              attachmentIds,
              contentsMarkdown,
              dueDate,
              state,
              title,
            })
            .finally(() => setPending(false));
        }}
      >
        <input
          className="zen-mode text title"
          maxLength={250}
          name="title"
          onChange={(event) => setTitle(event.currentTarget.value)}
          placeholder="Title"
          value={title}
        />
        <MarkdownAttachmentTextarea
          className="content-body"
          csrfToken={props.csrfToken}
          name="contents"
          onAttachmentUpload={(attachment) =>
            setAttachmentIds((current) => [...current, attachment.id])
          }
          onChange={setContentsMarkdown}
          runtimeConfig={props.runtimeConfig}
          value={contentsMarkdown}
        />
        <dl className="issue-option">
          <dt>State</dt>
          <dd>
            <label htmlFor="milestone-open">
              <input
                checked={state === "open"}
                id="milestone-open"
                name="state"
                onChange={() => setState("open")}
                type="radio"
                value="open"
              />
              Open
            </label>
            <label htmlFor="milestone-close">
              <input
                checked={state === "closed"}
                id="milestone-close"
                name="state"
                onChange={() => setState("closed")}
                type="radio"
                value="closed"
              />
              Closed
            </label>
          </dd>
        </dl>
        <dl className="issue-option">
          <dt>Due date</dt>
          <dd>
            <input
              autoComplete="off"
              className="validate due-date"
              name="dueDate"
              onChange={(event) => setDueDate(event.currentTarget.value)}
              placeholder="yyyy-MM-dd"
              type="text"
              value={dueDate}
            />
          </dd>
        </dl>
        <div className="actrow right-txt">
          <button className="ybtn ybtn-info" disabled={pending} type="submit">
            Save
          </button>
          <a
            className="ybtn"
            href={buildProjectHref(
              props.runtimeConfig,
              detail.ownerName,
              detail.projectName,
              "milestones",
            )}
          >
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}
