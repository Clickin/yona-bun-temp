import * as React from "react";
import { LEGACY_DEFAULT_LANGUAGE, lookupLegacyMessage, type LegacyI18nContextValue } from "../i18n";
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
  return messages
    ? messages(key, { fallback: key })
    : lookupLegacyMessage(LEGACY_DEFAULT_LANGUAGE, key);
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
  const nextDir = list.orderBy === orderBy ? (list.orderDir === "desc" ? "asc" : "desc") : "asc";
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
  hidden?: boolean;
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
    <a
      className="issue-link"
      href={issueHref}
      style={props.hidden ? { display: "none" } : undefined}
      target="_blank"
    >
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
}): null | { field: "contents" | "dueDate" | "title"; key: string } {
  if (input.title.trim().length === 0) {
    return { field: "title", key: "milestone.error.title" };
  }
  if (input.contentsMarkdown.trim().length === 0) {
    return { field: "contents", key: "milestone.error.content" };
  }
  if (input.dueDate.trim().length > 0 && !/\d{4}-\d{2}-\d{2}$/.test(input.dueDate.trim())) {
    return { field: "dueDate", key: "milestone.error.duedateFormat" };
  }
  return null;
}

function MilestoneSearchBox(props: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="pull-left search search-bar">
      <input
        className="textbox"
        onChange={(event) => props.onChange(event.currentTarget.value)}
        value={props.value}
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

function milestoneIssueText(issue: ProjectMilestoneIssueViewModel) {
  return [
    `#${issue.issueNumber}`,
    issue.title,
    issue.assigneeLabel,
    ...issue.labels.map((label) => label.name),
  ]
    .join(" ")
    .toLowerCase();
}

function milestoneIssueHidden(issue: ProjectMilestoneIssueViewModel, filter: string) {
  const value = filter.toLowerCase().trim();
  return value.length > 0 && !milestoneIssueText(issue).includes(value);
}

function milestoneAttachmentMetadata(attachments: ProjectMilestoneViewModel["attachments"]) {
  return attachments.map((attachment) => ({
    fileHref: attachment.url,
    fileId: attachment.id,
    fileName: attachment.name,
  }));
}

function LegacyMilestoneFileUploaderShell(props: {
  messages?: LegacyMessageLookup;
  resourceId?: number | null;
}) {
  return (
    <div
      className="upload-wrap content-footer"
      data-resource-id={props.resourceId ?? undefined}
      data-resource-type="MILESTONE"
      id="upload"
    >
      <div className="attach-wrap">
        <span className="help help-droppable">
          {legacyMessage(props.messages, "common.attach.drophere")}
        </span>
        <div className="btn-wrap">
          <div className="nbtn medium white fake-file-wrap">
            <i className="yobicon-upload" /> {legacyMessage(props.messages, "button.upload")}
            <input className="file" multiple name="filePath" type="file" />
          </div>
        </div>
        <span className="plain">{legacyMessage(props.messages, "common.attach.clickbutton")}</span>
        <span className="help help-pastable">
          {legacyMessage(props.messages, "common.attach.pastehere")}
        </span>
      </div>
      <ul className="attached-files unstyled" />
      <p className="right-txt help">
        <i className="yobicon-supportrequest" />{" "}
        {legacyMessage(props.messages, "common.attach.attachIfYouSave")}
      </p>
    </div>
  );
}

function LegacyMilestoneAttachmentList(props: {
  attachments: ProjectMilestoneViewModel["attachments"];
}) {
  return (
    <ul className="attached-files unstyled">
      {props.attachments.map((attachment) => (
        <li
          className="attached-file"
          data-href={attachment.url}
          data-id={attachment.id}
          data-name={attachment.name}
          key={attachment.id}
        >
          <i className="yobicon-supportrequest" />
          <i className="mimetype" />
          <a className="name" href={attachment.url}>
            {attachment.name}
          </a>
        </li>
      ))}
    </ul>
  );
}

function LegacyMilestoneMassUpdateShell(props: {
  detail: ProjectDetailViewModel;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <div className="mass-update-wrap hide-in-mobile">
      <form
        className="mass-update-form pull-left"
        id="mass-update-form"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="btn-group check-all">
          <label aria-label={legacyMessage(props.messages, "issue.selectAll")} htmlFor="check-all">
            <input data-target="checked-issue" id="check-all" type="checkbox" />
          </label>
        </div>
        <div className="btn-group" data-name="state" id="state">
          <button
            className="btn dropdown-toggle medium"
            data-toggle="dropdown"
            disabled
            type="button"
          >
            <span className="d-label">{legacyMessage(props.messages, "issue.update.state")}</span>
            <span className="d-caret">
              <span className="caret" />
            </span>
          </button>
          <ul className="dropdown-menu mass-update-list">
            <li data-value="OPEN">
              <a
                href={buildProjectHref(
                  props.runtimeConfig,
                  props.detail.ownerName,
                  props.detail.projectName,
                  "issues?state=open",
                )}
              >
                {legacyMessage(props.messages, "issue.state.open")}
              </a>
            </li>
            <li data-value="CLOSED">
              <a
                href={buildProjectHref(
                  props.runtimeConfig,
                  props.detail.ownerName,
                  props.detail.projectName,
                  "issues?state=closed",
                )}
              >
                {legacyMessage(props.messages, "issue.state.closed")}
              </a>
            </li>
          </ul>
        </div>
      </form>
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
  const [filter, setFilter] = React.useState("");

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
                      onChange={setFilter}
                      placeholder={legacyMessage(props.messages, "search.title")}
                      value={filter}
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
                                    milestone.state === "closed"
                                      ? " ml5"
                                      : milestone.dueDateOverdue
                                        ? " over"
                                        : ""
                                  }`}
                                >
                                  {legacyMessage(props.messages, "label.dueDate")}{" "}
                                  <strong>{milestone.dueDateLabel}</strong>
                                  {milestone.state !== "closed" && milestone.untilLabel ? (
                                    <span className="date">({milestone.untilLabel})</span>
                                  ) : null}
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
                                hidden={milestoneIssueHidden(issue, filter)}
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
                                hidden={milestoneIssueHidden(issue, filter)}
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
  const [filter, setFilter] = React.useState("");

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
                      <>
                        <span className="due-date">
                          {legacyMessage(props.messages, "label.dueDate")}{" "}
                          <strong>{milestone.dueDateLabel}</strong>
                        </span>
                        {milestone.state !== "closed" && milestone.untilLabel ? (
                          <span className="date">({milestone.untilLabel})</span>
                        ) : null}
                      </>
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
                    <div
                      className="attachments"
                      data-attachments={JSON.stringify(
                        milestoneAttachmentMetadata(milestone.attachments),
                      )}
                    >
                      <LegacyMilestoneAttachmentList attachments={milestone.attachments} />
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
                          onClick={(event) => {
                            event.preventDefault();
                            void props.onClose?.();
                          }}
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
                          onClick={(event) => {
                            event.preventDefault();
                            void props.onOpen?.();
                          }}
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
                      <LegacyMilestoneMassUpdateShell
                        detail={detail}
                        messages={props.messages}
                        runtimeConfig={props.runtimeConfig}
                      />
                      <div className="pull-right search search-bar">
                        <input
                          className="textbox"
                          data-items="issue-item"
                          data-toggle="item-search"
                          name="filter"
                          onChange={(event) => setFilter(event.currentTarget.value)}
                          placeholder={legacyMessage(props.messages, "milestone.searchPlaceholder")}
                          type="text"
                          value={filter}
                        />
                        <button className="search-btn" type="submit">
                          <i className="yobicon-search" />
                        </button>
                      </div>
                    </div>
                    {issues.map((issue) => (
                      <MilestoneIssueLink
                        detail={detail}
                        hidden={milestoneIssueHidden(issue, filter)}
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
                  onClick={(event) => {
                    event.preventDefault();
                    void props.onDelete?.();
                  }}
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
  const [validationMessage, setValidationMessage] = React.useState<null | {
    field: "contents" | "dueDate" | "title";
    key: string;
  }>(null);

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
        {legacyMessage(
          props.messages,
          props.mode === "create" ? "title.newMilestone" : "title.editMilestone",
        )}
      </h1>
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="milestone" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="content-wrap frm-wrap">
            <form
              id="milestone-form"
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
                const submitMilestone = props.onSubmit;
                if (!submitMilestone) {
                  return;
                }
                setValidationMessage(null);
                setPending(true);
                void submitMilestone({
                  attachmentIds,
                  contentsMarkdown,
                  dueDate,
                  state,
                  title,
                }).finally(() => setPending(false));
              }}
            >
              <div className="row-fluid">
                <div className="span12">
                  <dl>
                    <dd>
                      <input
                        className={`zen-mode text title${
                          validationMessage?.field === "title" ? " error" : ""
                        }`}
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
                      {validationMessage?.field === "title" ? (
                        <div className="message">
                          <div>{legacyMessage(props.messages, validationMessage.key)}</div>
                        </div>
                      ) : null}
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
                          messages={props.messages}
                          previewId="preview-content-body"
                        >
                          <MarkdownAttachmentTextarea
                            ariaLabel={legacyMessage(props.messages, "milestone.form.content")}
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
                        {validationMessage?.field === "contents" ? (
                          <div className="message">
                            <div>{legacyMessage(props.messages, validationMessage.key)}</div>
                          </div>
                        ) : null}
                      </dd>
                    </dl>
                    <LegacyMilestoneFileUploaderShell
                      messages={props.messages}
                      resourceId={props.mode === "edit" ? initial?.id : null}
                    />
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
                            aria-label={legacyMessage(props.messages, "milestone.form.dueDate")}
                            htmlFor="dueDate"
                          >
                            <input
                              autoComplete="off"
                              className={`validate due-date${
                                validationMessage?.field === "dueDate" ? " error" : ""
                              }`}
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
                          {validationMessage?.field === "dueDate" ? (
                            <div className="message">
                              <div>{legacyMessage(props.messages, validationMessage.key)}</div>
                            </div>
                          ) : null}
                          <div className="date-picker" id="datepicker" />
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
