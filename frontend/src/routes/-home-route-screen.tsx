import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "@tanstack/react-router";
import { listNotificationsQueryOptions, type NotificationItem } from "../api/notifications";
import { currentSessionQueryOptions } from "../api/session";
import { readWorkspaceOverviewRest } from "../api/workspace";
import type { YonaRecord } from "../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";

const LEGACY_USER_LINK_SEARCH = { daysAgo: undefined, selected: undefined } as unknown as {
  daysAgo: number;
  selected: "issues" | "projects" | "pullRequests";
};

export function HomeRouteScreen({
  flashMessageKey = "",
  runtimeConfig,
  routePath = "/",
}: {
  flashMessageKey?: string;
  runtimeConfig: RuntimeConfig;
  routePath?: string;
}) {
  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <HomeScreen
          flashMessageKey={flashMessageKey}
          routePath={routePath}
          runtimeConfig={runtimeConfig}
        />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function HomeScreen({
  flashMessageKey,
  routePath,
  runtimeConfig,
}: {
  flashMessageKey: string;
  routePath: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const notificationsQuery = useQuery({
    ...listNotificationsQueryOptions(runtimeConfig, { from: 0, size: 20 }),
    enabled: sessionQuery.data?.isAnonymous === false,
  });
  const siteName = runtimeConfig.siteName ?? "Yona";
  const features = [
    ["yobicon-cgicenter", t("title.unlimitedProjects"), t("site.features.unlimitedProjects")],
    ["yobicon-code", t("title.codeManagement"), t("site.features.codeManagement")],
    ["yobicon-articles", t("title.issueTracker"), t("site.features.issueTracker")],
    ["yobicon-lock", t("title.privateProject"), t("site.features.privateRepositories")],
    ["yobicon-preview", t("title.codeReview"), t("site.features.codeReview")],
    ["yobicon-friends", t("title.workTeam"), t("site.features.workTeam")],
  ];
  const isAuthenticated = sessionQuery.data?.isAnonymous === false;
  const defaultLandingPath =
    typeof sessionQuery.data?.defaultLandingPath === "string"
      ? sessionQuery.data.defaultLandingPath
      : "";
  const routePathWithoutSlash = routePath.replace(/^\/+/u, "");
  const defaultLandingWithoutSlash = defaultLandingPath.replace(/^\/+/u, "");
  const defaultLandingTarget = safeDefaultLandingPath(defaultLandingPath);
  const shouldShowDefaultLandingButton =
    routePath !== "/" &&
    routePathWithoutSlash !== "" &&
    routePathWithoutSlash !== defaultLandingWithoutSlash;
  const [isIntroVisible, setIsIntroVisible] = React.useState(
    () => typeof window === "undefined" || localStorage.getItem("yobi-intro") !== "false",
  );
  const [notificationItems, setNotificationItems] = React.useState<NotificationItem[]>([]);
  const [notificationHasMore, setNotificationHasMore] = React.useState(false);
  const [isLoadingMoreNotifications, setIsLoadingMoreNotifications] = React.useState(false);

  React.useEffect(() => {
    if (!flashMessageKey) {
      return;
    }
    document.dispatchEvent(new Event("yobi:notify-scan"));
    const timeoutId = window.setTimeout(
      () => document.dispatchEvent(new Event("yobi:notify-scan")),
      0,
    );
    return () => window.clearTimeout(timeoutId);
  }, [flashMessageKey]);

  React.useEffect(() => {
    if (!notificationsQuery.data) {
      return;
    }
    setNotificationItems(notificationsQuery.data.items);
    setNotificationHasMore(notificationsQuery.data.hasMore);
  }, [notificationsQuery.data]);

  function toggleIntro() {
    setIsIntroVisible((current) => {
      const next = !current;
      localStorage.setItem("yobi-intro", String(next));
      return next;
    });
  }

  async function loadMoreNotifications() {
    if (isLoadingMoreNotifications) {
      return;
    }
    setIsLoadingMoreNotifications(true);
    try {
      const nextPage = await queryClient.fetchQuery(
        listNotificationsQueryOptions(runtimeConfig, {
          from: notificationItems.length,
          size: 20,
        }),
      );
      setNotificationItems((current) => [...current, ...nextPage.items]);
      setNotificationHasMore(nextPage.hasMore);
    } finally {
      setIsLoadingMoreNotifications(false);
    }
  }

  if (
    isAuthenticated &&
    routePath === "/" &&
    defaultLandingTarget &&
    defaultLandingTarget !== "/"
  ) {
    return <Navigate to={defaultLandingTarget} />;
  }

  if (isAuthenticated) {
    return (
      <SiteLayoutShell runtimeConfig={runtimeConfig}>
        <div className="page-wrap-outer">
          <div className="page-wrap">
            <div className={isIntroVisible ? "site-guide-outer" : "site-guide-outer hide"}>
              <h3>
                <span>{`${t("app.welcome", { args: [siteName] })} - ${t("app.description")}`}</span>
              </h3>
              <table className="welcome-table table borderless">
                <tbody>
                  <tr>
                    <td>
                      <a
                        href={prefixBasePath(runtimeConfig.basePath, "/projects/new")}
                        className="ybtn ybtn-success"
                      >
                        {t("button.newProject")}
                      </a>
                    </td>
                    <td>{t("app.welcome.project.desc")}</td>
                  </tr>
                  <tr>
                    <td>
                      <a
                        href={prefixBasePath(runtimeConfig.basePath, "/organizations/new")}
                        className="ybtn ybtn-success"
                      >
                        {t("title.newOrganization")}
                      </a>
                    </td>
                    <td>{t("app.welcome.group.desc")}</td>
                  </tr>
                  <tr>
                    <td>
                      <a
                        href={prefixBasePath(runtimeConfig.basePath, "/projects")}
                        className="ybtn ybtn-success"
                      >
                        {t("title.projectList")}
                      </a>
                    </td>
                    <td>{t("app.welcome.searchProject.desc")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="guide-toggle">
              <button
                className="btn-transparent"
                id="toggleIntro"
                type="button"
                onClick={toggleIntro}
              >
                <i className="yobicon-resizev" />
              </button>
            </div>
            <div className="page on-fold-intro">
              <div className="row-fluid content-container">
                <div className="span8 main-stream">
                  <ul className="nav nav-tabs">
                    <li className="active">
                      <Link activeProps={{ className: undefined }} to="/notifications">
                        {t("notification")}
                      </Link>
                    </li>
                    <li>
                      <Link activeProps={{ className: undefined }} to="/user/issues">
                        {t("issue.myIssue")}
                      </Link>
                    </li>
                    <li>
                      <Link activeProps={{ className: undefined }} to="/user/files">
                        {t("user.files")}
                      </Link>
                    </li>
                    <li>
                      {shouldShowDefaultLandingButton ? (
                        <button
                          id="setDefaultLoginPage"
                          type="button"
                          className="ybtn hide-in-mobile"
                          data-url={routePathWithoutSlash}
                          title={t("button.setDefaultLoginPage")}
                          data-trigger="hover"
                          data-placement="bottom"
                          data-toggle="popover"
                          data-content={t("button.setDefaultLoginPage.desc")}
                        >
                          {t("button.setDefaultLoginPage")}
                        </button>
                      ) : null}
                    </li>
                  </ul>
                  <ul className="activity-streams notification-wrap unstyled">
                    {notificationItems.length === 0 ? (
                      <div className="warning-none">
                        <i className="yobicon-danger" />
                        {t("notification.none")}
                      </div>
                    ) : (
                      notificationItems.map((notification) => (
                        <NotificationStreamItem
                          key={notification.id}
                          notification={notification}
                          runtimeConfig={runtimeConfig}
                        />
                      ))
                    )}
                    {notificationHasMore ? (
                      <li>
                        <button
                          id="notification-more"
                          type="button"
                          className="ybtn"
                          onClick={() => {
                            void loadMoreNotifications();
                          }}
                        >
                          More
                        </button>
                      </li>
                    ) : null}
                  </ul>
                </div>
                <div className="span4 index-menu right-menu span-hard-wrap" />
              </div>
            </div>
          </div>
        </div>
      </SiteLayoutShell>
    );
  }

  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig}>
      {flashMessageKey ? (
        <span data-toggle="yobi-notify" data-message={t(flashMessageKey)} hidden>
          {t(flashMessageKey)}
        </span>
      ) : null}
      <div className="siteintro-bg row">
        <div className="siteintro">
          <div className="siteintro-cover">
            <div className="siteintro-wrap">
              <h1 className="site-heading">21st Century Software Development Platform</h1>
              <ul className="site-features">
                <li>Just focus on what you have to do</li>
              </ul>
            </div>
            <div className="signup-btn">
              <Link
                to="/users/signupform"
                className="ybtn ybtn-success ybtn-padding"
                activeOptions={{ exact: true }}
              >
                {t("button.signup", { args: [siteName] })}
              </Link>
            </div>
          </div>
        </div>
        <div className="feature">
          <h2>
            <span>{t("title.features")}</span>
          </h2>
          <ul className="feature-wrap row">
            {features.map(([iconClassName, title, description]) => (
              <li key={iconClassName}>
                <div className="feature-image">
                  <i className={iconClassName} />
                </div>
                <div className="feature-info">
                  <h3 className="feature-title">{title}</h3>
                  <p className="feature-desc">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SiteLayoutShell>
  );
}

function NotificationStreamItem({
  notification,
  runtimeConfig,
}: {
  notification: NotificationItem;
  runtimeConfig: RuntimeConfig;
}) {
  const userHref = prefixBasePath(runtimeConfig.basePath, `/${notification.actor.loginId}`);
  const messageWrapRef = React.useRef<HTMLDivElement>(null);
  const messageRef = React.useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [expandedMinHeight, setExpandedMinHeight] = React.useState<string | undefined>();

  React.useLayoutEffect(() => {
    const messageWrap = messageWrapRef.current;
    if (!messageWrap) {
      return;
    }

    const currentOverflow = messageWrap.style.overflow;
    if (!currentOverflow || currentOverflow === "visible") {
      messageWrap.style.overflow = "hidden";
    }
    const isOverflowing =
      messageWrap.clientWidth < messageWrap.scrollWidth ||
      messageWrap.clientHeight < messageWrap.scrollHeight;
    messageWrap.style.overflow = currentOverflow;
    setHasOverflow(isOverflowing);
    setIsExpanded(false);
    setExpandedMinHeight(undefined);
  }, [notification.message]);

  function toggleLearnMore() {
    setIsExpanded((wasExpanded) => {
      const nextExpanded = !wasExpanded;
      setExpandedMinHeight(
        nextExpanded ? `${messageRef.current?.getBoundingClientRect().height ?? 0}px` : undefined,
      );
      return nextExpanded;
    });
  }

  function handleLearnMoreClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element) || target.closest("a, img")) {
      return;
    }

    toggleLearnMore();
  }

  function handleLearnMoreKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleLearnMore();
  }

  return (
    <li className="notification-stream">
      <div className={`stream-type ${notification.typeIcon}`}>
        <i className={`yobicon-${notification.typeIcon}`} />
      </div>
      {/* oxlint-disable jsx-a11y/prefer-tag-over-role -- legacy notification row uses a div as the learn-more activator. */}
      <div
        className="stream-desc"
        data-target={`message-${notification.id}`}
        data-toggle="learnmore"
        onClick={handleLearnMoreClick}
        onKeyDown={handleLearnMoreKeyDown}
        role="button"
        tabIndex={0}
      >
        <div className="stream-info">
          <div className="title">
            {notification.targetHref ? (
              <a href={prefixBasePath(runtimeConfig.basePath, notification.targetHref)}>
                {notification.targetTitle}
              </a>
            ) : (
              notification.targetTitle
            )}
          </div>
          <div
            className={isExpanded ? "message-wrap" : "message-wrap nowrap"}
            id={`message-${notification.id}`}
            ref={messageWrapRef}
            style={expandedMinHeight ? { minHeight: expandedMinHeight } : undefined}
          >
            <div className="message" ref={messageRef}>
              {notification.message}
            </div>
          </div>
          {hasOverflow ? (
            <div className="more" style={isExpanded ? { display: "none" } : undefined}>
              ...
            </div>
          ) : null}
          <div className="meta">
            <a className="avatar-wrap smaller" href={userHref}>
              <img src={notification.actor.avatarUrl} alt="" />
            </a>
            <a href={userHref} className="author">
              {notification.actor.displayName}
            </a>
            @{notification.actor.loginId}
            <span className="ago pull-right" title={notification.createdAt}>
              {notification.createdLabel}
            </span>
          </div>
        </div>
      </div>
      {/* oxlint-enable jsx-a11y/prefer-tag-over-role */}
    </li>
  );
}

