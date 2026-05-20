import * as React from "react";
import {
  normalizeProjectDefaultScope,
  prefixBasePath,
  type RuntimeConfig,
} from "../runtime-config";
import type { BoardPostDetail } from "../api/boards";
import type {
  ProjectChangeVcsResponse,
  ProjectMembersResponse,
  ProjectTransferResponse,
  ProjectWebhookInput,
  ProjectWebhooksResponse,
  ProjectWebhookType,
  ProjectWatchersResponse,
} from "../api/org-project";
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
          <span className="name">issue.noAssignee</span>
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

function ProjectHomeHistoryPane(props: { detail: ProjectDetailViewModel }) {
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
                  <span>{`project.history.type.${item.itemType}`}</span>{" "}
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
  runtimeConfig: RuntimeConfig;
}) {
  const { detail, runtimeConfig } = props;
  const projectHref = (suffix = "") =>
    buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, suffix);
  const openIssueCount = detail.openIssueCount ?? 0;
  const pullRequestCount = detail.openPullRequestCount ?? 0;
  const milestonePercent = detail.currentMilestone?.completionPercent ?? 0;
  const dashboardAssignees = detail.dashboard?.assignees ?? [];
  const hasAssigneeDashboardData =
    detail.dashboard !== undefined &&
    (dashboardAssignees.length > 0 || detail.dashboard.unassignedOpenIssueCount !== undefined);
  const dashboardLabels = detail.dashboard?.labels ?? [];
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
              <h5>project.dashboard.openIssuesByAssignee</h5>
              <div className="overview-assignee">
                {openIssueCount === 0 ? (
                  <div className="empty">
                    <p>issue.is.empty</p>
                    <a className="ybtn ybtn-small" href={projectHref("issue/new")} target="_blank">
                      issue.menu.new
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
                      totalCount={openIssueCount}
                    />
                  </>
                ) : (
                  <ProjectDashboardMetric
                    count={openIssueCount}
                    href={projectHref("issues?state=open")}
                    label="issue.noAssignee"
                    percent={100}
                  />
                )}
              </div>

              <hr />

              <h5>project.dashboard.openIssuesByMilestone</h5>
              <div className="overview-milestone">
                {detail.currentMilestone ? (
                  <ProjectDashboardMetric
                    count={detail.currentMilestone.openIssueCount}
                    href={projectHref("milestones")}
                    label={detail.currentMilestone.title}
                    percent={milestonePercent}
                  />
                ) : (
                  <ProjectDashboardMetric
                    count={openIssueCount}
                    href={projectHref("issues?state=open")}
                    label="milestone.none"
                    percent={0}
                  />
                )}
              </div>
            </>
          ) : null}

          {detail.showPullRequest ? (
            <>
              {detail.showIssue ? <hr /> : null}
              <h5>project.dashboard.pullRequests</h5>
              <div className="overview-pullrequest">
                {pullRequestCount === 0 ? (
                  <div className="empty">
                    <p>pullRequest.is.empty</p>
                    <a
                      className="ybtn ybtn-small"
                      href={projectHref("newPullRequestForm")}
                      target="_blank"
                    >
                      pullRequest.new
                    </a>
                  </div>
                ) : (
                  <ProjectDashboardMetric
                    count={pullRequestCount}
                    href={projectHref("pullRequests")}
                    label="project.dashboard.pullRequests"
                    percent={100}
                  />
                )}
              </div>
            </>
          ) : null}
        </div>

        {detail.showIssue ? (
          <div className="span6">
            <h5>project.dashboard.openIssuesByLabel</h5>
            {dashboardLabelCategories.length > 0 ? (
              dashboardLabelCategories.map((category) => (
                <dl className="dl-horizontal overview-label" key={category.categoryName}>
                  <dt>{category.categoryName}</dt>
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
            ) : (
              <dl className="dl-horizontal overview-label">
                <dt>project.dashboard.openIssuesByLabel</dt>
                <dd>
                  <ProjectDashboardMetric
                    count={openIssueCount}
                    href={projectHref("issues?state=open")}
                    label="label.none"
                    percent={openIssueCount > 0 ? 100 : 0}
                  />
                </dd>
              </dl>
            )}
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

export function ProjectMenu(props: {
  detail: ProjectDetailViewModel;
  runtimeConfig: RuntimeConfig;
}) {
  const { detail, runtimeConfig } = props;
  const menuItems = [
    {
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName),
      label: "Home",
      show: true,
    },
    {
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "code"),
      label: "Code",
      show: detail.showCode,
    },
    {
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "issues"),
      label: `Issues ${detail.openIssueCount ?? 0}`,
      show: detail.showIssue,
    },
    {
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "pullRequests"),
      label: `Pull requests ${detail.openPullRequestCount ?? 0}`,
      show: detail.showPullRequest,
    },
    {
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "reviews"),
      label: `Reviews ${detail.reviewCount ?? 0}`,
      show: detail.showReview,
    },
    {
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "milestones"),
      label: "Milestones",
      show: detail.showMilestone,
    },
    {
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "posts"),
      label: `Boards ${detail.boardCount ?? 0}`,
      show: detail.showBoard,
    },
  ];

  return (
    <nav aria-label="Project menu">
      {menuItems.flatMap((item) =>
        item.show
          ? [
              <a href={item.href} key={item.label}>
                {item.label}
              </a>,
            ]
          : [],
      )}
      {detail.showAdmin || detail.viewerCanUpdate ? (
        <a
          href={buildProjectHref(
            runtimeConfig,
            detail.ownerName,
            detail.projectName,
            "settingform",
          )}
        >
          Settings
        </a>
      ) : null}
    </nav>
  );
}

