import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { listNotificationsQueryOptions, type NotificationItem } from "../api/notifications";
import { toggleFavoriteOrganizationRest, toggleFavoriteProjectRest } from "../api/org-project";
import { currentSessionQueryOptions } from "../api/session";
import { readWorkspaceOverviewRest } from "../api/workspace";
import type { YoramRecord } from "../api/types";
import { readSessionBootstrap } from "../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { globalColors } from "../theme.stylex";
import { useRootLoginDialog, useRootToast } from "./__root";
import siteIntroBackgroundUrl from "../assets/legacy/photo-svetacreative.jpg";

type LegacyUserLinkSearch = {
  daysAgo: number;
  selected: "issues" | "projects" | "pullRequests";
};
type LegacyProjectsLinkSearch = { filter?: string; labelIds?: string };
type LegacyProjectFormLinkSearch = { owner?: string };
type LegacyUserIssuesLinkSearch = {
  filter: "assigned" | "authored" | "commented" | "favorite" | "mentioned" | "shared";
  orderBy: string;
  orderDir: string;
  pageNum: number;
  query: string;
  state: "closed" | "open";
};
type LegacySiteUserListLinkSearch = {
  pageNum: number;
  query: string;
  state: "ACTIVE" | "LOCKED" | "DELETED" | "GUEST" | "SITE_ADMIN";
};
type LegacyLoginFormLinkSearch = {
  password: string;
  redirectUrl: string;
};
type SidebarTab = "favorite" | "project" | "recent";

const LEGACY_USER_LINK_SEARCH = {
  daysAgo: undefined!,
  selected: undefined!,
} satisfies LegacyUserLinkSearch;
const LEGACY_PROJECTS_LINK_SEARCH = {
  filter: undefined,
  labelIds: undefined,
} satisfies LegacyProjectsLinkSearch;
const LEGACY_PROJECT_FORM_LINK_SEARCH = {
  owner: undefined,
} satisfies LegacyProjectFormLinkSearch;
const LEGACY_USER_ISSUES_LINK_SEARCH = {
  filter: undefined!,
  orderBy: undefined!,
  orderDir: undefined!,
  pageNum: undefined!,
  query: undefined!,
  state: undefined!,
} satisfies LegacyUserIssuesLinkSearch;
const LEGACY_SITE_USER_LIST_LINK_SEARCH = {
  pageNum: undefined!,
  query: undefined!,
  state: undefined!,
} satisfies LegacySiteUserListLinkSearch;
const LEGACY_LOGIN_FORM_LINK_SEARCH = {
  password: undefined!,
  redirectUrl: undefined!,
} satisfies LegacyLoginFormLinkSearch;
const LEGACY_GUIDE_NEW_PROJECT_PATH: string = "/projects/new";
const LEGACY_NOTIFICATION_NEW_ISSUE_PATH: string = "/user/issues/new";
const LEGACY_NOTIFICATION_NEW_MY_ISSUE_PATH: string = "/user/issues/new/mine";
const LEGACY_AUTHENTICATED_LOGOUT_PATH: string = "/users/logout";
const LEGACY_ANONYMOUS_LOGOUT_PATH: string = "/logout";
const LEGACY_LEFT_SIDEBAR_OPEN_KEY = "shallWeOpenLeftNavigation";
const LEGACY_LEFT_SIDEBAR_TAB_KEY = "sidebarActiveMenu";
const LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS = {
  activeOptions: { exact: true, explicitUndefined: true, includeSearch: true },
  activeProps: {
    "aria-current": undefined,
    className: undefined,
    "data-status": undefined,
  },
};
const SET_DEFAULT_LOGIN_PAGE_POPOVER_STYLE: React.CSSProperties = {
  display: "block",
  left: "50%",
  marginTop: "10px",
  minWidth: "190px",
  pointerEvents: "none",
  position: "absolute",
  top: "100%",
  transform: "translateX(-50%)",
};
const HOME_SIDEBAR_POPOVER_STYLE: React.CSSProperties = {
  display: "block",
  left: "100%",
  marginLeft: "10px",
  minWidth: "200px",
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 1060,
};

function DefaultLandingRedirect({ href }: { href: string }) {
  const router = useRouter();

  React.useEffect(() => {
    router.history.replace(href);
  }, [href, router.history]);

  return null;
}

