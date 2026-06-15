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
import { translateLegacyResource } from "../api/translation";
import type { RuntimeConfig } from "../runtime-config";
import {
  addLegacyTasklistTemplateFromButton,
  LegacyMarkdownEditorShell,
  LegacyMarkdownHelp,
  MarkdownRenderer,
} from "./-markdown-renderer";
import { buildProjectHref, ProjectHeader, ProjectMenu } from "./-project-views";
import type {
  ProjectDetailViewModel,
  ProjectIssueDetailViewModel,
  ProjectIssueListViewModel,
  ProjectIssueParentOptionViewModel,
  ProjectMilestoneViewModel,
  UserIssueListViewModel,
} from "./-view-models";
import { prefixBasePath } from "../runtime-config";

type IssueTimelineCommentViewModel = NonNullable<
  ProjectIssueDetailViewModel["timeline"][number]["comment"]
>;

type IssueChildViewModel = ProjectIssueDetailViewModel["childIssues"][number];
type IssueListItemViewModel = ProjectIssueListViewModel["items"][number];

function fallbackProjectDetail(): ProjectDetailViewModel {
  return {
    enrollmentRequested: false,
    isFavorited: false,
    organizationName: "",
    overview: "",
    ownerName: "",
    projectName: "",
    projectScope: "public",
    showCode: true,
    viewerCanEnroll: false,
    viewerCanUpdate: false,
  };
}

function LegacyTwoColumnModeCheckboxArea() {
  return (
    <div
      className="two-column-icon mr10 hide-in-mobile"
      data-content="common.two.column.mode.desc"
      id="two-column-mode-checkbox"
      title="common.two.column.mode"
    >
      <label className="checkbox" aria-label="common.two.column.view">
        <div className="two-column-icon-border">
          <input id="two-column-mode" type="checkbox" />
          <span className="two-column-mode-text">common.two.column.view</span>
        </div>
      </label>
    </div>
  );
}

function LegacyShowSubtasksCheckbox() {
  return (
    <div
      className="show-subtasks mr10"
      data-content="common.show.subtasks.desc"
      data-placement="top"
      data-toggle="popover"
      data-trigger="hover"
      id="two-column-mode-checkbox"
      title="common.show.subtasks"
    >
      <label className="checkbox" aria-label="common.show.subtasks">
        <div className="show-subtasks-button-border">
          <input id="toggle-show-subtasks" type="checkbox" />
          <span className="show-subtasks-text">common.show.subtasks</span>
        </div>
      </label>
    </div>
  );
}

