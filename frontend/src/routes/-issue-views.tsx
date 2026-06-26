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
import {
  LEGACY_DEFAULT_LANGUAGE,
  lookupLegacyMessage,
  type TranslateOptions,
  useLegacyMessages,
  type LegacyI18nContextValue,
} from "../i18n";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import {
  addLegacyTasklistTemplateFromButton,
  legacyCommentMentionsCurrentUser,
  LegacyMarkdownEditorShell,
  LegacyMarkdownHelp,
  MarkdownRenderer,
  type MarkdownTasklistToggleInput,
} from "./-markdown-renderer";
import { buildProjectHref, ProjectHeader, ProjectMenu } from "./-project-views";
import { legacyIssueLabelClassName } from "./-shared";
import type {
  ProjectDetailViewModel,
  ProjectIssueDetailViewModel,
  ProjectIssueListViewModel,
  ProjectIssueParentOptionViewModel,
  ProjectMilestoneViewModel,
  UserIssueListViewModel,
} from "./-view-models";

type IssueTimelineCommentViewModel = NonNullable<
  ProjectIssueDetailViewModel["timeline"][number]["comment"]
>;

type LegacyMessageLookup = LegacyI18nContextValue["t"];

function legacyMessage(
  messages: LegacyMessageLookup | undefined,
  key: string,
  options: TranslateOptions = {},
) {
  const fallback = options.fallback ?? key;
  return messages
    ? messages(key, { ...options, fallback })
    : lookupLegacyMessage(LEGACY_DEFAULT_LANGUAGE, key, { ...options, fallback });
}

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

function LegacyTwoColumnModeCheckboxArea(props: { messages?: LegacyMessageLookup } = {}) {
  return (
    <div
      className="two-column-icon mr10 hide-in-mobile"
      data-content={legacyMessage(props.messages, "common.two.column.mode.desc")}
      id="two-column-mode-checkbox"
      title={legacyMessage(props.messages, "common.two.column.mode")}
    >
      <label
        className="checkbox"
        aria-label={legacyMessage(props.messages, "common.two.column.view")}
      >
        <div className="two-column-icon-border">
          <input id="two-column-mode" type="checkbox" />
          <span className="two-column-mode-text">
            {legacyMessage(props.messages, "common.two.column.view")}
          </span>
        </div>
      </label>
    </div>
  );
}

function LegacyShowSubtasksCheckbox(props: { messages?: LegacyMessageLookup } = {}) {
  return (
    <div
      className="show-subtasks mr10"
      data-content={legacyMessage(props.messages, "common.show.subtasks.desc")}
      data-placement="top"
      data-toggle="popover"
      data-trigger="hover"
      id="two-column-mode-checkbox"
      title={legacyMessage(props.messages, "common.show.subtasks")}
    >
      <label
        className="checkbox"
        aria-label={legacyMessage(props.messages, "common.show.subtasks")}
      >
        <div className="show-subtasks-button-border">
          <input id="toggle-show-subtasks" type="checkbox" />
          <span className="show-subtasks-text">
            {legacyMessage(props.messages, "common.show.subtasks")}
          </span>
        </div>
      </label>
    </div>
  );
}

