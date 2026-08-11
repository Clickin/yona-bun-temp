import * as React from "react";
import { type HTMLAttributes, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Navigate, redirect } from "@tanstack/react-router";

type ExternalLinkTarget = NonNullable<React.ComponentProps<typeof Link>["to"]>;
import { currentSessionQueryOptions } from "../api/session";
import { RestApiError } from "../api/rest-client";
import { readPublicUserProfileQueryOptions, type PublicUserProfileResponse } from "../api/users";
import legacySpriteUrl from "../assets/legacy/sprite.png";
import googleProviderLogoUrl from "../assets/legacy/provider-logo/btn_google_light_normal_ios.svg?no-inline";
import type {
  WorkspaceIssueItem,
  WorkspaceMemberProjectItem,
  WorkspaceProfile,
  WorkspacePullRequestItem,
  YoramLabel,
  YoramRecord,
} from "../api/types";
import { IssueLabel } from "../components/issue-label";
import { issueLabelStyle } from "../legacy-issue-label-style";
import { TwoColumnModeCheckbox } from "../components/two-column-mode-checkbox";
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
  const logoutPath: string = "/logout";
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
              <Link
                {...LEGACY_LINK_PROPS}
                to="/projects"
                search={{ filter: undefined!, labelIds: undefined! }}
              >
                {t("title.projectList")}
              </Link>
            </li>
            <li>
              <Link {...LEGACY_LINK_PROPS} to="/_help">
                {t("title.help")}
              </Link>
            </li>
            <li>
              <Link
                href="https://github.com/yona-projects/yona/issues"
                to={"https://github.com/yona-projects/yona/issues" as "/"}
                target="_blank"
              >
                {t("title.yobi.feedback")}
              </Link>
            </li>
          </ul>
          <div id="mySidenav" className="sidenav">
            <div className="span5 right-menu span-hard-wrap">
              <div className="row-fluid user-menu-wrap">
                <span className="user-menu">
                  <Link to="/$user" params={{ user: "anonymous" }}>
                    {t("userinfo.profile")}
                  </Link>
                </span>
                <span className="user-menu">
                  <Link to="/user/editform" reloadDocument>
                    {t("userinfo.accountSetting")}
                  </Link>
                </span>
                <Link to={logoutPath} reloadDocument>
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
      <div className="page-wrap-outer" data-owner="user-profile-notfound-page">
        <div className="project-page-wrap">
          <div className={"error-wrap"} data-owner="user-profile-notfound-error-wrap">
            <i className={"ico ico-err2"} data-owner="user-profile-notfound-error-icon" />
            <p data-owner="user-profile-notfound-error-message">{t("user.notExists.name")}</p>
            <Link
              {...LEGACY_LINK_PROPS}
              className={"ybtn ybtn-info"}
              to="/"
              data-owner="user-profile-notfound-home"
            >
              {t("menu.home")}
            </Link>
          </div>
        </div>
      </div>
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">
            Copyright{" "}
            <Link
              className="yona-author"
              href="https://github.com/yona-projects/yona/blob/master/AUTHORS"
              rel="noreferrer"
              target="_blank"
              to={
                "https://github.com/yona-projects/yona/blob/master/AUTHORS" as unknown as ExternalLinkTarget
              }
            >
              Yona authors
            </Link>{" "}
            & ©{" "}
            <Link
              href="https://navercorp.com"
              rel="noreferrer"
              target="_blank"
              to={"https://navercorp.com" as unknown as ExternalLinkTarget}
            >
              NAVER Corp.
            </Link>{" "}
            &{" "}
            <Link
              className="naver-labs"
              href="https://naverlabs.com/"
              rel="noreferrer"
              target="_blank"
              to={"https://naverlabs.com/" as unknown as ExternalLinkTarget}
            >
              NAVER LABS
            </Link>{" "}
            Supported by{" "}
            <Link
              className="naver-cloud-platform"
              href="https://www.ncloud.com/?referer=yona"
              rel="noreferrer"
              target="_blank"
              to={"https://www.ncloud.com/?referer=yona" as unknown as ExternalLinkTarget}
            >
              NAVER CLOUD PLATFORM
            </Link>
          </span>
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
  const [showSubtasksAlways, setShowSubtasksAlways] = useState(
    () =>
      typeof localStorage !== "undefined" && localStorage.getItem("showSubtasksAlways") === "true",
  );
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
      <div className={"site-breadcrumb-outer"} data-owner="user-profile-breadcrumb-outer">
        <div className={"site-breadcrumb-inner"} data-owner="user-profile-breadcrumb-inner">
          <h3 data-owner="user-profile-breadcrumb-heading">{profile.displayName}</h3>
        </div>
      </div>
      <div className={"page-wrap-outer"} data-owner="user-profile-page-outer">
        <div className={"page-wrap"} data-owner="user-profile-page">
          <section className={"user-box"} data-owner="user-profile-box">
            <div className={"user-info-box"} data-owner="user-profile-info">
              <div
                style={{ backgroundImage: `url('${profile.avatarUrl}')` }}
                className={"whoami-wrap"}
                data-owner="user-profile-avatar-background"
              >
                {profile.isGuest ? (
                  <div data-owner="user-profile-guest-badge">
                    <span data-owner="user-profile-guest-badge-mark">OUR GUEST</span>
                  </div>
                ) : null}
              </div>
              <div className={"whoami usf-group"} data-owner="user-profile-whoami">
                <span className={"name"} data-owner="user-profile-identity-name">
                  {profile.englishName}
                </span>{" "}
                <span className={"loginid"} data-owner="user-profile-identity-loginid">
                  @{profile.loginId}
                </span>{" "}
                {runtimeConfig.showUserEmail && profile.primaryEmailAddress ? (
                  <span className="email" data-owner="user-profile-identity-email">
                    {profile.primaryEmailAddress}
                  </span>
                ) : null}
                {profileResponse.viewerCanEditProfile ? (
                  <div className={"edit"} data-owner="user-profile-identity-edit">
                    <Link
                      to="/user/editform"
                      reloadDocument
                      className={"ybtn ybtn-default ybtn-mini"}
                      data-owner="user-profile-edit-control"
                    >
                      <i className={"yobicon-edit"} data-owner="user-profile-edit-control-icon"></i>{" "}
                      {t("userinfo.editProfile")}
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className={"user-status"} data-owner="user-profile-user-status">
                {profile.isSiteAdmin ? (
                  <span
                    className={"badge label-success"}
                    data-owner="user-profile-site-admin-badge"
                  >
                    SITE ADMIN
                  </span>
                ) : null}
              </div>
              <div className={"user-status"} data-owner="user-profile-user-status">
                {profile.isBlocked ? (
                  <span className={"badge label-important"} data-owner="user-profile-blocked-badge">
                    BLOCKED
                  </span>
                ) : null}
              </div>
              <div className={"user-since"} data-owner="user-profile-user-since">
                <strong>{t("userinfo.since")}</strong>
                <span className={"since"} data-owner="user-profile-since">
                  {profile.sinceLabel}
                </span>
              </div>
              <div className={"user-since"} data-owner="user-profile-user-since">
                <div>
                  <strong>{t("user.connected.social.login")}</strong>
                </div>
                <div className={"auth-provider-logo"} data-owner="user-profile-provider-logo">
                  {profile.connectedSocialProviders.map((provider) => (
                    <ConnectedSocialProviderLogo key={provider} provider={provider} />
                  ))}
                </div>
              </div>
            </div>

            {!viewerIsGuest ? (
              <div className={"user-stream-box"} data-owner="user-profile-stream">
                <div className={"pull-right"} data-owner="user-profile-days-ago-controls">
                  {t("userinfo.daysAgo.prefix")}
                  <input
                    id="daysAgoBtn"
                    name="daysAgo"
                    type="number"
                    min="1"
                    max="99"
                    className={"input-mini-min"}
                    defaultValue={daysAgo}
                    data-owner="user-profile-days-ago-input"
                  />
                  {t("userinfo.daysAgo.suffix")}
                </div>

                <ul className={"nav nav-tabs"} data-owner="user-profile-tabs">
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
                    <TwoColumnModeCheckbox
                      anchorOwner="user-profile-two-column-popover-anchor"
                      labelOwner="user-profile-two-column-label"
                      borderOwner="user-profile-two-column-border"
                      inputOwner="user-profile-two-column-input"
                      textOwner="user-profile-two-column-text"
                      popoverOwner="user-profile-two-column-popover"
                    />
                  </li>
                </ul>

                <div className={"tab-content"} data-owner="user-profile-tab-content">
                  <div
                    id="issues"
                    className={`tab-pane${activeTab === "issues" ? " active" : ""}`}
                    data-owner="user-profile-pane-issues"
                  >
                    <ul className={"nav nav-tabs"} data-owner="user-profile-issue-tabs">
                      <li className={activeIssueTab === "openIssues" ? "active" : ""}>
                        <button
                          data-owner="user-profile-issue-tab-button-open"
                          type="button"
                          onClick={() => setActiveIssueTab("openIssues")}
                        >
                          {t("issue.state.open")}
                          <span
                            className={"num-badge"}
                            data-owner="user-profile-nested-issue-count-badge"
                          >
                            {openIssues.length}
                          </span>
                        </button>
                      </li>
                      <li className={activeIssueTab === "closedIssues" ? "active" : ""}>
                        <button
                          data-owner="user-profile-issue-tab-button-closed"
                          type="button"
                          onClick={() => setActiveIssueTab("closedIssues")}
                        >
                          {t("issue.state.closed")}
                          <span
                            className={"num-badge"}
                            data-owner="user-profile-nested-issue-count-badge"
                          >
                            {closedIssues.length}
                          </span>
                        </button>
                      </li>
                      <li>
                        <ShowSubtasksCheckbox
                          checked={showSubtasksAlways}
                          onChange={setShowSubtasksAlways}
                        />
                      </li>
                    </ul>
                    <div className={"tab-content"} data-owner="user-profile-issue-tab-content">
                      <div
                        id="openIssues"
                        className={`tab-pane${activeIssueTab === "openIssues" ? " active" : ""}`}
                        data-owner="user-profile-pane-open-issues"
                      >
                        {issues.length === 0 ? (
                          <div
                            className={"error-wrap"}
                            data-owner="user-profile-open-issues-empty-wrap"
                          >
                            <p data-owner="user-profile-open-issues-empty-message">
                              {`${t("userinfo.daysAgo.prefix")} ${t("issue.is.empty")}`}
                            </p>
                          </div>
                        ) : null}
                        <ul
                          className={"post-list-wrap my-issues row-fluid"}
                          data-owner="user-profile-open-issue-list"
                        >
                          {openIssues.map((issue) => (
                            <ProfileIssueRow
                              basePath={runtimeConfig.basePath}
                              issue={issue}
                              key={issueKey(issue)}
                              showSubtasks={showSubtasksAlways}
                            />
                          ))}
                        </ul>
                      </div>
                      <div
                        id="closedIssues"
                        className={`tab-pane${activeIssueTab === "closedIssues" ? " active" : ""}`}
                        data-owner="user-profile-pane-closed-issues"
                      >
                        {issues.length === 0 ? (
                          <div
                            className={"error-wrap"}
                            data-owner="user-profile-closed-issues-empty-wrap"
                          >
                            <p data-owner="user-profile-closed-issues-empty-message">
                              {`${t("userinfo.daysAgo.prefix")} ${t("issue.is.empty")}`}
                            </p>
                          </div>
                        ) : null}
                        <ul
                          className={"post-list-wrap my-issues row-fluid"}
                          data-owner="user-profile-closed-issue-list"
                        >
                          {closedIssues.map((issue) => (
                            <ProfileIssueRow
                              basePath={runtimeConfig.basePath}
                              issue={issue}
                              key={issueKey(issue)}
                              showSubtasks={showSubtasksAlways}
                            />
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div
                    id="pullRequests"
                    className={`tab-pane${activeTab === "pullRequests" ? " active" : ""}`}
                    data-owner="user-profile-pane-pull-requests"
                  >
                    {profileResponse.pullRequestItems.length === 0 ? (
                      <div
                        className={"error-wrap"}
                        data-owner="user-profile-pull-requests-empty-wrap"
                      >
                        <p data-owner="user-profile-pull-requests-empty-message">
                          {`${t("userinfo.daysAgo.prefix")} ${t("pullRequest.is.empty")}`}
                        </p>
                      </div>
                    ) : null}
                    <ul
                      className={"post-list-wrap row-fluid"}
                      data-owner="user-profile-pull-request-list"
                    >
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
                    className={`tab-pane${activeTab === "projects" ? " active" : ""}`}
                    data-owner="user-profile-pane-projects"
                  >
                    {profileResponse.memberProjects.length === 0 ? (
                      <div className={"error-wrap"} data-owner="user-profile-projects-empty-wrap">
                        <p data-owner="user-profile-projects-empty-message">
                          {t("project.is.empty")}
                        </p>
                      </div>
                    ) : null}
                    <ul
                      className={"user-streams all-projects"}
                      data-owner="user-profile-projects-list"
                    >
                      {profileResponse.memberProjects.map((project, index) => (
                        <ProfileProjectRow
                          key={`${project.ownerName}/${project.projectName}`}
                          project={project}
                          subject={profile}
                          isFirst={index === 0}
                        />
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div data-owner="user-profile-guest-stream-shell"></div>
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
      <button data-owner="user-profile-tab-button" type="button" onClick={onSelect}>
        {label}{" "}
        {badge > 0 ? (
          <span className={"num-badge"} data-owner="user-profile-top-tab-count-badge">
            {badge}
          </span>
        ) : null}
      </button>
    </li>
  );
}

function ConnectedSocialProviderLogo({ provider }: { provider: string }) {
  const normalized = provider.trim().toLowerCase();

  if (normalized === "github") {
    return (
      <span data-owner="user-profile-provider-github">
        <svg aria-hidden="true" height="24" version="1.1" viewBox="0 0 16 16" width="19">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38C13.71 14.53 16 11.53 16 8 16 3.58 12.42 0 8 0z" />
        </svg>
      </span>
    );
  }

  if (normalized === "google") {
    return (
      <span data-owner="user-profile-provider-google">
        {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy TemplateHelper.GoogleLogo renders this provider image without an alt attribute. */}
        <img data-owner="user-profile-provider-google-image" src={googleProviderLogoUrl} />
      </span>
    );
  }

  return null;
}

function ProfileIssueRow({
  basePath,
  issue,
  showSubtasks,
}: {
  basePath: string;
  issue: WorkspaceIssueItem;
  showSubtasks: boolean;
}) {
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
    className: "title",
    href: issueHref,
    id: `issue-item-${issueId}`,
  } satisfies LegacyIssueRowAttributes;

  return (
    <li {...legacyIssueRowAttrs} className={"post-item title"} data-owner="user-profile-issue-row">
      <div className={"span12 span-hard-wrap"} data-owner="user-profile-issue-grid-content">
        <div
          className={"span2 project-name-in-my-issues fixed-height-my-issues-list"}
          data-owner="user-profile-issue-project-name-wrapper"
        >
          <span className={"infos-item project-name"} data-owner="user-profile-issue-project-name">
            <Link
              {...LEGACY_LINK_PROPS}
              to={projectPath}
              className={"title project"}
              title={t("project.name")}
              data-owner="user-profile-issue-project-link"
            >
              {projectName}
            </Link>
          </span>
          <span className={"infos-item post-id"} data-owner="user-profile-issue-post-id">
            #{issueNumber}
          </span>
        </div>
        <div className={"title-wrap span5"} data-owner="user-profile-issue-title-wrap">
          <span className={"title-cell"} data-owner="user-profile-issue-title-cell">
            <Link
              {...LEGACY_LINK_PROPS}
              to={issuePath}
              className={"title"}
              data-owner="user-profile-issue-title-link"
            >
              {stringField(issue, "title")}
            </Link>
            <ProfileIssueCommentCount issue={issue} issuePath={issuePath} />
            <span
              className={"for-subtask-progressbar"}
              data-owner="user-profile-issue-subtask-progress-wrapper"
            >
              <ProfileIssueSubtaskSummary
                issue={issue}
                ownerName={ownerName}
                projectName={projectName}
              />
            </span>
            {labels.map((label) => {
              return (
                <Link
                  key={label.id}
                  {...LEGACY_LINK_PROPS}
                  to={`${projectPath}/issues?state=open&labelIds=${label.id}` as "/"}
                  className={"label issue-label list-label"}
                  data-label-id={String(label.id)}
                  style={issueLabelStyle(label.color)}
                  data-owner="user-profile-parent-issue-label"
                >
                  {label.name}
                </Link>
              );
            })}
            <div
              className={`child-issue-list${showSubtasks ? "" : " hide"}`}
              data-owner="user-profile-child-issue-list"
            >
              <ProfileIssueChildRows
                issues={issue.childIssues ?? []}
                ownerName={ownerName}
                projectName={projectName}
              />
            </div>
          </span>
        </div>
        <div
          className={
            "span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"
          }
          data-owner="user-profile-issue-author"
        >
          <ProfilePersonLink
            label={stringField(issue, "authorLabel")}
            loginId={stringField(issue, "authorLoginId")}
            applyAuthorCellStyle
          />
        </div>
        <div
          className={
            "span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"
          }
          data-owner="user-profile-issue-author"
        >
          <ProfilePersonLink
            label={stringField(issue, "assigneeLabel")}
            loginId={stringField(issue, "assigneeLoginId")}
            applyAuthorCellStyle
          />
        </div>
        <div className={"infos span3 meta"} data-owner="user-profile-issue-meta">
          <span className={"meta-cell"} data-owner="user-profile-issue-meta-cell">
            <span className={"hide show-in-mobile"} data-owner="user-profile-issue-mobile-assignee">
              <ProfilePersonLink
                label={stringField(issue, "assigneeLabel")}
                loginId={stringField(issue, "assigneeLoginId")}
              />
            </span>
            <span
              className={"infos-item"}
              data-owner="user-profile-issue-metadata-date"
              title={stringField(issue, "updatedLabel")}
            >
              {stringField(issue, "updatedLabel")}
            </span>
            {milestoneId > 0 && milestoneTitle ? (
              <span className={"mileston-tag"} data-owner="user-profile-issue-metadata-milestone">
                <Link
                  {...LEGACY_LINK_PROPS}
                  to="/$ownerName/$projectName/milestone/$milestoneId"
                  params={{ ownerName, projectName, milestoneId: String(milestoneId) }}
                  title={t("milestone")}
                >
                  {milestoneTitle}
                </Link>
              </span>
            ) : null}
            {dueDateLabel ? (
              <span
                className={"pull-right"}
                data-owner="user-profile-issue-due-date"
                data-overdue={dueDateOverdue ? "true" : "false"}
                title={`${t("issue.dueDate")}: ${dueDateLabel}`}
              >
                <i className={"yobicon-clock2"} data-owner="user-profile-issue-due-date-clock"></i>
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
            className={`subtask-progress upload-progress${percentage === 100 ? " done-outline" : " red-outline"}`}
            data-owner="user-profile-issue-subtask-progress-shell"
          >
            <div
              style={{ "--x-width": `${percentage}%` } as React.CSSProperties}
              className={`bar ${percentage === 100 ? "done" : "red"}`}
              data-owner="user-profile-subtask-progress-bar"
              title="Subtask"
            ></div>
          </div>
          <span
            className={`subtask-progress completion-ratio${percentage === 100 ? " txt-green" : ""}`}
            data-owner="user-profile-issue-subtask-completion-ratio"
          >
            {percentage === 100 ? "" : `${childClosedCount}/`}
            {childTotalCount}
          </span>
        </>
      ) : null}
      {parentIssueNumber ? (
        <span data-owner="user-profile-issue-subtask-parent">
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
      <span
        className={`state-label ${isClosed ? "closed" : "open"}`}
        {...(isClosed ? { "data-owner": "user-profile-child-closed-state" } : {})}
      >
        {isClosed ? (
          <i className={"yobicon-checkmark"} data-owner="user-profile-child-checkmark"></i>
        ) : null}
      </span>
      <Link {...LEGACY_LINK_PROPS} className="twoColumeModeTarget" to={issuePath}>
        <span className="item-name">
          <span className={"subtask-number"} data-owner="user-profile-child-subtask-number">
            {issue.isDraft ? (
              <span data-owner="user-profile-child-draft-number">#Draft</span>
            ) : (
              `#${issueNumber}`
            )}
          </span>
          <span>{stringField(issue, "title")}</span>
          <span>
            {stringField(issue, "assigneeLabel") ? ` - ${stringField(issue, "assigneeLabel")}` : ""}
          </span>
        </span>
      </Link>
      <span className={"font12 no-border-at-child"} data-owner="user-profile-child-count-pair">
        <ProfileIssueChildCounts issue={issue} issuePath={issuePath} />
      </span>
      {labels.map((label) => {
        return (
          <IssueLabel
            as={Link}
            {...LEGACY_LINK_PROPS}
            className={"twoColumeModeTarget"}
            color={label.color}
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
            data-category-id={String(label.categoryId ?? "")}
            labelId={String(label.id)}
            key={String(label.id)}
            data-owner="user-profile-child-issue-label"
          >
            {label.name}
          </IssueLabel>
        );
      })}
      <span
        className={"child-issue-date"}
        data-owner="user-profile-child-date"
        title={stringField(issue, "createdLabel")}
      >
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
    <span className={"item-count-groups"} data-owner="user-profile-child-count-groups">
      {commentCount > 0 ? (
        <Link
          {...LEGACY_LINK_PROPS}
          to={issuePath}
          hash="comments"
          className={"comments-count"}
          data-owner="user-profile-child-comment-count-link"
        >
          <span
            className={"count-groups item-icon"}
            data-owner="user-profile-child-comment-count-icon"
          >
            <i
              className={"yobicon-comment2"}
              data-owner="user-profile-child-comment-count-glyph"
            ></i>
          </span>
          <span
            className={"count-groups item-count"}
            data-owner="user-profile-child-comment-count-value"
          >
            {commentCount}
          </span>
        </Link>
      ) : null}
      {voterCount > 0 ? (
        <Link
          {...LEGACY_LINK_PROPS}
          to={issuePath}
          hash="vote"
          className={"vote-count"}
          data-owner="user-profile-child-vote-count-link"
        >
          <span
            className={"count-groups item-icon"}
            data-owner="user-profile-child-vote-count-icon"
          >
            <i className={"yobicon-hearts"} data-owner="user-profile-child-vote-count-glyph"></i>
          </span>
          <span
            className={"count-groups item-count"}
            data-owner="user-profile-child-vote-count-value"
          >
            {voterCount}
          </span>
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
    <span className={"item-count-groups"} data-owner="user-profile-issue-title-count-groups">
      <Link
        {...LEGACY_LINK_PROPS}
        to={issuePath}
        hash="comments"
        className={"comments-count"}
        data-owner="user-profile-issue-comment-count-link"
      >
        <span
          className={"count-groups item-icon"}
          data-owner="user-profile-issue-comment-count-icon-group"
        >
          <i className={"yobicon-comment2"} data-owner="user-profile-issue-comment-count-glyph"></i>
        </span>
        <span
          className={"count-groups item-count"}
          data-owner="user-profile-issue-comment-count-value"
        >
          {commentCount}
        </span>
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
  const isConflict = Boolean(pullRequest.conflict);
  const displayState = isConflict ? "conflict" : state;
  const receiverLoginId = stringField(pullRequest, "receiverLoginId");
  const receiverLabel = stringField(pullRequest, "receiverLabel");
  const receiverAvatarUrl = stringField(
    pullRequest,
    "receiverAvatarUrl",
    "/assets/images/default-avatar-32.png",
  );

  return (
    <li className={"post-item"} data-owner="user-profile-pull-request-row">
      <div className={"span10"} data-owner="user-profile-pull-request-content-column">
        <Link
          {...LEGACY_LINK_PROPS}
          to={projectPath}
          className={"avatar-wrap mlarge"}
          data-owner="user-profile-pull-request-project-avatar-rail"
        >
          <img
            data-owner="user-profile-pull-request-project-avatar-image"
            src={stringField(
              pullRequest,
              "projectLogoUrl",
              "/assets/images/project_default_logo.png",
            )}
            alt={`${ownerName} / ${projectName}`}
          />
        </Link>
        <div className={"title-wrap"} data-owner="user-profile-pull-request-title-wrap">
          <Link
            {...LEGACY_LINK_PROPS}
            to={projectPath}
            className={"title project"}
            data-owner="user-profile-pull-request-title-link"
          >
            {projectName}
          </Link>
          <span className={"post-id"} data-owner="user-profile-pull-request-post-id">
            {number}
          </span>
          <Link
            {...LEGACY_LINK_PROPS}
            to={pullRequestPath}
            className={`title${isConflict ? " conflict" : ""}`}
            data-owner="user-profile-pull-request-title-link"
          >
            {stringField(pullRequest, "title")}
          </Link>
        </div>
        <div className={"infos"} data-owner="user-profile-pull-request-infos">
          {stringField(pullRequest, "contributorLoginId") ? (
            <ProfileTextLink
              className={"infos-item infos-link-item"}
              label={stringField(pullRequest, "contributorLabel")}
              loginId={stringField(pullRequest, "contributorLoginId")}
              styleOwner="user-profile-pull-request-infos-author-link"
            />
          ) : (
            <span
              className={"infos-item"}
              data-owner="user-profile-pull-request-infos-empty-author"
            >
              {t("issue.noAuthor")}
            </span>
          )}
          <span
            className={"infos-item"}
            data-owner="user-profile-pull-request-infos-date"
            title={stringField(pullRequest, "updatedLabel")}
          >
            {stringField(pullRequest, "updatedLabel")}
          </span>
          {numberField(pullRequest, "commentCount") > 0 ? (
            <Link
              {...LEGACY_LINK_PROPS}
              to={pullRequestPath}
              hash="comments"
              className={"infos-item infos-icon-link"}
              data-owner="user-profile-pull-request-infos-comment-link"
            >
              <i
                className={"yobicon-comments"}
                data-owner="user-profile-pull-request-infos-comment-icon"
              ></i>
              <span className={"size"} data-owner="user-profile-pull-request-infos-comment-size">
                {numberField(pullRequest, "commentCount")}
              </span>
            </Link>
          ) : null}
        </div>
      </div>
      <div className={"span2"} data-owner="user-profile-pull-request-receiver-column">
        <div className={"mt5 pull-right"} data-owner="user-profile-pull-request-receiver-rail">
          {receiverLoginId ? (
            <Link
              {...LEGACY_LINK_PROPS}
              to="/$user"
              params={{ user: receiverLoginId }}
              className={"avatar-wrap assinee"}
              data-owner="user-profile-pull-request-receiver-avatar-link"
              title={receiverLabel}
            >
              <img
                data-owner="user-profile-pull-request-receiver-avatar-image"
                src={receiverAvatarUrl}
                width="32"
                height="32"
                alt={receiverLabel}
              />
            </Link>
          ) : (
            <div
              className={"empty-avatar-wrap"}
              data-owner="user-profile-pull-request-empty-avatar-wrap"
            >
              &nbsp;
            </div>
          )}
        </div>
        <div
          className={`state ${displayState} pull-right`}
          data-owner="user-profile-pull-request-state"
        >
          {t(`pullRequest.state.${displayState}`)}
        </div>
      </div>
    </li>
  );
}

function ProfileProjectRow({
  project,
  subject,
  isFirst,
}: {
  project: WorkspaceMemberProjectItem;
  subject: WorkspaceProfile;
  isFirst: boolean;
}) {
  const { t } = useLegacyMessages();
  const projectPath = `/${project.ownerName}/${project.projectName}`;
  const watchPath: string = `${projectPath}/${project.isWatching ? "unwatch" : "watch"}`;
  const ownerPath = `/${project.ownerName}`;

  return (
    <li className={"project"} data-owner="user-profile-project-row">
      <div className="info-wrap" data-owner="user-profile-project-info-wrap">
        <div className={"pull-left"} data-owner="user-profile-project-avatar-rail">
          <Link
            {...LEGACY_LINK_PROPS}
            to={projectPath}
            className={"avatar-wrap small"}
            data-owner="user-profile-project-avatar-link"
          >
            <img
              src={project.logoUrl || "/assets/images/project_default_logo.png"}
              alt=""
              data-owner="user-profile-project-avatar-image"
            />
          </Link>
        </div>
        <div className={"pull-left"} data-owner="user-profile-project-info">
          <div className={"header"} data-owner="user-profile-project-header">
            <Link
              {...LEGACY_LINK_PROPS}
              to={projectPath}
              className={"project-name"}
              data-owner="user-profile-project-title-link"
            >
              {project.projectName}
            </Link>
            {project.projectScope === "private" ? (
              <i
                className={"yobicon-lock yobicon-small"}
                data-owner="user-profile-project-private-icon"
              ></i>
            ) : null}
            {project.originOwnerName && project.originProjectName ? (
              <>
                <i
                  className={"yobicon-split yobicon-white vmiddle"}
                  data-owner="user-profile-project-fork-icon"
                ></i>
                <span>
                  {" "}
                  <Link
                    {...LEGACY_LINK_PROPS}
                    to="/$ownerName/$projectName"
                    params={{
                      ownerName: project.originOwnerName,
                      projectName: project.originProjectName,
                    }}
                    data-owner="user-profile-project-origin-link"
                  >
                    {project.originOwnerName}/{project.originProjectName}
                  </Link>
                </span>
              </>
            ) : null}
          </div>
          <div className={"desc"} data-owner="user-profile-project-description">
            {project.overview}
          </div>
          <div className={"name-tag"} data-owner="user-profile-project-name-tag">
            <i
              className={"yobicon-friends yobicon-middle"}
              data-owner="user-profile-project-member-icon"
            ></i>
            <strong>{project.memberCount}</strong>{" "}
            <Link
              {...LEGACY_LINK_PROPS}
              to={ownerPath}
              className={"owner-name-small"}
              data-owner="user-profile-project-owner-link"
            >
              {project.ownerName}
            </Link>{" "}
            <span title={project.createdLabel}>{project.createdLabel}</span>
            {project.lastPushedLabel ? (
              <>
                {`, ${t("project.codeUpdate")} `}
                <span title={project.lastPushedLabel}>{project.lastPushedLabel}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <div className={"stats-wrap pull-right"} data-owner="user-profile-project-stats">
        <div className="stats">
          {project.viewerCanWatch ? (
            <Link
              to={watchPath}
              reloadDocument
              className={"ybtn watchBtn"}
              data-owner="user-profile-project-watch-button"
            >
              <i
                className={"yobicon-eye-close yobicon-middle yobicon-white"}
                data-owner="user-profile-project-watch-icon"
              ></i>
              {t(project.isWatching ? "notification.unwatch" : "notification.watch")}
              <span className={"num-badge"} data-owner="user-profile-project-watch-badge">
                {project.watchCount}
              </span>
            </Link>
          ) : null}
          {project.viewerCanLeave ? (
            <Link
              to="/info/leave/$ownerName/$projectName"
              params={{ ownerName: project.ownerName, projectName: project.projectName }}
              data-projectname={project.projectName}
              className={"nbtn black medium last leaveProject"}
              data-owner="user-profile-project-leave-link"
              onClick={(event) => {
                if (
                  !window.confirm(
                    t("userinfo.leaveProject.confirm", { args: [project.projectName] }),
                  )
                ) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
            >
              <i className={"yobicon-trash"} data-owner="user-profile-project-trash-icon"></i>{" "}
              {t("userinfo.leaveProject")}
            </Link>
          ) : null}
          {subject.loginId === project.ownerName ? null : null}
        </div>
      </div>
    </li>
  );
}

function ShowSubtasksCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { t } = useLegacyMessages();
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const popoverTimer = React.useRef<number | null>(null);
  const popoverTitle = t("common.show.subtasks");
  const popoverContent = t("common.show.subtasks.desc");
  const [isControlHovered, setIsControlHovered] = useState(false);
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
  const storeShowSubtasks = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextChecked = event.currentTarget.checked;
      onChange(nextChecked);
      globalThis.localStorage?.setItem("showSubtasksAlways", String(nextChecked));
    },
    [onChange],
  );
  return (
    <div
      className={"show-subtasks mr10"}
      id="two-column-mode-checkbox"
      title={popoverTitle}
      data-owner="user-profile-show-subtasks-popover-anchor"
      onBlur={hidePopover}
      onFocus={showPopover}
      onMouseEnter={showPopover}
      onMouseLeave={hidePopover}
    >
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy template keeps this checkbox wrapper. */}
      <label className={"checkbox"} data-owner="user-profile-show-subtasks-label">
        <div
          className={"show-subtasks-button-border"}
          data-owner="user-profile-show-subtasks-border"
          onMouseEnter={() => setIsControlHovered(true)}
          onMouseLeave={() => setIsControlHovered(false)}
        >
          <input
            id="toggle-show-subtasks"
            type="checkbox"
            checked={checked}
            data-owner="user-profile-show-subtasks-input"
            onChange={storeShowSubtasks}
          />
          <span className={"show-subtasks-text"} data-owner="user-profile-show-subtasks-text">
            {popoverTitle}
          </span>
        </div>
      </label>
      {isPopoverVisible ? (
        <div
          className={"popover top"}
          role="tooltip"
          data-owner="user-profile-show-subtasks-popover"
        >
          <div className="arrow" />
          <h3 className="popover-title">{popoverTitle}</h3>
          <div className="popover-content">{popoverContent}</div>
        </div>
      ) : null}
    </div>
  );
}

function ProfilePersonLink({
  label,
  loginId,
  applyAuthorCellStyle = false,
}: {
  label: string;
  loginId: string;
  applyAuthorCellStyle?: boolean;
}) {
  if (!loginId) {
    return applyAuthorCellStyle ? (
      <span className={"infos-item"} data-owner="user-profile-issue-author-cell"></span>
    ) : (
      <span className="infos-item"></span>
    );
  }
  return (
    <ProfileTextLink
      className={
        applyAuthorCellStyle
          ? "infos-item infos-link-item author-cell"
          : "infos-item infos-link-item author-cell"
      }
      label={label}
      loginId={loginId}
      styleOwner={applyAuthorCellStyle ? "user-profile-issue-author-cell" : undefined}
    />
  );
}

function ProfileTextLink({
  className,
  label,
  loginId,
  styleOwner,
}: {
  className: string;
  label: string;
  loginId: string;
  styleOwner?: string;
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
      {...(styleOwner ? { "data-owner": styleOwner } : {})}
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
