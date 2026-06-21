import * as React from "react";
import type { LegacyI18nContextValue } from "../i18n";
import type { RuntimeConfig } from "../runtime-config";
import { MarkdownAttachmentTextarea } from "./-markdown-attachment-textarea";
import { LegacyMarkdownEditorShell, MarkdownRenderer } from "./-markdown-renderer";
import { buildProjectHref, ProjectHeader, ProjectMenu } from "./-project-views";
import type {
  ProjectDetailViewModel,
  ProjectMilestoneIssueViewModel,
  ProjectMilestoneListViewModel,
  ProjectMilestoneViewModel,
} from "./-view-models";

type LegacyMessageLookup = LegacyI18nContextValue["t"];

function legacyMessage(messages: LegacyMessageLookup | undefined, key: string) {
  return messages ? messages(key, { fallback: key }) : key;
}

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
  return state === "closed"
    ? "milestone.state.closed"
    : state === "all"
      ? "milestone.state.all"
      : "milestone.state.open";
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
  const issueHref = buildProjectHref(
    runtimeConfig,
    detail.ownerName,
    detail.projectName,
    `issue/${issue.issueNumber}`,
  );
  return (
    <a className="issue-link" href={issueHref} target="_blank">
      <div className="issue-item">
        <span className={`state-label ${issue.state}`}>
          {issue.state === "closed" ? <i className="yobicon-checkmark" /> : null}
        </span>
        <span className="item-name">
          <span className="number">{`#${issue.issueNumber}`}</span>
          {` ${issue.title}`}
          {issue.assigneeLabel ? ` - ${issue.assigneeLabel}` : ""}
          {issue.labels.map((label) => (
            <a
              className="label issue-label list-label active"
              data-category-id=""
              data-label-id={label.id}
              href={issueHref}
              key={label.id}
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </a>
          ))}
        </span>
      </div>
    </a>
  );
}

function milestoneActionHref(
  runtimeConfig: RuntimeConfig,
  detail: ProjectDetailViewModel,
  milestoneId: number,
  action: "close" | "delete" | "open",
) {
  return buildProjectHref(
    runtimeConfig,
    detail.ownerName,
    detail.projectName,
    `milestone/${milestoneId}/${action}`,
  );
}

function legacyMilestoneValidationMessage(input: {
  contentsMarkdown: string;
  dueDate: string;
  title: string;
}) {
  if (input.title.trim().length === 0) {
    return "milestone.error.title";
  }
  if (input.contentsMarkdown.trim().length === 0) {
    return "milestone.error.content";
  }
  if (input.dueDate.trim().length > 0 && !/\d{4}-\d{2}-\d{2}$/.test(input.dueDate.trim())) {
    return "milestone.error.duedateFormat";
  }
  return null;
}

function MilestoneSearchBox(props: { placeholder: string }) {
  return (
    <div className="pull-left search search-bar">
      <input
        className="textbox"
        defaultValue=""
        name="filter"
        placeholder={props.placeholder}
        type="text"
      />
      <button className="search-btn" type="submit">
        <i className="yobicon-search" />
      </button>
    </div>
  );
}

