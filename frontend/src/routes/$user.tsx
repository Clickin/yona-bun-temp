import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { type HTMLAttributes, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Navigate, redirect } from "@tanstack/react-router";
import { currentSessionQueryOptions } from "../api/session";
import { RestApiError } from "../api/rest-client";
import { readPublicUserProfileQueryOptions, type PublicUserProfileResponse } from "../api/users";
import legacySpriteUrl from "../assets/legacy/sprite.png";
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
import { styles, userProfileNotFoundStyles } from "./-user-profile.stylex";

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

const userProfileStaticStyles = stylex.create({
  iconMiddle: {
    verticalAlign: "bottom",
    marginBottom: "3px",
  },
  providerLogo: { fontFamily: "Roboto, sans-serif" },
  providerLogoSvg: { verticalAlign: "middle" },
  providerGithub: {
    display: "inline-block",
    marginBottom: "3px",
    marginLeft: "-4px",
    marginTop: "3px",
    width: "30px",
  },
  avatarWrap: {
    backgroundColor: "#ccc",
    backgroundPosition: "center",
    borderRadius: "4px",
    height: "200px",
    overflow: "hidden",
    position: "relative",
    width: "200px",
  },
  profileName: { fontSize: "18px", fontWeight: "bold" },
  profileEdit: { marginTop: "5px", textAlign: "right" },
  faqPopover: {
    bottom: "100%",
    display: "block",
    left: "50%",
    marginBottom: "10px",
    minWidth: "150px",
    pointerEvents: "none",
    position: "absolute",
    transform: "translateX(-50%)",
  },
  issueSubtaskCompletionRatio: { fontSize: "0.8em !important" },
  issueSubtaskParent: { fontSize: "0.8em !important" },
  issueProjectNameWrapperLineHeight: { lineHeight: "36px" },
  issueAuthorLineHeight: { lineHeight: "36px" },
});

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
            {runtimeConfig.feedbackUrl ? (
              <li>
                <Link to={runtimeConfig.feedbackUrl} target="_blank">
                  {t("title.yobi.feedback")}
                </Link>
              </li>
            ) : null}
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
      <div className="page-wrap-outer" data-stylex-owner="user-profile-notfound-page">
        <div className="project-page-wrap">
          <div
            {...stylex.props(userProfileNotFoundStyles.errorWrap)}
            className={`${stylex.props(userProfileNotFoundStyles.errorWrap).className} error-wrap`}
            data-stylex-owner="user-profile-notfound-error-wrap"
          >
            <i
              {...stylex.props(userProfileNotFoundStyles.errorIcon(legacySpriteUrl))}
              className={`${stylex.props(userProfileNotFoundStyles.errorIcon(legacySpriteUrl)).className} ico ico-err2`}
              data-stylex-owner="user-profile-notfound-error-icon"
            />
            <p
              {...stylex.props(userProfileNotFoundStyles.errorMessage)}
              data-stylex-owner="user-profile-notfound-error-message"
            >
              {t("user.notExists.name")}
            </p>
            <Link
              {...LEGACY_LINK_PROPS}
              to="/"
              className="ybtn ybtn-info"
              data-stylex-owner="user-profile-notfound-home"
            >
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
  const avatarBackgroundStyle = stylex.props(
    styles.avatarBackground(`url('${profile.avatarUrl}')`),
  );

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
          <section
            className={`${stylex.props(styles.profile).className} user-box`}
            data-stylex-owner="user-profile-box"
          >
            <div
              className={`${stylex.props(styles.info).className} user-info-box`}
              data-stylex-owner="user-profile-info"
            >
              <div
                {...avatarBackgroundStyle}
                className={`${stylex.props(userProfileStaticStyles.avatarWrap).className} whoami-wrap ${avatarBackgroundStyle.className ?? ""}`.trim()}
                data-stylex-owner="user-profile-avatar-background"
              >
                {profile.isGuest ? (
                  <div
                    {...stylex.props(styles.guestUser)}
                    className={`${stylex.props(styles.guestUser).className} guest-user`}
                    data-stylex-owner="user-profile-guest-badge"
                  >
                    <span
                      {...stylex.props(styles.guestLeftMark)}
                      className={`${stylex.props(styles.guestLeftMark).className} left-mark`}
                      data-stylex-owner="user-profile-guest-badge-mark"
                    >
                      OUR GUEST
                    </span>
                  </div>
                ) : null}
              </div>
              <div
                {...stylex.props(styles.whoami)}
                className={`${stylex.props(styles.whoami).className} whoami usf-group`}
                data-stylex-owner="user-profile-whoami"
              >
                <span
                  className={`${stylex.props(userProfileStaticStyles.profileName).className} name`}
                  data-stylex-owner="user-profile-identity-name"
                >
                  {profile.englishName}
                </span>{" "}
                <span
                  {...stylex.props(styles.loginId)}
                  className={`${stylex.props(styles.loginId).className} loginid`}
                  data-stylex-owner="user-profile-identity-loginid"
                >
                  @{profile.loginId}
                </span>{" "}
                {runtimeConfig.showUserEmail && profile.primaryEmailAddress ? (
                  <span className="email" data-stylex-owner="user-profile-identity-email">
                    {profile.primaryEmailAddress}
                  </span>
                ) : null}
                {profileResponse.viewerCanEditProfile ? (
                  <div
                    className={`${stylex.props(userProfileStaticStyles.profileEdit).className} edit`}
                  >
                    <Link
                      to="/user/editform"
                      reloadDocument
                      {...stylex.props(styles.profileEditButton)}
                      className={`${stylex.props(styles.profileEditButton).className} ybtn ybtn-default ybtn-mini`}
                      data-stylex-owner="user-profile-edit-control"
                    >
                      <i
                        {...stylex.props(styles.profileEditIcon)}
                        className={`${stylex.props(styles.profileEditIcon).className} yobicon-edit`}
                        data-stylex-owner="user-profile-edit-control-icon"
                      ></i>{" "}
                      {t("userinfo.editProfile")}
                    </Link>
                  </div>
                ) : null}
              </div>

              <div
                {...stylex.props(styles.userStatus)}
                className={`${stylex.props(styles.userStatus).className} user-status`}
                data-stylex-owner="user-profile-user-status"
              >
                {profile.isSiteAdmin ? (
                  <span className="badge label-success">SITE ADMIN</span>
                ) : null}
              </div>
              <div
                {...stylex.props(styles.userStatus)}
                className={`${stylex.props(styles.userStatus).className} user-status`}
                data-stylex-owner="user-profile-user-status"
              >
                {profile.isBlocked ? <span className="badge label-important">BLOCKED</span> : null}
              </div>
              <div
                {...stylex.props(styles.userSince)}
                className={`${stylex.props(styles.userSince).className} user-since`}
                data-stylex-owner="user-profile-user-since"
              >
                <strong>{t("userinfo.since")}</strong>
                <span
                  {...stylex.props(styles.since)}
                  className={`${stylex.props(styles.since).className} since`}
                  data-stylex-owner="user-profile-since"
                >
                  {profile.sinceLabel}
                </span>
              </div>
              <div
                {...stylex.props(styles.userSince)}
                className={`${stylex.props(styles.userSince).className} user-since`}
                data-stylex-owner="user-profile-user-since"
              >
                <div>
                  <strong>{t("user.connected.social.login")}</strong>
                </div>
                <div
                  className={`${stylex.props(userProfileStaticStyles.providerLogo).className} auth-provider-logo`}
                  data-stylex-owner="user-profile-provider-logo"
                >
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
              <div
                className={`${stylex.props(styles.stream).className} user-stream-box`}
                data-stylex-owner="user-profile-stream"
              >
                <div
                  className={`${stylex.props(styles.daysAgoControls).className}`}
                  data-stylex-owner="user-profile-days-ago-controls"
                >
                  {t("userinfo.daysAgo.prefix")}
                  <input
                    id="daysAgoBtn"
                    name="daysAgo"
                    type="number"
                    min="1"
                    max="99"
                    className={`${stylex.props(styles.daysAgoInput).className} input-mini-min`}
                    defaultValue={daysAgo}
                    data-stylex-owner="user-profile-days-ago-input"
                  />
                  {t("userinfo.daysAgo.suffix")}
                </div>

                <ul
                  className={`${stylex.props(styles.tabs).className} nav nav-tabs`}
                  data-stylex-owner="user-profile-tabs"
                >
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

                <div className="tab-content" data-stylex-owner="user-profile-tab-content">
                  <div id="issues" className={`tab-pane ${activeTab === "issues" ? "active" : ""}`}>
                    <ul
                      className={`${stylex.props(styles.issueTabs).className} nav nav-tabs nm`}
                      data-stylex-owner="user-profile-issue-tabs"
                    >
                      <li className={activeIssueTab === "openIssues" ? "active" : ""}>
                        <button
                          className={stylex.props(styles.issueTabButton).className}
                          data-stylex-owner="user-profile-issue-tab-button-open"
                          type="button"
                          onClick={() => setActiveIssueTab("openIssues")}
                        >
                          {t("issue.state.open")}
                          <span className="num-badge">{openIssues.length}</span>
                        </button>
                      </li>
                      <li className={activeIssueTab === "closedIssues" ? "active" : ""}>
                        <button
                          className={stylex.props(styles.issueTabButton).className}
                          data-stylex-owner="user-profile-issue-tab-button-closed"
                          type="button"
                          onClick={() => setActiveIssueTab("closedIssues")}
                        >
                          {t("issue.state.closed")}
                          <span className="num-badge">{closedIssues.length}</span>
                        </button>
                      </li>
                      <li>
                        <ShowSubtasksCheckbox
                          checked={showSubtasksAlways}
                          onChange={setShowSubtasksAlways}
                        />
                      </li>
                    </ul>
                    <div className="tab-content">
                      <div
                        id="openIssues"
                        className={`tab-pane ${activeIssueTab === "openIssues" ? "active" : ""}`}
                      >
                        {issues.length === 0 ? (
                          <div
                            className={`${stylex.props(styles.emptyErrorWrap).className} error-wrap`}
                            data-stylex-owner="user-profile-open-issues-empty-wrap"
                          >
                            <p
                              className={stylex.props(styles.emptyErrorMessage).className}
                              data-stylex-owner="user-profile-open-issues-empty-message"
                            >
                              {`${t("userinfo.daysAgo.prefix")} ${t("issue.is.empty")}`}
                            </p>
                          </div>
                        ) : null}
                        <ul className="post-list-wrap my-issues row-fluid">
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
                        className={`tab-pane ${activeIssueTab === "closedIssues" ? "active" : ""}`}
                      >
                        {issues.length === 0 ? (
                          <div
                            className={`${stylex.props(styles.emptyErrorWrap).className} error-wrap`}
                            data-stylex-owner="user-profile-closed-issues-empty-wrap"
                          >
                            <p
                              className={stylex.props(styles.emptyErrorMessage).className}
                              data-stylex-owner="user-profile-closed-issues-empty-message"
                            >
                              {`${t("userinfo.daysAgo.prefix")} ${t("issue.is.empty")}`}
                            </p>
                          </div>
                        ) : null}
                        <ul className="post-list-wrap my-issues row-fluid">
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
                    className={`tab-pane ${activeTab === "pullRequests" ? "active" : ""}`}
                  >
                    {profileResponse.pullRequestItems.length === 0 ? (
                      <div
                        className={`${stylex.props(styles.emptyErrorWrap).className} error-wrap`}
                        data-stylex-owner="user-profile-pull-requests-empty-wrap"
                      >
                        <p
                          className={stylex.props(styles.emptyErrorMessage).className}
                          data-stylex-owner="user-profile-pull-requests-empty-message"
                        >
                          {`${t("userinfo.daysAgo.prefix")} ${t("pullRequest.is.empty")}`}
                        </p>
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
                      <div
                        className={`${stylex.props(styles.emptyErrorWrap).className} error-wrap`}
                        data-stylex-owner="user-profile-projects-empty-wrap"
                      >
                        <p
                          className={stylex.props(styles.emptyErrorMessage).className}
                          data-stylex-owner="user-profile-projects-empty-message"
                        >
                          {t("project.is.empty")}
                        </p>
                      </div>
                    ) : null}
                    <ul
                      className={`${stylex.props(styles.projectsList).className} user-streams all-projects`}
                      data-stylex-owner="user-profile-projects-list"
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
      <button
        className={stylex.props(styles.profileTabButton).className}
        data-stylex-owner="user-profile-tab-button"
        type="button"
        onClick={onSelect}
      >
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
      <span
        className={`${stylex.props(userProfileStaticStyles.providerGithub).className} github`}
        data-stylex-owner="user-profile-provider-github"
      >
        <svg
          {...stylex.props(userProfileStaticStyles.providerLogoSvg)}
          aria-hidden="true"
          height="24"
          version="1.1"
          viewBox="0 0 16 16"
          width="19"
        >
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
    className: "post-item title",
    href: issueHref,
    id: `issue-item-${issueId}`,
  } satisfies LegacyIssueRowAttributes;

  return (
    <li
      {...legacyIssueRowAttrs}
      {...stylex.props(styles.issueRow)}
      data-stylex-owner="user-profile-issue-row"
    >
      <div className="span12 span-hard-wrap">
        <div
          {...stylex.props(
            styles.issueProjectNameWrapper,
            userProfileStaticStyles.issueProjectNameWrapperLineHeight,
          )}
          className={`${stylex.props(styles.issueProjectNameWrapper).className} span2`}
          data-stylex-owner="user-profile-issue-project-name-wrapper"
        >
          <span
            {...stylex.props(styles.issueProjectName)}
            className={`${stylex.props(styles.issueProjectName).className} infos-item project-name`}
            data-stylex-owner="user-profile-issue-project-name"
          >
            <Link
              {...LEGACY_LINK_PROPS}
              to={projectPath}
              className="title project"
              title={t("project.name")}
            >
              {projectName}
            </Link>
          </span>
          <span
            {...stylex.props(styles.issuePostId)}
            className={`${stylex.props(styles.issuePostId).className} infos-item post-id`}
            data-stylex-owner="user-profile-issue-post-id"
          >
            #{issueNumber}
          </span>
        </div>
        <div
          className={`${stylex.props(styles.issueTitleWrap).className} title-wrap span5`}
          data-stylex-owner="user-profile-issue-title-wrap"
        >
          <span
            {...stylex.props(styles.issueTitleCell)}
            className={`${stylex.props(styles.issueTitleCell).className} title-cell`}
            data-stylex-owner="user-profile-issue-title-cell"
          >
            <Link
              {...LEGACY_LINK_PROPS}
              to={issuePath}
              {...stylex.props(styles.issueTitleLink)}
              className={`${stylex.props(styles.issueTitleLink).className} title`}
              data-stylex-owner="user-profile-issue-title-link"
            >
              {stringField(issue, "title")}
            </Link>
            <ProfileIssueCommentCount issue={issue} issuePath={issuePath} />
            <span
              {...stylex.props(styles.issueSubtaskProgressWrapper)}
              className={`${stylex.props(styles.issueSubtaskProgressWrapper).className} for-subtask-progressbar`}
              data-stylex-owner="user-profile-issue-subtask-progress-wrapper"
            >
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
                {...stylex.props(styles.issueLabelBackground(label.color))}
                data-stylex-owner="user-profile-issue-label-background"
              >
                {label.name}
              </Link>
            ))}
            <div className={`child-issue-list${showSubtasks ? "" : " hide"}`}>
              <ProfileIssueChildRows
                issues={issue.childIssues ?? []}
                ownerName={ownerName}
                projectName={projectName}
              />
            </div>
          </span>
        </div>
        <div
          {...stylex.props(
            styles.issueAuthor,
            styles.issueDesktopPersonVisibility,
            userProfileStaticStyles.issueAuthorLineHeight,
          )}
          className={`${
            stylex.props(
              styles.issueAuthor,
              styles.issueDesktopPersonVisibility,
              userProfileStaticStyles.issueAuthorLineHeight,
            ).className
          } span1 author`}
          data-stylex-owner="user-profile-issue-author"
        >
          <ProfilePersonLink
            label={stringField(issue, "authorLabel")}
            loginId={stringField(issue, "authorLoginId")}
            applyAuthorCellStyle
          />
        </div>
        <div
          {...stylex.props(
            styles.issueAuthor,
            styles.issueDesktopPersonVisibility,
            userProfileStaticStyles.issueAuthorLineHeight,
          )}
          className={`${
            stylex.props(
              styles.issueAuthor,
              styles.issueDesktopPersonVisibility,
              userProfileStaticStyles.issueAuthorLineHeight,
            ).className
          } span1 author`}
          data-stylex-owner="user-profile-issue-author"
        >
          <ProfilePersonLink
            label={stringField(issue, "assigneeLabel")}
            loginId={stringField(issue, "assigneeLoginId")}
            applyAuthorCellStyle
          />
        </div>
        <div
          {...stylex.props(styles.issueInfos, styles.issueMeta)}
          className={`${stylex.props(styles.issueInfos, styles.issueMeta).className} infos span3 meta`}
          data-stylex-owner="user-profile-issue-meta"
        >
          <span
            {...stylex.props(styles.issueMetaCell)}
            className={`${stylex.props(styles.issueMetaCell).className} meta-cell`}
            data-stylex-owner="user-profile-issue-meta-cell"
          >
            <span
              {...stylex.props(styles.issueMobileAssigneeVisibility)}
              data-stylex-owner="user-profile-issue-mobile-assignee"
            >
              <ProfilePersonLink
                label={stringField(issue, "assigneeLabel")}
                loginId={stringField(issue, "assigneeLoginId")}
              />
            </span>
            <span
              {...stylex.props(styles.issueMetadataItem)}
              className={`${stylex.props(styles.issueMetadataItem).className} infos-item`}
              data-stylex-owner="user-profile-issue-metadata-date"
              title={stringField(issue, "updatedLabel")}
            >
              {stringField(issue, "updatedLabel")}
            </span>
            {milestoneId > 0 && milestoneTitle ? (
              <span
                {...stylex.props(styles.issueMilestoneTag)}
                className={`${stylex.props(styles.issueMilestoneTag).className} mileston-tag`}
                data-stylex-owner="user-profile-issue-metadata-milestone"
              >
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
                {...stylex.props(styles.issueDueDate)}
                className={`${stylex.props(styles.issueDueDate).className} ${dueDateOverdue ? "overdue" : ""}`}
                data-stylex-owner="user-profile-issue-due-date"
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
            {...stylex.props(styles.issueSubtaskProgressShell)}
            className={`${stylex.props(styles.issueSubtaskProgressShell).className} subtask-progress upload-progress ${
              percentage === 100 ? "done-outline" : "red-outline"
            }`}
            data-stylex-owner="user-profile-issue-subtask-progress-shell"
          >
            <div
              className={`${stylex.props(styles.progressBar(`${percentage}%`)).className} bar ${percentage === 100 ? "done" : "red"}`}
              data-stylex-owner="user-profile-subtask-progress-bar"
              title="Subtask"
            ></div>
          </div>
          <span
            className={`subtask-progress completion-ratio${percentage === 100 ? " txt-green" : ""} ${stylex.props(userProfileStaticStyles.issueSubtaskCompletionRatio).className}`}
            data-stylex-owner="user-profile-issue-subtask-completion-ratio"
          >
            {percentage === 100 ? "" : `${childClosedCount}/`}
            {childTotalCount}
          </span>
        </>
      ) : null}
      {parentIssueNumber ? (
        <span
          className={`infos-item subtask ${stylex.props(userProfileStaticStyles.issueSubtaskParent).className}`}
          data-stylex-owner="user-profile-issue-subtask-parent"
        >
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
          <span
            {...stylex.props(styles.issueSubtaskNumber)}
            className={`${stylex.props(styles.issueSubtaskNumber).className} subtask-number`}
            data-stylex-owner="user-profile-child-subtask-number"
          >
            {issue.isDraft ? <span className="draft-number">#Draft</span> : `#${issueNumber}`}
          </span>
          <span>{stringField(issue, "title")}</span>
          <span>
            {stringField(issue, "assigneeLabel") ? ` - ${stringField(issue, "assigneeLabel")}` : ""}
          </span>
        </span>
      </Link>
      <span className="font12">
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
          {...stylex.props(styles.issueLabelBackground(label.color))}
          data-stylex-owner="user-profile-issue-label-background"
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
    <span
      {...stylex.props(styles.issueChildCountGroups)}
      className={`${stylex.props(styles.issueChildCountGroups).className} item-count-groups`}
      data-stylex-owner="user-profile-child-count-groups"
    >
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
    <span
      {...stylex.props(styles.issueTitleCountGroups)}
      className={`${stylex.props(styles.issueTitleCountGroups).className} item-count-groups`}
      data-stylex-owner="user-profile-issue-title-count-groups"
    >
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
  const isConflict = Boolean(pullRequest.conflict);
  const displayState = isConflict ? "conflict" : state;
  const pullRequestStateStyle = stylex.props(
    styles.pullRequestState,
    displayState === "open"
      ? styles.pullRequestStateOpen
      : displayState === "closed"
        ? styles.pullRequestStateClosed
        : displayState === "rejected"
          ? styles.pullRequestStateRejected
          : displayState === "merged"
            ? styles.pullRequestStateMerged
            : styles.pullRequestStateConflict,
  );
  const pullRequestTitleStyle = isConflict
    ? stylex.props(styles.pullRequestTitleLink, styles.pullRequestConflictLink)
    : stylex.props(styles.pullRequestTitleLink);
  const receiverLoginId = stringField(pullRequest, "receiverLoginId");
  const receiverLabel = stringField(pullRequest, "receiverLabel");
  const receiverAvatarUrl = stringField(
    pullRequest,
    "receiverAvatarUrl",
    "/assets/images/default-avatar-32.png",
  );

  return (
    <li
      {...stylex.props(styles.pullRequestRow)}
      className={`${stylex.props(styles.pullRequestRow).className} post-item`}
      data-stylex-owner="user-profile-pull-request-row"
    >
      <div className="span10">
        <Link
          {...LEGACY_LINK_PROPS}
          to={projectPath}
          {...stylex.props(styles.pullRequestProjectAvatarRail)}
          className={`${stylex.props(styles.pullRequestProjectAvatarRail).className} avatar-wrap mlarge`}
          data-stylex-owner="user-profile-pull-request-project-avatar-rail"
        >
          <img
            src={stringField(
              pullRequest,
              "projectLogoUrl",
              "/assets/images/project_default_logo.png",
            )}
            alt={`${ownerName} / ${projectName}`}
          />
        </Link>
        <div
          {...stylex.props(styles.pullRequestTitleWrap)}
          className={`${stylex.props(styles.pullRequestTitleWrap).className} title-wrap`}
          data-stylex-owner="user-profile-pull-request-title-wrap"
        >
          <Link
            {...LEGACY_LINK_PROPS}
            to={projectPath}
            {...stylex.props(styles.pullRequestTitleLink, styles.pullRequestProjectLink)}
            className={`${stylex.props(styles.pullRequestTitleLink, styles.pullRequestProjectLink).className} title project`}
            data-stylex-owner="user-profile-pull-request-title-link"
          >
            {projectName}
          </Link>
          <span
            {...stylex.props(styles.pullRequestPostId)}
            className={`${stylex.props(styles.pullRequestPostId).className} post-id`}
            data-stylex-owner="user-profile-pull-request-post-id"
          >
            {number}
          </span>
          <Link
            {...LEGACY_LINK_PROPS}
            to={pullRequestPath}
            {...pullRequestTitleStyle}
            className={`${pullRequestTitleStyle.className} title${isConflict ? " conflict" : ""}`}
            data-stylex-owner="user-profile-pull-request-title-link"
          >
            {stringField(pullRequest, "title")}
          </Link>
        </div>
        <div
          {...stylex.props(styles.pullRequestInfos)}
          className={`${stylex.props(styles.pullRequestInfos).className} infos`}
          data-stylex-owner="user-profile-pull-request-infos"
        >
          {stringField(pullRequest, "contributorLoginId") ? (
            <ProfileTextLink
              className={`${
                stylex.props(styles.pullRequestInfosItem, styles.pullRequestInfosLinkItem).className
              } infos-item infos-link-item`}
              label={stringField(pullRequest, "contributorLabel")}
              loginId={stringField(pullRequest, "contributorLoginId")}
              stylexOwner="user-profile-pull-request-infos-author-link"
            />
          ) : (
            <span
              {...stylex.props(styles.pullRequestInfosItem)}
              className={`${stylex.props(styles.pullRequestInfosItem).className} infos-item`}
              data-stylex-owner="user-profile-pull-request-infos-empty-author"
            >
              {t("issue.noAuthor")}
            </span>
          )}
          <span
            {...stylex.props(styles.pullRequestInfosItem)}
            className={`${stylex.props(styles.pullRequestInfosItem).className} infos-item`}
            data-stylex-owner="user-profile-pull-request-infos-date"
            title={stringField(pullRequest, "updatedLabel")}
          >
            {stringField(pullRequest, "updatedLabel")}
          </span>
          {numberField(pullRequest, "commentCount") > 0 ? (
            <Link
              {...LEGACY_LINK_PROPS}
              to={pullRequestPath}
              hash="comments"
              {...stylex.props(styles.pullRequestInfosItem, styles.pullRequestInfosIconLink)}
              className={`${
                stylex.props(styles.pullRequestInfosItem, styles.pullRequestInfosIconLink).className
              } infos-item infos-icon-link`}
              data-stylex-owner="user-profile-pull-request-infos-comment-link"
            >
              <i
                {...stylex.props(styles.pullRequestInfosIcon)}
                className={`${stylex.props(styles.pullRequestInfosIcon).className} yobicon-comments`}
                data-stylex-owner="user-profile-pull-request-infos-comment-icon"
              ></i>
              <span
                {...stylex.props(styles.pullRequestInfosCount)}
                className={`${stylex.props(styles.pullRequestInfosCount).className} size`}
                data-stylex-owner="user-profile-pull-request-infos-comment-size"
              >
                {numberField(pullRequest, "commentCount")}
              </span>
            </Link>
          ) : null}
        </div>
      </div>
      <div className="span2">
        <div
          {...stylex.props(styles.pullRequestReceiverRail)}
          className={stylex.props(styles.pullRequestReceiverRail).className}
          data-stylex-owner="user-profile-pull-request-receiver-rail"
        >
          {receiverLoginId ? (
            <Link
              {...LEGACY_LINK_PROPS}
              to="/$user"
              params={{ user: receiverLoginId }}
              {...stylex.props(styles.pullRequestReceiverAvatarLink)}
              className={`${stylex.props(styles.pullRequestReceiverAvatarLink).className} avatar-wrap assinee`}
              data-stylex-owner="user-profile-pull-request-receiver-avatar-link"
              title={receiverLabel}
            >
              <img src={receiverAvatarUrl} width="32" height="32" alt={receiverLabel} />
            </Link>
          ) : (
            <div
              {...stylex.props(styles.pullRequestEmptyAvatarWrap)}
              className={`${stylex.props(styles.pullRequestEmptyAvatarWrap).className} empty-avatar-wrap`}
              data-stylex-owner="user-profile-pull-request-empty-avatar-wrap"
            >
              &nbsp;
            </div>
          )}
        </div>
        <div
          {...pullRequestStateStyle}
          className={`${pullRequestStateStyle.className} state ${displayState}`}
          data-stylex-owner="user-profile-pull-request-state"
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
    <li
      className={`${stylex.props(styles.projectRow, isFirst ? styles.firstProjectRow : undefined).className} project`}
      data-stylex-owner="user-profile-project-row"
    >
      <div className="info-wrap">
        <div
          className={stylex.props(styles.projectAvatarRail).className}
          data-stylex-owner="user-profile-project-avatar-rail"
        >
          <Link
            {...LEGACY_LINK_PROPS}
            to={projectPath}
            {...stylex.props(styles.projectAvatarLink)}
            className={`${stylex.props(styles.projectAvatarLink).className} avatar-wrap small`}
            data-stylex-owner="user-profile-project-avatar-link"
          >
            <img
              {...stylex.props(styles.projectAvatarImage)}
              src={project.logoUrl || "/assets/images/project_default_logo.png"}
              alt=""
              data-stylex-owner="user-profile-project-avatar-image"
            />
          </Link>
        </div>
        <div
          className={stylex.props(styles.projectInfo).className}
          data-stylex-owner="user-profile-project-info"
        >
          <div
            className={`${stylex.props(styles.projectHeader).className} header`}
            data-stylex-owner="user-profile-project-header"
          >
            <Link
              {...LEGACY_LINK_PROPS}
              to={projectPath}
              {...stylex.props(styles.projectTitleLink)}
              className={`${stylex.props(styles.projectTitleLink).className} project-name`}
              data-stylex-owner="user-profile-project-title-link"
            >
              {project.projectName}
            </Link>
            {project.projectScope === "private" ? (
              <i
                {...stylex.props(styles.projectPrivateIcon)}
                className={`${stylex.props(styles.projectPrivateIcon).className} yobicon-lock yobicon-small`}
                data-stylex-owner="user-profile-project-private-icon"
              ></i>
            ) : null}
            {project.originOwnerName && project.originProjectName ? (
              <>
                <i
                  {...stylex.props(styles.projectForkIcon)}
                  className={`${stylex.props(styles.projectForkIcon).className} yobicon-split yobicon-white vmiddle`}
                  data-stylex-owner="user-profile-project-fork-icon"
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
                    {...stylex.props(styles.projectOriginLink)}
                    data-stylex-owner="user-profile-project-origin-link"
                  >
                    {project.originOwnerName}/{project.originProjectName}
                  </Link>
                </span>
              </>
            ) : null}
          </div>
          <div
            className={`${stylex.props(styles.projectDescription).className} desc`}
            data-stylex-owner="user-profile-project-description"
          >
            {project.overview}
          </div>
          <div
            className={`${stylex.props(styles.projectNameTag).className} name-tag`}
            data-stylex-owner="user-profile-project-name-tag"
          >
            <i
              className={`${stylex.props(userProfileStaticStyles.iconMiddle).className} yobicon-friends`}
            ></i>
            <strong>{project.memberCount}</strong>{" "}
            <Link
              {...LEGACY_LINK_PROPS}
              to={ownerPath}
              {...stylex.props(styles.projectOwnerLink)}
              className={`${stylex.props(styles.projectOwnerLink).className} owner-name-small`}
              data-stylex-owner="user-profile-project-owner-link"
            >
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
      <div
        className={`${stylex.props(styles.projectStats).className} stats-wrap`}
        data-stylex-owner="user-profile-project-stats"
      >
        <div className="stats">
          {project.viewerCanWatch ? (
            <Link
              to={watchPath}
              reloadDocument
              {...stylex.props(styles.projectWatchButton)}
              className={`${stylex.props(styles.projectWatchButton).className} ybtn watchBtn`}
              data-stylex-owner="user-profile-project-watch-button"
            >
              <i
                {...stylex.props(userProfileStaticStyles.iconMiddle, styles.projectWatchIcon)}
                className={`${stylex.props(userProfileStaticStyles.iconMiddle, styles.projectWatchIcon).className} yobicon-eye-${project.isWatching ? "open" : "close"} yobicon-middle yobicon-white`}
                data-stylex-owner="user-profile-project-watch-icon"
              ></i>
              {t(project.isWatching ? "notification.unwatch" : "notification.watch")}
              <span
                {...stylex.props(styles.projectWatchBadge)}
                className={`${stylex.props(styles.projectWatchBadge).className} num-badge`}
                data-stylex-owner="user-profile-project-watch-badge"
              >
                {project.watchCount}
              </span>
            </Link>
          ) : null}
          {project.viewerCanLeave ? (
            <Link
              to="/info/leave/$ownerName/$projectName"
              params={{ ownerName: project.ownerName, projectName: project.projectName }}
              data-projectname={project.projectName}
              {...stylex.props(styles.projectLeaveLink)}
              className={`${stylex.props(styles.projectLeaveLink).className} nbtn black medium last leaveProject`}
              data-stylex-owner="user-profile-project-leave-link"
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
  const popoverAnchorStyleProps = stylex.props(styles.popoverAnchor);

  return (
    <div
      {...popoverAnchorStyleProps}
      className={`${popoverAnchorStyleProps.className ?? ""} two-column-icon mr10 hide-in-mobile`.trim()}
      id="two-column-mode-checkbox"
      title={popoverTitle}
      data-stylex-owner="user-profile-two-column-popover-anchor"
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
        <div
          className={`${stylex.props(userProfileStaticStyles.faqPopover).className} popover top`}
          role="tooltip"
          data-stylex-owner="user-profile-two-column-popover"
        >
          <div className="arrow" />
          <h3 className="popover-title">{popoverTitle}</h3>
          <div className="popover-content">{popoverContent}</div>
        </div>
      ) : null}
    </div>
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
  const popoverAnchorStyleProps = stylex.props(styles.popoverAnchor);

  return (
    <div
      {...popoverAnchorStyleProps}
      className={`${popoverAnchorStyleProps.className ?? ""} show-subtasks mr10`.trim()}
      id="two-column-mode-checkbox"
      title={popoverTitle}
      data-stylex-owner="user-profile-show-subtasks-popover-anchor"
      onBlur={hidePopover}
      onFocus={showPopover}
      onMouseEnter={showPopover}
      onMouseLeave={hidePopover}
    >
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy template keeps this checkbox wrapper. */}
      <label className="checkbox">
        <div className="show-subtasks-button-border">
          <input
            id="toggle-show-subtasks"
            type="checkbox"
            checked={checked}
            onChange={storeShowSubtasks}
          />
          <span className="show-subtasks-text">{popoverTitle}</span>
        </div>
      </label>
      {isPopoverVisible ? (
        <div
          className={`${stylex.props(userProfileStaticStyles.faqPopover).className} popover top`}
          role="tooltip"
          data-stylex-owner="user-profile-show-subtasks-popover"
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
    return <span className="infos-item"></span>;
  }
  return (
    <ProfileTextLink
      className={`${applyAuthorCellStyle ? `${stylex.props(styles.issueAuthorCell).className} ` : ""}infos-item infos-link-item author-cell`}
      label={label}
      loginId={loginId}
      stylexOwner={applyAuthorCellStyle ? "user-profile-issue-author-cell" : undefined}
    />
  );
}

function ProfileTextLink({
  className,
  label,
  loginId,
  stylexOwner,
}: {
  className: string;
  label: string;
  loginId: string;
  stylexOwner?: string;
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
      {...(stylexOwner ? { "data-stylex-owner": stylexOwner } : {})}
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