function IssueSubtaskList(props: {
  issue: ProjectIssueDetailViewModel;
  messages?: LegacyMessageLookup;
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
  const parentIssueState = issue.parentIssueState || issue.state;
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
          <span className={`parent-issue-state ${parentIssueState}`}>
            {legacyMessage(props.messages, `issue.state.${parentIssueState}`)}
          </span>
        </div>
        <hr className="parent-issue-delimeter" />
        <div className="child-issues">
          {childIssues.map((child) => (
            <IssueSubtaskItem
              child={child}
              key={`${child.state}-${child.issueNumber}`}
              messages={props.messages}
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
  messages?: LegacyMessageLookup;
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
              <span className="draft-number">
                #{legacyMessage(props.messages, "issue.state.draft")}
              </span>
            ) : (
              `#${child.issueNumber}`
            )}
          </span>{" "}
          <span>{child.title}</span>
          {child.assigneeLabel ? <span>{` - ${child.assigneeLabel}`}</span> : null}
        </span>
      </a>
      <span className="font12 no-border-at-child">
        {(child.commentCount ?? 0) > 0 || (child.voterCount ?? 0) > 0 ? (
          <span className="item-count-groups">
            {(child.commentCount ?? 0) > 0 ? (
              <a className="comments-count comments-count-color" href={`${childHref}#comments`}>
                <span className="count-groups item-icon">
                  <i className="yobicon-comment2"></i>
                </span>
                <span className="count-groups item-count">{child.commentCount}</span>
              </a>
            ) : null}
            {(child.voterCount ?? 0) > 0 ? (
              <a className="vote-count vote-color" href={`${childHref}#vote`}>
                <span className="count-groups item-icon">
                  <i className="yobicon-hearts"></i>
                </span>
                <span className="count-groups item-count strong">{child.voterCount}</span>
              </a>
            ) : null}
          </span>
        ) : null}
      </span>
      {child.labels.map((label) => (
        <a
          className={legacyIssueLabelClassName(
            "label issue-label list-label active twoColumeModeTarget",
            label.color,
          )}
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
  messages?: LegacyMessageLookup;
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
      <dt>{legacyMessage(props.messages, "label")}</dt>
      <dd>
        {issue.labels.map((label) => (
          <a
            className={legacyIssueLabelClassName("label issue-label active static", label.color)}
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
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
}) {
  const voters = props.issue.issueVoters ?? [];
  const [clipboardMessage, setClipboardMessage] = React.useState("");
  if (voters.length === 0) {
    return null;
  }
  const avatarVoters = voters.slice(0, 3);
  const hiddenCount = Math.max(0, voters.length - avatarVoters.length);
  const modalVoters = voters;
  const voterEmailText = voters
    .map((voter) => `${voter.userLabel || voter.loginId} <${voter.emailAddress ?? ""}>;`)
    .join("");
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
                {`and ${hiddenCount} others`}
              </a>
            </li>
          ) : null}
        </ul>
      </div>
      <div className="modal hide voters-dialog" id="voters">
        <div className="modal-header">
          <button
            aria-label={legacyMessage(props.messages, "button.close")}
            className="close"
            data-dismiss="modal"
            type="button"
          >
            ×
          </button>
          <h5 className="nm">{legacyMessage(props.messages, "issue.voters")}</h5>
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
          {clipboardMessage ? (
            <span className="clipboard-alert" role="alert">
              {legacyMessage(props.messages, clipboardMessage)}
            </span>
          ) : null}
          {props.runtimeConfig.showUserEmail ? (
            <button
              className="ybtn ybtn-info ybtn-small"
              data-clipboard-text={voterEmailText}
              id="copyEmailBtn"
              onClick={() => {
                if (!navigator.clipboard?.writeText) {
                  setClipboardMessage("site.features.error.clipboard");
                  return;
                }
                void navigator.clipboard
                  .writeText(voterEmailText)
                  .then(() => setClipboardMessage("button.copy.email.success.message"))
                  .catch(() => setClipboardMessage("site.features.error.clipboard"));
              }}
              type="button"
            >
              {legacyMessage(props.messages, "button.copy.email")}
            </button>
          ) : null}
          <button className="ybtn ybtn-info ybtn-small" data-dismiss="modal">
            {legacyMessage(props.messages, "button.close")}
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

function compactLegacyMarkdownText(markdown: string) {
  return (
    markdown
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_>#~-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "..."
  );
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

function IssueListChildRows(props: {
  item: IssueListItemViewModel;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
}) {
  const childIssues = props.item.childIssues ?? [];
  return (
    <div className="child-issue-list hide">
      {childIssues.length > 0 ? (
        <div className="child-issues">
          {childIssues.map((child) => (
            <IssueSubtaskItem
              child={{
                assigneeLabel: child.assigneeLabel,
                commentCount: child.commentCount,
                createdLabel: child.createdLabel,
                isDraft: child.isDraft ?? false,
                issueNumber: child.issueNumber,
                labels: child.labels,
                state: child.state,
                title: child.title,
                voterCount: child.voterCount,
              }}
              key={`${child.state}-${child.issueNumber}`}
              messages={props.messages}
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
  messages?: LegacyMessageLookup;
  mentionReferences?: ProjectIssueDetailViewModel["mentionReferences"];
  ownerName?: string;
  projectName?: string;
  viewerLabel?: string;
  viewerLoginId?: string;
}) {
  const historyMarkdown = props.historyMarkdown ?? "";
  if (!historyMarkdown.trim()) {
    return null;
  }

  return (
    <div className="posting-history">
      <a data-toggle="modal" href="#-yona-posting-history">
        <span>{legacyMessage(props.messages, props.linkLabel)}</span>
      </a>
      <div className="modal hide" id="-yona-posting-history">
        <div className="modal-header">
          <button
            aria-label={legacyMessage(props.messages, "button.close")}
            className="close"
            data-dismiss="modal"
            type="button"
          >
            ×
          </button>
          <h5 className="nm">{legacyMessage(props.messages, "change.history")}</h5>
        </div>
        <MarkdownRenderer
          className="modal-body"
          basePath={props.basePath}
          currentUserLabel={props.viewerLabel}
          currentUserLoginId={props.viewerLoginId}
          issueReferences={props.issueReferences}
          markdown={historyMarkdown}
          mentionReferences={props.mentionReferences}
          ownerName={props.ownerName}
          projectName={props.projectName}
        />
        <div className="modal-footer">
          <button className="ybtn ybtn-info ybtn-small" data-dismiss="modal" type="button">
            {legacyMessage(props.messages, "button.confirm")}
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

function IssueCommentVoters(props: {
  basePath: string;
  comment: IssueTimelineCommentViewModel;
  messages?: LegacyMessageLookup;
}) {
  const voters = props.comment.voters;
  if (voters.length === 0) {
    return null;
  }

  if (voters.length > 5) {
    const modalId = `voters-${props.comment.id}`;
    return (
      <>
        <span
          data-html="true"
          data-toggle="tooltip"
          style={{ marginRight: "2px" }}
          title={`${voters
            .slice(0, 5)
            .map((voter) => voter.userLabel || voter.loginId)
            .join("<br>")}<br>...`}
        >
          <a className="vote-description-people" data-toggle="modal" href={`#${modalId}`}>
            {commentAgreementLabel(voters.length)}
          </a>
        </span>
        <div className="modal hide voters-dialog" id={modalId}>
          <div className="modal-header">
            <button
              aria-hidden="true"
              aria-label={legacyMessage(props.messages, "button.close")}
              className="close"
              data-dismiss="modal"
              type="button"
            >
              ×
            </button>
            <h5 className="nm">{legacyMessage(props.messages, "issue.voters")}</h5>
          </div>
          <div className="modal-body">
            <ul className="unstyled">
              {voters.map((voter) => (
                <li key={voter.userId}>
                  <a
                    className="usf-group"
                    href={prefixBasePath(props.basePath, `/${voter.loginId}`)}
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
            <button
              aria-hidden="true"
              className="ybtn ybtn-info ybtn-small"
              data-dismiss="modal"
              type="button"
            >
              {legacyMessage(props.messages, "button.close")}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {voters.map((voter) => (
        <a
          className="avatar-wrap smaller"
          data-placement="top"
          data-toggle="tooltip"
          href={prefixBasePath(props.basePath, `/${voter.loginId}`)}
          key={voter.userId}
          title={voter.userLabel || voter.loginId}
        >
          {voter.avatarUrl ? (
            <img alt={voter.userLabel || voter.loginId} src={voter.avatarUrl} />
          ) : null}
        </a>
      ))}
    </>
  );
}

export function ProjectIssueListPage(props: {
  detail: ProjectDetailViewModel | null;
  labels?: IssueListFilterLabel[];
  issueList: ProjectIssueListViewModel | null;
  messages?: LegacyMessageLookup;
  milestones?: IssueListFilterMilestone[];
  onMassUpdate?: (input: ProjectIssueMassUpdateInput) => Promise<void>;
  query?: ProjectIssueListQuery;
  runtimeConfig: RuntimeConfig;
  viewerLoginId?: string;
  viewerUserId?: number;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const query: ProjectIssueListQuery = {
    assigneeLoginId: "",
    authorLoginId: "",
    dueDate: "",
    filter: "",
    labelIds: [],
    milestoneId: 0,
    orderBy: "updatedDate",
    orderDir: "desc",
    pageNum: 1,
    state: "",
    ...props.query,
  };
  const [selectedIssueNumbers, setSelectedIssueNumbers] = React.useState<number[]>([]);
  const selectedLabelIds = query.labelIds.map(String);
  const issueList = props.issueList;
  const [dueDateFilter, setDueDateFilter] = React.useState(query.dueDate);
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);
  React.useEffect(() => {
    setDueDateFilter(query.dueDate);
    setValidationMessage(null);
    setSelectedIssueNumbers([]);
  }, [query.dueDate, issueList]);
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
  const visibleIssueNumbers = React.useMemo(
    () =>
      [...(issueList?.draftItems ?? []), ...(issueList?.items ?? [])].map(
        (item) => item.issueNumber,
      ),
    [issueList?.draftItems, issueList?.items],
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
    { ...query, commenterId: query.commenterId ?? 0, pageNum: 1 },
    1,
  );
  const submitMassUpdate = async (input: Omit<ProjectIssueMassUpdateInput, "issueNumbers">) => {
    if (selectedIssueNumbers.length === 0 || !props.onMassUpdate) {
      return;
    }
    await props.onMassUpdate({
      ...input,
      issueNumbers: selectedIssueNumbers,
    });
    setSelectedIssueNumbers([]);
  };

  return (
    <main className="app-shell issue-list-page">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu
        activeMenu="issue"
        detail={detail}
        keymapMode="list"
        runtimeConfig={props.runtimeConfig}
      />
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
                    {legacyMessage(
                      props.messages,
                      query.state === "closed" ? "issue.list.all.closed" : "issue.list.all.open",
                    )}
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
                    {legacyMessage(props.messages, "issue.list.assignedToMe")}
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
                    {legacyMessage(props.messages, "issue.list.authoredByMe")}
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
                    {legacyMessage(props.messages, "issue.list.commentedByMe")}
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
                onSubmit={(event) => {
                  if (!isLegacyIssueDueDateValid(dueDateFilter)) {
                    event.preventDefault();
                    setValidationMessage("issue.error.invalid.duedate");
                  }
                }}
              >
                <input name="pageNum" type="hidden" value="1" />
                <input name="orderBy" type="hidden" value={query.orderBy} />
                <input name="orderDir" type="hidden" value={query.orderDir} />
                <input name="state" type="hidden" value={query.state} />
                {query.commenterId !== undefined ? (
                  <input
                    data-search="commenterId"
                    name="commenterId"
                    type="hidden"
                    value={query.commenterId}
                  />
                ) : null}
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
                {query.authorId !== undefined ? (
                  <input
                    data-search="authorId"
                    name="authorId"
                    type="hidden"
                    value={query.authorId}
                  />
                ) : null}
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
                      defaultValue={query.filter}
                    />
                    <button className="search-btn" data-submit="submit" type="submit">
                      <i className="yobicon-search"></i>
                    </button>
                  </div>
                </div>
                <div className="srch-advanced hide-in-mobile" id="advanced-search-form">
                  <dl className="issue-option">
                    <dt>{legacyMessage(props.messages, "issue.author")}</dt>
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
                        <option value="">
                          {legacyMessage(props.messages, "common.order.all")}
                        </option>
                        {query.authorLoginId ? (
                          <option value={query.authorLoginId}>{query.authorLoginId}</option>
                        ) : null}
                      </select>
                    </dd>
                  </dl>
                  <dl className="issue-option">
                    <dt>{legacyMessage(props.messages, "issue.assignee")}</dt>
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
                        <option value="">
                          {legacyMessage(props.messages, "common.order.all")}
                        </option>
                        <option value="anonymous">
                          {legacyMessage(props.messages, "issue.noAssignee")}
                        </option>
                        {query.assigneeLoginId ? (
                          <option value={query.assigneeLoginId}>{query.assigneeLoginId}</option>
                        ) : null}
                      </select>
                    </dd>
                  </dl>
                  <dl className="issue-option">
                    <dt>{legacyMessage(props.messages, "milestone")}</dt>
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
                        <option value="">
                          {legacyMessage(props.messages, "milestone.state.all")}
                        </option>
                        <option value="0">
                          {legacyMessage(props.messages, "issue.noMilestone")}
                        </option>
                        <IssueMilestoneOptionGroups
                          messages={props.messages}
                          milestones={props.milestones ?? []}
                        />
                      </select>
                    </dd>
                  </dl>
                  <dl className="issue-option">
                    <dt>{legacyMessage(props.messages, "issue.dueDate")}</dt>
                    <dd className="search search-bar">
                      <input
                        className="textbox full"
                        data-toggle="calendar"
                        id="issueDueDate"
                        name="dueDate"
                        onChange={(event) => {
                          setValidationMessage(null);
                          setDueDateFilter(event.currentTarget.value);
                        }}
                        type="text"
                        value={dueDateFilter}
                      />
                      <button className="search-btn btn-calendar" type="button">
                        <i className="yobicon-calendar2"></i>
                      </button>
                    </dd>
                  </dl>
                  {validationMessage ? (
                    <div className="alert alert-error" role="alert">
                      {validationMessage}
                    </div>
                  ) : null}
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
                        <span className="vmiddle">
                          {legacyMessage(props.messages, "label.manage")}
                        </span>
                      ) : null}
                    </a>
                    <dl className="issue-option">
                      <dt>{legacyMessage(props.messages, "label")}</dt>
                      <dd>
                        <select
                          aria-label={legacyMessage(props.messages, "label.select")}
                          className="issue-label-filter"
                          data-search="labelIds"
                          data-placeholder={legacyMessage(props.messages, "label.select")}
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
                  {legacyMessage(props.messages, "issue.menu.new")}
                </a>
              </div>
              <ul className="nav nav-tabs nm">
                <li className={query.state !== "closed" ? "active" : undefined} data-pjax="">
                  <a href={openHref} {...openStateAttr}>
                    {legacyMessage(props.messages, "issue.state.open")}
                    <span className="num-badge">
                      {query.state !== "closed" ? (issueList?.totalCount ?? 0) : 0}
                    </span>
                  </a>
                </li>
                <li className={query.state === "closed" ? "active" : undefined} data-pjax="">
                  <a href={closedHref} {...closedStateAttr}>
                    {legacyMessage(props.messages, "issue.state.closed")}
                    <span className="num-badge">
                      {query.state === "closed" ? (issueList?.totalCount ?? 0) : 0}
                    </span>
                  </a>
                </li>
                <li>
                  <LegacyTwoColumnModeCheckboxArea messages={props.messages} />
                </li>
                <li className="show-subtasks-li">
                  <LegacyShowSubtasksCheckbox messages={props.messages} />
                </li>
              </ul>
              {issueRows.length === 0 ? (
                <div className="error-wrap">
                  <i className="ico ico-err1"></i>
                  <p>{legacyMessage(props.messages, "issue.is.empty")}</p>
                </div>
              ) : (
                <>
                  <div className="filter-wrap board">
                    <IssueMassUpdateToolbar
                      assignees={detail.dashboard?.assignees ?? []}
                      disabled={selectedIssueNumbers.length === 0 || !props.onMassUpdate}
                      labels={props.labels ?? []}
                      messages={props.messages}
                      milestones={(props.milestones ?? []).filter(
                        (milestone) => milestone.state !== "closed",
                      )}
                      onCheckAll={(checked) =>
                        setSelectedIssueNumbers(checked ? visibleIssueNumbers : [])
                      }
                      onMassUpdate={submitMassUpdate}
                      selectedCount={selectedIssueNumbers.length}
                      totalCount={visibleIssueNumbers.length}
                      viewerLoginId={props.viewerLoginId}
                      viewerUserId={props.viewerUserId}
                    />
                    <div className="filters pull-right">
                      {[
                        ["dueDate", "common.order.dueDate"],
                        ["updatedDate", "common.order.updatedDate"],
                        ["createdDate", "common.order.date"],
                        ["numOfComments", "common.order.comments"],
                      ].map(([orderBy, label]) => (
                        <a
                          className={query.orderBy === orderBy ? "filter active" : "filter"}
                          href={projectIssueListPageHref(
                            props.runtimeConfig,
                            detail.ownerName,
                            detail.projectName,
                            {
                              ...query,
                              orderBy,
                              orderDir:
                                query.orderBy === orderBy && query.orderDir === "desc"
                                  ? "asc"
                                  : "desc",
                              pageNum: 1,
                            },
                            1,
                          )}
                          key={orderBy}
                          {...({
                            orderby: orderBy,
                            orderdir:
                              query.orderBy === orderBy && query.orderDir === "desc"
                                ? "asc"
                                : "desc",
                          } as React.AnchorHTMLAttributes<HTMLAnchorElement> & {
                            orderby: string;
                            orderdir: string;
                          })}
                        >
                          <i className="ico btn-gray-arrow down"></i>
                          {legacyMessage(props.messages, label)}
                        </a>
                      ))}
                    </div>
                  </div>
                  {issueList && issueList.draftItems.length > 0 ? (
                    <ProjectIssueRows
                      items={issueList.draftItems}
                      listKind="draft"
                      messages={props.messages}
                      onSelectionChange={setSelectedIssueNumbers}
                      query={query}
                      runtimeConfig={props.runtimeConfig}
                      selectedIssueNumbers={selectedIssueNumbers}
                    />
                  ) : null}
                  <ProjectIssueRows
                    items={issueRows}
                    listKind="normal"
                    messages={props.messages}
                    onSelectionChange={setSelectedIssueNumbers}
                    query={query}
                    runtimeConfig={props.runtimeConfig}
                    selectedIssueNumbers={selectedIssueNumbers}
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
                      <i className="yobicon-file-excel"></i>{" "}
                      {legacyMessage(props.messages, "issue.downloadAsExcel")}
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
                    messages={props.messages}
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
  authorId?: number;
  authorLoginId: string;
  commenterId?: number;
  dueDate: string;
  filter?: string;
  labelIds: number[];
  milestoneId: number;
  orderBy?: string;
  orderDir?: string;
  pageNum: number;
  state: string;
}

export type ProjectIssueMassUpdateInput = {
  addLabelIds?: number[];
  assigneeLoginId?: string;
  assigneeUpdate?: boolean;
  delete?: boolean;
  dueDate?: string;
  isDueDateChanged?: boolean;
  issueNumbers: number[];
  milestoneId?: number;
  milestoneUpdate?: boolean;
  removeLabelIds?: number[];
  state?: string;
};

export interface IssueListFilterLabel {
  categoryId?: number | null;
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

function IssueMilestoneOptionGroups(props: {
  messages?: LegacyMessageLookup;
  milestones: IssueListFilterMilestone[];
}) {
  const openMilestones = props.milestones.filter((milestone) => milestone.state !== "closed");
  const closedMilestones = props.milestones.filter((milestone) => milestone.state === "closed");
  return (
    <>
      {openMilestones.length > 0 ? (
        <optgroup label={legacyMessage(props.messages, "milestone.state.open")}>
          {openMilestones.map((milestone) => (
            <option data-state={milestone.state} key={milestone.id} value={milestone.id}>
              {milestone.title}
            </option>
          ))}
        </optgroup>
      ) : null}
      {closedMilestones.length > 0 ? (
        <optgroup label={legacyMessage(props.messages, "milestone.state.closed")}>
          {closedMilestones.map((milestone) => (
            <option data-state={milestone.state} key={milestone.id} value={milestone.id}>
              {milestone.title}
            </option>
          ))}
        </optgroup>
      ) : null}
    </>
  );
}

function splitIssueTitleHeaderWords(title: string) {
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

function ProjectIssueRows(props: {
  items: ProjectIssueListViewModel["items"];
  listKind: "draft" | "normal";
  messages?: LegacyMessageLookup;
  onSelectionChange?: React.Dispatch<React.SetStateAction<number[]>>;
  query: ProjectIssueListQuery;
  runtimeConfig: RuntimeConfig;
  selectedIssueNumbers?: number[];
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
        const isSelected = (props.selectedIssueNumbers ?? []).includes(item.issueNumber);
        const issueItemHrefAttr = {
          href: issueHref,
        } as React.LiHTMLAttributes<HTMLLIElement> & { href: string };
        const weight = item.weight ?? 0;
        const splitTitle = splitIssueTitleHeaderWords(item.title || "");
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
                  checked={isSelected}
                  id={`issue-${legacyIssueId}`}
                  name="checked-issue"
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    props.onSelectionChange?.((current) => {
                      const without = current.filter((number) => number !== item.issueNumber);
                      return checked ? [...without, item.issueNumber] : without;
                    });
                  }}
                  type="checkbox"
                />
              </label>
              <div className="issue-item-row" data-for={`issue-${legacyIssueId}`}>
                <div className="title-wrap">
                  <a className="title" href={issueHref}>
                    <span className="post-id">
                      {item.state === "draft" ? (
                        <span className="draft-number">
                          #{legacyMessage(props.messages, "issue.state.draft")}
                        </span>
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
                      title={`${legacyMessage(props.messages, "issue.weight")} ${weight}`}
                    >
                      <i className="yobicon-angle-circled-up" />
                    </span>
                  ) : null}
                  {weight < 0 ? (
                    <span
                      className="weight-down-arrow"
                      data-placement="right"
                      data-toggle="tooltip"
                      title={`${legacyMessage(props.messages, "issue.weight")} ${weight}`}
                    >
                      <i className="yobicon-angle-circled-down" />
                    </span>
                  ) : null}
                  {splitTitle.prefixes.map((prefix) => (
                    <span className="title-prefix" key={prefix}>
                      {prefix}
                    </span>
                  ))}
                  <a className="title" href={issueHref}>
                    {splitTitle.title}
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
                    <span className="infos-item">
                      {legacyMessage(props.messages, "issue.noAuthor")}
                    </span>
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
                        title={legacyMessage(props.messages, "milestone")}
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
                      className={legacyIssueLabelClassName(
                        "label issue-label list-label active",
                        label.color,
                      )}
                      data-category-id={label.categoryId ?? ""}
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
                  <IssueListChildRows
                    item={item}
                    messages={props.messages}
                    runtimeConfig={props.runtimeConfig}
                  />
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
                    title={`${legacyMessage(props.messages, "issue.assignee")}: ${
                      item.assigneeLabel
                    }`}
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
                      ? legacyMessage(props.messages, "issue.dueDate.overdue")
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

function IssueMassUpdateToolbar(props: {
  assignees?: NonNullable<ProjectDetailViewModel["dashboard"]>["assignees"];
  disabled: boolean;
  labels: IssueListFilterLabel[];
  messages?: LegacyMessageLookup;
  milestones: IssueListFilterMilestone[];
  onCheckAll: (checked: boolean) => void;
  onMassUpdate: (input: Omit<ProjectIssueMassUpdateInput, "issueNumbers">) => Promise<void>;
  selectedCount: number;
  totalCount: number;
  viewerLoginId?: string;
  viewerUserId?: number;
}) {
  const disabled = props.disabled;
  const viewerAssignee = (props.assignees ?? []).find(
    (assignee) =>
      (props.viewerUserId ? assignee.userId === props.viewerUserId : false) ||
      (props.viewerLoginId ? assignee.loginId === props.viewerLoginId : false),
  );
  const groupedLabels = legacyMassUpdateLabelOptions(props.labels);
  return (
    <div className="mass-update-wrap hide-in-mobile">
      <form
        action="#"
        className="mass-update-form pull-left"
        id="mass-update-form"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="btn-group check-all">
          <label aria-label={legacyMessage(props.messages, "button.selectAll")} htmlFor="check-all">
            <input
              checked={props.totalCount > 0 && props.selectedCount === props.totalCount}
              data-selected-count={props.selectedCount}
              data-target="checked-issue"
              id="check-all"
              onChange={(event) => props.onCheckAll(event.currentTarget.checked)}
              type="checkbox"
            />
          </label>
        </div>
        <IssueMassUpdateDropdown
          disabled={disabled}
          id="state"
          label={legacyMessage(props.messages, "issue.update.state")}
          name="state"
          options={[
            {
              label: legacyMessage(props.messages, "issue.state.open"),
              onSelect: () => props.onMassUpdate({ state: "open" }),
              value: "OPEN",
            },
            {
              label: legacyMessage(props.messages, "issue.state.closed"),
              onSelect: () => props.onMassUpdate({ state: "closed" }),
              value: "CLOSED",
            },
          ]}
        />
        <IssueMassUpdateDropdown
          disabled={disabled}
          id="assignee"
          label={legacyMessage(props.messages, "issue.update.assignee.id")}
          name="assignee.id"
          options={[
            {
              label: legacyMessage(props.messages, "issue.noAssignee"),
              onSelect: () =>
                props.onMassUpdate({ assigneeLoginId: "anonymous", assigneeUpdate: true }),
              value: "anonymous",
            },
            ...(viewerAssignee
              ? [
                  {
                    label: legacyMessage(props.messages, "issue.assignToMe"),
                    onSelect: () =>
                      props.onMassUpdate({
                        assigneeLoginId: viewerAssignee.loginId,
                        assigneeUpdate: true,
                      }),
                    value: String(viewerAssignee.userId),
                  },
                ]
              : []),
            { kind: "divider" },
            ...(props.assignees ?? []).map((assignee) => ({
              assignee,
              label: assignee.userLabel || assignee.loginId,
              onSelect: () =>
                props.onMassUpdate({
                  assigneeLoginId: assignee.loginId,
                  assigneeUpdate: true,
                }),
              value: String(assignee.userId || assignee.loginId),
            })),
          ]}
        />
        {props.milestones.length > 0 ? (
          <IssueMassUpdateDropdown
            disabled={disabled}
            id="milestone"
            label={legacyMessage(props.messages, "issue.update.milestone.id")}
            name="milestone.id"
            options={[
              {
                label: legacyMessage(props.messages, "issue.noMilestone"),
                onSelect: () => props.onMassUpdate({ milestoneId: 0, milestoneUpdate: true }),
                value: "0",
              },
              ...props.milestones.map((milestone) => ({
                label: milestone.title,
                onSelect: () =>
                  props.onMassUpdate({ milestoneId: milestone.id, milestoneUpdate: true }),
                value: String(milestone.id),
              })),
            ]}
          />
        ) : null}
        {props.labels.length > 0 ? (
          <>
            <IssueMassUpdateDropdown
              disabled={disabled}
              id="attaching-label"
              label={legacyMessage(props.messages, "issue.update.attachLabel")}
              name="attachingLabelIds"
              options={groupedLabels.map((option) =>
                option.kind === "label"
                  ? {
                      ...option,
                      onSelect: () => props.onMassUpdate({ addLabelIds: [option.label.id] }),
                    }
                  : option,
              )}
            />
            <IssueMassUpdateDropdown
              disabled={disabled}
              id="detaching-label"
              label={legacyMessage(props.messages, "issue.update.detachLabel")}
              name="detachingLabelIds"
              options={groupedLabels.map((option) =>
                option.kind === "label"
                  ? {
                      ...option,
                      onSelect: () => props.onMassUpdate({ removeLabelIds: [option.label.id] }),
                    }
                  : option,
              )}
            />
          </>
        ) : null}
      </form>
    </div>
  );
}

type IssueMassUpdateDropdownOption =
  | {
      assignee?: NonNullable<ProjectDetailViewModel["dashboard"]>["assignees"][number];
      label: string;
      onSelect: () => Promise<void>;
      value: string;
    }
  | { categoryId: string; categoryName: string; kind: "category" }
  | { categoryId?: string; kind: "divider" }
  | {
      categoryId: string;
      kind: "label";
      label: IssueListFilterLabel;
      onSelect: () => Promise<void>;
      value: string;
    };

function legacyMassUpdateLabelOptions(
  labels: IssueListFilterLabel[],
): IssueMassUpdateDropdownOption[] {
  const labelsByCategory = new Map<string, IssueListFilterLabel[]>();
  for (const label of labels) {
    const categoryId = String(label.categoryId ?? (label.categoryName || ""));
    const current = labelsByCategory.get(categoryId) ?? [];
    current.push(label);
    labelsByCategory.set(categoryId, current);
  }

  return Array.from(labelsByCategory.entries()).flatMap(([categoryId, categoryLabels]) => {
    const categoryName = categoryLabels[0]?.categoryName ?? "";
    return [
      { categoryId, categoryName, kind: "category" as const },
      ...categoryLabels.map((label) => ({
        categoryId,
        kind: "label" as const,
        label,
        onSelect: async () => undefined,
        value: String(label.id),
      })),
      { categoryId, kind: "divider" as const },
    ];
  });
}

function IssueMassUpdateDropdown(props: {
  disabled: boolean;
  id: string;
  label: string;
  name: string;
  options: IssueMassUpdateDropdownOption[];
}) {
  return (
    <div className="btn-group" data-name={props.name} id={props.id}>
      <button
        className="btn dropdown-toggle medium"
        data-toggle="dropdown"
        disabled={props.disabled}
        type="button"
      >
        <span className="d-label">{props.label}</span>
        <span className="d-caret">
          <span className="caret"></span>
        </span>
      </button>
      <ul
        className="dropdown-menu mass-update-list"
        id={
          props.id === "attaching-label"
            ? "attach-label-list"
            : props.id === "detaching-label"
              ? "delete-label-list"
              : undefined
        }
      >
        {props.options.map((option) => {
          if (option.kind === "category") {
            return (
              <li
                className="disabled"
                data-category={option.categoryId}
                key={`category-${option.categoryId}-${option.categoryName}`}
              >
                <span>{option.categoryName}</span>
              </li>
            );
          }
          if (option.kind === "divider") {
            return (
              <li
                className="divider"
                data-category={option.categoryId}
                key={`divider-${option.categoryId ?? "none"}`}
              ></li>
            );
          }
          if (option.kind === "label") {
            return (
              <li
                data-category={option.categoryId}
                data-value={option.value}
                key={`label-${option.categoryId}-${option.value}`}
              >
                <button
                  className="btn-transparent"
                  disabled={props.disabled}
                  onClick={() => void option.onSelect()}
                  type="button"
                >
                  <span
                    className={legacyIssueLabelClassName(
                      "issue-label active list-label",
                      option.label.color,
                    )}
                    data-label-id={option.label.id}
                    style={{ backgroundColor: option.label.color || "#ddd" }}
                  >
                    {option.label.name}
                  </span>
                </button>
              </li>
            );
          }
          return (
            <li data-value={option.value} key={`option-${option.value}-${option.label}`}>
              <button
                className="btn-transparent"
                disabled={props.disabled}
                onClick={() => void option.onSelect()}
                type="button"
              >
                {option.assignee ? (
                  <span className="usf-group">
                    <span className="avatar-wrap smaller">
                      {option.assignee.avatarUrl ? (
                        <img
                          alt={option.assignee.userLabel || option.assignee.loginId}
                          height={20}
                          src={option.assignee.avatarUrl}
                          width={20}
                        />
                      ) : null}
                    </span>
                    <strong className="name">
                      {option.assignee.userLabel || option.assignee.loginId}
                    </strong>
                    <span className="loginid">
                      {" "}
                      <strong>@</strong>
                      {option.assignee.loginId}
                    </span>
                  </span>
                ) : (
                  option.label
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function IssueListPagination(props: {
  currentPage: number;
  hrefForPage: (pageNum: number) => string;
  messages?: LegacyMessageLookup;
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
              <span>{legacyMessage(props.messages, "button.prevPage")}</span>
            </a>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">{legacyMessage(props.messages, "button.prevPage")}</span>
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
              <span>{legacyMessage(props.messages, "button.nextPage")}</span>
            </a>
          ) : (
            <>
              <i className="ico btn-pg-next off"></i>
              <span className="off">{legacyMessage(props.messages, "button.nextPage")}</span>
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
  if (query.authorId !== undefined) {
    params.set("authorId", String(query.authorId));
  }
  if (query.commenterId !== undefined) {
    params.set("commenterId", String(query.commenterId));
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
  if (query.dueDate) {
    params.set("dueDate", query.dueDate);
  }
  if (query.filter) {
    params.set("filter", query.filter);
  }
  if (query.orderBy) {
    params.set("orderBy", query.orderBy);
  }
  if (query.orderDir) {
    params.set("orderDir", query.orderDir);
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
  if (query.authorId !== undefined) {
    params.set("authorId", String(query.authorId));
  }
  if (query.commenterId !== undefined) {
    params.set("commenterId", String(query.commenterId));
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
  if (query.dueDate) {
    params.set("dueDate", query.dueDate);
  }
  if (query.filter) {
    params.set("filter", query.filter);
  }
  if (query.orderBy) {
    params.set("orderBy", query.orderBy);
  }
  if (query.orderDir) {
    params.set("orderDir", query.orderDir);
  }
  for (const labelId of query.labelIds) {
    params.append("labelIds", String(labelId));
  }
  params.set("format", "xls");
  return `${buildProjectHref(runtimeConfig, ownerName, projectName, "issues")}?${params.toString()}`;
}

function IssueCompactCommentIndex(props: {
  commentsByParent: Map<number, ProjectIssueDetailViewModel["comments"]>;
  issue: ProjectIssueDetailViewModel;
  messages: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
}) {
  const rootComments = props.issue.comments.filter((comment) => !comment.parentCommentId);

  return (
    <div className="board-comment-wrap" id="comments">
      <div id="timeline">
        <div className="timeline-list">
          <div className="comment-header">
            <strong>{legacyMessage(props.messages, "common.comment")}</strong>{" "}
            <strong className="num">{props.issue.comments.length}</strong>
          </div>
          {rootComments.length > 0 ? (
            <ul className="comments">
              {rootComments.map((comment) => {
                const childCount = props.commentsByParent.get(comment.id)?.length ?? 0;
                return (
                  <li
                    className="comment index-comment"
                    data-location={`#comment-${comment.id}`}
                    id={`comment-${comment.id}`}
                    key={comment.id}
                  >
                    <div>
                      <div id={`comment-body-${comment.id}`}>
                        <div className="comment-body">
                          <a href={`#comment-${comment.id}`}>
                            {compactLegacyMarkdownText(comment.contentsMarkdown)}
                          </a>
                        </div>
                      </div>
                      <div className="index-comment-author">
                        {childCount > 0 ? (
                          <span className="comment-exists">
                            <i className="yobicon-comment2"></i>
                            {childCount > 1 ? childCount : null}
                          </span>
                        ) : null}
                        <span className="comment_author">
                          <a
                            data-placement="top"
                            data-toggle="tooltip"
                            href={prefixBasePath(
                              props.runtimeConfig.basePath,
                              `/${comment.authorLoginId}`,
                            )}
                            title={comment.authorLoginId}
                          >
                            <strong>{comment.authorLabel}</strong>
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
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProjectIssueDetailPage(props: {
  detail: ProjectDetailViewModel | null;
  getIssueReferencesQueryOptions?: IssueReferenceQueryOptionsFactory;
  issue: ProjectIssueDetailViewModel | null;
  milestoneOptions?: ProjectMilestoneViewModel[];
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
  onIssueContentUpdate?: (input: MarkdownTasklistToggleInput) => Promise<void>;
  onShareIssue?: (loginId: string, targetType?: IssueAssignableUserItem["type"]) => Promise<void>;
  onIssueWeightChange?: (delta: 1 | -1) => Promise<void>;
  onMetadataUpdate?: (input: Omit<ProjectIssueMassUpdateInput, "issueNumbers">) => Promise<void>;
  onStateChange?: (state: string) => Promise<void>;
  onUnshareIssue?: (loginId: string) => Promise<void>;
  onVoteToggle?: () => Promise<void>;
  onWatchToggle?: () => Promise<void>;
  csrfToken?: string;
  messages?: LegacyI18nContextValue["t"];
  runtimeConfig: RuntimeConfig;
  viewerLabel?: string;
  viewerLoginId?: string;
}) {
  const { t: defaultMessages } = useLegacyMessages();
  const messages = props.messages ?? defaultMessages;
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
  const [sharePickerOpen, setSharePickerOpen] = React.useState(false);
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
  const issueAuthorLabel =
    issue?.authorLabel || issueAuthorLoginId || legacyMessage(messages, "issue.noAuthor");
  const issueAuthorHref = issueAuthorLoginId
    ? prefixBasePath(props.runtimeConfig.basePath, `/${issueAuthorLoginId}`)
    : "#";
  const issueAssigneeLoginId = issue?.assigneeLoginId ?? "";
  const issueAssigneeLabel =
    issue?.assigneeLabel || issueAssigneeLoginId || legacyMessage(messages, "issue.noAssignee");
  const issueAssigneeHref = issueAssigneeLoginId
    ? prefixBasePath(props.runtimeConfig.basePath, `/${issueAssigneeLoginId}`)
    : "#";
  const issueState = issue?.state ?? "";
  const issueStateClass = issueState.toLowerCase();
  const issueTitle = issue?.title ?? "Issue";
  const issueNumberLabel = issue ? `#${issue.issueNumber}` : "";
  const issueNumber = issue?.issueNumber ?? 0;
  const voteWrapClass = issue && issue.voterCount > 0 ? "vote-wrap voter-exists" : "vote-wrap";
  const issueVoteHref = issue
    ? buildProjectHref(
        props.runtimeConfig,
        issue.ownerName,
        issue.projectName,
        `issue/${issue.issueNumber}/${issue.hasVoted ? "unvote" : "vote"}`,
      )
    : "#";
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
  const issueLabels = detail.dashboard?.labels ?? [];
  const issueMilestones = props.milestoneOptions ?? [];

  return (
    <main className="app-shell issue-detail-page">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu
        activeMenu="issue"
        detail={detail}
        keymapMode="detail"
        runtimeConfig={props.runtimeConfig}
      />
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
                    <span className="draft-number">
                      #{legacyMessage(messages, "issue.state.draft")}
                    </span>
                  ) : (
                    issueNumberLabel
                  )}
                </strong>
              ) : null}
              <h1>
                {issueTitle}
                {issue && props.onFavoriteToggle ? (
                  <button
                    aria-label={legacyMessage(messages, "title.favorite")}
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
              {issue?.isDraft ? (
                <div className="draft">{legacyMessage(messages, "issue.draft.description")}</div>
              ) : null}
            </div>
            {issue ? (
              <PostingHistoryModal
                basePath={props.runtimeConfig?.basePath}
                historyMarkdown={issue.historyMarkdown}
                issueReferences={issue.issueReferences}
                linkLabel="change.edited"
                messages={messages}
                mentionReferences={issue.mentionReferences}
                ownerName={issue.ownerName}
                projectName={issue.projectName}
                viewerLabel={props.viewerLabel}
                viewerLoginId={props.viewerLoginId}
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
              {issue ? (
                <div className="hide" id={`issue-${issue.issueNumber}`}>
                  <form
                    action={prefixBasePath(
                      props.runtimeConfig.basePath,
                      `/-_-api/v1/owners/${detail.ownerName}/projects/${detail.projectName}/issues/${issue.issueNumber}/content`,
                    )}
                    onSubmit={(event) => event.preventDefault()}
                  >
                    <textarea defaultValue={issue.bodyMarkdown} />
                  </form>
                </div>
              ) : null}
              <div id={issue ? `issue-body-${issue.issueNumber}` : undefined}>
                <MarkdownRenderer
                  className="content markdown-wrap"
                  basePath={props.runtimeConfig.basePath}
                  currentUserLabel={props.viewerLabel}
                  currentUserLoginId={props.viewerLoginId}
                  data-allowed-update={issue ? String(issue.viewerCanUpdate) : undefined}
                  issueReferences={issue?.issueReferences}
                  markdown={translatedIssueMarkdown ?? issue?.bodyMarkdown ?? ""}
                  mentionReferences={issue?.mentionReferences}
                  ownerName={detail.ownerName}
                  projectName={detail.projectName}
                  onTasklistToggle={props.onIssueContentUpdate}
                  showTasklistBar
                  tasklistSourceMarkdown={issue?.bodyMarkdown ?? ""}
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
                        title={legacyMessage(messages, "issue.watch.description")}
                        type="button"
                      >
                        {legacyMessage(
                          messages,
                          issue.isWatching ? "issue.unwatch" : "issue.watch",
                        )}
                      </button>
                    ) : null}
                    {issue?.viewerCanUpdate ? (
                      <button
                        className="ybtn"
                        data-content={legacyMessage(messages, "issue.sharer.description")}
                        data-placement="top"
                        data-toggle="popover"
                        data-trigger="hover"
                        id="issue-share-button"
                        onClick={() => setSharePickerOpen(true)}
                        type="button"
                      >
                        {legacyMessage(messages, "button.share.issue")}
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
                          {legacyMessage(messages, "button.newSubtask")}
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
                          title={`${legacyMessage(messages, "issue.weight")}: Upvote`}
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
                          title={`${legacyMessage(messages, "issue.weight")}: Down vote`}
                          type="button"
                        >
                          <i className="yobicon-arrow-down-alt"></i>
                        </button>
                        <span
                          className="weight-number"
                          data-content={legacyMessage(messages, "issue.weight.description")}
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
                      <a
                        className={`ybtn${issue.hasVoted ? " ybtn-watching" : ""}`}
                        data-request-method="post"
                        data-toggle="tooltip"
                        href={issueVoteHref}
                        onClick={(event) => {
                          event.preventDefault();
                          void props.onVoteToggle?.();
                        }}
                        title={legacyMessage(
                          messages,
                          issue.hasVoted ? "issue.unvote.description" : "issue.vote.description",
                        )}
                      >
                        <span className="heart">
                          <i className="yobicon-hearts"></i>
                        </span>
                      </a>
                    ) : null}
                    <IssueDetailVoters
                      issue={issue}
                      messages={messages}
                      runtimeConfig={props.runtimeConfig}
                    />
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
                      title={legacyMessage(messages, "button.translation")}
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
                      title={legacyMessage(messages, "button.edit")}
                    >
                      <i className="yobicon-edit-2"></i>
                    </a>
                  ) : issue ? (
                    <a
                      href={buildProjectHref(
                        props.runtimeConfig,
                        detail.ownerName,
                        detail.projectName,
                        `issue/${issue.issueNumber}/editform`,
                      )}
                    >
                      <button
                        className="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"
                        data-toggle="tooltip"
                        title={legacyMessage(messages, "button.show.original")}
                        type="button"
                      >
                        <i className="yobicon-edit-2"></i>
                      </button>
                    </a>
                  ) : null}
                  {issue?.viewerCanUpdate && onStateChange ? (
                    <button
                      className="ybtn"
                      onClick={() => void onStateChange(issue.state === "open" ? "closed" : "open")}
                      type="button"
                    >
                      {legacyMessage(
                        messages,
                        issue.state === "open"
                          ? "button.nextState.closed"
                          : "button.nextState.open",
                      )}
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
                        title={legacyMessage(messages, "button.delete")}
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
                      <strong>{legacyMessage(messages, "common.comment")}</strong>{" "}
                      <strong className="num">{issue?.commentCount ?? 0}</strong>
                    </div>
                    <hr className="nm" />
                    <ul className="comments">
                      {(issue?.timeline ?? []).map((item, index, timelineItems) => {
                        if (item.kind !== "comment" || !item.comment) {
                          const previousItem = timelineItems[index - 1];
                          return (
                            <IssueTimelineEvent
                              basePath={props.runtimeConfig.basePath}
                              item={item}
                              key={`${item.kind}-${item.id}`}
                              messages={messages}
                              previousItem={
                                previousItem?.kind === "event" ? previousItem : undefined
                              }
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
                        const commentClassName = legacyCommentMentionsCurrentUser(
                          comment.contentsMarkdown,
                          props.viewerLabel,
                          props.viewerLoginId,
                          comment.mentionReferences,
                        )
                          ? "comment mentioned"
                          : "comment";

                        return (
                          <li
                            className={commentClassName}
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
                                    <a href={newIssueByCommentHref}>
                                      {legacyMessage(messages, "issue.menu.new.by")}
                                    </a>
                                  </span>
                                  <span className="comment-vote-row">
                                    <IssueCommentVoters
                                      basePath={props.runtimeConfig.basePath}
                                      comment={comment}
                                      messages={messages}
                                    />
                                    {issue?.viewerCanComment && props.onCommentVoteToggle ? (
                                      <button
                                        aria-label={
                                          comment.viewerHasVoted
                                            ? legacyMessage(messages, "common.comment.unvote")
                                            : legacyMessage(messages, "common.comment.vote")
                                        }
                                        className="comment-vote btn-transparent-with-fontsize-lineheight"
                                        data-request-type="comment-vote"
                                        data-request-uri={commentVoteUri}
                                        onClick={(event) => {
                                          event.preventDefault();
                                          void props.onCommentVoteToggle?.(
                                            comment.id,
                                            comment.viewerHasVoted,
                                          );
                                        }}
                                        title={
                                          comment.viewerHasVoted
                                            ? legacyMessage(messages, "common.comment.unvote")
                                            : legacyMessage(messages, "common.comment.vote")
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
                                    title={legacyMessage(messages, "button.translation")}
                                    type="button"
                                  >
                                    <i className="yobicon-lang"></i>
                                  </button>
                                  {comment.viewerCanUpdate ? (
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
                                      title={legacyMessage(messages, "common.comment.edit")}
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
                                      onClick={(event) => {
                                        event.preventDefault();
                                        setCommentDeleteTargetId(comment.id);
                                      }}
                                      title={legacyMessage(messages, "common.comment.delete")}
                                      type="button"
                                    >
                                      <i className="yobicon-trash"></i>
                                    </button>
                                  ) : null}
                                </span>
                              </div>
                              {comment.viewerCanUpdate ? (
                                <div hidden={!commentIsEditing}>
                                  <IssueCommentEditForm
                                    action={commentEditAction}
                                    commentId={comment.id}
                                    csrfToken={props.csrfToken}
                                    getIssueReferencesQueryOptions={
                                      props.getIssueReferencesQueryOptions
                                    }
                                    initialContents={comment.contentsMarkdown}
                                    messages={messages}
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
                                    showNotificationMail={
                                      Boolean(comment.authorId) &&
                                      comment.authorId === props.issue.viewerUserId
                                    }
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
                                  currentUserLabel={props.viewerLabel}
                                  currentUserLoginId={props.viewerLoginId}
                                  data-allowed-update={String(comment.viewerCanUpdate)}
                                  data-via-email={comment.viaEmail ? "true" : undefined}
                                  issueReferences={comment.issueReferences}
                                  markdown={
                                    translatedCommentMarkdownById[comment.id] ??
                                    comment.contentsMarkdown
                                  }
                                  mentionReferences={comment.mentionReferences}
                                  onTasklistToggle={
                                    comment.viewerCanUpdate && props.onCommentUpdate
                                      ? async (input) =>
                                          props.onCommentUpdate?.(comment.id, input.nextMarkdown)
                                      : undefined
                                  }
                                  ownerName={detail.ownerName}
                                  projectName={detail.projectName}
                                  showTasklistBar
                                  tasklistSourceMarkdown={comment.contentsMarkdown}
                                />
                              </div>
                            </div>
                            <div className="add-a-comment pull-right">
                              {legacyMessage(messages, "comment.oneline.comment.placeholder")}
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
                                            containerElement="fragment"
                                            currentUserLabel={props.viewerLabel}
                                            currentUserLoginId={props.viewerLoginId}
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
                                                onClick={(event) => {
                                                  event.preventDefault();
                                                  setCommentDeleteTargetId(childComment.id);
                                                }}
                                                title={legacyMessage(
                                                  messages,
                                                  "common.comment.delete",
                                                )}
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
                              {issue?.viewerCanComment ? (
                                <div className="child-comment-input-form">
                                  <form
                                    action={buildProjectHref(
                                      props.runtimeConfig,
                                      detail.ownerName,
                                      detail.projectName,
                                      `issue/${issueNumber}/comments`,
                                    )}
                                    encType="multipart/form-data"
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
                                        ?.then(() =>
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
                                        placeholder={`${legacyMessage(
                                          messages,
                                          "comment.oneline.comment.placeholder",
                                        )} (CTRL + ENTER)`}
                                        rows={1}
                                        value={childCommentDrafts[comment.id] ?? ""}
                                        {...({
                                          markdown: "true",
                                        } as unknown as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
                                      />
                                      <button
                                        aria-label={legacyMessage(messages, "button.comment.new")}
                                        className="ybtn ybtn-success"
                                        data-legacy-label="OK"
                                        type="submit"
                                      >
                                        <span aria-hidden="true">OK</span>
                                        <span className="sr-only">
                                          {legacyMessage(messages, "button.comment.new")}
                                        </span>
                                      </button>
                                    </div>
                                    <div className="notification-receiver">
                                      <span className="notification-receiver-title">
                                        {legacyMessage(
                                          messages,
                                          "notification.receiver.list.title",
                                        )}
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
                {issue?.viewerCanComment ? (
                  <IssueCommentForm
                    action={buildProjectHref(
                      props.runtimeConfig,
                      detail.ownerName,
                      detail.projectName,
                      `issue/${issue.issueNumber}/comments`,
                    )}
                    csrfToken={props.csrfToken}
                    getIssueReferencesQueryOptions={props.getIssueReferencesQueryOptions}
                    messages={messages}
                    onSearchMentionUsers={props.onSearchMentionUsers}
                    onSubmit={props.onCommentSubmit}
                    runtimeConfig={props.runtimeConfig}
                  />
                ) : issue ? (
                  <DisabledIssueCommentBox messages={messages} />
                ) : null}
              </section>
            </div>
            <aside className="span3 right-menu">
              <div className="issue-info">
                <form
                  action={buildProjectHref(
                    props.runtimeConfig,
                    detail.ownerName,
                    detail.projectName,
                    "issues",
                  )}
                  id="issueUpdateForm"
                  onSubmit={(event) => event.preventDefault()}
                >
                  {issue ? (
                    <input
                      name="issues[0].id"
                      type="hidden"
                      value={issue.issueId || issue.issueNumber}
                    />
                  ) : null}
                  <dl>
                    <dt>{legacyMessage(messages, "issue.assignee")}</dt>
                    <dd>
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
                      {issue?.viewerCanUpdate && props.onAssign ? (
                        <IssueAssignForm
                          initialAssignee={issue.assigneeLoginId}
                          messages={messages}
                          onSearchAssignableUsers={props.onSearchAssignableUsers}
                          onSubmit={props.onAssign}
                        />
                      ) : null}
                    </dd>
                  </dl>
                  <dl>
                    <dt>{legacyMessage(messages, "milestone")}</dt>
                    <dd>
                      {issue?.viewerCanUpdate && props.onMetadataUpdate ? (
                        <select
                          data-container-css-class="fullsize"
                          data-format="milestone"
                          data-toggle="select2"
                          id="milestone"
                          name="milestone.id"
                          onChange={(event) =>
                            void props.onMetadataUpdate?.({
                              milestoneId: Number(event.currentTarget.value),
                              milestoneUpdate: true,
                            })
                          }
                          value={issue.milestoneId ?? 0}
                        >
                          <option value={0}>{legacyMessage(messages, "issue.noMilestone")}</option>
                          <IssueMilestoneOptionGroups
                            messages={messages}
                            milestones={issueMilestones}
                          />
                        </select>
                      ) : issue?.milestoneTitle ? (
                        <a
                          href={buildProjectHref(
                            props.runtimeConfig,
                            detail.ownerName,
                            detail.projectName,
                            `milestone/${issue.milestoneId}`,
                          )}
                        >
                          {issue.milestoneTitle}
                        </a>
                      ) : (
                        legacyMessage(messages, "issue.noMilestone")
                      )}
                    </dd>
                  </dl>
                  <dl>
                    <dt>{legacyMessage(messages, "issue.dueDate")}</dt>
                    <dd>
                      {issue?.viewerCanUpdate && props.onMetadataUpdate ? (
                        <div className="search search-bar">
                          <input
                            autoComplete="off"
                            className="textbox full"
                            data-toggle="calendar"
                            name="dueDate"
                            onBlur={(event) =>
                              void props.onMetadataUpdate?.({
                                dueDate: event.currentTarget.value,
                                isDueDateChanged: true,
                              })
                            }
                            type="text"
                            defaultValue={issue.dueDateLabel ?? ""}
                          />
                          <button className="search-btn btn-calendar" type="button">
                            <i className="yobicon-calendar2"></i>
                          </button>
                        </div>
                      ) : (
                        issue?.dueDateLabel || legacyMessage(messages, "issue.noDuedate")
                      )}
                    </dd>
                  </dl>
                  {issueLabels.length > 0 && issue?.viewerCanUpdate && props.onMetadataUpdate ? (
                    <dl>
                      <dt>
                        {legacyMessage(messages, "label")}{" "}
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
                          [{legacyMessage(messages, "button.edit")}]
                        </a>
                      </dt>
                      <dd>
                        <select
                          className="hide"
                          data-allow-clear="true"
                          data-container-css-class="issue-labels bordered fullsize"
                          data-dropdown-css-class="issue-labels"
                          data-format="issuelabel"
                          data-placeholder={legacyMessage(messages, "label.select")}
                          data-search="labelIds"
                          data-toggle="select2"
                          id="labelIds"
                          multiple
                          name="labelIds"
                          onChange={(event) => {
                            const selected = Array.from(event.currentTarget.selectedOptions).map(
                              (option) => Number(option.value),
                            );
                            const current = (issue.labels ?? []).map((label) => label.id);
                            void props.onMetadataUpdate?.({
                              addLabelIds: selected.filter((labelId) => !current.includes(labelId)),
                              removeLabelIds: current.filter(
                                (labelId) => !selected.includes(labelId),
                              ),
                            });
                          }}
                          value={(issue.labels ?? []).map((label) => String(label.id))}
                        >
                          <option></option>
                          {issueLabels.map((label) => (
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
                      </dd>
                    </dl>
                  ) : (
                    <IssueDetailSelectedLabels
                      issue={issue}
                      messages={messages}
                      runtimeConfig={props.runtimeConfig}
                    />
                  )}
                </form>
                {issue ? (
                  <IssueCompactCommentIndex
                    commentsByParent={childCommentsByParent}
                    issue={issue}
                    messages={messages}
                    runtimeConfig={props.runtimeConfig}
                  />
                ) : null}
              </div>
              <div className="watcher-list"></div>
              {issue ? (
                <IssueSubtaskList
                  issue={issue}
                  messages={messages}
                  runtimeConfig={props.runtimeConfig}
                />
              ) : null}
              {issue ? (
                <IssueSharerPanel
                  issue={issue}
                  messages={messages}
                  onSearchSharableUsers={props.onSearchSharableUsers}
                  onShareIssue={issue.viewerCanManageSharers ? props.onShareIssue : undefined}
                  onUnshareIssue={issue.viewerCanManageSharers ? props.onUnshareIssue : undefined}
                  runtimeConfig={props.runtimeConfig}
                  sharePickerOpen={sharePickerOpen}
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
                  aria-label={legacyMessage(messages, "button.close")}
                  className="close"
                  onClick={() => setDeleteConfirmOpen(false)}
                  type="button"
                >
                  ×
                </button>
                <h3>{legacyMessage(messages, "issue.delete")}</h3>
              </div>
              <div className="modal-body">
                <p>{legacyMessage(messages, "post.delete.confirm")}</p>
              </div>
              <div className="modal-footer">
                <button
                  className="ybtn ybtn-danger"
                  data-request-method="delete"
                  onClick={(event) => {
                    event.preventDefault();
                    void onDeleteIssue();
                  }}
                  type="button"
                >
                  {legacyMessage(messages, "button.yes")}
                </button>
                <button className="ybtn" onClick={() => setDeleteConfirmOpen(false)} type="button">
                  {legacyMessage(messages, "button.no")}
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
                  aria-label={legacyMessage(messages, "button.close")}
                  className="close"
                  data-dismiss="modal"
                  onClick={() => setCommentDeleteTargetId(null)}
                  type="button"
                >
                  ×
                </button>
                <h3>{legacyMessage(messages, "common.comment.delete")}</h3>
              </div>
              <div className="modal-body">
                <p>{legacyMessage(messages, "common.comment.delete.confirm")}</p>
              </div>
              <div className="modal-footer">
                <button
                  className="ybtn ybtn-danger"
                  data-request-method="delete"
                  data-request-uri={commentDeleteRequestUri}
                  id="comment-delete-confirm"
                  onClick={(event) => {
                    event.preventDefault();
                    if (commentDeleteTargetId === null || !props.onCommentDelete) {
                      return;
                    }
                    const targetId = commentDeleteTargetId;
                    setCommentDeleteTargetId(null);
                    void props.onCommentDelete(targetId);
                  }}
                  type="button"
                >
                  {legacyMessage(messages, "button.yes")}
                </button>
                <button
                  className="ybtn"
                  data-dismiss="modal"
                  onClick={() => setCommentDeleteTargetId(null)}
                  type="button"
                >
                  {legacyMessage(messages, "button.no")}
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

function IssueTimelineEvent(props: {
  basePath: string;
  item: IssueTimelineEventItem;
  messages?: LegacyMessageLookup;
  previousItem?: IssueTimelineEventItem;
}) {
  const item = props.item;
  if (item.eventType === "ISSUE_BODY_CHANGED") {
    return null;
  }

  const eventState = issueEventState(item, props.previousItem);
  const messageParts = issueEventMessageParts(item, props.basePath, props.messages);

  return (
    <li className="event" id={`event-${item.id}`}>
      <span className={eventState.className}>
        {legacyMessage(props.messages, eventState.label)}
      </span>{" "}
      <span className="event-message">{messageParts}</span>
      <span className="date">
        <a href={`#event-${item.id}`}>{item.createdLabel}</a>
      </span>
    </li>
  );
}

function issueEventMessageParts(
  item: IssueTimelineEventItem,
  basePath: string,
  messages?: LegacyMessageLookup,
): React.ReactNode {
  const key = issueEventMessageKey(item);
  const sender = item.senderLoginId ? (
    <IssueEventUserLink
      basePath={basePath}
      key="sender"
      label={item.senderLabel || item.senderLoginId}
      loginId={item.senderLoginId}
    />
  ) : (
    item.senderLabel || item.senderLoginId || "Anonymous"
  );
  const target = issueEventTargetNode(item, basePath);
  return legacyMessageWithNodes(messages, key, [sender, target]);
}

function issueEventTargetNode(item: IssueTimelineEventItem, basePath: string): React.ReactNode {
  if (item.targetLoginId) {
    return (
      <IssueEventUserLink
        basePath={basePath}
        label={item.targetLabel || item.targetLoginId}
        loginId={item.targetLoginId}
      />
    );
  }
  if (item.resourceHref) {
    const label = issueEventResourceLabel(item);
    return (
      <strong>
        <a
          className="link"
          href={prefixBasePath(basePath, item.resourceHref)}
          title={item.resourceTitle ? legacyMessage(undefined, item.resourceTitle) : undefined}
        >
          {label}
        </a>
      </strong>
    );
  }
  if (item.eventType === "ISSUE_LABEL_CHANGED") {
    return <IssueEventLabelBox label={item.resourceLabel || item.newValue || item.oldValue} />;
  }
  return item.newValue || item.oldValue || "";
}

function IssueEventUserLink(props: { basePath: string; label: string; loginId: string }) {
  return (
    <a
      className="usf-group"
      data-placement="top"
      data-toggle="tooltip"
      href={prefixBasePath(props.basePath, `/${props.loginId}`)}
      title={props.loginId}
    >
      <strong>{props.label || props.loginId}</strong>
    </a>
  );
}

function IssueEventLabelBox(props: { label: string }) {
  const labels = props.label.split(",").flatMap((label) => {
    const trimmed = label.trim();
    return trimmed ? [trimmed] : [];
  });
  if (labels.length === 0) {
    return "";
  }
  return (
    <>
      {labels.map((label, index) => (
        <React.Fragment key={label}>
          {index > 0 ? ", " : null}
          <div className="label issue-label">{label}</div>
        </React.Fragment>
      ))}
    </>
  );
}

function issueEventResourceLabel(item: IssueTimelineEventItem): string {
  if (item.eventType === "ISSUE_REFERRED_FROM_COMMIT") {
    return `${legacyMessage(undefined, "code.commits")} ${item.resourceLabel || item.newValue}`;
  }
  if (item.eventType === "ISSUE_REFERRED_FROM_PULL_REQUEST") {
    return (
      item.resourceLabel?.replace(/^pullRequest/, legacyMessage(undefined, "pullRequest")) ?? ""
    );
  }
  return item.resourceLabel || item.newValue || item.oldValue || "";
}

function legacyMessageWithNodes(
  messages: LegacyMessageLookup | undefined,
  key: string,
  args: React.ReactNode[],
): React.ReactNode {
  const template = legacyMessage(messages, key);
  const parts = template.split(/(\{\d+\})/g);
  if (parts.length === 1) {
    return template;
  }
  return parts.map((part) => {
    const match = part.match(/^\{(\d+)\}$/);
    if (!match) {
      return part;
    }
    return <React.Fragment key={part}>{args[Number(match[1])] ?? ""}</React.Fragment>;
  });
}

function issueEventState(
  item: IssueTimelineEventItem,
  previousItem?: IssueTimelineEventItem,
): { className: string; label: string } {
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
      return issueAddDeleteState(
        item,
        previousItem,
        "sharer-added",
        "sharer-deleted",
        "issue.sharer",
      );
    case "ISSUE_LABEL_CHANGED":
      return issueAddDeleteState(
        item,
        previousItem,
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
  previousItem: IssueTimelineEventItem | undefined,
  addClassName: string,
  deleteClassName: string,
  label: string,
): { className: string; label: string } {
  if (issueIsSameEventTypeAndSameAction(item, previousItem)) {
    return { className: "state", label: "" };
  }
  if (issueIsAddingEvent(item)) {
    return { className: `state ${addClassName}`, label };
  }
  if (issueIsDeletingEvent(item)) {
    return { className: `state ${deleteClassName}`, label };
  }
  return { className: "state", label: "" };
}

function issueIsSameEventTypeAndSameAction(
  item: IssueTimelineEventItem,
  previousItem: IssueTimelineEventItem | undefined,
): boolean {
  return (
    !!previousItem &&
    item.eventType === previousItem.eventType &&
    ((issueIsAddingEvent(item) && issueIsAddingEvent(previousItem)) ||
      (issueIsDeletingEvent(item) && issueIsDeletingEvent(previousItem)))
  );
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
      if (!item.newValue) {
        return "issue.event.unassigned";
      }
      return item.targetLoginId && item.targetLoginId === item.senderLoginId
        ? "issue.event.assignedToMe"
        : "issue.event.assigned";
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
  filter?: string;
  orderBy?: string;
  orderDir?: string;
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
  const { t: messages } = useLegacyMessages();
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
            messages={messages}
            onSetDefaultLoginPage={props.onSetDefaultLoginPage}
          />
          <div
            className="row-fluid issue-list-wrap"
            data-pjax-container=""
            {...{ "pjax-container": "" }}
          >
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
                        {...{ "pjax-filter": "" }}
                      >
                        <span className={filter.className}>
                          <i className={filter.icon} /> {messages(filter.label)}
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
                        placeholder={legacyMessage(messages, "issue.search")}
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
                  <a data-state="open" href={stateHref("open")} {...{ state: "open" }}>
                    {legacyMessage(messages, "issue.state.open")}{" "}
                    <span className="num-badge">{issueList?.openIssueCount ?? 0}</span>
                  </a>
                </li>
                <li className={state === "closed" ? "active" : undefined} data-pjax="">
                  <a data-state="closed" href={stateHref("closed")} {...{ state: "closed" }}>
                    {legacyMessage(messages, "issue.state.closed")}{" "}
                    <span className="num-badge">{issueList?.closedIssueCount ?? 0}</span>
                  </a>
                </li>
                <li>
                  <LegacyTwoColumnModeCheckboxArea messages={messages} />
                </li>
                <li className="show-subtasks-li">
                  <LegacyShowSubtasksCheckbox messages={messages} />
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
                            {...{ orderBy, orderDir: orderDirFor(orderBy) }}
                          >
                            <i
                              className={`ico btn-gray-arrow ${
                                query.orderBy === orderBy && query.orderDir !== "desc" ? "" : "down"
                              }`}
                            />
                            {legacyMessage(messages, label)}
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
                          {...{ href: issueHref }}
                        >
                          <div className="span12 span-hard-wrap">
                            <div className="span2 project-name-in-my-issues fixed-height-my-issues-list">
                              <span className="infos-item project-name">
                                <a
                                  className="title project"
                                  data-placement="bottom"
                                  data-toggle="tooltip"
                                  href={projectHref}
                                  title={legacyMessage(messages, "project.name")}
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
                                    title={`${legacyMessage(messages, "issue.weight")} ${weight}`}
                                  >
                                    <i className="yobicon-angle-circled-up" />
                                  </span>
                                ) : null}
                                {weight < 0 ? (
                                  <span
                                    className="weight-down-arrow"
                                    data-placement="right"
                                    data-toggle="tooltip"
                                    title={`${legacyMessage(messages, "issue.weight")} ${weight}`}
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
                                    className={legacyIssueLabelClassName(
                                      "label issue-label list-label twoColumeModeTarget",
                                      label.color,
                                    )}
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
                                  messages={messages}
                                  runtimeConfig={props.runtimeConfig}
                                />
                              </span>
                            </div>
                            <div className="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list">
                              {query.filter === "authored" ? null : (
                                <UserIssueAuthorCell
                                  authorLabel={item.authorLabel}
                                  authorLoginId={item.authorLoginId}
                                  messages={messages}
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
                                      messages={messages}
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
                                      ? legacyMessage(messages, "issue.dueDate.overdue")
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
                                    title={`${legacyMessage(messages, "issue.assignee")}: ${
                                      item.assigneeLabel
                                    }`}
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
                  <p>{legacyMessage(messages, "issue.is.empty")}</p>
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
  messages,
  runtimeConfig,
}: {
  authorLabel: string;
  authorLoginId?: string;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
}) {
  if (!authorLabel) {
    return <span className="infos-item">{legacyMessage(messages, "issue.noAuthor")}</span>;
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
  messages?: LegacyMessageLookup;
  onSetDefaultLoginPage?: () => void;
}) {
  return (
    <ul className="nav nav-tabs">
      <li>
        <a href={prefixBasePath(props.basePath, "/notifications")}>
          {legacyMessage(props.messages, "notification")}
        </a>
      </li>
      <li className="active">
        <a href={prefixBasePath(props.basePath, "/user/issues")}>
          {legacyMessage(props.messages, "issue.myIssue")}
        </a>
      </li>
      <li>
        <a href={prefixBasePath(props.basePath, "/user/files")}>
          {legacyMessage(props.messages, "user.files")}
        </a>
      </li>
      <li>
        {props.canSetDefaultLoginPage ? (
          <button
            className="ybtn hide-in-mobile"
            data-content={legacyMessage(props.messages, "button.setDefaultLoginPage.desc")}
            data-placement="bottom"
            data-toggle="popover"
            data-trigger="hover"
            data-url="user/issues"
            id="setDefaultLoginPage"
            onClick={props.onSetDefaultLoginPage}
            title={legacyMessage(props.messages, "button.setDefaultLoginPage")}
            type="button"
          >
            {legacyMessage(props.messages, "button.setDefaultLoginPage")}
          </button>
        ) : null}
      </li>
    </ul>
  );
}

export function IssueSharerPanel(props: {
  issue: ProjectIssueDetailViewModel;
  messages?: LegacyMessageLookup;
  onSearchSharableUsers?: (query: string) => Promise<IssueAssignableUsersResponse>;
  onShareIssue?: (loginId: string, targetType?: IssueAssignableUserItem["type"]) => Promise<void>;
  onUnshareIssue?: (loginId: string) => Promise<void>;
  runtimeConfig: RuntimeConfig;
  sharePickerOpen?: boolean;
}) {
  const [loginId, setLoginId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const canManage = props.issue.viewerCanManageSharers;
  const hasSharers = props.issue.sharers.length > 0;
  const onShareIssue = props.onShareIssue;
  const sharerListOpen = hasSharers || props.sharePickerOpen;

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
  const sharerListClassName = [
    "sharer-list",
    sharerListOpen ? "" : "hideFromDisplayOnly",
    props.sharePickerOpen ? "sharer-list-border" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <dl className={sharerListClassName}>
      <dt className="issue-share-title mb10">
        {legacyMessage(props.messages, "issue.sharer")}{" "}
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
                  title={legacyMessage(props.messages, "issue.event.sharer.deleted.title")}
                  type="button"
                />
              ) : null}
            </div>
          ))}
        </dd>
      ) : null}
      {canManage && onShareIssue ? (
        <dd
          className={sharerListOpen ? undefined : "hideFromDisplayOnly"}
          id={hasSharers ? undefined : "sharer-list"}
        >
          <input
            className="bigdrop width100p"
            id="issueSharer"
            name="issueSharer"
            placeholder={legacyMessage(props.messages, "issue.sharer.select")}
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
              emptyMessage={legacyMessage(props.messages, "issue.sharer.select")}
              errorMessage={legacyMessage(props.messages, "issue.sharer.select")}
              name="issueSharer"
              onChange={setLoginId}
              onSearchAssignableUsers={props.onSearchSharableUsers}
              onSelect={selectSharerSuggestion}
              placeholder={legacyMessage(props.messages, "issue.sharer.select")}
              title=""
              value={loginId}
            />
            <button className="ybtn" disabled={submitting} type="submit">
              {legacyMessage(props.messages, "button.share.issue")}
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

const legacySelect2SearchingText = `Searching${".".repeat(3)}`;
const legacySelect2LoadingMoreText = `Loading more results${".".repeat(3)}`;

export function IssueAssignableUserSuggestions(props: {
  emptyMessage?: string;
  errorMessage?: string;
  messages?: LegacyMessageLookup;
  onSelect: (suggestion: IssueAssignableUserItem) => void;
  state: IssueAssigneeSearchState;
}) {
  if (props.state.status === "idle") {
    return null;
  }
  if (props.state.status === "loading") {
    return <p className="assignee-autocomplete-status">{legacySelect2SearchingText}</p>;
  }
  if (props.state.status === "error") {
    return null;
  }
  if (props.state.items.length === 0) {
    return (
      <p className="assignee-autocomplete-status">
        {props.emptyMessage ?? legacyMessage(props.messages, "title.no.results")}
      </p>
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
        <p className="assignee-autocomplete-status">{legacySelect2LoadingMoreText}</p>
      ) : null}
    </div>
  );
}

function IssueAssigneeAutocompleteField(props: {
  className?: string;
  emptyMessage?: string;
  errorMessage?: string;
  id?: string;
  messages?: LegacyMessageLookup;
  name: string;
  onChange: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
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
        onKeyDown={props.onKeyDown}
        placeholder={props.placeholder}
        style={props.style}
        title={props.title}
        value={props.value}
      />
      <IssueAssignableUserSuggestions
        emptyMessage={props.emptyMessage}
        errorMessage={props.errorMessage}
        messages={props.messages}
        onSelect={props.onSelect}
        state={searchState}
      />
    </>
  );
}

function IssueAssignForm(props: {
  initialAssignee: string;
  messages?: LegacyMessageLookup;
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
    <div>
      <IssueAssigneeAutocompleteField
        className="bigdrop"
        id="assignee"
        messages={props.messages}
        name="assigneeLoginId"
        onChange={setAssigneeLoginId}
        onKeyDown={(event) => {
          if (event.key !== "Enter") {
            return;
          }
          event.preventDefault();
          void submitIssueAssigneeText(assigneeLoginId, props.onSubmit);
        }}
        onSearchAssignableUsers={props.onSearchAssignableUsers}
        onSelect={selectSuggestion}
        placeholder={legacyMessage(props.messages, "issue.noAssignee")}
        style={{ width: "100%" }}
        title=""
        value={assigneeLoginId}
      />
    </div>
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

function filesFromList(files: FileList | null | undefined): File[] {
  return Array.from(files ?? []);
}

function filesFromItems(items: DataTransferItemList | null | undefined): File[] {
  const files: File[] = [];
  for (const item of Array.from(items ?? [])) {
    if (item.kind !== "file") {
      continue;
    }
    const file = item.getAsFile();
    if (file) {
      files.push(file);
    }
  }
  return files;
}

function filesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
  const itemFiles = filesFromItems(dataTransfer?.items);
  return itemFiles.length > 0 ? itemFiles : filesFromList(dataTransfer?.files);
}

function markdownTextForAttachment(attachment: UploadedAttachment): string {
  const name = attachment.name || "image.png";
  const link = `[${name}](${attachment.url}) `;
  return attachment.mimeType.toLowerCase().startsWith("image/") ? `!${link}` : link;
}

export const legacyIssueFormSubmitGuardDurationMs = 3000;

function LegacyIssueFileUploaderShell(props: {
  messages?: LegacyMessageLookup;
  resourceId?: string | number | null;
  resourceType: string;
}) {
  return (
    <>
      <div
        className="upload-wrap content-footer"
        data-resource-id={props.resourceId ?? undefined}
        data-resource-type={props.resourceType}
        id="upload"
      >
        <div className="attach-wrap">
          <span className="help help-droppable">
            {legacyMessage(props.messages, "common.attach.drophere")}
          </span>
          <div className="btn-wrap">
            <div className="nbtn medium white fake-file-wrap">
              <i className="yobicon-upload"></i> {legacyMessage(props.messages, "button.upload")}
              <input className="file" multiple name="filePath" type="file" />
            </div>
          </div>
          <span className="plain">
            {legacyMessage(props.messages, "common.attach.clickbutton")}
          </span>
          <span className="help help-pastable">
            {legacyMessage(props.messages, "common.attach.pastehere")}
          </span>
        </div>
        <ul className="attached-files unstyled"></ul>
        <p className="right-txt help">
          <i className="yobicon-supportrequest"></i>{" "}
          {legacyMessage(props.messages, "common.attach.attachIfYouSave")}
        </p>
      </div>
      <script id="tplAttachedFile" type="text/x-jquery-tmpl">
        {'<li class="attached-file" data-id="${fileId}" data-name="${fileName}" data-href="${fileHref}" data-mime="${mimeType}" data-size="${fileSize}"><i class="yobicon-supportrequest"></i><i class="mimetype"></i><strong class="name">${fileName}</strong><span class="size">${fileSizeReadable}</span><div class="pull-right"><div class="progress upload-progress"><div class="bar orange"></div></div></div><button type="button" class="btn-transparent btn-delete pull-right">&times;</button><span class="pull-right nbtn small white btn-insert">' +
          legacyMessage(props.messages, "common.attach.clickToPost") +
          "</span></li>"}
      </script>
      <script id="tplDropFilesHere" type="text/x-jquery-tmpl">
        {'<div class="upload-drop-here"><div class="msg-wrap"><div class="msg">' +
          legacyMessage(props.messages, "common.attach.dropFilesHere") +
          "</div></div></div>"}
      </script>
    </>
  );
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
    return null;
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
    return null;
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

  const handleMarkdownFiles = async (textarea: HTMLTextAreaElement, files: File[]) => {
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
            filesFromDataTransfer(event.dataTransfer).length > 0
          ) {
            event.preventDefault();
          }
        }}
        onDrop={(event) => {
          const files = filesFromDataTransfer(event.dataTransfer);
          if (files.length === 0) {
            return;
          }
          event.preventDefault();
          void handleMarkdownFiles(event.currentTarget, files);
        }}
        onKeyUp={(event) => updateCursorIndex(event.currentTarget)}
        onPaste={(event) => {
          const files = filesFromDataTransfer(event.clipboardData);
          if (files.length === 0) {
            return;
          }
          event.preventDefault();
          void handleMarkdownFiles(event.currentTarget, files);
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
  messages?: LegacyMessageLookup;
  onSearchMentionUsers?: (
    query: string,
    context: IssueMentionUserSearchContext,
  ) => Promise<IssueMentionUsersResponse>;
  onSubmit?: (contentsMarkdown: string, attachmentIds?: number[]) => Promise<void>;
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
      onSubmit={(event) => {
        event.preventDefault();
        const nextContents = contentsMarkdown.trim();
        if (!nextContents) {
          return;
        }
        const submitComment = props.onSubmit;
        if (!submitComment) {
          return;
        }
        setSubmitting(true);
        void submitComment(nextContents, attachmentIds).finally(() => {
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
                {legacyMessage(props.messages, "common.editor.edit")}
              </a>
            </li>
            <li>
              <a href="#preview-comment-body" data-toggle="tab" data-mode="preview">
                {legacyMessage(props.messages, "common.editor.preview")}
              </a>
            </li>
            <li>
              <div className="task-list-button">
                <button
                  className="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"
                  onClick={(event) => addLegacyTasklistTemplateFromButton(event.currentTarget)}
                  type="button"
                >
                  <i className="yobicon-list task-list-icon"></i>{" "}
                  {legacyMessage(props.messages, "button.add.checklist")}
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
                    {legacyMessage(props.messages, "button.clear.temporary")}
                  </button>
                </div>
              </div>
            </li>
            <li>
              <div className="editor-notice-label"></div>
            </li>
          </ul>
          <div className="tab-content" style={{ overflow: "visible", position: "relative" }}>
            <LegacyMarkdownHelp messages={props.messages} />
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
              <MarkdownRenderer
                basePath={props.runtimeConfig.basePath}
                className="markdown-preview markdown-wrap comment-body"
                issueReferences={[]}
                markdown={contentsMarkdown}
                ownerName=""
                projectName=""
              />
            </div>
            <div className="notification-receiver">
              <span className="notification-receiver-title">
                {legacyMessage(props.messages, "notification.receiver.list.title")}
              </span>
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
        <LegacyIssueFileUploaderShell messages={props.messages} resourceType="ISSUE_COMMENT" />
        <div className="write-comment-wrap">
          <div className="right-txt">
            <button className="ybtn hidden" id="dynamic-comment-btn" type="button"></button>
            <button className="ybtn ybtn-success" disabled={submitting} type="submit">
              {legacyMessage(props.messages, "button.comment.new")}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function DisabledIssueCommentBox(props: { messages?: LegacyMessageLookup }) {
  return (
    <div
      className="write-comment-box mt20"
      title={legacyMessage(props.messages, "error.auth.unauthorized.comment")}
      data-login="required"
    >
      <div className="write-comment-wrap">
        <div className="textarea-box">
          <textarea className="comment disabled" disabled style={{ cursor: "text" }}></textarea>
        </div>
        <div className="right-txt mt10">
          <span className="ybtn ybtn-disabled">
            {legacyMessage(props.messages, "button.comment.new")}
          </span>
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
  messages?: LegacyMessageLookup;
  onCancel: () => void;
  onSearchMentionUsers?: (
    query: string,
    context: IssueMentionUserSearchContext,
  ) => Promise<IssueMentionUsersResponse>;
  onSubmit?: (
    commentId: number,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void>;
  runtimeConfig: RuntimeConfig;
  showNotificationMail?: boolean;
}) {
  const [contentsMarkdown, setContentsMarkdown] = React.useState(props.initialContents);
  const [attachmentIds, setAttachmentIds] = React.useState<number[]>([]);
  return (
    <div className="comment-update-form" id={`comment-editform-${props.commentId}`}>
      <form
        action={props.action}
        encType="multipart/form-data"
        onSubmit={(event) => {
          event.preventDefault();
          const nextContents = contentsMarkdown.trim();
          if (!nextContents) {
            return;
          }
          void props.onSubmit?.(props.commentId, nextContents, attachmentIds)?.then(() => {
            setAttachmentIds([]);
            props.onCancel();
          });
        }}
      >
        <input name="id" type="hidden" defaultValue={props.commentId} />
        <div className="write-comment-box">
          <div className="write-comment-wrap">
            <LegacyMarkdownEditorShell
              basePath={props.runtimeConfig.basePath}
              editId={`edit-${props.commentId}`}
              editorMode="update-comment-body"
              markdownPreview={contentsMarkdown}
              messages={props.messages}
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
                <div className="msg">
                  {legacyMessage(props.messages, "common.attach.dropFilesHere")}
                </div>
              </div>
            </div>
            <div className="right-txt comment-update-button upload-button-line">
              <span className="file-upload">
                <label className="file-upload__label ybtn" htmlFor={`upload-${props.commentId}`}>
                  {legacyMessage(props.messages, "button.upload")}
                </label>
                <input
                  className="file-upload__input"
                  id={`upload-${props.commentId}`}
                  multiple
                  name="filePath"
                  type="file"
                />
              </span>
              {props.showNotificationMail ? (
                <span
                  className="send-notification-check"
                  data-content={legacyMessage(props.messages, "notification.send.mail.warning")}
                  data-placement="top"
                  data-toggle="popover"
                  data-trigger="hover"
                >
                  <label className="checkbox inline">
                    <input defaultChecked name="notificationMail" type="checkbox" value="yes" />
                    <strong>{legacyMessage(props.messages, "notification.send.mail")}</strong>
                  </label>
                </span>
              ) : null}
              <button
                className="ybtn ybtn-cancel"
                data-comment-id={props.commentId}
                onClick={props.onCancel}
                type="button"
              >
                {legacyMessage(props.messages, "button.cancel")}
              </button>
              <button className="ybtn ybtn-info" type="submit">
                {legacyMessage(props.messages, "button.save")}
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

function isLegacyIssueDueDateValid(value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return true;
  }

  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(trimmed);
  if (dateParts) {
    const year = Number(dateParts[1]);
    const month = Number(dateParts[2]);
    const day = Number(dateParts[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }

  return !Number.isNaN(Date.parse(trimmed));
}

function legacyIssueValidationMessage(input: { dueDate: string; title: string }) {
  if (input.title.trim().length === 0) {
    return "issue.error.emptyTitle";
  }
  if (!isLegacyIssueDueDateValid(input.dueDate)) {
    return "issue.error.invalid.duedate";
  }
  return null;
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
  const { t: messages } = useLegacyMessages();
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
  const [submitGuardActive, setSubmitGuardActive] = React.useState(false);
  const [legacySubmitIntent, setLegacySubmitIntent] = React.useState<"save" | "draft" | "publish">(
    "save",
  );
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);
  const availableLabels = detail.dashboard?.labels ?? [];
  const milestoneOptions =
    props.mode === "create"
      ? (props.milestoneOptions ?? []).filter((milestone) => milestone.state !== "closed")
      : (props.milestoneOptions ?? []);
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
    setSubmitGuardActive(false);
    setLegacySubmitIntent("save");
    setValidationMessage(null);
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

  React.useEffect(() => {
    if (!submitGuardActive) {
      return undefined;
    }
    const timer = window.setTimeout(
      () => setSubmitGuardActive(false),
      legacyIssueFormSubmitGuardDurationMs,
    );
    return () => window.clearTimeout(timer);
  }, [submitGuardActive]);

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

  const submitIssueForm = (intent: "save" | "draft" | "publish") => {
    setLegacySubmitIntent(intent);
    setSubmitGuardActive(true);
    const nextValidationMessage = legacyIssueValidationMessage({ dueDate, title });
    if (nextValidationMessage) {
      setValidationMessage(nextValidationMessage);
      return;
    }
    setValidationMessage(null);
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

  const submitDraftPublishIssueForm = () => {
    const message = legacyMessage(messages, "button.draft.publish.description");
    if (!window.confirm(message)) {
      return;
    }
    submitIssueForm("publish");
  };

  const submitDisabled = submitting || submitGuardActive;

  return (
    <main className="app-shell issue-form-page">
      <h1 className="sr-only">
        {legacyMessage(messages, props.mode === "create" ? "button.newIssue" : "button.edit")}
      </h1>
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="issue" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="content-wrap frm-wrap">
            <form
              encType="multipart/form-data"
              id="issue-form"
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
                  <input
                    id="isPublish"
                    name="isPublish"
                    type="hidden"
                    value={legacySubmitIntent === "publish" ? "true" : "false"}
                    readOnly
                  />
                </>
              ) : null}
              <input name="referCommentId" type="hidden" value={props.referCommentId ?? ""} />
              <input
                id="isDraft"
                name="isDraft"
                type="hidden"
                value={legacySubmitIntent === "draft" ? "true" : "false"}
                readOnly
              />
              <div className="row-fluid">
                <div className="span12">
                  <dl>
                    {props.mode === "edit" && props.initialIssue ? (
                      <dt>
                        {props.initialIssue.isDraft ? (
                          <span className="draft">
                            {legacyMessage(messages, "issue.state.draft")}
                          </span>
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
                            onChange={(event) => {
                              setValidationMessage(null);
                              setTitle(event.currentTarget.value);
                            }}
                            placeholder={legacyMessage(messages, "title")}
                            data-legacy-tabindex="1"
                            title={
                              props.mode === "create"
                                ? legacyMessage(messages, "title.help.key")
                                : undefined
                            }
                            type="text"
                            value={title}
                          />
                        </div>
                        <div className="span1 subtask-message">
                          {legacyMessage(messages, "issue.option")}
                        </div>
                      </div>
                      <div
                        className={`subtask-wrap${parentIssueOptions.length > 0 || parentIssueId > 0 ? " show" : ""}`}
                      >
                        <div className="span3">
                          <select
                            data-container-css-class="fullsize"
                            data-format="projects"
                            data-placeholder={legacyMessage(
                              messages,
                              "organization.choose.projects",
                            )}
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
                            data-placeholder={legacyMessage(
                              messages,
                              "organization.choose.projects",
                            )}
                            data-toggle="select2"
                            id="parentId"
                            name="parentIssueId"
                            onChange={(event) =>
                              setParentIssueId(Number(event.currentTarget.value))
                            }
                            value={parentIssueId}
                          >
                            <option value="">
                              {legacyMessage(messages, "issue.subtask.select")}
                            </option>
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
                          basePath={props.runtimeConfig.basePath}
                          editId="edit-content-body"
                          editorMode="content-body"
                          markdownPreview={bodyMarkdown}
                          messages={messages}
                          ownerName={detail.ownerName}
                          projectName={detail.projectName}
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
                            onChange={(nextBodyMarkdown) => {
                              setValidationMessage(null);
                              setBodyMarkdown(nextBodyMarkdown);
                            }}
                            onSearchMentionUsers={props.onSearchMentionUsers}
                            placeholder=""
                            runtimeConfig={props.runtimeConfig}
                            data-legacy-tabindex="2"
                            value={bodyMarkdown}
                          />
                        </LegacyMarkdownEditorShell>
                      </dd>
                    </dl>
                    <LegacyIssueFileUploaderShell
                      messages={messages}
                      resourceId={props.initialIssue?.issueId ?? null}
                      resourceType="ISSUE_POST"
                    />
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
                            <strong>{legacyMessage(messages, "notification.send.mail")}</strong>
                          </label>
                        </span>
                      ) : null}
                      {props.mode !== "edit" || !props.initialIssue?.isDraft ? (
                        <button
                          className={
                            props.mode === "create" ? "ybtn ybtn-success" : "ybtn ybtn-info"
                          }
                          disabled={submitDisabled}
                          id="button-save"
                          type="submit"
                        >
                          {legacyMessage(messages, "button.save")}
                        </button>
                      ) : null}
                      {props.mode === "edit" && props.initialIssue?.isDraft ? (
                        <>
                          <button
                            className="ybtn ybtn-info"
                            data-content={legacyMessage(
                              messages,
                              "button.draft.publish.description",
                            )}
                            data-placement="top-start"
                            data-toggle="tooltip"
                            disabled={submitDisabled}
                            id="button-draft-publish"
                            onClick={submitDraftPublishIssueForm}
                            title={legacyMessage(messages, "button.draft.publish.description")}
                            type="button"
                          >
                            {legacyMessage(messages, "button.draft.publish")}
                          </button>
                          <button
                            className="ybtn ybtn-watching draft-save-btn"
                            data-content={legacyMessage(messages, "button.draft.save.description")}
                            data-placement="top"
                            data-toggle="tooltip"
                            disabled={submitDisabled}
                            id="draft-save-btn"
                            onClick={() => submitIssueForm("draft")}
                            title={legacyMessage(messages, "button.draft.save.description")}
                            type="button"
                          >
                            {legacyMessage(messages, "button.draft.save")}
                          </button>
                        </>
                      ) : props.mode === "create" ? (
                        <button
                          className="ybtn ybtn-watching draft-save-btn"
                          data-content={legacyMessage(messages, "button.draft.save.description")}
                          data-placement="top"
                          data-toggle="tooltip"
                          disabled={submitDisabled}
                          id="draft-save-btn"
                          onClick={() => submitIssueForm("draft")}
                          title={legacyMessage(messages, "button.draft.save.description")}
                          type="button"
                        >
                          {legacyMessage(messages, "button.draft.save")}
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
                        {legacyMessage(messages, "button.cancel")}
                      </a>
                    </div>
                  </div>
                  <div className="span3 span-hard-wrap right-menu">
                    {props.mode === "edit" && props.initialIssue ? (
                      <dl className="issue-option">
                        <dt>{legacyMessage(messages, "issue.state")}</dt>
                        <dd>
                          <div className="btn-group auto" data-name="state" id="state">
                            <button
                              className="btn dropdown-toggle auto"
                              data-toggle="dropdown"
                              type="button"
                            >
                              <span className="d-label">
                                {legacyMessage(messages, "issue.state")}
                              </span>
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
                                  {legacyMessage(messages, "issue.state.open")}
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
                                  {legacyMessage(messages, "issue.state.closed")}
                                </a>
                              </li>
                            </ul>
                          </div>
                        </dd>
                      </dl>
                    ) : null}
                    <dl className="issue-option">
                      <dt>{legacyMessage(messages, "issue.assignee")}</dt>
                      <dd>
                        <IssueAssigneeAutocompleteField
                          className="bigdrop"
                          id="assignee"
                          name="assigneeLoginId"
                          onChange={setAssigneeLoginId}
                          onSearchAssignableUsers={props.onSearchAssignableUsers}
                          onSelect={selectAssigneeSuggestion}
                          placeholder={legacyMessage(messages, "issue.noAssignee")}
                          style={{ width: "100%" }}
                          title=""
                          value={assigneeLoginId}
                        />
                      </dd>
                    </dl>
                    <dl className="issue-option" id="milestoneOption">
                      <dt>{legacyMessage(messages, "milestone")}</dt>
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
                            {legacyMessage(messages, "milestone.menu.new")}
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
                            <option value={0}>
                              {legacyMessage(messages, "issue.noMilestone")}
                            </option>
                            {props.mode === "edit" ? (
                              <IssueMilestoneOptionGroups
                                messages={messages}
                                milestones={milestoneOptions}
                              />
                            ) : (
                              milestoneOptions.map((milestone) => (
                                <option
                                  data-state={milestone.state}
                                  key={milestone.id}
                                  value={milestone.id}
                                >
                                  {milestone.title}
                                </option>
                              ))
                            )}
                          </select>
                        )}
                      </dd>
                    </dl>
                    <dl className="issue-option">
                      <dt>{legacyMessage(messages, "issue.dueDate")}</dt>
                      <dd>
                        <div className="search search-bar">
                          <input
                            className="textbox full"
                            data-toggle="calendar"
                            id="issueDueDate"
                            name="dueDate"
                            onChange={(event) => {
                              setValidationMessage(null);
                              setDueDate(event.currentTarget.value);
                            }}
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
                          {legacyMessage(messages, "label")}{" "}
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
                            [{legacyMessage(messages, "button.edit")}]
                          </a>
                        </dt>
                        <dd>
                          <select
                            aria-label={legacyMessage(messages, "label.select")}
                            className="hide"
                            data-allow-clear="true"
                            data-container-css-class="issue-labels bordered fullsize"
                            data-dropdown-css-class="issue-labels"
                            data-format="issuelabel"
                            data-placeholder={legacyMessage(messages, "label.select")}
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
                                  className={legacyIssueLabelClassName(
                                    "label issue-label list-label active",
                                    label.color,
                                  )}
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
              {validationMessage ? (
                <div className="alert alert-error" role="alert">
                  {legacyMessage(messages, validationMessage)}
                </div>
              ) : null}
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
