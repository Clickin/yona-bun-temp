import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { listNotificationsQueryOptions, type NotificationItem } from "../api/notifications";
import { currentSessionQueryOptions } from "../api/session";
import { readWorkspaceOverviewRest } from "../api/workspace";
import type { YonaRecord } from "../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";

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

  function handleLoadMoreKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    void loadMoreNotifications();
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
                      <a href={prefixBasePath(runtimeConfig.basePath, "/notifications")}>
                        {t("notification")}
                      </a>
                    </li>
                    <li>
                      <a href={prefixBasePath(runtimeConfig.basePath, "/issues")}>
                        {t("issue.myIssue")}
                      </a>
                    </li>
                    <li>
                      <a href={prefixBasePath(runtimeConfig.basePath, "/user/files")}>
                        {t("user.files")}
                      </a>
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
                      <li
                        onClick={(event) => {
                          event.preventDefault();
                          void loadMoreNotifications();
                        }}
                        onKeyDown={handleLoadMoreKeyDown}
                        dangerouslySetInnerHTML={{
                          __html:
                            '<a href="javascript:void(0);" id="notification-more" class="ybtn">More</a>',
                        }}
                      />
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
  const streamDescRef = React.useRef<HTMLDivElement>(null);
  const messageWrapRef = React.useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = React.useState(false);
  const [isMoreVisible, setIsMoreVisible] = React.useState(false);

  React.useEffect(() => {
    const streamDesc = streamDescRef.current;
    if (!streamDesc) {
      return;
    }

    streamDesc.addEventListener("click", handleLearnMoreClick);
    return () => streamDesc.removeEventListener("click", handleLearnMoreClick);
  });

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
    setIsMoreVisible(isOverflowing);
  }, [notification.message]);

  function handleLearnMoreClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element) || target.closest("a, img")) {
      return;
    }

    const messageWrap = document.getElementById(`message-${notification.id}`);
    if (!messageWrap) {
      return;
    }

    messageWrap.classList.toggle("nowrap");
    const message = messageWrap.querySelector<HTMLElement>(".message");
    messageWrap.style.minHeight = messageWrap.classList.contains("nowrap")
      ? ""
      : `${message?.getBoundingClientRect().height ?? 0}px`;
    if (hasOverflow) {
      setIsMoreVisible(messageWrap.classList.contains("nowrap"));
    }
  }

  return (
    <li className="notification-stream">
      <div className={`stream-type ${notification.typeIcon}`}>
        <i className={`yobicon-${notification.typeIcon}`} />
      </div>
      <div
        className="stream-desc"
        data-target={`message-${notification.id}`}
        data-toggle="learnmore"
        ref={streamDescRef}
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
            className="message-wrap nowrap"
            id={`message-${notification.id}`}
            ref={messageWrapRef}
          >
            <div className="message">{notification.message}</div>
          </div>
          {hasOverflow ? (
            <div className="more" style={isMoreVisible ? undefined : { display: "none" }}>
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
    </li>
  );
}

export function SiteLayoutShell({
  activeMenu,
  children,
  runtimeConfig,
}: {
  activeMenu?: "projects";
  children: React.ReactNode;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const session = sessionQuery.data;
  const shouldRenderAnonymousUserMenu = sessionQuery.data?.isAnonymous !== false;

  return (
    <>
      <div className="unsupported hidden">
        <div className="unsupported-inner">
          <p id="unsupported-content" />
        </div>
      </div>
      <header className="gnb-outer">
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
                action={prefixBasePath(runtimeConfig.basePath, "/search")}
                className="input-prepend gnb-search-form"
                name="gnb-search-form"
              >
                <input type="hidden" name="searchType" value="auto" />
                <div className="search-box">
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
  const workspaceQuery = useQuery({
    enabled: Boolean(session.loginId),
    queryFn: () => readWorkspaceOverviewRest(runtimeConfig),
    queryKey: ["workspace", "overview", "sidebar"],
  });
  const loginId = stringField(session, "loginId", "anonymous");
  const avatarUrl = stringField(session, "avatarUrl", "/assets/images/default-avatar-32.png");
  const isSiteAdmin = booleanField(session, "isSiteAdmin", false);
  const isGuest = booleanField(session, "isGuest", false);
  const legacyVoidHrefRef = React.useCallback((node: HTMLAnchorElement | null) => {
    node?.setAttribute("href", "javascript:void(0);");
  }, []);

  return (
    <>
      <div id="mySidenav" className={isSidebarOpen ? "sidenav sidenav-open" : "sidenav"}>
        <div className="span5 right-menu span-hard-wrap">
          <div className="row-fluid user-menu-wrap">
            <span className="user-menu">
              <a href={prefixBasePath(basePath, `/${loginId}`)}>{t("userinfo.profile")}</a>
            </span>
            <span className="user-menu">
              <a href={prefixBasePath(basePath, "/user/editform")}>
                {t("userinfo.accountSetting")}
              </a>
            </span>
            <a href={prefixBasePath(basePath, "/users/logout")}>
              <span className="user-menu logout label">{t("title.logout")}</span>
            </a>
          </div>
          <ul className="nav nav-tabs nm">
            <li className="myOrganizationList active">
              <a
                href="#myOrganizationList"
                data-toggle="tab"
                onClick={(event) => {
                  event.preventDefault();
                  setActiveSidebarTab("favorite");
                }}
              >
                {t("title.favorite")}
              </a>
            </li>
            <li className="myProjectList">
              <a
                href="#myProjectList"
                data-toggle="tab"
                onClick={(event) => {
                  event.preventDefault();
                  setActiveSidebarTab("project");
                }}
              >
                {t("title.project")}
              </a>
            </li>
            <li className="myRecentIssueList">
              <a
                href="#myRecentIssueList"
                data-toggle="tab"
                onClick={(event) => {
                  event.preventDefault();
                  setActiveSidebarTab("recent");
                }}
              >
                {t("title.recently.visited.issue")}
              </a>
            </li>
          </ul>
          <div className="tab-content tab-box">
            <div id="usermenu-tab-content-list" className="tab-content">
              {workspaceQuery.data ? (
                <SidebarTabContent
                  activeTab={activeSidebarTab}
                  basePath={basePath}
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
        <li
          className="gnb-usermenu-item"
          data-toggle="tooltip"
          data-placement="bottom"
          title={`${t("title.shortcut")} (A)`}
        >
          <a href={prefixBasePath(basePath, "/user/issues")} className="user-item-btn loggged-in">
            {t("issue.myIssue")}
          </a>
        </li>
        <li className="divider"></li>
        {isSiteAdmin ? (
          <>
            <li className="gnb-usermenu-item">
              <a
                href={prefixBasePath(basePath, "/sites/userList")}
                data-toggle="tooltip"
                title={t("menu.siteAdmin")}
                data-placement="bottom"
                className="usermenu-icon-button show-progress-bar"
              >
                <i className="yobicon-wrench" />
              </a>
            </li>
            <li className="divider"></li>
          </>
        ) : null}
        <li className="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn">
          <a
            ref={legacyVoidHrefRef}
            href={prefixBasePath(basePath, "/")}
            className="gnb-dropdown-toggle"
            data-toggle="tooltip"
            data-placement="bottom"
            title={`${t("user.menu")}, ${t("title.shortcut")} (F)`}
            onClick={(event) => {
              event.preventDefault();
              setIsSidebarOpen((value) => !value);
            }}
          >
            <span className="avatar-wrap smaller">
              <img src={avatarUrl} alt="" />
            </span>
            <span className="caret"></span>
          </a>
        </li>
        <li className="gnb-usermenu-dropdown">
          <a
            ref={legacyVoidHrefRef}
            href={prefixBasePath(basePath, "/")}
            className="gnb-dropdown-toggle dropdwon-box-btn"
            data-toggle="dropdown"
          >
            <i className="yobicon-plus"></i>
            <span className="caret"></span>
          </a>
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
              <a href={prefixBasePath(basePath, "/projectform")}>{t("button.newProject")}</a>
            </li>
            {!isGuest ? (
              <li>
                <a href={prefixBasePath(basePath, "/organizations/new")}>
                  {t("title.newOrganization")}
                </a>
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
            <li className="myOrganizationList active">
              <a href="#myOrganizationList" data-toggle="tab">
                {t("title.favorite")}
              </a>
            </li>
            <li className="myProjectList">
              <a href="#myProjectList" data-toggle="tab">
                {t("title.project")}
              </a>
            </li>
            <li className="myRecentIssueList">
              <a href="#myRecentIssueList" data-toggle="tab">
                {t("title.recently.visited.issue")}
              </a>
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
  workspace,
}: {
  activeTab: "favorite" | "project" | "recent";
  basePath: string;
  workspace: YonaRecord;
}) {
  if (activeTab === "project") {
    return <SidebarProjectList basePath={basePath} workspace={workspace} />;
  }
  if (activeTab === "recent") {
    return <SidebarRecentIssueList basePath={basePath} workspace={workspace} />;
  }
  return <>{"Loading..."}</>;
}

function SidebarProjectList({ basePath, workspace }: { basePath: string; workspace: YonaRecord }) {
  const { t } = useLegacyMessages();
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
              <li className="active">
                <a href="#recentlyVisited" data-toggle="tab">
                  {t("title.recently.visited")}
                </a>
              </li>
              <li>
                <a href="#createdByMe" data-toggle="tab">
                  {t("title.createdByMe")}
                </a>
              </li>
              <li>
                <a href="#watching" data-toggle="tab">
                  {t("title.watching")}
                </a>
              </li>
              <li>
                <a href="#joinmember" data-toggle="tab">
                  {t("title.joinmember")}
                </a>
              </li>
            </ul>
          </div>
          <div className="tab-content">
            <SidebarProjectPane
              active
              basePath={basePath}
              id="recentlyVisited"
              projects={recentProjects}
            />
            <SidebarProjectPane basePath={basePath} id="watching" projects={watchedProjects} />
            <SidebarProjectPane basePath={basePath} id="createdByMe" projects={[]} />
            <SidebarProjectPane basePath={basePath} id="joinmember" projects={memberProjects} />
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

function projectKey(project: YonaRecord) {
  return valueString(
    project.id ??
      `${valueString(project.ownerName ?? project.owner, "")}/${valueString(project.projectName ?? project.name, "")}`,
    "project",
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