export function HomeRouteScreen({
  flashMessageKey = "",
  notificationFragmentOnly = false,
  runtimeConfig,
  routePath = "/",
}: {
  flashMessageKey?: string;
  notificationFragmentOnly?: boolean;
  runtimeConfig: RuntimeConfig;
  routePath?: string;
}) {
  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <HomeScreen
          flashMessageKey={flashMessageKey}
          notificationFragmentOnly={notificationFragmentOnly}
          routePath={routePath}
          runtimeConfig={runtimeConfig}
        />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function HomeScreen({
  flashMessageKey,
  notificationFragmentOnly,
  routePath,
  runtimeConfig,
}: {
  flashMessageKey: string;
  notificationFragmentOnly: boolean;
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
  const siteName = runtimeConfig.siteName ?? "Yoram";
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
  const domainLocalDefaultLandingTarget =
    runtimeConfig.basePath !== "/" && defaultLandingTarget === runtimeConfig.basePath
      ? "/"
      : runtimeConfig.basePath !== "/" &&
          defaultLandingTarget.startsWith(`${runtimeConfig.basePath}/`)
        ? defaultLandingTarget.slice(runtimeConfig.basePath.length)
        : defaultLandingTarget;
  const shouldRedirectToDefaultLanding =
    isAuthenticated &&
    routePath === "/" &&
    domainLocalDefaultLandingTarget !== "" &&
    domainLocalDefaultLandingTarget !== "/";
  const defaultLandingHref = prefixBasePath(
    runtimeConfig.basePath,
    domainLocalDefaultLandingTarget,
  );
  const shouldShowDefaultLandingButton =
    routePath !== "/" &&
    routePathWithoutSlash !== "" &&
    routePathWithoutSlash !== defaultLandingWithoutSlash;
  const setRootToast = useRootToast();
  const [isIntroVisible, setIsIntroVisible] = React.useState(
    () => typeof window === "undefined" || localStorage.getItem("yobi-intro") !== "false",
  );
  const [isDefaultLandingButtonHidden, setIsDefaultLandingButtonHidden] = React.useState(false);
  const [isDefaultLandingPopoverVisible, setIsDefaultLandingPopoverVisible] = React.useState(false);
  const defaultLandingPopoverTimer = React.useRef<number | null>(null);
  const [notificationItems, setNotificationItems] = React.useState<NotificationItem[]>([]);
  const [notificationHasMore, setNotificationHasMore] = React.useState(false);
  const [isLoadingMoreNotifications, setIsLoadingMoreNotifications] = React.useState(false);
  const flashMessage = flashMessageKey ? t(flashMessageKey) : "";
  const defaultLandingButtonTitle = t("button.setDefaultLoginPage");
  const defaultLandingButtonContent = t("button.setDefaultLoginPage.desc");
  const clearDefaultLandingPopoverTimer = React.useCallback(() => {
    if (defaultLandingPopoverTimer.current !== null) {
      window.clearTimeout(defaultLandingPopoverTimer.current);
      defaultLandingPopoverTimer.current = null;
    }
  }, []);
  const showDefaultLandingPopover = () => {
    clearDefaultLandingPopoverTimer();
    defaultLandingPopoverTimer.current = window.setTimeout(() => {
      setIsDefaultLandingPopoverVisible(true);
      defaultLandingPopoverTimer.current = null;
    }, 100);
  };
  const hideDefaultLandingPopover = () => {
    clearDefaultLandingPopoverTimer();
    defaultLandingPopoverTimer.current = window.setTimeout(() => {
      setIsDefaultLandingPopoverVisible(false);
      defaultLandingPopoverTimer.current = null;
    }, 100);
  };
  const setDefaultLoginPage = useMutation({
    mutationFn: async (path: string) => {
      const response = await fetch(
        `${prefixBasePath(runtimeConfig.basePath, "/user/defultLoginPage")}?path=${encodeURIComponent(`/${path}`)}`,
        { method: "POST" },
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json() as Promise<{ defaultLoginPage: string }>;
    },
    onError(error) {
      window.alert(`set Default page failed: ${error instanceof Error ? error.message : error}`);
    },
    onSuccess(_data, path) {
      void queryClient.invalidateQueries({
        queryKey: currentSessionQueryOptions(runtimeConfig).queryKey,
      });
      const toastKey = `default-login-page:${path}:${Date.now()}`;
      setRootToast({ key: toastKey, message: `Set to default: ${path}` });
      window.setTimeout(() => {
        setRootToast((current) => (current?.key === toastKey ? null : current));
      }, 3000);
      setIsDefaultLandingButtonHidden(true);
      setIsDefaultLandingPopoverVisible(false);
    },
  });

  React.useEffect(() => clearDefaultLandingPopoverTimer, [clearDefaultLandingPopoverTimer]);

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

  if (notificationFragmentOnly) {
    return (
      <>
        {notificationItems.length === 0 ? (
          <div className="warning-none">
            <i className="yobicon-danger" /> {t("notification.none")}
          </div>
        ) : (
          notificationItems.map((notification) => (
            <NotificationStreamItem key={notification.id} notification={notification} />
          ))
        )}
        {notificationHasMore ? (
          <li>
            <button
              id="notification-more"
              type="button"
              className="ybtn"
              style={{ boxSizing: "content-box" }}
              onClick={() => {
                void loadMoreNotifications();
              }}
            >
              More
            </button>
          </li>
        ) : null}
      </>
    );
  }

  if (shouldRedirectToDefaultLanding) {
    return <DefaultLandingRedirect href={defaultLandingHref} />;
  }

  if (isAuthenticated) {
    return (
      <SiteLayoutShell runtimeConfig={runtimeConfig}>
        <HomeFlashToast message={flashMessage} />
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
                      <Link
                        to={LEGACY_GUIDE_NEW_PROJECT_PATH}
                        reloadDocument
                        className="ybtn ybtn-success"
                      >
                        {t("button.newProject")}
                      </Link>
                    </td>
                    <td>{t("app.welcome.project.desc")}</td>
                  </tr>
                  <tr>
                    <td>
                      <Link to="/organizations/new" className="ybtn ybtn-success">
                        {t("title.newOrganization")}
                      </Link>
                    </td>
                    <td>{t("app.welcome.group.desc")}</td>
                  </tr>
                  <tr>
                    <td>
                      <Link
                        to="/projects"
                        activeProps={LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS.activeProps}
                        className="ybtn ybtn-success"
                      >
                        {t("title.projectList")}
                      </Link>
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
                      <Link {...LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS} to="/notifications">
                        {t("notification")}
                      </Link>
                    </li>
                    <li>
                      <Link
                        {...LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS}
                        to="/user/issues"
                        search={LEGACY_USER_ISSUES_LINK_SEARCH}
                      >
                        {t("issue.myIssue")}
                      </Link>
                    </li>
                    <li>
                      <Link {...LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS} to="/user/files">
                        {t("user.files")}
                      </Link>
                    </li>
                    <li style={{ position: "relative" }}>
                      {shouldShowDefaultLandingButton ? (
                        <>
                          <button
                            id="setDefaultLoginPage"
                            type="button"
                            className="ybtn hide-in-mobile"
                            title={defaultLandingButtonTitle}
                            style={isDefaultLandingButtonHidden ? { display: "none" } : undefined}
                            onBlur={hideDefaultLandingPopover}
                            onClick={() => {
                              hideDefaultLandingPopover();
                              setDefaultLoginPage.mutate(routePathWithoutSlash);
                            }}
                            onFocus={showDefaultLandingPopover}
                            onMouseEnter={showDefaultLandingPopover}
                            onMouseLeave={hideDefaultLandingPopover}
                          >
                            {defaultLandingButtonTitle}
                          </button>
                          {isDefaultLandingPopoverVisible && !isDefaultLandingButtonHidden ? (
                            <div
                              className="popover bottom"
                              role="tooltip"
                              style={SET_DEFAULT_LOGIN_PAGE_POPOVER_STYLE}
                            >
                              <div className="arrow" />
                              <h3 className="popover-title">{defaultLandingButtonTitle}</h3>
                              <div className="popover-content">{defaultLandingButtonContent}</div>
                            </div>
                          ) : null}
                        </>
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
                        <NotificationStreamItem key={notification.id} notification={notification} />
                      ))
                    )}
                    {notificationHasMore ? (
                      <li>
                        <button
                          id="notification-more"
                          type="button"
                          className="ybtn"
                          style={{ boxSizing: "content-box" }}
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
      <HomeFlashToast message={flashMessage} />
      <div className="siteintro-bg row">
        <div
          className="siteintro"
          style={
            {
              "--siteintro-background-image": `url("${siteIntroBackgroundUrl}")`,
            } as React.CSSProperties
          }
        >
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

function HomeFlashToast({ message }: { message: string }) {
  const setRootToast = useRootToast();

  React.useEffect(() => {
    if (!message) {
      setRootToast(null);
      return;
    }
    setRootToast({ key: `home-flash:${message}`, message });
    const timeoutId = window.setTimeout(() => setRootToast(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [message, setRootToast]);

  return null;
}

function NotificationStreamItem({ notification }: { notification: NotificationItem }) {
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

  return (
    <li className="notification-stream">
      <div className={`stream-type ${notification.typeIcon}`}>
        <i className={`yobicon-${notification.typeIcon}`} />
      </div>
      {/* oxlint-disable jsx-a11y/click-events-have-key-events -- legacy partial_notifications.scala.html uses a clickable plain div here. */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- legacy partial_notifications.scala.html uses a clickable plain div here. */}
      <div className="stream-desc" onClick={handleLearnMoreClick}>
        <div className="stream-info">
          <div className="title">
            {notification.targetHref ? (
              <Link to={notification.targetHref} {...LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS}>
                {notification.targetTitle}
              </Link>
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
              <LegacyNotificationMessage message={notification.message} />
            </div>
          </div>
          {hasOverflow ? (
            <div className="more" style={isExpanded ? { display: "none" } : undefined}>
              ...
            </div>
          ) : null}
          <div className="meta">
            <Link
              to="/$user"
              params={{ user: notification.actor.loginId }}
              search={LEGACY_USER_LINK_SEARCH}
              className="avatar-wrap smaller"
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              activeProps={{
                "aria-current": undefined,
                className: "avatar-wrap smaller",
                "data-status": undefined,
              }}
            >
              <img src={notification.actor.avatarUrl} alt="" />
            </Link>
            <Link
              to="/$user"
              params={{ user: notification.actor.loginId }}
              search={LEGACY_USER_LINK_SEARCH}
              className="author"
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              activeProps={{
                "aria-current": undefined,
                className: "author",
                "data-status": undefined,
              }}
            >
              {notification.actor.displayName}
            </Link>
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

function LegacyNotificationMessage({ message }: { message: string }) {
  const lines = message.split(/\r?\n/u);
  let offset = 0;
  const content: React.ReactNode[] = [];

  for (const [lineNumber, line] of lines.entries()) {
    content.push(line);
    offset += line.length;
    if (lineNumber < lines.length - 1) {
      content.push(<br key={`break-${offset}`} />);
      offset += 1;
    }
  }

  return <>{content}</>;
}

export function SiteLayoutShell({
  activeMenu,
  children,
  projectSearchScope,
  runtimeConfig,
}: {
  activeMenu?: "projects";
  children: React.ReactNode;
  projectSearchScope?: { organizationName?: string; ownerName?: string; projectName?: string };
  runtimeConfig: RuntimeConfig;
  showLegacyProjectHeaderLinks?: boolean;
}) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const session = sessionQuery.data;
  const navbarWorkspaceQuery = useQuery({
    enabled: session?.isAnonymous === false,
    queryFn: () => readWorkspaceOverviewRest(runtimeConfig),
    queryKey: ["workspace", "overview", "sidebar"],
  });
  const workspaceProfile = recordValue(navbarWorkspaceQuery.data?.profile);
  const shouldRenderAnonymousUserMenu = session?.isAnonymous !== false;
  const isGuest = session
    ? booleanField(session, "isGuest", booleanField(workspaceProfile, "isGuest", false))
    : false;
  const isSiteAdmin = session ? booleanField(session, "isSiteAdmin", false) : false;
  const shouldRenderSiteAdminAffix = session?.isAnonymous === false && isSiteAdmin;
  const projectSearchAction =
    projectSearchScope?.ownerName && projectSearchScope.projectName
      ? prefixBasePath(
          runtimeConfig.basePath,
          `/${projectSearchScope.ownerName}/${projectSearchScope.projectName}/search`,
        )
      : null;
  const groupSearchAction = projectSearchScope?.organizationName
    ? prefixBasePath(
        runtimeConfig.basePath,
        `/organizations/${projectSearchScope.organizationName}/search`,
      )
    : null;
  const allProjectsSearchAction = prefixBasePath(runtimeConfig.basePath, "/search");
  const hasScopedSearch = Boolean(projectSearchAction || groupSearchAction);
  const shouldRenderProjectListingLink = runtimeConfig.hideProjectListing !== true && !isGuest;
  const shouldRenderAllProjectsSearchScope =
    (runtimeConfig.hideProjectListing !== true && !isGuest) || isSiteAdmin;
  const feedbackUrl = runtimeConfig.feedbackUrl?.trim();
  const initialSearchScope = projectSearchAction ? "project" : groupSearchAction ? "group" : "all";
  const [selectedSearchScope, setSelectedSearchScope] = React.useState<"all" | "group" | "project">(
    initialSearchScope,
  );
  const [isSearchScopeMenuOpen, setIsSearchScopeMenuOpen] = React.useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = React.useState(readStoredLeftSidebarOpen);
  const [activeLeftSidebarTab, setActiveLeftSidebarTab] =
    React.useState<SidebarTab>(readStoredLeftSidebarTab);
  React.useEffect(() => {
    setSelectedSearchScope(initialSearchScope);
    setIsSearchScopeMenuOpen(false);
  }, [initialSearchScope]);
  const gnbSearchAction =
    selectedSearchScope === "project" && projectSearchAction
      ? projectSearchAction
      : selectedSearchScope === "group" && groupSearchAction
        ? groupSearchAction
        : allProjectsSearchAction;
  const gnbSearchScopeTitle =
    selectedSearchScope === "project" && projectSearchAction
      ? t("search.scope.project")
      : selectedSearchScope === "group" && groupSearchAction
        ? t("search.scope.group")
        : t("search.scope.all");
  const handleSearchScopeToggleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsSearchScopeMenuOpen((value) => !value);
  };
  const handleSearchScopeBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setIsSearchScopeMenuOpen(false);
  };
  const handleSearchScopeItemClick =
    (scope: "all" | "group" | "project") => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setSelectedSearchScope(scope);
      setIsSearchScopeMenuOpen(false);
    };
  const showLeftSidebar = session?.isAnonymous === false && isLeftSidebarOpen;
  const handleLeftSidebarOpen = () => {
    setIsLeftSidebarOpen(true);
    writeStoredValue(LEGACY_LEFT_SIDEBAR_OPEN_KEY, "true");
  };
  const handleLeftSidebarClose = () => {
    setIsLeftSidebarOpen(false);
    writeStoredValue(LEGACY_LEFT_SIDEBAR_OPEN_KEY, "false");
  };
  const handleLeftSidebarTabChange = (tab: SidebarTab) => {
    setActiveLeftSidebarTab(tab);
    writeStoredValue(LEGACY_LEFT_SIDEBAR_TAB_KEY, storedSidebarTabValue(tab));
  };
  const handleLeftSidebarRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["workspace", "overview", "sidebar"] });
  };

  return (
    <div className={showLeftSidebar ? "legacy-framed-shell is-open" : "legacy-framed-shell"}>
      {showLeftSidebar ? (
        <LegacyFramedSidebar
          activeTab={activeLeftSidebarTab}
          basePath={runtimeConfig.basePath}
          onClose={handleLeftSidebarClose}
          onRefresh={handleLeftSidebarRefresh}
          onTabChange={handleLeftSidebarTabChange}
          runtimeConfig={runtimeConfig}
          session={session ?? {}}
          workspace={navbarWorkspaceQuery.data}
        />
      ) : null}
      <div className="legacy-framed-main">
        <div className="unsupported hidden">
          <div className="unsupported-inner">
            <p id="unsupported-content" />
          </div>
        </div>
        {shouldRenderSiteAdminAffix ? (
          <div className="admin-logged-in-affix">
            {t("user.siteAdminLoggedInAffix")}{" "}
            <span className="small-font">{t("user.siteAdminLoggedInAffix.maxim")}</span>
          </div>
        ) : null}
        <header className={hasScopedSearch ? "gnb-outer project-header" : "gnb-outer"}>
          <div className="gnb-inner">
            {!showLeftSidebar ? (
              <button
                aria-controls="sidebar"
                aria-expanded="false"
                className="pin"
                onClick={handleLeftSidebarOpen}
                title="Sidebar"
                type="button"
              >
                <i className="yobicon-arrow-left" aria-hidden="true" />
                <i className="yobicon-arrow-right" aria-hidden="true" />
              </button>
            ) : null}
            <ul className="gnb-nav">
              <li>
                <Link
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  className="logo logo-letter"
                  to="/"
                >
                  Y
                </Link>
              </li>
              {shouldRenderProjectListingLink ? (
                <>
                  <li className={activeMenu === "projects" ? "active" : undefined}>
                    <Link
                      activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                      activeProps={LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS.activeProps}
                      to="/projects"
                      search={LEGACY_PROJECTS_LINK_SEARCH}
                      className="show-progress-bar"
                    >
                      {t("title.list")}
                    </Link>
                  </li>
                  <li className="divider"></li>
                </>
              ) : null}
              {feedbackUrl ? (
                <li>
                  <Link to={feedbackUrl} target="_blank">
                    {t("title.yobi.feedback")}
                  </Link>
                </li>
              ) : null}
              <li>
                <form
                  action={gnbSearchAction}
                  className="input-prepend gnb-search-form"
                  name="gnb-search-form"
                >
                  <input type="hidden" name="searchType" value="auto" />
                  {hasScopedSearch ? (
                    <div
                      className={isSearchScopeMenuOpen ? "btn-group open" : "btn-group"}
                      onBlur={handleSearchScopeBlur}
                    >
                      <button
                        className="ybtn dropdown-toggle"
                        type="button"
                        id="gnb-search-scope-title"
                        onClick={handleSearchScopeToggleClick}
                      >
                        {gnbSearchScopeTitle}
                      </button>
                      <ul className="dropdown-menu flat right">
                        {projectSearchAction ? (
                          <li>
                            <button type="button" onClick={handleSearchScopeItemClick("project")}>
                              {t("search.scope.project")}
                            </button>
                          </li>
                        ) : null}
                        {projectSearchAction && groupSearchAction ? (
                          <li>
                            <button type="button" onClick={handleSearchScopeItemClick("group")}>
                              {t("search.scope.group")}
                            </button>
                          </li>
                        ) : null}
                        {shouldRenderAllProjectsSearchScope ? (
                          <li>
                            <button type="button" onClick={handleSearchScopeItemClick("all")}>
                              {t("search.scope.all")}
                            </button>
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}
                  <div className={hasScopedSearch ? "search-box select" : "search-box"}>
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
              <AnonymousSiteUserMenu />
            ) : (
              <AuthenticatedSiteUserMenu
                basePath={runtimeConfig.basePath}
                runtimeConfig={runtimeConfig}
                session={session ?? {}}
                workspace={navbarWorkspaceQuery.data}
              />
            )}
          </div>
        </header>
        {children}
        <footer className="page-footer-outer">
          <div className="page-footer">
            <span className="provider">Yoram authors</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function LegacyFramedSidebar({
  activeTab,
  basePath,
  onClose,
  onRefresh,
  onTabChange,
  runtimeConfig,
  session,
  workspace,
}: {
  activeTab: SidebarTab;
  basePath: string;
  onClose: () => void;
  onRefresh: () => void;
  onTabChange: (tab: SidebarTab) => void;
  runtimeConfig: RuntimeConfig;
  session: YoramRecord;
  workspace: YoramRecord | undefined;
}) {
  const { t } = useLegacyMessages();
  const [showBottom, setShowBottom] = React.useState(true);
  const loginId = stringField(session, "loginId", "anonymous");
  const workspaceProfile = recordValue(workspace?.profile);
  const avatarUrl = prefixBasePath(
    basePath,
    stringField(
      workspaceProfile,
      "avatarUrl",
      stringField(session, "avatarUrl", "/legacy-assets/images/default-avatar-34.png"),
    ),
  );
  const userLabel = stringField(session, "userLabel", loginId);
  const selectTab = (tab: SidebarTab) => {
    onTabChange(tab);
    setShowBottom(tab === "recent");
  };

  return (
    <aside aria-label="Sidebar" className="sidebar hide-in-mobile" id="sidebar">
      <div className="row-fluid user-menu-wrap">
        <span className="user-menu">
          <Link
            activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
            activeProps={{
              "aria-current": undefined,
              className: undefined,
              "data-status": undefined,
            }}
            params={{ user: loginId }}
            search={LEGACY_USER_LINK_SEARCH}
            to="/$user"
          >
            <span className="avatar-wrap smaller">
              <img alt="" src={avatarUrl} />
            </span>
            <span className="caret-text hide-in-mobile">{userLabel}</span>
          </Link>
        </span>
        <span className="user-menu">
          <Link to="/user/editform">{t("userinfo.accountSetting")}</Link>
        </span>
        <Link reloadDocument to={LEGACY_AUTHENTICATED_LOGOUT_PATH}>
          <span className="user-menu logout label">{t("title.logout")}</span>
        </Link>
        <button
          aria-controls="sidebar"
          aria-expanded="true"
          className="pin-in-sidebar"
          onClick={onClose}
          title="Sidebar"
          type="button"
        >
          <i aria-hidden="true" className="yobicon-arrow-left" />
        </button>
      </div>
      <ul className="nav nav-tabs nm">
        <li className={`myOrganizationList${activeTab === "favorite" ? " active" : ""}`}>
          <button type="button" onClick={() => selectTab("favorite")}>
            {t("title.favorite")}
          </button>
        </li>
        <li className={`myProjectList${activeTab === "project" ? " active" : ""}`}>
          <button type="button" onClick={() => selectTab("project")}>
            {t("title.project")}
          </button>
        </li>
        <li className={`myRecentIssueList${activeTab === "recent" ? " active" : ""}`}>
          <button type="button" onClick={() => selectTab("recent")}>
            {t("title.recently.visited.issue")}
          </button>
        </li>
        <li>
          <button
            aria-label="Refresh"
            className="btn-transparent refresh-button"
            onClick={onRefresh}
            type="button"
          >
            <i aria-hidden="true" className="yobicon-refresh" />
          </button>
        </li>
      </ul>
      <div className="tab-content tab-box">
        <div className="tab-content" id="left-sidebar-tab-content-list">
          {workspace ? (
            <SidebarTabContent
              activeTab={activeTab}
              idPrefix="left-sidebar"
              runtimeConfig={runtimeConfig}
              sessionLoginId={loginId}
              workspace={workspace}
            />
          ) : (
            "Loading..."
          )}
        </div>
      </div>
      {showBottom ? (
        <div className="sidebar-bottom" id="sidebar-bottom">
          Yoram, made by <i aria-hidden="true" className="yobicon-hearts" />
        </div>
      ) : null}
    </aside>
  );
}

const authenticatedSidenavTabStyles = stylex.create({
  tabs: {
    borderBottomColor: globalColors.sidenavTabBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    listStyle: "none",
    paddingLeft: 0,
    "::before": {
      content: "",
      display: "table",
      lineHeight: 0,
    },
    "::after": {
      clear: "both",
      content: "",
      display: "table",
      lineHeight: 0,
    },
  },
  item: {
    float: "left",
    marginBottom: "-1px",
  },
  button: {
    appearance: "none",
    backgroundColor: {
      default: globalColors.transparent,
      ":hover": globalColors.sidenavTabHoverSurface,
      ":focus": globalColors.sidenavTabHoverSurface,
    },
    borderBottomColor: {
      default: globalColors.transparent,
      ":hover": globalColors.sidenavTabBorder,
      ":focus": globalColors.sidenavTabBorder,
    },
    borderLeftColor: {
      default: globalColors.transparent,
      ":hover": globalColors.sidenavTabHoverBorder,
      ":focus": globalColors.sidenavTabHoverBorder,
    },
    borderRadius: "4px 4px 0 0",
    borderRightColor: {
      default: globalColors.transparent,
      ":hover": globalColors.sidenavTabHoverBorder,
      ":focus": globalColors.sidenavTabHoverBorder,
    },
    borderStyle: "solid",
    borderTopColor: {
      default: globalColors.transparent,
      ":hover": globalColors.sidenavTabHoverBorder,
      ":focus": globalColors.sidenavTabHoverBorder,
    },
    borderWidth: "1px",
    color: globalColors.sidenavTabAccent,
    cursor: "pointer",
    display: "block",
    font: "inherit",
    lineHeight: "20px",
    marginRight: "2px",
    padding: "8px 30px",
    textDecoration: {
      default: null,
      ":hover": "none",
      ":focus": "none",
    },
  },
  activeButton: {
    backgroundColor: {
      default: globalColors.sidenavSurface,
      ":hover": globalColors.sidenavSurface,
      ":focus": globalColors.sidenavSurface,
    },
    borderBottomColor: {
      default: globalColors.transparent,
      ":hover": globalColors.transparent,
      ":focus": globalColors.transparent,
    },
    borderLeftColor: {
      default: globalColors.sidenavTabBorder,
      ":hover": globalColors.sidenavTabBorder,
      ":focus": globalColors.sidenavTabBorder,
    },
    borderRightColor: {
      default: globalColors.sidenavTabBorder,
      ":hover": globalColors.sidenavTabBorder,
      ":focus": globalColors.sidenavTabBorder,
    },
    borderTopColor: {
      default: globalColors.sidenavTabBorder,
      ":hover": globalColors.sidenavTabBorder,
      ":focus": globalColors.sidenavTabBorder,
    },
    color: globalColors.sidenavTabActiveText,
    cursor: "default",
  },
});

const authenticatedSidenavFavoriteShellStyles = stylex.create({
  group: {
    position: "relative",
  },
  input: {
    borderRadius: "unset",
    borderStyle: {
      default: "none",
      ":focus": "none",
    },
    boxSizing: "content-box",
    display: "block",
    fontSize: "14px",
    height: "34px",
    marginBottom: 0,
    outlineStyle: {
      default: null,
      ":focus": "none",
    },
    width: "99%",
  },
  bar: {
    display: "block",
    position: "relative",
  },
  result: {
    listStyle: "none",
    margin: "0 0 10px",
    maxHeight: "80vh",
    overflowX: "visible",
    overflowY: "auto",
    padding: 0,
  },
  noResult: {
    color: globalColors.sidenavNoResultText,
    fontSize: "16px",
    marginBottom: "25px",
    marginTop: "10px",
    textAlign: "center",
  },
});

const authenticatedSidenavFavoriteOrganizationRowStyles = stylex.create({
  row: {
    marginBottom: "8px",
    marginLeft: 0,
    marginTop: "3px",
  },
  header: {
    alignItems: "center",
    backgroundColor: {
      default: null,
      ":hover": globalColors.sidenavOrganizationHoverSurface,
    },
    cursor: {
      default: null,
      ":hover": "pointer",
    },
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-between",
    padding: "1px 0",
    position: "relative",
  },
  projectItem: {
    fontSize: "14px",
    fontWeight: 400,
    overflow: "hidden",
  },
  itemContainer: {
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
    flexGrow: 1,
    flexWrap: "nowrap",
    justifyContent: "space-between",
  },
  toggle: {
    appearance: "none",
    backgroundColor: globalColors.transparent,
    backgroundImage: "none",
    borderStyle: "none",
    boxShadow: "none",
    color: "inherit",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "inherit",
    fontStretch: "inherit",
    fontStyle: "inherit",
    fontVariant: "inherit",
    fontWeight: "inherit",
    lineHeight: "inherit",
    margin: 0,
    minHeight: 0,
    padding: 0,
    textAlign: "left",
    width: "auto",
  },
  realOrganizationToggle: {
    marginRight: 0,
  },
  logo: {
    flexShrink: 0,
    marginLeft: "2px",
    overflow: "hidden",
    paddingTop: "3px",
    textAlign: "center",
    width: "26px",
  },
  nameOwner: {
    alignItems: "center",
    color: globalColors.textOnAccent,
    display: "flex",
    flexDirection: "row",
    flexGrow: 1,
    flexWrap: "nowrap",
    fontFamily: "Roboto, sans-serif",
    fontWeight: 700,
    justifyContent: "space-between",
    overflow: "hidden",
    padding: "1px 0",
    WebkitFontSmoothing: "antialiased",
  },
  name: {
    color: globalColors.sidenavOrganizationName,
    fontFamily: "roboto, sans-serif",
    fontSize: "14px",
    maxWidth: "140px",
    minWidth: "50px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    WebkitFontSmoothing: "antialiased",
    whiteSpace: "nowrap",
  },
  owner: {
    color: globalColors.sidenavAccountText,
    flexShrink: 3,
    fontSize: "12px",
    maxWidth: "50px",
    minWidth: "40px",
    overflow: "hidden",
    paddingRight: "10px",
    textAlign: "right",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

const authenticatedSidenavFavoriteStarStyles = stylex.create({
  placeholder: {
    color: globalColors.sidenavFavoriteStarIdle,
    flexShrink: 0,
    width: "29px",
  },
  button: {
    appearance: "none",
    backgroundColor: globalColors.transparent,
    borderStyle: "none",
    boxShadow: "none",
    boxSizing: "border-box",
    color: {
      default: globalColors.sidenavFavoriteStarIdle,
      ":disabled": globalColors.sidenavFavoriteStarIdle,
      ":focus": globalColors.sidenavFavoriteStarActive,
      ":hover": globalColors.sidenavFavoriteStarActive,
    },
    cursor: "pointer",
    flexShrink: 0,
    height: "16px",
    lineHeight: "normal",
    margin: 0,
    minHeight: 0,
    padding: 0,
    position: "static",
    right: "auto",
    textAlign: "start",
    top: "auto",
    transform: "none",
    width: "29px",
  },
  icon: {
    color: "inherit",
    direction: "ltr",
    display: "inline-block",
    fontFamily: "Material Icons",
    fontFeatureSettings: "liga",
    fontSize: "16px",
    fontStyle: "normal",
    fontWeight: 400,
    height: "15px",
    letterSpacing: "normal",
    lineHeight: "16px",
    textTransform: "none",
    verticalAlign: "bottom",
    whiteSpace: "nowrap",
    wordWrap: "normal",
    WebkitFontSmoothing: "antialiased",
  },
  starredIcon: {
    color: {
      default: globalColors.sidenavFavoriteStarActive,
      ":hover": globalColors.sidenavFavoriteStarActiveHover,
    },
  },
});

const authenticatedSidenavDirectProjectRowStyles = stylex.create({
  row: {
    color: globalColors.sidenavText,
    cursor: "pointer",
    lineHeight: "normal",
  },
  list: {
    alignItems: "center",
    backgroundColor: {
      default: globalColors.transparent,
      ":hover": globalColors.sidenavOrganizationHoverSurface,
    },
    cursor: "pointer",
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-between",
    padding: "4px 0",
    position: "static",
  },
  item: {
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
    flexGrow: 1,
    flexWrap: "nowrap",
    fontSize: "14px",
    fontWeight: 400,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  logo: {
    flexShrink: 0,
    marginLeft: "2px",
    overflow: "hidden",
    paddingTop: "3px",
    textAlign: "center",
    width: "26px",
  },
  avatar: {
    color: globalColors.sidenavText,
  },
  image: {
    borderRadius: "3px",
    height: "auto",
    marginRight: 0,
    verticalAlign: "text-top",
    width: "16px",
  },
  nameOwner: {
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
    flexGrow: 1,
    flexWrap: "nowrap",
    justifyContent: "space-between",
    overflow: "hidden",
    padding: "1px 0",
  },
  name: {
    fontFamily: "roboto, sans-serif",
    maxWidth: "150px",
    minWidth: "50px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    WebkitFontSmoothing: "antialiased",
    whiteSpace: "nowrap",
  },
  projectLink: {
    color: {
      default: globalColors.sidenavText,
      ":focus": globalColors.sidenavText,
      ":hover": globalColors.sidenavText,
    },
    display: "contents",
    textDecoration: {
      default: "none",
      ":focus": "none",
      ":hover": "none",
    },
  },
  owner: {
    color: globalColors.sidenavAccountText,
    flexShrink: 3,
    fontSize: "12px",
    maxWidth: "50px",
    minWidth: "40px",
    overflow: "hidden",
    paddingRight: "10px",
    textAlign: "right",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  ownerLink: {
    color: globalColors.sidenavAccountText,
    textDecoration: {
      default: "none",
      ":focus": "underline",
      ":hover": "underline",
    },
  },
});

const authenticatedSidenavFavoriteProjectRowStyles = stylex.create({
  row: {
    cursor: "pointer",
    lineHeight: "normal",
  },
  list: {
    alignItems: "center",
    backgroundColor: {
      default: null,
      ":hover": globalColors.sidenavOrganizationHoverSurface,
    },
    cursor: {
      default: null,
      ":hover": "pointer",
    },
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-between",
    padding: "4px 0",
    position: "relative",
  },
  link: {
    alignItems: "center",
    backgroundColor: globalColors.transparent,
    color: globalColors.sidenavText,
    display: "flex",
    flexDirection: "row",
    flexGrow: 1,
    flexWrap: "nowrap",
    fontSize: "14px",
    fontWeight: 400,
    height: "18px",
    justifyContent: "space-between",
    lineHeight: "16px",
    marginRight: 0,
    overflow: "hidden",
    textDecoration: {
      default: "none",
      ":focus": "none",
      ":hover": "none",
    },
  },
  logo: {
    flexShrink: 0,
    marginLeft: "2px",
    overflow: "hidden",
    paddingLeft: "22px",
    paddingTop: "3px",
    textAlign: "center",
    width: "26px",
  },
  avatar: {
    color: globalColors.sidenavText,
  },
  image: {
    borderRadius: "3px",
    height: "auto",
    marginRight: 0,
    verticalAlign: "text-top",
    width: "16px",
  },
  nameOwner: {
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
    flexGrow: 1,
    flexWrap: "nowrap",
    justifyContent: "space-between",
    overflow: "hidden",
    padding: "1px 0",
  },
  name: {
    fontFamily: "roboto, sans-serif",
    maxWidth: "150px",
    minWidth: "50px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    WebkitFontSmoothing: "antialiased",
    whiteSpace: "nowrap",
  },
  popover: {
    backgroundClip: "padding-box",
    backgroundColor: globalColors.sidenavPopoverSurface,
    borderColor: globalColors.sidenavPopoverBorder,
    borderRadius: "2px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: globalColors.sidenavPopoverShadow,
    color: globalColors.textOnAccent,
    display: "block",
    fontSize: "13px",
    left: "100%",
    lineHeight: 1,
    marginLeft: "10px",
    maxWidth: "276px",
    minWidth: "200px",
    overflowWrap: "break-word",
    padding: "1px",
    position: "absolute",
    textAlign: "left",
    top: "50%",
    transform: "translateY(-50%)",
    whiteSpace: "normal",
    zIndex: 1010,
  },
  popoverArrow: {
    borderColor: globalColors.transparent,
    borderLeftWidth: 0,
    borderRightColor: globalColors.sidenavPopoverArrowBorder,
    borderStyle: "solid",
    borderWidth: "11px",
    display: "block",
    height: 0,
    left: "-11px",
    marginTop: "-11px",
    position: "absolute",
    top: "50%",
    width: 0,
    "::after": {
      borderColor: globalColors.transparent,
      borderLeftWidth: 0,
      borderRightColor: globalColors.sidenavPopoverSurface,
      borderStyle: "solid",
      borderWidth: "10px",
      bottom: "-10px",
      content: '""',
      display: "block",
      height: 0,
      left: "1px",
      position: "absolute",
      width: 0,
    },
  },
  popoverContent: {
    lineHeight: "120%",
    padding: "9px 10px",
  },
});

const authenticatedSidenavTabPanelStyles = stylex.create({
  panel: {
    borderRadius: "0 0 4px 4px",
    borderTopStyle: "none",
    overflow: "hidden",
  },
  content: {
    overflow: "hidden",
  },
  pane: {
    display: "none",
  },
  activePane: {
    display: "block",
  },
});

const authenticatedSidenavContentFrameStyles = stylex.create({
  frame: {
    marginLeft: "10px",
    marginTop: "10px",
    minWidth: {
      default: null,
      "@media (max-width: 720px)": 0,
    },
    width: {
      default: "350px",
      "@media (max-width: 720px)": "100%",
    },
  },
});

const authenticatedSidenavAccountActionStyles = stylex.create({
  row: {
    boxSizing: "border-box",
    color: globalColors.sidenavAccountText,
    padding: "10px",
    textAlign: "right",
  },
  menu: {
    color: globalColors.sidenavText,
    fontSize: "12px",
    marginLeft: "5px",
    marginRight: "5px",
    padding: "3px",
  },
  logout: {
    ":hover": {
      backgroundColor: globalColors.sidenavLogoutHover,
    },
  },
});

const authenticatedSidenavShellStyles = stylex.create({
  shell: {
    backgroundColor: globalColors.sidenavSurface,
    borderStyle: "none",
    borderWidth: 0,
    boxShadow: globalColors.sidenavShadow,
    color: globalColors.sidenavText,
    overflowX: "hidden",
    overflowY: "auto",
    position: "absolute",
    right: 0,
    top: "40px",
    width: 0,
    zIndex: 999,
  },
  open: {
    borderColor: globalColors.sidenavBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    width: {
      default: "360px",
      "@media (max-width: 720px)": "100vw",
    },
  },
});

const authenticatedSiteUserMenuStyles = stylex.create({
  menu: {
    float: "right",
    listStyle: "none",
    padding: 0,
  },
  item: {
    float: "left",
    margin: "5px 0",
    position: "relative",
  },
  itemText: {
    color: {
      default: globalColors.textMuted,
      "@media (max-width: 720px)": globalColors.navigationAccent,
    },
    fontSize: "14px",
  },
  itemLink: {
    color: globalColors.textMuted,
    lineHeight: "30px",
    padding: "5px 10px",
    textDecoration: "none",
    ":hover": {
      color: globalColors.textOnDarkHover,
    },
  },
  adminLink: {
    fontSize: "16px",
  },
  divider: {
    lineHeight: "30px",
    "::after": {
      color: globalColors.navigationDivider,
      content: '"|"',
      opacity: 0.35,
    },
  },
  dropdownItem: {
    color: {
      default: globalColors.navigationDropdownText,
      "@media (max-width: 720px)": globalColors.navigationAccent,
    },
    fontSize: "14px",
  },
  dropdownButton: {
    padding: "0 10px",
  },
  dropdownToggle: {
    display: "inline-block",
    lineHeight: "30px",
    textDecoration: "none",
    transition: "all 0.15s ease",
    ":hover": {
      color: globalColors.navigationAccent,
      textDecoration: "none",
    },
    ":focus": {
      color: globalColors.navigationAccent,
      textDecoration: "none",
    },
  },
  caret: {
    borderLeft: "4px solid transparent",
    borderRight: "4px solid transparent",
    borderTop: "4px solid currentColor",
    content: '""',
    display: "inline-block",
    height: 0,
    marginLeft: "5px",
    transition: "all 0.15s ease",
    verticalAlign: "middle",
    width: 0,
  },
  createButton: {
    backgroundColor: globalColors.navigationCreateAction,
    borderRadius: "3px",
    color: globalColors.textOnAccent,
    padding: "0 10px",
    ":hover": {
      color: globalColors.textOnAccent,
    },
    ":focus": {
      color: globalColors.textOnAccent,
    },
  },
  lastItem: {
    marginLeft: "10px",
  },
});

function AuthenticatedSiteUserMenu({
  basePath,
  runtimeConfig,
  session,
  workspace,
}: {
  basePath: string;
  runtimeConfig: RuntimeConfig;
  session: YoramRecord;
  workspace: YoramRecord | undefined;
}) {
  const { t } = useLegacyMessages();
  const [activeSidebarTab, setActiveSidebarTab] = React.useState<"favorite" | "project" | "recent">(
    "favorite",
  );
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = React.useState(false);
  const loginId = stringField(session, "loginId", "anonymous");
  const workspaceProfile = recordValue(workspace?.profile);
  const avatarUrl = prefixBasePath(
    basePath,
    stringField(
      workspaceProfile,
      "avatarUrl",
      stringField(session, "avatarUrl", "/legacy-assets/images/default-avatar-34.png"),
    ),
  );
  const isSiteAdmin = booleanField(session, "isSiteAdmin", false);
  const isGuest = booleanField(session, "isGuest", false);
  const navbarCustomLinkName = runtimeConfig.navbarCustomLinkName?.trim() ?? "";
  const navbarCustomLinkUrl = runtimeConfig.navbarCustomLinkUrl?.trim() ?? "";
  const handleSidebarToggleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsSidebarOpen((value) => !value);
  };
  const handleCreateMenuToggleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsCreateMenuOpen((value) => !value);
  };
  const handleCreateMenuBlur = (event: React.FocusEvent<HTMLLIElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setIsCreateMenuOpen(false);
  };

  return (
    <>
      <div
        id="mySidenav"
        className={`${isSidebarOpen ? "sidenav sidenav-open" : "sidenav"} ${stylex.props(authenticatedSidenavShellStyles.shell, isSidebarOpen && authenticatedSidenavShellStyles.open).className}`}
        data-stylex-owner="authenticated-site-sidenav-shell"
      >
        <div
          className={`span5 right-menu span-hard-wrap ${stylex.props(authenticatedSidenavContentFrameStyles.frame).className}`}
          data-stylex-owner="authenticated-sidenav-content-frame"
        >
          <div
            className={`row-fluid user-menu-wrap ${stylex.props(authenticatedSidenavAccountActionStyles.row).className}`}
            data-stylex-owner="authenticated-sidenav-account-actions"
          >
            <span
              className={`user-menu ${stylex.props(authenticatedSidenavAccountActionStyles.menu).className}`}
            >
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
            <span
              className={`user-menu ${stylex.props(authenticatedSidenavAccountActionStyles.menu).className}`}
            >
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
            <Link to={LEGACY_AUTHENTICATED_LOGOUT_PATH} reloadDocument>
              <span
                className={`user-menu logout label ${stylex.props(authenticatedSidenavAccountActionStyles.menu, authenticatedSidenavAccountActionStyles.logout).className}`}
              >
                {t("title.logout")}
              </span>
            </Link>
          </div>
          <ul
            className={`nav nav-tabs nm ${stylex.props(authenticatedSidenavTabStyles.tabs).className}`}
            data-stylex-owner="authenticated-sidenav-tabs"
          >
            <li
              className={`myOrganizationList${activeSidebarTab === "favorite" ? " active" : ""} ${stylex.props(authenticatedSidenavTabStyles.item).className}`}
            >
              <button
                className={
                  stylex.props(
                    authenticatedSidenavTabStyles.button,
                    activeSidebarTab === "favorite" && authenticatedSidenavTabStyles.activeButton,
                  ).className
                }
                type="button"
                onClick={() => setActiveSidebarTab("favorite")}
              >
                {t("title.favorite")}
              </button>
            </li>
            <li
              className={`myProjectList${activeSidebarTab === "project" ? " active" : ""} ${stylex.props(authenticatedSidenavTabStyles.item).className}`}
            >
              <button
                className={
                  stylex.props(
                    authenticatedSidenavTabStyles.button,
                    activeSidebarTab === "project" && authenticatedSidenavTabStyles.activeButton,
                  ).className
                }
                type="button"
                onClick={() => setActiveSidebarTab("project")}
              >
                {t("title.project")}
              </button>
            </li>
            <li
              className={`myRecentIssueList${activeSidebarTab === "recent" ? " active" : ""} ${stylex.props(authenticatedSidenavTabStyles.item).className}`}
            >
              <button
                className={
                  stylex.props(
                    authenticatedSidenavTabStyles.button,
                    activeSidebarTab === "recent" && authenticatedSidenavTabStyles.activeButton,
                  ).className
                }
                type="button"
                onClick={() => setActiveSidebarTab("recent")}
              >
                {t("title.recently.visited.issue")}
              </button>
            </li>
          </ul>
          <div
            className={`tab-content tab-box ${stylex.props(authenticatedSidenavTabPanelStyles.panel).className}`}
            data-stylex-owner="authenticated-sidenav-tab-panel"
          >
            <div
              id="usermenu-tab-content-list"
              className={`tab-content ${stylex.props(authenticatedSidenavTabPanelStyles.content).className}`}
            >
              {workspace ? (
                <SidebarTabContent
                  activeTab={activeSidebarTab}
                  isAuthenticatedSidenav
                  runtimeConfig={runtimeConfig}
                  sessionLoginId={loginId}
                  workspace={workspace}
                />
              ) : (
                "Loading..."
              )}
            </div>
          </div>
        </div>
      </div>
      <ul
        className={`gnb-usermenu ${stylex.props(authenticatedSiteUserMenuStyles.menu).className}`}
        data-stylex-owner="authenticated-site-user-menu"
      >
        {navbarCustomLinkName ? (
          <li
            className={`gnb-usermenu-item ${stylex.props(authenticatedSiteUserMenuStyles.item, authenticatedSiteUserMenuStyles.itemText).className}`}
          >
            <Link
              to={navbarCustomLinkUrl}
              reloadDocument
              className={`user-item-btn loggged-in ${stylex.props(authenticatedSiteUserMenuStyles.itemLink).className}`}
            >
              {navbarCustomLinkName}
            </Link>
          </li>
        ) : null}
        <li
          className={`gnb-usermenu-item ${stylex.props(authenticatedSiteUserMenuStyles.item, authenticatedSiteUserMenuStyles.itemText).className}`}
          title={`${t("title.shortcut")} (A)`}
        >
          <Link
            to="/user/issues"
            search={LEGACY_USER_ISSUES_LINK_SEARCH}
            className={`user-item-btn loggged-in ${stylex.props(authenticatedSiteUserMenuStyles.itemLink).className}`}
          >
            {t("issue.myIssue")}
          </Link>
        </li>
        <li
          className={`divider ${stylex.props(authenticatedSiteUserMenuStyles.item, authenticatedSiteUserMenuStyles.divider).className}`}
        ></li>
        {isSiteAdmin ? (
          <>
            <li
              className={`gnb-usermenu-item ${stylex.props(authenticatedSiteUserMenuStyles.item, authenticatedSiteUserMenuStyles.itemText).className}`}
            >
              <Link
                to="/sites/userList"
                search={LEGACY_SITE_USER_LIST_LINK_SEARCH}
                title={t("menu.siteAdmin")}
                className={`usermenu-icon-button show-progress-bar ${stylex.props(authenticatedSiteUserMenuStyles.itemLink, authenticatedSiteUserMenuStyles.adminLink).className}`}
              >
                <i className="yobicon-wrench" />
              </Link>
            </li>
            <li
              className={`divider ${stylex.props(authenticatedSiteUserMenuStyles.item, authenticatedSiteUserMenuStyles.divider).className}`}
            ></li>
          </>
        ) : null}
        <li
          className={`gnb-usermenu-dropdown sidebar-open-btn ${stylex.props(authenticatedSiteUserMenuStyles.item, authenticatedSiteUserMenuStyles.dropdownItem).className}`}
          id="sidebar-open-btn"
        >
          <button
            type="button"
            className={`gnb-dropdown-toggle ${stylex.props(authenticatedSiteUserMenuStyles.dropdownButton, authenticatedSiteUserMenuStyles.dropdownToggle).className}`}
            title={`${t("user.menu")}, ${t("title.shortcut")} (F)`}
            aria-controls="mySidenav"
            aria-expanded={isSidebarOpen}
            onClick={handleSidebarToggleClick}
          >
            <span className="avatar-wrap smaller">
              <img src={avatarUrl} alt="" />
            </span>
            <span
              className={`caret ${stylex.props(authenticatedSiteUserMenuStyles.caret).className}`}
            ></span>
          </button>
        </li>
        <li
          className={`${isCreateMenuOpen ? "gnb-usermenu-dropdown open" : "gnb-usermenu-dropdown"} ${stylex.props(authenticatedSiteUserMenuStyles.item, authenticatedSiteUserMenuStyles.dropdownItem, authenticatedSiteUserMenuStyles.lastItem).className}`}
          onBlur={handleCreateMenuBlur}
        >
          <button
            type="button"
            className={`gnb-dropdown-toggle dropdwon-box-btn ${stylex.props(authenticatedSiteUserMenuStyles.dropdownButton, authenticatedSiteUserMenuStyles.dropdownToggle, authenticatedSiteUserMenuStyles.createButton).className}`}
            onClick={handleCreateMenuToggleClick}
          >
            <i className="yobicon-plus"></i>
            <span
              className={`caret ${stylex.props(authenticatedSiteUserMenuStyles.caret).className}`}
            ></span>
          </button>
          <ul className="dropdown-menu flat right">
            <li>
              <Link to={LEGACY_NOTIFICATION_NEW_ISSUE_PATH}>{t("issue.menu.new")}</Link>
            </li>
            <li>
              <Link to={LEGACY_NOTIFICATION_NEW_MY_ISSUE_PATH}>{t("issue.menu.new.mine")}</Link>
            </li>
            <li>
              <hr className="no-margin" />
            </li>
            <li>
              <Link to="/projectform" search={LEGACY_PROJECT_FORM_LINK_SEARCH}>
                {t("button.newProject")}
              </Link>
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

const anonymousSiteUserMenuStyles = stylex.create({
  menu: {
    float: "right",
    listStyle: "none",
    padding: 0,
  },
  item: {
    float: "left",
    margin: "5px 0",
    position: "relative",
  },
  loginItem: {
    color: {
      default: globalColors.textMuted,
      "@media (max-width: 720px)": globalColors.navigationAccent,
    },
    fontSize: "14px",
  },
  loginLink: {
    color: {
      default: globalColors.textMuted,
      "@media (max-width: 720px)": globalColors.navigationAccent,
    },
    lineHeight: "30px",
    padding: "5px 10px",
    textDecoration: "none",
    ":hover": {
      color: globalColors.textOnDarkHover,
    },
  },
  divider: {
    lineHeight: "30px",
    "::after": {
      color: globalColors.navigationDivider,
      content: '"|"',
      opacity: 0.35,
    },
  },
  signupItem: {
    marginLeft: "10px",
  },
});

function AnonymousSiteUserMenu() {
  const { t } = useLegacyMessages();
  const openRootLoginDialog = useRootLoginDialog();
  const [activeSidebarTab, setActiveSidebarTab] = React.useState<"favorite" | "project" | "recent">(
    "favorite",
  );

  return (
    <>
      <div id="mySidenav" className="sidenav">
        <div className="span5 right-menu span-hard-wrap">
          <div className="row-fluid user-menu-wrap">
            <span className="user-menu">
              <Link
                activeProps={{
                  "aria-current": undefined,
                  className: undefined,
                  "data-status": undefined,
                }}
                activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                params={{ user: "anonymous" }}
                search={LEGACY_USER_LINK_SEARCH}
                to="/$user"
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
            <Link to={LEGACY_ANONYMOUS_LOGOUT_PATH} reloadDocument>
              <span className="user-menu logout label">{t("title.logout")}</span>
            </Link>
          </div>
          <ul className="nav nav-tabs nm">
            <li className={`myOrganizationList${activeSidebarTab === "favorite" ? " active" : ""}`}>
              <button type="button" onClick={() => setActiveSidebarTab("favorite")}>
                {t("title.favorite")}
              </button>
            </li>
            <li className={`myProjectList${activeSidebarTab === "project" ? " active" : ""}`}>
              <button type="button" onClick={() => setActiveSidebarTab("project")}>
                {t("title.project")}
              </button>
            </li>
            <li className={`myRecentIssueList${activeSidebarTab === "recent" ? " active" : ""}`}>
              <button type="button" onClick={() => setActiveSidebarTab("recent")}>
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
      <ul
        className={`gnb-usermenu ${stylex.props(anonymousSiteUserMenuStyles.menu).className}`}
        data-stylex-owner="anonymous-site-user-menu"
      >
        <li
          className={`gnb-usermenu-item ${stylex.props(anonymousSiteUserMenuStyles.item, anonymousSiteUserMenuStyles.loginItem).className}`}
          id="required-logged-in"
        >
          <Link
            to="/users/loginform"
            search={LEGACY_LOGIN_FORM_LINK_SEARCH}
            className={`user-item-btn ${stylex.props(anonymousSiteUserMenuStyles.loginLink).className}`}
            aria-controls="loginDialog"
            aria-haspopup="dialog"
            onClick={(event) => {
              if (openRootLoginDialog()) {
                event.preventDefault();
              }
            }}
          >
            {t("title.login")}
          </Link>
        </li>
        <li
          className={`divider ${stylex.props(anonymousSiteUserMenuStyles.item, anonymousSiteUserMenuStyles.divider).className}`}
        ></li>
        <li
          className={
            stylex.props(anonymousSiteUserMenuStyles.item, anonymousSiteUserMenuStyles.signupItem)
              .className
          }
        >
          <Link to="/users/signupform" className="ybtn ybtn-success">
            {t("title.signup")}
          </Link>
        </li>
      </ul>
    </>
  );
}

function SidebarTabContent({
  activeTab,
  idPrefix,
  isAuthenticatedSidenav = false,
  runtimeConfig,
  sessionLoginId,
  workspace,
}: {
  activeTab: SidebarTab;
  idPrefix?: string;
  isAuthenticatedSidenav?: boolean;
  runtimeConfig: RuntimeConfig;
  sessionLoginId: string;
  workspace: YoramRecord;
}) {
  const [searchQuery, setSearchQuery] = React.useState("");
  return (
    <>
      <div
        className={`tab-pane user-project-list${activeTab === "favorite" ? " active" : ""}${
          isAuthenticatedSidenav
            ? ` ${
                stylex.props(
                  authenticatedSidenavTabPanelStyles.pane,
                  activeTab === "favorite" && authenticatedSidenavTabPanelStyles.activePane,
                ).className
              }`
            : ""
        }`}
        id={sidebarDomId(idPrefix, "myOrganizationList")}
      >
        {hasSidebarFavoriteData(workspace) ? (
          <SidebarOrganizationList
            idPrefix={idPrefix}
            isAuthenticatedSidenav={isAuthenticatedSidenav}
            onSearchQueryChange={setSearchQuery}
            runtimeConfig={runtimeConfig}
            searchQuery={searchQuery}
            sessionLoginId={sessionLoginId}
            workspace={workspace}
          />
        ) : (
          "Loading..."
        )}
      </div>
      <div
        className={`tab-pane user-project-list${activeTab === "project" ? " active" : ""}${
          isAuthenticatedSidenav
            ? ` ${
                stylex.props(
                  authenticatedSidenavTabPanelStyles.pane,
                  activeTab === "project" && authenticatedSidenavTabPanelStyles.activePane,
                ).className
              }`
            : ""
        }`}
        id={sidebarDomId(idPrefix, "myProjectList")}
      >
        <SidebarProjectList
          idPrefix={idPrefix}
          onSearchQueryChange={setSearchQuery}
          runtimeConfig={runtimeConfig}
          searchQuery={searchQuery}
          workspace={workspace}
        />
      </div>
      <div
        className={`tab-pane user-project-list${activeTab === "recent" ? " active" : ""}${
          isAuthenticatedSidenav
            ? ` ${
                stylex.props(
                  authenticatedSidenavTabPanelStyles.pane,
                  activeTab === "recent" && authenticatedSidenavTabPanelStyles.activePane,
                ).className
              }`
            : ""
        }`}
        id={sidebarDomId(idPrefix, "myRecentIssueList")}
      >
        <SidebarRecentIssueList
          idPrefix={idPrefix}
          onSearchQueryChange={setSearchQuery}
          searchQuery={searchQuery}
          workspace={workspace}
        />
      </div>
    </>
  );
}

type SidebarFavoriteTarget =
  | { organizationName: string; type: "organization" }
  | { ownerName: string; projectName: string; type: "project" };

function SidebarFavoriteButton({
  initialFavorited,
  isAuthenticatedDirectProjectStar = false,
  isAuthenticatedFavoriteStar = false,
  label,
  runtimeConfig,
  target,
}: {
  initialFavorited: boolean;
  isAuthenticatedDirectProjectStar?: boolean;
  isAuthenticatedFavoriteStar?: boolean;
  label: string;
  runtimeConfig: RuntimeConfig;
  target: SidebarFavoriteTarget;
}) {
  const queryClient = useQueryClient();
  const [isFavorited, setIsFavorited] = React.useState(initialFavorited);
  const requestPending = React.useRef(false);
  const favoriteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return target.type === "project"
        ? toggleFavoriteProjectRest(runtimeConfig, csrfToken, target.ownerName, target.projectName)
        : toggleFavoriteOrganizationRest(runtimeConfig, csrfToken, target.organizationName);
    },
    onError(error) {
      window.alert(`Update failed: ${error instanceof Error ? error.message : String(error)}`);
    },
    onSettled() {
      requestPending.current = false;
    },
    onSuccess(response) {
      setIsFavorited((current) => {
        if (typeof response.favorited === "boolean") {
          return response.favorited;
        }
        return typeof response.favored === "boolean" ? response.favored : !current;
      });
      void queryClient.invalidateQueries({
        queryKey: ["workspace", "overview", "sidebar"],
        refetchType: "none",
      });
    },
  });
  const toggleFavorite = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (requestPending.current || favoriteMutation.isPending) {
      return;
    }
    requestPending.current = true;
    favoriteMutation.mutate();
  };

  return (
    <button
      aria-label={`${isFavorited ? "Remove" : "Add"} ${label} ${
        isFavorited ? "from" : "to"
      } favorites`}
      aria-pressed={isFavorited}
      className={`${target.type === "project" ? "star-project" : "star-org"} flex-item ${
        stylex.props(
          (isAuthenticatedFavoriteStar || isAuthenticatedDirectProjectStar) &&
            authenticatedSidenavFavoriteStarStyles.button,
        ).className
      }`.trimEnd()}
      data-stylex-owner={
        isAuthenticatedFavoriteStar
          ? "authenticated-sidenav-favorite-stars"
          : isAuthenticatedDirectProjectStar
            ? "authenticated-sidenav-direct-project-rows"
            : undefined
      }
      data-stylex-owner-state={
        isAuthenticatedFavoriteStar || isAuthenticatedDirectProjectStar
          ? `${favoriteMutation.isPending ? "pending-" : ""}${isFavorited ? "starred" : "unstarred"}`
          : undefined
      }
      disabled={favoriteMutation.isPending}
      onClick={toggleFavorite}
      type="button"
    >
      <i
        aria-hidden="true"
        className={`${isFavorited ? "star starred material-icons" : "star material-icons"} ${
          stylex.props(
            (isAuthenticatedFavoriteStar || isAuthenticatedDirectProjectStar) &&
              authenticatedSidenavFavoriteStarStyles.icon,
            (isAuthenticatedFavoriteStar || isAuthenticatedDirectProjectStar) &&
              isFavorited &&
              authenticatedSidenavFavoriteStarStyles.starredIcon,
          ).className
        }`.trimEnd()}
      >
        star
      </i>
    </button>
  );
}

function SidebarOrganizationList({
  idPrefix,
  isAuthenticatedSidenav = false,
  onSearchQueryChange,
  runtimeConfig,
  searchQuery,
  sessionLoginId,
  workspace,
}: {
  idPrefix?: string;
  isAuthenticatedSidenav?: boolean;
  onSearchQueryChange: (query: string) => void;
  runtimeConfig: RuntimeConfig;
  searchQuery: string;
  sessionLoginId: string;
  workspace: YoramRecord;
}) {
  const { t } = useLegacyMessages();
  const [isOwnProjectsExpanded, setIsOwnProjectsExpanded] = React.useState(false);
  const ownProjects = recordArray(workspace.ownProjects);
  const favoriteOrganizations = recordArray(workspace.favoriteOrganizations);
  const organizations = recordArray(workspace.organizations);
  const loginId = valueString(
    workspace.loginId ?? (workspace.profile as YoramRecord | undefined)?.loginId,
    sessionLoginId,
  );
  const favoriteOrganizationKeys = new Set(favoriteOrganizations.map(organizationKey));
  const lastFavoriteOrganizationKey = favoriteOrganizations.length
    ? organizationKey(favoriteOrganizations[favoriteOrganizations.length - 1])
    : "";
  const organizationOwners = new Set(
    [...favoriteOrganizations, ...organizations].map((organization) =>
      valueString(organization.organizationName ?? organization.name, "").toLocaleLowerCase(),
    ),
  );
  const regularOrganizations: YoramRecord[] = [];
  for (const organization of organizations) {
    if (!favoriteOrganizationKeys.has(organizationKey(organization))) {
      regularOrganizations.push(organization);
    }
  }
  const directFavoriteProjects: YoramRecord[] = [];
  const directFavoriteKeys = new Set<string>();
  for (const project of recordArray(workspace.favoriteProjects)) {
    const ownerName = valueString(project.ownerName ?? project.owner, "");
    const key = projectKey(project);
    if (
      ownerName.toLocaleLowerCase() === loginId.toLocaleLowerCase() ||
      organizationOwners.has(ownerName.toLocaleLowerCase()) ||
      directFavoriteKeys.has(key)
    ) {
      continue;
    }
    directFavoriteKeys.add(key);
    directFavoriteProjects.push(project);
  }
  const normalizedQuery = normalizedSidebarQuery(searchQuery);
  const showOwnProjects =
    normalizedQuery === "" ||
    loginId.toLocaleLowerCase().includes(normalizedQuery) ||
    ownProjects.some((project) => sidebarNestedProjectMatches(project, normalizedQuery));
  const visibleOwnProjects = normalizedQuery
    ? ownProjects.filter((project) => sidebarNestedProjectMatches(project, normalizedQuery))
    : ownProjects;
  const visibleFavoriteOrganizations = favoriteOrganizations.filter((organization) =>
    sidebarOrganizationMatches(organization, normalizedQuery),
  );
  const visibleRegularOrganizations = regularOrganizations.filter((organization) =>
    sidebarOrganizationMatches(organization, normalizedQuery),
  );
  const visibleDirectFavorites = directFavoriteProjects.filter((project) =>
    sidebarProjectMatches(project, normalizedQuery),
  );
  const favoriteShellOwner = isAuthenticatedSidenav
    ? "authenticated-sidenav-favorite-shell"
    : undefined;
  const favoriteShellGroupClass = isAuthenticatedSidenav
    ? ` ${stylex.props(authenticatedSidenavFavoriteShellStyles.group).className}`
    : "";
  const favoriteShellInputClass = isAuthenticatedSidenav
    ? ` ${stylex.props(authenticatedSidenavFavoriteShellStyles.input).className}`
    : "";
  const favoriteShellBarClass = isAuthenticatedSidenav
    ? ` ${stylex.props(authenticatedSidenavFavoriteShellStyles.bar).className}`
    : "";
  const favoriteShellResultClass = isAuthenticatedSidenav
    ? ` ${stylex.props(authenticatedSidenavFavoriteShellStyles.result).className}`
    : "";
  const favoriteShellNoResultClass = isAuthenticatedSidenav
    ? ` ${
        stylex.props(
          authenticatedSidenavFavoriteShellStyles.result,
          authenticatedSidenavFavoriteShellStyles.noResult,
        ).className
      }`
    : "";

  if (
    ownProjects.length === 0 &&
    favoriteOrganizations.length === 0 &&
    organizations.length === 0 &&
    directFavoriteProjects.length === 0
  ) {
    return (
      <div className="search-result" data-stylex-owner={favoriteShellOwner}>
        <div className={`group${favoriteShellGroupClass}`}>
          <input
            className={`search-input org-search${favoriteShellInputClass}`}
            type="text"
            autoComplete="off"
            onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
            placeholder={t("title.type.name")}
            value={searchQuery}
          />
          <span className={`bar${favoriteShellBarClass}`}></span>
        </div>
        <div
          id={sidebarDomId(idPrefix, "organizations")}
          className={`no-result tab-pane user-ul${favoriteShellNoResultClass}`}
        >
          {t("title.no.results")}
        </div>
      </div>
    );
  }

  return (
    <div className="search-result" data-stylex-owner={favoriteShellOwner}>
      <div className={`group${favoriteShellGroupClass}`}>
        <input
          className={`search-input org-search${favoriteShellInputClass}`}
          type="text"
          autoComplete="off"
          onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
          placeholder={t("title.type.name")}
          value={searchQuery}
        />
        <span className={`bar${favoriteShellBarClass}`}></span>
      </div>
      <ul
        className={`tab-pane user-ul${favoriteShellResultClass}`}
        id={sidebarDomId(idPrefix, "organizations")}
      >
        {ownProjects.length > 0 && showOwnProjects ? (
          <li
            className={`org-li ${
              stylex.props(
                isAuthenticatedSidenav && authenticatedSidenavFavoriteOrganizationRowStyles.row,
              ).className
            }`.trimEnd()}
            data-stylex-owner={
              isAuthenticatedSidenav
                ? "authenticated-sidenav-favorite-organization-rows"
                : undefined
            }
          >
            <div
              className={`org-list project-flex-container all-orgs ${
                stylex.props(
                  isAuthenticatedSidenav &&
                    authenticatedSidenavFavoriteOrganizationRowStyles.header,
                ).className
              }`.trimEnd()}
            >
              <button
                aria-expanded={isOwnProjectsExpanded}
                className={`project-item project-item-container organization-toggle ${
                  stylex.props(
                    isAuthenticatedSidenav &&
                      authenticatedSidenavFavoriteOrganizationRowStyles.projectItem,
                    isAuthenticatedSidenav &&
                      authenticatedSidenavFavoriteOrganizationRowStyles.itemContainer,
                    isAuthenticatedSidenav &&
                      authenticatedSidenavFavoriteOrganizationRowStyles.toggle,
                  ).className
                }`.trimEnd()}
                onClick={() => setIsOwnProjectsExpanded((expanded) => !expanded)}
                type="button"
              >
                <div
                  className={`flex-item site-logo ${
                    stylex.props(
                      isAuthenticatedSidenav &&
                        authenticatedSidenavFavoriteOrganizationRowStyles.logo,
                    ).className
                  }`.trimEnd()}
                >
                  <i className="yobicon-angle-right"></i>
                </div>
                <div
                  className={`projectName-owner all-org-names flex-item ${
                    stylex.props(
                      isAuthenticatedSidenav &&
                        authenticatedSidenavFavoriteOrganizationRowStyles.nameOwner,
                    ).className
                  }`.trimEnd()}
                >
                  <div
                    className={`project-name org-name flex-item ${
                      stylex.props(
                        isAuthenticatedSidenav &&
                          authenticatedSidenavFavoriteOrganizationRowStyles.name,
                      ).className
                    }`.trimEnd()}
                  >
                    {loginId}
                  </div>
                  <div
                    className={`project-owner flex-item sub-project-counter ${
                      stylex.props(
                        isAuthenticatedSidenav &&
                          authenticatedSidenavFavoriteOrganizationRowStyles.owner,
                      ).className
                    }`.trimEnd()}
                  >
                    {ownProjects.length}
                  </div>
                </div>
              </button>
              <div
                className={`star-org flex-item ${
                  stylex.props(
                    isAuthenticatedSidenav && authenticatedSidenavFavoriteStarStyles.placeholder,
                  ).className
                }`.trimEnd()}
                data-stylex-owner={
                  isAuthenticatedSidenav ? "authenticated-sidenav-favorite-stars" : undefined
                }
                data-stylex-owner-state={isAuthenticatedSidenav ? "placeholder" : undefined}
              ></div>
            </div>
            <ul className="project-ul">
              {visibleOwnProjects.map((project) => (
                <SidebarAllProjectItem
                  favored={sidebarIsFavorited(project)}
                  isAuthenticatedSidenav={isAuthenticatedSidenav}
                  key={projectKey(project)}
                  project={project}
                  runtimeConfig={runtimeConfig}
                  showNonFavorite={normalizedQuery !== "" || isOwnProjectsExpanded}
                />
              ))}
            </ul>
          </li>
        ) : null}
        {visibleFavoriteOrganizations.map((organization) => (
          <SidebarOrganizationItem
            favored={sidebarIsFavorited(organization, true)}
            isLast={organizationKey(organization) === lastFavoriteOrganizationKey}
            isAuthenticatedSidenav={isAuthenticatedSidenav}
            key={organizationKey(organization)}
            normalizedQuery={normalizedQuery}
            organization={organization}
            runtimeConfig={runtimeConfig}
          />
        ))}
        {visibleRegularOrganizations.map((organization) => (
          <SidebarOrganizationItem
            favored={sidebarIsFavorited(organization, false)}
            isAuthenticatedSidenav={isAuthenticatedSidenav}
            key={organizationKey(organization)}
            normalizedQuery={normalizedQuery}
            organization={organization}
            runtimeConfig={runtimeConfig}
          />
        ))}
        <ul className="etc-favorites"></ul>
        {visibleDirectFavorites.map((project) => (
          <SidebarProjectItem
            isAuthenticatedFavoritePane={isAuthenticatedSidenav}
            key={projectKey(project)}
            project={project}
            runtimeConfig={runtimeConfig}
          />
        ))}
      </ul>
    </div>
  );
}

function SidebarOrganizationItem({
  favored,
  isAuthenticatedSidenav = false,
  isLast = false,
  normalizedQuery,
  organization,
  runtimeConfig,
}: {
  favored: boolean;
  isAuthenticatedSidenav?: boolean;
  isLast?: boolean;
  normalizedQuery: string;
  organization: YoramRecord;
  runtimeConfig: RuntimeConfig;
}) {
  const [showNonFavoriteProjects, setShowNonFavoriteProjects] = React.useState(false);
  const organizationName = valueString(organization.organizationName ?? organization.name, "");
  const projectCount = valueString(organization.projectCount, "");
  const projects = recordArray(organization.projects);
  const visibleProjects = normalizedQuery
    ? projects.filter((project) => sidebarNestedProjectMatches(project, normalizedQuery))
    : projects;

  return (
    <li
      className={`org-li${isLast ? " favored" : ""} ${
        stylex.props(
          isAuthenticatedSidenav && authenticatedSidenavFavoriteOrganizationRowStyles.row,
        ).className
      }`.trimEnd()}
      data-stylex-owner={
        isAuthenticatedSidenav ? "authenticated-sidenav-favorite-organization-rows" : undefined
      }
    >
      <div
        className={`org-list project-flex-container all-orgs ${
          stylex.props(
            isAuthenticatedSidenav && authenticatedSidenavFavoriteOrganizationRowStyles.header,
          ).className
        }`.trimEnd()}
      >
        <button
          aria-expanded={showNonFavoriteProjects}
          className={`project-item project-item-container organization-toggle ${
            stylex.props(
              isAuthenticatedSidenav &&
                authenticatedSidenavFavoriteOrganizationRowStyles.projectItem,
              isAuthenticatedSidenav &&
                authenticatedSidenavFavoriteOrganizationRowStyles.itemContainer,
              isAuthenticatedSidenav && authenticatedSidenavFavoriteOrganizationRowStyles.toggle,
              isAuthenticatedSidenav &&
                authenticatedSidenavFavoriteOrganizationRowStyles.realOrganizationToggle,
            ).className
          }`.trimEnd()}
          onClick={() => setShowNonFavoriteProjects((expanded) => !expanded)}
          type="button"
        >
          <div
            className={`flex-item site-logo ${
              stylex.props(
                isAuthenticatedSidenav && authenticatedSidenavFavoriteOrganizationRowStyles.logo,
              ).className
            }`.trimEnd()}
          >
            <i className="yobicon-angle-right"></i>
          </div>
          <div
            className={`projectName-owner all-org-names flex-item ${
              stylex.props(
                isAuthenticatedSidenav &&
                  authenticatedSidenavFavoriteOrganizationRowStyles.nameOwner,
              ).className
            }`.trimEnd()}
          >
            <div
              className={`project-name org-name flex-item ${
                stylex.props(
                  isAuthenticatedSidenav && authenticatedSidenavFavoriteOrganizationRowStyles.name,
                ).className
              }`.trimEnd()}
            >
              {organizationName}
            </div>
            <div
              className={`project-owner flex-item ${
                stylex.props(
                  isAuthenticatedSidenav && authenticatedSidenavFavoriteOrganizationRowStyles.owner,
                ).className
              }`.trimEnd()}
            >
              {projectCount}
            </div>
          </div>
        </button>
        <SidebarFavoriteButton
          initialFavorited={favored}
          isAuthenticatedFavoriteStar={isAuthenticatedSidenav}
          key={`organization-favorite-${organizationKey(organization)}-${String(favored)}`}
          label={organizationName}
          runtimeConfig={runtimeConfig}
          target={{ organizationName, type: "organization" }}
        />
      </div>
      <ul className="project-ul">
        {visibleProjects.map((project) => (
          <SidebarAllProjectItem
            favored={sidebarIsFavorited(project)}
            isAuthenticatedSidenav={isAuthenticatedSidenav}
            key={projectKey(project)}
            project={project}
            runtimeConfig={runtimeConfig}
            showNonFavorite={normalizedQuery !== "" || showNonFavoriteProjects}
          />
        ))}
      </ul>
    </li>
  );
}

function SidebarAllProjectItem({
  favored,
  isAuthenticatedSidenav = false,
  project,
  runtimeConfig,
  showNonFavorite,
}: {
  favored: boolean;
  isAuthenticatedSidenav?: boolean;
  project: YoramRecord;
  runtimeConfig: RuntimeConfig;
  showNonFavorite: boolean;
}) {
  const ownerName = valueString(project.ownerName ?? project.owner, "");
  const projectName = valueString(project.projectName ?? project.name, "");
  const overview = valueString(project.overview, "");
  const logoUrl = valueString(project.logoUrl ?? project.projectLogoUrl, "");
  const isPrivate = sidebarProjectIsPrivate(project);

  return (
    <li
      className={`user-li${favored ? " show-always" : showNonFavorite ? "" : " hide"} ${
        stylex.props(isAuthenticatedSidenav && authenticatedSidenavFavoriteProjectRowStyles.row)
          .className
      }`.trimEnd()}
      data-stylex-owner={
        isAuthenticatedSidenav ? "authenticated-sidenav-favorite-project-rows" : undefined
      }
    >
      <SidebarHoverPopover
        content={overview}
        isAuthenticatedFavoriteProjectRow={isAuthenticatedSidenav}
      >
        <Link
          className={`project-item project-item-container sidebar-project-link sidebar-row-link ${
            stylex.props(
              isAuthenticatedSidenav && authenticatedSidenavFavoriteProjectRowStyles.link,
            ).className
          }`.trimEnd()}
          params={{ ownerName, projectName }}
          to="/$ownerName/$projectName"
        >
          <div
            className={`flex-item site-logo all-project-names ${
              stylex.props(
                isAuthenticatedSidenav && authenticatedSidenavFavoriteProjectRowStyles.logo,
              ).className
            }`.trimEnd()}
          >
            <i
              className={`project-avatar ${
                stylex.props(
                  isAuthenticatedSidenav && authenticatedSidenavFavoriteProjectRowStyles.avatar,
                ).className
              }`.trimEnd()}
            >
              {logoUrl ? (
                <img
                  alt=""
                  className={`logo ${
                    stylex.props(
                      isAuthenticatedSidenav && authenticatedSidenavFavoriteProjectRowStyles.image,
                    ).className
                  }`.trimEnd()}
                  src={logoUrl}
                />
              ) : (
                <span className="dummy-25px"> </span>
              )}
            </i>
          </div>
          <div
            className={`projectName-owner flex-item ${
              stylex.props(
                isAuthenticatedSidenav && authenticatedSidenavFavoriteProjectRowStyles.nameOwner,
              ).className
            }`.trimEnd()}
          >
            <div
              className={`project-name flex-item ${
                stylex.props(
                  isAuthenticatedSidenav && authenticatedSidenavFavoriteProjectRowStyles.name,
                ).className
              }`.trimEnd()}
            >
              {projectName} {isPrivate ? <i className="yobicon-lock yobicon-small"></i> : null}
            </div>
          </div>
        </Link>
        <SidebarFavoriteButton
          initialFavorited={favored}
          isAuthenticatedFavoriteStar={isAuthenticatedSidenav}
          key={`project-favorite-${projectKey(project)}-${String(favored)}`}
          label={`${ownerName}/${projectName}`}
          runtimeConfig={runtimeConfig}
          target={{ ownerName, projectName, type: "project" }}
        />
      </SidebarHoverPopover>
    </li>
  );
}

const authenticatedSidenavProjectSubtabStyles = stylex.create({
  wrap: {
    padding: "10px 0 5px",
  },
  list: {
    backgroundColor: globalColors.sidenavSubtabSurface,
    color: globalColors.sidenavSubtabText,
    display: "inline-block",
  },
  item: {
    border: 0,
    display: "inline-block",
    marginLeft: 0,
  },
  button: {
    appearance: "none",
    backgroundColor: globalColors.transparent,
    border: 0,
    borderRadius: 0,
    boxShadow: "none",
    color: "inherit",
    cursor: "pointer",
    display: "block",
    font: "inherit",
    margin: 0,
    padding: "5px 8px",
    ":hover": {
      backgroundColor: globalColors.transparent,
      borderBottomColor: globalColors.sidenavSubtabAccent,
      borderBottomStyle: "solid",
      borderBottomWidth: "1px",
      color: globalColors.sidenavSubtabText,
      textDecoration: "none",
    },
    ":focus": {
      backgroundColor: globalColors.transparent,
      borderBottomColor: globalColors.sidenavSubtabAccent,
      borderBottomStyle: "solid",
      borderBottomWidth: "1px",
      color: globalColors.sidenavSubtabText,
      textDecoration: "none",
    },
  },
  activeButton: {
    backgroundColor: globalColors.sidenavSubtabAccent,
    borderBottomColor: globalColors.sidenavSubtabAccent,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    color: globalColors.sidenavSubtabActiveText,
    textDecoration: "none",
    ":hover": {
      backgroundColor: globalColors.sidenavSubtabAccent,
      color: globalColors.sidenavSubtabActiveText,
    },
    ":focus": {
      backgroundColor: globalColors.sidenavSubtabAccent,
      color: globalColors.sidenavSubtabActiveText,
    },
  },
});

function SidebarProjectList({
  idPrefix,
  onSearchQueryChange,
  runtimeConfig,
  searchQuery,
  workspace,
}: {
  idPrefix?: string;
  onSearchQueryChange: (query: string) => void;
  runtimeConfig: RuntimeConfig;
  searchQuery: string;
  workspace: YoramRecord;
}) {
  const { t } = useLegacyMessages();
  const [activeSubtab, setActiveSubtab] = React.useState<
    "recentlyVisited" | "createdByMe" | "watching" | "joinmember"
  >("recentlyVisited");
  const recentProjects = recordArray(workspace.recentProjects);
  const watchedProjects = recordArray(workspace.watchedProjects);
  const memberProjects = recordArray(workspace.memberProjects);
  const ownProjects = recordArray(workspace.ownProjects);
  const isAuthenticatedSidenav = idPrefix === undefined;
  const subtabs = [
    ["recentlyVisited", "title.recently.visited"],
    ["createdByMe", "title.createdByMe"],
    ["watching", "title.watching"],
    ["joinmember", "title.joinmember"],
  ] as const;

  return (
    <div>
      <div className="search-result">
        <div className="tab-pane myproject-list-wrap">
          <div className="group">
            <input
              className="search-input project-search"
              type="text"
              id={sidebarDomId(idPrefix, "query")}
              autoComplete="off"
              onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
              placeholder={t("title.type.name")}
              value={searchQuery}
            />
            <span className="bar"></span>
          </div>
          <div
            className={`subtab-wrap subtab-group${
              isAuthenticatedSidenav
                ? ` ${stylex.props(authenticatedSidenavProjectSubtabStyles.wrap).className}`
                : ""
            }`}
            data-stylex-owner={
              isAuthenticatedSidenav ? "authenticated-sidenav-project-subtabs" : undefined
            }
          >
            <ul
              className={`nav-subtab unstyled${
                isAuthenticatedSidenav
                  ? ` ${stylex.props(authenticatedSidenavProjectSubtabStyles.list).className}`
                  : ""
              }`}
            >
              {subtabs.map(([subtab, messageKey], index) => (
                <React.Fragment key={subtab}>
                  <li
                    className={`${activeSubtab === subtab ? "active" : ""}${
                      isAuthenticatedSidenav
                        ? ` ${stylex.props(authenticatedSidenavProjectSubtabStyles.item).className}`
                        : ""
                    }`.trim()}
                  >
                    <button
                      type="button"
                      className={
                        isAuthenticatedSidenav
                          ? stylex.props(
                              authenticatedSidenavProjectSubtabStyles.button,
                              activeSubtab === subtab &&
                                authenticatedSidenavProjectSubtabStyles.activeButton,
                            ).className
                          : undefined
                      }
                      onClick={() => setActiveSubtab(subtab)}
                    >
                      {t(messageKey)}
                    </button>
                  </li>
                  {index < subtabs.length - 1 ? " " : null}
                </React.Fragment>
              ))}
            </ul>
          </div>
          <div className="tab-content">
            <SidebarProjectPane
              active={activeSubtab === "recentlyVisited"}
              id="recentlyVisited"
              idPrefix={idPrefix}
              projects={recentProjects}
              runtimeConfig={runtimeConfig}
              searchQuery={searchQuery}
            />
            <SidebarProjectPane
              active={activeSubtab === "watching"}
              id="watching"
              idPrefix={idPrefix}
              projects={watchedProjects}
              runtimeConfig={runtimeConfig}
              searchQuery={searchQuery}
            />
            <SidebarProjectPane
              active={activeSubtab === "createdByMe"}
              id="createdByMe"
              idPrefix={idPrefix}
              projects={ownProjects}
              runtimeConfig={runtimeConfig}
              searchQuery={searchQuery}
            />
            <SidebarProjectPane
              active={activeSubtab === "joinmember"}
              id="joinmember"
              idPrefix={idPrefix}
              projects={memberProjects}
              runtimeConfig={runtimeConfig}
              searchQuery={searchQuery}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarProjectPane({
  active = false,
  id,
  idPrefix,
  projects,
  runtimeConfig,
  searchQuery,
}: {
  active?: boolean;
  id: string;
  idPrefix?: string;
  projects: YoramRecord[];
  runtimeConfig: RuntimeConfig;
  searchQuery: string;
}) {
  const { t } = useLegacyMessages();
  const paneId = sidebarDomId(idPrefix, id);
  const normalizedQuery = normalizedSidebarQuery(searchQuery);
  const visibleProjects = projects.filter((project) =>
    sidebarProjectMatches(project, normalizedQuery),
  );
  if (projects.length === 0) {
    return (
      <div id={paneId} className={`no-result tab-pane user-ul ${active ? "active" : ""}`}>
        {t("title.no.results")}
      </div>
    );
  }
  return (
    <ul className={`tab-pane user-ul ${active ? "active" : ""}`} id={paneId}>
      {visibleProjects.map((project) => (
        <SidebarProjectItem
          key={projectKey(project)}
          project={project}
          runtimeConfig={runtimeConfig}
        />
      ))}
    </ul>
  );
}

function SidebarProjectItem({
  isAuthenticatedFavoritePane = false,
  project,
  runtimeConfig,
}: {
  isAuthenticatedFavoritePane?: boolean;
  project: YoramRecord;
  runtimeConfig: RuntimeConfig;
}) {
  const ownerName = valueString(project.ownerName ?? project.owner, "");
  const projectName = valueString(project.projectName ?? project.name, "");
  const logoUrl = valueString(project.logoUrl ?? project.projectLogoUrl, "");
  const isPrivate = sidebarProjectIsPrivate(project);
  const isFavorited = sidebarIsFavorited(project);

  return (
    <li
      className={`user-li ${stylex.props(authenticatedSidenavDirectProjectRowStyles.row).className}`}
      data-stylex-owner="authenticated-sidenav-direct-project-rows"
    >
      <div
        className={`project-list project-flex-container ${stylex.props(authenticatedSidenavDirectProjectRowStyles.list).className}`}
      >
        <div
          className={`project-item project-item-container ${stylex.props(authenticatedSidenavDirectProjectRowStyles.item).className}`}
        >
          <div
            className={`flex-item site-logo ${stylex.props(authenticatedSidenavDirectProjectRowStyles.logo).className}`}
          >
            <Link
              aria-label={`Open ${ownerName}/${projectName}`}
              className={
                stylex.props(authenticatedSidenavDirectProjectRowStyles.projectLink).className
              }
              params={{ ownerName, projectName }}
              to="/$ownerName/$projectName"
            >
              <i
                className={`project-avatar ${stylex.props(authenticatedSidenavDirectProjectRowStyles.avatar).className}`}
              >
                {logoUrl ? (
                  <img
                    alt=""
                    className={`logo ${stylex.props(authenticatedSidenavDirectProjectRowStyles.image).className}`}
                    src={logoUrl}
                  />
                ) : (
                  <span className="dummy-25px"> </span>
                )}
              </i>
            </Link>
          </div>
          <div
            className={`projectName-owner flex-item ${stylex.props(authenticatedSidenavDirectProjectRowStyles.nameOwner).className}`}
          >
            <div
              className={`project-name flex-item ${stylex.props(authenticatedSidenavDirectProjectRowStyles.name).className}`}
            >
              <Link
                className={
                  stylex.props(authenticatedSidenavDirectProjectRowStyles.projectLink).className
                }
                params={{ ownerName, projectName }}
                to="/$ownerName/$projectName"
              >
                {projectName} {isPrivate ? <i className="yobicon-lock yobicon-small"></i> : null}
              </Link>
            </div>
            <div
              className={`project-owner flex-item ${stylex.props(authenticatedSidenavDirectProjectRowStyles.owner).className}`}
            >
              <Link
                className={
                  stylex.props(authenticatedSidenavDirectProjectRowStyles.ownerLink).className
                }
                params={{ user: ownerName }}
                to="/$user"
              >
                {ownerName}
              </Link>
            </div>
          </div>
        </div>
        <SidebarFavoriteButton
          initialFavorited={isFavorited}
          isAuthenticatedDirectProjectStar={!isAuthenticatedFavoritePane}
          isAuthenticatedFavoriteStar={isAuthenticatedFavoritePane}
          key={`project-favorite-${projectKey(project)}-${String(isFavorited)}`}
          label={`${ownerName}/${projectName}`}
          runtimeConfig={runtimeConfig}
          target={{ ownerName, projectName, type: "project" }}
        />
      </div>
    </li>
  );
}

function SidebarRecentIssueList({
  idPrefix,
  onSearchQueryChange,
  searchQuery,
  workspace,
}: {
  idPrefix?: string;
  onSearchQueryChange: (query: string) => void;
  searchQuery: string;
  workspace: YoramRecord;
}) {
  const { t } = useLegacyMessages();
  const issues = recordArray(workspace.issueItems);
  const normalizedQuery = normalizedSidebarQuery(searchQuery);
  const visibleIssues = issues.filter((issue) => sidebarIssueMatches(issue, normalizedQuery));

  return (
    <div>
      <div className="search-result">
        <div className="tab-pane myproject-list-wrap">
          <div className="group">
            <input
              className="search-input project-search"
              type="text"
              id={sidebarDomId(idPrefix, "recent-issue-query")}
              autoComplete="off"
              onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
              placeholder={t("title.type.name")}
              value={searchQuery}
            />
            <span className="bar"></span>
          </div>
          <div className="tab-content">
            {issues.length === 0 ? (
              <div
                id={sidebarDomId(idPrefix, "recentlyVisitedIssues")}
                className="no-result tab-pane user-ul active"
              >
                {t("title.no.results")}
              </div>
            ) : (
              <ul
                className="tab-pane user-ul active"
                id={sidebarDomId(idPrefix, "recentlyVisitedIssues")}
              >
                {visibleIssues.map((issue) => (
                  <SidebarRecentIssueItem issue={issue} key={recentIssueKey(issue)} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarRecentIssueItem({ issue }: { issue: YoramRecord }) {
  const ownerName = valueString(issue.ownerName ?? issue.owner_name ?? issue.owner, "");
  const projectName = valueString(issue.projectName ?? issue.project_name ?? issue.project, "");
  const issueNumber = valueString(issue.issueNumber ?? issue.issue_number ?? issue.number, "");
  const title = valueString(issue.title, "");

  return (
    <li className="user-li">
      <SidebarHoverPopover content={issueNumber}>
        <Link
          className="project-item project-item-container sidebar-row-link"
          params={{ issueNumber, ownerName, projectName }}
          to="/$ownerName/$projectName/issue/$issueNumber"
        >
          <div className="issue-item projectName-owner flex-item">
            <div className="issue-title-start">-</div>
            <div className="issue-title flex-item">{title}</div>
          </div>
        </Link>
      </SidebarHoverPopover>
    </li>
  );
}

function SidebarHoverPopover({
  children,
  content,
  isAuthenticatedFavoriteProjectRow = false,
}: {
  children: React.ReactNode;
  content: string;
  isAuthenticatedFavoriteProjectRow?: boolean;
}) {
  const [isVisible, setIsVisible] = React.useState(false);
  const showPopover = () => setIsVisible(Boolean(content));
  const hidePopover = () => setIsVisible(false);

  return (
    <div
      className={`project-list project-flex-container ${
        stylex.props(
          isAuthenticatedFavoriteProjectRow && authenticatedSidenavFavoriteProjectRowStyles.list,
        ).className
      }`.trimEnd()}
      onMouseEnter={showPopover}
      onMouseLeave={hidePopover}
      style={isVisible && !isAuthenticatedFavoriteProjectRow ? { position: "relative" } : undefined}
    >
      {children}
      {isVisible ? (
        <div
          className={`popover right ${
            stylex.props(
              isAuthenticatedFavoriteProjectRow &&
                authenticatedSidenavFavoriteProjectRowStyles.popover,
            ).className
          }`.trimEnd()}
          data-stylex-owner={
            isAuthenticatedFavoriteProjectRow
              ? "authenticated-sidenav-favorite-project-popover"
              : undefined
          }
          role="tooltip"
          style={isAuthenticatedFavoriteProjectRow ? undefined : HOME_SIDEBAR_POPOVER_STYLE}
        >
          <div
            className={`arrow ${
              stylex.props(
                isAuthenticatedFavoriteProjectRow &&
                  authenticatedSidenavFavoriteProjectRowStyles.popoverArrow,
              ).className
            }`.trimEnd()}
          />
          <div
            className={`popover-content ${
              stylex.props(
                isAuthenticatedFavoriteProjectRow &&
                  authenticatedSidenavFavoriteProjectRowStyles.popoverContent,
              ).className
            }`.trimEnd()}
          >
            {content}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function stringField(record: YoramRecord, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readStoredValue(key: string) {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredValue(key: string, value: string) {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be disabled without changing the in-memory React behavior.
  }
}

function readStoredLeftSidebarOpen() {
  return readStoredValue(LEGACY_LEFT_SIDEBAR_OPEN_KEY) === "true";
}

function readStoredLeftSidebarTab(): SidebarTab {
  switch (readStoredValue(LEGACY_LEFT_SIDEBAR_TAB_KEY)) {
    case "myProjectList":
      return "project";
    case "myRecentIssueList":
      return "recent";
    default:
      return "favorite";
  }
}

function storedSidebarTabValue(tab: SidebarTab) {
  switch (tab) {
    case "project":
      return "myProjectList";
    case "recent":
      return "myRecentIssueList";
    default:
      return "myOrganizationList";
  }
}

function sidebarDomId(prefix: string | undefined, id: string) {
  return prefix ? `${prefix}-${id}` : id;
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

function recordArray(value: unknown): YoramRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is YoramRecord => typeof item === "object" && item !== null)
    : [];
}

function recordValue(value: unknown): YoramRecord {
  return typeof value === "object" && value !== null ? (value as YoramRecord) : {};
}

function normalizedSidebarQuery(value: string) {
  return value.trim().toLocaleLowerCase();
}

function sidebarIsFavorited(record: YoramRecord, fallback = false) {
  return typeof record.isFavorited === "boolean"
    ? record.isFavorited
    : typeof record.favored === "boolean"
      ? record.favored
      : fallback;
}

function sidebarProjectIsPrivate(project: YoramRecord) {
  return valueString(project.projectScope, "").toLocaleUpperCase() === "PRIVATE";
}

function sidebarProjectMatches(project: YoramRecord, normalizedQuery: string) {
  if (normalizedQuery === "") {
    return true;
  }
  return [project.ownerName, project.owner, project.projectName, project.name]
    .map((value) => valueString(value, "").toLocaleLowerCase())
    .some((value) => value.includes(normalizedQuery));
}

function sidebarNestedProjectMatches(project: YoramRecord, normalizedQuery: string) {
  if (normalizedQuery === "") {
    return true;
  }
  return [project.projectName, project.name]
    .map((value) => valueString(value, "").toLocaleLowerCase())
    .some((value) => value.includes(normalizedQuery));
}

function sidebarOrganizationMatches(organization: YoramRecord, normalizedQuery: string) {
  if (normalizedQuery === "") {
    return true;
  }
  const organizationName = valueString(
    organization.organizationName ?? organization.name,
    "",
  ).toLocaleLowerCase();
  return (
    organizationName.includes(normalizedQuery) ||
    recordArray(organization.projects).some((project) =>
      sidebarNestedProjectMatches(project, normalizedQuery),
    )
  );
}

function sidebarIssueMatches(issue: YoramRecord, normalizedQuery: string) {
  if (normalizedQuery === "") {
    return true;
  }
  return [
    issue.title,
    issue.ownerName,
    issue.owner_name,
    issue.owner,
    issue.projectName,
    issue.project_name,
    issue.project,
    issue.issueNumber,
    issue.issue_number,
    issue.number,
  ]
    .map((value) => valueString(value, "").toLocaleLowerCase())
    .some((value) => value.includes(normalizedQuery));
}

function hasSidebarFavoriteData(workspace: YoramRecord) {
  return (
    Array.isArray(workspace.ownProjects) ||
    Array.isArray(workspace.favoriteOrganizations) ||
    Array.isArray(workspace.organizations) ||
    Array.isArray(workspace.favoriteProjects)
  );
}

function projectKey(project: YoramRecord) {
  return valueString(
    project.projectId ??
      project.id ??
      `${valueString(project.ownerName ?? project.owner, "")}/${valueString(project.projectName ?? project.name, "")}`,
    "project",
  );
}

function organizationKey(organization: YoramRecord) {
  return valueString(
    organization.organizationId ??
      organization.id ??
      organization.organizationName ??
      organization.name,
    "organization",
  );
}

function recentIssueKey(issue: YoramRecord) {
  return valueString(
    issue.id ??
      `${valueString(issue.ownerName ?? issue.owner_name ?? issue.owner, "")}/${valueString(issue.projectName ?? issue.project_name ?? issue.project, "")}/${valueString(issue.issueNumber ?? issue.issue_number ?? issue.number, "")}`,
    "issue",
  );
}

function booleanField(record: YoramRecord, key: string, fallback: boolean): boolean {
  const value = record[key];
  return typeof value === "boolean" ? value : fallback;
}
