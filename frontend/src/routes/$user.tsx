import * as React from "react";
import { type CSSProperties, type HTMLAttributes, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Navigate, redirect } from "@tanstack/react-router";
import { currentSessionQueryOptions } from "../api/session";
import { RestApiError } from "../api/rest-client";
import { readPublicUserProfileQueryOptions, type PublicUserProfileResponse } from "../api/users";
import type {
  WorkspaceIssueItem,
  WorkspaceMemberProjectItem,
  WorkspaceProfile,
  WorkspacePullRequestItem,
  YoramLabel,
  YoramRecord,
} from "../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";

type PublicProfileSearch = {
  daysAgo?: number;
  selected?: "issues" | "projects" | "pullRequests";
};

type LegacyIssueRowAttributes = HTMLAttributes<HTMLLIElement> & { href: string };

type UsermenuTab = "myOrganizationList" | "myProjectList" | "myRecentIssueList";

const LEGACY_LINK_PROPS = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

const SHOW_SUBTASKS_POPOVER_STYLE: CSSProperties = {
  bottom: "100%",
  display: "block",
  left: "50%",
  marginBottom: "10px",
  minWidth: "150px",
  pointerEvents: "none",
  position: "absolute",
  transform: "translateX(-50%)",
};

export const Route = createFileRoute("/$user")({
  component: PublicProfileRoute,
  validateSearch(search: Record<string, unknown>): PublicProfileSearch {
    const daysAgo = Number(search.daysAgo);
    const selected = stringSearch(search.selected, "issues");
    return {
      daysAgo: Number.isFinite(daysAgo) && daysAgo > 0 ? daysAgo : 14,
      selected: isProfileTab(selected) ? selected : "issues",
    };
  },
  beforeLoad: ({ location, params }) => {
    if (params.user === "reset-password") {
      throw redirect({
        href: `/resetPassword${location.searchStr}`,
        replace: true,
      });
    }
  },
});

function PublicProfileRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <PublicProfileScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function PublicProfileScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { user } = Route.useParams();
  const search = Route.useSearch();
  const daysAgo = search.daysAgo ?? 14;
  const selected = search.selected ?? "issues";
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const profileQuery = useQuery(
    readPublicUserProfileQueryOptions(runtimeConfig, {
      daysAgo,
      loginId: user,
      selected,
    }),
  );
  const redirectPath = profileQuery.data?.redirectPath;

  if (profileQuery.error instanceof RestApiError && profileQuery.error.status === 404) {
    return <PublicProfileNotFoundPage runtimeConfig={runtimeConfig} />;
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} />;
  }

  if (!profileQuery.data || !sessionQuery.data) {
    return <SiteLayoutShell runtimeConfig={runtimeConfig}>{null}</SiteLayoutShell>;
  }

  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig}>
      <PublicProfileBody
        daysAgo={daysAgo}
        profileResponse={profileQuery.data}
        runtimeConfig={runtimeConfig}
        selected={selected}
        viewerIsGuest={
          sessionQuery.data.isAnonymous !== false || sessionQuery.data.isGuest === true
        }
      />
    </SiteLayoutShell>
  );
}