export function ProjectNewPage(props: {
  defaultProjectMenus?: string[];
  defaultProjectScope?: string;
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
  }) => void;
  pending?: boolean;
}) {
  const [formState, setFormState] = React.useState({
    ownerName: "",
    overview: "",
    projectName: "",
    projectScope: normalizeProjectDefaultScope(props.defaultProjectScope),
    ...defaultProjectMenuSettings(props.defaultProjectMenus),
  });

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Create project</h1>
      <form
        className="runtime-grid"
        onSubmit={(event) => {
          event.preventDefault();
          props.onCreateProject?.(formState);
        }}
      >
        <label>
          <span>Owner</span>
          <input
            name="ownerName"
            type="text"
            value={formState.ownerName}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                ownerName: event.target.value,
              }))
            }
          />
        </label>
        <label>
          <span>Project name</span>
          <input
            name="projectName"
            type="text"
            value={formState.projectName}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                projectName: event.target.value,
              }))
            }
          />
        </label>
        <label>
          <span>Overview</span>
          <textarea
            name="overview"
            value={formState.overview}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                overview: event.target.value,
              }))
            }
          />
        </label>
        <label>
          <span>Visibility</span>
          <select
            name="projectScope"
            value={formState.projectScope}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                projectScope: event.target.value,
              }))
            }
          >
            <option value="public">public</option>
            <option value="protected">protected</option>
            <option value="private">private</option>
          </select>
        </label>
        <section className="menu-setting-wrap">
          <h2>Menu settings</h2>
          {PROJECT_MENU_SETTINGS.map((item) => (
            <label className="checkbox" htmlFor={item.id} key={item.key}>
              <input
                checked={formState[item.key]}
                id={item.id}
                name={item.name}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    [item.key]: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              {item.label}
            </label>
          ))}
        </section>
        <button type="submit">{props.pending ? "Creating…" : "Create project"}</button>
      </form>
    </main>
  );
}

