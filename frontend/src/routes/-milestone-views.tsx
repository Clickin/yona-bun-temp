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

export type MilestoneIssueMassUpdateInput = {
  addLabelIds?: number[];
  assigneeLoginId?: string;
  assigneeUpdate?: boolean;
  milestoneId?: number;
  milestoneUpdate?: boolean;
  removeLabelIds?: number[];
  state?: string;
};

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

function LegacyMilestoneIssuePartialRow(props: {
  detail: ProjectDetailViewModel;
  hidden?: boolean;
  issue: ProjectMilestoneIssueViewModel;
  messages?: LegacyMessageLookup;
  onIssueSelectionChange?: (issueNumber: number, checked: boolean) => void;
  runtimeConfig: RuntimeConfig;
  selectedIssueNumbers?: number[];
}) {
  const { detail, issue, runtimeConfig } = props;
  const issueHref = buildProjectHref(
    runtimeConfig,
    detail.ownerName,
    detail.projectName,
    `issue/${issue.issueNumber}`,
  );
  const issueId = issue.id ?? issue.issueNumber;
  const issueSelected = (props.selectedIssueNumbers ?? []).includes(issue.issueNumber);
  return (
    <li
      className="post-item title"
      data-item="issue-item"
      data-value={`${issue.authorLoginId ?? ""} ${issue.issueNumber} ${issue.title}`}
      id={`issue-item-${issueId}`}
      style={props.hidden ? { display: "none" } : undefined}
    >
      <div className="span9 span-hard-wrap">
        {issue.id ? (
          <label className="mass-update-check hide-in-mobile" htmlFor={`issue-${issueId}`}>
            <input
              checked={issueSelected}
              data-issue-id={issue.id}
              data-issue-labels={issue.labels
                .map((label) => `,${label.id},${label.name},,false|`)
                .join("")}
              data-toggle="issue-checkbox"
              id={`issue-${issueId}`}
              name="checked-issue"
              onChange={(event) =>
                props.onIssueSelectionChange?.(issue.issueNumber, event.currentTarget.checked)
              }
              type="checkbox"
            />
            <span className="blind">{`#${issue.issueNumber}`}</span>
          </label>
        ) : null}
        <div className="issue-item-row">
          <div className="title-wrap">
            <a className="title" href={issueHref}>
              <span className="post-id">{`#${issue.issueNumber}`}</span>
            </a>
            {(issue.weight ?? 0) > 0 ? (
              <span
                className="weight-up-arrow"
                data-placement="right"
                data-toggle="tooltip"
                title={`${legacyMessage(props.messages, "issue.weight")} ${issue.weight ?? 0}`}
              >
                <i className="yobicon-angle-circled-up" />
              </span>
            ) : null}
            {(issue.weight ?? 0) < 0 ? (
              <span
                className="weight-down-arrow"
                data-placement="right"
                data-toggle="tooltip"
                title={`${legacyMessage(props.messages, "issue.weight")} ${issue.weight ?? 0}`}
              >
                <i className="yobicon-angle-circled-down" />
              </span>
            ) : null}
            <a className="title" href={issueHref}>
              {issue.title}
            </a>
          </div>
          <div className="infos">
            {issue.authorLabel ? (
              <a
                className="infos-item infos-link-item"
                data-placement="bottom"
                data-toggle="tooltip"
                href={`${runtimeConfig.basePath}/users/${issue.authorLoginId ?? ""}`}
                title={issue.authorLoginId ?? ""}
              >
                {issue.authorLabel}
              </a>
            ) : (
              <span className="infos-item">{legacyMessage(props.messages, "issue.noAuthor")}</span>
            )}
            {issue.updatedLabel ? (
              <span className="infos-item" data-placement="bottom" data-toggle="tooltip">
                {issue.updatedLabel}
              </span>
            ) : null}
            {(issue.childOpenCount ?? 0) + (issue.childClosedCount ?? 0) > 0 ? (
              <span className="infos-item child-issue-count">
                {`${issue.childClosedCount ?? 0} / ${
                  (issue.childOpenCount ?? 0) + (issue.childClosedCount ?? 0)
                }`}
              </span>
            ) : null}
            {issue.milestoneTitle ? (
              <span className="mileston-tag">
                <a
                  data-placement="bottom"
                  data-toggle="tooltip"
                  href={buildProjectHref(
                    runtimeConfig,
                    detail.ownerName,
                    detail.projectName,
                    `milestone/${issue.milestoneId ?? ""}`,
                  )}
                  title={legacyMessage(props.messages, "milestone")}
                >
                  {issue.milestoneTitle}
                </a>
              </span>
            ) : null}
            {issue.commentCount > 0 ||
            (issue.voterCount ?? 0) > 0 ||
            (issue.watcherCount ?? 0) > 0 ? (
              <span className="infos-item item-count-groups">
                {issue.commentCount > 0 ? (
                  <a className="comment-count" href={`${issueHref}#comments`}>
                    <i className="yobicon-comments" /> {issue.commentCount}
                  </a>
                ) : null}
                {(issue.voterCount ?? 0) > 0 ? (
                  <a className="vote-count" href={`${issueHref}#vote`}>
                    <i className="yobicon-hearts" /> {issue.voterCount ?? 0}
                  </a>
                ) : null}
                {(issue.watcherCount ?? 0) > 0 ? (
                  <span className="sharer-count">
                    <i className="yobicon-share" /> {issue.watcherCount ?? 0}
                  </span>
                ) : null}
              </span>
            ) : null}
            {issue.labels.map((label) => (
              <a
                className="label issue-label list-label active"
                data-category-id=""
                data-label-id={label.id}
                href={buildProjectHref(
                  runtimeConfig,
                  detail.ownerName,
                  detail.projectName,
                  `issues?labelIds=${label.id}`,
                )}
                key={label.id}
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </a>
            ))}
            <div className="child-issue-list hide" />
          </div>
        </div>
      </div>
      <div className="span3 hide-in-mobile">
        <div className="mt5 pull-right">
          {issue.assigneeLabel ? (
            <a
              className="avatar-wrap assinee"
              data-placement="top"
              data-toggle="tooltip"
              href={`${runtimeConfig.basePath}/users/${issue.assigneeLoginId ?? ""}`}
              title={`${legacyMessage(props.messages, "issue.assignee")}: ${issue.assigneeLabel}`}
            >
              {issue.assigneeAvatarUrl ? (
                <img
                  alt={issue.assigneeLabel}
                  height={32}
                  src={issue.assigneeAvatarUrl}
                  width={32}
                />
              ) : (
                <span>{issue.assigneeLabel.slice(0, 1).toUpperCase()}</span>
              )}
            </a>
          ) : (
            <div className="empty-avatar-wrap">&nbsp;</div>
          )}
        </div>
        {issue.dueDateLabel ? (
          <div
            className={`mr20 mt10 pull-right${issue.state === "closed" ? " darkgray-txt" : ""}${
              issue.state === "open" && (issue.dueDateOverdue ?? false) ? " overdue" : ""
            }`}
            data-placement={issue.state === "open" ? "top" : undefined}
            data-toggle={issue.state === "open" ? "tooltip" : undefined}
            title={issue.state === "open" ? issue.dueDateLabel : undefined}
          >
            <i className="yobicon-clock2 mr3 vmiddle" />
            <span className="vmiddle">
              {issue.state === "open" && (issue.dueDateOverdue ?? false)
                ? legacyMessage(props.messages, "issue.dueDate.overdue")
                : issue.dueDateLabel}
            </span>
          </div>
        ) : null}
      </div>
    </li>
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

function LegacyMassUpdateDropdownButton(props: { disabled: boolean; label: string }) {
  return (
    <button
      className="btn dropdown-toggle medium"
      data-toggle="dropdown"
      disabled={props.disabled}
      type="button"
    >
      <span className="d-label">{props.label}</span>
      <span className="d-caret">
        <span className="caret" />
      </span>
    </button>
  );
}

function LegacyMassUpdateLabelList(props: {
  disabled: boolean;
  groupedLabels: Array<{
    categoryId: number | null;
    categoryName: string;
    labels: NonNullable<ProjectDetailViewModel["dashboard"]>["labels"];
  }>;
  mode: "attach" | "detach";
  onMassUpdate?: (input: MilestoneIssueMassUpdateInput) => Promise<void>;
}) {
  return (
    <>
      {props.groupedLabels.flatMap((group) => [
        <li
          className="disabled"
          data-category={group.categoryId ?? group.categoryName}
          key={`category-${group.categoryId ?? group.categoryName}`}
        >
          <span>{group.categoryName}</span>
        </li>,
        ...group.labels.map((label) => (
          <li
            data-category={label.categoryId ?? label.categoryName}
            data-value={label.id}
            key={`label-${label.id}`}
          >
            <button
              className="btn-transparent"
              disabled={props.disabled}
              onClick={() =>
                void props.onMassUpdate?.(
                  props.mode === "attach"
                    ? { addLabelIds: [label.id] }
                    : { removeLabelIds: [label.id] },
                )
              }
              type="button"
            >
              <span
                className="issue-label active list-label"
                data-label-id={label.id}
                style={{ backgroundColor: label.color || "#ddd" }}
              >
                {label.name}
              </span>
            </button>
          </li>
        )),
        <li
          className="divider"
          data-category={group.categoryId ?? group.categoryName}
          key={`divider-${group.categoryId ?? group.categoryName}`}
        />,
      ])}
    </>
  );
}

function LegacyMilestoneMassUpdateShell(props: {
  detail: ProjectDetailViewModel;
  messages?: LegacyMessageLookup;
  onCheckAll?: (checked: boolean) => void;
  onMassUpdate?: (input: MilestoneIssueMassUpdateInput) => Promise<void>;
  runtimeConfig: RuntimeConfig;
  selectedCount?: number;
  totalCount?: number;
}) {
  const assignees = props.detail.dashboard?.assignees ?? [];
  const labels = props.detail.dashboard?.labels ?? [];
  const milestones = props.detail.dashboard?.milestones ?? [];
  const disabled = (props.selectedCount ?? 0) === 0 || !props.onMassUpdate;
  const groupedLabels = labels.reduce<
    Array<{
      categoryId: number | null;
      categoryName: string;
      labels: typeof labels;
    }>
  >((groups, label) => {
    const categoryName = label.categoryName || "";
    const categoryId = label.categoryId ?? null;
    const existing = groups.find(
      (group) => group.categoryId === categoryId && group.categoryName === categoryName,
    );
    if (existing) {
      existing.labels.push(label);
      return groups;
    }
    groups.push({ categoryId, categoryName, labels: [label] });
    return groups;
  }, []);

  return (
    <div className="mass-update-wrap hide-in-mobile">
      <form
        className="mass-update-form pull-left"
        id="mass-update-form"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="btn-group check-all">
          <label aria-label={legacyMessage(props.messages, "button.selectAll")} htmlFor="check-all">
            <input
              checked={(props.totalCount ?? 0) > 0 && props.selectedCount === props.totalCount}
              data-selected-count={props.selectedCount ?? 0}
              data-target="checked-issue"
              id="check-all"
              onChange={(event) => props.onCheckAll?.(event.currentTarget.checked)}
              type="checkbox"
            />
          </label>
        </div>
        <div className="btn-group" data-name="state" id="state">
          <LegacyMassUpdateDropdownButton
            disabled={disabled}
            label={legacyMessage(props.messages, "issue.update.state")}
          />
          <ul className="dropdown-menu mass-update-list">
            <li data-value="OPEN">
              <button
                className="btn-transparent"
                disabled={disabled}
                onClick={() => void props.onMassUpdate?.({ state: "open" })}
                type="button"
              >
                {legacyMessage(props.messages, "issue.state.open")}
              </button>
            </li>
            <li data-value="CLOSED">
              <button
                className="btn-transparent"
                disabled={disabled}
                onClick={() => void props.onMassUpdate?.({ state: "closed" })}
                type="button"
              >
                {legacyMessage(props.messages, "issue.state.closed")}
              </button>
            </li>
          </ul>
        </div>
        <div className="btn-group" data-name="assignee.id" id="assignee">
          <LegacyMassUpdateDropdownButton
            disabled={disabled}
            label={legacyMessage(props.messages, "issue.update.assignee.id")}
          />
          <ul className="dropdown-menu mass-update-list">
            <li data-value="anonymous">
              <button
                className="btn-transparent"
                disabled={disabled}
                onClick={() =>
                  void props.onMassUpdate?.({
                    assigneeLoginId: "anonymous",
                    assigneeUpdate: true,
                  })
                }
                type="button"
              >
                {legacyMessage(props.messages, "issue.noAssignee")}
              </button>
            </li>
            <li className="divider" />
            {assignees.map((assignee) => (
              <li data-value={assignee.userId} key={assignee.userId}>
                <button
                  className="btn-transparent usf-group"
                  disabled={disabled}
                  onClick={() =>
                    void props.onMassUpdate?.({
                      assigneeLoginId: assignee.loginId,
                      assigneeUpdate: true,
                    })
                  }
                  type="button"
                >
                  <span className="avatar-wrap smaller">
                    {assignee.avatarUrl ? (
                      <img alt="" height={20} src={assignee.avatarUrl} width={20} />
                    ) : (
                      <span>{(assignee.userLabel || assignee.loginId).slice(0, 1)}</span>
                    )}
                  </span>
                  <strong className="name">{assignee.userLabel || assignee.loginId}</strong>
                  <span className="loginid">
                    {" "}
                    <strong>@</strong>
                    {assignee.loginId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {milestones.length > 0 ? (
          <div className="btn-group" data-name="milestone.id" id="milestone">
            <LegacyMassUpdateDropdownButton
              disabled={disabled}
              label={legacyMessage(props.messages, "issue.update.milestone.id")}
            />
            <ul className="dropdown-menu mass-update-list">
              <li data-value="0">
                <button
                  className="btn-transparent"
                  disabled={disabled}
                  onClick={() =>
                    void props.onMassUpdate?.({ milestoneId: 0, milestoneUpdate: true })
                  }
                  type="button"
                >
                  {legacyMessage(props.messages, "issue.noMilestone")}
                </button>
              </li>
              <li className="divider" />
              {milestones.map((milestone) => (
                <li data-value={milestone.id} key={milestone.id}>
                  <button
                    className="btn-transparent"
                    disabled={disabled}
                    onClick={() =>
                      void props.onMassUpdate?.({
                        milestoneId: milestone.id,
                        milestoneUpdate: true,
                      })
                    }
                    type="button"
                  >
                    {milestone.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {labels.length > 0 ? (
          <>
            <div className="btn-group" data-name="attachingLabelIds" id="attaching-label">
              <LegacyMassUpdateDropdownButton
                disabled={disabled}
                label={legacyMessage(props.messages, "issue.update.attachLabel")}
              />
              <ul className="dropdown-menu mass-update-list" id="attach-label-list">
                <LegacyMassUpdateLabelList
                  disabled={disabled}
                  groupedLabels={groupedLabels}
                  mode="attach"
                  onMassUpdate={props.onMassUpdate}
                />
              </ul>
            </div>
            <div className="btn-group" data-name="detachingLabelIds" id="detaching-label">
              <LegacyMassUpdateDropdownButton
                disabled={disabled}
                label={legacyMessage(props.messages, "issue.update.detachLabel")}
              />
              <ul className="dropdown-menu mass-update-list" id="delete-label-list">
                <LegacyMassUpdateLabelList
                  disabled={disabled}
                  groupedLabels={groupedLabels}
                  mode="detach"
                  onMassUpdate={props.onMassUpdate}
                />
              </ul>
            </div>
          </>
        ) : null}
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
  renderShell?: boolean;
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
  const labelStylesheet = (
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
  );
  const content = (
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
                        list.orderBy === "completionRate" && list.orderDir === "desc" ? " down" : ""
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
  );

  if (props.renderShell === false) {
    return (
      <>
        {labelStylesheet}
        {content}
      </>
    );
  }

  return (
    <main className="app-shell">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="milestone" detail={detail} runtimeConfig={props.runtimeConfig} />
      {labelStylesheet}
      <div className="page-wrap-outer">{content}</div>
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
  onMassUpdate?: (
    input: MilestoneIssueMassUpdateInput & { issueNumbers: number[] },
  ) => Promise<void>;
  onOpen?: () => Promise<void>;
  owner: string;
  projectName: string;
  renderShell?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail(props.owner, props.projectName);
  const milestone = props.milestone;
  const issueState = ["open", "closed", "all"].includes(props.issueState)
    ? props.issueState
    : "open";
  const issues = React.useMemo(() => {
    if (issueState === "closed") {
      return milestone?.closedIssues ?? [];
    }
    if (issueState === "all") {
      return [...(milestone?.openIssues ?? []), ...(milestone?.closedIssues ?? [])];
    }
    return milestone?.openIssues ?? [];
  }, [issueState, milestone?.closedIssues, milestone?.openIssues]);
  const [filter, setFilter] = React.useState("");
  const [selectedIssueNumbers, setSelectedIssueNumbers] = React.useState<number[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const visibleIssueNumbers = React.useMemo(() => {
    const issueNumbers: number[] = [];
    for (const issue of issues) {
      if (!milestoneIssueHidden(issue, filter)) {
        issueNumbers.push(issue.issueNumber);
      }
    }
    return issueNumbers;
  }, [filter, issues]);
  const toggleIssueSelection = React.useCallback((issueNumber: number, checked: boolean) => {
    setSelectedIssueNumbers((current) => {
      if (checked) {
        return current.includes(issueNumber) ? current : [...current, issueNumber];
      }
      return current.filter((selectedIssueNumber) => selectedIssueNumber !== issueNumber);
    });
  }, []);
  const setAllVisibleIssueSelection = React.useCallback(
    (checked: boolean) => {
      setSelectedIssueNumbers((current) => {
        if (!checked) {
          return current.filter((issueNumber) => !visibleIssueNumbers.includes(issueNumber));
        }
        return [...new Set([...current, ...visibleIssueNumbers])];
      });
    },
    [visibleIssueNumbers],
  );
  const submitMassUpdate = React.useCallback(
    async (input: MilestoneIssueMassUpdateInput) => {
      if (selectedIssueNumbers.length === 0 || !props.onMassUpdate) {
        return;
      }
      await props.onMassUpdate({ ...input, issueNumbers: selectedIssueNumbers });
      setSelectedIssueNumbers([]);
    },
    [props, selectedIssueNumbers],
  );

  const labelStylesheet = (
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
  );
  const pageBody = milestone ? (
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
              data-attachments={JSON.stringify(milestoneAttachmentMetadata(milestone.attachments))}
            >
              <LegacyMilestoneAttachmentList attachments={milestone.attachments} />
            </div>
          </div>
        ) : (
          <div className="content empty-content" />
        )}
        <div className="actrow right-txt row-fluid" style={{ clear: "both", padding: "15px 0" }}>
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
            <a
              className="ybtn ybtn-danger"
              data-toggle="modal"
              href="#deleteConfirm"
              onClick={(event) => {
                event.preventDefault();
                setDeleteConfirmOpen(true);
              }}
            >
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
                onCheckAll={setAllVisibleIssueSelection}
                onMassUpdate={submitMassUpdate}
                runtimeConfig={props.runtimeConfig}
                selectedCount={
                  selectedIssueNumbers.filter((issueNumber) =>
                    visibleIssueNumbers.includes(issueNumber),
                  ).length
                }
                totalCount={visibleIssueNumbers.length}
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
            <ul className="post-list-wrap row-fluid">
              {issues.map((issue) => (
                <LegacyMilestoneIssuePartialRow
                  detail={detail}
                  hidden={milestoneIssueHidden(issue, filter)}
                  issue={issue}
                  key={`${issue.state}-${issue.issueNumber}`}
                  messages={props.messages}
                  onIssueSelectionChange={toggleIssueSelection}
                  runtimeConfig={props.runtimeConfig}
                  selectedIssueNumbers={selectedIssueNumbers}
                />
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  ) : null;
  const deleteModal =
    milestone?.viewerCanDelete && props.onDelete ? (
      <div
        aria-hidden={deleteConfirmOpen ? "false" : "true"}
        className={`modal hide fade${deleteConfirmOpen ? " in" : ""}`}
        id="deleteConfirm"
        style={deleteConfirmOpen ? { display: "block" } : undefined}
      >
        <div className="modal-header">
          <button
            aria-label={legacyMessage(props.messages, "button.close")}
            className="close"
            data-dismiss="modal"
            onClick={() => setDeleteConfirmOpen(false)}
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
              setDeleteConfirmOpen(false);
              void props.onDelete?.();
            }}
            type="button"
          >
            {legacyMessage(props.messages, "button.yes")}
          </button>
          <button
            className="ybtn"
            data-dismiss="modal"
            onClick={() => setDeleteConfirmOpen(false)}
            type="button"
          >
            {legacyMessage(props.messages, "button.no")}
          </button>
        </div>
      </div>
    ) : null;

  if (props.renderShell === false) {
    return (
      <>
        {labelStylesheet}
        {pageBody}
        {deleteModal}
      </>
    );
  }

  return (
    <main className="app-shell">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="milestone" detail={detail} runtimeConfig={props.runtimeConfig} />
      {labelStylesheet}
      <div className="page-wrap-outer">{pageBody}</div>
      {deleteModal}
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
  renderShell?: boolean;
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

  const content = (
    <>
      <h1 className="sr-only">
        {legacyMessage(
          props.messages,
          props.mode === "create" ? "title.newMilestone" : "title.editMilestone",
        )}
      </h1>
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
                      // oxlint-disable-next-line jsx-a11y/tabindex-no-positive -- legacy milestone form parity keeps tabindex="1".
                      tabIndex={1}
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
    </>
  );

  if (props.renderShell === false) {
    return <div className="milestone-form-page">{content}</div>;
  }

  return (
    <main className="app-shell milestone-form-page">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="milestone" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">{content}</div>
    </main>
  );
}