function PublicProfileNotFoundPage({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const siteName = runtimeConfig.siteName ?? "Yoram";
  const [activeUsermenuTab, setActiveUsermenuTab] =
    React.useState<UsermenuTab>("myOrganizationList");

  return (
    <>
      <header className="gnb-outer">
        <div className="gnb-inner">
          <Link {...LEGACY_LINK_PROPS} to="/" className="logo">
            <h1 className="blind">{siteName}</h1>
          </Link>
          <ul className="gnb-nav">
            <li>
              <Link {...LEGACY_LINK_PROPS} to="/projects" search={{ filter: "", labelIds: "" }}>
                {t("title.projectList")}
              </Link>
            </li>
            <li>
              <Link {...LEGACY_LINK_PROPS} to="/_help">
                {t("title.help")}
              </Link>
            </li>
            {runtimeConfig.feedbackUrl ? (
              <li>
                <Link to="/" href={runtimeConfig.feedbackUrl} target="_blank">
                  {t("title.yobi.feedback")}
                </Link>
              </li>
            ) : null}
          </ul>
          <div id="mySidenav" className="sidenav">
            <div className="span5 right-menu span-hard-wrap">
              <div className="row-fluid user-menu-wrap">
                <span className="user-menu">
                  <Link to="/" href="/user/anonymous" reloadDocument>
                    {t("userinfo.profile")}
                  </Link>
                </span>
                <span className="user-menu">
                  <Link to="/user/editform" reloadDocument>
                    {t("userinfo.accountSetting")}
                  </Link>
                </span>
                <Link to="/" href="/logout" reloadDocument>
                  <span className="user-menu logout label">{t("title.logout")}</span>
                </Link>
              </div>
              <PublicProfileUsermenuTabs
                activeTab={activeUsermenuTab}
                labels={{
                  myOrganizationList: t("title.favorite"),
                  myProjectList: t("title.project"),
                  myRecentIssueList: t("title.recently.visited.issue"),
                }}
                onSelect={setActiveUsermenuTab}
              />
              <div className="tab-content tab-box">
                <div id="usermenu-tab-content-list" className="tab-content">
                  {"Loading..."}
                </div>
              </div>
            </div>
          </div>
          <ul className="gnb-usermenu">
            <li className="gnb-usermenu-item" id="required-logged-in">
              <Link
                to="/users/loginform"
                reloadDocument
                className="user-item-btn"
                data-login="required"
              >
                {t("title.login")}
              </Link>
            </li>
            <li className="divider"></li>
            <li>
              <Link to="/users/signupform" reloadDocument className="ybtn ybtn-success">
                {t("title.signup")}
              </Link>
            </li>
          </ul>
        </div>
      </header>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="error-wrap">
            <i className="ico ico-err2"></i>
            <p>{t("user.notExists.name")}</p>
            <Link {...LEGACY_LINK_PROPS} to="/" className="ybtn ybtn-info">
              {t("menu.home")}
            </Link>
          </div>
        </div>
      </div>
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">Yoram authors</span>
        </div>
      </footer>
    </>
  );
}

function PublicProfileUsermenuTabs({
  activeTab,
  labels,
  onSelect,
}: {
  activeTab: UsermenuTab;
  labels: Record<UsermenuTab, string>;
  onSelect: (tab: UsermenuTab) => void;
}) {
  const tabs: UsermenuTab[] = ["myOrganizationList", "myProjectList", "myRecentIssueList"];

  return (
    <ul className="nav nav-tabs nm">
      {tabs.map((tab) => (
        <li className={`${tab}${activeTab === tab ? " active" : ""}`} key={tab}>
          <button type="button" onClick={() => onSelect(tab)}>
            {labels[tab]}
          </button>
        </li>
      ))}
    </ul>
  );
}

function PublicProfileBody({
  daysAgo,
  profileResponse,
  runtimeConfig,
  selected,
  viewerIsGuest,
}: {
  daysAgo: number;
  profileResponse: PublicUserProfileResponse;
  runtimeConfig: RuntimeConfig;
  selected: PublicProfileSearch["selected"];
  viewerIsGuest: boolean;
}) {
  const { t } = useLegacyMessages();
  const [activeTab, setActiveTab] = useState(selected);
  const [activeIssueTab, setActiveIssueTab] = useState<"closedIssues" | "openIssues">("openIssues");
  const profile = profileResponse.profile;
  if (!profile) {
    return null;
  }
  const issues = profileResponse.issueItems;
  const openIssues = issues.filter((issue) => stringField(issue, "state") === "open");
  const closedIssues = issues.filter((issue) => stringField(issue, "state") === "closed");

  return (
    <>
      <title>{profile.loginId}</title>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>{profile.displayName}</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <section className="user-box">
            <div className="user-info-box">
              <div
                className="whoami-wrap"
                style={{ backgroundImage: `url('${profile.avatarUrl}')` }}
              >
                {profile.isGuest ? (
                  <div className="guest-user">
                    <span className="left-mark">OUR GUEST</span>
                  </div>
                ) : null}
              </div>
              <div className="whoami usf-group">
                <span className="name">{profile.englishName}</span>
                <span className="loginid">@{profile.loginId}</span>
                {runtimeConfig.showUserEmail && profile.primaryEmailAddress ? (
                  <span className="email">{profile.primaryEmailAddress}</span>
                ) : null}
                {profileResponse.viewerCanEditProfile ? (
                  <div className="edit">
                    <Link
                      to="/user/editform"
                      reloadDocument
                      className="ybtn ybtn-default ybtn-mini"
                    >
                      <i className="yobicon-edit"></i> {t("userinfo.editProfile")}
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="user-status">
                {profile.isSiteAdmin ? (
                  <span className="badge label-success">SITE ADMIN</span>
                ) : null}
              </div>
              <div className="user-status">
                {profile.isBlocked ? <span className="badge label-important">BLOCKED</span> : null}
              </div>
              <div className="user-since">
                <strong>{t("userinfo.since")}</strong>
                <span className="since">{profile.sinceLabel}</span>
              </div>
              <div className="user-since">
                <div>
                  <strong>{t("user.connected.social.login")}</strong>
                </div>
                <div className="auth-provider-logo">
                  {profile.connectedSocialProviders.map((provider) => (
                    <ConnectedSocialProviderLogo
                      basePath={runtimeConfig.basePath}
                      key={provider}
                      provider={provider}
                    />
                  ))}
                </div>
              </div>
            </div>

            {!viewerIsGuest ? (
              <div className="user-stream-box">
                <div className="pull-right">
                  {t("userinfo.daysAgo.prefix")}
                  <input
                    id="daysAgoBtn"
                    name="daysAgo"
                    type="number"
                    min="1"
                    max="99"
                    className="input-mini-min"
                    defaultValue={daysAgo}
                    style={{ margin: "0px 5px", verticalAlign: "bottom" }}
                  />
                  {t("userinfo.daysAgo.suffix")}
                </div>

                <ul className="nav nav-tabs">
                  <ProfileTab
                    active={activeTab === "issues"}
                    badge={issues.length}
                    label={t("menu.issue")}
                    onSelect={() => setActiveTab("issues")}
                  />
                  <ProfileTab
                    active={activeTab === "pullRequests"}
                    badge={profileResponse.pullRequestItems.length}
                    label={t("menu.pullRequest")}
                    onSelect={() => setActiveTab("pullRequests")}
                  />
                  <ProfileTab
                    active={activeTab === "projects"}
                    badge={profileResponse.memberProjects.length}
                    label={t("project.projects")}
                    onSelect={() => setActiveTab("projects")}
                  />
                  <li>
                    <TwoColumnModeCheckbox />
                  </li>
                </ul>

                <div className="tab-content">
                  <div id="issues" className={`tab-pane ${activeTab === "issues" ? "active" : ""}`}>
                    <ul className="nav nav-tabs nm">
                      <li className={activeIssueTab === "openIssues" ? "active" : ""}>
                        <button type="button" onClick={() => setActiveIssueTab("openIssues")}>
                          {t("issue.state.open")}
                          <span className="num-badge">{openIssues.length}</span>
                        </button>
                      </li>
                      <li className={activeIssueTab === "closedIssues" ? "active" : ""}>
                        <button type="button" onClick={() => setActiveIssueTab("closedIssues")}>
                          {t("issue.state.closed")}
                          <span className="num-badge">{closedIssues.length}</span>
                        </button>
                      </li>
                      <li>
                        <ShowSubtasksCheckbox />
                      </li>
                    </ul>
                    <div className="tab-content">
                      <div
                        id="openIssues"
                        className={`tab-pane ${activeIssueTab === "openIssues" ? "active" : ""}`}
                      >
                        {issues.length === 0 ? (
                          <div className="error-wrap">
                            <p>{`${t("userinfo.daysAgo.prefix")} ${t("issue.is.empty")}`}</p>
                          </div>
                        ) : null}
                        <ul className="post-list-wrap my-issues row-fluid">
                          {openIssues.map((issue) => (
                            <ProfileIssueRow
                              basePath={runtimeConfig.basePath}
                              issue={issue}
                              key={issueKey(issue)}
                            />
                          ))}
                        </ul>
                      </div>
                      <div
                        id="closedIssues"
                        className={`tab-pane ${activeIssueTab === "closedIssues" ? "active" : ""}`}
                      >
                        {issues.length === 0 ? (
                          <div className="error-wrap">
                            <p>{`${t("userinfo.daysAgo.prefix")} ${t("issue.is.empty")}`}</p>
                          </div>
                        ) : null}
                        <ul className="post-list-wrap my-issues row-fluid">
                          {closedIssues.map((issue) => (
                            <ProfileIssueRow
                              basePath={runtimeConfig.basePath}
                              issue={issue}
                              key={issueKey(issue)}
                            />
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div
                    id="pullRequests"
                    className={`tab-pane ${activeTab === "pullRequests" ? "active" : ""}`}
                  >
                    {profileResponse.pullRequestItems.length === 0 ? (
                      <div className="error-wrap">
                        <p>{`${t("userinfo.daysAgo.prefix")} ${t("pullRequest.is.empty")}`}</p>
                      </div>
                    ) : null}
                    <ul className="post-list-wrap  row-fluid">
                      {profileResponse.pullRequestItems.map((pullRequest) => (
                        <ProfilePullRequestRow
                          key={pullRequestKey(pullRequest)}
                          pullRequest={pullRequest}
                        />
                      ))}
                    </ul>
                  </div>
                  <div
                    id="projects"
                    className={`tab-pane ${activeTab === "projects" ? "active" : ""}`}
                  >
                    {profileResponse.memberProjects.length === 0 ? (
                      <div className="error-wrap">
                        <p>{t("project.is.empty")}</p>
                      </div>
                    ) : null}
                    <ul className="user-streams all-projects">
                      {profileResponse.memberProjects.map((project) => (
                        <ProfileProjectRow
                          key={`${project.ownerName}/${project.projectName}`}
                          project={project}
                          subject={profile}
                        />
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="user-stream-box"></div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function ProfileTab({
  active,
  badge,
  label,
  onSelect,
}: {
  active: boolean;
  badge: number;
  label: string;
  onSelect: () => void;
}) {
  return (
    <li className={active ? "active" : ""}>
      <button type="button" onClick={onSelect}>
        {label} {badge > 0 ? <span className="num-badge">{badge}</span> : null}
      </button>
    </li>
  );
}

function ConnectedSocialProviderLogo({
  basePath,
  provider,
}: {
  basePath: string;
  provider: string;
}) {
  const normalized = provider.trim().toLowerCase();

  if (normalized === "github") {
    return (
      <span className="github">
        <svg aria-hidden="true" height="24" version="1.1" viewBox="0 0 16 16" width="19">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38C13.71 14.53 16 11.53 16 8 16 3.58 12.42 0 8 0z" />
        </svg>
      </span>
    );
  }

  if (normalized === "google") {
    return (
      <span className="google">
        {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy TemplateHelper.GoogleLogo renders this provider image without an alt attribute. */}
        <img
          src={prefixBasePath(
            basePath,
            "/assets/images/provider-logo/btn_google_light_normal_ios.svg",
          )}
        />
      </span>
    );
  }

  return null;
}

function ProfileIssueRow({ basePath, issue }: { basePath: string; issue: WorkspaceIssueItem }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(issue, "ownerName");
  const projectName = stringField(issue, "projectName");
  const issueNumber = numberField(issue, "issueNumber");
  const issueId = numberField(issue, "id", issueNumber);
  const projectPath = `/${ownerName}/${projectName}`;
  const issuePath = `${projectPath}/issue/${issueNumber}`;
  const issueHref = prefixBasePath(basePath, issuePath);
  const labels = sortedWorkspaceIssueLabels(issue.labels ?? []);
  const milestoneId = numberField(issue, "milestoneId");
  const milestoneTitle = stringField(issue, "milestoneTitle");
  const dueDateLabel = stringField(issue, "dueDateLabel");
  const dueDateOverdue = Boolean(issue.dueDateOverdue);
  const dueDateText = stringField(issue, "dueDateText");
  const issueState = stringField(issue, "state");
  const legacyIssueRowAttrs = {
    className: "post-item title",
    href: issueHref,
    id: `issue-item-${issueId}`,
  } satisfies LegacyIssueRowAttributes;

  return (
    <li {...legacyIssueRowAttrs}>
      <div className="span12 span-hard-wrap">
        <div className="span2 project-name-in-my-issues fixed-height-my-issues-list">
          <span className="infos-item project-name">
            <Link
              {...LEGACY_LINK_PROPS}
              to={projectPath}
              className="title project"
              title={t("project.name")}
            >
              {projectName}
            </Link>
          </span>
          <span className="infos-item post-id">#{issueNumber}</span>
        </div>
        <div className="title-wrap span5">
          <span className="title-cell">
            <Link {...LEGACY_LINK_PROPS} to={issuePath} className="title">
              {stringField(issue, "title")}
            </Link>
            <ProfileIssueCommentCount issue={issue} issuePath={issuePath} />
            <span className="for-subtask-progressbar">
              <ProfileIssueSubtaskSummary
                issue={issue}
                ownerName={ownerName}
                projectName={projectName}
              />
            </span>
            {labels.map((label) => (
              <Link
                {...LEGACY_LINK_PROPS}
                to="/$ownerName/$projectName/issues"
                params={{ ownerName, projectName }}
                search={{
                  assigneeId: "",
                  authorId: "",
                  commenterId: "",
                  dueDate: "",
                  filter: "",
                  labelIds: [String(label.id)],
                  milestoneId: "",
                  orderBy: "updatedDate",
                  orderDir: "desc",
                  pageNum: 1,
                  state: "open",
                }}
                className="label issue-label list-label"
                data-label-id={String(label.id)}
                key={String(label.id)}
                style={{ background: label.color }}
              >
                {label.name}
              </Link>
            ))}
            <div className="child-issue-list hide">
              <ProfileIssueChildRows
                issues={issue.childIssues ?? []}
                ownerName={ownerName}
                projectName={projectName}
              />
            </div>
          </span>
        </div>
        <div className="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list">
          <ProfilePersonLink
            label={stringField(issue, "authorLabel")}
            loginId={stringField(issue, "authorLoginId")}
          />
        </div>
        <div className="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list">
          <ProfilePersonLink
            label={stringField(issue, "assigneeLabel")}
            loginId={stringField(issue, "assigneeLoginId")}
          />
        </div>
        <div className="infos span3 meta">
          <span className="meta-cell">
            <span className="hide show-in-mobile">
              <ProfilePersonLink
                label={stringField(issue, "assigneeLabel")}
                loginId={stringField(issue, "assigneeLoginId")}
              />
            </span>
            <span className="infos-item" title={stringField(issue, "updatedLabel")}>
              {stringField(issue, "updatedLabel")}
            </span>
            {milestoneId > 0 && milestoneTitle ? (
              <span className="mileston-tag">
                <Link
                  {...LEGACY_LINK_PROPS}
                  to="/$ownerName/$projectName/milestone/$milestoneId"
                  params={{ ownerName, projectName, milestoneId: String(milestoneId) }}
                  search={{ state: "open" }}
                  title={t("milestone")}
                >
                  {milestoneTitle}
                </Link>
              </span>
            ) : null}
            {dueDateLabel ? (
              <span
                className={`pull-right ${dueDateOverdue ? "overdue" : ""}`}
                title={`${t("issue.dueDate")}: ${dueDateLabel}`}
              >
                <i className="yobicon-clock2"></i>
                {issueState === "open" && dueDateOverdue
                  ? t("issue.dueDate.overdue")
                  : issueState === "open"
                    ? dueDateText || dueDateLabel
                    : dueDateLabel}
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </li>
  );
}

function ProfileIssueSubtaskSummary({
  issue,
  ownerName,
  projectName,
}: {
  issue: WorkspaceIssueItem;
  ownerName: string;
  projectName: string;
}) {
  const childClosedCount = numberField(issue, "childClosedCount");
  const childOpenCount = numberField(issue, "childOpenCount");
  const childTotalCount = childClosedCount + childOpenCount;
  const percentage = childTotalCount ? Math.trunc((childClosedCount / childTotalCount) * 100) : 0;
  const parentIssueNumber = numberField(issue, "parentIssueNumber");
  const parentIssueTitle = stringField(issue, "parentIssueTitle");

  return (
    <>
      {childTotalCount ? (
        <>
          <div
            className={`subtask-progress upload-progress ${
              percentage === 100 ? "done-outline" : "red-outline"
            }`}
          >
            <div
              className={`bar ${percentage === 100 ? "done" : "red"}`}
              style={{ width: `${percentage}%` }}
              title="Subtask"
            ></div>
          </div>
          <span
            className={`subtask-progress completion-ratio${percentage === 100 ? " txt-green" : ""}`}
          >
            {percentage === 100 ? "" : `${childClosedCount}/`}
            {childTotalCount}
          </span>
        </>
      ) : null}
      {parentIssueNumber ? (
        <span className="infos-item subtask">
          <Link
            {...LEGACY_LINK_PROPS}
            to="/$ownerName/$projectName/issue/$issueNumber"
            params={{ ownerName, projectName, issueNumber: String(parentIssueNumber) }}
          >
            {`#${parentIssueNumber} ${truncateParentIssueTitle(parentIssueTitle)}`}
          </Link>
        </span>
      ) : null}
    </>
  );
}

function ProfileIssueChildRows({
  issues,
  ownerName,
  projectName,
}: {
  issues: YoramRecord[];
  ownerName: string;
  projectName: string;
}) {
  const openIssues = issues.filter((issue) => stringField(issue, "state") !== "closed");
  const closedIssues = issues.filter((issue) => stringField(issue, "state") === "closed");
  const orderedIssues = [...openIssues, ...closedIssues];

  return orderedIssues.length ? (
    <div className="child-issues">
      {orderedIssues.map((issue) => (
        <ProfileIssueChildRow
          issue={issue}
          key={`${stringField(issue, "state")}-${numberField(issue, "issueNumber")}`}
          ownerName={ownerName}
          projectName={projectName}
        />
      ))}
    </div>
  ) : null;
}

function ProfileIssueChildRow({
  issue,
  ownerName,
  projectName,
}: {
  issue: YoramRecord;
  ownerName: string;
  projectName: string;
}) {
  const issueNumber = numberField(issue, "issueNumber");
  const projectPath = `/${ownerName}/${projectName}`;
  const issuePath = `${projectPath}/issue/${issueNumber}`;
  const isClosed = stringField(issue, "state") === "closed";
  const labels = sortedWorkspaceIssueLabels((issue.labels ?? []) as YoramLabel[]);

  return (
    <div className="issue-item  child-issue">
      <span className={`state-label ${isClosed ? "closed" : "open"}`}>
        {isClosed ? <i className=" yobicon-checkmark"></i> : null}
      </span>
      <Link {...LEGACY_LINK_PROPS} className="twoColumeModeTarget" to={issuePath}>
        <span className="item-name">
          <span className="subtask-number">
            {issue.isDraft ? <span className="draft-number">#Draft</span> : `#${issueNumber}`}
          </span>
          <span>{stringField(issue, "title")}</span>
          <span>
            {stringField(issue, "assigneeLabel") ? ` - ${stringField(issue, "assigneeLabel")}` : ""}
          </span>
        </span>
      </Link>
      <span className="font12 no-border-at-child">
        <ProfileIssueChildCounts issue={issue} issuePath={issuePath} />
      </span>
      {labels.map((label) => (
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/issues"
          params={{ ownerName, projectName }}
          search={{
            assigneeId: "",
            authorId: "",
            commenterId: "",
            dueDate: "",
            filter: "",
            labelIds: [String(label.id)],
            milestoneId: "",
            orderBy: "updatedDate",
            orderDir: "desc",
            pageNum: 1,
            state: "open",
          }}
          className="label issue-label list-label active twoColumeModeTarget"
          data-category-id={String(label.categoryId ?? "")}
          data-label-id={String(label.id)}
          key={String(label.id)}
          style={{ background: label.color }}
        >
          {label.name}
        </Link>
      ))}
      <span className="child-issue-date" title={stringField(issue, "createdLabel")}>
        {stringField(issue, "createdLabel")}
      </span>
    </div>
  );
}

function ProfileIssueChildCounts({ issue, issuePath }: { issue: YoramRecord; issuePath: string }) {
  const commentCount = numberField(issue, "commentCount");
  const voterCount = numberField(issue, "voterCount");
  if (commentCount <= 0 && voterCount <= 0) {
    return null;
  }

  return (
    <span className="item-count-groups">
      {commentCount > 0 ? (
        <Link
          {...LEGACY_LINK_PROPS}
          to={issuePath}
          hash="comments"
          className="comments-count comments-count-color"
        >
          <span className="count-groups item-icon">
            <i className="yobicon-comment2"></i>
          </span>
          <span className="count-groups item-count">{commentCount}</span>
        </Link>
      ) : null}
      {voterCount > 0 ? (
        <Link {...LEGACY_LINK_PROPS} to={issuePath} hash="vote" className="vote-count vote-color">
          <span className="count-groups item-icon">
            <i className="yobicon-hearts"></i>
          </span>
          <span className="count-groups item-count strong">{voterCount}</span>
        </Link>
      ) : null}
    </span>
  );
}

function truncateParentIssueTitle(title: string) {
  const trimmed = title.slice(0, 10).trim();
  return title.length > 10 ? `${trimmed}...` : trimmed;
}

function sortedWorkspaceIssueLabels(labels: YoramLabel[]) {
  return labels.slice().sort(compareIssueLabels);
}

function compareIssueLabels(left: YoramLabel, right: YoramLabel) {
  const categoryOrder = stringField(left.categoryName, "").localeCompare(
    stringField(right.categoryName, ""),
  );
  return categoryOrder || left.name.localeCompare(right.name);
}

function ProfileIssueCommentCount({
  issue,
  issuePath,
}: {
  issue: WorkspaceIssueItem;
  issuePath: string;
}) {
  const commentCount = numberField(issue, "commentCount");
  if (commentCount <= 0) {
    return null;
  }

  return (
    <span className="item-count-groups">
      <Link {...LEGACY_LINK_PROPS} to={issuePath} hash="comments" className="comments-count">
        <span className="count-groups item-icon">
          <i className="yobicon-comment2"></i>
        </span>
        <span className="count-groups item-count">{commentCount}</span>
      </Link>
    </span>
  );
}

function ProfilePullRequestRow({ pullRequest }: { pullRequest: WorkspacePullRequestItem }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(pullRequest, "ownerName");
  const projectName = stringField(pullRequest, "projectName");
  const number = numberField(pullRequest, "pullRequestNumber");
  const projectPath = `/${ownerName}/${projectName}`;
  const pullRequestPath = `${projectPath}/pullRequest/${number}`;
  const state = stringField(pullRequest, "state", "open").toLowerCase();
  const receiverLoginId = stringField(pullRequest, "receiverLoginId");
  const receiverLabel = stringField(pullRequest, "receiverLabel");
  const receiverAvatarUrl = stringField(
    pullRequest,
    "receiverAvatarUrl",
    "/assets/images/default-avatar-32.png",
  );

  return (
    <li className="post-item">
      <div className="span10">
        <Link {...LEGACY_LINK_PROPS} to={projectPath} className="avatar-wrap mlarge">
          <img
            src={stringField(
              pullRequest,
              "projectLogoUrl",
              "/assets/images/project_default_logo.png",
            )}
            alt={`${ownerName} / ${projectName}`}
          />
        </Link>
        <div className="title-wrap">
          <Link {...LEGACY_LINK_PROPS} to={projectPath} className="title project">
            {projectName}
          </Link>
          <span className="post-id">{number}</span>
          <Link {...LEGACY_LINK_PROPS} to={pullRequestPath} className="title ">
            {stringField(pullRequest, "title")}
          </Link>
        </div>
        <div className="infos">
          <ProfileTextLink
            className="infos-item infos-link-item"
            label={stringField(pullRequest, "contributorLabel")}
            loginId={stringField(pullRequest, "contributorLoginId")}
          />
          <span className="infos-item" title={stringField(pullRequest, "updatedLabel")}>
            {stringField(pullRequest, "updatedLabel")}
          </span>
          {numberField(pullRequest, "commentCount") > 0 ? (
            <Link
              {...LEGACY_LINK_PROPS}
              to={pullRequestPath}
              hash="comments"
              className="infos-item infos-icon-link"
            >
              <i className="yobicon-comments"></i>
              <span className="size">{numberField(pullRequest, "commentCount")}</span>
            </Link>
          ) : null}
        </div>
      </div>
      <div className="span2">
        <div className="mt5 pull-right">
          {receiverLoginId ? (
            <Link
              {...LEGACY_LINK_PROPS}
              to="/$user"
              params={{ user: receiverLoginId }}
              className="avatar-wrap assinee"
              title={receiverLabel}
            >
              <img src={receiverAvatarUrl} width="32" height="32" alt={receiverLabel} />
            </Link>
          ) : (
            <div className="empty-avatar-wrap">&nbsp;</div>
          )}
        </div>
        <div className={`state ${state} pull-right`}>{t(`pullRequest.state.${state}`)}</div>
      </div>
    </li>
  );
}

function ProfileProjectRow({
  project,
  subject,
}: {
  project: WorkspaceMemberProjectItem;
  subject: WorkspaceProfile;
}) {
  const { t } = useLegacyMessages();
  const projectPath = `/${project.ownerName}/${project.projectName}`;
  const ownerPath = `/${project.ownerName}`;

  return (
    <li className="project">
      <div className="info-wrap">
        <div className="pull-left">
          <Link {...LEGACY_LINK_PROPS} to={projectPath} className="avatar-wrap small">
            <img src={project.logoUrl || "/assets/images/project_default_logo.png"} alt="" />
          </Link>
        </div>
        <div className="pull-left" style={{ marginLeft: "10px" }}>
          <div className="header">
            <Link {...LEGACY_LINK_PROPS} to={projectPath} className="project-name">
              {project.projectName}
            </Link>
            {project.projectScope === "private" ? (
              <i className="yobicon-lock yobicon-small"></i>
            ) : null}
            {project.originOwnerName && project.originProjectName ? (
              <>
                <i className="yobicon-split yobicon-white vmiddle"></i>
                <span>
                  {" "}
                  <Link
                    {...LEGACY_LINK_PROPS}
                    to="/$ownerName/$projectName"
                    params={{
                      ownerName: project.originOwnerName,
                      projectName: project.originProjectName,
                    }}
                  >
                    {project.originOwnerName}/{project.originProjectName}
                  </Link>
                </span>
              </>
            ) : null}
          </div>
          <div className="desc">{project.overview}</div>
          <div className="name-tag">
            <i className="yobicon-friends yobicon-middle"></i>
            <strong>{project.memberCount}</strong>{" "}
            <Link {...LEGACY_LINK_PROPS} to={ownerPath} className="owner-name-small">
              {project.ownerName}
            </Link>{" "}
            <span title={project.createdLabel}>{project.createdLabel}</span>
            {project.lastPushedLabel ? (
              <>
                , {t("project.codeUpdate")}{" "}
                <span title={project.lastPushedLabel}>{project.lastPushedLabel}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <div className="stats-wrap pull-right">
        <div className="stats">
          {project.viewerCanWatch ? (
            <Link
              to="/"
              href={`${projectPath}/${project.isWatching ? "unwatch" : "watch"}`}
              reloadDocument
              className="ybtn watchBtn"
            >
              <i
                className={`yobicon-eye-${project.isWatching ? "open" : "close"} yobicon-middle yobicon-white`}
              ></i>
              {t(project.isWatching ? "notification.unwatch" : "notification.watch")}
              <span className="num-badge">{project.watchCount}</span>
            </Link>
          ) : null}
          {project.viewerCanLeave ? (
            <Link
              to="/"
              href={`/info/leave/${project.ownerName}/${project.projectName}`}
              reloadDocument
              data-projectname={project.projectName}
              className="nbtn black medium last leaveProject"
            >
              <i className="yobicon-trash"></i> {t("userinfo.leaveProject")}
            </Link>
          ) : null}
          {subject.loginId === project.ownerName ? null : null}
        </div>
      </div>
    </li>
  );
}

function TwoColumnModeCheckbox() {
  const { t } = useLegacyMessages();
  const [isChecked, setIsChecked] = useState(
    () =>
      typeof localStorage !== "undefined" && localStorage.getItem("useTwoColumnMode") === "true",
  );
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const popoverTimer = React.useRef<number | null>(null);
  const popoverTitle = t("common.two.column.mode");
  const popoverContent = t("common.two.column.mode.desc");

  const clearPopoverTimer = React.useCallback(() => {
    if (popoverTimer.current !== null) {
      window.clearTimeout(popoverTimer.current);
      popoverTimer.current = null;
    }
  }, []);

  React.useEffect(() => clearPopoverTimer, [clearPopoverTimer]);

  const showPopover = React.useCallback(() => {
    clearPopoverTimer();
    popoverTimer.current = window.setTimeout(() => {
      setIsPopoverVisible(true);
      popoverTimer.current = null;
    }, 100);
  }, [clearPopoverTimer]);

  const hidePopover = React.useCallback(() => {
    clearPopoverTimer();
    popoverTimer.current = window.setTimeout(() => {
      setIsPopoverVisible(false);
      popoverTimer.current = null;
    }, 100);
  }, [clearPopoverTimer]);

  const storeTwoColumnMode = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextChecked = event.currentTarget.checked;
    setIsChecked(nextChecked);
    globalThis.localStorage?.setItem("useTwoColumnMode", String(nextChecked));
  }, []);

  return (
    <div
      className="two-column-icon mr10 hide-in-mobile"
      id="two-column-mode-checkbox"
      title={popoverTitle}
      style={{ position: "relative" }}
      onBlur={hidePopover}
      onFocus={showPopover}
      onMouseEnter={showPopover}
      onMouseLeave={hidePopover}
    >
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy template keeps this checkbox wrapper. */}
      <label className="checkbox">
        <div className="two-column-icon-border">
          <input
            id="two-column-mode"
            type="checkbox"
            checked={isChecked}
            onChange={storeTwoColumnMode}
          />
          <span className="two-column-mode-text">{t("common.two.column.view")}</span>
        </div>
      </label>
      {isPopoverVisible ? (
        <div className="popover top" role="tooltip" style={SHOW_SUBTASKS_POPOVER_STYLE}>
          <div className="arrow" />
          <h3 className="popover-title">{popoverTitle}</h3>
          <div className="popover-content">{popoverContent}</div>
        </div>
      ) : null}
    </div>
  );
}

function ShowSubtasksCheckbox() {
  const { t } = useLegacyMessages();
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const popoverTimer = React.useRef<number | null>(null);
  const popoverTitle = t("common.show.subtasks");
  const popoverContent = t("common.show.subtasks.desc");

  const clearPopoverTimer = React.useCallback(() => {
    if (popoverTimer.current !== null) {
      window.clearTimeout(popoverTimer.current);
      popoverTimer.current = null;
    }
  }, []);

  React.useEffect(() => clearPopoverTimer, [clearPopoverTimer]);

  const showPopover = React.useCallback(() => {
    clearPopoverTimer();
    popoverTimer.current = window.setTimeout(() => {
      setIsPopoverVisible(true);
      popoverTimer.current = null;
    }, 100);
  }, [clearPopoverTimer]);

  const hidePopover = React.useCallback(() => {
    clearPopoverTimer();
    popoverTimer.current = window.setTimeout(() => {
      setIsPopoverVisible(false);
      popoverTimer.current = null;
    }, 100);
  }, [clearPopoverTimer]);

  return (
    <div
      className="show-subtasks mr10"
      id="two-column-mode-checkbox"
      title={popoverTitle}
      style={{ position: "relative" }}
      onBlur={hidePopover}
      onFocus={showPopover}
      onMouseEnter={showPopover}
      onMouseLeave={hidePopover}
    >
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy template keeps this checkbox wrapper. */}
      <label className="checkbox">
        <div className="show-subtasks-button-border">
          <input id="toggle-show-subtasks" type="checkbox" />
          <span className="show-subtasks-text">{popoverTitle}</span>
        </div>
      </label>
      {isPopoverVisible ? (
        <div className="popover top" role="tooltip" style={SHOW_SUBTASKS_POPOVER_STYLE}>
          <div className="arrow" />
          <h3 className="popover-title">{popoverTitle}</h3>
          <div className="popover-content">{popoverContent}</div>
        </div>
      ) : null}
    </div>
  );
}

function ProfilePersonLink({ label, loginId }: { label: string; loginId: string }) {
  if (!loginId) {
    return <span className="infos-item"></span>;
  }
  return (
    <ProfileTextLink
      className="infos-item infos-link-item author-cell"
      label={label}
      loginId={loginId}
    />
  );
}

function ProfileTextLink({
  className,
  label,
  loginId,
}: {
  className: string;
  label: string;
  loginId: string;
}) {
  if (!loginId) {
    return <span className="infos-item"></span>;
  }
  return (
    <Link
      {...LEGACY_LINK_PROPS}
      to="/$user"
      params={{ user: loginId }}
      className={className}
      title={loginId}
    >
      {label || loginId}
    </Link>
  );
}

function issueKey(issue: WorkspaceIssueItem) {
  return `${stringField(issue, "ownerName")}/${stringField(issue, "projectName")}/${numberField(
    issue,
    "issueNumber",
  )}`;
}

function pullRequestKey(pullRequest: WorkspacePullRequestItem) {
  return `${stringField(pullRequest, "ownerName")}/${stringField(
    pullRequest,
    "projectName",
  )}/${numberField(pullRequest, "pullRequestNumber")}`;
}

function isProfileTab(value: string): value is NonNullable<PublicProfileSearch["selected"]> {
  return ["issues", "projects", "pullRequests"].includes(value);
}

function stringSearch(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function stringField(record: YoramRecord, key: string, fallback = "") {
  const value = record[key];
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}

function numberField(record: YoramRecord, key: string, fallback = 0) {
  const value = record[key];
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