export function ProjectDetailPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  readmePost?: BoardPostDetail | null;
  routeHref?: string;
  runtimeConfig: RuntimeConfig;
  onEnrollProject?: (ownerName: string, projectName: string) => void;
  onCancelEnrollProject?: (ownerName: string, projectName: string) => void;
  onToggleFavoriteProject?: (ownerName: string, projectName: string) => void;
  onToggleProjectWatch?: (ownerName: string, projectName: string, watching: boolean) => void;
  onUpdateProjectOverview?: (ownerName: string, projectName: string, overview: string) => void;
}) {
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
        viewerCanUpdate: false,
      },
    [props.detail],
  );
  const [editingOverview, setEditingOverview] = React.useState(false);
  const [overviewDraft, setOverviewDraft] = React.useState(detail.overview);

  React.useEffect(() => {
    setOverviewDraft(detail.overview);
  }, [detail.overview]);

  const activeTab =
    projectHomeTabFromHref(props.routeHref) ??
    normalizeProjectHomeTab(detail.defaultTab) ??
    "readme";

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>{`${detail.ownerName} / ${detail.projectName}`}</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      {detail.originOwnerName && detail.originProjectName ? (
        <p>{`Original project: ${detail.originOwnerName} / ${detail.originProjectName}`}</p>
      ) : null}
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <p>Scope: {detail.projectScope}</p>
      <section>
        <h2>Project actions</h2>
        <div className="runtime-grid">
          <button
            type="button"
            onClick={() => props.onToggleFavoriteProject?.(detail.ownerName, detail.projectName)}
          >
            {detail.isFavorited ? "Unfavorite project" : "Favorite project"}
          </button>
          {detail.viewerCanWatch ? (
            <button
              type="button"
              onClick={() =>
                props.onToggleProjectWatch?.(
                  detail.ownerName,
                  detail.projectName,
                  !detail.isWatching,
                )
              }
            >
              {detail.isWatching ? "Unwatch project" : "Watch project"}
            </button>
          ) : null}
          {detail.viewerCanEnroll ? (
            detail.enrollmentRequested ? (
              <button
                type="button"
                onClick={() => props.onCancelEnrollProject?.(detail.ownerName, detail.projectName)}
              >
                Cancel enrollment request
              </button>
            ) : (
              <button
                type="button"
                onClick={() => props.onEnrollProject?.(detail.ownerName, detail.projectName)}
              >
                Request enrollment
              </button>
            )
          ) : null}
        </div>
      </section>
      <section>
        <h2>Watchers</h2>
        <a
          className="btn watcher-count no-border"
          href={buildProjectHref(
            props.runtimeConfig,
            detail.ownerName,
            detail.projectName,
            "watchers",
          )}
        >
          {detail.watchCount ?? 0}
        </a>
      </section>
      <section>
        <h2>Clone URL</h2>
        <input readOnly type="text" value={detail.cloneUrl ?? ""} />
      </section>
      <section>
        <h2>Overview</h2>
        {editingOverview ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              props.onUpdateProjectOverview?.(detail.ownerName, detail.projectName, overviewDraft);
              setEditingOverview(false);
            }}
          >
            <textarea
              name="overview"
              value={overviewDraft}
              onChange={(event) => setOverviewDraft(event.target.value)}
            />
            <button type="submit">Save overview</button>
            <button type="button" onClick={() => setEditingOverview(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <>
            <p>{detail.overview || "No overview yet."}</p>
            {detail.overviewEditable ? (
              <button type="button" onClick={() => setEditingOverview(true)}>
                Edit overview
              </button>
            ) : null}
          </>
        )}
      </section>
      <section>
        <h2>Tabs</h2>
        <nav aria-label="Project home tabs">
          <a href={buildProjectHref(props.runtimeConfig, detail.ownerName, detail.projectName)}>
            README
          </a>
          <a
            href={`${buildProjectHref(props.runtimeConfig, detail.ownerName, detail.projectName)}?tabId=history`}
          >
            Recent history
          </a>
          <a
            href={`${buildProjectHref(props.runtimeConfig, detail.ownerName, detail.projectName)}?tabId=dashboard`}
          >
            Dashboard
          </a>
        </nav>
        <div>
          {activeTab === "readme" ? (
            props.readmePost ? (
              <article className="board-view project-readme-post">
                <h3>{props.readmePost.title || "README"}</h3>
                <div dangerouslySetInnerHTML={{ __html: props.readmePost.bodyHtml }} />
              </article>
            ) : detail.readmeFile ? (
              <article className="readme-wrap project-git-readme">
                <header>
                  <strong>{detail.readmeFile.name || "README.md"}</strong>
                </header>
                <div
                  className="readme-body markdown-wrap"
                  dangerouslySetInnerHTML={{ __html: detail.readmeFile.bodyHtml }}
                />
              </article>
            ) : (
              <>
                <h3>README</h3>
                <p>No README post yet.</p>
              </>
            )
          ) : null}
          {activeTab === "history" ? <ProjectHomeHistoryPane detail={detail} /> : null}
          {activeTab === "dashboard" ? (
            <ProjectHomeDashboardPane detail={detail} runtimeConfig={props.runtimeConfig} />
          ) : null}
        </div>
      </section>
      <section>
        <h2>Members</h2>
        <ul>
          {(detail.members ?? []).map((member) => (
            <li key={member.loginId}>
              {member.userLabel} @{member.loginId} ({member.role})
            </li>
          ))}
        </ul>
      </section>
      {detail.currentMilestone ? (
        <section>
          <h2>Current milestone</h2>
          <p>{detail.currentMilestone.title}</p>
          <p>{detail.currentMilestone.dueDateLabel}</p>
          <p>{`Open issues: ${detail.currentMilestone.openIssueCount}`}</p>
          <p>{`Closed issues: ${detail.currentMilestone.closedIssueCount}`}</p>
          <p>{`Progress: ${detail.currentMilestone.completionPercent}%`}</p>
        </section>
      ) : null}
    </main>
  );
}