export function SiteLayoutShell({
  activeMenu,
  children,
  projectSearchScope,
  runtimeConfig,
}: {
  activeMenu?: "projects";
  children: React.ReactNode;
  projectSearchScope?: { ownerName: string; projectName: string };
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const session = sessionQuery.data;
  const shouldRenderAnonymousUserMenu = sessionQuery.data?.isAnonymous !== false;
  const shouldRenderSiteAdminAffix =
    sessionQuery.data?.isAnonymous === false &&
    booleanField(sessionQuery.data, "isSiteAdmin", false);
  const projectSearchAction = projectSearchScope
    ? prefixBasePath(
        runtimeConfig.basePath,
        `/${projectSearchScope.ownerName}/${projectSearchScope.projectName}/search`,
      )
    : null;
  const allProjectsSearchAction = prefixBasePath(runtimeConfig.basePath, "/search");
  const [selectedSearchScope, setSelectedSearchScope] = React.useState<"project" | "all">(
    "project",
  );
  React.useEffect(() => {
    setSelectedSearchScope("project");
  }, [projectSearchAction]);
  const gnbSearchAction =
    projectSearchAction && selectedSearchScope === "project"
      ? projectSearchAction
      : allProjectsSearchAction;
  const gnbSearchScopeTitle =
    projectSearchAction && selectedSearchScope === "project"
      ? t("search.scope.project")
      : t("search.scope.all");

  return (
    <>
      <div className="unsupported hidden">
        <div className="unsupported-inner">
          <p id="unsupported-content" />
        </div>
      </div>
      {shouldRenderSiteAdminAffix ? (
        <div className="admin-logged-in-affix" data-spy="affix" data-offset-top="30">
          {t("user.siteAdminLoggedInAffix")}{" "}
          <span className="small-font">{t("user.siteAdminLoggedInAffix.maxim")}</span>
        </div>
      ) : null}
      <header className={projectSearchScope ? "gnb-outer project-header" : "gnb-outer"}>
        <div className="gnb-inner">
          <div className="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar">
            <i className="yobicon-arrow-left" />
            <i className="yobicon-arrow-right" />
          </div>
          <ul className="gnb-nav">
            <li>
              <a href={prefixBasePath(runtimeConfig.basePath, "/")} className="logo logo-letter">
                Y
              </a>
            </li>
            {activeMenu === "projects" ? (
              <>
                <li className="active">
                  <a
                    href={prefixBasePath(runtimeConfig.basePath, "/projects")}
                    className="show-progress-bar"
                  >
                    {t("title.list")}
                  </a>
                </li>
                <li className="divider"></li>
              </>
            ) : null}
            <li>
              <form
                action={gnbSearchAction}
                className="input-prepend gnb-search-form"
                name="gnb-search-form"
              >
                <input type="hidden" name="searchType" value="auto" />
                {projectSearchAction ? (
                  <div className="btn-group">
                    <button
                      className="ybtn dropdown-toggle"
                      data-toggle="dropdown"
                      type="button"
                      id="gnb-search-scope-title"
                    >
                      {gnbSearchScopeTitle}
                    </button>
                    <ul className="dropdown-menu flat right">
                      <li>
                        <button
                          type="button"
                          data-toggle="search-scope"
                          data-action={projectSearchAction}
                          onClick={() => setSelectedSearchScope("project")}
                        >
                          {t("search.scope.project")}
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          data-toggle="search-scope"
                          data-action={allProjectsSearchAction}
                          onClick={() => setSelectedSearchScope("all")}
                        >
                          {t("search.scope.all")}
                        </button>
                      </li>
                    </ul>
                  </div>
                ) : null}
                <div className={projectSearchScope ? "search-box select" : "search-box"}>
                  {/* oxlint-disable-next-line jsx-a11y/no-access-key -- legacy common/navbar.scala.html exposes accesskey="S". */}
                  <input type="text" name="keyword" autoComplete="off" accessKey="S" />
                  <button type="submit">
                    <i className="yobicon-search" />
                  </button>
                </div>
              </form>
            </li>
          </ul>
          {shouldRenderAnonymousUserMenu ? (
            <AnonymousSiteUserMenu basePath={runtimeConfig.basePath} />
          ) : (
            <AuthenticatedSiteUserMenu
              basePath={runtimeConfig.basePath}
              runtimeConfig={runtimeConfig}
              session={session ?? {}}
            />
          )}
        </div>
      </header>
      {children}
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">
            Copyright{" "}
            <a
              href="https://github.com/yona-projects/yona/blob/master/AUTHORS"
              target="_blank"
              className="yona-author"
            >
              Yona authors
            </a>
            {" & © "}
            <a href="https://navercorp.com" target="_blank">
              NAVER Corp.
            </a>
            {" & "}
            <a href="https://naverlabs.com/" target="_blank" className="naver-labs">
              NAVER LABS
            </a>{" "}
            Supported by{" "}
            <a
              href="https://www.ncloud.com/?referer=yona"
              target="_blank"
              className="naver-cloud-platform"
            >
              NAVER CLOUD PLATFORM
            </a>
          </span>
        </div>
      </footer>
    </>
  );
}

function AuthenticatedSiteUserMenu({
  basePath,
  runtimeConfig,
  session,
}: {
  basePath: string;
  runtimeConfig: RuntimeConfig;
  session: YonaRecord;
}) {
  const { t } = useLegacyMessages();
  const [activeSidebarTab, setActiveSidebarTab] = React.useState<"favorite" | "project" | "recent">(
    "favorite",
  );
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = React.useState(false);
  const workspaceQuery = useQuery({
    enabled: Boolean(session.loginId),
    queryFn: () => readWorkspaceOverviewRest(runtimeConfig),
    queryKey: ["workspace", "overview", "sidebar"],
  });
  const loginId = stringField(session, "loginId", "anonymous");
  const avatarUrl = stringField(session, "avatarUrl", "/assets/images/default-avatar-32.png");
  const isSiteAdmin = booleanField(session, "isSiteAdmin", false);
  const isGuest = booleanField(session, "isGuest", false);
  const navbarCustomLinkName = runtimeConfig.navbarCustomLinkName?.trim() ?? "";
  const navbarCustomLinkUrl = runtimeConfig.navbarCustomLinkUrl?.trim() ?? "";

  return (
    <>
      <div id="mySidenav" className={isSidebarOpen ? "sidenav sidenav-open" : "sidenav"}>
        <div className="span5 right-menu span-hard-wrap">
          <div className="row-fluid user-menu-wrap">
            <span className="user-menu">
              <Link
                activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                activeProps={{
                  "aria-current": undefined,
                  className: undefined,
                  "data-status": undefined,
                }}
                to="/$user"
                params={{ user: loginId }}
                search={LEGACY_USER_LINK_SEARCH}
              >
                {t("userinfo.profile")}
              </Link>
            </span>
            <span className="user-menu">
              <Link
                activeProps={{
                  "aria-current": undefined,
                  className: undefined,
                  "data-status": undefined,
                }}
                to="/user/editform"
              >
                {t("userinfo.accountSetting")}
              </Link>
            </span>
            <a href={prefixBasePath(basePath, "/users/logout")}>
              <span className="user-menu logout label">{t("title.logout")}</span>
            </a>
          </div>
          <ul className="nav nav-tabs nm">
            <li className={`myOrganizationList${activeSidebarTab === "favorite" ? " active" : ""}`}>
              <button
                type="button"
                data-toggle="tab"
                onClick={() => setActiveSidebarTab("favorite")}
              >
                {t("title.favorite")}
              </button>
            </li>
            <li className={`myProjectList${activeSidebarTab === "project" ? " active" : ""}`}>
              <button
                type="button"
                data-toggle="tab"
                onClick={() => setActiveSidebarTab("project")}
              >
                {t("title.project")}
              </button>
            </li>
            <li className={`myRecentIssueList${activeSidebarTab === "recent" ? " active" : ""}`}>
              <button type="button" data-toggle="tab" onClick={() => setActiveSidebarTab("recent")}>
                {t("title.recently.visited.issue")}
              </button>
            </li>
          </ul>
          <div className="tab-content tab-box">
            <div id="usermenu-tab-content-list" className="tab-content">
              {workspaceQuery.data ? (
                <SidebarTabContent
                  activeTab={activeSidebarTab}
                  basePath={basePath}
                  sessionLoginId={loginId}
                  workspace={workspaceQuery.data}
                />
              ) : (
                "Loading..."
              )}
            </div>
          </div>
        </div>
      </div>
      <ul className="gnb-usermenu">
        {navbarCustomLinkName ? (
          <li className="gnb-usermenu-item">
            <a href={navbarCustomLinkUrl} className="user-item-btn loggged-in">
              {navbarCustomLinkName}
            </a>
          </li>
        ) : null}
        <li
          className="gnb-usermenu-item"
          data-toggle="tooltip"
          data-placement="bottom"
          title={`${t("title.shortcut")} (A)`}
        >
          <Link to="/user/issues" className="user-item-btn loggged-in">
            {t("issue.myIssue")}
          </Link>
        </li>
        <li className="divider"></li>
        {isSiteAdmin ? (
          <>
            <li className="gnb-usermenu-item">
              <Link to="/sites/userList" className="usermenu-icon-button show-progress-bar">
                <i className="yobicon-wrench" />
              </Link>
            </li>
            <li className="divider"></li>
          </>
        ) : null}
        <li className="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn">
          <button
            type="button"
            className="gnb-dropdown-toggle"
            data-toggle="tooltip"
            data-placement="bottom"
            title={`${t("user.menu")}, ${t("title.shortcut")} (F)`}
            onClick={() => setIsSidebarOpen((value) => !value)}
          >
            <span className="avatar-wrap smaller">
              <img src={avatarUrl} alt="" />
            </span>
            <span className="caret"></span>
          </button>
        </li>
        <li className={isCreateMenuOpen ? "gnb-usermenu-dropdown open" : "gnb-usermenu-dropdown"}>
          <button
            type="button"
            className="gnb-dropdown-toggle dropdwon-box-btn"
            data-toggle="dropdown"
            onClick={() => setIsCreateMenuOpen((value) => !value)}
          >
            <i className="yobicon-plus"></i>
            <span className="caret"></span>
          </button>
          <ul className="dropdown-menu flat right">
            <li>
              <a href={prefixBasePath(basePath, "/user/issues/new")}>{t("issue.menu.new")}</a>
            </li>
            <li>
              <a href={prefixBasePath(basePath, "/user/issues/new/mine")}>
                {t("issue.menu.new.mine")}
              </a>
            </li>
            <li>
              <hr className="no-margin" />
            </li>
            <li>
              <Link to="/projectform">{t("button.newProject")}</Link>
            </li>
            {!isGuest ? (
              <li>
                <Link to="/organizations/new">{t("title.newOrganization")}</Link>
              </li>
            ) : null}
          </ul>
        </li>
      </ul>
    </>
  );
}

function AnonymousSiteUserMenu({ basePath }: { basePath: string }) {
  const { t } = useLegacyMessages();
  const [activeSidebarTab, setActiveSidebarTab] = React.useState<"favorite" | "project" | "recent">(
    "favorite",
  );

  return (
    <>
      <div id="mySidenav" className="sidenav">
        <div className="span5 right-menu span-hard-wrap">
          <div className="row-fluid user-menu-wrap">
            <span className="user-menu">
              <a href={prefixBasePath(basePath, "/user/anonymous")}>{t("userinfo.profile")}</a>
            </span>
            <span className="user-menu">
              <a href={prefixBasePath(basePath, "/user/editform")}>
                {t("userinfo.accountSetting")}
              </a>
            </span>
            <a href={prefixBasePath(basePath, "/logout")}>
              <span className="user-menu logout label">{t("title.logout")}</span>
            </a>
          </div>
          <ul className="nav nav-tabs nm">
            <li className={`myOrganizationList${activeSidebarTab === "favorite" ? " active" : ""}`}>
              <button
                type="button"
                data-toggle="tab"
                onClick={() => setActiveSidebarTab("favorite")}
              >
                {t("title.favorite")}
              </button>
            </li>
            <li className={`myProjectList${activeSidebarTab === "project" ? " active" : ""}`}>
              <button
                type="button"
                data-toggle="tab"
                onClick={() => setActiveSidebarTab("project")}
              >
                {t("title.project")}
              </button>
            </li>
            <li className={`myRecentIssueList${activeSidebarTab === "recent" ? " active" : ""}`}>
              <button type="button" data-toggle="tab" onClick={() => setActiveSidebarTab("recent")}>
                {t("title.recently.visited.issue")}
              </button>
            </li>
          </ul>
          <div className="tab-content tab-box">
            <div id="usermenu-tab-content-list" className="tab-content">
              {"Loading..."}
            </div>
          </div>
        </div>
      </div>
      <ul className="gnb-usermenu">
        <li className="gnb-usermenu-item" id="required-logged-in">
          <a
            href={prefixBasePath(basePath, "/users/loginform")}
            className="user-item-btn"
            data-login="required"
          >
            {t("title.login")}
          </a>
        </li>
        <li className="divider"></li>
        <li>
          <a href={prefixBasePath(basePath, "/users/signupform")} className="ybtn ybtn-success">
            {t("title.signup")}
          </a>
        </li>
      </ul>
    </>
  );
}

function SidebarTabContent({
  activeTab,
  basePath,
  sessionLoginId,
  workspace,
}: {
  activeTab: "favorite" | "project" | "recent";
  basePath: string;
  sessionLoginId: string;
  workspace: YonaRecord;
}) {
  if (activeTab === "project") {
    return <SidebarProjectList basePath={basePath} workspace={workspace} />;
  }
  if (activeTab === "recent") {
    return <SidebarRecentIssueList basePath={basePath} workspace={workspace} />;
  }
  if (hasSidebarFavoriteData(workspace)) {
    return (
      <SidebarOrganizationList
        basePath={basePath}
        sessionLoginId={sessionLoginId}
        workspace={workspace}
      />
    );
  }
  return <>{"Loading..."}</>;
}

function SidebarOrganizationList({
  basePath,
  sessionLoginId,
  workspace,
}: {
  basePath: string;
  sessionLoginId: string;
  workspace: YonaRecord;
}) {
  const { t } = useLegacyMessages();
  const ownProjects = recordArray(workspace.ownProjects);
  const favoriteOrganizations = recordArray(workspace.favoriteOrganizations);
  const organizations = recordArray(workspace.organizations);
  const favoriteProjects = recordArray(workspace.favoriteProjects);
  const loginId = valueString(
    workspace.loginId ?? (workspace.profile as YonaRecord | undefined)?.loginId,
    sessionLoginId,
  );
  const favoriteOrganizationKeys = new Set(favoriteOrganizations.map(organizationKey));
  const regularOrganizations: YonaRecord[] = [];
  for (const organization of organizations) {
    if (!favoriteOrganizationKeys.has(organizationKey(organization))) {
      regularOrganizations.push(organization);
    }
  }

  if (
    ownProjects.length === 0 &&
    favoriteOrganizations.length === 0 &&
    organizations.length === 0 &&
    favoriteProjects.length === 0
  ) {
    return (
      <div className="search-result">
        <div className="group">
          <input
            className="search-input org-search"
            type="text"
            autoComplete="off"
            placeholder={t("title.type.name")}
          />
          <span className="bar"></span>
        </div>
        <div id="organizations" className="no-result tab-pane user-ul">
          {t("title.no.results")}
        </div>
      </div>
    );
  }

  return (
    <div className="search-result">
      <div className="group">
        <input
          className="search-input org-search"
          type="text"
          autoComplete="off"
          placeholder={t("title.type.name")}
        />
        <span className="bar"></span>
      </div>
      <ul className="tab-pane user-ul " id="organizations">
        {ownProjects.length > 0 ? (
          <li className="org-li">
            <div className="org-list project-flex-container all-orgs">
              <div className="project-item project-item-container">
                <div className="flex-item site-logo">
                  <i className="yobicon-angle-right"></i>
                </div>
                <div className="projectName-owner all-org-names flex-item">
                  <div className="project-name org-name flex-item">{loginId}</div>
                  <div className="project-owner flex-item sub-project-counter"></div>
                </div>
              </div>
              <div className="star-org flex-item"></div>
            </div>
            <ul className="project-ul">
              {ownProjects.map((project) => (
                <SidebarAllProjectItem
                  basePath={basePath}
                  favored={booleanValue(project.favored)}
                  key={projectKey(project)}
                  project={project}
                />
              ))}
            </ul>
          </li>
        ) : null}
        {favoriteOrganizations.map((organization, index) => (
          <SidebarOrganizationItem
            basePath={basePath}
            favored
            isLast={index === favoriteOrganizations.length - 1}
            key={organizationKey(organization)}
            organization={organization}
          />
        ))}
        {regularOrganizations.map((organization) => (
          <SidebarOrganizationItem
            basePath={basePath}
            favored={false}
            key={organizationKey(organization)}
            organization={organization}
          />
        ))}
        <ul className="etc-favorites"></ul>
        {favoriteProjects.map((project) => (
          <SidebarProjectItem basePath={basePath} key={projectKey(project)} project={project} />
        ))}
      </ul>
    </div>
  );
}

function SidebarOrganizationItem({
  basePath,
  favored,
  isLast = false,
  organization,
}: {
  basePath: string;
  favored: boolean;
  isLast?: boolean;
  organization: YonaRecord;
}) {
  const organizationName = valueString(organization.organizationName ?? organization.name, "");
  const organizationId = valueString(organization.id ?? organization.organizationId, "");
  const projectCount = valueString(
    organization.projectCount ??
      organization.projectsCount ??
      recordArray(organization.projects).length,
    "",
  );
  const projects = recordArray(organization.projects);

  return (
    <li className={`org-li${isLast ? " favored" : ""}`}>
      <div className="org-list project-flex-container all-orgs">
        <div className="project-item project-item-container">
          <div className="flex-item site-logo">
            <i className="yobicon-angle-right"></i>
          </div>
          <div className="projectName-owner all-org-names flex-item">
            <div className="project-name org-name flex-item">{organizationName}</div>
            <div className="project-owner flex-item">{projectCount}</div>
          </div>
        </div>
        <div className="star-org flex-item" data-organization-id={organizationId}>
          <i className={favored ? "star starred material-icons" : "star material-icons"}>star</i>
        </div>
      </div>
      <ul className="project-ul">
        {projects.map((project) => (
          <SidebarAllProjectItem
            basePath={basePath}
            favored={booleanValue(project.favored)}
            key={projectKey(project)}
            project={project}
          />
        ))}
      </ul>
    </li>
  );
}

function SidebarAllProjectItem({
  basePath,
  favored,
  project,
}: {
  basePath: string;
  favored: boolean;
  project: YonaRecord;
}) {
  const ownerName = valueString(project.ownerName ?? project.owner, "");
  const projectName = valueString(project.projectName ?? project.name, "");
  const projectId = valueString(project.id ?? project.projectId, "");
  const overview = valueString(project.overview, "");
  const logoUrl = valueString(project.logoUrl ?? project.projectLogoUrl, "");
  const isPrivate = booleanValue(project.isPrivate);
  const projectHref = prefixBasePath(basePath, `/${ownerName}/${projectName}`);

  return (
    <li className={`user-li ${favored ? "show-always" : "hide"}`} data-location={projectHref}>
      <div
        className="project-list project-flex-container"
        data-toggle="popover"
        data-trigger="hover"
        data-placement="right"
        data-content={overview}
      >
        <div className="project-item project-item-container">
          <div className="flex-item site-logo all-project-names">
            <i className="project-avatar">
              {logoUrl ? (
                <img className="logo" src={logoUrl} alt="" />
              ) : (
                <span className="dummy-25px"> </span>
              )}
            </i>
          </div>
          <div className="projectName-owner flex-item">
            <div className="project-name flex-item">
              {projectName} {isPrivate ? <i className="yobicon-lock yobicon-small"></i> : null}
            </div>
          </div>
        </div>
        <div className="star-project flex-item" data-project-id={projectId}>
          <i className={favored ? "star starred material-icons" : "star material-icons"}>star</i>
        </div>
      </div>
    </li>
  );
}

function SidebarProjectList({ basePath, workspace }: { basePath: string; workspace: YonaRecord }) {
  const { t } = useLegacyMessages();
  const [activeSubtab, setActiveSubtab] = React.useState<
    "recentlyVisited" | "createdByMe" | "watching" | "joinmember"
  >("recentlyVisited");
  const recentProjects = recordArray(workspace.recentProjects);
  const watchedProjects = recordArray(workspace.watchedProjects);
  const memberProjects = recordArray(workspace.memberProjects);

  return (
    <div>
      <div className="search-result">
        <div className="tab-pane myproject-list-wrap">
          <div className="group">
            <input
              className="search-input project-search"
              type="text"
              id="query"
              autoComplete="off"
              placeholder={t("title.type.name")}
            />
            <span className="bar"></span>
          </div>
          <div className="subtab-wrap subtab-group">
            <ul className="nav-subtab unstyled">
              <li className={activeSubtab === "recentlyVisited" ? "active" : undefined}>
                <button
                  type="button"
                  data-toggle="tab"
                  onClick={() => setActiveSubtab("recentlyVisited")}
                >
                  {t("title.recently.visited")}
                </button>
              </li>
              <li className={activeSubtab === "createdByMe" ? "active" : undefined}>
                <button
                  type="button"
                  data-toggle="tab"
                  onClick={() => setActiveSubtab("createdByMe")}
                >
                  {t("title.createdByMe")}
                </button>
              </li>
              <li className={activeSubtab === "watching" ? "active" : undefined}>
                <button type="button" data-toggle="tab" onClick={() => setActiveSubtab("watching")}>
                  {t("title.watching")}
                </button>
              </li>
              <li className={activeSubtab === "joinmember" ? "active" : undefined}>
                <button
                  type="button"
                  data-toggle="tab"
                  onClick={() => setActiveSubtab("joinmember")}
                >
                  {t("title.joinmember")}
                </button>
              </li>
            </ul>
          </div>
          <div className="tab-content">
            <SidebarProjectPane
              active={activeSubtab === "recentlyVisited"}
              basePath={basePath}
              id="recentlyVisited"
              projects={recentProjects}
            />
            <SidebarProjectPane
              active={activeSubtab === "watching"}
              basePath={basePath}
              id="watching"
              projects={watchedProjects}
            />
            <SidebarProjectPane
              active={activeSubtab === "createdByMe"}
              basePath={basePath}
              id="createdByMe"
              projects={[]}
            />
            <SidebarProjectPane
              active={activeSubtab === "joinmember"}
              basePath={basePath}
              id="joinmember"
              projects={memberProjects}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarProjectPane({
  active = false,
  basePath,
  id,
  projects,
}: {
  active?: boolean;
  basePath: string;
  id: string;
  projects: YonaRecord[];
}) {
  const { t } = useLegacyMessages();
  if (projects.length === 0) {
    return (
      <div id={id} className={`no-result tab-pane user-ul ${active ? "active" : ""}`}>
        {t("title.no.results")}
      </div>
    );
  }
  return (
    <ul className={`tab-pane user-ul ${active ? "active" : ""}`} id={id}>
      {projects.map((project) => (
        <SidebarProjectItem basePath={basePath} key={projectKey(project)} project={project} />
      ))}
    </ul>
  );
}

function SidebarProjectItem({ basePath, project }: { basePath: string; project: YonaRecord }) {
  const ownerName = valueString(project.ownerName ?? project.owner, "");
  const projectName = valueString(project.projectName ?? project.name, "");
  const projectId = valueString(project.id ?? project.projectId, "");
  const logoUrl = valueString(project.logoUrl ?? project.projectLogoUrl, "");
  const isPrivate = booleanValue(project.isPrivate);
  const projectHref = prefixBasePath(basePath, `/${ownerName}/${projectName}`);

  return (
    <li className="user-li" data-location={projectHref}>
      <div className="project-list project-flex-container">
        <div className="project-item project-item-container">
          <div className="flex-item site-logo">
            <i className="project-avatar">
              {logoUrl ? (
                <img className="logo" src={logoUrl} alt="" />
              ) : (
                <span className="dummy-25px"> </span>
              )}
            </i>
          </div>
          <div className="projectName-owner flex-item">
            <div className="project-name flex-item">
              {projectName} {isPrivate ? <i className="yobicon-lock yobicon-small"></i> : null}
            </div>
            <div className="project-owner flex-item">
              <a href={prefixBasePath(basePath, `/${ownerName}`)}>{ownerName}</a>
            </div>
          </div>
        </div>
        <div className="star-project flex-item" data-project-id={projectId}>
          <i className="star material-icons">star</i>
        </div>
      </div>
    </li>
  );
}

function SidebarRecentIssueList({
  basePath,
  workspace,
}: {
  basePath: string;
  workspace: YonaRecord;
}) {
  const { t } = useLegacyMessages();
  const issues = recordArray(workspace.issueItems);

  return (
    <div>
      <div className="search-result">
        <div className="tab-pane myproject-list-wrap">
          <div className="group">
            <input
              className="search-input project-search"
              type="text"
              id="query"
              autoComplete="off"
              placeholder={t("title.type.name")}
            />
            <span className="bar"></span>
          </div>
          <div className="tab-content">
            {issues.length === 0 ? (
              <div id="recentlyVisitedIssues" className="no-result tab-pane user-ul active">
                {t("title.no.results")}
              </div>
            ) : (
              <ul className="tab-pane user-ul active" id="recentlyVisitedIssues">
                {issues.map((issue) => (
                  <SidebarRecentIssueItem
                    basePath={basePath}
                    issue={issue}
                    key={recentIssueKey(issue)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarRecentIssueItem({ basePath, issue }: { basePath: string; issue: YonaRecord }) {
  const ownerName = valueString(issue.ownerName ?? issue.owner_name ?? issue.owner, "");
  const projectName = valueString(issue.projectName ?? issue.project_name ?? issue.project, "");
  const issueNumber = valueString(issue.issueNumber ?? issue.issue_number ?? issue.number, "");
  const title = valueString(issue.title, "");
  const issueHref = valueString(
    issue.url ?? issue.href,
    prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/${issueNumber}`),
  );

  return (
    <li className="user-li" data-location={issueHref}>
      <div
        className="project-list project-flex-container"
        data-toggle="popover"
        data-trigger="hover"
        data-placement="right"
        data-content={issueNumber}
      >
        <div className="project-item project-item-container">
          <div className="issue-item projectName-owner flex-item">
            <div className="issue-title-start">-</div>
            <div className="issue-title flex-item">{title}</div>
          </div>
        </div>
      </div>
    </li>
  );
}

function stringField(record: YonaRecord, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function safeDefaultLandingPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "";
}

function valueString(value: unknown, fallback: string) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}

function recordArray(value: unknown): YonaRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is YonaRecord => typeof item === "object" && item !== null)
    : [];
}

function hasSidebarFavoriteData(workspace: YonaRecord) {
  return (
    Array.isArray(workspace.ownProjects) ||
    Array.isArray(workspace.favoriteOrganizations) ||
    Array.isArray(workspace.organizations) ||
    Array.isArray(workspace.favoriteProjects)
  );
}

function projectKey(project: YonaRecord) {
  return valueString(
    project.id ??
      `${valueString(project.ownerName ?? project.owner, "")}/${valueString(project.projectName ?? project.name, "")}`,
    "project",
  );
}

function organizationKey(organization: YonaRecord) {
  return valueString(
    organization.id ??
      organization.organizationId ??
      organization.organizationName ??
      organization.name,
    "organization",
  );
}

function recentIssueKey(issue: YonaRecord) {
  return valueString(
    issue.id ??
      `${valueString(issue.ownerName ?? issue.owner_name ?? issue.owner, "")}/${valueString(issue.projectName ?? issue.project_name ?? issue.project, "")}/${valueString(issue.issueNumber ?? issue.issue_number ?? issue.number, "")}`,
    "issue",
  );
}

function booleanValue(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

function booleanField(record: YonaRecord, key: string, fallback: boolean): boolean {
  const value = record[key];
  return typeof value === "boolean" ? value : fallback;
}