function IssueSubtaskList(props: {
  issue: ProjectIssueDetailViewModel;
  runtimeConfig: RuntimeConfig;
}) {
  const { issue, runtimeConfig } = props;
  const childClosedCount = issue.childClosedCount ?? 0;
  const childIssues = issue.childIssues ?? [];
  const childOpenCount = issue.childOpenCount ?? 0;
  const totalCount = childOpenCount + childClosedCount;
  if (childIssues.length === 0 && totalCount === 0) {
    return <div className="subtasks"></div>;
  }
  const parentIssueNumber = issue.parentIssueNumber || issue.issueNumber;
  const parentIssueTitle = issue.parentIssueTitle || issue.title;
  const parentHref = prefixBasePath(
    runtimeConfig.basePath,
    `/${issue.ownerName}/${issue.projectName}/issue/${parentIssueNumber}`,
  );
  const percentage = totalCount === 0 ? 0 : Math.floor((childClosedCount / totalCount) * 100);
  const progressDone = percentage === 100;
  return (
    <div className="subtasks">
      <div className="child-issues">
        <div className="issue-item parent-issue">
          <a className={issue.parentIssueNumber ? undefined : "bold"} href={parentHref}>
            {`#${parentIssueNumber} ${parentIssueTitle}`}
            {issue.assigneeLabel ? ` - ${issue.assigneeLabel}` : ""}
          </a>
          <div className={`upload-progress ${progressDone ? "done-outline" : "red-outline"}`}>
            <div
              className={`bar ${progressDone ? "done" : "red"}`}
              style={{ width: `${percentage}%` }}
              title="Subtask"
            ></div>
          </div>
          <span className={progressDone ? "txt-green" : undefined}>
            {percentage === 100 ? totalCount : `${childClosedCount}/${totalCount}`}{" "}
          </span>
          <span
            className={`parent-issue-state ${issue.state}`}
          >{`issue.state.${issue.state}`}</span>
        </div>
        <hr className="parent-issue-delimeter" />
        <div className="child-issues">
          {childIssues.map((child) => (
            <IssueSubtaskItem
              child={child}
              key={`${child.state}-${child.issueNumber}`}
              ownerName={issue.ownerName}
              projectName={issue.projectName}
              runtimeConfig={runtimeConfig}
              selected={child.issueNumber === issue.issueNumber}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function IssueSubtaskItem(props: {
  child: IssueChildViewModel;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  selected: boolean;
}) {
  const { child, ownerName, projectName, runtimeConfig, selected } = props;
  const childHref = prefixBasePath(
    runtimeConfig.basePath,
    `/${ownerName}/${projectName}/issue/${child.issueNumber}`,
  );
  const listHref = prefixBasePath(
    runtimeConfig.basePath,
    `/${ownerName}/${projectName}/issues?state=open`,
  );
  return (
    <div className={`issue-item${selected ? " selected-child" : ""} child-issue`}>
      <span className={`state-label ${child.state}`}>
        {child.state === "closed" ? <i className=" yobicon-checkmark"></i> : null}
      </span>
      <a className="twoColumeModeTarget" href={childHref}>
        <span className="item-name">
          <span className="subtask-number">
            {child.isDraft ? (
              <span className="draft-number">#issue.state.draft</span>
            ) : (
              `#${child.issueNumber}`
            )}
          </span>{" "}
          <span>{child.title}</span>
          {child.assigneeLabel ? <span>{` - ${child.assigneeLabel}`}</span> : null}
        </span>
      </a>
      <span className="font12 no-border-at-child">
        <span>{child.state}</span>
      </span>
      {child.labels.map((label) => (
        <a
          className="label issue-label list-label active twoColumeModeTarget"
          data-label-id={label.id}
          href={`${listHref}&labelIds=${label.id}`}
          key={label.id}
          style={{ backgroundColor: label.color || "#ddd" }}
        >
          {label.name}
        </a>
      ))}
      <span className="child-issue-date" title={child.createdLabel}>
        {child.createdLabel}
      </span>
    </div>
  );
}

function IssueDetailSelectedLabels(props: {
  issue: ProjectIssueDetailViewModel | null | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const { issue, runtimeConfig } = props;
  if (!issue || issue.labels.length === 0) {
    return null;
  }
  const listHref = prefixBasePath(
    runtimeConfig.basePath,
    `/${issue.ownerName}/${issue.projectName}/issues?state=${issue.state}`,
  );
  return (
    <dl>
      <dt>label</dt>
      <dd>
        {issue.labels.map((label) => (
          <a
            className="label issue-label active static"
            data-label-id={label.id}
            href={`${listHref}&labelIds=${label.id}`}
            key={label.id}
            style={{ background: label.color || "#ddd" }}
          >
            {label.name}
          </a>
        ))}
      </dd>
    </dl>
  );
}

function IssueDetailVoters(props: {
  issue: ProjectIssueDetailViewModel;
  runtimeConfig: RuntimeConfig;
}) {
  const voters = props.issue.issueVoters ?? [];
  if (voters.length === 0) {
    return null;
  }
  const avatarVoters = voters.slice(0, 3);
  const hiddenCount = Math.max(0, voters.length - avatarVoters.length);
  const modalVoters = voters;
  return (
    <>
      <div className="voter-list-wrap">
        <ul className="voter-list">
          {avatarVoters.map((voter) => (
            <li key={voter.userId}>
              <a
                className="avatar-wrap smaller"
                href={prefixBasePath(props.runtimeConfig.basePath, `/${voter.loginId}`)}
              >
                {voter.avatarUrl ? (
                  <img
                    alt={voter.userLabel || voter.loginId}
                    height={20}
                    src={voter.avatarUrl}
                    width={20}
                  />
                ) : null}
              </a>
            </li>
          ))}
          {hiddenCount > 0 ? (
            <li
              data-html="true"
              data-toggle="tooltip"
              title={voters
                .slice(3, 8)
                .map((voter) => voter.userLabel || voter.loginId)
                .join("<br>")}
            >
              <a data-toggle="modal" href="#voters">
                {`issue.voters.more ${hiddenCount}`}
              </a>
            </li>
          ) : null}
        </ul>
      </div>
      <div className="modal hide voters-dialog" id="voters">
        <div className="modal-header">
          <button aria-label="button.close" className="close" data-dismiss="modal" type="button">
            ×
          </button>
          <h5 className="nm">issue.voters</h5>
        </div>
        <div className="modal-body">
          <ul className="unstyled">
            {modalVoters.map((voter) => (
              <li key={voter.userId}>
                <a
                  className="usf-group"
                  href={prefixBasePath(props.runtimeConfig.basePath, `/${voter.loginId}`)}
                  target="_blank"
                >
                  <span className="avatar-wrap mlarge">
                    {voter.avatarUrl ? (
                      <img
                        alt={voter.userLabel || voter.loginId}
                        height={40}
                        src={voter.avatarUrl}
                        width={40}
                      />
                    ) : null}
                  </span>
                  <strong className="name">{voter.userLabel || voter.loginId}</strong>
                  <span className="loginid">
                    {" "}
                    <strong>@</strong>
                    {voter.loginId}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="modal-footer">
          <button className="ybtn ybtn-info ybtn-small" data-dismiss="modal">
            button.close
          </button>
        </div>
      </div>
    </>
  );
}

function truncateLegacyIssueTitle(title: string) {
  const trimmed = title.trim();
  return trimmed.length > 10 ? `${trimmed.slice(0, 10).trim()}...` : trimmed;
}

function IssueListSubtaskSummary(props: {
  item: IssueListItemViewModel;
  runtimeConfig: RuntimeConfig;
}) {
  const { item, runtimeConfig } = props;
  const childClosedCount = item.childClosedCount ?? 0;
  const childOpenCount = item.childOpenCount ?? 0;
  const totalCount = childOpenCount + childClosedCount;
  const percentage = totalCount === 0 ? 0 : Math.floor((childClosedCount / totalCount) * 100);
  const progressDone = percentage === 100;
  const parentIssueNumber = item.parentIssueNumber ?? 0;
  const parentHref =
    parentIssueNumber > 0
      ? prefixBasePath(
          runtimeConfig.basePath,
          `/${item.ownerName}/${item.projectName}/issue/${parentIssueNumber}`,
        )
      : "";

  return (
    <>
      {totalCount > 0 ? (
        <>
          <div
            className={`subtask-progress upload-progress ${
              progressDone ? "done-outline" : "red-outline"
            }`}
          >
            <div
              className={`bar ${progressDone ? "done" : "red"}`}
              style={{ width: `${percentage}%` }}
              title="Subtask"
            ></div>
          </div>
          <span className={`subtask-progress completion-ratio ${progressDone ? "txt-green" : ""}`}>
            {percentage === 100 ? totalCount : `${childClosedCount}/${totalCount}`}
          </span>
        </>
      ) : null}
      {parentIssueNumber > 0 ? (
        <span className="infos-item subtask">
          <a href={parentHref}>
            {`#${parentIssueNumber} ${truncateLegacyIssueTitle(item.parentIssueTitle ?? "")}`}
          </a>
        </span>
      ) : null}
    </>
  );
}

function IssueListChildRows(props: { item: IssueListItemViewModel; runtimeConfig: RuntimeConfig }) {
  const childIssues = props.item.childIssues ?? [];
  return (
    <div className="child-issue-list hide">
      {childIssues.length > 0 ? (
        <div className="child-issues">
          {childIssues.map((child) => (
            <IssueSubtaskItem
              child={{
                assigneeLabel: child.assigneeLabel,
                createdLabel: child.createdLabel,
                isDraft: child.isDraft ?? false,
                issueNumber: child.issueNumber,
                labels: child.labels,
                state: child.state,
                title: child.title,
              }}
              key={`${child.state}-${child.issueNumber}`}
              ownerName={props.item.ownerName}
              projectName={props.item.projectName}
              runtimeConfig={props.runtimeConfig}
              selected={child.issueNumber === props.item.issueNumber}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PostingHistoryModal(props: {
  basePath?: string;
  historyMarkdown?: string;
  issueReferences?: ProjectIssueDetailViewModel["issueReferences"];
  linkLabel: string;
  mentionReferences?: ProjectIssueDetailViewModel["mentionReferences"];
  ownerName?: string;
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
          <button aria-label="button.close" className="close" data-dismiss="modal" type="button">
            ×
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
  const issueList = props.issueList;
  const openHref = buildProjectHref(
    props.runtimeConfig,
    detail.ownerName,
    detail.projectName,
    "issues?state=open",
  );
  const closedHref = buildProjectHref(
    props.runtimeConfig,
    detail.ownerName,
    detail.projectName,
    "issues?state=closed",
  );
  const issueRows = issueList?.items ?? [];
  const totalPageCount = issueList
    ? Math.max(
        1,
        Math.ceil(Math.max(0, issueList.totalCount) / Math.max(1, issueList.pageSize || 15)),
      )
    : 1;
  const openStateAttr = { state: "open" } as React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    state: string;
  };
  const closedStateAttr = { state: "closed" } as React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    state: string;
  };
  const pjaxContainerAttr = { "pjax-container": "" } as React.HTMLAttributes<HTMLDivElement>;
  const pjaxFilterAttr = { "pjax-filter": "" } as React.AnchorHTMLAttributes<HTMLAnchorElement>;
  const allIssuesHref = projectIssueListPageHref(
    props.runtimeConfig,
    detail.ownerName,
    detail.projectName,
    { ...query, assigneeLoginId: "", assigneeId: undefined, authorLoginId: "", pageNum: 1 },
    1,
  );
  const assignedIssuesHref = projectIssueListPageHref(
    props.runtimeConfig,
    detail.ownerName,
    detail.projectName,
    { ...query, assigneeLoginId: query.assigneeLoginId || "-", pageNum: 1 },
    1,
  );
  const authoredIssuesHref = projectIssueListPageHref(
    props.runtimeConfig,
    detail.ownerName,
    detail.projectName,
    { ...query, authorLoginId: query.authorLoginId || "-", pageNum: 1 },
    1,
  );
  const commentedIssuesHref = projectIssueListPageHref(
    props.runtimeConfig,
    detail.ownerName,
    detail.projectName,
    { ...query, pageNum: 1 },
    1,
  );

  return (
    <main className="app-shell issue-list-page">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="row-fluid issue-list-wrap" {...pjaxContainerAttr}>
            <div className=" left-menu span2 span-hard-wrap">
              <ul className="lst-stacked unstyled">
                <li
                  className={!query.assigneeLoginId && !query.authorLoginId ? "active" : undefined}
                >
                  <a
                    data-assignee-id=""
                    data-author-id=""
                    data-commenter-id=""
                    data-milestone-id={query.milestoneId || ""}
                    href={allIssuesHref}
                    {...pjaxFilterAttr}
                  >
                    {query.state === "closed" ? "issue.list.all.closed" : "issue.list.all.open"}
                    <span className="num-badge pull-right">{issueList?.totalCount ?? 0}</span>
                  </a>
                </li>
                <li className={query.assigneeLoginId ? "active" : undefined}>
                  <a
                    data-assignee-id={query.assigneeLoginId}
                    data-author-id=""
                    data-commenter-id=""
                    data-milestone-id={query.milestoneId || ""}
                    href={assignedIssuesHref}
                    {...pjaxFilterAttr}
                  >
                    issue.list.assignedToMe
                    <span className="num-badge pull-right">
                      {query.assigneeLoginId ? (issueList?.totalCount ?? 0) : 0}
                    </span>
                  </a>
                </li>
                <li className={query.authorLoginId ? "active" : undefined}>
                  <a
                    data-assignee-id=""
                    data-author-id={query.authorLoginId}
                    data-commenter-id=""
                    data-milestone-id={query.milestoneId || ""}
                    href={authoredIssuesHref}
                    {...pjaxFilterAttr}
                  >
                    issue.list.authoredByMe
                    <span className="num-badge pull-right">
                      {query.authorLoginId ? (issueList?.totalCount ?? 0) : 0}
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    data-assignee-id=""
                    data-author-id=""
                    data-commenter-id=""
                    data-milestone-id={query.milestoneId || ""}
                    href={commentedIssuesHref}
                    {...pjaxFilterAttr}
                  >
                    issue.list.commentedByMe
                    <span className="num-badge pull-right">0</span>
                  </a>
                </li>
              </ul>
              <form
                action={buildProjectHref(
                  props.runtimeConfig,
                  detail.ownerName,
                  detail.projectName,
                  "issues",
                )}
                id="search"
                method="get"
                name="search"
              >
                <input name="pageNum" type="hidden" value="1" />
                <input name="orderBy" type="hidden" value="updatedDate" />
                <input name="orderDir" type="hidden" value="desc" />
                <input name="state" type="hidden" value={query.state} />
                {query.assigneeId !== undefined ? (
                  <input
                    data-search="assigneeId"
                    name="assigneeId"
                    type="hidden"
                    value={query.assigneeId}
                  />
                ) : null}
                <input
                  data-search="authorLoginId"
                  name="authorLoginId"
                  type="hidden"
                  value={query.authorLoginId}
                />
                <input
                  data-search="assigneeLoginId"
                  name="assigneeLoginId"
                  type="hidden"
                  value={query.assigneeLoginId}
                />
                <hr className="hide-in-mobile" />
                <div className="search">
                  <div className="search-bar">
                    <input
                      className="textbox full"
                      data-search="filter"
                      name="filter"
                      type="text"
                      defaultValue=""
                    />
                    <button className="search-btn" data-submit="submit" type="button">
                      <i className="yobicon-search"></i>
                    </button>
                  </div>
                </div>
                <div className="srch-advanced hide-in-mobile" id="advanced-search-form">
                  <dl className="issue-option">
                    <dt>issue.author</dt>
                    <dd>
                      <select
                        data-container-css-class="fullsize"
                        data-format="user"
                        data-search="authorId"
                        data-toggle="select2"
                        id="authorId"
                        name="authorLoginId"
                        defaultValue={query.authorLoginId}
                      >
                        <option value="">common.order.all</option>
                        {query.authorLoginId ? (
                          <option value={query.authorLoginId}>{query.authorLoginId}</option>
                        ) : null}
                      </select>
                    </dd>
                  </dl>
                  <dl className="issue-option">
                    <dt>issue.assignee</dt>
                    <dd>
                      <select
                        data-container-css-class="fullsize"
                        data-format="user"
                        data-search="assigneeId"
                        data-toggle="select2"
                        id="assigneeId"
                        name="assigneeLoginId"
                        defaultValue={query.assigneeLoginId}
                      >
                        <option value="">common.order.all</option>
                        <option value="anonymous">issue.noAssignee</option>
                        {query.assigneeLoginId ? (
                          <option value={query.assigneeLoginId}>{query.assigneeLoginId}</option>
                        ) : null}
                      </select>
                    </dd>
                  </dl>
                  <dl className="issue-option">
                    <dt>milestone</dt>
                    <dd>
                      <select
                        data-container-css-class="fullsize"
                        data-format="milestone"
                        data-search="milestoneId"
                        data-toggle="select2"
                        id="milestoneId"
                        name="milestoneId"
                        defaultValue={query.milestoneId ? String(query.milestoneId) : ""}
                      >
                        <option value="">milestone.state.all</option>
                        <option value="0">issue.noMilestone</option>
                        {(props.milestones ?? []).map((milestone) => (
                          <option
                            data-state={milestone.state}
                            key={milestone.id}
                            value={milestone.id}
                          >
                            {milestone.title}
                          </option>
                        ))}
                      </select>
                    </dd>
                  </dl>
                  <dl className="issue-option">
                    <dt>issue.dueDate</dt>
                    <dd className="search search-bar">
                      <input
                        className="textbox full"
                        data-toggle="calendar"
                        id="issueDueDate"
                        name="dueDate"
                        type="text"
                        defaultValue=""
                      />
                      <button className="search-btn btn-calendar" type="button">
                        <i className="yobicon-calendar2"></i>
                      </button>
                    </dd>
                  </dl>
                  <div className="labels-wrap">
                    <a
                      className="ybtn ybtn-default ybtn-mini pull-right"
                      href={buildProjectHref(
                        props.runtimeConfig,
                        detail.ownerName,
                        detail.projectName,
                        "issue/labelsform",
                      )}
                    >
                      <i className="yobicon-cog vmiddle"></i>
                      {(props.labels ?? []).length === 0 ? (
                        <span className="vmiddle">label.manage</span>
                      ) : null}
                    </a>
                    <dl className="issue-option">
                      <dt>label</dt>
                      <dd>
                        <select
                          aria-label="label.select"
                          className="issue-label-filter"
                          data-search="labelIds"
                          data-placeholder="label.select"
                          defaultValue={selectedLabelIds}
                          multiple
                          name="labelIds"
                        >
                          {(props.labels ?? []).map((label) => (
                            <option key={label.id} value={label.id}>
                              {label.categoryName
                                ? `${label.categoryName}: ${label.name}`
                                : label.name}
                            </option>
                          ))}
                        </select>
                      </dd>
                    </dl>
                  </div>
                </div>
              </form>
            </div>
            <div className="span10 span-hard-wrap" id="span10">
              <div className="pull-right">
                <a
                  className="ybtn ybtn-success"
                  href={buildProjectHref(
                    props.runtimeConfig,
                    detail.ownerName,
                    detail.projectName,
                    "issueform",
                  )}
                >
                  issue.menu.new
                </a>
              </div>
              <ul className="nav nav-tabs nm">
                <li className={query.state !== "closed" ? "active" : undefined} data-pjax="">
                  <a href={openHref} {...openStateAttr}>
                    issue.state.open
                    <span className="num-badge">
                      {query.state !== "closed" ? (issueList?.totalCount ?? 0) : 0}
                    </span>
                  </a>
                </li>
                <li className={query.state === "closed" ? "active" : undefined} data-pjax="">
                  <a href={closedHref} {...closedStateAttr}>
                    issue.state.closed
                    <span className="num-badge">
                      {query.state === "closed" ? (issueList?.totalCount ?? 0) : 0}
                    </span>
                  </a>
                </li>
                <li>
                  <LegacyTwoColumnModeCheckboxArea />
                </li>
                <li className="show-subtasks-li">
                  <LegacyShowSubtasksCheckbox />
                </li>
              </ul>
              {issueRows.length === 0 ? (
                <div className="error-wrap">
                  <i className="ico ico-err1"></i>
                  <p>issue.is.empty</p>
                </div>
              ) : (
                <>
                  <div className="filter-wrap board">
                    <div className="filters pull-right">
                      {[
                        ["dueDate", "common.order.dueDate"],
                        ["updatedDate", "common.order.updatedDate"],
                        ["createdDate", "common.order.date"],
                        ["numOfComments", "common.order.comments"],
                      ].map(([orderBy, label]) => (
                        <a
                          className="filter"
                          href={buildProjectHref(
                            props.runtimeConfig,
                            detail.ownerName,
                            detail.projectName,
                            `issues?orderBy=${encodeURIComponent(orderBy)}&orderDir=desc`,
                          )}
                          key={orderBy}
                          {...({
                            orderby: orderBy,
                            orderdir: "desc",
                          } as React.AnchorHTMLAttributes<HTMLAnchorElement> & {
                            orderby: string;
                            orderdir: string;
                          })}
                        >
                          <i className="ico btn-gray-arrow down"></i>
                          {label}
                        </a>
                      ))}
                    </div>
                  </div>
                  {issueList && issueList.draftItems.length > 0 ? (
                    <ProjectIssueRows
                      items={issueList.draftItems}
                      listKind="draft"
                      query={query}
                      runtimeConfig={props.runtimeConfig}
                    />
                  ) : null}
                  <ProjectIssueRows
                    items={issueRows}
                    listKind="normal"
                    query={query}
                    runtimeConfig={props.runtimeConfig}
                  />
                  <div className="pull-left" style={{ padding: "10px" }}>
                    <a
                      className="ybtn small"
                      href={projectIssueExcelExportHref(
                        props.runtimeConfig,
                        detail.ownerName,
                        detail.projectName,
                        query,
                      )}
                    >
                      <i className="yobicon-file-excel"></i> issue.downloadAsExcel
                    </a>
                  </div>
                  <IssueListPagination
                    currentPage={issueList?.pageNum ?? query.pageNum}
                    hrefForPage={(pageNum) =>
                      projectIssueListPageHref(
                        props.runtimeConfig,
                        detail.ownerName,
                        detail.projectName,
                        query,
                        pageNum,
                      )
                    }
                    pageCount={totalPageCount}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
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

function ProjectIssueRows(props: {
  items: ProjectIssueListViewModel["items"];
  listKind: "draft" | "normal";
  query: ProjectIssueListQuery;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <ul
      className="post-list-wrap row-fluid"
      data-list={props.listKind === "draft" ? "draft-issues" : undefined}
    >
      {props.items.map((item) => {
        const issueHref = buildProjectHref(
          props.runtimeConfig,
          item.ownerName,
          item.projectName,
          `issue/${item.issueNumber}`,
        );
        const issueKey = `${props.listKind}-${item.ownerName}-${item.projectName}-${item.issueNumber}`;
        const legacyIssueId = item.id && item.id > 0 ? item.id : item.issueNumber;
        const issueItemHrefAttr = {
          href: issueHref,
        } as React.LiHTMLAttributes<HTMLLIElement> & { href: string };
        const weight = item.weight ?? 0;
        return (
          <li
            className="post-item title"
            data-item="issue-item"
            data-value={`${item.authorLoginId || item.authorLabel} ${item.issueNumber} ${item.title}`}
            id={`issue-item-${legacyIssueId}`}
            key={issueKey}
            {...issueItemHrefAttr}
          >
            <div className="span9 span-hard-wrap">
              <label
                aria-label={`issue ${legacyIssueId}`}
                className="mass-update-check hide-in-mobile"
                htmlFor={`issue-${legacyIssueId}`}
              >
                <input
                  data-issue-id={legacyIssueId}
                  data-issue-labels={item.labels
                    .map((label) => `,${label.id},${label.name},,|`)
                    .join("")}
                  data-toggle="issue-checkbox"
                  id={`issue-${legacyIssueId}`}
                  name="checked-issue"
                  type="checkbox"
                />
              </label>
              <div className="issue-item-row" data-for={`issue-${legacyIssueId}`}>
                <div className="title-wrap">
                  <a className="title" href={issueHref}>
                    <span className="post-id">
                      {item.state === "draft" ? (
                        <span className="draft-number">#issue.state.draft</span>
                      ) : (
                        `#${item.issueNumber}`
                      )}
                    </span>
                  </a>
                  {weight > 0 ? (
                    <span
                      className="weight-up-arrow"
                      data-placement="right"
                      data-toggle="tooltip"
                      title={`issue.weight ${weight}`}
                    >
                      <i className="yobicon-angle-circled-up" />
                    </span>
                  ) : null}
                  {weight < 0 ? (
                    <span
                      className="weight-down-arrow"
                      data-placement="right"
                      data-toggle="tooltip"
                      title={`issue.weight ${weight}`}
                    >
                      <i className="yobicon-angle-circled-down" />
                    </span>
                  ) : null}
                  <a className="title" href={issueHref}>
                    {item.title}
                  </a>
                </div>
                <div className="infos">
                  {item.authorLabel ? (
                    <a
                      className="infos-item infos-link-item"
                      data-placement="bottom"
                      data-toggle="tooltip"
                      href={
                        item.authorLoginId
                          ? prefixBasePath(props.runtimeConfig.basePath, `/${item.authorLoginId}`)
                          : issueHref
                      }
                      title={item.authorLabel}
                    >
                      {item.authorLabel}
                    </a>
                  ) : (
                    <span className="infos-item">issue.noAuthor</span>
                  )}
                  <span
                    className="infos-item"
                    data-placement="bottom"
                    data-toggle="tooltip"
                    title={item.updatedLabel}
                  >
                    {item.updatedLabel}
                  </span>
                  <span className="for-subtask-progressbar">
                    <IssueListSubtaskSummary item={item} runtimeConfig={props.runtimeConfig} />
                  </span>
                  {item.milestoneTitle ? (
                    <span className="mileston-tag">
                      <a
                        data-placement="bottom"
                        data-toggle="tooltip"
                        href={issueHref}
                        title="milestone"
                      >
                        {item.milestoneTitle}
                      </a>
                    </span>
                  ) : null}
                  {item.commentCount > 0 || item.voterCount > 0 || item.watcherCount > 0 ? (
                    <span className="infos-item item-count-groups">
                      {item.commentCount > 0 ? (
                        <a className="num-comments" href={`${issueHref}#comments`}>
                          {item.commentCount}
                        </a>
                      ) : null}
                      {item.voterCount > 0 ? (
                        <a className="num-hearts" href={`${issueHref}#vote`}>
                          {item.voterCount}
                        </a>
                      ) : null}
                      {item.watcherCount > 0 ? (
                        <span className="num-sharers">{item.watcherCount}</span>
                      ) : null}
                    </span>
                  ) : null}
                  {item.labels.map((label) => (
                    <a
                      className="label issue-label list-label active"
                      data-label-id={label.id}
                      href={projectIssueListPageHref(
                        props.runtimeConfig,
                        item.ownerName,
                        item.projectName,
                        {
                          ...props.query,
                          labelIds: [label.id],
                          pageNum: 1,
                        },
                        1,
                      )}
                      key={label.id}
                      style={{ backgroundColor: label.color || "#ddd" }}
                    >
                      {label.name}
                    </a>
                  ))}
                  <IssueListChildRows item={item} runtimeConfig={props.runtimeConfig} />
                </div>
              </div>
            </div>
            <div className="span3 hide-in-mobile">
              <div className="mt5 pull-right">
                {item.assigneeLabel ? (
                  <a
                    className="avatar-wrap assinee"
                    data-placement="top"
                    data-toggle="tooltip"
                    href={issueHref}
                    title={`issue.assignee: ${item.assigneeLabel}`}
                  >
                    {item.assigneeAvatarUrl ? (
                      <img
                        alt={item.assigneeLabel}
                        height={32}
                        src={item.assigneeAvatarUrl}
                        width={32}
                      />
                    ) : (
                      <span>{item.assigneeLabel.slice(0, 1).toUpperCase()}</span>
                    )}
                  </a>
                ) : (
                  <div className="empty-avatar-wrap">&nbsp;</div>
                )}
              </div>
              {item.dueDateLabel ? (
                <div
                  className={`mr20 mt10 pull-right${
                    item.state === "closed" ? " darkgray-txt" : ""
                  }${item.state === "open" && (item.dueDateOverdue ?? false) ? " overdue" : ""}`}
                  data-placement={item.state === "open" ? "top" : undefined}
                  data-toggle={item.state === "open" ? "tooltip" : undefined}
                  title={item.state === "open" ? item.dueDateLabel : undefined}
                >
                  <i className="yobicon-clock2 mr3 vmiddle" />
                  <span className="vmiddle">
                    {item.state === "open" && (item.dueDateOverdue ?? false)
                      ? "issue.dueDate.overdue"
                      : item.dueDateLabel}
                  </span>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function IssueListPagination(props: {
  currentPage: number;
  hrefForPage: (pageNum: number) => string;
  pageCount: number;
}) {
  if (props.pageCount <= 1) {
    return <div data-total={props.pageCount} id="pagination"></div>;
  }
  const currentPage = Math.min(Math.max(1, props.currentPage || 1), props.pageCount);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < props.pageCount;
  return (
    <div className="page-navigation-wrap" data-total={props.pageCount} id="pagination">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <a
              href={props.hrefForPage(currentPage - 1)}
              {...({ "pjax-page": "" } as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
            >
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
            max={props.pageCount}
            min={1}
            name="pageNum"
            type="number"
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{props.pageCount}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <a
              href={props.hrefForPage(currentPage + 1)}
              {...({ "pjax-page": "" } as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
            >
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

function projectIssueListPageHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  query: ProjectIssueListQuery,
  pageNum: number,
): string {
  const params = new URLSearchParams();
  if (query.state) {
    params.set("state", query.state);
  }
  if (query.authorLoginId) {
    params.set("authorLoginId", query.authorLoginId);
  }
  if (query.assigneeLoginId) {
    params.set("assigneeLoginId", query.assigneeLoginId);
  }
  if (query.assigneeId !== undefined) {
    params.set("assigneeId", String(query.assigneeId));
  }
  if (query.milestoneId > 0) {
    params.set("milestoneId", String(query.milestoneId));
  }
  for (const labelId of query.labelIds) {
    params.append("labelIds", String(labelId));
  }
  if (pageNum > 1) {
    params.set("pageNum", String(pageNum));
  }
  const queryString = params.toString();
  const baseHref = buildProjectHref(runtimeConfig, ownerName, projectName, "issues");
  return queryString ? `${baseHref}?${queryString}` : baseHref;
}

function projectIssueExcelExportHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  query: ProjectIssueListQuery,
): string {
  const params = new URLSearchParams();
  if (query.state) {
    params.set("state", query.state);
  }
  if (query.authorLoginId) {
    params.set("authorLoginId", query.authorLoginId);
  }
  if (query.assigneeLoginId) {
    params.set("assigneeLoginId", query.assigneeLoginId);
  }
  if (query.assigneeId !== undefined) {
    params.set("assigneeId", String(query.assigneeId));
  }
  if (query.milestoneId > 0) {
    params.set("milestoneId", String(query.milestoneId));
  }
  for (const labelId of query.labelIds) {
    params.append("labelIds", String(labelId));
  }
  params.set("format", "xls");
  return `${buildProjectHref(runtimeConfig, ownerName, projectName, "issues")}?${params.toString()}`;
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
  onCommentSubmit?: (
    contentsMarkdown: string,
    attachmentIds?: number[],
    parentCommentId?: number,
  ) => Promise<void>;
  onCommentUpdate?: (
    commentId: number,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void>;
  onCommentVoteToggle?: (commentId: number, viewerHasVoted: boolean) => Promise<void>;
  onDeleteIssue?: () => Promise<void>;
  onFavoriteToggle?: () => Promise<void>;
  onShareIssue?: (loginId: string, targetType?: IssueAssignableUserItem["type"]) => Promise<void>;
  onIssueWeightChange?: (delta: 1 | -1) => Promise<void>;
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
  const [childCommentDrafts, setChildCommentDrafts] = React.useState<Record<number, string>>({});
  const [editingCommentIds, setEditingCommentIds] = React.useState<Set<number>>(() => new Set());
  const [translatedIssueMarkdown, setTranslatedIssueMarkdown] = React.useState<string | null>(null);
  const [translatedCommentMarkdownById, setTranslatedCommentMarkdownById] = React.useState<
    Record<number, string>
  >({});
  const [translatingIssue, setTranslatingIssue] = React.useState(false);
  const [translatingCommentIds, setTranslatingCommentIds] = React.useState<Set<number>>(
    () => new Set(),
  );
  const childCommentsByParent = React.useMemo(() => {
    const commentsByParent = new Map<number, ProjectIssueDetailViewModel["comments"]>();
    for (const comment of issue?.comments ?? []) {
      if (!comment.parentCommentId) {
        continue;
      }
      const comments = commentsByParent.get(comment.parentCommentId) ?? [];
      comments.push(comment);
      commentsByParent.set(comment.parentCommentId, comments);
    }
    return commentsByParent;
  }, [issue?.comments]);
  const issueAuthorLoginId = issue?.authorLoginId ?? "";
  const issueAuthorLabel = issue?.authorLabel || issueAuthorLoginId || "issue.noAuthor";
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
  const translateIssue = async () => {
    if (!issue || translatingIssue || translatedIssueMarkdown !== null) {
      return;
    }
    setTranslatingIssue(true);
    try {
      const translatedMarkdown = await translateLegacyResource(
        props.runtimeConfig,
        props.csrfToken,
        {
          number: issue.issueNumber,
          owner: issue.ownerName,
          projectName: issue.projectName,
          type: "issue",
        },
      );
      setTranslatedIssueMarkdown(translatedMarkdown);
    } catch {
      // Legacy translation failures leave the original Markdown visible.
    } finally {
      setTranslatingIssue(false);
    }
  };
  const translateIssueComment = async (comment: IssueTimelineCommentViewModel) => {
    if (translatingCommentIds.has(comment.id) || translatedCommentMarkdownById[comment.id]) {
      return;
    }
    setTranslatingCommentIds((current) => new Set(current).add(comment.id));
    try {
      const translatedMarkdown = await translateLegacyResource(
        props.runtimeConfig,
        props.csrfToken,
        {
          number: comment.id,
          owner: detail.ownerName,
          projectName: detail.projectName,
          type: "issue-comment",
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
    <main className="app-shell issue-detail-page">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap board-view">
          <header className="board-header issue">
            <div className="pull-right mr10 mt10 hide-in-mobile">
              {issue?.createdLabel ? (
                <div className="date" title={issue.createdLabel}>
                  {issue.createdLabel}
                </div>
              ) : null}
              {issueState ? (
                <span className={`badge badge-issue-${issueStateClass}`}>{issueState}</span>
              ) : null}
            </div>
            <div className="title">
              {issueNumberLabel ? (
                <strong className="board-id">
                  {issue?.isDraft ? (
                    <span className="draft-number">#issue.state.draft</span>
                  ) : (
                    issueNumberLabel
                  )}
                </strong>
              ) : null}
              <h1>
                {issueTitle}
                {issue && props.onFavoriteToggle ? (
                  <button
                    aria-label="title.favorite"
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
                  {issue?.createdLabel ? (
                    <span className="date" title={issue.createdLabel}>
                      {issue.createdLabel}
                    </span>
                  ) : null}
                  <span className={`badge badge-small badge-issue-${issueStateClass}`}>
                    {issueState}
                  </span>
                </div>
              ) : null}
              {issue?.isDraft ? <div className="draft">issue.draft.description</div> : null}
            </div>
            {issue ? (
              <PostingHistoryModal
                basePath={props.runtimeConfig?.basePath}
                historyMarkdown={issue.historyMarkdown}
                issueReferences={issue.issueReferences}
                linkLabel="change.edited"
                mentionReferences={issue.mentionReferences}
                ownerName={issue.ownerName}
                projectName={issue.projectName}
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
                  markdown={translatedIssueMarkdown ?? issue?.bodyMarkdown ?? ""}
                  mentionReferences={issue?.mentionReferences}
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
                  <div>
                    {issue && props.onWatchToggle ? (
                      <button
                        className={`ybtn${issue.isWatching ? " ybtn-watching" : ""}`}
                        data-placement="top"
                        data-toggle="tooltip"
                        data-watching={String(issue.isWatching)}
                        id="watch-button"
                        onClick={() => void props.onWatchToggle?.()}
                        title="issue.watch.description"
                        type="button"
                      >
                        {issue.isWatching ? "issue.unwatch" : "issue.watch"}
                      </button>
                    ) : null}
                    {issue?.viewerCanUpdate ? (
                      <button
                        className="ybtn"
                        data-content="issue.sharer.description"
                        data-placement="top"
                        data-toggle="popover"
                        data-trigger="hover"
                        id="issue-share-button"
                        type="button"
                      >
                        button.share.issue
                      </button>
                    ) : null}
                    {issue ? (
                      <span className="project-btn-item hide show-in-mobile-inline ml4">
                        <a
                          className="ybtn ybtn-success"
                          href={buildProjectHref(
                            props.runtimeConfig,
                            issue.ownerName,
                            issue.projectName,
                            `issueform?parentIssueId=${
                              issue.parentIssueId || issue.issueId || issue.issueNumber
                            }`,
                          )}
                        >
                          button.newSubtask
                        </a>
                      </span>
                    ) : null}
                    {issue ? (
                      <span className="issue-weight">
                        <span className="divider">|</span>
                        <button
                          className="ybtn ybtn-small"
                          data-toggle="tooltip"
                          id="upvote-issue-weight"
                          onClick={() => {
                            void props.onIssueWeightChange?.(1);
                          }}
                          title="issue.weight: Upvote"
                          type="button"
                        >
                          <i className="yobicon-arrow-up-alt"></i>
                        </button>
                        <button
                          className="ybtn ybtn-small"
                          data-toggle="tooltip"
                          id="down-vote-issue-weight"
                          onClick={() => {
                            void props.onIssueWeightChange?.(-1);
                          }}
                          title="issue.weight: Down vote"
                          type="button"
                        >
                          <i className="yobicon-arrow-down-alt"></i>
                        </button>
                        <span
                          className="weight-number"
                          data-content="issue.weight.description"
                          data-placement="top"
                          data-toggle="popover"
                          data-trigger="hover"
                        >
                          {issue.weight ?? 0}
                        </span>
                      </span>
                    ) : null}
                  </div>
                </div>
                {issue ? (
                  <div className={voteWrapClass} id="vote">
                    {props.onVoteToggle ? (
                      <button
                        className={`ybtn${issue.hasVoted ? " ybtn-watching" : ""}`}
                        data-request-method="post"
                        data-toggle="tooltip"
                        onClick={() => void props.onVoteToggle?.()}
                        title={
                          issue.hasVoted ? "issue.unvote.description" : "issue.vote.description"
                        }
                        type="button"
                      >
                        <span className="heart">
                          <i className="yobicon-hearts"></i>
                        </span>
                      </button>
                    ) : null}
                    <IssueDetailVoters issue={issue} runtimeConfig={props.runtimeConfig} />
                  </div>
                ) : null}
                <span className="act-row">
                  {issue ? (
                    <button
                      className="icon btn-transparent-with-fontsize-lineheight ml10"
                      data-toggle="tooltip"
                      disabled={translatingIssue || translatedIssueMarkdown !== null}
                      id="translate"
                      onClick={() => void translateIssue()}
                      title="button.translation"
                      type="button"
                    >
                      <i className="yobicon-lang"></i>
                    </button>
                  ) : null}
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
                    </a>
                  ) : null}
                  {issue?.viewerCanUpdate && onStateChange ? (
                    <button
                      className="ybtn"
                      onClick={() => void onStateChange(issue.state === "open" ? "closed" : "open")}
                      type="button"
                    >
                      {issue.state === "open" ? "button.nextState.closed" : "button.nextState.open"}
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
                        if (comment.parentCommentId) {
                          return null;
                        }
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
                                            ? "common.comment.unvote"
                                            : "common.comment.vote"
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
                                  <button
                                    className="icon btn-transparent-with-fontsize-lineheight ml10 comment-translate"
                                    data-comment-id={comment.id}
                                    data-toggle="tooltip"
                                    disabled={
                                      translatingCommentIds.has(comment.id) ||
                                      Boolean(translatedCommentMarkdownById[comment.id])
                                    }
                                    onClick={() => void translateIssueComment(comment)}
                                    title="button.translation"
                                    type="button"
                                  >
                                    <i className="yobicon-lang"></i>
                                  </button>
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
                              {comment.viewerCanUpdate && props.onCommentUpdate ? (
                                <div hidden={!commentIsEditing}>
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
                                </div>
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
                                  markdown={
                                    translatedCommentMarkdownById[comment.id] ??
                                    comment.contentsMarkdown
                                  }
                                  mentionReferences={comment.mentionReferences}
                                  ownerName={detail.ownerName}
                                  projectName={detail.projectName}
                                  showTasklistBar
                                />
                              </div>
                            </div>
                            <div className="add-a-comment pull-right">
                              comment.oneline.comment.placeholder
                            </div>
                            <div className="subcomment-media-body">
                              <div className="child-comments">
                                {(childCommentsByParent.get(comment.id) ?? []).map(
                                  (childComment) => {
                                    const childAuthorLoginId =
                                      childComment.authorLoginId || childComment.authorLabel;
                                    return (
                                      <div className="one-line-comment" key={childComment.id}>
                                        <div className="contents">
                                          <MarkdownRenderer
                                            basePath={props.runtimeConfig.basePath}
                                            markdown={childComment.contentsMarkdown}
                                            ownerName={detail.ownerName}
                                            projectName={detail.projectName}
                                          />
                                          <span className="subcomment-author hide">
                                            {" - "}
                                            <a
                                              className="usf-group"
                                              data-placement="top"
                                              data-toggle="tooltip"
                                              href={
                                                childAuthorLoginId
                                                  ? prefixBasePath(
                                                      props.runtimeConfig.basePath,
                                                      `/${childAuthorLoginId}`,
                                                    )
                                                  : "#"
                                              }
                                              title={
                                                childComment.authorLoginId ||
                                                childComment.authorLabel
                                              }
                                            >
                                              <strong>
                                                {childComment.authorLabel ||
                                                  childComment.authorLoginId}
                                              </strong>
                                            </a>{" "}
                                            <a
                                              className="ago"
                                              href={`#comment-${childComment.id}`}
                                              title={childComment.createdLabel}
                                            >
                                              {childComment.createdLabel}
                                            </a>
                                            {childComment.viewerCanDelete &&
                                            props.onCommentDelete ? (
                                              <button
                                                className="btn-transparent deleteButtonX"
                                                data-request-uri={buildProjectHref(
                                                  props.runtimeConfig,
                                                  detail.ownerName,
                                                  detail.projectName,
                                                  `issue/${issueNumber}/comment/${childComment.id}/delete`,
                                                )}
                                                data-toggle="comment-delete"
                                                onClick={() =>
                                                  setCommentDeleteTargetId(childComment.id)
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
                                  },
                                )}
                              </div>
                              {issue?.viewerCanComment && props.onCommentSubmit ? (
                                <div className="child-comment-input-form">
                                  <form
                                    action={buildProjectHref(
                                      props.runtimeConfig,
                                      detail.ownerName,
                                      detail.projectName,
                                      `issue/${issueNumber}/comments`,
                                    )}
                                    encType="multipart/form-data"
                                    method="post"
                                    onSubmit={(event) => {
                                      event.preventDefault();
                                      const contents = (
                                        childCommentDrafts[comment.id] ?? ""
                                      ).trim();
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
                                      <button
                                        className="ybtn ybtn-success"
                                        data-legacy-label="OK"
                                        type="submit"
                                      >
                                        comment.save
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
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
                {issue?.viewerCanComment && props.onCommentSubmit ? (
                  <IssueCommentForm
                    action={buildProjectHref(
                      props.runtimeConfig,
                      detail.ownerName,
                      detail.projectName,
                      `issue/${issue.issueNumber}/comments`,
                    )}
                    csrfToken={props.csrfToken}
                    getIssueReferencesQueryOptions={props.getIssueReferencesQueryOptions}
                    onSearchMentionUsers={props.onSearchMentionUsers}
                    onSubmit={props.onCommentSubmit}
                    runtimeConfig={props.runtimeConfig}
                  />
                ) : issue ? (
                  <DisabledIssueCommentBox />
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
              <div className="watcher-list"></div>
              {issue ? (
                <IssueSubtaskList issue={issue} runtimeConfig={props.runtimeConfig} />
              ) : null}
              <IssueDetailSelectedLabels issue={issue} runtimeConfig={props.runtimeConfig} />
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
                  runtimeConfig={props.runtimeConfig}
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
                <button
                  aria-label="button.close"
                  className="close"
                  onClick={() => setDeleteConfirmOpen(false)}
                  type="button"
                >
                  ×
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
                  aria-label="button.close"
                  className="close"
                  data-dismiss="modal"
                  onClick={() => setCommentDeleteTargetId(null)}
                  type="button"
                >
                  ×
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
  canSetDefaultLoginPage?: boolean;
  issueList: UserIssueListViewModel | null;
  onSetDefaultLoginPage?: () => void;
  query: UserIssueListQuery;
  runtimeConfig: RuntimeConfig;
}) {
  const issueList = props.issueList;
  const query = props.query;
  const action = prefixBasePath(props.runtimeConfig.basePath, "/user/issues");
  const issueItems = issueList?.items ?? [];
  const state = query.state || "open";
  const totalPageCount = Math.ceil((issueList?.totalCount ?? 0) / (issueList?.pageSize || 1));
  const viewerUserId = issueList?.viewerUserId ? String(issueList.viewerUserId) : "";
  const filters = [
    {
      className: "assigned-to-me",
      icon: "yobicon-user",
      label: "issue.list.assignedToMe",
      value: "assigned",
    },
    {
      className: "authored-by-me",
      icon: "yobicon-pencil",
      label: "issue.list.authoredByMe",
      value: "authored",
    },
    {
      className: "commented-by-me",
      icon: "yobicon-comments",
      label: "issue.list.commentedByMe",
      value: "commented",
    },
    {
      className: "mentioned-of-me",
      icon: "yobicon-at",
      label: "issue.list.mentionedOfMe",
      value: "mentioned",
    },
    {
      className: "shared-with-me",
      icon: "yobicon-share",
      label: "issue.list.sharedWithMe",
      value: "shared",
    },
    {
      className: "favorite-issue",
      icon: "yobicon-favorite",
      label: "issue.list.favorite",
      value: "favorite",
    },
  ];
  const filterHref = (filter: string) => `${action}?filter=${filter}&state=${state}&pageNum=1`;
  const sideFilterCountFor = (filter: string) => {
    if (!issueList || query.query.trim()) {
      return null;
    }
    if (filter === "mentioned") {
      return issueList.sideFilterCounts.mentioned;
    }
    if (filter === "shared") {
      return issueList.sideFilterCounts.shared;
    }
    if (filter === "favorite") {
      return issueList.sideFilterCounts.favorite;
    }
    return null;
  };
  const stateHref = (nextState: string) =>
    `${action}?filter=${query.filter}&state=${nextState}&query=${encodeURIComponent(query.query)}`;
  const orderDirFor = (orderBy: string) =>
    query.orderBy === orderBy && query.orderDir === "desc" ? "asc" : "desc";
  const orderHref = (orderBy: string) =>
    `${action}?filter=${query.filter}&state=${state}&orderBy=${orderBy}&orderDir=${orderDirFor(
      orderBy,
    )}&pageNum=1`;
  const legacyFilterUserId = (filter: string) => (query.filter === filter ? viewerUserId : "");

  return (
    <main className="app-shell user-issue-list-page">
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <UserIssueMySeriesMenuTabs
            basePath={props.runtimeConfig.basePath}
            canSetDefaultLoginPage={props.canSetDefaultLoginPage ?? false}
            onSetDefaultLoginPage={props.onSetDefaultLoginPage}
          />
          <div className="row-fluid issue-list-wrap" data-pjax-container="">
            <aside className="left-menu span2 span-hard-wrap">
              <div className="inner advanced">
                <ul className="lst-stacked unstyled">
                  {filters.map((filter) => (
                    <li
                      className={query.filter === filter.value ? "active" : undefined}
                      key={filter.value}
                    >
                      <a
                        data-assignee-id={filter.value === "assigned" ? viewerUserId : ""}
                        data-author-id={filter.value === "authored" ? viewerUserId : ""}
                        data-commenter-id={filter.value === "commented" ? viewerUserId : ""}
                        data-favorite-id={filter.value === "favorite" ? viewerUserId : ""}
                        data-mention-id={filter.value === "mentioned" ? viewerUserId : ""}
                        data-milestone-id=""
                        data-pjax-filter=""
                        data-sharer-id={filter.value === "shared" ? viewerUserId : ""}
                        href={filterHref(filter.value)}
                      >
                        <span className={filter.className}>
                          <i className={filter.icon} /> {filter.label}
                        </span>
                        {sideFilterCountFor(filter.value) !== null ? (
                          <span>{` (${sideFilterCountFor(filter.value)})`}</span>
                        ) : null}
                      </a>
                    </li>
                  ))}
                </ul>
                <form action={action} id="search" method="get" name="search">
                  <input name="filter" type="hidden" value={query.filter} />
                  <input name="orderBy" type="hidden" value={query.orderBy} />
                  <input name="orderDir" type="hidden" value={query.orderDir} />
                  <input name="state" type="hidden" value={state} />
                  <input
                    data-search="authorId"
                    name="authorId"
                    type="hidden"
                    value={legacyFilterUserId("authored")}
                  />
                  <input
                    data-search="commenterId"
                    name="commenterId"
                    type="hidden"
                    value={legacyFilterUserId("commented")}
                  />
                  <input
                    data-search="assigneeId"
                    name="assigneeId"
                    type="hidden"
                    value={legacyFilterUserId("assigned")}
                  />
                  <input
                    data-search="mentionId"
                    name="mentionId"
                    type="hidden"
                    value={legacyFilterUserId("mentioned")}
                  />
                  <input
                    data-search="sharerId"
                    name="sharerId"
                    type="hidden"
                    value={legacyFilterUserId("shared")}
                  />
                  <input
                    data-search="favoriteId"
                    name="favoriteId"
                    type="hidden"
                    value={legacyFilterUserId("favorite")}
                  />
                  <div className="search myissues-search-input">
                    <div className="search-bar">
                      <input
                        className="textbox full"
                        defaultValue={query.query}
                        name="query"
                        placeholder="issue.search"
                        type="text"
                      />
                      <button className="search-btn" type="submit">
                        <i className="yobicon-search" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </aside>
            <section className="span10 span-hard-wrap" id="span10">
              <ul className="nav nav-tabs nm">
                <li className={state === "open" ? "active" : undefined} data-pjax="">
                  <a data-state="open" href={stateHref("open")}>
                    issue.state.open{" "}
                    <span className="num-badge">{issueList?.openIssueCount ?? 0}</span>
                  </a>
                </li>
                <li className={state === "closed" ? "active" : undefined} data-pjax="">
                  <a data-state="closed" href={stateHref("closed")}>
                    issue.state.closed{" "}
                    <span className="num-badge">{issueList?.closedIssueCount ?? 0}</span>
                  </a>
                </li>
                <li>
                  <LegacyTwoColumnModeCheckboxArea />
                </li>
                <li className="show-subtasks-li">
                  <LegacyShowSubtasksCheckbox />
                </li>
              </ul>
              {issueItems.length > 0 ? (
                <>
                  <div className="filter-wrap small-heights">
                    {issueItems.length > 1 ? (
                      <div className="filters pull-right">
                        {[
                          ["dueDate", "common.order.dueDate"],
                          ["updatedDate", "common.order.updatedDate"],
                          ["createdDate", "common.order.date"],
                          ["numOfComments", "common.order.comments"],
                        ].map(([orderBy, label]) => (
                          <a
                            className={query.orderBy === orderBy ? "filter active" : "filter"}
                            data-order-by={orderBy}
                            data-order-dir={orderDirFor(orderBy)}
                            href={orderHref(orderBy)}
                            key={orderBy}
                          >
                            <i
                              className={`ico btn-gray-arrow ${
                                query.orderBy === orderBy && query.orderDir !== "desc" ? "" : "down"
                              }`}
                            />
                            {label}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <ul className="post-list-wrap my-issues">
                    {issueItems.map((item) => {
                      const issueHref = buildProjectHref(
                        props.runtimeConfig,
                        item.ownerName,
                        item.projectName,
                        `issue/${item.issueNumber}`,
                      );
                      const projectHref = buildProjectHref(
                        props.runtimeConfig,
                        item.ownerName,
                        item.projectName,
                      );
                      const legacyIssueId = item.id && item.id > 0 ? item.id : item.issueNumber;
                      const weight = item.weight ?? 0;
                      return (
                        <li
                          className="post-item title"
                          data-href={issueHref}
                          id={`issue-item-${legacyIssueId}`}
                          key={`${item.ownerName}/${item.projectName}/${item.issueNumber}`}
                        >
                          <div className="span12 span-hard-wrap">
                            <div className="span2 project-name-in-my-issues fixed-height-my-issues-list">
                              <span className="infos-item project-name">
                                <a
                                  className="title project"
                                  data-placement="bottom"
                                  data-toggle="tooltip"
                                  href={projectHref}
                                  title="project.name"
                                >
                                  {item.projectName}
                                </a>
                              </span>
                              <span className="infos-item post-id">#{item.issueNumber}</span>
                            </div>
                            <div className="title-wrap span6">
                              <span className="title-cell">
                                {weight > 0 ? (
                                  <span
                                    className="weight-up-arrow"
                                    data-placement="right"
                                    data-toggle="tooltip"
                                    title={`issue.weight ${weight}`}
                                  >
                                    <i className="yobicon-angle-circled-up" />
                                  </span>
                                ) : null}
                                {weight < 0 ? (
                                  <span
                                    className="weight-down-arrow"
                                    data-placement="right"
                                    data-toggle="tooltip"
                                    title={`issue.weight ${weight}`}
                                  >
                                    <i className="yobicon-angle-circled-down" />
                                  </span>
                                ) : null}
                                <a className="title" href={issueHref}>
                                  {item.title}
                                </a>
                                {item.commentCount > 0 || item.voterCount > 0 ? (
                                  <span className="item-count-groups">
                                    {item.commentCount > 0 ? (
                                      <a className="num-comments" href={`${issueHref}#comments`}>
                                        {item.commentCount}
                                      </a>
                                    ) : null}
                                    {item.voterCount > 0 ? (
                                      <a className="num-hearts" href={`${issueHref}#vote`}>
                                        {item.voterCount}
                                      </a>
                                    ) : null}
                                  </span>
                                ) : null}
                                <span className="for-subtask-progressbar">
                                  <IssueListSubtaskSummary
                                    item={item}
                                    runtimeConfig={props.runtimeConfig}
                                  />
                                </span>
                                {item.labels.map((label) => (
                                  <a
                                    className="label issue-label list-label twoColumeModeTarget"
                                    data-label-id={label.id}
                                    href={`${buildProjectHref(
                                      props.runtimeConfig,
                                      item.ownerName,
                                      item.projectName,
                                      "issues?state=open",
                                    )}&labelIds=${label.id}`}
                                    key={label.id}
                                    style={{ background: label.color || "#ddd" }}
                                  >
                                    {label.name}
                                  </a>
                                ))}
                                <IssueListChildRows
                                  item={item}
                                  runtimeConfig={props.runtimeConfig}
                                />
                              </span>
                            </div>
                            <div className="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list">
                              {query.filter === "authored" ? null : (
                                <UserIssueAuthorCell
                                  authorLabel={item.authorLabel}
                                  authorLoginId={item.authorLoginId}
                                  runtimeConfig={props.runtimeConfig}
                                />
                              )}
                            </div>
                            <div
                              className={`infos ${
                                query.filter !== "assigned" && item.assigneeLabel
                                  ? "span2"
                                  : "span3"
                              } meta`}
                            >
                              <span className="meta-cell">
                                <span className="hide show-in-mobile">
                                  {query.filter === "authored" ? null : (
                                    <UserIssueAuthorCell
                                      authorLabel={item.authorLabel}
                                      authorLoginId={item.authorLoginId}
                                      runtimeConfig={props.runtimeConfig}
                                    />
                                  )}
                                </span>
                                <span className="infos-item">{item.updatedLabel}</span>
                                {item.milestoneTitle ? (
                                  <span className="mileston-tag">{item.milestoneTitle}</span>
                                ) : null}
                                {item.dueDateLabel ? (
                                  <span
                                    className={`pull-right${
                                      (item.dueDateOverdue ?? false) ? " overdue" : ""
                                    }`}
                                    data-placement="top"
                                    data-toggle="tooltip"
                                    title={`Due date: ${item.dueDateLabel}`}
                                  >
                                    <i className="yobicon-clock2" />
                                    {item.state === "open" && (item.dueDateOverdue ?? false)
                                      ? "issue.dueDate.overdue"
                                      : item.dueDateLabel}
                                  </span>
                                ) : null}
                              </span>
                            </div>
                            {query.filter !== "assigned" && item.assigneeLabel ? (
                              <div className="span1 hide-in-mobile">
                                <div className="mt5 pull-right hide-in-mobile">
                                  <a
                                    className="avatar-wrap assinee"
                                    data-placement="bottom"
                                    data-toggle="tooltip"
                                    href={issueHref}
                                    title={`issue.assignee: ${item.assigneeLabel}`}
                                  >
                                    {item.assigneeAvatarUrl ? (
                                      <img
                                        alt={item.assigneeLabel}
                                        height={32}
                                        src={item.assigneeAvatarUrl}
                                        width={32}
                                      />
                                    ) : (
                                      <span>{item.assigneeLabel.slice(0, 1).toUpperCase()}</span>
                                    )}
                                  </a>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div id="pagination" data-total={totalPageCount}>
                    <a
                      className="pageNum active"
                      href={`${action}?pageNum=${issueList?.pageNum ?? 1}`}
                    >
                      {issueList?.pageNum ?? 1}
                    </a>
                  </div>
                </>
              ) : (
                <div className="error-wrap">
                  <i className="ico ico-err1" />
                  <p>issue.is.empty</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function UserIssueAuthorCell({
  authorLabel,
  authorLoginId,
  runtimeConfig,
}: {
  authorLabel: string;
  authorLoginId?: string;
  runtimeConfig: RuntimeConfig;
}) {
  if (!authorLabel) {
    return <span className="infos-item">issue.noAuthor</span>;
  }
  if (!authorLoginId) {
    return (
      <span
        className="infos-item infos-link-item author-cell"
        data-placement="bottom"
        data-toggle="tooltip"
        title={authorLabel}
      >
        {authorLabel}
      </span>
    );
  }
  return (
    <a
      className="infos-item infos-link-item author-cell"
      data-placement="bottom"
      data-toggle="tooltip"
      href={prefixBasePath(runtimeConfig.basePath, `/${authorLoginId}`)}
      title={authorLoginId}
    >
      {authorLabel}
    </a>
  );
}

function UserIssueMySeriesMenuTabs(props: {
  basePath: string;
  canSetDefaultLoginPage: boolean;
  onSetDefaultLoginPage?: () => void;
}) {
  return (
    <ul className="nav nav-tabs">
      <li>
        <a href={prefixBasePath(props.basePath, "/notifications")}>notification</a>
      </li>
      <li className="active">
        <a href={prefixBasePath(props.basePath, "/user/issues")}>issue.myIssue</a>
      </li>
      <li>
        <a href={prefixBasePath(props.basePath, "/user/files")}>user.files</a>
      </li>
      <li>
        {props.canSetDefaultLoginPage ? (
          <button
            className="ybtn hide-in-mobile"
            data-content="button.setDefaultLoginPage.desc"
            data-placement="bottom"
            data-toggle="popover"
            data-trigger="hover"
            data-url="user/issues"
            id="setDefaultLoginPage"
            onClick={props.onSetDefaultLoginPage}
            title="button.setDefaultLoginPage"
            type="button"
          >
            button.setDefaultLoginPage
          </button>
        ) : null}
      </li>
    </ul>
  );
}

function IssueSharerPanel(props: {
  issue: ProjectIssueDetailViewModel;
  onSearchSharableUsers?: (query: string) => Promise<IssueAssignableUsersResponse>;
  onShareIssue?: (loginId: string, targetType?: IssueAssignableUserItem["type"]) => Promise<void>;
  onUnshareIssue?: (loginId: string) => Promise<void>;
  runtimeConfig: RuntimeConfig;
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

  const sharerValue = props.issue.sharers.map((sharer) => sharer.loginId).join(",");

  return (
    <dl className={hasSharers ? "sharer-list" : "sharer-list hideFromDisplayOnly"}>
      <dt className="issue-share-title mb10">
        issue.sharer{" "}
        <span className="num issue-sharer-count">
          {hasSharers ? props.issue.sharers.length : ""}
        </span>
      </dt>
      {hasSharers ? (
        <dd id="sharer-list">
          {props.issue.sharers.map((sharer) => (
            <div className="text-ellipsis sharer-item" key={sharer.loginId}>
              <a
                className="usf-group"
                href={prefixBasePath(props.runtimeConfig.basePath, `/${sharer.loginId}`)}
              >
                <strong className="name">{sharer.userLabel || sharer.loginId}</strong>
              </a>
              {canManage && props.onUnshareIssue ? (
                <button
                  className="select2-search-choice-close"
                  onClick={() => void props.onUnshareIssue?.(sharer.loginId)}
                  title="issue.event.sharer.deleted.title"
                  type="button"
                />
              ) : null}
            </div>
          ))}
        </dd>
      ) : null}
      {canManage && onShareIssue ? (
        <dd
          className={hasSharers ? undefined : "hideFromDisplayOnly"}
          id={hasSharers ? undefined : "sharer-list"}
        >
          <input
            className="bigdrop width100p"
            id="issueSharer"
            name="issueSharer"
            placeholder="issue.sharer.select"
            readOnly
            title=""
            type="hidden"
            value={sharerValue}
          />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitSharerLoginId(loginId);
            }}
          >
            <IssueAssigneeAutocompleteField
              className="bigdrop width100p"
              emptyMessage="issue.sharer.select"
              errorMessage="issue.sharer.select"
              name="issueSharer"
              onChange={setLoginId}
              onSearchAssignableUsers={props.onSearchSharableUsers}
              onSelect={selectSharerSuggestion}
              placeholder="issue.sharer.select"
              title=""
              value={loginId}
            />
            <button className="ybtn" disabled={submitting} type="submit">
              button.share.issue
            </button>
          </form>
        </dd>
      ) : null}
    </dl>
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
    return null;
  }
  if (props.state.items.length === 0) {
    return (
      <p className="assignee-autocomplete-status">{props.emptyMessage ?? "title.no.results"}</p>
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
        <p className="assignee-autocomplete-status">Loading more results…</p>
      ) : null}
    </div>
  );
}

function IssueAssigneeAutocompleteField(props: {
  className?: string;
  emptyMessage?: string;
  errorMessage?: string;
  id?: string;
  name: string;
  onChange: (value: string) => void;
  onSearchAssignableUsers?: (query: string) => Promise<IssueAssignableUsersResponse>;
  onSelect: (suggestion: IssueAssignableUserItem) => void;
  placeholder: string;
  style?: React.CSSProperties;
  title?: string;
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
        className={props.className}
        id={props.id}
        name={props.name}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        placeholder={props.placeholder}
        style={props.style}
        title={props.title}
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
        className="bigdrop"
        id="assignee"
        name="assigneeLoginId"
        onChange={setAssigneeLoginId}
        onSearchAssignableUsers={props.onSearchAssignableUsers}
        onSelect={selectSuggestion}
        placeholder="issue.noAssignee"
        style={{ width: "100%" }}
        title=""
        value={assigneeLoginId}
      />
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

export function IssueMentionUserSuggestions(props: {
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
    return null;
  }
  if (props.state.items.length === 0) {
    return null;
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
    </div>
  );
}

export function IssueReferenceSuggestions(props: {
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
    return null;
  }
  if (props.state.items.length === 0) {
    return null;
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
    </div>
  );
}

function IssueMentionTextarea(props: {
  className?: string;
  context: IssueMentionUserSearchContext;
  csrfToken?: string;
  editorMode?: string;
  getIssueReferencesQueryOptions?: IssueReferenceQueryOptionsFactory;
  id?: string;
  name?: string;
  onChange: (value: string) => void;
  onAttachmentUpload?: (attachment: UploadedAttachment) => void;
  onSearchMentionUsers?: (
    query: string,
    context: IssueMentionUserSearchContext,
  ) => Promise<IssueMentionUsersResponse>;
  placeholder: string;
  runtimeConfig?: RuntimeConfig;
  tabIndex?: number;
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
        data-editor-mode={props.editorMode}
        id={props.id}
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
        tabIndex={props.tabIndex}
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
  action: string;
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
      action={props.action}
      encType="multipart/form-data"
      id="comment-form"
      method="post"
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
      {props.csrfToken ? <input name="csrfToken" type="hidden" value={props.csrfToken} /> : null}
      <div className="write-comment-box">
        <div data-toggle="markdown-editor" className="mt10">
          <ul className="nav nav-tabs nm small">
            <li className="active">
              <a href="#edit-comment-body" data-toggle="tab" data-mode="edit">
                common.editor.edit
              </a>
            </li>
            <li>
              <a href="#preview-comment-body" data-toggle="tab" data-mode="preview">
                common.editor.preview
              </a>
            </li>
            <li>
              <div className="task-list-button">
                <button
                  className="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"
                  onClick={(event) => addLegacyTasklistTemplateFromButton(event.currentTarget)}
                  type="button"
                >
                  <i className="yobicon-list task-list-icon"></i> button.add.checklist
                </button>
              </div>
            </li>
            <li>
              <div className="editor-clear-temporary">
                <div className="editor-clear-temporary-button">
                  <button
                    className="ybtn ybtn-small ybtn-warning"
                    id="button-clear-temporary"
                    type="button"
                  >
                    button.clear.temporary
                  </button>
                </div>
              </div>
            </li>
            <li>
              <div className="editor-notice-label"></div>
            </li>
          </ul>
          <div className="tab-content" style={{ overflow: "visible", position: "relative" }}>
            <LegacyMarkdownHelp />
            <div className="tab-pane active" id="edit-comment-body">
              <div className="textarea-box">
                <IssueMentionTextarea
                  className="editorSeries content comment nm"
                  context="issue-comment"
                  csrfToken={props.csrfToken}
                  editorMode="comment-body"
                  getIssueReferencesQueryOptions={props.getIssueReferencesQueryOptions}
                  id="editor-contents-comment-body"
                  name="contents"
                  onAttachmentUpload={(attachment) =>
                    setAttachmentIds((current) => [...current, attachment.id])
                  }
                  onChange={setContentsMarkdown}
                  onSearchMentionUsers={props.onSearchMentionUsers}
                  placeholder=""
                  runtimeConfig={props.runtimeConfig}
                  value={contentsMarkdown}
                />
              </div>
            </div>
            <div className="tab-pane" id="preview-comment-body">
              <div className="markdown-preview markdown-wrap comment-body"></div>
            </div>
            <div className="notification-receiver">
              <span className="notification-receiver-title">notification.receiver.list.title</span>
              <span className="notification-receiver-list"></span>
            </div>
          </div>
        </div>
        <input
          className="temporaryUploadFiles"
          name="temporaryUploadFiles"
          type="hidden"
          value={attachmentIds.join(",")}
          readOnly
        />
        <div className="attachment-files"></div>
        <div data-resourceid="" data-resourcetype="ISSUE_COMMENT" id="upload"></div>
        <div className="write-comment-wrap">
          <div className="right-txt">
            <button className="ybtn hidden" id="dynamic-comment-btn" type="button"></button>
            <button className="ybtn ybtn-success" disabled={submitting} type="submit">
              button.comment.new
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function DisabledIssueCommentBox() {
  return (
    <div
      className="write-comment-box mt20"
      title="error.auth.unauthorized.comment"
      data-login="required"
    >
      <div className="write-comment-wrap">
        <div className="textarea-box">
          <textarea className="comment disabled" disabled style={{ cursor: "text" }}></textarea>
        </div>
        <div className="right-txt mt10">
          <span className="ybtn ybtn-disabled">button.comment.new</span>
        </div>
      </div>
    </div>
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
            <LegacyMarkdownEditorShell
              editId={`edit-${props.commentId}`}
              editorMode="update-comment-body"
              previewId={`preview-${props.commentId}`}
            >
              <IssueMentionTextarea
                className="editorSeries content comment nm"
                context="issue-comment"
                csrfToken={props.csrfToken}
                editorMode="update-comment-body"
                getIssueReferencesQueryOptions={props.getIssueReferencesQueryOptions}
                id={`editor-contents-${props.commentId}`}
                name="contents"
                onAttachmentUpload={(attachment) =>
                  setAttachmentIds((current) => [...current, attachment.id])
                }
                onChange={setContentsMarkdown}
                onSearchMentionUsers={props.onSearchMentionUsers}
                placeholder=""
                runtimeConfig={props.runtimeConfig}
                value={contentsMarkdown}
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
  initialParentIssueId?: number;
  milestoneOptions?: ProjectMilestoneViewModel[];
  mode: "create" | "edit";
  onSearchAssignableUsers?: (query: string) => Promise<IssueAssignableUsersResponse>;
  onSearchMentionUsers?: (
    query: string,
    context: IssueMentionUserSearchContext,
  ) => Promise<IssueMentionUsersResponse>;
  onSubmit: (input: ProjectIssueFormSubmitInput) => Promise<void>;
  parentIssueOptions?: ProjectIssueParentOptionViewModel[];
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
  const [dueDate, setDueDate] = React.useState(props.initialIssue?.dueDateLabel ?? "");
  const [labelIds, setLabelIds] = React.useState<number[]>(() =>
    (props.initialIssue?.labels ?? []).map((label) => label.id),
  );
  const [milestoneId, setMilestoneId] = React.useState(props.initialIssue?.milestoneId ?? 0);
  const [parentIssueId, setParentIssueId] = React.useState(
    props.initialIssue?.parentIssueId ?? props.initialParentIssueId ?? 0,
  );
  const [submitting, setSubmitting] = React.useState(false);
  const availableLabels = detail.dashboard?.labels ?? [];
  const milestoneOptions = props.milestoneOptions ?? [];
  const parentIssueOptions = props.parentIssueOptions ?? [];

  React.useEffect(() => {
    setTitle(props.initialIssue?.title ?? "");
    setBodyMarkdown(props.initialIssue?.bodyMarkdown ?? props.initialBodyMarkdown ?? "");
    setAttachmentIds([]);
    setAssigneeLoginId(props.initialIssue?.assigneeLoginId ?? "");
    setDueDate(props.initialIssue?.dueDateLabel ?? "");
    setLabelIds((props.initialIssue?.labels ?? []).map((label) => label.id));
    setMilestoneId(props.initialIssue?.milestoneId ?? 0);
    setParentIssueId(props.initialIssue?.parentIssueId ?? props.initialParentIssueId ?? 0);
  }, [
    props.initialIssue?.assigneeLoginId,
    props.initialIssue?.bodyMarkdown,
    props.initialIssue?.dueDateLabel,
    props.initialIssue?.labels,
    props.initialIssue?.milestoneId,
    props.initialIssue?.parentIssueId,
    props.initialIssue?.title,
    props.initialBodyMarkdown,
    props.initialParentIssueId,
  ]);

  const selectAssigneeSuggestion = (suggestion: IssueAssignableUserItem) => {
    setAssigneeLoginId(suggestion.loginId);
  };

  const toggleLabel = (labelId: number, checked: boolean) => {
    setLabelIds((current) =>
      checked
        ? Array.from(new Set([...current, labelId]))
        : current.filter((currentId) => currentId !== labelId),
    );
  };

  const action =
    props.mode === "edit" && props.initialIssue?.issueNumber
      ? buildProjectHref(
          props.runtimeConfig,
          detail.ownerName,
          detail.projectName,
          `issue/${props.initialIssue.issueNumber}/edit`,
        )
      : buildProjectHref(
          props.runtimeConfig,
          detail.ownerName,
          detail.projectName,
          "issues/latest",
        );

  const submitIssueForm = (intent: "save" | "draft" | "publish") => {
    const input = buildProjectIssueFormSubmitInput({
      assigneeLoginId,
      attachmentIds,
      bodyMarkdown,
      dueDate,
      isDraft: intent === "draft",
      isPublish: intent === "publish",
      labelIds,
      milestoneId,
      parentIssueId,
      title,
    });
    if (!input) {
      return;
    }
    setSubmitting(true);
    void props.onSubmit(input).finally(() => setSubmitting(false));
  };

  return (
    <main className="app-shell issue-form-page">
      <h1 className="sr-only">{props.mode === "create" ? "button.newIssue" : "button.edit"}</h1>
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="content-wrap frm-wrap">
            <form
              action={action}
              encType="multipart/form-data"
              id="issue-form"
              method="post"
              onSubmit={(event) => {
                event.preventDefault();
                submitIssueForm("save");
              }}
            >
              {props.csrfToken ? (
                <input name="csrfToken" type="hidden" value={props.csrfToken} />
              ) : null}
              {props.mode === "edit" && props.initialIssue ? (
                <>
                  <input name="authorId" type="hidden" value={props.initialIssue.authorId || ""} />
                  <input id="isPublish" name="isPublish" type="hidden" value="false" />
                </>
              ) : null}
              <input name="referCommentId" type="hidden" value={props.referCommentId ?? ""} />
              <input id="isDraft" name="isDraft" type="hidden" value="false" />
              <div className="row-fluid">
                <div className="span12">
                  <dl>
                    {props.mode === "edit" && props.initialIssue ? (
                      <dt>
                        {props.initialIssue.isDraft ? (
                          <span className="draft">issue.state.draft</span>
                        ) : (
                          <label htmlFor="title">
                            <strong className="secondary-txt">
                              #{props.initialIssue.issueNumber}
                            </strong>
                          </label>
                        )}
                      </dt>
                    ) : null}
                    <dd>
                      <div className="span12">
                        <div className="span11">
                          <input
                            autoComplete="off"
                            className="text title"
                            id="title"
                            maxLength={250}
                            name="title"
                            onChange={(event) => setTitle(event.currentTarget.value)}
                            placeholder="title"
                            data-legacy-tabindex="1"
                            title={props.mode === "create" ? "title.help.key" : undefined}
                            type="text"
                            value={title}
                          />
                        </div>
                        <div className="span1 subtask-message">issue.option</div>
                      </div>
                      <div
                        className={`subtask-wrap${parentIssueOptions.length > 0 || parentIssueId > 0 ? " show" : ""}`}
                      >
                        <div className="span3">
                          <select
                            data-container-css-class="fullsize"
                            data-format="projects"
                            data-placeholder="organization.choose.projects"
                            data-toggle="select2"
                            disabled={parentIssueOptions.length === 0}
                            id="targetProjectId"
                            name="targetProjectId"
                          >
                            <option value="">{detail.projectName}</option>
                          </select>
                        </div>
                        <div className="span6">
                          <select
                            data-container-css-class="fullsize"
                            data-format="issues"
                            data-placeholder="organization.choose.projects"
                            data-toggle="select2"
                            id="parentId"
                            name="parentIssueId"
                            onChange={(event) =>
                              setParentIssueId(Number(event.currentTarget.value))
                            }
                            value={parentIssueId}
                          >
                            <option value="">issue.subtask.select</option>
                            {parentIssueOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                #{option.issueNumber}. {option.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
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
                          <IssueMentionTextarea
                            className="editorSeries content comment nm"
                            context="issue-body"
                            csrfToken={props.csrfToken}
                            editorMode="content-body"
                            getIssueReferencesQueryOptions={props.getIssueReferencesQueryOptions}
                            id="editor-body-content-body"
                            name="body"
                            onAttachmentUpload={(attachment) =>
                              setAttachmentIds((current) => [...current, attachment.id])
                            }
                            onChange={setBodyMarkdown}
                            onSearchMentionUsers={props.onSearchMentionUsers}
                            placeholder=""
                            runtimeConfig={props.runtimeConfig}
                            data-legacy-tabindex="2"
                            value={bodyMarkdown}
                          />
                        </LegacyMarkdownEditorShell>
                      </dd>
                    </dl>
                    <div
                      data-resourceid={props.initialIssue?.issueNumber ?? ""}
                      data-resourcetype="ISSUE_POST"
                      id="upload"
                    ></div>
                    <div className="actrow right-txt">
                      {props.mode === "edit" &&
                      props.initialIssue &&
                      !props.initialIssue.isDraft ? (
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
                      {props.mode !== "edit" || !props.initialIssue?.isDraft ? (
                        <button
                          className={
                            props.mode === "create" ? "ybtn ybtn-success" : "ybtn ybtn-info"
                          }
                          disabled={submitting}
                          id="button-save"
                          type="submit"
                        >
                          button.save
                        </button>
                      ) : null}
                      {props.mode === "edit" && props.initialIssue?.isDraft ? (
                        <>
                          <button
                            className="ybtn ybtn-info"
                            disabled={submitting}
                            id="button-draft-publish"
                            onClick={() => submitIssueForm("publish")}
                            title="button.draft.publish.description"
                            type="button"
                          >
                            button.draft.publish
                          </button>
                          <button
                            className="ybtn ybtn-watching draft-save-btn"
                            disabled={submitting}
                            id="draft-save-btn"
                            onClick={() => submitIssueForm("draft")}
                            title="button.draft.save.description"
                            type="button"
                          >
                            button.draft.save
                          </button>
                        </>
                      ) : props.mode === "create" ? (
                        <button
                          className="ybtn ybtn-watching draft-save-btn"
                          disabled={submitting}
                          id="draft-save-btn"
                          onClick={() => submitIssueForm("draft")}
                          title="button.draft.save.description"
                          type="button"
                        >
                          button.draft.save
                        </button>
                      ) : null}
                      <a
                        className="ybtn"
                        data-legacy-href="history.back"
                        href={buildProjectHref(
                          props.runtimeConfig,
                          detail.ownerName,
                          detail.projectName,
                          "issues",
                        )}
                      >
                        button.cancel
                      </a>
                    </div>
                  </div>
                  <div className="span3 span-hard-wrap right-menu">
                    {props.mode === "edit" && props.initialIssue ? (
                      <dl className="issue-option">
                        <dt>issue.state</dt>
                        <dd>
                          <div className="btn-group auto" data-name="state" id="state">
                            <button
                              className="btn dropdown-toggle auto"
                              data-toggle="dropdown"
                              type="button"
                            >
                              <span className="d-label">issue.state</span>
                              <span className="d-caret">
                                <span className="caret"></span>
                              </span>
                            </button>
                            <ul className="dropdown-menu">
                              <li
                                className={
                                  props.initialIssue.state === "open" ? "active" : undefined
                                }
                                data-selected={
                                  props.initialIssue.state === "open" ? "true" : undefined
                                }
                                data-value="OPEN"
                              >
                                <a
                                  href={buildProjectHref(
                                    props.runtimeConfig,
                                    detail.ownerName,
                                    detail.projectName,
                                    "issues?state=open",
                                  )}
                                >
                                  issue.state.open
                                </a>
                              </li>
                              <li
                                className={
                                  props.initialIssue.state === "closed" ? "active" : undefined
                                }
                                data-selected={
                                  props.initialIssue.state === "closed" ? "true" : undefined
                                }
                                data-value="CLOSED"
                              >
                                <a
                                  href={buildProjectHref(
                                    props.runtimeConfig,
                                    detail.ownerName,
                                    detail.projectName,
                                    "issues?state=closed",
                                  )}
                                >
                                  issue.state.closed
                                </a>
                              </li>
                            </ul>
                          </div>
                        </dd>
                      </dl>
                    ) : null}
                    <dl className="issue-option">
                      <dt>issue.assignee</dt>
                      <dd>
                        <IssueAssigneeAutocompleteField
                          className="bigdrop"
                          id="assignee"
                          name="assigneeLoginId"
                          onChange={setAssigneeLoginId}
                          onSearchAssignableUsers={props.onSearchAssignableUsers}
                          onSelect={selectAssigneeSuggestion}
                          placeholder="issue.noAssignee"
                          style={{ width: "100%" }}
                          title=""
                          value={assigneeLoginId}
                        />
                      </dd>
                    </dl>
                    <dl className="issue-option" id="milestoneOption">
                      <dt>milestone</dt>
                      <dd>
                        {milestoneOptions.length === 0 ? (
                          <a
                            className="ybtn ybtn-small ybtn-fullsize"
                            href={buildProjectHref(
                              props.runtimeConfig,
                              detail.ownerName,
                              detail.projectName,
                              "newMilestoneForm",
                            )}
                            target="_blank"
                          >
                            milestone.menu.new
                          </a>
                        ) : (
                          <select
                            data-container-css-class="fullsize"
                            data-format="milestone"
                            data-toggle="select2"
                            id="milestoneId"
                            name="milestoneId"
                            onChange={(event) => setMilestoneId(Number(event.currentTarget.value))}
                            value={milestoneId}
                          >
                            <option value={0}>issue.noMilestone</option>
                            {milestoneOptions.map((milestone) => (
                              <option
                                data-state={milestone.state}
                                key={milestone.id}
                                value={milestone.id}
                              >
                                {milestone.title}
                              </option>
                            ))}
                          </select>
                        )}
                      </dd>
                    </dl>
                    <dl className="issue-option">
                      <dt>issue.dueDate</dt>
                      <dd>
                        <div className="search search-bar">
                          <input
                            className="textbox full"
                            data-toggle="calendar"
                            id="issueDueDate"
                            name="dueDate"
                            onChange={(event) => setDueDate(event.currentTarget.value)}
                            type="text"
                            value={dueDate}
                          />
                          <button className="search-btn btn-calendar" type="button">
                            <i className="yobicon-calendar2"></i>
                          </button>
                        </div>
                      </dd>
                    </dl>
                    {availableLabels.length > 0 ? (
                      <dl className="issue-option">
                        <dt>
                          label{" "}
                          <a
                            className="label-edit"
                            href={buildProjectHref(
                              props.runtimeConfig,
                              detail.ownerName,
                              detail.projectName,
                              "issue/labelsform",
                            )}
                            target="_blank"
                          >
                            [button.edit]
                          </a>
                        </dt>
                        <dd>
                          <select
                            aria-label="label.select"
                            className="hide"
                            data-allow-clear="true"
                            data-container-css-class="issue-labels bordered fullsize"
                            data-dropdown-css-class="issue-labels"
                            data-format="issuelabel"
                            data-placeholder="label.select"
                            data-search="labelIds"
                            data-toggle="select2"
                            id="labelIds"
                            multiple
                            name="labelIds"
                            onChange={(event) => {
                              const selected = Array.from(event.currentTarget.selectedOptions).map(
                                (option) => Number(option.value),
                              );
                              setLabelIds(selected);
                            }}
                            value={labelIds.map(String)}
                          >
                            <option></option>
                            {availableLabels.map((label) => (
                              <option
                                data-category-id={label.categoryId ?? ""}
                                data-category-is-exclusive={
                                  label.categoryIsExclusive ? "true" : "false"
                                }
                                key={label.id}
                                value={label.id}
                              >
                                {label.name}
                              </option>
                            ))}
                          </select>
                          <div className="issue-labels-fallback">
                            {availableLabels.map((label) => (
                              <label className="checkbox inline" key={label.id}>
                                <input
                                  checked={labelIds.includes(label.id)}
                                  name="labelIds"
                                  onChange={(event) =>
                                    toggleLabel(label.id, event.currentTarget.checked)
                                  }
                                  type="checkbox"
                                  value={label.id}
                                />
                                <span
                                  className="label issue-label list-label active"
                                  style={{ backgroundColor: label.color }}
                                >
                                  {label.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        </dd>
                      </dl>
                    ) : null}
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

export type ProjectIssueFormSubmitInput = {
  assigneeLoginId: string;
  attachmentIds: number[];
  bodyMarkdown: string;
  dueDate: string;
  isDraft: boolean;
  isPublish: boolean;
  labelIds: number[];
  milestoneId: number;
  parentIssueId: number;
  title: string;
};

export function buildProjectIssueFormSubmitInput(input: {
  assigneeLoginId: string;
  attachmentIds?: number[];
  bodyMarkdown: string;
  dueDate?: string;
  isDraft?: boolean;
  isPublish?: boolean;
  labelIds?: number[];
  milestoneId?: number;
  parentIssueId?: number;
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
    dueDate: input.dueDate ?? "",
    isDraft: input.isDraft ?? false,
    isPublish: input.isPublish ?? false,
    labelIds: input.labelIds ?? [],
    milestoneId: input.milestoneId ?? 0,
    parentIssueId: input.parentIssueId ?? 0,
    title,
  };
}