export function ProjectWatchersPage(props: {
  detail: ProjectWatchersResponse | null | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? {
    ownerName: "",
    projectName: "",
    totalCount: 0,
    watchers: [],
  };

  return (
    <main className="app-shell">
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <h4>
            <strong>project.watcher.title</strong>
          </h4>
          <p>project.watcher.description</p>
          <ul className="members project row-fluid">
            {detail.watchers.map((watcher) => (
              <li className="member span6 span-hard-wrap" key={watcher.loginId}>
                <a
                  className="avatar-wrap mlarge pull-left mr10"
                  href={prefixBasePath(props.runtimeConfig.basePath, `/${watcher.loginId}`)}
                >
                  {watcher.avatarUrl ? (
                    <img
                      alt={`${watcher.userLabel || watcher.loginId} avatar`}
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
      </div>
    </main>
  );
}

export function ProjectMembersPage(props: {
  detail: ProjectMembersResponse | null | undefined;
  pending?: boolean;
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
  const memberPath = `/${detail.ownerName}/${detail.projectName}/members`;

  return (
    <main className="app-shell">
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="inner-bubble">
            <form
              action={prefixBasePath(props.runtimeConfig.basePath, memberPath)}
              className="nm"
              id="addNewMember"
              method="post"
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
                placeholder="project.members.addMember"
                required
                title="user.wrongloginId.alert"
                type="text"
                value={loginId}
              />
              <button className="ybtn ybtn-success" type="submit">
                <i className="yobicon-addfriend" /> button.add
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
                    <span className="label owner">user.role.owner</span>
                  ) : (
                    <>
                      <div className="btn-group" data-name={`roleof-${member.loginId}`}>
                        <button
                          className="btn dropdown-toggle large"
                          data-toggle="dropdown"
                          type="button"
                        >
                          <span className="d-label">{`user.role.${member.role}`}</span>
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
                              <button
                                data-action="apply"
                                data-href={`/${detail.ownerName}/${detail.projectName}/member/${member.userId}/edit`}
                                data-loginid={member.loginId}
                                onClick={(event) => {
                                  event.preventDefault();
                                  props.onUpdateMemberRole?.(member.userId, roleOption.role);
                                }}
                                type="button"
                              >
                                {`user.role.${roleOption.label}`}
                              </button>
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
                        button.delete
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
                <h3>{`project.member.enrollment.request (${detail.enrollmentRequests.length})`}</h3>
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
                        <a
                          href={prefixBasePath(props.runtimeConfig.basePath, `/${request.loginId}`)}
                        >
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
                        <i className="yobicon-addfriend" /> button.add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export function ProjectWebhooksPage(props: {
  detail: ProjectWebhooksResponse | null | undefined;
  pending?: boolean;
  projectDetail?: ProjectDetailViewModel | null | undefined;
  runtimeConfig: RuntimeConfig;
  onCreateWebhook?: (input: ProjectWebhookInput) => void;
  onDeleteWebhook?: (webhookId: number) => void;
}) {
  const detail = props.detail ?? {
    ownerName: props.projectDetail?.ownerName ?? "",
    projectName: props.projectDetail?.projectName ?? "",
    viewerCanUpdate: props.projectDetail?.viewerCanUpdate ?? false,
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
  const webhooksPath = `/${detail.ownerName}/${detail.projectName}/webhooks`;

  const updateWebhookType = (webhookType: ProjectWebhookType) => {
    setFormState((current) => ({
      ...current,
      gitPush: webhookType === "JSON" ? true : false,
      webhookType,
    }));
  };

  return (
    <main className="app-shell">
      <ProjectMenu detail={menuDetail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap webhook-editor-wrap">
          <ProjectSettingsSubMenu
            active="webhooks"
            detail={menuDetail}
            runtimeConfig={props.runtimeConfig}
          />
          <div className="content-wrap frm-wrap">
            <form
              action={prefixBasePath(props.runtimeConfig.basePath, webhooksPath)}
              className="new-webhook-wrap"
              id="formNewWebhook"
              method="post"
              onSubmit={(event) => {
                event.preventDefault();
                props.onCreateWebhook?.(formState);
                setFormState({
                  gitPush: false,
                  payloadUrl: "",
                  secret: "",
                  webhookType: "SIMPLE",
                });
              }}
            >
              <fieldset>
                <legend className="form-legend">project.webhook.add</legend>
                <div className="form-wrap">
                  <label htmlFor="payloadUrl">project.webhook.payloadUrl</label>
                  <input
                    className="input-webhook-payload"
                    id="payloadUrl"
                    maxLength={2000}
                    name="payloadUrl"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        payloadUrl: event.target.value,
                      }))
                    }
                    required
                    type="url"
                    value={formState.payloadUrl}
                  />
                </div>
                <div className="form-wrap">
                  <label htmlFor="secret">project.webhook.secret</label>
                  <input
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
                    type="text"
                    value={formState.secret}
                  />
                </div>
                <div className="form-wrap">
                  {detail.webhookTypes.map((webhookType) => (
                    <label className="radio inline" key={webhookType}>
                      <input
                        checked={formState.webhookType === webhookType}
                        name="webhookType"
                        onChange={() => updateWebhookType(webhookType)}
                        type="radio"
                        value={webhookType}
                      />
                      {` project.webhook.type.${webhookType}`}
                    </label>
                  ))}
                </div>
                <div className="form-wrap">
                  <label className="checkbox" htmlFor="gitPush">
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
                    project.webhook.gitPush
                  </label>
                </div>
                <div className="form-wrap form-actions">
                  <button
                    className="ybtn ybtn-primary btn-submit"
                    disabled={props.pending}
                    type="submit"
                  >
                    button.add
                  </button>
                </div>
              </fieldset>
            </form>

            <div className="webhook-list-wrap" id="webhooksList">
              {detail.webhooks.length === 0 ? (
                <div className="error-wrap">
                  <i className="ico ico-err1" />
                  <p>project.webhook.list.empty</p>
                </div>
              ) : (
                <>
                  <div className="row-fluid list-head">
                    <div className="span5 payload-url">project.webhook.payloadUrl</div>
                    <div className="span2 secret text-center">project.webhook.secret</div>
                    <div className="span2 text-center">project.webhook.type</div>
                    <div className="span1 text-center">project.webhook.gitPush</div>
                    <div className="span2 text-right">button.delete</div>
                  </div>
                  {detail.webhooks.map((webhook) => (
                    <div
                      className="row-fluid list-item vertical-align"
                      data-webhook-id={webhook.id}
                      key={webhook.id}
                    >
                      <div className="span5 payload-url">{webhook.payloadUrl}</div>
                      <div className="span2 secret text-center">{webhook.secret || "NONE"}</div>
                      <div className="span2 text-center">{webhook.webhookType}</div>
                      <div className="span1 text-center">
                        <input checked={webhook.gitPush} readOnly type="checkbox" />
                      </div>
                      <div className="span2 text-right">
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
                          button.delete
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function ProjectTransferPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  onRequestTransfer?: (destination: string) => Promise<void>;
  pending?: boolean;
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
  const canSubmit =
    accepted &&
    destination.trim().length > 0 &&
    !props.pending &&
    props.transfer?.viewerCanTransfer;

  return (
    <main className="app-shell">
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <ProjectSettingsSubMenu
            active="transfer"
            detail={detail}
            runtimeConfig={props.runtimeConfig}
          />
          <div className="content-wrap frm-wrap">
            <section className="bubble-wrap gray wp">
              <h1>project.transfer</h1>
              <div className="row-fluid">
                <label className="cu-label" htmlFor="owner">
                  project.transfer.owner
                </label>
                <div className="cu-desc">
                  <input
                    autoComplete="off"
                    id="owner"
                    name="owner"
                    onChange={(event) => setDestination(event.currentTarget.value)}
                    type="text"
                    value={destination}
                  />
                </div>
              </div>
              <div className="row-fluid">
                <div className="cu-desc">
                  <input
                    checked={accepted}
                    className="checkbox"
                    id="accept"
                    name="accept"
                    onChange={(event) => setAccepted(event.currentTarget.checked)}
                    type="checkbox"
                  />
                  <label className="bg-checkbox label-agreement" htmlFor="accept">
                    project.transfer.accept
                  </label>
                </div>
              </div>
              <div className="box-wrap bottom">
                <button
                  className="ybtn ybtn-danger"
                  disabled={!canSubmit}
                  id="btnTransfer"
                  onClick={() => setModalOpen(true)}
                  type="button"
                >
                  project.transfer
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
      <div className={modalOpen ? "modal" : "modal hide"} id="alertTransfer">
        <div className="modal-header">
          <button
            aria-label="Close"
            className="close"
            onClick={() => setModalOpen(false)}
            type="button"
          >
            x
          </button>
          <h3>project.transfer</h3>
        </div>
        <div className="modal-body">
          <p>{`${detail.ownerName}/${detail.projectName} -> ${destination.trim()}`}</p>
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
            button.confirm
          </button>
          <button className="ybtn" onClick={() => setModalOpen(false)} type="button">
            button.cancel
          </button>
        </div>
      </div>
    </main>
  );
}

export function ProjectChangeVcsPage(props: {
  changeVcs: ProjectChangeVcsResponse | null | undefined;
  detail: ProjectDetailViewModel | null | undefined;
  onChangeVcs?: () => Promise<void>;
  pending?: boolean;
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
  const canSubmit = accepted && changeVcs.viewerCanChange && !props.pending;

  return (
    <main className="app-shell">
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <ProjectSettingsSubMenu
            active="vcs"
            detail={detail}
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
                    <strong>{`project.changeVCS.description1 ${changeVcs.nextVcs}`}</strong>
                  </li>
                  <li className="notice">
                    <strong>project.changeVCS.description2</strong>
                  </li>
                </ul>
                <p>
                  <input
                    autoComplete="off"
                    checked={accepted}
                    className="checkbox"
                    id="acceptChangeVCS"
                    onChange={(event) => setAccepted(event.currentTarget.checked)}
                    type="checkbox"
                  />
                  <label className="bg-checkbox label-agreement" htmlFor="acceptChangeVCS">
                    project.changeVCS.accept
                  </label>
                </p>
              </div>
            </div>
          </div>
          <div className="box-wrap bottom">
            <button
              className="ybtn ybtn-danger"
              data-toggle="modal"
              disabled={!canSubmit}
              id="btnChangeVCS"
              onClick={() => setModalOpen(true)}
              type="button"
            >
              <i className="yobicon-database" /> project.changeVCS.this
            </button>
          </div>
          <div className={modalOpen ? "modal" : "modal hide"} id="alertChangeVCS">
            <div className="modal-header">
              <button
                className="close"
                data-dismiss="modal"
                onClick={() => setModalOpen(false)}
                type="button"
              >
                x
              </button>
              <h3>{`project.changeVCS.requestion ${changeVcs.nextVcs}`}</h3>
            </div>
            <div className="modal-body">
              <p>project.changeVCS.description2</p>
              <p>project.changeVCS.reaccept</p>
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
                button.yes
              </button>
              <button
                className="ybtn"
                data-dismiss="modal"
                onClick={() => setModalOpen(false)}
                type="button"
              >
                button.no
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function ProjectStatisticsPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
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

  return (
    <main className="app-shell">
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <h1>Under Construction</h1>
        </div>
      </div>
    </main>
  );
}

function ProjectSettingsSubMenu(props: {
  active: "delete" | "labels" | "members" | "setting" | "transfer" | "vcs" | "webhooks";
  detail: Pick<ProjectDetailViewModel, "ownerName" | "projectName" | "showCode">;
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
          project.setting
        </a>
      </li>
      <li className={itemClass("members")} id="subMenuProjectMember">
        <a href={buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "members")}>
          project.member
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
          issue.label
        </a>
      </li>
      <li className={itemClass("webhooks")} id="subMenuWebhook">
        <a href={buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "webhooks")}>
          project.webhook
        </a>
      </li>
      <li className={itemClass("transfer")} id="subMenuProjectTransfer">
        <a href={buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "transfer")}>
          project.transfer
        </a>
      </li>
      <li className={itemClass("delete")} id="subMenuProjectDelete">
        <a
          href={buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "deleteform")}
        >
          project.delete
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
          project.changeVCS
        </a>
      </li>
    </ul>
  );
}

export function ProjectDeletePage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  pending?: boolean;
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

  return (
    <main className="app-shell">
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <ProjectSettingsSubMenu
            active="delete"
            detail={detail}
            runtimeConfig={props.runtimeConfig}
          />

          <div className="bubble-wrap gray wp">
            <div className="cu-label">project.delete</div>
            <div className="cu-desc">
              <p>
                <strong className="notice">project.delete.description</strong>
              </p>
              <p>
                <input
                  autoComplete="off"
                  checked={accepted}
                  className="checkbox"
                  id="accept"
                  onChange={(event) => setAccepted(event.target.checked)}
                  type="checkbox"
                />
                <label className="bg-checkbox label-agreement" htmlFor="accept">
                  project.delete.accept
                </label>
              </p>
            </div>
          </div>
          <div className="box-wrap bottom">
            <button
              className="ybtn ybtn-danger"
              data-toggle="modal"
              disabled={!accepted || props.pending}
              id="btnDelete"
              onClick={() => setModalOpen(true)}
              type="button"
            >
              <i className="yobicon-database-remove" /> project.delete.this
            </button>
          </div>

          <div className={modalOpen ? "modal" : "modal hide"} id="alertDeletion">
            <div className="modal-header">
              <button
                className="close"
                data-dismiss="modal"
                onClick={() => setModalOpen(false)}
                type="button"
              >
                x
              </button>
              <h3>project.delete.requestion</h3>
            </div>
            <div className="modal-body">
              <p>project.delete.description</p>
              <p>project.delete.reaccept</p>
            </div>
            <div className="modal-footer">
              <button
                className="ybtn ybtn-danger"
                disabled={props.pending}
                id="btnDeleteExec"
                onClick={() => props.onDeleteProject?.(detail.ownerName, detail.projectName)}
                type="button"
              >
                button.yes
              </button>
              <button
                className="ybtn"
                data-dismiss="modal"
                onClick={() => setModalOpen(false)}
                type="button"
              >
                button.no
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function ProjectSettingsPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
  onUpdateProjectSettings?: (input: {
    board: boolean;
    code: boolean;
    issue: boolean;
    milestone: boolean;
    overview: string;
    ownerName: string;
    pullRequest: boolean;
    projectName: string;
    projectScope: string;
    review: boolean;
  }) => void;
}) {
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
        viewerCanUpdate: false,
      },
    [props.detail],
  );
  const [formState, setFormState] = React.useState({
    overview: detail.overview,
    projectScope: detail.projectScope,
    ...projectMenuSettingsFromDetail(detail),
  });

  React.useEffect(() => {
    setFormState({
      overview: detail.overview,
      projectScope: detail.projectScope,
      ...projectMenuSettingsFromDetail(detail),
    });
  }, [detail]);

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Project settings</h1>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <form
        className="runtime-grid"
        onSubmit={(event) => {
          event.preventDefault();
          props.onUpdateProjectSettings?.({
            board: formState.board,
            code: formState.code,
            issue: formState.issue,
            milestone: formState.milestone,
            overview: formState.overview,
            ownerName: detail.ownerName,
            pullRequest: formState.pullRequest,
            projectName: detail.projectName,
            projectScope: formState.projectScope,
            review: formState.review,
          });
        }}
      >
        <label>
          <span>Project location</span>
          <input
            readOnly
            name="projectSlug"
            type="text"
            value={`${detail.ownerName}/${detail.projectName}`}
          />
        </label>
        <label>
          <span>Project name</span>
          <input name="projectName" readOnly type="text" value={detail.projectName} />
        </label>
        <label>
          <span>Overview</span>
          <textarea
            name="overview"
            value={formState.overview}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                overview: event.target.value,
              }))
            }
          />
        </label>
        <label>
          <span>Visibility</span>
          <select
            name="projectScope"
            value={formState.projectScope}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                projectScope: event.target.value,
              }))
            }
          >
            <option value="public">public</option>
            <option value="protected">protected</option>
            <option value="private">private</option>
          </select>
        </label>
        <section className="menu-setting-wrap">
          <h2>Menu settings</h2>
          {PROJECT_MENU_SETTINGS.map((item) => (
            <label className="checkbox" htmlFor={item.id} key={item.key}>
              <input
                checked={formState[item.key]}
                id={item.id}
                name={item.name}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    [item.key]: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              {item.label}
            </label>
          ))}
        </section>
        <p>Code access is members only: {(detail.codeMemberOnly ?? false) ? "Yes" : "No"}</p>
        <button type="submit">{props.pending ? "Saving…" : "Save project"}</button>
      </form>
    </main>
  );
}