export function ProjectMilestoneListPage(props: {
  detail: ProjectDetailViewModel | null;
  list: ProjectMilestoneListViewModel | null;
  messages?: LegacyMessageLookup;
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
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="milestone" detail={detail} runtimeConfig={props.runtimeConfig} />
      <link
        href={buildProjectHref(
          props.runtimeConfig,
          detail.ownerName,
          detail.projectName,
          "issue/labels.css",
        )}
        rel="stylesheet"
        type="text/css"
      />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
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
                  {legacyMessage(props.messages, "milestone.menu.new")}
                </a>
              </div>
            ) : null}
            <ul className="nav nav-tabs">
              {["open", "closed", "all"].map((state) => (
                <li className={list.state === state ? "active" : ""} key={state}>
                  <a href={tabHref(props.runtimeConfig, detail, "milestones", state)}>
                    {legacyMessage(props.messages, stateLabel(state))}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {list.milestones.length === 0 ? (
            <div className="error-wrap">
              <i className="ico ico-err1" />
              <p>{legacyMessage(props.messages, "milestone.is.empty")}</p>
            </div>
          ) : (
            <>
              <div className="filter-wrap milestone">
                {list.milestones.length > 1 ? (
                  <>
                    <div className="filters">
                      <a
                        className={list.orderBy === "dueDate" ? "filter active" : "filter"}
                        href={sortHref(props.runtimeConfig, detail, list, "dueDate")}
                      >
                        <i
                          className={`ico btn-gray-arrow${
                            list.orderBy === "dueDate" && list.orderDir === "desc" ? " down" : ""
                          }`}
                        />
                        {legacyMessage(props.messages, "common.order.dueDate")}
                      </a>
                      <a
                        className={list.orderBy === "completionRate" ? "filter active" : "filter"}
                        href={sortHref(props.runtimeConfig, detail, list, "completionRate")}
                      >
                        <i
                          className={`ico btn-gray-arrow${
                            list.orderBy === "completionRate" && list.orderDir === "desc"
                              ? " down"
                              : ""
                          }`}
                        />
                        {legacyMessage(props.messages, "common.order.completionRate")}
                      </a>
                    </div>
                    <MilestoneSearchBox
                      placeholder={legacyMessage(props.messages, "search.title")}
                    />
                  </>
                ) : null}
              </div>
              <div className="row-fluid">
                <div>
                  <ul className="milestones">
                    {list.milestones.map((milestone) => (
                      <li className="milestone" key={milestone.id}>
                        <div className="infos">
                          <div className="meta-info">
                            <strong className="version" />
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
                            <span className="issue-item">{`${milestone.closedIssueCount} / ${
                              milestone.openIssueCount + milestone.closedIssueCount
                            }`}</span>
                            {list.state === "all" ? (
                              <>
                                <span className="sp">|</span>
                                <span className={`state nm ${milestone.state}`}>
                                  {legacyMessage(props.messages, stateLabel(milestone.state))}
                                </span>
                              </>
                            ) : null}
                            {milestone.dueDateLabel ? (
                              <>
                                <span className="sp">|</span>
                                <span
                                  className={`due-date${
                                    milestone.state === "closed" ? " ml5" : ""
                                  }`}
                                >
                                  {legacyMessage(props.messages, "label.dueDate")}{" "}
                                  <strong>{milestone.dueDateLabel}</strong>
                                </span>
                              </>
                            ) : null}
                            <div className="pull-right">
                              <span className="number completion-rate">
                                {milestone.openIssueCount + milestone.closedIssueCount > 0
                                  ? `${milestone.completionPercent}%`
                                  : ""}
                              </span>
                            </div>
                          </div>
                          <div className="progress-wrap">
                            <MilestoneProgress percent={milestone.completionPercent} />
                          </div>
                        </div>
                        <div>
                          <div />
                          <div>
                            {milestone.openIssues.map((issue) => (
                              <MilestoneIssueLink
                                detail={detail}
                                issue={issue}
                                key={`open-${issue.issueNumber}`}
                                runtimeConfig={props.runtimeConfig}
                              />
                            ))}
                          </div>
                          <div />
                          <div>
                            {milestone.closedIssues.map((issue) => (
                              <MilestoneIssueLink
                                detail={detail}
                                issue={issue}
                                key={`closed-${issue.issueNumber}`}
                                runtimeConfig={props.runtimeConfig}
                              />
                            ))}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export function ProjectMilestoneDetailPage(props: {
  detail: ProjectDetailViewModel | null;
  issueState: string;
  messages?: LegacyMessageLookup;
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
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="milestone" detail={detail} runtimeConfig={props.runtimeConfig} />
      <link
        href={buildProjectHref(
          props.runtimeConfig,
          detail.ownerName,
          detail.projectName,
          "issue/labels.css",
        )}
        rel="stylesheet"
        type="text/css"
      />
      {milestone ? (
        <>
          <div className="page-wrap-outer">
            <div className="project-page-wrap">
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
                        {legacyMessage(props.messages, "label.dueDate")}{" "}
                        <strong>{milestone.dueDateLabel}</strong>
                      </span>
                    ) : null}
                    <span className={`badge badge-issue-${milestone.state} margin-left-5`}>
                      {legacyMessage(props.messages, stateLabel(milestone.state))}
                    </span>
                  </small>
                </h4>
                <MilestoneProgress percent={milestone.completionPercent} />
                {milestone.contentsMarkdown.trim() ? (
                  <div className="milestone-desc">
                    <MarkdownRenderer
                      className="markdown-wrap"
                      basePath={props.runtimeConfig.basePath}
                      issueReferences={milestone.issueReferences}
                      markdown={milestone.contentsMarkdown}
                      mentionReferences={milestone.mentionReferences}
                      ownerName={detail.ownerName}
                      projectName={detail.projectName}
                    />
                    <div className="attachments" data-attachments="[]">
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
                <div
                  className="actrow right-txt row-fluid"
                  style={{ clear: "both", padding: "15px 0" }}
                >
                  <a
                    className="ybtn pull-left"
                    href={buildProjectHref(
                      props.runtimeConfig,
                      detail.ownerName,
                      detail.projectName,
                      "milestones",
                    )}
                  >
                    {legacyMessage(props.messages, "button.list")}
                  </a>
                  {milestone.viewerCanDelete && props.onDelete ? (
                    <a className="ybtn ybtn-danger" data-toggle="modal" href="#deleteConfirm">
                      {legacyMessage(props.messages, "button.delete")}
                    </a>
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
                        {legacyMessage(props.messages, "button.edit")}
                      </a>
                      {milestone.state === "open" && props.onClose ? (
                        <button
                          className="ybtn"
                          data-request-method="post"
                          data-request-uri={milestoneActionHref(
                            props.runtimeConfig,
                            detail,
                            milestone.id,
                            "close",
                          )}
                          onClick={() => void props.onClose?.()}
                          type="button"
                        >
                          {legacyMessage(props.messages, "milestone.close")}
                        </button>
                      ) : null}
                      {milestone.state === "closed" && props.onOpen ? (
                        <button
                          className="ybtn"
                          data-request-method="post"
                          data-request-uri={milestoneActionHref(
                            props.runtimeConfig,
                            detail,
                            milestone.id,
                            "open",
                          )}
                          onClick={() => void props.onOpen?.()}
                          type="button"
                        >
                          {legacyMessage(props.messages, "milestone.open")}
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
                          href={`${tabHref(
                            props.runtimeConfig,
                            detail,
                            `milestone/${milestone.id}`,
                            state,
                          )}#issues`}
                        >
                          {legacyMessage(
                            props.messages,
                            state === "open"
                              ? "issue.state.open"
                              : state === "closed"
                                ? "issue.state.closed"
                                : "issue.state.all",
                          )}
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
                    <div className="filter-wrap">
                      <div className="pull-right search search-bar">
                        <input
                          className="textbox"
                          data-items="issue-item"
                          data-toggle="item-search"
                          defaultValue=""
                          name="filter"
                          placeholder={legacyMessage(props.messages, "milestone.searchPlaceholder")}
                          type="text"
                        />
                        <button className="search-btn" type="submit">
                          <i className="yobicon-search" />
                        </button>
                      </div>
                    </div>
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
            </div>
          </div>
          {milestone.viewerCanDelete && props.onDelete ? (
            <div className="modal hide fade" id="deleteConfirm">
              <div className="modal-header">
                <button
                  aria-label={legacyMessage(props.messages, "button.close")}
                  className="close"
                  data-dismiss="modal"
                  type="button"
                >
                  ×
                </button>
                <h3>{legacyMessage(props.messages, "milestone.delete")}</h3>
              </div>
              <div className="modal-body">
                <p>{legacyMessage(props.messages, "post.delete.confirm")}</p>
              </div>
              <div className="modal-footer">
                <button
                  className="ybtn ybtn-danger"
                  data-request-method="delete"
                  data-request-uri={milestoneActionHref(
                    props.runtimeConfig,
                    detail,
                    milestone.id,
                    "delete",
                  )}
                  onClick={() => void props.onDelete?.()}
                  type="button"
                >
                  {legacyMessage(props.messages, "button.yes")}
                </button>
                <button className="ybtn" data-dismiss="modal" type="button">
                  {legacyMessage(props.messages, "button.no")}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

export function ProjectMilestoneFormPage(props: {
  csrfToken?: string;
  detail: ProjectDetailViewModel | null;
  initialMilestone?: ProjectMilestoneViewModel | null;
  messages?: LegacyMessageLookup;
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
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTitle(initial?.title ?? "");
    setContentsMarkdown(initial?.contentsMarkdown ?? "");
    setAttachmentIds([]);
    setDueDate(initial?.dueDateLabel ?? "");
    setState(initial?.state ?? "open");
    setValidationMessage(null);
  }, [initial]);

  return (
    <main className="app-shell milestone-form-page">
      <h1 className="sr-only">
        {props.mode === "create" ? "title.newMilestone" : "title.editMilestone"}
      </h1>
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="milestone" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="content-wrap frm-wrap">
            <form
              action={
                props.mode === "edit" && initial?.id
                  ? buildProjectHref(
                      props.runtimeConfig,
                      detail.ownerName,
                      detail.projectName,
                      `milestone/${initial.id}/edit`,
                    )
                  : buildProjectHref(
                      props.runtimeConfig,
                      detail.ownerName,
                      detail.projectName,
                      "milestones",
                    )
              }
              id="milestone-form"
              method="post"
              onSubmit={(event) => {
                event.preventDefault();
                const nextValidationMessage = legacyMilestoneValidationMessage({
                  contentsMarkdown,
                  dueDate,
                  title,
                });
                if (nextValidationMessage) {
                  setValidationMessage(nextValidationMessage);
                  return;
                }
                setValidationMessage(null);
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
              <div className="row-fluid">
                <div className="span12">
                  <dl>
                    <dd>
                      <input
                        className="zen-mode text title"
                        id="title"
                        maxLength={250}
                        name="title"
                        onChange={(event) => {
                          setTitle(event.currentTarget.value);
                          setValidationMessage(null);
                        }}
                        placeholder={legacyMessage(props.messages, "title.text")}
                        data-legacy-tabindex="1"
                        type="text"
                        value={title}
                      />
                    </dd>
                  </dl>
                </div>
                <div className="row-fluid">
                  <div className="span9 span-left-pane">
                    <dl>
                      <dd style={{ position: "relative" }}>
                        <LegacyMarkdownEditorShell
                          editId="edit-content-body"
                          editorMode="content-body"
                          previewId="preview-content-body"
                        >
                          <MarkdownAttachmentTextarea
                            ariaLabel="milestone.form.content"
                            className="editorSeries content comment nm"
                            csrfToken={props.csrfToken}
                            editorMode="content-body"
                            id="editor-contents-content-body"
                            name="contents"
                            onAttachmentUpload={(attachment) =>
                              setAttachmentIds((current) => [...current, attachment.id])
                            }
                            onChange={(nextValue) => {
                              setContentsMarkdown(nextValue);
                              setValidationMessage(null);
                            }}
                            runtimeConfig={props.runtimeConfig}
                            value={contentsMarkdown}
                          />
                        </LegacyMarkdownEditorShell>
                      </dd>
                    </dl>
                    <div className="actrow right-txt">
                      <button className="ybtn ybtn-info" disabled={pending} type="submit">
                        {legacyMessage(props.messages, "button.save")}
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
                        {legacyMessage(props.messages, "button.cancel")}
                      </a>
                    </div>
                  </div>
                  <div className="span3 span-hard-wrap">
                    <dl className="issue-option">
                      <dt>{legacyMessage(props.messages, "milestone.form.state")}</dt>
                      <dd>
                        <div>
                          <input
                            checked={state === "open"}
                            className="radio-btn"
                            id="milestone-open"
                            name="state"
                            onChange={() => setState("open")}
                            type="radio"
                            value="open"
                          />
                          <label className="bold" htmlFor="milestone-open">
                            {legacyMessage(props.messages, "milestone.state.open")}
                          </label>{" "}
                          <input
                            checked={state === "closed"}
                            className="radio-btn"
                            id="milestone-close"
                            name="state"
                            onChange={() => setState("closed")}
                            type="radio"
                            value="closed"
                          />
                          <label className="bold" htmlFor="milestone-close">
                            {legacyMessage(props.messages, "milestone.state.closed")}
                          </label>
                        </div>
                      </dd>
                    </dl>
                    <dl className="issue-option">
                      <dt>{legacyMessage(props.messages, "milestone.form.dueDate")}</dt>
                      <dd>
                        <div>
                          <label
                            aria-label={legacyMessage(props.messages, "milestone.dueDate")}
                            htmlFor="dueDate"
                          >
                            <input
                              autoComplete="off"
                              className="validate due-date"
                              id="dueDate"
                              name="dueDate"
                              onChange={(event) => {
                                setDueDate(event.currentTarget.value);
                                setValidationMessage(null);
                              }}
                              type="text"
                              value={dueDate}
                            />
                          </label>
                          <div className="date-picker" id="datepicker" />
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              {validationMessage ? (
                <div className="alert alert-error" role="alert">
                  {validationMessage}
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
