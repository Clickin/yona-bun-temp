import * as React from "react";
import {
  normalizeProjectDefaultScope,
  prefixBasePath,
  type RuntimeConfig,
} from "../runtime-config";
import type { BoardPostDetail } from "../api/boards";
import type {
  ProjectChangeVcsResponse,
  ProjectCreateOwnerOption,
  ProjectForkOptionsResponse,
  ProjectMembersResponse,
  ProjectTransferResponse,
  ProjectWebhookInput,
  ProjectWebhooksResponse,
  ProjectWebhookType,
  ProjectWatchersResponse,
} from "../api/org-project";
import {
  LEGACY_DEFAULT_LANGUAGE,
  lookupLegacyMessage,
  useLegacyMessages,
  type LegacyI18nContextValue,
} from "../i18n";
import { MarkdownRenderer } from "./-markdown-renderer";
import type { ProjectDetailViewModel } from "./-view-models";

export function buildProjectHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  suffix = "",
) {
  const normalizedSuffix = suffix === "" ? "" : `/${suffix.replace(/^\/+/, "")}`;
  return prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}${normalizedSuffix}`);
}

type ProjectHomeTab = "dashboard" | "history" | "readme";
type LegacyMessageLookup = LegacyI18nContextValue["t"];
type ProjectMenuSettingKey = "board" | "code" | "issue" | "milestone" | "pullRequest" | "review";

export const LEGACY_PROJECT_NAME_PATTERN = /^[0-9A-Za-z-_.가-힣]+$/;
export const LEGACY_PROJECT_RESERVED_NAMES = [".", "..", ".git"];

export type LegacyProjectFormValidationInput = {
  projectName: string;
  url?: string;
};

export type LegacyProjectFormValidationErrors = {
  name?: string[];
  url?: string[];
};

export function normalizeLegacyProjectNameOnFocusout(value: string) {
  return value.trim().replace(/ /g, "-");
}

export function validateLegacyProjectForm(
  input: LegacyProjectFormValidationInput,
): LegacyProjectFormValidationErrors {
  const errors: LegacyProjectFormValidationErrors = {};
  const projectName = input.projectName;

  if (projectName.length === 0 || !LEGACY_PROJECT_NAME_PATTERN.test(projectName)) {
    errors.name = [...(errors.name ?? []), "project.name.alert"];
  }
  if (LEGACY_PROJECT_RESERVED_NAMES.includes(projectName)) {
    errors.name = [...(errors.name ?? []), "project.name.reserved.alert"];
  }
  if (input.url !== undefined && input.url.trim().length === 0) {
    errors.url = [...(errors.url ?? []), "project.import.error.empty.url"];
  }

  return errors;
}

export function hasLegacyProjectFormErrors(errors: LegacyProjectFormValidationErrors) {
  return Boolean(errors.name?.length || errors.url?.length);
}

export function normalizeProjectOwnerScope(
  ownerOptions: ProjectCreateOwnerOption[],
  ownerName: string,
  projectScope: string,
) {
  const ownerOption = ownerOptions.find((option) => option.ownerName === ownerName);
  const selectedOwnerIsOrganization = ownerOption?.organization ?? false;
  return {
    projectScope:
      selectedOwnerIsOrganization || projectScope !== "protected" ? projectScope : "public",
    protectedVisible: selectedOwnerIsOrganization,
  };
}

export function normalizeProjectMenusForCodeToggle(
  current: Record<ProjectMenuSettingKey, boolean>,
  checked: boolean,
) {
  return checked
    ? { ...current, code: true }
    : { ...current, code: false, pullRequest: false, review: false };
}

export function normalizeProjectMenusForDependentCodeToggle(
  current: Record<ProjectMenuSettingKey, boolean>,
  key: "pullRequest" | "review",
  checked: boolean,
) {
  return {
    ...current,
    [key]: checked,
    code: checked ? true : current.code,
  };
}

export function isLegacySubversionVcs(value: string) {
  const normalized = value.trim().toUpperCase();
  return normalized === "SVN" || normalized === "SUBVERSION";
}

function firstLegacyProjectError(errors: LegacyProjectFormValidationErrors, field: "name" | "url") {
  return errors[field]?.[0] ?? null;
}

function LegacyProjectFieldPopover(props: {
  field: "name" | "url";
  messages: LegacyMessageLookup;
  validationErrors: LegacyProjectFormValidationErrors;
}) {
  const errorKey = firstLegacyProjectError(props.validationErrors, props.field);
  if (!errorKey) {
    return null;
  }
  return (
    <div className="popover fade left in" role="tooltip" style={{ display: "block" }}>
      <div className="arrow" />
      <div className="popover-content">{legacyMessage(props.messages, errorKey)}</div>
    </div>
  );
}

function legacyMessage(
  messages: LegacyMessageLookup | undefined,
  key: string,
  options: { args?: Array<number | string>; fallback?: string } = {},
) {
  const fallback = options.fallback ?? key;
  return messages
    ? messages(key, { ...options, fallback })
    : lookupLegacyMessage(LEGACY_DEFAULT_LANGUAGE, key, { ...options, fallback });
}

function normalizeProjectHomeTab(value: string | undefined): ProjectHomeTab | null {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "dashboard" || normalized === "history" || normalized === "readme"
    ? normalized
    : null;
}

function projectHomeTabFromHref(routeHref: string | undefined): ProjectHomeTab | null {
  if (!routeHref) {
    return null;
  }
  const tabId = new URL(routeHref, "http://yona.local").searchParams.get("tabId");
  return normalizeProjectHomeTab(tabId ?? undefined);
}

function ProjectDashboardMetric(props: {
  count: number;
  href: string;
  label: string;
  percent?: number;
}) {
  const percent = props.percent ?? 0;

  return (
    <div className="row-fluid">
      <div className="span6">
        <a className="usf-group" href={props.href}>
          <span className="name">{props.label}</span>
        </a>
      </div>
      <div className="span3 num">
        <strong>{props.count}</strong>
      </div>
      <div className="span3 nm">
        <div
          className={`progress progress-warning ${percent === 0 ? "empty" : ""}`.trim()}
          data-toggle="tooltip"
          title={`${percent}%`}
        >
          <div className="bar" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}

function ProjectDashboardMilestoneMetric(props: {
  count: number;
  href: string;
  label: string;
  percent: number;
}) {
  return (
    <div className="row-fluid">
      <div className="span6">
        <a href={props.href}>{props.label}</a>
      </div>
      <div className="span3 num">
        <strong>{props.count}</strong>
      </div>
      <div className="span3 nm">
        <div
          className={`progress progress-success ${props.count === 0 ? "empty" : ""}`.trim()}
          data-toggle="tooltip"
          title={`${props.percent}%`}
        >
          <div className="bar bar-success" style={{ width: `${props.percent}%` }} />
        </div>
      </div>
    </div>
  );
}

function ProjectDashboardLabelMetric(props: {
  count: number;
  href: string;
  labelId: number;
  labelName: string;
}) {
  return (
    <div className="row-fluid">
      <div className="span10">
        <a href={props.href}>
          <span className="issue-label list-label active" data-label-id={props.labelId}>
            {props.labelName}
          </span>
        </a>
      </div>
      <div className="span2 num">
        <strong>{props.count}</strong>
      </div>
    </div>
  );
}

function ProjectDashboardPullRequestMetric(props: {
  contributorAvatarUrl: string;
  contributorLoginId: string;
  contributorUserLabel: string;
  createdLabel: string;
  href: string;
  listHref: string;
  title: string;
}) {
  return (
    <div className="row-fluid">
      <div className="span9 title">
        <a className="usf-group" href={props.listHref}>
          <span
            className="avatar-wrap smaller"
            data-toggle="tooltip"
            title={`${props.contributorUserLabel} (@${props.contributorLoginId})`}
          >
            <img alt="" height="20" src={props.contributorAvatarUrl} width="20" />
          </span>
        </a>{" "}
        <a href={props.href}>{props.title}</a>
      </div>
      <div className="span3 num right-txt" style={{ color: "#999" }}>
        {props.createdLabel}
      </div>
    </div>
  );
}

function ProjectDashboardAssigneeMetric(props: {
  avatarUrl: string;
  count: number;
  href: string;
  loginId: string;
  totalCount: number;
  userLabel: string;
}) {
  const percent = dashboardPercent(props.count, props.totalCount);

  return (
    <div className="row-fluid">
      <div className="span6">
        <a className="usf-group" href={props.href} title={`${props.userLabel} (@${props.loginId})`}>
          <span className="avatar-wrap smaller">
            <img alt="" height="20" src={props.avatarUrl} width="20" />
          </span>
          <strong className="name">{props.userLabel}</strong>
          <span className="loginid">
            {" "}
            <strong>@</strong>
            {props.loginId}
          </span>
        </a>
      </div>
      <div className="span3 num">
        <strong>{props.count}</strong>
      </div>
      <div className="span3 nm">
        <div
          className={`progress progress-warning ${percent === 0 ? "empty" : ""}`.trim()}
          data-toggle="tooltip"
          title={`${percent}%`}
        >
          <div className="bar" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}

function ProjectDashboardUnassignedMetric(props: {
  count: number;
  href: string;
  messages?: LegacyMessageLookup;
  totalCount: number;
}) {
  const percent = dashboardPercent(props.count, props.totalCount);

  return (
    <div className="row-fluid">
      <div className="span6">
        <a className="usf-group" href={props.href}>
          <span className="avatar-wrap smaller">
            <i className="yobicon-blankstare" />
          </span>
          <span className="name">{legacyMessage(props.messages, "issue.noAssignee")}</span>
        </a>
      </div>
      <div className="span3 num">
        <strong>{props.count}</strong>
      </div>
      <div className="span3 nm">
        <div
          className={`progress progress-warning ${percent === 0 ? "empty" : ""}`.trim()}
          data-toggle="tooltip"
          title={`${percent}%`}
        >
          <div className="bar" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}

function dashboardPercent(count: number, totalCount: number) {
  return totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
}

function legacyStrongCountMessage(
  messages: LegacyMessageLookup | undefined,
  key: string,
  count: number,
) {
  const countText = String(count);
  const text = legacyMessage(messages, key, { args: [count] }).replace(/<\/?\s*strong\s*>/g, "");
  const index = text.indexOf(countText);
  if (index < 0) {
    return text;
  }
  return (
    <>
      {text.slice(0, index)}
      <strong>{count}</strong>
      {text.slice(index + countText.length)}
    </>
  );
}

function ProjectHomeHistoryPane(props: {
  detail: ProjectDetailViewModel;
  messages?: LegacyMessageLookup;
}) {
  const items = props.detail.history?.items ?? [];

  return (
    <div className="content-container nm">
      <div className="main-stream" style={{ width: "100%" }}>
        <ul className="activity-streams unstyled">
          {items.map((item) => (
            <li className="activity-stream" key={`${item.itemType}:${item.url}`}>
              <a className="avatar-wrap pull-left mr10" href={item.actorUrl}>
                <img alt="" height="32" src={item.actorAvatarUrl} width="32" />
              </a>
              <div className="activity-desc">
                <p className="header-text" style={{ marginBottom: "5px" }}>
                  <a className="actor" href={item.actorUrl}>
                    {item.actorName}
                  </a>{" "}
                  <span>
                    {legacyMessage(props.messages, `project.history.type.${item.itemType}`)}
                  </span>{" "}
                  <span className="whereis">
                    <a className="where" href={item.url}>
                      {item.shortTitle}
                    </a>{" "}
                    <a className="title" href={item.url}>
                      {item.title}
                    </a>
                  </span>
                </p>
                <p className="others" style={{ paddingLeft: 0 }}>
                  <span className="date" style={{ marginLeft: 0 }} title={item.createdLabel}>
                    {item.createdLabel}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ProjectHomeDashboardPane(props: {
  detail: ProjectDetailViewModel;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
}) {
  const { detail, runtimeConfig } = props;
  const projectHref = (suffix = "") =>
    buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, suffix);
  const openIssueCount = detail.openIssueCount ?? 0;
  const pullRequestCount = detail.openPullRequestCount ?? 0;
  const dashboardAssignees = detail.dashboard?.assignees ?? [];
  const hasAssigneeDashboardData =
    detail.dashboard !== undefined &&
    (dashboardAssignees.length > 0 || detail.dashboard.unassignedOpenIssueCount !== undefined);
  const dashboardLabels = detail.dashboard?.labels ?? [];
  const dashboardMilestones =
    detail.dashboard?.milestones ??
    (detail.currentMilestone
      ? [
          {
            closedIssueCount: detail.currentMilestone.closedIssueCount,
            completionPercent: detail.currentMilestone.completionPercent,
            id: detail.currentMilestone.id,
            openIssueCount: detail.currentMilestone.openIssueCount,
            title: detail.currentMilestone.title,
          },
        ]
      : []);
  const noMilestoneOpenIssueCount =
    detail.dashboard?.noMilestoneOpenIssueCount ??
    (dashboardMilestones.length > 0
      ? openIssueCount -
        dashboardMilestones.reduce((total, milestone) => total + milestone.openIssueCount, 0)
      : 0);
  const dashboardPullRequests = detail.dashboard?.pullRequests ?? [];
  const dashboardLabelCategories = dashboardLabels.reduce<
    Array<{ categoryName: string; labels: typeof dashboardLabels }>
  >((categories, label) => {
    const categoryName = label.categoryName || "project.dashboard.openIssuesByLabel";
    const existing = categories.find((category) => category.categoryName === categoryName);
    if (existing) {
      existing.labels.push(label);
    } else {
      categories.push({ categoryName, labels: [label] });
    }
    return categories;
  }, []);

  return (
    <div className="content-container nm">
      <div className="project-overview-home row-fluid">
        <div className="span6">
          {detail.showIssue ? (
            <>
              <h5>{legacyMessage(props.messages, "project.dashboard.openIssuesByAssignee")}</h5>
              <div className="overview-assignee">
                {openIssueCount === 0 ? (
                  <div className="empty">
                    <p>{legacyMessage(props.messages, "issue.is.empty")}</p>
                    <a className="ybtn ybtn-small" href={projectHref("issue/new")} target="_blank">
                      {legacyMessage(props.messages, "issue.menu.new")}
                    </a>
                  </div>
                ) : hasAssigneeDashboardData ? (
                  <>
                    {dashboardAssignees.map((assignee) => (
                      <ProjectDashboardAssigneeMetric
                        avatarUrl={assignee.avatarUrl}
                        count={assignee.openIssueCount}
                        href={projectHref(
                          `issues?state=open&assigneeLoginId=${encodeURIComponent(
                            assignee.loginId,
                          )}`,
                        )}
                        key={assignee.userId}
                        loginId={assignee.loginId}
                        totalCount={openIssueCount}
                        userLabel={assignee.userLabel}
                      />
                    ))}
                    <ProjectDashboardUnassignedMetric
                      count={detail.dashboard?.unassignedOpenIssueCount ?? 0}
                      href={projectHref("issues?state=open&assigneeId=0")}
                      messages={props.messages}
                      totalCount={openIssueCount}
                    />
                  </>
                ) : (
                  <ProjectDashboardMetric
                    count={openIssueCount}
                    href={projectHref("issues?state=open")}
                    label={legacyMessage(props.messages, "issue.noAssignee")}
                    percent={100}
                  />
                )}
              </div>

              <hr />

              <h5>{legacyMessage(props.messages, "project.dashboard.openIssuesByMilestone")}</h5>
              <div className="overview-milestone">
                {dashboardMilestones.length > 0 ? (
                  <>
                    {dashboardMilestones.map((milestone) => (
                      <ProjectDashboardMilestoneMetric
                        count={milestone.openIssueCount}
                        href={projectHref(`issues?state=open&milestoneId=${milestone.id}`)}
                        key={milestone.id}
                        label={milestone.title}
                        percent={milestone.completionPercent}
                      />
                    ))}
                    <div className="row-fluid">
                      <div className="span6">
                        <a href={projectHref("issues?state=open&milestoneId=0")}>
                          {legacyMessage(props.messages, "issue.noMilestone")}
                        </a>
                      </div>
                      <div className="span3 num">
                        <strong>{Math.max(0, noMilestoneOpenIssueCount)}</strong>
                      </div>
                      <div className="span3 nm" />
                    </div>
                  </>
                ) : (
                  <div className="empty">
                    <p>{legacyMessage(props.messages, "milestone.is.empty")}</p>
                    <a
                      className="ybtn ybtn-small"
                      href={projectHref("newMilestoneForm")}
                      target="_blank"
                    >
                      {legacyMessage(props.messages, "milestone.menu.new")}
                    </a>
                  </div>
                )}
              </div>
            </>
          ) : null}

          {detail.showPullRequest ? (
            <>
              {detail.showIssue ? <hr /> : null}
              <h5>{legacyMessage(props.messages, "project.dashboard.pullRequests")}</h5>
              <div className="overview-pullrequest">
                {dashboardPullRequests.length > 0 ? (
                  <>
                    {dashboardPullRequests.map((pullRequest) => (
                      <ProjectDashboardPullRequestMetric
                        contributorAvatarUrl={pullRequest.contributorAvatarUrl}
                        contributorLoginId={pullRequest.contributorLoginId}
                        contributorUserLabel={pullRequest.contributorUserLabel}
                        createdLabel={pullRequest.createdLabel}
                        href={projectHref(`pullRequest/${pullRequest.pullRequestNumber}`)}
                        key={pullRequest.pullRequestNumber}
                        listHref={projectHref(
                          `pullRequests?contributorId=${pullRequest.contributorUserId}`,
                        )}
                        title={pullRequest.title}
                      />
                    ))}
                    <div className="right-txt mt5" style={{ marginRight: 17 }}>
                      <a href={projectHref("pullRequests")}>
                        {legacyStrongCountMessage(
                          props.messages,
                          "project.dashboard.more",
                          pullRequestCount,
                        )}
                      </a>
                    </div>
                  </>
                ) : pullRequestCount === 0 ? (
                  <div className="empty">
                    <p>{legacyMessage(props.messages, "pullRequest.is.empty")}</p>
                    <a
                      className="ybtn ybtn-small"
                      href={projectHref("newPullRequestForm")}
                      target="_blank"
                    >
                      {legacyMessage(props.messages, "pullRequest.new")}
                    </a>
                  </div>
                ) : (
                  <ProjectDashboardMetric
                    count={pullRequestCount}
                    href={projectHref("pullRequests")}
                    label={legacyMessage(props.messages, "project.dashboard.pullRequests")}
                    percent={100}
                  />
                )}
              </div>
            </>
          ) : null}
        </div>

        {detail.showIssue ? (
          <div className="span6">
            <h5>{legacyMessage(props.messages, "project.dashboard.openIssuesByLabel")}</h5>
            {dashboardLabelCategories.length > 0
              ? dashboardLabelCategories.map((category) => (
                  <dl className="dl-horizontal overview-label" key={category.categoryName}>
                    <dt>{legacyMessage(props.messages, category.categoryName)}</dt>
                    <dd>
                      {category.labels.map((label) => (
                        <ProjectDashboardLabelMetric
                          count={label.openIssueCount}
                          href={projectHref(`issues?state=open&labelIds=${label.id}`)}
                          key={label.id}
                          labelId={label.id}
                          labelName={label.name}
                        />
                      ))}
                    </dd>
                  </dl>
                ))
              : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ProjectMenuSettingsInput = {
  board: boolean;
  code: boolean;
  issue: boolean;
  milestone: boolean;
  pullRequest: boolean;
  review: boolean;
};

const PROJECT_MENU_SETTINGS = [
  { id: "menuSettingCode", key: "code", label: "menu.code", name: "code" },
  { id: "menuSettingIssue", key: "issue", label: "menu.issue", name: "issue" },
  {
    id: "menuSettingPullRequest",
    key: "pullRequest",
    label: "menu.pullRequest",
    name: "pullRequest",
  },
  { id: "menuSettingReview", key: "review", label: "menu.review", name: "review" },
  { id: "menuSettingMilestone", key: "milestone", label: "milestone", name: "milestone" },
  { id: "menuSettingBoard", key: "board", label: "menu.board", name: "board" },
] as const;
const PROJECT_NAME_PATTERN = /^[0-9A-Za-z-_.가-힣]+$/;
const PROJECT_RESERVED_NAMES = [".", "..", ".git"];

function isProjectLogoImageFile(file: File) {
  if (file.type.toLowerCase().startsWith("image/")) {
    return true;
  }
  return /\.(?:bmp|gif|jpe?g|png)$/i.test(file.name);
}

function defaultProjectMenuSettings(defaultMenus?: string[]): ProjectMenuSettingsInput {
  const menus = new Set(
    defaultMenus && defaultMenus.length > 0
      ? defaultMenus
      : PROJECT_MENU_SETTINGS.map((item) => item.key),
  );
  return {
    board: menus.has("board"),
    code: menus.has("code"),
    issue: menus.has("issue"),
    milestone: menus.has("milestone"),
    pullRequest: menus.has("pullRequest"),
    review: menus.has("review"),
  };
}

function projectMenuSettingsFromDetail(
  detail: Pick<
    ProjectDetailViewModel,
    "showBoard" | "showCode" | "showIssue" | "showMilestone" | "showPullRequest" | "showReview"
  >,
): ProjectMenuSettingsInput {
  return {
    board: detail.showBoard ?? true,
    code: detail.showCode ?? true,
    issue: detail.showIssue ?? true,
    milestone: detail.showMilestone ?? true,
    pullRequest: detail.showPullRequest ?? true,
    review: detail.showReview ?? true,
  };
}

function projectShellDetail(input: {
  enrollmentRequestCount?: number;
  ownerName: string;
  projectName: string;
  viewerCanUpdate?: boolean;
}): ProjectDetailViewModel {
  return {
    enrollmentRequestCount: input.enrollmentRequestCount ?? 0,
    enrollmentRequested: false,
    isFavorited: false,
    organizationName: "",
    overview: "",
    ownerName: input.ownerName,
    projectName: input.projectName,
    projectScope: "public",
    showCode: true,
    viewerCanEnroll: false,
    viewerCanUpdate: Boolean(input.viewerCanUpdate),
  };
}

type ProjectMenuActive =
  | "home"
  | "code"
  | "issue"
  | "pullRequest"
  | "review"
  | "milestone"
  | "board"
  | "settings";

export function ProjectMenu(props: {
  activeMenu?: ProjectMenuActive;
  detail: ProjectDetailViewModel;
  keymapMode?: "detail" | "list";
  runtimeConfig: RuntimeConfig;
}) {
  const { detail, runtimeConfig } = props;
  const messages = useLegacyMessages();
  const menuItems = [
    {
      key: "home",
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName),
      menuName: "title.projectHome",
      show: true,
      shortMenu: "H",
    },
    {
      className: "code-menu",
      key: "code",
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "code"),
      menuName: "menu.code",
      show: detail.showCode,
      shortMenu: "C",
    },
    {
      count: detail.openIssueCount,
      key: "issue",
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "issues"),
      menuName: "menu.issue",
      show: detail.showIssue,
      shortMenu: "I",
    },
    {
      count: detail.openPullRequestCount,
      key: "pullRequest",
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "pullRequests"),
      menuName: "menu.pullRequest",
      show: detail.showPullRequest,
      shortMenu: "P",
    },
    {
      count: detail.reviewCount,
      key: "review",
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "reviews"),
      menuName: "menu.review",
      show: detail.showReview,
      shortMenu: "R",
    },
    {
      key: "milestone",
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "milestones"),
      menuName: "milestone",
      show: detail.showMilestone,
      shortMenu: "M",
    },
    {
      count: detail.boardCount,
      key: "board",
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "posts"),
      menuName: "menu.board",
      show: detail.showBoard,
      shortMenu: "B",
    },
  ];

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          {menuItems.flatMap((item) => {
            if (!item.show) {
              return [];
            }
            const classNames = [item.className, props.activeMenu === item.key ? "active" : ""]
              .filter(Boolean)
              .join(" ");
            return [
              <li className={classNames || undefined} key={item.key}>
                <a href={item.href}>
                  <span className="menu-name">
                    {messages.t(item.menuName, { fallback: item.menuName })}
                  </span>
                  <span className="short-menu">{item.shortMenu}</span>{" "}
                  {(item.count ?? 0) > 0 ? (
                    <span className="project-menu-count">{item.count}</span>
                  ) : null}
                </a>
              </li>,
            ];
          })}
        </ul>
        {detail.showAdmin || detail.viewerCanUpdate ? (
          <div className="project-setting">
            <ul className="project-menu-nav">
              <li className={props.activeMenu === "settings" ? "active" : undefined}>
                <a
                  href={buildProjectHref(
                    runtimeConfig,
                    detail.ownerName,
                    detail.projectName,
                    "settingform",
                  )}
                >
                  <i className="yobicon-cog" />
                  <span className="blind">
                    <span className="menu-name">
                      {messages.t("menu.admin", { fallback: "menu.admin" })}
                    </span>
                  </span>
                  {(detail.enrollmentRequestCount ?? 0) > 0 ? (
                    <span className="project-menu-count">{detail.enrollmentRequestCount}</span>
                  ) : null}
                </a>
              </li>
            </ul>
          </div>
        ) : null}
      </div>
      {props.keymapMode ? (
        <ProjectKeymapHelp
          detail={detail}
          mode={props.keymapMode}
          section={props.activeMenu ?? "home"}
        />
      ) : null}
    </div>
  );
}

function ProjectKeymapHelp(props: {
  detail: ProjectDetailViewModel;
  mode?: "detail" | "list";
  section: ProjectMenuActive;
}) {
  const { detail, mode, section } = props;
  const messages = useLegacyMessages();
  const canUseAdmin = detail.showAdmin || detail.viewerCanUpdate;
  const isMac = projectKeymapIsMacintosh();
  const ctrlKey = isMac ? "\u2318" : "CTRL";
  const searchKeys = isMac ? ["CTRL", "ALT", "S"] : ["ALT", "S"];
  const sectionTitleKey = projectKeymapSectionTitle(section, mode);

  return (
    <div className="pull-left" style={{ marginLeft: 55, padding: "10px 0" }}>
      <a className="ybtn ybtn-inverse ybtn-mini" data-toggle="modal" href="#helpKeys">
        {messages.t("title.keymap", { fallback: "title.keymap" })}
      </a>

      <div className="modal hide fade keymap-help" id="helpKeys" role="dialog" tabIndex={-1}>
        <div className="row-fluid">
          <div className="span3">
            <h5>{messages.t("project.projects", { fallback: "project.projects" })}</h5>

            <ProjectKeymapRow keys={["H"]} label="menu.home" messages={messages.t} />
            {detail.showBoard ? (
              <ProjectKeymapRow keys={["B"]} label="menu.board" messages={messages.t} />
            ) : null}
            {detail.showIssue ? (
              <ProjectKeymapRow keys={["I"]} label="menu.issue" messages={messages.t} />
            ) : null}
            {detail.showCode ? (
              <ProjectKeymapRow keys={["C"]} label="menu.code" messages={messages.t} />
            ) : null}
            {detail.showMilestone ? (
              <ProjectKeymapRow keys={["M"]} label="milestone" messages={messages.t} />
            ) : null}
            {detail.showPullRequest ? (
              <ProjectKeymapRow keys={["P"]} label="menu.pullRequest" messages={messages.t} />
            ) : null}
            {canUseAdmin ? (
              <ProjectKeymapRow keys={["Q"]} label="project.setting" messages={messages.t} />
            ) : null}
          </div>

          <div className="span9">
            <div className="row-fluid">
              <div className="span5">
                <h5>
                  {messages.t(sectionTitleKey, {
                    fallback: sectionTitleKey,
                  })}
                </h5>
                {section === "board" ? (
                  <ProjectKeymapRow keys={["N"]} label="post.write" messages={messages.t} />
                ) : null}
                {section === "issue" ? (
                  <ProjectKeymapRow keys={["N"]} label="issue.menu.new" messages={messages.t} />
                ) : null}
                {mode === "detail" ? (
                  <>
                    <ProjectKeymapRow keys={["L"]} label="button.list" messages={messages.t} />
                    <ProjectKeymapRow keys={["E"]} label="button.edit" messages={messages.t} />
                  </>
                ) : null}
                {mode === "list" ? (
                  <>
                    <ProjectKeymapRow
                      keys={["\u2190"]}
                      label="button.prevPage"
                      messages={messages.t}
                    />
                    <ProjectKeymapRow
                      keys={["\u2192"]}
                      label="button.nextPage"
                      messages={messages.t}
                    />
                  </>
                ) : null}
                {section === "issue" && mode === "list" ? (
                  <ProjectKeymapRow
                    keys={[ctrlKey, "A"]}
                    label="button.selectAll"
                    messages={messages.t}
                  />
                ) : null}
              </div>

              <div className="span7">
                <h5>{messages.t("site", { fallback: "site" })}</h5>
                <ProjectKeymapRow keys={["A"]} label="issue.myIssue" messages={messages.t} />
                <ProjectKeymapRow keys={["U"]} label="userinfo.profile" messages={messages.t} />
                <ProjectKeymapRow keys={["F"]} label="user.menu" messages={messages.t} />
                <ProjectKeymapRow keys={searchKeys} label="site.search" messages={messages.t} />
                <ProjectKeymapRow
                  keys={[ctrlKey, "ENTER"]}
                  label="button.submitForm"
                  messages={messages.t}
                />
              </div>
            </div>
            {section === "issue" && mode === "detail" ? (
              <div className="row-fluid mt20">
                <div className="span12">
                  <h5>
                    {messages.t("search.menu.issue.comments", {
                      fallback: "search.menu.issue.comments",
                    })}
                  </h5>
                  <ProjectKeymapRow
                    keys={["SHIFT", ctrlKey, "ENTER"]}
                    label="button.commentAndNextState.closed"
                    messages={messages.t}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <p className="actrow">
          <button className="ybtn ybtn-info" data-dismiss="modal" type="button">
            {messages.t("button.confirm", { fallback: "button.confirm" })}
          </button>
        </p>
      </div>
    </div>
  );
}

function projectKeymapIsMacintosh() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.userAgent === "string" &&
    navigator.userAgent.includes("Macintosh")
  );
}

function ProjectKeymapRow(props: {
  keys: string[];
  label: string;
  messages: (key: string, options?: { fallback?: string }) => string;
}) {
  return (
    <>
      {props.keys.map((key, index) => (
        <React.Fragment key={`${props.label}:${key}`}>
          {index > 0 ? " + " : null}
          <span className="ybtn ybtn-small">{key}</span>
        </React.Fragment>
      ))}
      <span className="help-inline">{props.messages(props.label, { fallback: props.label })}</span>
      <br />
    </>
  );
}

function projectKeymapSectionTitle(section: ProjectMenuActive, mode?: "detail" | "list") {
  switch (section) {
    case "board":
      return mode === "detail" ? "title.boardDetail" : "title.boardList";
    case "code":
      return "menu.code";
    case "issue":
      return mode === "detail" ? "title.issueDetail" : "title.issueList";
    case "milestone":
      return "milestone";
    case "pullRequest":
      return "menu.pullRequest";
    case "review":
      return "menu.review";
    case "settings":
      return "project.setting";
    case "home":
    default:
      return "title.projectHome";
  }
}

export function ProjectHeader(props: {
  detail: ProjectDetailViewModel;
  messages?: LegacyMessageLookup;
  onCancelEnrollProject?: (ownerName: string, projectName: string) => void;
  onEnrollProject?: (ownerName: string, projectName: string) => void;
  onToggleFavoriteProject?: (ownerName: string, projectName: string) => void;
  onToggleProjectWatch?: (ownerName: string, projectName: string, watching: boolean) => void;
  runtimeConfig: RuntimeConfig;
}) {
  const { detail, runtimeConfig } = props;
  const { t: contextMessages } = useLegacyMessages();
  const messages = props.messages ?? contextMessages;
  const projectHref = buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName);
  const ownerHref = prefixBasePath(runtimeConfig.basePath, `/${detail.ownerName}`);
  const enrollmentHref = buildProjectHref(
    runtimeConfig,
    detail.ownerName,
    detail.projectName,
    detail.enrollmentRequested ? "cancel/enroll" : "enroll",
  );
  const favoriteClass = `${detail.isFavorited ? "starred " : ""}star material-icons va-text-top`;
  const notificationsHref = prefixBasePath(runtimeConfig.basePath, "/user/editform/notifications");
  const breadcrumbClass = `project-breadcrumb-wrap${
    detail.originOwnerName && detail.originProjectName ? " fork" : ""
  }`;
  const watchHref = buildProjectHref(
    runtimeConfig,
    detail.ownerName,
    detail.projectName,
    detail.isWatching ? "unwatch" : "watch",
  );

  return (
    <div
      className="project-header-outer"
      style={{ backgroundImage: `url(${detail.backgroundUrl ?? ""})` }}
    >
      <div className="project-header-inner">
        <div className="project-header-wrap">
          <div className="project-header-avatar">
            {detail.logoUrl ? <img alt="" src={detail.logoUrl} /> : null}
          </div>
          <div className={breadcrumbClass}>
            <div className="project-breadcrumb">
              <span className="project-author hide-in-mobile">
                <a href={ownerHref}>{detail.ownerName}</a>
              </span>
              <span className="project-separator hide-in-mobile">/</span>
              <span className="project-name">
                <a href={projectHref}>{detail.projectName}</a>
              </span>
              <span
                className="user-project-list"
                onClick={() =>
                  props.onToggleFavoriteProject?.(detail.ownerName, detail.projectName)
                }
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") {
                    return;
                  }
                  event.preventDefault();
                  props.onToggleFavoriteProject?.(detail.ownerName, detail.projectName);
                }}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- legacy header star is a span; button picks up global button chrome.
                role="button"
                tabIndex={0}
              >
                <i className={favoriteClass}>star</i>
              </span>
              {detail.projectScope === "private" ? (
                <span className="project-private">
                  <i className="yobicon-lock" />
                </span>
              ) : null}
              {detail.projectScope === "protected" ? (
                <span className="project-protected" title="Group Project">
                  G
                </span>
              ) : null}
            </div>
            {detail.originOwnerName && detail.originProjectName ? (
              <div className="project-origin">
                <span className="project-origin-title">
                  {legacyMessage(messages, "fork.original")}
                </span>
                <a
                  className="project-origin-name"
                  href={buildProjectHref(
                    runtimeConfig,
                    detail.originOwnerName,
                    detail.originProjectName,
                  )}
                >
                  {detail.originOwnerName} / {detail.originProjectName}
                </a>
              </div>
            ) : null}
          </div>
          <div className="project-util-wrap">
            <ul className="project-util">
              {detail.viewerCanEnroll ? (
                <li>
                  <button
                    className={`ybtn ybtn-small${detail.enrollmentRequested ? " ybtn-info" : ""} dropdown-toggle`}
                    data-toggle="dropdown"
                    type="button"
                  >
                    <i className="yobicon-addfriend" />
                    {detail.enrollmentRequested
                      ? null
                      : legacyMessage(messages, "organization.member.enrollment.title")}
                  </button>
                  <div className="dropdown-menu flat right title">
                    <div className="pop-title">
                      {legacyMessage(
                        messages,
                        detail.enrollmentRequested
                          ? "project.you.want.to.be.a.member"
                          : "project.you.may.want.to.be.a.member",
                        { args: [detail.projectName] },
                      )}
                    </div>
                    <div className="pop-content">
                      {legacyMessage(
                        messages,
                        detail.enrollmentRequested
                          ? "project.member.enrollment.help"
                          : "project.member.enrollment.will.help",
                      )}
                    </div>
                    <div className="pop-content btn-wrap">
                      <a
                        className={`ybtn${detail.enrollmentRequested ? "" : " ybtn-info"} enrollBtn`}
                        href={enrollmentHref}
                        id="enrollBtn"
                        onClick={(event) => {
                          event.preventDefault();
                          const handler = detail.enrollmentRequested
                            ? props.onCancelEnrollProject
                            : props.onEnrollProject;
                          if (!handler) {
                            return;
                          }
                          handler(detail.ownerName, detail.projectName);
                        }}
                      >
                        <i
                          className={
                            detail.enrollmentRequested
                              ? "yobicon-removefriend"
                              : "yobicon-addfriend"
                          }
                        />{" "}
                        {legacyMessage(
                          messages,
                          detail.enrollmentRequested
                            ? "button.cancel.enrollment"
                            : "button.new.enrollment",
                        )}
                      </a>
                    </div>
                  </div>
                </li>
              ) : null}
              {detail.viewerCanWatch ? (
                <li>
                  <div className="btn-group dropdown watch-btn">
                    <a
                      className={`btn watcher-count no-border${detail.isWatching ? " watch-on" : ""}`}
                      data-toggle="tooltip"
                      href={buildProjectHref(
                        runtimeConfig,
                        detail.ownerName,
                        detail.projectName,
                        "watchers",
                      )}
                      title={legacyMessage(messages, "project.watcher.number")}
                    >
                      {detail.watchCount ?? 0}
                    </a>
                    <div className="dropdown-menu flat right title">
                      <div className="pop-title">
                        {legacyMessage(
                          messages,
                          detail.isWatching
                            ? "project.you.are.watching"
                            : "project.you.are.not.watching",
                          { args: [detail.projectName] },
                        )}
                      </div>
                      <div className="pop-content">
                        <p>{legacyMessage(messages, "notification.help")}</p>
                        <ul className="icons-ul">
                          <li>
                            <i className="yobicon-li yobicon-ok" />
                            {legacyMessage(messages, "notification.help.new")}
                          </li>
                          <li>
                            <i className="yobicon-li yobicon-ok" />
                            {legacyMessage(messages, "notification.help.new.comment")}
                          </li>
                          <li>
                            <i className="yobicon-li yobicon-ok" />
                            {legacyMessage(messages, "notification.help.update.issue")}
                          </li>
                          <li>
                            <i className="yobicon-li yobicon-ok" />
                            {legacyMessage(messages, "notification.help.update.pullrequest")}
                          </li>
                        </ul>
                      </div>
                      <div className="pop-content btn-wrap">
                        <a className="ybtn" href={notificationsHref}>
                          <i className="yobicon-alert2" />{" "}
                          {legacyMessage(messages, "userinfo.changeNotifications")}
                        </a>
                        <a
                          className="ybtn ybtn-watching watchBtn"
                          href={watchHref}
                          onClick={(event) => {
                            event.preventDefault();
                            const handler = props.onToggleProjectWatch;
                            if (!handler) {
                              return;
                            }
                            handler(detail.ownerName, detail.projectName, !detail.isWatching);
                          }}
                        >
                          <i className={detail.isWatching ? "yobicon-eye-off" : "yobicon-eye"} />{" "}
                          {legacyMessage(
                            messages,
                            detail.isWatching ? "project.unwatch" : "project.watch",
                          )}
                        </a>
                      </div>
                    </div>
                    <button
                      className="btn nofocus no-border down-arrow"
                      data-toggle="dropdown"
                      type="button"
                    >
                      {legacyMessage(
                        messages,
                        detail.isWatching ? "project.unwatch" : "project.watch",
                      )}
                    </button>
                  </div>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectNewPage(props: {
  basePath?: string;
  defaultProjectMenus?: string[];
  defaultProjectScope?: string;
  ownerOptions?: ProjectCreateOwnerOption[];
  onCreateProject?: (input: {
    board: boolean;
    code: boolean;
    issue: boolean;
    milestone: boolean;
    ownerName: string;
    overview: string;
    pullRequest: boolean;
    projectName: string;
    projectScope: string;
    review: boolean;
    vcs: string;
  }) => void;
  pending?: boolean;
  selectedOwnerName?: string;
}) {
  const { t: messages } = useLegacyMessages();
  const selectedOwnerName =
    props.selectedOwnerName ||
    props.ownerOptions?.find((option) => option.selected)?.ownerName ||
    props.ownerOptions?.[0]?.ownerName ||
    "";
  const [formState, setFormState] = React.useState({
    ownerName: selectedOwnerName,
    overview: "",
    projectName: "",
    projectScope: normalizeProjectDefaultScope(props.defaultProjectScope),
    vcs: "GIT",
    ...defaultProjectMenuSettings(props.defaultProjectMenus),
  });
  const [validationErrors, setValidationErrors] = React.useState<LegacyProjectFormValidationErrors>(
    {},
  );

  React.useEffect(() => {
    setFormState((current) => ({
      ...current,
      ownerName: selectedOwnerName,
    }));
  }, [selectedOwnerName]);

  const ownerOptions = props.ownerOptions?.length
    ? props.ownerOptions
    : selectedOwnerName
      ? [{ organization: false, ownerName: selectedOwnerName, selected: true }]
      : [];
  const importFormHref = `/_import?owner=${encodeURIComponent(formState.ownerName)}`;
  const ownerScope = normalizeProjectOwnerScope(
    ownerOptions,
    formState.ownerName,
    formState.projectScope,
  );
  const svnSelected = isLegacySubversionVcs(formState.vcs);

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="form-wrap new-project">
          <form
            className="frm-wrap"
            id="newProjectForm"
            onSubmit={(event) => {
              event.preventDefault();
              const errors = validateLegacyProjectForm({ projectName: formState.projectName });
              setValidationErrors(errors);
              if (hasLegacyProjectFormErrors(errors)) {
                return;
              }
              props.onCreateProject?.({
                ...formState,
                projectScope: ownerScope.projectScope,
              });
            }}
          >
            <legend>
              {legacyMessage(messages, "title.newProject")}
              <span>
                <small>{legacyMessage(messages, "project.import.or")} &nbsp; </small>
                <a className="ybtn ybtn-small nm" href={importFormHref}>
                  <strong>{legacyMessage(messages, "project.import.from.git")}</strong>
                </a>
              </span>
            </legend>
            <dl>
              <dt>
                <label htmlFor="project-owner">
                  {legacyMessage(messages, "project.owner")}{" "}
                  <strong className="orange-txt">*</strong>
                </label>
              </dt>
              <dd>
                <select
                  className="mb10"
                  data-format="user"
                  data-toggle="select2"
                  id="project-owner"
                  name="owner"
                  style={{ minWidth: 220 }}
                  value={formState.ownerName}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      ownerName: event.target.value,
                      projectScope: normalizeProjectOwnerScope(
                        ownerOptions,
                        event.target.value,
                        current.projectScope,
                      ).projectScope,
                    }))
                  }
                >
                  {ownerOptions.map((option) => (
                    <option
                      data-type={option.organization ? "group" : "user"}
                      key={option.ownerName}
                      value={option.ownerName}
                    >
                      {option.ownerName}
                    </option>
                  ))}
                </select>
              </dd>
              <dt>
                <label htmlFor="project-name">
                  {legacyMessage(messages, "project.name")}{" "}
                  <strong className="orange-txt">*</strong>
                </label>
              </dt>
              <dd>
                <input
                  className="text"
                  id="project-name"
                  maxLength={250}
                  name="name"
                  placeholder={legacyMessage(messages, "project.name.placeholder")}
                  type="text"
                  value={formState.projectName}
                  onBlur={(event) => {
                    const normalized = normalizeLegacyProjectNameOnFocusout(event.target.value);
                    setFormState((current) => ({
                      ...current,
                      projectName: normalized,
                    }));
                  }}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      projectName: event.target.value,
                    }))
                  }
                />
                <LegacyProjectFieldPopover
                  field="name"
                  messages={messages}
                  validationErrors={validationErrors}
                />
              </dd>
              <dt>
                <label htmlFor="description">
                  {legacyMessage(messages, "project.description")}
                </label>
              </dt>
              <dd>
                <textarea
                  className="text textarea.span4"
                  id="description"
                  name="overview"
                  value={formState.overview}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      overview: event.target.value,
                    }))
                  }
                />
              </dd>
            </dl>
            <div className="advanced-options">
              <div className="row-fluid">
                <div className="span2 right-txt mt10">
                  {legacyMessage(messages, "project.shareOption")}
                </div>
                <div className="span10">
                  <ul className="unstyled project-scopes mt10">
                    {[
                      {
                        id: "public",
                        label: "project.public",
                        notice: "project.public.notice",
                      },
                      {
                        id: "protected",
                        label: "project.protected",
                        notice: "project.protected.notice",
                      },
                      {
                        id: "private",
                        label: "project.private",
                        notice: "project.private.notice",
                      },
                    ].map((scope) => (
                      <li
                        className={scope.id === "public" ? undefined : "mt10"}
                        id={scope.id === "protected" ? "opt-protected" : undefined}
                        key={scope.id}
                        style={
                          scope.id === "protected" && !ownerScope.protectedVisible
                            ? { display: "none" }
                            : undefined
                        }
                      >
                        <input
                          checked={formState.projectScope === scope.id}
                          className="radio-btn pull-left"
                          id={scope.id}
                          name="projectScope"
                          onChange={() =>
                            setFormState((current) => ({
                              ...current,
                              projectScope: scope.id,
                            }))
                          }
                          type="radio"
                          value={scope.id.toUpperCase()}
                        />
                        <label htmlFor={scope.id}>
                          <strong className="ml5">{legacyMessage(messages, scope.label)}</strong>
                          <p className="note">{legacyMessage(messages, scope.notice)}</p>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <hr />
              <div className="row-fluid">
                <div className="span2 right-txt mt10">
                  <label htmlFor="vcs">{legacyMessage(messages, "project.vcs")}</label>
                </div>
                <div className="span10 cu-desc">
                  <select
                    className="mb10 mt5"
                    data-dropdown-css-class="select2-without-searchbox"
                    data-toggle="select2"
                    id="vcs"
                    name="vcs"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        pullRequest: isLegacySubversionVcs(event.target.value)
                          ? true
                          : current.pullRequest,
                        vcs: event.target.value,
                      }))
                    }
                    style={{ minWidth: 220 }}
                    value={formState.vcs}
                  >
                    <option value="GIT">
                      {legacyMessage(messages, "project.new.vcsType.git")}
                    </option>
                    <option value="SVN">
                      {legacyMessage(messages, "project.new.vcsType.subversion")}
                    </option>
                  </select>
                  <span
                    className="ml10 notice"
                    id="svn"
                    style={{ display: svnSelected ? undefined : "none" }}
                  >
                    {legacyMessage(messages, "project.svn.warning")}
                  </span>
                </div>
              </div>
              <hr />
              <div className="row-fluid">
                <div className="span2 right-txt">
                  {legacyMessage(messages, "project.menu.setting")}
                </div>
                <div className="span10">
                  {PROJECT_MENU_SETTINGS.map((item) => (
                    <label
                      className="bg-radiobtn label-public inline-list"
                      htmlFor={item.id}
                      key={item.key}
                    >
                      <input
                        checked={formState[item.key]}
                        className="radio-btn"
                        id={item.id}
                        name={item.name}
                        onChange={(event) => {
                          setFormState((current) => {
                            if (item.key === "code") {
                              return {
                                ...current,
                                ...normalizeProjectMenusForCodeToggle(
                                  current,
                                  event.target.checked,
                                ),
                              };
                            }
                            if (item.key === "pullRequest" || item.key === "review") {
                              return {
                                ...current,
                                ...normalizeProjectMenusForDependentCodeToggle(
                                  current,
                                  item.key,
                                  event.target.checked,
                                ),
                              };
                            }
                            return {
                              ...current,
                              [item.key]: event.target.checked,
                            };
                          });
                        }}
                        type="checkbox"
                        value="true"
                      />
                      {legacyMessage(messages, item.label)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="actions mt20">
              <button className="ybtn ybtn-success" disabled={props.pending} type="submit">
                {legacyMessage(messages, "project.create")}
              </button>
              <a className="ybtn" href="/">
                {legacyMessage(messages, "button.cancel")}
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function ProjectImportPage(props: {
  basePath?: string;
  csrfToken?: string;
  defaultProjectMenus?: string[];
  defaultProjectScope?: string;
  ownerOptions?: ProjectCreateOwnerOption[];
  onImportProject?: (input: {
    authId: string;
    authPw: string;
    board: boolean;
    code: boolean;
    issue: boolean;
    milestone: boolean;
    ownerName: string;
    overview: string;
    pullRequest: boolean;
    projectName: string;
    projectScope: string;
    review: boolean;
    url: string;
    vcs: string;
  }) => Promise<void> | void;
  pending?: boolean;
  selectedOwnerName?: string;
}) {
  const { t: messages } = useLegacyMessages();
  const selectedOwnerName =
    props.selectedOwnerName ||
    props.ownerOptions?.find((option) => option.selected)?.ownerName ||
    props.ownerOptions?.[0]?.ownerName ||
    "";
  const [repoAuthOpen, setRepoAuthOpen] = React.useState(false);
  const [formState, setFormState] = React.useState({
    authId: "",
    authPw: "",
    ownerName: selectedOwnerName,
    overview: "",
    projectName: "",
    projectScope: normalizeProjectDefaultScope(props.defaultProjectScope),
    url: "",
    vcs: "GIT",
    ...defaultProjectMenuSettings(props.defaultProjectMenus),
  });
  const [validationErrors, setValidationErrors] = React.useState<LegacyProjectFormValidationErrors>(
    {},
  );

  React.useEffect(() => {
    setFormState((current) => ({
      ...current,
      ownerName: selectedOwnerName,
    }));
  }, [selectedOwnerName]);

  const ownerOptions = props.ownerOptions?.length
    ? props.ownerOptions
    : selectedOwnerName
      ? [{ organization: false, ownerName: selectedOwnerName, selected: true }]
      : [];
  const createFormHref = `/projectform?owner=${encodeURIComponent(formState.ownerName)}`;
  const ownerScope = normalizeProjectOwnerScope(
    ownerOptions,
    formState.ownerName,
    formState.projectScope,
  );

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="form-wrap new-project">
          <form
            className="frm-wrap"
            id="importGit"
            onSubmit={(event) => {
              event.preventDefault();
              const errors = validateLegacyProjectForm({
                projectName: formState.projectName,
                url: formState.url,
              });
              setValidationErrors(errors);
              if (hasLegacyProjectFormErrors(errors) || !props.onImportProject) {
                return;
              }
              void props.onImportProject({
                ...formState,
                projectScope: ownerScope.projectScope,
              });
            }}
          >
            <input name="csrfToken" type="hidden" value={props.csrfToken ?? ""} />
            <legend>
              {legacyMessage(messages, "project.import.from.git")}
              <span>
                <small>{legacyMessage(messages, "project.import.or")} &nbsp; </small>
                <a className="ybtn ybtn-small nm" href={createFormHref}>
                  <strong>{legacyMessage(messages, "title.newProject")}</strong>
                </a>
              </span>
            </legend>
            <dl>
              <dt>
                <label htmlFor="url">
                  {legacyMessage(messages, "project.git.repository.url")}{" "}
                  <strong className="orange-txt">*</strong>
                </label>
              </dt>
              <dd>
                <input
                  className="text"
                  id="url"
                  name="url"
                  placeholder={legacyMessage(messages, "project.git.url.alert")}
                  type="text"
                  value={formState.url}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      url: event.target.value,
                    }))
                  }
                />
                <LegacyProjectFieldPopover
                  field="url"
                  messages={messages}
                  validationErrors={validationErrors}
                />
              </dd>
              <dt />
              <dd>
                <label className="checkbox" htmlFor="useRepoAuth">
                  <input
                    checked={repoAuthOpen}
                    id="useRepoAuth"
                    type="checkbox"
                    onChange={(event) => setRepoAuthOpen(event.target.checked)}
                  />
                  {legacyMessage(messages, "project.import.auth.required")}
                </label>
                <div
                  className="repo-auth-wrap"
                  id="repoAuth"
                  style={{ display: repoAuthOpen ? undefined : "none" }}
                >
                  <div className="row-fluid">
                    <dl className="span6">
                      <dt>{legacyMessage(messages, "project.import.auth.userid")}</dt>
                      <dd>
                        <input
                          className="text"
                          name="authId"
                          placeholder={legacyMessage(messages, "project.import.auth.userid.desc")}
                          type="text"
                          value={formState.authId}
                          onChange={(event) =>
                            setFormState((current) => ({
                              ...current,
                              authId: event.target.value,
                            }))
                          }
                        />
                      </dd>
                    </dl>
                    <dl className="span6">
                      <dt>{legacyMessage(messages, "project.import.auth.userpw")}</dt>
                      <dd>
                        <input
                          className="text"
                          name="authPw"
                          type="password"
                          value={formState.authPw}
                          onChange={(event) =>
                            setFormState((current) => ({
                              ...current,
                              authPw: event.target.value,
                            }))
                          }
                        />
                      </dd>
                    </dl>
                  </div>
                </div>
              </dd>
              <dt>
                <label htmlFor="project-owner">
                  {legacyMessage(messages, "project.owner")}{" "}
                  <strong className="orange-txt">*</strong>
                </label>
              </dt>
              <dd>
                <select
                  className="mb10"
                  data-format="user"
                  data-toggle="select2"
                  id="project-owner"
                  name="owner"
                  style={{ minWidth: 220 }}
                  value={formState.ownerName}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      ownerName: event.target.value,
                      projectScope: normalizeProjectOwnerScope(
                        ownerOptions,
                        event.target.value,
                        current.projectScope,
                      ).projectScope,
                    }))
                  }
                >
                  {ownerOptions.map((option) => (
                    <option
                      data-type={option.organization ? "group" : "user"}
                      key={option.ownerName}
                      value={option.ownerName}
                    >
                      {option.ownerName}
                    </option>
                  ))}
                </select>
              </dd>
              <dt>
                <label htmlFor="project-name">
                  {legacyMessage(messages, "project.name")}{" "}
                  <strong className="orange-txt">*</strong>
                </label>
              </dt>
              <dd>
                <input
                  className="text"
                  id="project-name"
                  maxLength={250}
                  name="name"
                  placeholder={legacyMessage(messages, "project.name.alert")}
                  type="text"
                  value={formState.projectName}
                  onBlur={(event) => {
                    const normalized = normalizeLegacyProjectNameOnFocusout(event.target.value);
                    setFormState((current) => ({
                      ...current,
                      projectName: normalized,
                    }));
                  }}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      projectName: event.target.value,
                    }))
                  }
                />
                <LegacyProjectFieldPopover
                  field="name"
                  messages={messages}
                  validationErrors={validationErrors}
                />
              </dd>
              <dt>
                <label htmlFor="description">
                  {legacyMessage(messages, "project.description")}
                </label>
              </dt>
              <dd>
                <textarea
                  className="text textarea.span4"
                  id="description"
                  name="overview"
                  value={formState.overview}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      overview: event.target.value,
                    }))
                  }
                />
              </dd>
            </dl>
            <div className="advanced-options">
              <div className="row-fluid">
                <div className="span2 right-txt mt10">
                  {legacyMessage(messages, "project.shareOption")}
                </div>
                <div className="span10">
                  <ul className="unstyled project-scopes mt10">
                    {[
                      {
                        id: "public",
                        label: "project.public",
                        notice: "project.public.notice",
                      },
                      {
                        id: "protected",
                        label: "project.protected",
                        notice: "project.protected.notice",
                      },
                      {
                        id: "private",
                        label: "project.private",
                        notice: "project.private.notice",
                      },
                    ].map((scope) => (
                      <li
                        className={scope.id === "public" ? undefined : "mt10"}
                        id={scope.id === "protected" ? "opt-protected" : undefined}
                        key={scope.id}
                        style={
                          scope.id === "protected" && !ownerScope.protectedVisible
                            ? { display: "none" }
                            : undefined
                        }
                      >
                        <input
                          checked={formState.projectScope === scope.id}
                          className="radio-btn pull-left"
                          id={scope.id}
                          name="projectScope"
                          type="radio"
                          value={scope.id.toUpperCase()}
                          onChange={() =>
                            setFormState((current) => ({
                              ...current,
                              projectScope: scope.id,
                            }))
                          }
                        />
                        <label htmlFor={scope.id}>
                          <strong className="ml5">{legacyMessage(messages, scope.label)}</strong>
                          <p className="note">{legacyMessage(messages, scope.notice)}</p>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <hr />
              <div className="row-fluid">
                <div className="span2 right-txt mt10">
                  <label htmlFor="vcs">{legacyMessage(messages, "project.vcs")}</label>
                </div>
                <div className="span10 cu-desc">
                  <select
                    className="mb10 mt5"
                    data-dropdown-css-class="select2-without-searchbox"
                    data-toggle="select2"
                    disabled
                    id="vcs"
                    name="vcs"
                    style={{ minWidth: 220 }}
                    defaultValue={formState.vcs}
                  >
                    <option value="GIT">
                      {legacyMessage(messages, "project.new.vcsType.git")}
                    </option>
                  </select>
                  <input name="vcs" type="hidden" value={formState.vcs} />
                </div>
              </div>
              <hr />
              <div className="row-fluid">
                <div className="span2 right-txt">
                  {legacyMessage(messages, "project.menu.setting")}
                </div>
                <div className="span10">
                  {PROJECT_MENU_SETTINGS.map((item) => (
                    <label
                      className="bg-radiobtn label-public inline-list"
                      htmlFor={item.id}
                      key={item.key}
                    >
                      <input
                        checked={formState[item.key]}
                        className="radio-btn"
                        id={item.id}
                        name={item.name}
                        type="checkbox"
                        value="true"
                        onChange={(event) => {
                          setFormState((current) => {
                            if (item.key === "code") {
                              return {
                                ...current,
                                ...normalizeProjectMenusForCodeToggle(
                                  current,
                                  event.target.checked,
                                ),
                              };
                            }
                            if (item.key === "pullRequest" || item.key === "review") {
                              return {
                                ...current,
                                ...normalizeProjectMenusForDependentCodeToggle(
                                  current,
                                  item.key,
                                  event.target.checked,
                                ),
                              };
                            }
                            return {
                              ...current,
                              [item.key]: event.target.checked,
                            };
                          });
                        }}
                      />
                      {legacyMessage(messages, item.label)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="actions mt20">
              <button className="ybtn ybtn-primary" disabled={props.pending} type="submit">
                {legacyMessage(messages, "project.create")}
              </button>
              <a className="ybtn" href="/">
                {legacyMessage(messages, "button.cancel")}
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function ProjectDetailPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  readmePost?: BoardPostDetail | null;
  routeHref?: string;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
  onEnrollProject?: (ownerName: string, projectName: string) => void;
  onCancelEnrollProject?: (ownerName: string, projectName: string) => void;
  onLeaveProject?: (ownerName: string, projectName: string, userId: number) => void;
  onToggleFavoriteProject?: (ownerName: string, projectName: string) => void;
  onToggleProjectWatch?: (ownerName: string, projectName: string, watching: boolean) => void;
  onUpdateProjectOverview?: (ownerName: string, projectName: string, overview: string) => void;
}) {
  const { t: defaultMessages } = useLegacyMessages();
  const messages = props.messages ?? defaultMessages;
  const detail = React.useMemo(
    () =>
      props.detail ?? {
        enrollmentRequested: false,
        isFavorited: false,
        organizationName: "",
        overview: "",
        ownerName: "",
        projectName: "",
        projectScope: "public",
        viewerCanEnroll: false,
        viewerCanLeave: false,
        viewerCanUpdate: false,
        viewerUserId: 0,
      },
    [props.detail],
  );
  const [editingOverview, setEditingOverview] = React.useState(false);
  const [overviewDraft, setOverviewDraft] = React.useState(detail.overview);
  const [leaveModalOpen, setLeaveModalOpen] = React.useState(false);

  React.useEffect(() => {
    setOverviewDraft(detail.overview);
  }, [detail.overview]);

  const activeTab =
    projectHomeTabFromHref(props.routeHref) ??
    normalizeProjectHomeTab(detail.defaultTab) ??
    "readme";
  const projectHref = buildProjectHref(props.runtimeConfig, detail.ownerName, detail.projectName);
  const projectLeaveHref = buildProjectHref(
    props.runtimeConfig,
    detail.ownerName,
    detail.projectName,
    `member/${detail.viewerUserId ?? 0}/delete`,
  );
  const isGitProject = !detail.vcs || detail.vcs.toLowerCase() === "git";

  return (
    <main className="app-shell">
      <ProjectHeader
        detail={detail}
        messages={messages}
        onCancelEnrollProject={props.onCancelEnrollProject}
        onEnrollProject={props.onEnrollProject}
        onToggleFavoriteProject={props.onToggleFavoriteProject}
        onToggleProjectWatch={props.onToggleProjectWatch}
        runtimeConfig={props.runtimeConfig}
      />
      <ProjectMenu activeMenu="home" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="project-breadcrumb hide show-in-mobile">
            <span className="project-author">
              <a href={prefixBasePath(props.runtimeConfig.basePath, `/${detail.ownerName}`)}>
                {detail.ownerName}
              </a>
            </span>
            <span className="project-separator">/</span>
            <span className="project-name">
              <a href={projectHref}>{detail.projectName}</a>
            </span>
            {detail.projectScope === "private" ? (
              <span className="project-private">
                <i className="yobicon-lock" />
              </span>
            ) : null}
          </div>
          <div className="project-home-header row-fluid">
            <div className="project-overview span9 span-hard-wrap">
              <div className="project-description" data-toggle="project-description-tab">
                <h3>
                  {detail.overview ? (
                    <MarkdownRenderer
                      className="markdown-wrap"
                      containerElement="span"
                      id="project-description"
                      markdown={detail.overview}
                      mentionReferences={[]}
                    />
                  ) : (
                    <span className="markdown-wrap" id="project-description">
                      {legacyMessage(messages, "project.description.placeholder")}
                    </span>
                  )}
                  {detail.overviewEditable || detail.viewerCanUpdate ? (
                    <button
                      aria-label={legacyMessage(messages, "button.edit")}
                      className="ybtn ybtn-minimum"
                      data-toggle="description-edit"
                      title={legacyMessage(messages, "button.edit")}
                      type="button"
                      onClick={() => setEditingOverview(true)}
                    >
                      <i className="yobicon-edit" />
                    </button>
                  ) : null}
                </h3>
              </div>
              {editingOverview ? (
                <div className="project-description-edit" data-toggle="project-description-tab">
                  <form
                    action={projectHref}
                    onSubmit={(event) => {
                      event.preventDefault();
                      props.onUpdateProjectOverview?.(
                        detail.ownerName,
                        detail.projectName,
                        overviewDraft,
                      );
                      setEditingOverview(false);
                    }}
                  >
                    <input
                      className="span6"
                      id="project-description-input"
                      name="overview"
                      placeholder={legacyMessage(messages, "project.description.placeholder")}
                      type="text"
                      value={overviewDraft}
                      onChange={(event) => setOverviewDraft(event.target.value)}
                    />
                    <button className="ybtn ybtn-success" id="descriptionSaveBtn" type="submit">
                      {legacyMessage(messages, "button.save")}
                    </button>{" "}
                    <button
                      className="ybtn"
                      data-toggle="description-cancel"
                      type="button"
                      onClick={() => setEditingOverview(false)}
                    >
                      {legacyMessage(messages, "button.cancel")}
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
            {detail.showCode ? (
              <div className="project-clone-wrap span3 hide-in-mobile">
                <input
                  aria-label={legacyMessage(messages, "code.copyUrl")}
                  className="project-clone-url"
                  id="cloneURL"
                  readOnly
                  title={legacyMessage(messages, "code.copyUrl")}
                  type="text"
                  value={detail.cloneUrl ?? ""}
                />
                <button
                  className="ybtn project-clone-button"
                  data-clipboard-target="cloneURL"
                  id="cloneURLBtn"
                  type="button"
                >
                  {legacyMessage(messages, "code.copyUrl")}
                </button>
              </div>
            ) : null}
          </div>
          <div className="row-fluid">
            <div className="span9 span-left-pane">
              <ul className="nav nav-tabs">
                <li className={activeTab === "readme" ? "active" : undefined}>
                  <a href={projectHref}>README</a>
                </li>
                <li className={activeTab === "history" ? "active" : undefined}>
                  <a href={`${projectHref}?tabId=history`}>
                    {legacyMessage(messages, "project.history.recent")}
                  </a>
                </li>
                <li className={activeTab === "dashboard" ? "active" : undefined}>
                  <a href={`${projectHref}?tabId=dashboard`}>
                    {legacyMessage(messages, "project.dashboard")}
                  </a>
                </li>
              </ul>
              <div className="tab-content">
                <div className="tab-pane active">
                  {activeTab === "readme" ? (
                    props.readmePost ? (
                      <article className="board-view project-readme-post">
                        <h3>{props.readmePost.title || "README"}</h3>
                        <MarkdownRenderer
                          className="readme-body markdown-wrap"
                          basePath={props.runtimeConfig?.basePath}
                          issueReferences={props.readmePost.issueReferences}
                          markdown={props.readmePost.bodyMarkdown}
                          mentionReferences={props.readmePost.mentionReferences}
                          ownerName={props.readmePost.ownerName}
                          projectName={props.readmePost.projectName}
                        />
                      </article>
                    ) : detail.readmeFile ? (
                      <article className="readme-wrap project-git-readme">
                        <header>
                          <strong>{detail.readmeFile.name || "README.md"}</strong>
                        </header>
                        <MarkdownRenderer
                          className="readme-body markdown-wrap"
                          basePath={props.runtimeConfig?.basePath}
                          markdown={detail.readmeFile.bodyMarkdown}
                          mentionReferences={detail.readmeFile.mentionReferences}
                          ownerName={detail.ownerName}
                          projectName={detail.projectName}
                        />
                      </article>
                    ) : (
                      <div className="bubble-wrap gray readme">
                        <p className="default">
                          {isGitProject ? (
                            <>
                              <span>{legacyMessage(messages, "project.readme")}</span>
                              <br />
                              <br />
                              {detail.viewerCanUpdate ? (
                                <a className="ybtn" href={`${projectHref}/postform?readme=true`}>
                                  {legacyMessage(messages, "project.readme.create")}
                                </a>
                              ) : null}
                            </>
                          ) : (
                            <span>{legacyMessage(messages, "project.svn.readme")}</span>
                          )}
                        </p>
                      </div>
                    )
                  ) : null}
                  {activeTab === "history" ? (
                    <ProjectHomeHistoryPane detail={detail} messages={props.messages} />
                  ) : null}
                  {activeTab === "dashboard" ? (
                    <ProjectHomeDashboardPane
                      detail={detail}
                      messages={messages}
                      runtimeConfig={props.runtimeConfig}
                    />
                  ) : null}
                </div>
              </div>
            </div>
            <div className="span3 span-right-pane">
              <div className="bubble-wrap gray project-home">
                <div className="project-btn-wrap">
                  {detail.showIssue ? (
                    <span className="project-btn-item">
                      <a className="ybtn ybtn-success" href={`${projectHref}/issues/new`}>
                        {legacyMessage(messages, "button.newIssue")}
                      </a>
                    </span>
                  ) : null}
                  {detail.showCode && isGitProject ? (
                    <span className="project-btn-item">
                      <a className="ybtn ybtn-inverse" href={`${projectHref}/newFork`}>
                        {legacyMessage(messages, "fork")}
                      </a>
                    </span>
                  ) : null}
                </div>
                {detail.showMilestone && detail.currentMilestone ? (
                  <div className="milestone-info">
                    <div className="meta-info">
                      <a
                        className="title"
                        href={buildProjectHref(
                          props.runtimeConfig,
                          detail.ownerName,
                          detail.projectName,
                          `milestone/${detail.currentMilestone.id}`,
                        )}
                      >
                        {detail.currentMilestone.title}
                      </a>
                      {detail.currentMilestone.dueDateLabel ? (
                        <span className="due-date">
                          {legacyMessage(messages, "label.dueDate")}{" "}
                          <strong>{detail.currentMilestone.dueDateLabel}</strong>
                        </span>
                      ) : null}
                    </div>
                    <div className="progress-wrap">
                      <div className="progress progress-success nm">
                        <div
                          className="bar"
                          style={{ width: `${detail.currentMilestone.completionPercent}%` }}
                        />
                      </div>
                      <div className="progress-info">
                        <span className="pull-right">
                          <strong>{`${detail.currentMilestone.closedIssueCount} / ${
                            detail.currentMilestone.openIssueCount +
                            detail.currentMilestone.closedIssueCount
                          }`}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
                <section className="inner member-info">
                  <header>
                    <h3>{legacyMessage(messages, "project.members")}</h3>
                    {detail.viewerCanUpdate ? (
                      <a
                        className="ybtn ybtn-minimum"
                        href={buildProjectHref(
                          props.runtimeConfig,
                          detail.ownerName,
                          detail.projectName,
                          "members",
                        )}
                        id="member-add-link"
                      >
                        <i className="yobicon-addfriend" /> {legacyMessage(messages, "button.add")}
                      </a>
                    ) : null}
                  </header>
                  <div className="member-wrap">
                    <ul className="project-members">
                      {(detail.members ?? []).map((member) => (
                        <li className="member" key={member.loginId}>
                          <a
                            className="avatar-wrap img-rounded pull-left small"
                            href={prefixBasePath(
                              props.runtimeConfig.basePath,
                              `/${member.loginId}`,
                            )}
                          >
                            <img
                              alt={member.loginId}
                              height="24"
                              src={member.avatarUrl}
                              width="24"
                            />
                          </a>
                          <a
                            className="name"
                            href={prefixBasePath(
                              props.runtimeConfig.basePath,
                              `/${member.loginId}`,
                            )}
                          >
                            <strong>{`${member.userLabel} (${member.loginId})`}</strong>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {detail.viewerCanLeave && detail.viewerUserId ? (
                    <button
                      className="ybtn ybtn-minimum ybtn-danger pull-right"
                      data-href={projectLeaveHref}
                      id="projectLeaveBtn"
                      onClick={(event) => {
                        event.preventDefault();
                        setLeaveModalOpen(true);
                      }}
                      type="button"
                    >
                      {legacyMessage(messages, "project.member.leave")}
                    </button>
                  ) : null}
                </section>
              </div>
            </div>
          </div>
          <div className={`modal${leaveModalOpen ? "" : " hide"}`} id="alertLeave">
            <div className="modal-header">
              <button
                aria-label={legacyMessage(messages, "button.close")}
                className="close"
                data-dismiss="modal"
                onClick={() => setLeaveModalOpen(false)}
                type="button"
              >
                <span aria-hidden="true">&times;</span>
              </button>
              <h3>{legacyMessage(messages, "project.member.leave")}</h3>
            </div>
            <div className="modal-body">
              <p>{legacyMessage(messages, "project.member.leaveConfirm")}</p>
            </div>
            <div className="modal-footer">
              <button
                className="ybtn ybtn-info ybtn-mini"
                id="leaveBtn"
                onClick={() =>
                  props.onLeaveProject?.(
                    detail.ownerName,
                    detail.projectName,
                    detail.viewerUserId ?? 0,
                  )
                }
                type="button"
              >
                {legacyMessage(messages, "button.yes")}
              </button>
              <button
                className="ybtn ybtn-mini"
                data-dismiss="modal"
                onClick={() => setLeaveModalOpen(false)}
                type="button"
              >
                {legacyMessage(messages, "button.no")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function ProjectWatchersPage(props: {
  detail: ProjectWatchersResponse | null | undefined;
  messages?: LegacyMessageLookup;
  projectDetail?: ProjectDetailViewModel | null | undefined;
  renderShell?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { t: contextMessages } = useLegacyMessages();
  const messages = props.messages ?? contextMessages;
  const detail = props.detail ?? {
    ownerName: "",
    projectName: "",
    totalCount: 0,
    watchers: [],
  };
  const shellDetail =
    props.projectDetail ??
    projectShellDetail({
      ownerName: detail.ownerName,
      projectName: detail.projectName,
    });

  const content = (
    <div className="project-page-wrap">
      <h4>
        <strong>{legacyMessage(messages, "project.watcher.title")}</strong>
      </h4>
      <p>{legacyMessage(messages, "project.watcher.description")}</p>
      <ul className="members project row-fluid">
        {detail.watchers.map((watcher) => (
          <li className="member span6 span-hard-wrap" key={watcher.loginId}>
            <a
              className="avatar-wrap mlarge pull-left mr10"
              href={prefixBasePath(props.runtimeConfig.basePath, `/${watcher.loginId}`)}
            >
              {watcher.avatarUrl ? (
                <img
                  alt={watcher.userLabel || watcher.loginId}
                  height={64}
                  src={watcher.avatarUrl}
                  width={64}
                />
              ) : null}
            </a>
            <div className="member-name">{watcher.userLabel || watcher.loginId}</div>
            <div className="member-id">{`@${watcher.loginId}`}</div>
          </li>
        ))}
      </ul>
    </div>
  );

  if (props.renderShell === false) {
    return content;
  }

  return (
    <main className="app-shell">
      <ProjectHeader detail={shellDetail} messages={messages} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu detail={shellDetail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">{content}</div>
    </main>
  );
}

export function ProjectMembersPage(props: {
  detail: ProjectMembersResponse | null | undefined;
  messages?: LegacyMessageLookup;
  pending?: boolean;
  projectDetail?: ProjectDetailViewModel | null | undefined;
  renderShell?: boolean;
  runtimeConfig: RuntimeConfig;
  onAddMember?: (loginId: string) => void;
  onDeleteMember?: (userId: number) => void;
  onUpdateMemberRole?: (userId: number, role: string) => void;
}) {
  const detail = props.detail ?? {
    enrollmentRequests: [],
    members: [],
    ownerName: "",
    projectName: "",
    roleOptions: [],
    viewerCanUpdate: false,
  };
  const [loginId, setLoginId] = React.useState("");
  const shellDetail =
    props.projectDetail ??
    projectShellDetail({
      enrollmentRequestCount: detail.enrollmentRequests.length,
      ownerName: detail.ownerName,
      projectName: detail.projectName,
      viewerCanUpdate: detail.viewerCanUpdate,
    });

  const content = (
    <div className="project-page-wrap">
      <ProjectSettingsSubMenu
        active="members"
        detail={shellDetail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <div className="inner-bubble">
        <form
          className="nm"
          id="addNewMember"
          onSubmit={(event) => {
            event.preventDefault();
            props.onAddMember?.(loginId);
          }}
        >
          <input
            autoComplete="off"
            className="text uname"
            data-provider="typeahead"
            id="loginId"
            name="loginId"
            onChange={(event) => setLoginId(event.target.value)}
            pattern="^[a-zA-Z0-9-]+([_.][a-zA-Z0-9-]+)*$"
            placeholder={legacyMessage(props.messages, "project.members.addMember")}
            required
            title={legacyMessage(props.messages, "user.wrongloginId.alert")}
            type="text"
            value={loginId}
          />
          <button className="ybtn ybtn-success" type="submit">
            <i className="yobicon-addfriend" /> {legacyMessage(props.messages, "button.add")}
          </button>
        </form>
      </div>

      <ul className="members project row-fluid">
        {detail.members.map((member) => (
          <li className="member span6 span-hard-wrap" key={member.userId}>
            <a
              className="avatar-wrap mlarge pull-left mr10"
              href={prefixBasePath(props.runtimeConfig.basePath, `/${member.loginId}`)}
            >
              {member.avatarUrl ? (
                <img
                  alt={`${member.userLabel || member.loginId} avatar`}
                  height={64}
                  src={member.avatarUrl}
                  width={64}
                />
              ) : null}
            </a>
            <div className="member-name">{member.userLabel || member.loginId}</div>
            <div className="member-id">{`@${member.loginId}`}</div>
            <div className="member-setting">
              {member.isOwner ? (
                <span className="label owner">
                  {legacyMessage(props.messages, "user.role.owner")}
                </span>
              ) : (
                <>
                  <div className="btn-group" data-name={`roleof-${member.loginId}`}>
                    <button
                      className="btn dropdown-toggle large"
                      data-toggle="dropdown"
                      type="button"
                    >
                      <span className="d-label">
                        {legacyMessage(props.messages, `user.role.${member.role}`)}
                      </span>
                      <span className="d-caret">
                        <span className="caret" />
                      </span>
                    </button>
                    <ul className="dropdown-menu">
                      {detail.roleOptions.map((roleOption) => (
                        <li
                          className={roleOption.role === member.role ? "active" : undefined}
                          data-selected={roleOption.role === member.role ? "true" : undefined}
                          data-value={roleOption.role}
                          key={`${member.userId}-${roleOption.role}`}
                        >
                          <a
                            data-action="apply"
                            data-href={`/${detail.ownerName}/${detail.projectName}/member/${member.userId}/edit`}
                            data-loginId={member.loginId}
                            href="#member-role"
                            onClick={(event) => {
                              event.preventDefault();
                              props.onUpdateMemberRole?.(member.userId, roleOption.role);
                            }}
                          >
                            {legacyMessage(props.messages, `user.role.${roleOption.label}`)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    className="ybtn ybtn-danger ybtn-small"
                    data-action="delete"
                    data-href={`/${detail.ownerName}/${detail.projectName}/member/${member.userId}/delete`}
                    onClick={(event) => {
                      event.preventDefault();
                      props.onDeleteMember?.(member.userId);
                    }}
                    type="button"
                  >
                    {legacyMessage(props.messages, "button.delete")}
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {detail.enrollmentRequests.length > 0 ? (
        <>
          <legend>
            <h3>
              {`${legacyMessage(props.messages, "project.member.enrollment.request")} (${detail.enrollmentRequests.length})`}
            </h3>
          </legend>
          <div className="row-fluid">
            {detail.enrollmentRequests.map((request) => (
              <div className="span2" key={request.userId}>
                <div className="pull-left mr10">
                  <a href={prefixBasePath(props.runtimeConfig.basePath, `/${request.loginId}`)}>
                    {request.avatarUrl ? (
                      <img
                        alt={`${request.userLabel || request.loginId} avatar`}
                        className="img-circle"
                        height={65}
                        src={request.avatarUrl}
                        width={65}
                      />
                    ) : null}
                  </a>
                </div>
                <div className="pull-left project-member-enrollment-info">
                  <span>
                    <a href={prefixBasePath(props.runtimeConfig.basePath, `/${request.loginId}`)}>
                      <strong>{request.userLabel || request.loginId}</strong>
                    </a>
                  </span>
                  <span>{`(${request.loginId})`}</span>
                  <button
                    className="ybtn ybtn-info ybtn-mini blue enrollAcceptBtn"
                    data-loginid={request.loginId}
                    onClick={() => props.onAddMember?.(request.loginId)}
                    type="button"
                  >
                    <i className="yobicon-addfriend" />{" "}
                    {legacyMessage(props.messages, "button.add")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );

  if (props.renderShell === false) {
    return content;
  }

  return (
    <main className="app-shell">
      <ProjectHeader
        detail={shellDetail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <ProjectMenu detail={shellDetail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">{content}</div>
    </main>
  );
}

export function ProjectWebhooksPage(props: {
  detail: ProjectWebhooksResponse | null | undefined;
  messages?: LegacyMessageLookup;
  pending?: boolean;
  projectDetail?: ProjectDetailViewModel | null | undefined;
  renderShell?: boolean;
  runtimeConfig: RuntimeConfig;
  onCreateWebhook?: (input: ProjectWebhookInput) => void;
  onDeleteWebhook?: (webhookId: number) => void;
}) {
  const detail = props.detail ?? {
    ownerName: props.projectDetail?.ownerName ?? "",
    projectName: props.projectDetail?.projectName ?? "",
    viewerCanUpdate: props.projectDetail?.viewerCanUpdate ?? false,
    deliveries: [],
    webhookTypes: ["SIMPLE", "DETAIL_SLACK", "DETAIL_HANGOUT_CHAT", "JSON"] as ProjectWebhookType[],
    webhooks: [],
  };
  const menuDetail: ProjectDetailViewModel = props.projectDetail
    ? {
        ...props.projectDetail,
        ownerName: detail.ownerName,
        projectName: detail.projectName,
        showCode: props.projectDetail.showCode ?? true,
        viewerCanUpdate: detail.viewerCanUpdate,
      }
    : {
        enrollmentRequested: false,
        isFavorited: false,
        organizationName: "",
        overview: "",
        ownerName: detail.ownerName,
        projectName: detail.projectName,
        projectScope: "public",
        showCode: true,
        viewerCanEnroll: false,
        viewerCanUpdate: detail.viewerCanUpdate,
      };
  const [formState, setFormState] = React.useState<ProjectWebhookInput>({
    gitPush: false,
    payloadUrl: "",
    secret: "",
    webhookType: "SIMPLE",
  });
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);
  const webhooksPath = `/${detail.ownerName}/${detail.projectName}/webhooks`;
  const webhookTypeLabels: Record<ProjectWebhookType, string> = {
    DETAIL_HANGOUT_CHAT: "Google Chat (Thread)",
    DETAIL_SLACK: "Slack (Meta)",
    JSON: "Continuous Integration tool (Only push event)",
    SIMPLE: "Messenger (Only text)",
  };

  const updateWebhookType = (webhookType: ProjectWebhookType) => {
    setFormState((current) => ({
      ...current,
      gitPush: webhookType === "JSON" ? true : false,
      webhookType,
    }));
  };

  const content = (
    <div className="project-page-wrap webhook-editor-wrap">
      <ProjectSettingsSubMenu
        active="webhooks"
        detail={menuDetail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <div className="content-wrap frm-wrap">
        {detail.viewerCanUpdate ? (
          <form
            className="new-webhook-wrap"
            id="formNewWebhook"
            onSubmit={(event) => {
              event.preventDefault();
              if (formState.payloadUrl.length === 0) {
                setValidationMessage("project.webhook.payloadUrl.empty");
                return;
              }
              setValidationMessage(null);
              props.onCreateWebhook?.(formState);
              setFormState({
                gitPush: false,
                payloadUrl: "",
                secret: "",
                webhookType: "SIMPLE",
              });
            }}
          >
            <strong className="form-legend">
              {legacyMessage(props.messages, "project.webhook.new")}
            </strong>
            <div className="form-wrap form-actions">
              <div>
                <input
                  autoComplete="off"
                  className="input-webhook-payload"
                  id="payloadUrl"
                  maxLength={2000}
                  name="payloadUrl"
                  onChange={(event) => {
                    setFormState((current) => ({
                      ...current,
                      payloadUrl: event.target.value,
                    }));
                    setValidationMessage(null);
                  }}
                  placeholder={legacyMessage(props.messages, "project.webhook.payloadUrl")}
                  type="text"
                  value={formState.payloadUrl}
                />
                <input
                  autoComplete="off"
                  className="input-webhook-secret"
                  id="secret"
                  maxLength={250}
                  name="secret"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      secret: event.target.value,
                    }))
                  }
                  placeholder={legacyMessage(props.messages, "project.webhook.secret")}
                  type="text"
                  value={formState.secret}
                />
                <button
                  className="ybtn ybtn-primary btn-submit"
                  disabled={props.pending}
                  type="submit"
                >
                  {legacyMessage(props.messages, "project.webhook.add")}
                </button>
              </div>
              <div>
                {detail.webhookTypes.map((webhookType) => (
                  <label className="radio inline" key={webhookType}>
                    <input
                      checked={formState.webhookType === webhookType}
                      name="webhookType"
                      onChange={() => updateWebhookType(webhookType)}
                      type="radio"
                      value={webhookType}
                    />
                    {` ${webhookTypeLabels[webhookType]}`}
                  </label>
                ))}
                <span className="radio inline"> | </span>
                <span className="radio inline"></span>
                <label className="checkbox inline" htmlFor="gitPush">
                  <input
                    checked={formState.gitPush}
                    className="form-check-input"
                    disabled={formState.webhookType === "JSON"}
                    id="gitPush"
                    name="gitPush"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        gitPush: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  {` ${legacyMessage(props.messages, "project.webhook.includeGitPush")}`}
                </label>
              </div>
            </div>
            {validationMessage ? (
              <div className="alert alert-error" role="alert">
                {legacyMessage(props.messages, validationMessage)}
              </div>
            ) : null}
            <div>{legacyMessage(props.messages, "project.webhook.help")}</div>
          </form>
        ) : null}

        <div className="webhook-list-wrap" id="webhooksList">
          {detail.webhooks.length === 0 ? (
            <div className="error-wrap">
              <i className="ico ico-err1" />
              <p>{legacyMessage(props.messages, "project.webhook.list.empty")}</p>
            </div>
          ) : (
            <>
              <div className="row-fluid list-head">
                <div className="span5 payload-url">
                  <strong>{legacyMessage(props.messages, "project.webhook.payloadUrl")}</strong>
                </div>
                <div className="span2 secret text-center">
                  <strong>{legacyMessage(props.messages, "project.webhook.secret")}</strong>
                </div>
                <div className="span2 secret text-center">
                  <strong>Type of message</strong>
                </div>
                <div className="span2 secret text-center">
                  <strong>Include git push events</strong>
                </div>
                <div className="span1 secret text-center"></div>
              </div>
              {detail.webhooks.map((webhook) => (
                <div
                  className="row-fluid list-item vertical-align"
                  data-webhook-id={webhook.id}
                  key={webhook.id}
                >
                  <div className="span5">
                    <h6 className="mr20 truncate">{webhook.payloadUrl}</h6>
                  </div>
                  <div className="span2 text-center">
                    <h6>{webhook.secret || "NONE"}</h6>
                  </div>
                  <div className="span2 text-center">
                    <h6>{webhook.webhookType}</h6>
                  </div>
                  <div className="span2 text-center">
                    <input
                      checked={webhook.gitPush}
                      onClick={(event) => event.preventDefault()}
                      readOnly
                      type="checkbox"
                    />
                  </div>
                  <div className="span1 text-center">
                    <button
                      className="ybtn ybtn-danger ybtn-small"
                      data-request-method="delete"
                      data-request-uri={prefixBasePath(
                        props.runtimeConfig.basePath,
                        `${webhooksPath}/${webhook.id}`,
                      )}
                      disabled={props.pending}
                      onClick={(event) => {
                        event.preventDefault();
                        props.onDeleteWebhook?.(webhook.id);
                      }}
                      type="button"
                    >
                      {legacyMessage(props.messages, "button.delete")}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (props.renderShell === false) {
    return content;
  }

  return (
    <main className="app-shell">
      <ProjectHeader
        detail={menuDetail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <ProjectMenu activeMenu="settings" detail={menuDetail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">{content}</div>
    </main>
  );
}

export function ProjectTransferPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  messages?: LegacyMessageLookup;
  onRequestTransfer?: (destination: string) => Promise<void>;
  pending?: boolean;
  renderShell?: boolean;
  runtimeConfig: RuntimeConfig;
  transfer: ProjectTransferResponse | null | undefined;
}) {
  const detail = props.detail ?? {
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
  const [accepted, setAccepted] = React.useState(false);
  const [destination, setDestination] = React.useState("");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);
  const canOpenTransferModal = accepted && !props.pending && props.transfer?.viewerCanTransfer;

  const content = (
    <div className="project-page-wrap">
      <ProjectSettingsSubMenu
        active="transfer"
        detail={detail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <div className="bubble-wrap gray wp">
        <div className="row-fluid">
          <div className="cu-label">
            {legacyMessage(props.messages, "project.transfer.new.owner")}
          </div>
          <div className="cu-desc">
            <p>
              <input
                autoComplete="off"
                id="owner"
                name="owner"
                onChange={(event) => {
                  setDestination(event.currentTarget.value);
                  setValidationMessage(null);
                }}
                type="text"
                value={destination}
              />
            </p>
          </div>
        </div>
        <div className="row-fluid">
          <div className="cu-label">{legacyMessage(props.messages, "project.transfer")}</div>
          <div className="cu-desc">
            <ul>
              <li className="notice">
                <strong>{legacyMessage(props.messages, "project.transfer.description1")}</strong>
              </li>
              <li className="notice">
                <strong>{legacyMessage(props.messages, "project.transfer.description2")}</strong>
              </li>
              <li className="notice">
                <strong>{legacyMessage(props.messages, "project.transfer.description3")}</strong>
              </li>
              <li className="notice">
                <strong>{legacyMessage(props.messages, "project.transfer.description4")}</strong>
              </li>
              <li className="notice">
                <strong>{legacyMessage(props.messages, "project.transfer.description5")}</strong>
              </li>
            </ul>
            <p>
              <input
                autoComplete="off"
                checked={accepted}
                className="checkbox"
                id="accept"
                name="accept"
                onChange={(event) => {
                  setAccepted(event.currentTarget.checked);
                  setValidationMessage(null);
                }}
                type="checkbox"
              />
              <label className="bg-checkbox label-agreement" htmlFor="accept">
                {legacyMessage(props.messages, "project.transfer.accept")}
              </label>
            </p>
          </div>
        </div>
      </div>
      {validationMessage ? (
        <div className="alert alert-error" role="alert">
          {legacyMessage(props.messages, validationMessage)}
        </div>
      ) : null}
      <div className="box-wrap bottom">
        <a
          className="ybtn ybtn-danger"
          data-toggle="modal"
          href="#alertTransfer"
          id="btnTransfer"
          onClick={(event) => {
            event.preventDefault();
            if (canOpenTransferModal) {
              setValidationMessage(null);
              setModalOpen(true);
            } else if (!accepted) {
              setValidationMessage("project.transfer.alert");
            }
          }}
        >
          <i className="yobicon-database" />{" "}
          {legacyMessage(props.messages, "project.transfer.this")}
        </a>
      </div>

      <div className={modalOpen ? "modal" : "modal hide"} id="alertTransfer">
        <div className="modal-header">
          <button
            aria-label={legacyMessage(props.messages, "button.close")}
            className="close"
            data-dismiss="modal"
            onClick={() => setModalOpen(false)}
            type="button"
          >
            ×
          </button>
          <h3>{legacyMessage(props.messages, "project.transfer.requestion")}</h3>
        </div>
        <div className="modal-body">
          <p>{legacyMessage(props.messages, "project.transfer.description")}</p>
          <p>{legacyMessage(props.messages, "project.transfer.reaccept")}</p>
          {props.transfer?.acceptPath ? <p>{props.transfer.acceptPath}</p> : null}
        </div>
        <div className="modal-footer">
          <button
            className="ybtn ybtn-danger"
            disabled={props.pending}
            id="btnTransferExec"
            onClick={() => {
              void props.onRequestTransfer?.(destination.trim());
            }}
            type="button"
          >
            {legacyMessage(props.messages, "button.yes")}
          </button>
          <button
            className="ybtn"
            data-dismiss="modal"
            onClick={() => setModalOpen(false)}
            type="button"
          >
            {legacyMessage(props.messages, "button.no")}
          </button>
        </div>
      </div>
    </div>
  );

  if (props.renderShell === false) {
    return content;
  }

  return (
    <main className="app-shell">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="settings" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">{content}</div>
    </main>
  );
}

export function ProjectForkPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  forkOptions: ProjectForkOptionsResponse | null | undefined;
  messages?: LegacyMessageLookup;
  onFork?: (input: { name: string; owner: string; projectScope: string }) => Promise<void>;
  pending?: boolean;
  renderShell?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { t: contextMessages } = useLegacyMessages();
  const messages = props.messages ?? contextMessages;
  const detail = props.detail ?? {
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
  const selected = props.forkOptions?.selected ?? {
    ownerName: detail.ownerName,
    projectName: detail.projectName,
    projectScope: detail.projectScope || "public",
  };
  const [owner, setOwner] = React.useState(selected.ownerName);
  const [name, setName] = React.useState(selected.projectName);
  const [projectScope, setProjectScope] = React.useState(() =>
    (selected.projectScope || "public").toLowerCase(),
  );

  React.useEffect(() => {
    setOwner(selected.ownerName);
    setName(selected.projectName);
    setProjectScope((selected.projectScope || "public").toLowerCase());
  }, [selected.ownerName, selected.projectName, selected.projectScope]);

  const ownerOptions = props.forkOptions?.ownerOptions.length
    ? props.forkOptions.ownerOptions
    : [
        {
          organization: false,
          ownerName: selected.ownerName,
          selected: true,
        },
      ];
  const existingForks = props.forkOptions?.existingForks ?? [];
  const selectedOwnerIsOrganization = ownerOptions.some(
    (option) => option.ownerName === owner && option.organization,
  );
  const canSubmit =
    Boolean(props.forkOptions?.canFork) && owner.trim().length > 0 && name.trim().length > 0;
  const content = (
    <div className="project-page-wrap">
      <div className="content-wrap frm-wrap">
        <form
          className="form-horizontal nm"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit || props.pending) {
              return;
            }
            void props.onFork?.({
              name: name.trim(),
              owner: owner.trim(),
              projectScope,
            });
          }}
        >
          <input name="owner" type="hidden" value={owner} />
          <fieldset>
            <legend>
              <h4>
                {detail.ownerName} / {detail.projectName} {legacyMessage(messages, "fork")}
              </h4>
            </legend>
            <div className="well" id="helpMessage">
              <div className="row-fluid">
                {existingForks.length === 0 ? (
                  <>
                    <div className="pull-left">
                      <img
                        alt={legacyMessage(messages, "fork")}
                        className="img-polaroid"
                        src={prefixBasePath(
                          props.runtimeConfig.basePath,
                          "/images/fork-pull/fork.jpg",
                        )}
                      />
                      <br />
                    </div>
                    <div className="pull-left help-messages">
                      <p className="lead">{legacyMessage(messages, "fork.help.title")}</p>
                      <p>{legacyMessage(messages, "fork.help.message.1")}</p>
                      <p>{legacyMessage(messages, "fork.help.message.2")}</p>
                    </div>
                  </>
                ) : (
                  <div className="help-messages center-txt">
                    <i className="ico ico-err2" />
                    <p>{legacyMessage(messages, "fork.already.exist")}</p>
                    {existingForks.map((fork) => (
                      <p key={`${fork.ownerName}/${fork.projectName}`}>
                        <strong className="vmiddle">
                          {`${detail.ownerName} / ${detail.projectName}`}
                        </strong>
                        <i className="yobicon-right vmiddle" />
                        <a
                          className="vmiddle primary-txt"
                          href={buildProjectHref(
                            props.runtimeConfig,
                            fork.ownerName,
                            fork.projectName,
                          )}
                        >
                          {`${fork.ownerName} / ${fork.projectName}`}
                        </a>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="control-group">
              <label className="control-label" htmlFor="project-owner">
                {legacyMessage(messages, "project.owner")}
              </label>
              <div className="controls">
                <select
                  id="project-owner"
                  name="owner"
                  onChange={(event) => setOwner(event.currentTarget.value)}
                  value={owner}
                >
                  {ownerOptions.map((option) => (
                    <option
                      data-owner-type={option.organization ? "organization" : "user"}
                      data-url={buildProjectHref(
                        props.runtimeConfig,
                        option.ownerName,
                        detail.projectName,
                      )}
                      key={option.ownerName}
                      value={option.ownerName}
                    >
                      {option.ownerName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="control-group">
              <label className="control-label" htmlFor="inputName">
                {legacyMessage(messages, "project.name")}
              </label>
              <div className="controls">
                <input
                  className="text"
                  id="inputName"
                  maxLength={250}
                  name="name"
                  onChange={(event) => setName(event.currentTarget.value)}
                  type="text"
                  value={name}
                />
                <span className="help-inline">{legacyMessage(messages, "project.name.alert")}</span>
              </div>
            </div>

            <div className="control-group project-share-option">
              <label className="control-label" htmlFor="public">
                {legacyMessage(messages, "project.shareOption")}
              </label>
              <div className="controls">
                {[
                  {
                    className: "bg-radiobtn label-public",
                    id: "public",
                    label: "project.public",
                  },
                  ...(selectedOwnerIsOrganization
                    ? [
                        {
                          className: "bg-radiobtn label-protected",
                          id: "protected",
                          label: "project.protected",
                        },
                      ]
                    : []),
                  {
                    className: "bg-radiobtn label-private",
                    id: "private",
                    label: "project.private",
                  },
                ].map((scope) => (
                  <label className={scope.className} htmlFor={scope.id} key={scope.id}>
                    <input
                      checked={projectScope === scope.id}
                      id={scope.id}
                      name="projectScope"
                      onChange={() => setProjectScope(scope.id)}
                      type="radio"
                      value={scope.id.toUpperCase()}
                    />
                    {legacyMessage(messages, scope.label)}
                  </label>
                ))}
              </div>
            </div>

            <div className="actions">
              <button
                className="ybtn ybtn-info"
                disabled={!canSubmit || props.pending}
                type="submit"
              >
                <i className="yobicon-fork" /> {legacyMessage(messages, "fork")}
              </button>
              <a
                className="ybtn"
                href={buildProjectHref(
                  props.runtimeConfig,
                  detail.ownerName,
                  detail.projectName,
                  "pullRequests",
                )}
              >
                {legacyMessage(messages, "button.cancel")}
              </a>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );

  if (props.renderShell === false) {
    return content;
  }

  return (
    <main className="app-shell">
      <ProjectHeader detail={detail} messages={messages} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="pullRequest" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">{content}</div>
    </main>
  );
}

export function ProjectChangeVcsPage(props: {
  changeVcs: ProjectChangeVcsResponse | null | undefined;
  detail: ProjectDetailViewModel | null | undefined;
  messages?: LegacyMessageLookup;
  onChangeVcs?: () => Promise<void>;
  pending?: boolean;
  renderShell?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? {
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
  const changeVcs = props.changeVcs ?? {
    currentVcs: "GIT",
    nextVcs: "Subversion",
    ownerName: detail.ownerName,
    projectName: detail.projectName,
    viewerCanChange: false,
  };
  const [accepted, setAccepted] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);
  const canOpenChangeVcsModal = accepted && changeVcs.viewerCanChange && !props.pending;

  const content = (
    <div className="project-page-wrap">
      <ProjectSettingsSubMenu
        active="vcs"
        detail={detail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <div className="bubble-wrap gray wp">
        <div className="row-fluid">
          <h3>
            {changeVcs.currentVcs} <i className="yobicon-right-2 vmiddle" /> {changeVcs.nextVcs}
          </h3>
          <div className="cu-desc">
            <ul>
              <li className="notice">
                <strong>
                  {legacyMessage(props.messages, "project.changeVCS.description1", {
                    args: [changeVcs.nextVcs],
                    fallback: "project.changeVCS.description1",
                  })}
                </strong>
              </li>
              <li className="notice">
                <strong>{legacyMessage(props.messages, "project.changeVCS.description2")}</strong>
              </li>
            </ul>
            <p>
              <input
                autoComplete="off"
                checked={accepted}
                className="checkbox"
                id="acceptChangeVCS"
                onChange={(event) => {
                  setAccepted(event.currentTarget.checked);
                  setValidationMessage(null);
                }}
                type="checkbox"
              />
              <label className="bg-checkbox label-agreement" htmlFor="acceptChangeVCS">
                {legacyMessage(props.messages, "project.changeVCS.accept")}
              </label>
            </p>
          </div>
        </div>
      </div>
      {validationMessage ? (
        <div className="alert alert-error" role="alert">
          {legacyMessage(props.messages, validationMessage)}
        </div>
      ) : null}
      <div className="box-wrap bottom">
        <a
          className="ybtn ybtn-danger"
          data-toggle="modal"
          href="#alertChangeVCS"
          id="btnChangeVCS"
          onClick={(event) => {
            event.preventDefault();
            if (canOpenChangeVcsModal) {
              setValidationMessage(null);
              setModalOpen(true);
            } else if (!accepted) {
              setValidationMessage("project.changeVCS.alert");
            }
          }}
        >
          <i className="yobicon-database" />{" "}
          {legacyMessage(props.messages, "project.changeVCS.this")}
        </a>
      </div>
      <div className={modalOpen ? "modal" : "modal hide"} id="alertChangeVCS">
        <div className="modal-header">
          <button
            aria-label={legacyMessage(props.messages, "button.close")}
            className="close"
            data-dismiss="modal"
            onClick={() => setModalOpen(false)}
            type="button"
          >
            ×
          </button>
          <h3>
            {legacyMessage(props.messages, "project.changeVCS.requestion", {
              args: [changeVcs.nextVcs],
              fallback: "project.changeVCS.requestion",
            })}
          </h3>
        </div>
        <div className="modal-body">
          <p>{legacyMessage(props.messages, "project.changeVCS.description2")}</p>
          <p>{legacyMessage(props.messages, "project.changeVCS.reaccept")}</p>
        </div>
        <div className="modal-footer">
          <button
            className="ybtn ybtn-danger"
            disabled={props.pending}
            id="btnChangeVCSExec"
            onClick={() => {
              void props.onChangeVcs?.();
            }}
            type="button"
          >
            {legacyMessage(props.messages, "button.yes")}
          </button>
          <button
            className="ybtn"
            data-dismiss="modal"
            onClick={() => setModalOpen(false)}
            type="button"
          >
            {legacyMessage(props.messages, "button.no")}
          </button>
        </div>
      </div>
    </div>
  );

  if (props.renderShell === false) {
    return content;
  }

  return (
    <main className="app-shell">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="settings" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">{content}</div>
    </main>
  );
}

const projectStatisticsBody = (
  <div className="project-page-wrap">
    <h1>Under Construction</h1>
  </div>
);

export function ProjectStatisticsPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  renderShell?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? {
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

  if (props.renderShell === false) {
    return projectStatisticsBody;
  }

  return (
    <main className="app-shell">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="issue" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">{projectStatisticsBody}</div>
    </main>
  );
}

export function ProjectSettingsSubMenu(props: {
  active: "delete" | "labels" | "members" | "setting" | "transfer" | "vcs" | "webhooks";
  detail: Pick<
    ProjectDetailViewModel,
    "enrollmentRequestCount" | "ownerName" | "projectName" | "showCode"
  >;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
}) {
  const { detail, runtimeConfig } = props;
  const itemClass = (name: typeof props.active) => (props.active === name ? "active" : undefined);

  return (
    <ul className="nav nav-tabs">
      <li className={itemClass("setting")} id="subMenuProjectSetting">
        <a
          href={buildProjectHref(
            runtimeConfig,
            detail.ownerName,
            detail.projectName,
            "settingform",
          )}
        >
          {legacyMessage(props.messages, "project.setting")}
        </a>
      </li>
      <li className={itemClass("members")} id="subMenuProjectMember">
        <a href={buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "members")}>
          {legacyMessage(props.messages, "project.member")}
          {(detail.enrollmentRequestCount ?? 0) > 0 ? (
            <span className="num-badge">{detail.enrollmentRequestCount}</span>
          ) : null}
        </a>
      </li>
      <li className={itemClass("labels")} id="subMenuIssueLabel">
        <a
          href={buildProjectHref(
            runtimeConfig,
            detail.ownerName,
            detail.projectName,
            "issue/labelsform",
          )}
        >
          {legacyMessage(props.messages, "issue.label")}
        </a>
      </li>
      <li className={itemClass("webhooks")} id="subMenuWebhook">
        <a href={buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "webhooks")}>
          {legacyMessage(props.messages, "project.webhook")}
        </a>
      </li>
      <li className={itemClass("transfer")} id="subMenuProjectTransfer">
        <a href={buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "transfer")}>
          {legacyMessage(props.messages, "project.transfer")}
        </a>
      </li>
      <li className={itemClass("delete")} id="subMenuProjectDelete">
        <a
          href={buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "deleteform")}
        >
          {legacyMessage(props.messages, "project.delete")}
        </a>
      </li>
      <li
        className={itemClass("vcs")}
        id="subMenuProjectChangeVCS"
        style={detail.showCode === false ? { display: "none" } : undefined}
      >
        <a
          href={buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "changeVCS")}
        >
          {legacyMessage(props.messages, "project.changeVCS")}
        </a>
      </li>
    </ul>
  );
}

export function ProjectDeletePage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  messages?: LegacyMessageLookup;
  pending?: boolean;
  renderShell?: boolean;
  runtimeConfig: RuntimeConfig;
  onDeleteProject?: (ownerName: string, projectName: string) => void;
}) {
  const detail = props.detail ?? {
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
  const [accepted, setAccepted] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);
  const canOpenDeleteModal = accepted && !props.pending;

  const content = (
    <div className="project-page-wrap">
      <ProjectSettingsSubMenu
        active="delete"
        detail={detail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />

      <div className="bubble-wrap gray wp">
        <div className="cu-label">{legacyMessage(props.messages, "project.delete")}</div>
        <div className="cu-desc">
          <p>
            <strong className="notice">
              {legacyMessage(props.messages, "project.delete.description")}
            </strong>
          </p>
          <p>
            <input
              autoComplete="off"
              checked={accepted}
              className="checkbox"
              id="accept"
              onChange={(event) => {
                setAccepted(event.target.checked);
                setValidationMessage(null);
              }}
              type="checkbox"
            />
            <label className="bg-checkbox label-agreement" htmlFor="accept">
              {legacyMessage(props.messages, "project.delete.accept")}
            </label>
          </p>
        </div>
      </div>
      {validationMessage ? (
        <div className="alert alert-error" role="alert">
          {legacyMessage(props.messages, validationMessage)}
        </div>
      ) : null}
      <div className="box-wrap bottom">
        <a
          className="ybtn ybtn-danger"
          data-toggle="modal"
          href="#alertDeletion"
          id="btnDelete"
          onClick={(event) => {
            event.preventDefault();
            if (canOpenDeleteModal) {
              setValidationMessage(null);
              setModalOpen(true);
            } else if (!accepted) {
              setValidationMessage("project.delete.alert");
            }
          }}
        >
          <i className="yobicon-database-remove" />{" "}
          {legacyMessage(props.messages, "project.delete.this")}
        </a>
      </div>

      <div className={modalOpen ? "modal" : "modal hide"} id="alertDeletion">
        <div className="modal-header">
          <button
            aria-label={legacyMessage(props.messages, "button.close")}
            className="close"
            data-dismiss="modal"
            onClick={() => setModalOpen(false)}
            type="button"
          >
            ×
          </button>
          <h3>{legacyMessage(props.messages, "project.delete.requestion")}</h3>
        </div>
        <div className="modal-body">
          <p>{legacyMessage(props.messages, "project.delete.description")}</p>
          <p>{legacyMessage(props.messages, "project.delete.reaccept")}</p>
        </div>
        <div className="modal-footer">
          <button
            className="ybtn ybtn-danger"
            disabled={props.pending}
            id="btnDeleteExec"
            onClick={() => props.onDeleteProject?.(detail.ownerName, detail.projectName)}
            type="button"
          >
            {legacyMessage(props.messages, "button.yes")}
          </button>
          <button
            className="ybtn"
            data-dismiss="modal"
            onClick={() => setModalOpen(false)}
            type="button"
          >
            {legacyMessage(props.messages, "button.no")}
          </button>
        </div>
      </div>
    </div>
  );

  if (props.renderShell === false) {
    return content;
  }

  return (
    <main className="app-shell">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="settings" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">{content}</div>
    </main>
  );
}

export function ProjectSettingsPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  messages?: LegacyMessageLookup;
  pending?: boolean;
  renderShell?: boolean;
  runtimeConfig: RuntimeConfig;
  onUpdateProjectSettings?: (input: {
    board: boolean;
    code: boolean;
    defaultBranch?: string;
    defaultReviewerCount: number;
    issue: boolean;
    isCodeAccessibleMemberOnly: boolean;
    isUsingReviewerCount: boolean;
    milestone: boolean;
    overview: string;
    ownerName: string;
    pullRequest: boolean;
    projectName: string;
    projectScope: string;
    review: boolean;
  }) => void;
  defaultBranch?: string;
  defaultBranchOptions?: Array<{ name: string; shortName?: string }>;
}) {
  const detail = React.useMemo(
    () =>
      props.detail ?? {
        enrollmentRequested: false,
        isFavorited: false,
        defaultReviewerCount: 1,
        isUsingReviewerCount: false,
        maxReviewerCount: 1,
        organizationName: "",
        overview: "",
        ownerName: "",
        projectName: "",
        projectScope: "public",
        viewerCanEnroll: false,
        viewerCanUpdate: false,
      },
    [props.detail],
  );
  const [formState, setFormState] = React.useState({
    defaultReviewerCount: Math.max(1, detail.defaultReviewerCount ?? 1),
    defaultBranch: props.defaultBranch ?? props.defaultBranchOptions?.[0]?.name ?? "",
    isCodeAccessibleMemberOnly: detail.codeMemberOnly === true,
    isUsingReviewerCount: detail.isUsingReviewerCount ?? false,
    overview: detail.overview,
    projectName: detail.projectName,
    projectScope: detail.projectScope,
    ...projectMenuSettingsFromDetail(detail),
  });
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFormState({
      defaultReviewerCount: Math.max(1, detail.defaultReviewerCount ?? 1),
      defaultBranch: props.defaultBranch ?? props.defaultBranchOptions?.[0]?.name ?? "",
      isCodeAccessibleMemberOnly: detail.codeMemberOnly === true,
      isUsingReviewerCount: detail.isUsingReviewerCount ?? false,
      overview: detail.overview,
      projectName: detail.projectName,
      projectScope: detail.projectScope,
      ...projectMenuSettingsFromDetail(detail),
    });
  }, [detail, props.defaultBranch, props.defaultBranchOptions]);
  const maxReviewerCount = Math.max(1, detail.maxReviewerCount ?? 1);
  const reviewerCountOptions = Array.from({ length: maxReviewerCount }, (_, index) => index + 1);
  const isGitProject = !detail.vcs || detail.vcs.toLowerCase() === "git";
  const logoUrl =
    detail.logoUrl ??
    prefixBasePath(props.runtimeConfig.basePath, "/assets/images/project_default_logo.png");
  const projectScopes = [
    { id: "public", label: "project.public", value: "PUBLIC" },
    ...(detail.organizationName
      ? [{ id: "protected", label: "project.protected", value: "PROTECTED" }]
      : []),
    { id: "private", label: "project.private", value: "PRIVATE" },
  ];

  const content = (
    <div className="project-page-wrap">
      <ProjectSettingsSubMenu
        active="setting"
        detail={detail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <form
        className="nm"
        encType="multipart/form-data"
        id="saveSetting"
        onSubmit={(event) => {
          event.preventDefault();
          if (!PROJECT_NAME_PATTERN.test(formState.projectName)) {
            setValidationMessage("project.name.alert");
            return;
          }
          if (PROJECT_RESERVED_NAMES.includes(formState.projectName)) {
            setValidationMessage("project.name.reserved.alert");
            return;
          }
          setValidationMessage(null);
          props.onUpdateProjectSettings?.({
            board: formState.board,
            code: formState.code,
            defaultBranch: formState.defaultBranch,
            defaultReviewerCount: formState.defaultReviewerCount,
            issue: formState.issue,
            isCodeAccessibleMemberOnly: formState.isCodeAccessibleMemberOnly,
            isUsingReviewerCount: formState.isUsingReviewerCount,
            milestone: formState.milestone,
            overview: formState.overview,
            ownerName: detail.ownerName,
            pullRequest: formState.pullRequest,
            projectName: formState.projectName,
            projectScope: formState.projectScope,
            review: formState.review,
          });
        }}
      >
        <div className="bubble-wrap gray" style={{ overflow: "visible" }}>
          <div className="box-wrap top clearfix frm-wrap" style={{ paddingTop: 20 }}>
            <div className="setting-box left">
              <div className="logo-wrap" style={{ backgroundImage: `url('${logoUrl}')` }} />
              <div className="logo-desc">
                <ul className="unstyled descs">
                  <li>
                    <strong>{legacyMessage(props.messages, "project.logo")}</strong>
                  </li>
                  <li>
                    {legacyMessage(props.messages, "project.logo.type")}{" "}
                    <span className="point">bmp, jpg, gif, png</span>
                  </li>
                  <li>
                    {legacyMessage(props.messages, "project.logo.maxFileSize")}{" "}
                    <span className="point">5MB</span>
                  </li>
                  <li>
                    <div className="btn-wrap">
                      <div className="nbtn medium white fake-file-wrap">
                        <i className="yobicon-upload" />{" "}
                        {legacyMessage(props.messages, "button.upload")}
                        <input
                          accept="image/*"
                          className="file"
                          id="logoPath"
                          name="logoPath"
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file && !isProjectLogoImageFile(file)) {
                              setValidationMessage("project.logo.alert");
                              event.currentTarget.value = "";
                            } else {
                              setValidationMessage(null);
                            }
                          }}
                          type="file"
                        />
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            <dl className="setting-box right">
              <dt>
                <label htmlFor="project-name">
                  {legacyMessage(props.messages, "project.name.placeholder")}
                </label>
              </dt>
              <dd>
                <input
                  data-content={legacyMessage(props.messages, "project.transfer.description6")}
                  data-placement="left"
                  data-trigger="focus"
                  id="project-name"
                  maxLength={250}
                  name="name"
                  value={formState.projectName}
                  onChange={(event) => {
                    setFormState((current) => ({
                      ...current,
                      projectName: event.target.value,
                    }));
                    setValidationMessage(null);
                  }}
                />
                <br />
              </dd>
              <dt>
                <label htmlFor="project-desc">
                  {legacyMessage(props.messages, "project.description.placeholder")}
                </label>
              </dt>
              <dd>
                <textarea
                  className="textarea"
                  id="project-desc"
                  maxLength={250}
                  name="overview"
                  value={formState.overview}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      overview: event.target.value,
                    }))
                  }
                />
              </dd>
            </dl>
          </div>
          {validationMessage ? (
            <div className="alert alert-error" role="alert">
              {legacyMessage(props.messages, validationMessage)}
            </div>
          ) : null}

          <div className="box-wrap middle">
            <div className="cu-label">{legacyMessage(props.messages, "project.shareOption")}</div>
            <div className="cu-desc">
              {projectScopes.map((scope) => (
                <React.Fragment key={scope.id}>
                  <input
                    checked={formState.projectScope === scope.id}
                    className="radio-btn"
                    id={scope.id}
                    name="projectScope"
                    type="radio"
                    value={scope.value}
                    onChange={() =>
                      setFormState((current) => ({
                        ...current,
                        projectScope: scope.id,
                      }))
                    }
                  />
                  <label className={`bg-radiobtn label-${scope.id}`} htmlFor={scope.id}>
                    {legacyMessage(props.messages, scope.label)}
                  </label>
                </React.Fragment>
              ))}
              <span className="note">
                {legacyMessage(props.messages, "project.private.notice")}
              </span>
            </div>
          </div>

          {isGitProject ? (
            <div className="box-wrap middle">
              <div className="cu-label">{legacyMessage(props.messages, "issue.template")}</div>
              <div className="cu-desc">
                <a
                  className="ybtn"
                  href={buildProjectHref(
                    props.runtimeConfig,
                    detail.ownerName,
                    detail.projectName,
                    "postform?issueTemplate=true",
                  )}
                  target="_blank"
                >
                  {legacyMessage(props.messages, "issue.template.edit")}
                </a>
              </div>
            </div>
          ) : null}

          <div className="box-wrap middle">
            <div className="cu-label">
              {legacyMessage(props.messages, "project.codeAccessible")}
            </div>
            <div className="cu-desc">
              <input
                checked={formState.isCodeAccessibleMemberOnly}
                className="radio-btn"
                id="codeAccessibleMemberOnly"
                name="isCodeAccessibleMemberOnly"
                type="radio"
                value="true"
                onChange={() =>
                  setFormState((current) => ({
                    ...current,
                    isCodeAccessibleMemberOnly: true,
                  }))
                }
              />
              <label className="bg-radiobtn label-public" htmlFor="codeAccessibleMemberOnly">
                {legacyMessage(props.messages, "button.yes")}
              </label>
              <input
                checked={!formState.isCodeAccessibleMemberOnly}
                className="radio-btn"
                id="codeAccessibleAnyone"
                name="isCodeAccessibleMemberOnly"
                type="radio"
                value="false"
                onChange={() =>
                  setFormState((current) => ({
                    ...current,
                    isCodeAccessibleMemberOnly: false,
                  }))
                }
              />
              <label className="bg-radiobtn label-private" htmlFor="codeAccessibleAnyone">
                {legacyMessage(props.messages, "button.no")}
              </label>
              <span className="note" />
            </div>
          </div>

          {isGitProject ? (
            <div
              className="box-wrap middle reviewer-count-wrap"
              id="reviewerCountSettingPanel"
              style={formState.code ? undefined : { display: "none" }}
            >
              <div className="cu-label vmiddle">
                {legacyMessage(props.messages, "project.reviewer.count")}
              </div>
              <div className="cu-desc">
                <input
                  checked={formState.isUsingReviewerCount}
                  className="radio-btn"
                  data-action="show"
                  data-toggle="reviewer-count"
                  id="reviewerCountEnable"
                  name="isUsingReviewerCount"
                  type="radio"
                  value="true"
                  onChange={() =>
                    setFormState((current) => ({
                      ...current,
                      isUsingReviewerCount: true,
                    }))
                  }
                />
                <label className="bg-radiobtn label-public" htmlFor="reviewerCountEnable">
                  {legacyMessage(props.messages, "project.reviewer.count.enable")}
                </label>
                <input
                  checked={!formState.isUsingReviewerCount}
                  className="radio-btn"
                  data-action="hide"
                  data-toggle="reviewer-count"
                  id="reviewerCountDisable"
                  name="isUsingReviewerCount"
                  type="radio"
                  value="false"
                  onChange={() =>
                    setFormState((current) => ({
                      ...current,
                      isUsingReviewerCount: false,
                    }))
                  }
                />
                <label className="bg-radiobtn label-private" htmlFor="reviewerCountDisable">
                  {legacyMessage(props.messages, "project.reviewer.count.disable")}
                </label>
                <div
                  className={formState.isUsingReviewerCount ? undefined : "hide"}
                  data-value={formState.isUsingReviewerCount ? "true" : "false"}
                  id="welReviewerCount"
                >
                  <div
                    className="btn-group branches"
                    data-id="project-reviewer-count"
                    data-name="defaultReviewerCount"
                  >
                    <button
                      className="btn dropdown-toggle large"
                      data-toggle="dropdown"
                      type="button"
                    >
                      <span className="d-label">{formState.defaultReviewerCount}</span>
                      <span className="d-caret">
                        <span className="caret" />
                      </span>
                    </button>
                    <ul className="dropdown-menu">
                      {reviewerCountOptions.map((count) => (
                        <li data-value={count} key={count}>
                          <a
                            href="#reviewer-count"
                            onClick={(event) => {
                              event.preventDefault();
                              setFormState((current) => ({
                                ...current,
                                defaultReviewerCount: count,
                              }));
                            }}
                          >
                            {count}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <span className="note ml10">
                    {legacyMessage(props.messages, "project.reviewer.count.description")}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {isGitProject ? (
            <div
              className="box-wrap middle"
              id="defaultBranceSettingPanel"
              style={formState.code ? undefined : { display: "none" }}
            >
              <div className="cu-label vmiddle">
                {legacyMessage(props.messages, "code.branches.defaultBranch")}
              </div>
              <div className="cu-desc">
                <select
                  data-dropdown-css-class="branches"
                  data-format="branch"
                  data-toggle="select2"
                  id="project-default-branch"
                  name="defaultBranch"
                  style={{ minWidth: 220 }}
                  value={formState.defaultBranch}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      defaultBranch: event.target.value,
                    }))
                  }
                >
                  {(props.defaultBranchOptions ?? []).map((branch) => (
                    <option key={branch.name} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <div className="box-wrap middle">
            <div className="cu-label vmiddle">
              {legacyMessage(props.messages, "project.menu.setting")}
            </div>
            <div className="cu-desc">
              {PROJECT_MENU_SETTINGS.map((item) => (
                <label
                  className="bg-radiobtn label-public inline-list"
                  htmlFor={item.id}
                  key={item.key}
                >
                  <input
                    checked={formState[item.key]}
                    className="radio-btn"
                    id={item.id}
                    name={item.name}
                    type="checkbox"
                    value="true"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        [item.key]: event.target.checked,
                      }))
                    }
                  />
                  {legacyMessage(props.messages, item.label)}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="box-wrap bottom">
          <button className="ybtn ybtn-success" disabled={props.pending} id="save" type="submit">
            {legacyMessage(props.messages, "button.save")}
          </button>
        </div>
      </form>
    </div>
  );

  if (props.renderShell === false) {
    return content;
  }

  return (
    <main className="app-shell">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="settings" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">{content}</div>
    </main>
  );
}
