import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { listNotificationsQueryOptions, type NotificationItem } from "../api/notifications";
import { toggleFavoriteOrganizationRest, toggleFavoriteProjectRest } from "../api/org-project";
import { currentSessionQueryOptions } from "../api/session";
import { readWorkspaceOverviewRest } from "../api/workspace";
import type { YoramRecord } from "../api/types";
import "../yobicon-font.css";
import { readSessionBootstrap } from "../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { useRootLoginDialog, useRootToast } from "./__root";
import viteOwnedSiteIntroBackgroundUrl from "../assets/legacy/photo-svetacreative.jpg";

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
type LeftSidebarMotion = "closed" | "opening" | "open" | "closing";

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
const PROJECT_FORM_PATH: string = "/projectform";
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
  const [isDefaultLandingButtonHidden, setIsDefaultLandingButtonHidden] = React.useState(false);
  const shouldShowDefaultLandingButton =
    routePath !== "/" &&
    routePathWithoutSlash !== "" &&
    routePathWithoutSlash !== defaultLandingWithoutSlash &&
    !isDefaultLandingButtonHidden;
  const setRootToast = useRootToast();
  const [isIntroVisible, setIsIntroVisible] = React.useState(
    () => typeof window === "undefined" || localStorage.getItem("yobi-intro") !== "false",
  );
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
      window.alert(
        `set Default page failed: ${t(error instanceof Error ? error.message : String(error))}`,
      );
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
            <NotificationStreamItem
              basePath={runtimeConfig.basePath}
              key={notification.id}
              notification={notification}
            />
          ))
        )}
        {notificationHasMore && !isLoadingMoreNotifications ? (
          <li>
            <button
              id="notification-more"
              type="button"
              data-owner="authenticated-home-notification-pagination"
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
      <SiteLayoutShell runtimeConfig={runtimeConfig} sidenavUsesAdminAffixTop>
        <HomeFlashToast message={flashMessage} />
        <div className={"page-wrap-outer"} data-owner="authenticated-home-page-wrap-outer">
          <div className={"page-wrap"} data-owner="authenticated-home-page-wrap">
            <div
              className={`site-guide-outer${isIntroVisible ? "" : " hide"}`}
              data-owner="authenticated-home-intro-guide"
            >
              <h3>
                <span>{`${t("app.welcome", { args: [siteName] })} - ${t("app.description")}`}</span>
              </h3>
              <table
                className={"welcome-table table borderless"}
                data-owner="authenticated-home-intro-guide-table"
              >
                <tbody>
                  <tr>
                    <td>
                      <Link
                        to={PROJECT_FORM_PATH}
                        className={"ybtn ybtn-success"}
                        data-owner="authenticated-home-intro-guide-cta"
                      >
                        {t("button.newProject")}
                      </Link>
                    </td>
                    <td>{t("app.welcome.project.desc")}</td>
                  </tr>
                  <tr>
                    <td>
                      <Link
                        to="/organizations/new"
                        className={"ybtn ybtn-success"}
                        data-owner="authenticated-home-intro-guide-cta"
                      >
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
                        className={"ybtn ybtn-success"}
                        data-owner="authenticated-home-intro-guide-cta"
                      >
                        {t("title.projectList")}
                      </Link>
                    </td>
                    <td>{t("app.welcome.searchProject.desc")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className={"guide-toggle"} data-owner="authenticated-home-intro-guide-toggle">
              <button
                className={"btn-transparent"}
                id="toggleIntro"
                type="button"
                onClick={toggleIntro}
              >
                <i className={"yobicon-resizev"} />
              </button>
            </div>
            <div className={"page on-fold-intro"} data-owner="authenticated-home-content-page">
              <div
                className={"row-fluid content-container"}
                data-owner="authenticated-home-content-grid"
              >
                <div className={"span8 main-stream"} data-owner="authenticated-home-main-stream">
                  <ul data-owner="authenticated-home-series-tabs">
                    <li data-owner="authenticated-home-series-tab-item">
                      <Link
                        {...LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS}
                        data-owner="authenticated-home-series-tab-link"
                        search={{ legacyTab: undefined }}
                        to="/notifications"
                      >
                        {t("notification")}
                      </Link>
                    </li>
                    <li data-owner="authenticated-home-series-tab-item">
                      <Link
                        {...LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS}
                        data-owner="authenticated-home-series-tab-link"
                        to="/user/issues"
                        search={LEGACY_USER_ISSUES_LINK_SEARCH}
                      >
                        {t("issue.myIssue")}
                      </Link>
                    </li>
                    <li data-owner="authenticated-home-series-tab-item">
                      <Link
                        {...LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS}
                        data-owner="authenticated-home-series-tab-link"
                        to="/user/files"
                      >
                        {t("user.files")}
                      </Link>
                    </li>
                    <li data-owner="authenticated-home-series-tab-action-item">
                      {shouldShowDefaultLandingButton ? (
                        <>
                          <button
                            id="setDefaultLoginPage"
                            type="button"
                            data-owner="authenticated-home-default-login-action"
                            title={defaultLandingButtonTitle}
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
                              data-owner="authenticated-home-default-login-popover"
                              role="tooltip"
                            >
                              <div data-owner="authenticated-home-default-login-popover-arrow" />
                              <h3 data-owner="authenticated-home-default-login-popover-title">
                                {defaultLandingButtonTitle}
                              </h3>
                              <div data-owner="authenticated-home-default-login-popover-content">
                                {defaultLandingButtonContent}
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </li>
                  </ul>
                  <ul
                    className={"activity-streams notification-wrap unstyled"}
                    data-owner="authenticated-home-notification-list"
                  >
                    {notificationItems.length === 0 ? (
                      <div
                        className={"warning-none"}
                        data-owner="authenticated-home-notification-empty"
                      >
                        <i className="yobicon-danger" /> {t("notification.none")}
                      </div>
                    ) : (
                      notificationItems.map((notification) => (
                        <NotificationStreamItem
                          basePath={runtimeConfig.basePath}
                          key={notification.id}
                          notification={notification}
                        />
                      ))
                    )}
                    {notificationHasMore && !isLoadingMoreNotifications ? (
                      <li>
                        <button
                          id="notification-more"
                          type="button"
                          data-owner="authenticated-home-notification-pagination"
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
                <div
                  className={"span4 index-menu right-menu span-hard-wrap"}
                  data-owner="authenticated-home-index-rail"
                />
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
      <div className={"siteintro-bg row"} data-owner="anonymous-home-intro-outer">
        <div
          style={
            {
              "--siteintro-background-image": `url("${viteOwnedSiteIntroBackgroundUrl}")`,
            } as CSSProperties
          }
          className={"siteintro"}
          data-owner="anonymous-home-intro"
        >
          <div className={"siteintro-cover"} data-owner="anonymous-home-intro-cover">
            <div className={"siteintro-wrap"} data-owner="anonymous-home-intro-wrap">
              <h1 className={"site-heading"} data-owner="anonymous-home-intro-heading">
                21st Century Software Development Platform
              </h1>
              <ul className={"site-features"} data-owner="anonymous-home-intro-tagline">
                <li data-owner="anonymous-home-intro-tagline-item">
                  Just focus on what you have to do
                </li>
              </ul>
            </div>
            <div className={"signup-btn"} data-owner="anonymous-home-intro-signup">
              <Link
                to="/users/signupform"
                activeOptions={{ exact: true }}
                data-owner="anonymous-home-intro-signup-link"
              >
                {t("button.signup", { args: [siteName] })}
              </Link>
            </div>
          </div>
        </div>
        <div className={"feature"} data-owner="anonymous-home-feature">
          <h2 data-owner="anonymous-home-feature-heading">
            <span data-owner="anonymous-home-feature-heading-text">{t("title.features")}</span>
          </h2>
          <ul className={"feature-wrap row"} data-owner="anonymous-home-feature-list">
            {features.map(([iconClassName, title, description]) => (
              <React.Fragment key={iconClassName}>
                <li data-owner="anonymous-home-feature-item">
                  <div className={"feature-image"} data-owner="anonymous-home-feature-icon">
                    <i className={iconClassName} />
                  </div>
                  <div className={"feature-info"} data-owner="anonymous-home-feature-info">
                    <h3 className={"feature-title"} data-owner="anonymous-home-feature-title">
                      {title}
                    </h3>
                    <p className={"feature-desc"} data-owner="anonymous-home-feature-description">
                      {description}
                    </p>
                  </div>
                </li>{" "}
              </React.Fragment>
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

function NotificationStreamItem({
  basePath,
  notification,
}: {
  basePath: string;
  notification: NotificationItem;
}) {
  const messageWrapRef = React.useRef<HTMLDivElement>(null);
  const messageRef = React.useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  // The server API base-prefixes targetHref; TanStack Router re-prefixes `to`,
  // so strip the base path before handing it to the router.
  const targetHref =
    basePath !== "/" && notification.targetHref.startsWith(`${basePath}/`)
      ? notification.targetHref.slice(basePath.length)
      : notification.targetHref;
  const notificationTypeTokens = notification.typeIcon.split(" ");
  const notificationGlyph = notificationTypeTokens[0] || "megaphone";
  const isUpdated =
    notification.eventType === "ISSUE_BODY_CHANGED" || notification.eventType === "COMMENT_UPDATED";
  const avatarClassName = `avatar-wrap smaller `;
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
  }, [notification.message]);

  function toggleLearnMore() {
    setIsExpanded((wasExpanded) => !wasExpanded);
  }

  function handleLearnMoreClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element) || target.closest("a, img")) {
      return;
    }

    toggleLearnMore();
  }

  return (
    <li data-owner="authenticated-home-notification-row">
      <div data-owner="authenticated-home-notification-type">
        {isUpdated ? (
          "Edit"
        ) : (
          <i
            className={`yobicon-${notificationGlyph}${notificationTypeTokens
              .slice(1)
              .map((token) => ` yobicon-${token}`)
              .join("")}`}
          />
        )}
      </div>
      {/* oxlint-disable jsx-a11y/click-events-have-key-events -- legacy partial_notifications.scala.html uses a clickable plain div here. */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- legacy partial_notifications.scala.html uses a clickable plain div here. */}
      <div data-owner="authenticated-home-notification-desc" onClick={handleLearnMoreClick}>
        <div data-owner="authenticated-home-notification-info">
          <div data-owner="authenticated-home-notification-title">
            {notification.targetHref ? (
              <Link to={targetHref} {...LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS}>
                {notification.targetTitle}
              </Link>
            ) : (
              notification.targetTitle
            )}
          </div>
          <div
            data-owner="authenticated-home-notification-message-wrap"
            id={`message-${notification.id}`}
            ref={messageWrapRef}
            style={{ maxHeight: isExpanded ? "none" : undefined }}
            data-part="authenticated-home-notification-expanded-height"
          >
            <div data-owner="authenticated-home-notification-message" ref={messageRef}>
              <LegacyNotificationMessage message={notification.message} />
            </div>
          </div>
          {hasOverflow && !isExpanded ? (
            <div data-owner="authenticated-home-notification-more">...</div>
          ) : null}
          <div data-owner="authenticated-home-notification-meta">
            <Link
              to="/$user"
              params={{ user: notification.actor.loginId }}
              search={LEGACY_USER_LINK_SEARCH}
              className={avatarClassName}
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              activeProps={{
                "aria-current": undefined,
                className: avatarClassName,
                "data-status": undefined,
              }}
            >
              <img src={notification.actor.avatarUrl} alt="" />
            </Link>
            <Link
              to="/$user"
              params={{ user: notification.actor.loginId }}
              search={LEGACY_USER_LINK_SEARCH}
              data-owner="authenticated-home-notification-author"
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
            >
              {notification.actor.displayName}
            </Link>
            @{notification.actor.loginId}
            <span data-owner="authenticated-home-notification-ago" title={notification.createdAt}>
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
  sidenavUsesAdminAffixTop = false,
}: {
  activeMenu?: "projects";
  children: React.ReactNode;
  projectSearchScope?: { organizationName?: string; ownerName?: string; projectName?: string };
  runtimeConfig: RuntimeConfig;
  showLegacyProjectHeaderLinks?: boolean;
  sidenavUsesAdminAffixTop?: boolean;
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
  const legacyProjectListingEnabled = runtimeConfig.hideProjectListing !== true && !isGuest;
  const shouldRenderAllProjectsSearchScope = legacyProjectListingEnabled || isSiteAdmin;
  const feedbackUrl = runtimeConfig.feedbackUrl?.trim();
  const initialSearchScope = projectSearchAction ? "project" : groupSearchAction ? "group" : "all";
  const [selectedSearchScope, setSelectedSearchScope] = React.useState<"all" | "group" | "project">(
    initialSearchScope,
  );
  const [isSearchScopeMenuOpen, setIsSearchScopeMenuOpen] = React.useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = React.useState(readStoredLeftSidebarOpen);
  const [leftSidebarMotion, setLeftSidebarMotion] = React.useState<LeftSidebarMotion>(() =>
    isLeftSidebarOpen ? "open" : "closed",
  );
  const [leftSidebarMotionExpanded, setLeftSidebarMotionExpanded] =
    React.useState(isLeftSidebarOpen);
  const [activeLeftSidebarTab, setActiveLeftSidebarTab] =
    React.useState<SidebarTab>(readStoredLeftSidebarTab);
  const globalSidebarOpenPinRef = React.useRef<HTMLButtonElement>(null);
  const shouldRestoreSidebarOpenPinFocus = React.useRef(false);
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
  const globalGnbSearchScopeToggleClassName = "ybtn dropdown-toggle";
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
  const isLeftSidebarAvailable = session?.isAnonymous === false;
  const showLeftSidebar = isLeftSidebarAvailable && isLeftSidebarOpen;
  const renderLeftSidebar = isLeftSidebarAvailable && leftSidebarMotion !== "closed";
  React.useEffect(() => {
    if (leftSidebarMotion !== "opening") {
      return;
    }
    const frameId = window.requestAnimationFrame(() => setLeftSidebarMotionExpanded(true));
    return () => window.cancelAnimationFrame(frameId);
  }, [leftSidebarMotion]);
  React.useEffect(() => {
    if (leftSidebarMotion !== "closed" || !shouldRestoreSidebarOpenPinFocus.current) {
      return;
    }
    shouldRestoreSidebarOpenPinFocus.current = false;
    window.requestAnimationFrame(() => globalSidebarOpenPinRef.current?.focus());
  }, [leftSidebarMotion]);
  const handleLeftSidebarOpen = () => {
    setIsLeftSidebarOpen(true);
    setLeftSidebarMotion((motion) =>
      motion === "closed" || motion === "closing" ? "opening" : motion,
    );
    setLeftSidebarMotionExpanded(false);
    writeStoredValue(LEGACY_LEFT_SIDEBAR_OPEN_KEY, "true");
  };
  const handleLeftSidebarClose = () => {
    setIsLeftSidebarOpen(false);
    shouldRestoreSidebarOpenPinFocus.current = true;
    setLeftSidebarMotionExpanded(false);
    setLeftSidebarMotion((motion) => (motion === "closed" ? "closed" : "closing"));
    writeStoredValue(LEGACY_LEFT_SIDEBAR_OPEN_KEY, "false");
  };
  const handleLeftSidebarTransitionEnd = (event: React.TransitionEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (
      !new Set(["border-right-width", "flex-basis", "max-width", "width"]).has(event.propertyName)
    ) {
      return;
    }
    setLeftSidebarMotion((motion) => {
      if (motion === "opening") {
        setLeftSidebarMotionExpanded(true);
        return "open";
      }
      if (motion === "closing") {
        setLeftSidebarMotionExpanded(false);
        return "closed";
      }
      return motion;
    });
  };
  const handleLeftSidebarTabChange = (tab: SidebarTab) => {
    setActiveLeftSidebarTab(tab);
    writeStoredValue(LEGACY_LEFT_SIDEBAR_TAB_KEY, storedSidebarTabValue(tab));
  };
  const handleLeftSidebarRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["workspace", "overview", "sidebar"] });
  };
  const sharedSiteFooterWithStyleProps = (
    <footer data-owner="site-footer">
      <div data-owner="site-footer-inner">
        <span data-owner="site-footer-provider">
          Copyright{" "}
          <Link
            className="yona-author"
            href="https://github.com/yona-projects/yona/blob/master/AUTHORS"
            rel="noreferrer"
            target="_blank"
            to={"https://github.com/yona-projects/yona/blob/master/AUTHORS" as string}
          >
            Yona authors
          </Link>{" "}
          & ©{" "}
          <Link
            href="https://navercorp.com"
            rel="noreferrer"
            target="_blank"
            to={"https://navercorp.com" as string}
          >
            NAVER Corp.
          </Link>{" "}
          &{" "}
          <Link
            className="naver-labs"
            href="https://naverlabs.com/"
            rel="noreferrer"
            target="_blank"
            to={"https://naverlabs.com/" as string}
          >
            NAVER LABS
          </Link>{" "}
          Supported by{" "}
          <Link
            className="naver-cloud-platform"
            href="https://www.ncloud.com/?referer=yona"
            rel="noreferrer"
            target="_blank"
            to={"https://www.ncloud.com/?referer=yona" as string}
          >
            NAVER CLOUD PLATFORM
          </Link>
        </span>
      </div>
    </footer>
  );

  return (
    <div data-sidebar-open={showLeftSidebar ? "true" : "false"} data-owner="framed-site-shell">
      {renderLeftSidebar ? (
        <LegacyFramedSidebar
          activeTab={activeLeftSidebarTab}
          basePath={runtimeConfig.basePath}
          onClose={handleLeftSidebarClose}
          onRefresh={handleLeftSidebarRefresh}
          onTabChange={handleLeftSidebarTabChange}
          runtimeConfig={runtimeConfig}
          session={session ?? {}}
          motion={leftSidebarMotion}
          motionExpanded={leftSidebarMotionExpanded}
          onTransitionEnd={handleLeftSidebarTransitionEnd}
          workspace={navbarWorkspaceQuery.data}
        />
      ) : null}
      <div data-owner="framed-site-main">
        <div className="unsupported hidden">
          <div className="unsupported-inner">
            <p id="unsupported-content" />
          </div>
        </div>
        {shouldRenderSiteAdminAffix ? (
          <div className="site-admin-affix-surface" data-owner="site-admin-affix">
            {t("user.siteAdminLoggedInAffix")} <span>{t("user.siteAdminLoggedInAffix.maxim")}</span>
          </div>
        ) : null}
        <header
          className="gnb-outer"
          data-scoped={hasScopedSearch ? "true" : undefined}
          data-owner="global-gnb-outer"
        >
          <div className="gnb-inner" data-owner="global-gnb-inner">
            {!showLeftSidebar ? (
              <button
                aria-controls="sidebar"
                aria-expanded="false"
                className={"pin"}
                data-owner="global-sidebar-open-pin"
                onClick={handleLeftSidebarOpen}
                ref={globalSidebarOpenPinRef}
                title="Sidebar"
                type="button"
              >
                <i className={"yobicon-arrow-left"} aria-hidden="true" />
                <i className={"yobicon-arrow-right"} aria-hidden="true" />
              </button>
            ) : null}
            <ul data-owner="global-gnb-nav">
              <li data-owner="global-gnb-brand-item">
                <Link
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  className="logo logo-letter"
                  data-owner="global-gnb-brand-link"
                  to="/"
                >
                  Y
                </Link>
              </li>
              {legacyProjectListingEnabled ? (
                <>
                  <li
                    className={activeMenu === "projects" ? "active" : ""}
                    data-owner="global-gnb-project-list-item"
                  >
                    <Link
                      activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                      activeProps={LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS.activeProps}
                      to="/projects"
                      search={LEGACY_PROJECTS_LINK_SEARCH}
                      className={`show-progress-bar${activeMenu === "projects" ? " active" : ""}`}
                      data-owner="global-gnb-project-list-link"
                    >
                      {t("title.list")}
                    </Link>
                  </li>
                  <li className={"divider"} data-owner="global-gnb-project-list-divider" />
                </>
              ) : null}
              {feedbackUrl ? (
                <li data-owner="global-gnb-feedback-item">
                  <Link
                    href={feedbackUrl}
                    to={feedbackUrl}
                    target="_blank"
                    data-owner="global-gnb-feedback-link"
                  >
                    {t("title.yobi.feedback")}
                  </Link>
                </li>
              ) : null}
              <li data-owner="global-gnb-search-item">
                <form
                  action={gnbSearchAction}
                  className={"input-prepend gnb-search-form"}
                  data-owner="global-gnb-search-form"
                  name="gnb-search-form"
                >
                  <input type="hidden" name="searchType" value="auto" />
                  {hasScopedSearch ? (
                    <div
                      className={"btn-group"}
                      data-owner="global-gnb-search-scope"
                      onBlur={handleSearchScopeBlur}
                    >
                      <button
                        aria-expanded={isSearchScopeMenuOpen}
                        aria-haspopup="menu"
                        className={globalGnbSearchScopeToggleClassName}
                        data-owner="global-gnb-search-scope-toggle"
                        id="gnb-search-scope-title"
                        onClick={handleSearchScopeToggleClick}
                        type="button"
                      >
                        {gnbSearchScopeTitle}{" "}
                      </button>
                      <ul
                        className="dropdown-menu flat right"
                        data-owner="global-gnb-search-scope-menu"
                      >
                        {projectSearchAction ? (
                          <li data-owner="global-gnb-search-scope-item">
                            <button onClick={handleSearchScopeItemClick("project")} type="button">
                              {t("search.scope.project")}
                            </button>
                          </li>
                        ) : null}
                        {projectSearchAction && groupSearchAction ? (
                          <li data-owner="global-gnb-search-scope-item">
                            <button onClick={handleSearchScopeItemClick("group")} type="button">
                              {t("search.scope.group")}
                            </button>
                          </li>
                        ) : null}
                        {shouldRenderAllProjectsSearchScope ? (
                          <li data-owner="global-gnb-search-scope-item">
                            <button onClick={handleSearchScopeItemClick("all")} type="button">
                              {t("search.scope.all")}
                            </button>
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}
                  <div
                    className={`search-box${hasScopedSearch ? " select" : ""}`}
                    data-owner="global-gnb-search-box"
                  >
                    {/* oxlint-disable-next-line jsx-a11y/no-access-key -- legacy common/navbar.scala.html exposes accesskey="S". */}
                    <input
                      accessKey="S"
                      autoComplete="off"
                      data-owner="global-gnb-search-input"
                      name="keyword"
                      type="text"
                    />
                    <button data-owner="global-gnb-search-submit" type="submit">
                      <i className={"yobicon-search"} data-owner="global-gnb-search-icon" />
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
                sidenavUsesAdminAffixTop={sidenavUsesAdminAffixTop && shouldRenderSiteAdminAffix}
                workspace={navbarWorkspaceQuery.data}
              />
            )}
          </div>
        </header>
        {children}
        {sharedSiteFooterWithStyleProps}
      </div>
    </div>
  );
}

function LegacyFramedSidebar({
  activeTab,
  basePath,
  motion,
  motionExpanded,
  onClose,
  onRefresh,
  onTabChange,
  onTransitionEnd,
  runtimeConfig,
  session,
  workspace,
}: {
  activeTab: SidebarTab;
  basePath: string;
  motion: LeftSidebarMotion;
  motionExpanded: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onTabChange: (tab: SidebarTab) => void;
  onTransitionEnd: (event: React.TransitionEvent<HTMLElement>) => void;
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
    <aside
      aria-label="Sidebar"
      aria-hidden={motion === "closing" ? true : undefined}
      className="sidebar"
      data-owner="left-sidebar-outer-shell"
      data-sidebar-expanded={motionExpanded ? "true" : "false"}
      data-sidebar-motion={motion}
      inert={motion !== "open"}
      id="sidebar"
      onTransitionEnd={onTransitionEnd}
    >
      <div data-owner="left-sidebar-account-actions">
        <span>
          <Link
            activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
            activeProps={{
              "aria-current": undefined,
              className: undefined,
              "data-status": undefined,
            }}
            data-owner="left-sidebar-profile-identity"
            params={{ user: loginId }}
            search={LEGACY_USER_LINK_SEARCH}
            to="/$user"
          >
            <span>
              <img alt="" src={avatarUrl} />
            </span>{" "}
            <span>{userLabel}</span>{" "}
          </Link>
        </span>
        <span>
          <Link to="/user/editform">{t("userinfo.accountSetting")}</Link>
        </span>{" "}
        <Link reloadDocument to={LEGACY_AUTHENTICATED_LOGOUT_PATH}>
          <span>{t("title.logout")}</span>
        </Link>
        <button
          aria-controls="sidebar"
          aria-expanded="true"
          data-owner="left-sidebar-close-pin"
          onClick={onClose}
          title="Sidebar"
          type="button"
        >
          <i
            aria-hidden="true"
            className={`yobicon-arrow-left ${motion === "closing" ? "closing" : ""}`}
          />
        </button>
      </div>
      <ul data-owner="left-sidebar-tabs">
        <li>
          <button
            aria-pressed={activeTab === "favorite"}
            type="button"
            onClick={() => selectTab("favorite")}
          >
            {t("title.favorite")}
          </button>
        </li>
        <li>
          <button
            aria-pressed={activeTab === "project"}
            type="button"
            onClick={() => selectTab("project")}
          >
            {t("title.project")}
          </button>
        </li>
        <li>
          <button
            aria-pressed={activeTab === "recent"}
            type="button"
            onClick={() => selectTab("recent")}
          >
            {t("title.recently.visited.issue")}
          </button>
        </li>
        <li>
          <button aria-label="Refresh" onClick={onRefresh} type="button">
            <i aria-hidden="true" className={"yobicon-refresh"} />
          </button>
        </li>
      </ul>
      <div data-owner="left-sidebar-tab-panel">
        <div id="left-sidebar-tab-content-list">
          {workspace ? (
            <SidebarTabContent
              activeTab={activeTab}
              idPrefix="left-sidebar"
              isLeftSidebar
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
        <div data-owner="left-sidebar-footer" id="sidebar-bottom">
          Yoram, made by <i aria-hidden="true" className={"yobicon-hearts"} />
        </div>
      ) : null}
    </aside>
  );
}

function AuthenticatedSiteUserMenu({
  basePath,
  runtimeConfig,
  session,
  workspace,
}: {
  basePath: string;
  runtimeConfig: RuntimeConfig;
  session: YoramRecord;
  sidenavUsesAdminAffixTop: boolean;
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
        className={`${isSidebarOpen ? "sidenav sidenav-open" : "sidenav"}`}
        data-owner="authenticated-site-sidenav-shell"
      >
        <div
          className={"span5 right-menu span-hard-wrap"}
          data-owner="authenticated-sidenav-content-frame"
        >
          <div
            className={"row-fluid user-menu-wrap"}
            data-owner="authenticated-sidenav-account-actions"
          >
            <span className={"user-menu"}>
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
            </span>{" "}
            <span className={"user-menu"}>
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
            </span>{" "}
            <Link to={LEGACY_AUTHENTICATED_LOGOUT_PATH} reloadDocument>
              <span className="user-menu logout label">{t("title.logout")}</span>
            </Link>
          </div>
          <ul className={"nav nav-tabs nm"} data-owner="authenticated-sidenav-tabs">
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
              <button type="button" data-toggle="tab" onClick={() => setActiveSidebarTab("recent")}>
                {t("title.recently.visited.issue")}
              </button>
            </li>
          </ul>
          <div className={"tab-content tab-box"} data-owner="authenticated-sidenav-tab-panel">
            <div id="usermenu-tab-content-list" className={"tab-content"}>
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
      <ul className={"gnb-usermenu"} data-owner="authenticated-site-user-menu">
        {navbarCustomLinkName ? (
          <li className={"gnb-usermenu-item"}>
            <Link to={navbarCustomLinkUrl} reloadDocument className={"user-item-btn loggged-in"}>
              {navbarCustomLinkName}
            </Link>
          </li>
        ) : null}
        <li className={"gnb-usermenu-item"} title={`${t("title.shortcut")} (A)`}>
          <Link
            to="/user/issues"
            search={LEGACY_USER_ISSUES_LINK_SEARCH}
            className={"user-item-btn loggged-in"}
          >
            {t("issue.myIssue")}
          </Link>
        </li>
        <li className={"divider"}></li>
        {isSiteAdmin ? (
          <>
            <li className={"gnb-usermenu-item"}>
              <Link
                to="/sites/userList"
                search={LEGACY_SITE_USER_LIST_LINK_SEARCH}
                title={t("menu.siteAdmin")}
                className={"usermenu-icon-button show-progress-bar"}
                data-owner="root-usermenu-site-admin-link"
              >
                <i className="yobicon-wrench" />
              </Link>
            </li>
            <li className={"divider"}></li>
          </>
        ) : null}
        <li
          className={"gnb-usermenu-dropdown sidebar-open-btn"}
          id="sidebar-open-btn"
          data-owner="root-usermenu-sidebar-dropdown"
        >
          <button
            type="button"
            className="gnb-dropdown-toggle"
            title={`${t("user.menu")}, ${t("title.shortcut")} (F)`}
            aria-controls="mySidenav"
            aria-expanded={isSidebarOpen}
            onClick={handleSidebarToggleClick}
          >
            <span className="avatar-wrap smaller">
              <img src={avatarUrl} alt="" />
            </span>{" "}
            <span className={"caret"}></span>
          </button>
        </li>
        <li
          className={`${isCreateMenuOpen ? "gnb-usermenu-dropdown open" : "gnb-usermenu-dropdown"}`}
          data-owner="root-usermenu-create-dropdown"
          onBlur={handleCreateMenuBlur}
        >
          <button
            type="button"
            className="gnb-dropdown-toggle dropdwon-box-btn"
            onClick={handleCreateMenuToggleClick}
          >
            <i className="yobicon-plus"></i> <span className={"caret"}></span>
          </button>
          <ul className="dropdown-menu flat right">
            <li>
              <Link
                to={LEGACY_NOTIFICATION_NEW_ISSUE_PATH}
                href={prefixBasePath(basePath, LEGACY_NOTIFICATION_NEW_ISSUE_PATH)}
              >
                {t("issue.menu.new")}
              </Link>
            </li>
            <li>
              <Link
                to={LEGACY_NOTIFICATION_NEW_MY_ISSUE_PATH}
                href={prefixBasePath(basePath, LEGACY_NOTIFICATION_NEW_MY_ISSUE_PATH)}
              >
                {t("issue.menu.new.mine")}
              </Link>
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

function AnonymousSiteUserMenu() {
  const openRootLoginDialog = useRootLoginDialog();
  const [activeSidebarTab, setActiveSidebarTab] = React.useState<"favorite" | "project" | "recent">(
    "favorite",
  );

  return (
    <>
      <AnonymousSidenav
        activeSidebarTab={activeSidebarTab}
        onSelectSidebarTab={setActiveSidebarTab}
      />
      <AnonymousGnbUserMenu onOpenLoginDialog={openRootLoginDialog} />
    </>
  );
}

function AnonymousSidenav({
  activeSidebarTab,
  onSelectSidebarTab,
}: {
  activeSidebarTab: "favorite" | "project" | "recent";
  onSelectSidebarTab: (tab: "favorite" | "project" | "recent") => void;
}) {
  const { t } = useLegacyMessages();
  return (
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
            <button
              type="button"
              data-owner="anonymous-sidebar-tab-favorite"
              onClick={() => onSelectSidebarTab("favorite")}
            >
              {t("title.favorite")}
            </button>
          </li>
          <li className={`myProjectList${activeSidebarTab === "project" ? " active" : ""}`}>
            <button
              type="button"
              data-owner="anonymous-sidebar-tab-project"
              onClick={() => onSelectSidebarTab("project")}
            >
              {t("title.project")}
            </button>
          </li>
          <li className={`myRecentIssueList${activeSidebarTab === "recent" ? " active" : ""}`}>
            <button
              type="button"
              data-owner="anonymous-sidebar-tab-recent"
              onClick={() => onSelectSidebarTab("recent")}
            >
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
  );
}

function AnonymousGnbUserMenu({ onOpenLoginDialog }: { onOpenLoginDialog: () => boolean }) {
  const { t } = useLegacyMessages();
  return (
    <ul className="gnb-usermenu" data-owner="anonymous-site-user-menu">
      <li className={"gnb-usermenu-item"} id="required-logged-in">
        <Link
          to="/users/loginform"
          search={LEGACY_LOGIN_FORM_LINK_SEARCH}
          className={"user-item-btn"}
          aria-controls="loginDialog"
          aria-haspopup="dialog"
          onClick={(event) => {
            if (onOpenLoginDialog()) {
              event.preventDefault();
            }
          }}
        >
          {t("title.login")}
        </Link>
      </li>
      <li className={"divider"}></li>
      <li>
        <Link to="/users/signupform" data-owner="anonymous-site-signup">
          {t("title.signup")}
        </Link>
      </li>
    </ul>
  );
}

function SidebarTabContent({
  activeTab,
  idPrefix,
  isAuthenticatedSidenav = false,
  isLeftSidebar = false,
  runtimeConfig,
  sessionLoginId,
  workspace,
}: {
  activeTab: SidebarTab;
  idPrefix?: string;
  isAuthenticatedSidenav?: boolean;
  isLeftSidebar?: boolean;
  runtimeConfig: RuntimeConfig;
  sessionLoginId: string;
  workspace: YoramRecord;
}) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const paneClassName = (tab: SidebarTab) => {
    const isActive = activeTab === tab;
    if (isLeftSidebar) {
      const leftSidebarLegacyConsumerClassName = tab === "recent" ? "user-project-list " : "";
      return `${leftSidebarLegacyConsumerClassName}${isActive ? "is-open" : ""}`.trim();
    }
    return `tab-pane user-project-list${isActive ? " active" : ""}`;
  };
  return (
    <>
      <div className={paneClassName("favorite")} id={sidebarDomId(idPrefix, "myOrganizationList")}>
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
      <div className={paneClassName("project")} id={sidebarDomId(idPrefix, "myProjectList")}>
        <SidebarProjectList
          idPrefix={idPrefix}
          onSearchQueryChange={setSearchQuery}
          runtimeConfig={runtimeConfig}
          searchQuery={searchQuery}
          workspace={workspace}
        />
      </div>
      <div className={paneClassName("recent")} id={sidebarDomId(idPrefix, "myRecentIssueList")}>
        <SidebarRecentIssueList
          idPrefix={idPrefix}
          isLeftSidebar={isLeftSidebar}
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

type SidebarFavoriteButtonVariant =
  | "authenticated-direct-project"
  | "authenticated-favorite"
  | "left-direct-project"
  | "left-favorite-organization"
  | "left-favorite-nested-project"
  | "legacy";

function SidebarFavoriteButton({
  initialFavorited,
  label,
  runtimeConfig,
  target,
  variant = "legacy",
}: {
  initialFavorited: boolean;
  label: string;
  runtimeConfig: RuntimeConfig;
  target: SidebarFavoriteTarget;
  variant?: SidebarFavoriteButtonVariant;
}) {
  const usesAuthenticatedDirectProjectOwner = variant === "authenticated-direct-project";
  const usesAuthenticatedFavoriteOwner = variant === "authenticated-favorite";
  const usesLeftDirectProjectOwner = variant === "left-direct-project";
  const usesLeftFavoriteOrganizationOwner = variant === "left-favorite-organization";
  const usesLeftFavoriteNestedProjectOwner = variant === "left-favorite-nested-project";
  const { t } = useLegacyMessages();
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
      window.alert(`Update failed: ${t(error instanceof Error ? error.message : String(error))}`);
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
      className={
        usesLeftFavoriteNestedProjectOwner
          ? undefined
          : usesLeftFavoriteOrganizationOwner
            ? undefined
            : usesLeftDirectProjectOwner
              ? undefined
              : `${target.type === "project" ? "star-project" : "star-org"} flex-item`
      }
      data-owner={
        usesLeftFavoriteNestedProjectOwner
          ? "left-sidebar-favorite-nested-project-rows"
          : usesLeftFavoriteOrganizationOwner
            ? "left-sidebar-favorite-organization-rows"
            : usesLeftDirectProjectOwner
              ? "left-sidebar-direct-project-rows"
              : usesAuthenticatedFavoriteOwner
                ? "authenticated-sidenav-favorite-stars"
                : usesAuthenticatedDirectProjectOwner
                  ? "authenticated-sidenav-direct-project-rows"
                  : undefined
      }
      data-owner-state={
        usesLeftFavoriteNestedProjectOwner ||
        usesLeftFavoriteOrganizationOwner ||
        usesLeftDirectProjectOwner ||
        usesAuthenticatedFavoriteOwner ||
        usesAuthenticatedDirectProjectOwner
          ? `${favoriteMutation.isPending ? "pending-" : ""}${isFavorited ? "starred" : "unstarred"}`
          : undefined
      }
      disabled={favoriteMutation.isPending}
      onClick={toggleFavorite}
      type="button"
    >
      <i
        aria-hidden="true"
        className={
          usesLeftFavoriteNestedProjectOwner
            ? undefined
            : usesLeftFavoriteOrganizationOwner
              ? undefined
              : usesLeftDirectProjectOwner
                ? undefined
                : `${isFavorited ? "star starred material-icons" : "star material-icons"}`
        }
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
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
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
  const isLeftSidebarFavoriteShell = idPrefix === "left-sidebar";
  const favoriteShellOwner = isLeftSidebarFavoriteShell
    ? "left-sidebar-favorite-shell"
    : isAuthenticatedSidenav
      ? "authenticated-sidenav-favorite-shell"
      : undefined;
  if (
    ownProjects.length === 0 &&
    favoriteOrganizations.length === 0 &&
    organizations.length === 0 &&
    directFavoriteProjects.length === 0
  ) {
    return (
      <div
        className={isLeftSidebarFavoriteShell ? undefined : "search-result"}
        data-owner={favoriteShellOwner}
      >
        <div className={isLeftSidebarFavoriteShell ? undefined : "group favorite-shell-group"}>
          <input
            className={
              isLeftSidebarFavoriteShell
                ? undefined
                : "search-input org-search favorite-shell-input"
            }
            type="text"
            autoComplete="off"
            onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
            onBlur={() => setIsSearchFocused(false)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder={t("title.type.name")}
            value={searchQuery}
          />
          <span
            className={isLeftSidebarFavoriteShell ? undefined : "bar favorite-shell-bar"}
          ></span>
        </div>
        <div
          id={sidebarDomId(idPrefix, "organizations")}
          className={
            isLeftSidebarFavoriteShell
              ? undefined
              : "no-result tab-pane user-ul favorite-shell-result"
          }
        >
          {t("title.no.results")}
        </div>
      </div>
    );
  }

  return (
    <div
      className={isLeftSidebarFavoriteShell ? undefined : "search-result"}
      data-owner={favoriteShellOwner}
    >
      <div className={isLeftSidebarFavoriteShell ? undefined : "group favorite-shell-group"}>
        <input
          className={
            isLeftSidebarFavoriteShell ? undefined : "search-input org-search favorite-shell-input"
          }
          type="text"
          autoComplete="off"
          onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
          onBlur={() => setIsSearchFocused(false)}
          onFocus={() => setIsSearchFocused(true)}
          placeholder={t("title.type.name")}
          value={searchQuery}
        />
        <span className={isLeftSidebarFavoriteShell ? undefined : "bar favorite-shell-bar"}></span>
      </div>
      <ul
        className={
          isLeftSidebarFavoriteShell
            ? "favorite-shell-result"
            : "tab-pane user-ul favorite-shell-result"
        }
        id={sidebarDomId(idPrefix, "organizations")}
      >
        {ownProjects.length > 0 && showOwnProjects ? (
          <li
            className={isLeftSidebarFavoriteShell ? undefined : "org-li"}
            data-owner={
              isLeftSidebarFavoriteShell
                ? "left-sidebar-favorite-organization-rows"
                : isAuthenticatedSidenav
                  ? "authenticated-sidenav-favorite-organization-rows"
                  : undefined
            }
          >
            <div
              className={
                isLeftSidebarFavoriteShell ? undefined : "org-list project-flex-container all-orgs"
              }
            >
              <button
                aria-expanded={isOwnProjectsExpanded}
                className={
                  isLeftSidebarFavoriteShell
                    ? undefined
                    : "project-item project-item-container organization-toggle"
                }
                onClick={() => setIsOwnProjectsExpanded((expanded) => !expanded)}
                type="button"
              >
                <div className={isLeftSidebarFavoriteShell ? undefined : "flex-item site-logo"}>
                  <i className="yobicon-angle-right"></i>
                </div>
                <div
                  className={
                    isLeftSidebarFavoriteShell
                      ? undefined
                      : "projectName-owner all-org-names flex-item"
                  }
                >
                  <div
                    className={
                      isLeftSidebarFavoriteShell ? undefined : "project-name org-name flex-item"
                    }
                  >
                    {loginId}
                  </div>
                  <div
                    className={
                      isLeftSidebarFavoriteShell
                        ? undefined
                        : "project-owner flex-item sub-project-counter"
                    }
                  >
                    {ownProjects.length}
                  </div>
                </div>
              </button>
              <div
                className={isLeftSidebarFavoriteShell ? undefined : "star-org flex-item"}
                data-owner={
                  isLeftSidebarFavoriteShell
                    ? "left-sidebar-favorite-organization-rows"
                    : isAuthenticatedSidenav
                      ? "authenticated-sidenav-favorite-stars"
                      : undefined
                }
                data-owner-state={
                  isLeftSidebarFavoriteShell || isAuthenticatedSidenav ? "placeholder" : undefined
                }
              ></div>
            </div>
            <ul className="project-ul">
              {visibleOwnProjects.map((project) => (
                <SidebarAllProjectItem
                  favored={sidebarIsFavorited(project)}
                  key={projectKey(project)}
                  project={project}
                  runtimeConfig={runtimeConfig}
                  showNonFavorite={normalizedQuery !== "" || isOwnProjectsExpanded}
                  variant={
                    isLeftSidebarFavoriteShell
                      ? "left-favorite"
                      : isAuthenticatedSidenav
                        ? "authenticated"
                        : "legacy"
                  }
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
            isLeftSidebar={isLeftSidebarFavoriteShell}
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
            isLeftSidebar={isLeftSidebarFavoriteShell}
            key={organizationKey(organization)}
            normalizedQuery={normalizedQuery}
            organization={organization}
            runtimeConfig={runtimeConfig}
          />
        ))}
        <ul className={isLeftSidebarFavoriteShell ? undefined : "etc-favorites"}></ul>
        {visibleDirectFavorites.map((project) => (
          <SidebarProjectItem
            isAuthenticatedFavoritePane={isAuthenticatedSidenav}
            isLeftSidebar={idPrefix === "left-sidebar"}
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
  isLeftSidebar = false,
  isLast = false,
  normalizedQuery,
  organization,
  runtimeConfig,
}: {
  favored: boolean;
  isAuthenticatedSidenav?: boolean;
  isLeftSidebar?: boolean;
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
      className={isLeftSidebar ? undefined : `org-li${isLast ? " favored" : ""}`}
      data-owner={
        isLeftSidebar
          ? "left-sidebar-favorite-organization-rows"
          : isAuthenticatedSidenav
            ? "authenticated-sidenav-favorite-organization-rows"
            : undefined
      }
    >
      <div className={isLeftSidebar ? undefined : "org-list project-flex-container all-orgs"}>
        <button
          aria-expanded={showNonFavoriteProjects}
          className={
            isLeftSidebar ? undefined : "project-item project-item-container organization-toggle"
          }
          onClick={() => setShowNonFavoriteProjects((expanded) => !expanded)}
          type="button"
        >
          <div className={isLeftSidebar ? undefined : "flex-item site-logo"}>
            <i className="yobicon-angle-right"></i>
          </div>
          <div className={isLeftSidebar ? undefined : "projectName-owner all-org-names flex-item"}>
            <div className={isLeftSidebar ? undefined : "project-name org-name flex-item"}>
              {organizationName}
            </div>
            <div className={isLeftSidebar ? undefined : "project-owner flex-item"}>
              {projectCount}
            </div>
          </div>
        </button>
        <SidebarFavoriteButton
          initialFavorited={favored}
          key={`organization-favorite-${organizationKey(organization)}-${String(favored)}`}
          label={organizationName}
          runtimeConfig={runtimeConfig}
          target={{ organizationName, type: "organization" }}
          variant={
            isLeftSidebar
              ? "left-favorite-organization"
              : isAuthenticatedSidenav
                ? "authenticated-favorite"
                : "legacy"
          }
        />
      </div>
      <ul className="project-ul">
        {visibleProjects.map((project) => (
          <SidebarAllProjectItem
            favored={sidebarIsFavorited(project)}
            key={projectKey(project)}
            project={project}
            runtimeConfig={runtimeConfig}
            showNonFavorite={normalizedQuery !== "" || showNonFavoriteProjects}
            variant={
              isLeftSidebar ? "left-favorite" : isAuthenticatedSidenav ? "authenticated" : "legacy"
            }
          />
        ))}
      </ul>
    </li>
  );
}

function SidebarAllProjectItem({
  favored,
  project,
  runtimeConfig,
  showNonFavorite,
  variant = "legacy",
}: {
  favored: boolean;
  project: YoramRecord;
  runtimeConfig: RuntimeConfig;
  showNonFavorite: boolean;
  variant?: "authenticated" | "left-favorite" | "legacy";
}) {
  const ownerName = valueString(project.ownerName ?? project.owner, "");
  const projectName = valueString(project.projectName ?? project.name, "");
  const overview = valueString(project.overview, "");
  const logoUrl = valueString(project.logoUrl ?? project.projectLogoUrl, "");
  const isPrivate = sidebarProjectIsPrivate(project);
  const isAuthenticatedSidenav = variant === "authenticated";
  const isLeftSidebarFavorite = variant === "left-favorite";

  return (
    <li
      className={
        isLeftSidebarFavorite
          ? undefined
          : `user-li${favored ? " show-always" : showNonFavorite ? "" : " hide"}`
      }
      data-hidden={isLeftSidebarFavorite && !favored && !showNonFavorite ? "true" : undefined}
      data-owner={
        isLeftSidebarFavorite
          ? "left-sidebar-favorite-nested-project-rows"
          : isAuthenticatedSidenav
            ? "authenticated-sidenav-favorite-project-rows"
            : undefined
      }
    >
      <SidebarHoverPopover
        content={isLeftSidebarFavorite ? "" : overview}
        variant={
          isLeftSidebarFavorite
            ? "left-favorite-nested-project"
            : isAuthenticatedSidenav
              ? "authenticated-favorite-project"
              : "legacy"
        }
      >
        <Link
          className={
            isLeftSidebarFavorite
              ? undefined
              : "project-item project-item-container sidebar-project-link sidebar-row-link"
          }
          params={{ ownerName, projectName }}
          to="/$ownerName/$projectName"
        >
          <div
            className={
              isLeftSidebarFavorite ? undefined : `flex-item site-logo all-project-names `.trimEnd()
            }
          >
            <i className={isLeftSidebarFavorite ? undefined : `project-avatar `.trimEnd()}>
              {logoUrl ? (
                <img
                  alt=""
                  className={isLeftSidebarFavorite ? undefined : `logo `.trimEnd()}
                  src={logoUrl}
                />
              ) : (
                <span className="dummy-25px"> </span>
              )}
            </i>
          </div>
          <div
            className={isLeftSidebarFavorite ? undefined : `projectName-owner flex-item `.trimEnd()}
          >
            <div
              className={isLeftSidebarFavorite ? undefined : `project-name flex-item `.trimEnd()}
            >
              {projectName} {isPrivate ? <i className="yobicon-lock yobicon-small"></i> : null}
            </div>
          </div>
        </Link>
        <SidebarFavoriteButton
          initialFavorited={favored}
          key={`project-favorite-${projectKey(project)}-${String(favored)}`}
          label={`${ownerName}/${projectName}`}
          runtimeConfig={runtimeConfig}
          target={{ ownerName, projectName, type: "project" }}
          variant={
            isLeftSidebarFavorite
              ? "left-favorite-nested-project"
              : isAuthenticatedSidenav
                ? "authenticated-favorite"
                : "legacy"
          }
        />
      </SidebarHoverPopover>
    </li>
  );
}

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
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const recentProjects = recordArray(workspace.recentProjects);
  const watchedProjects = recordArray(workspace.watchedProjects);
  const memberProjects = recordArray(workspace.memberProjects);
  const ownProjects = recordArray(workspace.ownProjects);
  const isAuthenticatedSidenav = idPrefix === undefined;
  const isLeftSidebar = idPrefix === "left-sidebar";
  const subtabs = [
    ["recentlyVisited", "title.recently.visited"],
    ["createdByMe", "title.createdByMe"],
    ["watching", "title.watching"],
    ["joinmember", "title.joinmember"],
  ] as const;

  return (
    <div>
      <div className={isLeftSidebar ? undefined : "search-result"}>
        <div
          className={isLeftSidebar ? undefined : "tab-pane myproject-list-wrap"}
          data-owner={
            isLeftSidebar
              ? "left-sidebar-project-shell"
              : isAuthenticatedSidenav
                ? "authenticated-sidenav-project-shell"
                : undefined
          }
        >
          <div className={isLeftSidebar ? undefined : "group"}>
            <input
              className={isLeftSidebar ? undefined : "search-input project-search"}
              type="text"
              id={sidebarDomId(idPrefix, "query")}
              autoComplete="off"
              onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
              onBlur={() => setIsSearchFocused(false)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder={t("title.type.name")}
              value={searchQuery}
            />
            <span className={isLeftSidebar ? undefined : "bar"}></span>
          </div>
          <div
            className={
              isLeftSidebar
                ? undefined
                : `subtab-wrap subtab-group${isAuthenticatedSidenav ? ` ` : ""}`
            }
            data-owner={
              isLeftSidebar
                ? "left-sidebar-project-subtabs"
                : isAuthenticatedSidenav
                  ? "authenticated-sidenav-project-subtabs"
                  : undefined
            }
          >
            <ul
              className={
                isLeftSidebar
                  ? undefined
                  : `nav-subtab unstyled${isAuthenticatedSidenav ? ` ` : ""}`
              }
            >
              {subtabs.map(([subtab, messageKey], index) => (
                <React.Fragment key={subtab}>
                  <li
                    className={
                      isLeftSidebar
                        ? undefined
                        : `${activeSubtab === subtab ? "active" : ""}${
                            isAuthenticatedSidenav ? ` ` : ""
                          }`.trim()
                    }
                  >
                    <button
                      type="button"
                      aria-pressed={isLeftSidebar ? activeSubtab === subtab : undefined}
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
          <div className={isLeftSidebar ? undefined : "tab-content"}>
            <SidebarProjectPane
              active={activeSubtab === "recentlyVisited"}
              id="recentlyVisited"
              idPrefix={idPrefix}
              isLeftSidebar={isLeftSidebar}
              projects={recentProjects}
              runtimeConfig={runtimeConfig}
              searchQuery={searchQuery}
            />
            <SidebarProjectPane
              active={activeSubtab === "watching"}
              id="watching"
              idPrefix={idPrefix}
              isLeftSidebar={isLeftSidebar}
              projects={watchedProjects}
              runtimeConfig={runtimeConfig}
              searchQuery={searchQuery}
            />
            <SidebarProjectPane
              active={activeSubtab === "createdByMe"}
              id="createdByMe"
              idPrefix={idPrefix}
              isLeftSidebar={isLeftSidebar}
              projects={ownProjects}
              runtimeConfig={runtimeConfig}
              searchQuery={searchQuery}
            />
            <SidebarProjectPane
              active={activeSubtab === "joinmember"}
              id="joinmember"
              idPrefix={idPrefix}
              isLeftSidebar={isLeftSidebar}
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
  isLeftSidebar = false,
  projects,
  runtimeConfig,
  searchQuery,
}: {
  active?: boolean;
  id: string;
  idPrefix?: string;
  isLeftSidebar?: boolean;
  projects: YoramRecord[];
  runtimeConfig: RuntimeConfig;
  searchQuery: string;
}) {
  const { t } = useLegacyMessages();
  const paneId = sidebarDomId(idPrefix, id);
  const isAuthenticatedSidenav = idPrefix === undefined;
  const normalizedQuery = normalizedSidebarQuery(searchQuery);
  const visibleProjects = projects.filter((project) =>
    sidebarProjectMatches(project, normalizedQuery),
  );
  if (projects.length === 0) {
    return (
      <div
        data-active={active ? "true" : undefined}
        id={paneId}
        className={
          isLeftSidebar ? undefined : `no-result tab-pane user-ul ${active ? "active" : ""}`
        }
      >
        {t("title.no.results")}
      </div>
    );
  }
  return (
    <ul
      data-active={active ? "true" : undefined}
      className={isLeftSidebar ? undefined : `tab-pane user-ul ${active ? "active" : ""}`}
      id={paneId}
    >
      {visibleProjects.map((project) => (
        <SidebarProjectItem
          isAuthenticatedProjectPane={isAuthenticatedSidenav}
          isLeftSidebar={isLeftSidebar}
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
  isAuthenticatedProjectPane = false,
  isLeftSidebar = false,
  project,
  runtimeConfig,
}: {
  isAuthenticatedFavoritePane?: boolean;
  isAuthenticatedProjectPane?: boolean;
  isLeftSidebar?: boolean;
  project: YoramRecord;
  runtimeConfig: RuntimeConfig;
}) {
  const ownerName = valueString(project.ownerName ?? project.owner, "");
  const projectName = valueString(project.projectName ?? project.name, "");
  const logoUrl = valueString(project.logoUrl ?? project.projectLogoUrl, "");
  const overview = valueString(project.overview, "");
  const isPrivate = sidebarProjectIsPrivate(project);
  const isFavorited = sidebarIsFavorited(project);

  return (
    <li
      className={isLeftSidebar ? undefined : `user-li `}
      data-owner={
        isLeftSidebar
          ? "left-sidebar-direct-project-rows"
          : "authenticated-sidenav-direct-project-rows"
      }
    >
      <SidebarHoverPopover
        content={isLeftSidebar ? "" : overview}
        rootClassName={isLeftSidebar ? undefined : "project-list project-flex-container"}
        variant={isLeftSidebar ? "legacy" : "authenticated-favorite-project"}
      >
        <div className={isLeftSidebar ? undefined : "project-item project-item-container"}>
          {(isAuthenticatedFavoritePane || isAuthenticatedProjectPane) && !isLeftSidebar ? (
            <Link
              aria-label={`Open ${ownerName}/${projectName}`}
              params={{ ownerName, projectName }}
              to="/$ownerName/$projectName"
            >
              <div className={"flex-item site-logo"}>
                <i className={"project-avatar"}>
                  {logoUrl ? (
                    <img alt="" className={"logo"} src={logoUrl} />
                  ) : (
                    <span className="dummy-25px"> </span>
                  )}
                </i>
              </div>
              <div className={"project-name flex-item"}>
                {projectName} {isPrivate ? <i className="yobicon-lock yobicon-small"></i> : null}
              </div>
            </Link>
          ) : (
            <>
              <div className={isLeftSidebar ? undefined : `flex-item site-logo `}>
                <Link
                  aria-label={`Open ${ownerName}/${projectName}`}
                  params={{ ownerName, projectName }}
                  to="/$ownerName/$projectName"
                >
                  <i className={isLeftSidebar ? undefined : `project-avatar `}>
                    {logoUrl ? (
                      <img alt="" className={isLeftSidebar ? undefined : `logo `} src={logoUrl} />
                    ) : (
                      <span className={isLeftSidebar ? undefined : "dummy-25px"}> </span>
                    )}
                  </i>
                </Link>
              </div>
            </>
          )}
          <div className={isLeftSidebar ? undefined : `projectName-owner flex-item `}>
            {!isAuthenticatedFavoritePane && !isAuthenticatedProjectPane ? (
              <div className={isLeftSidebar ? undefined : `project-name flex-item `}>
                <Link params={{ ownerName, projectName }} to="/$ownerName/$projectName">
                  {projectName} {isPrivate ? <i className="yobicon-lock yobicon-small"></i> : null}
                </Link>
              </div>
            ) : null}
            <div className={isLeftSidebar ? undefined : `project-owner flex-item `}>
              <Link params={{ user: ownerName }} to="/$user">
                {ownerName}
              </Link>
            </div>
          </div>
        </div>
        <SidebarFavoriteButton
          initialFavorited={isFavorited}
          key={`project-favorite-${projectKey(project)}-${String(isFavorited)}`}
          label={`${ownerName}/${projectName}`}
          runtimeConfig={runtimeConfig}
          target={{ ownerName, projectName, type: "project" }}
          variant={
            isLeftSidebar
              ? "left-direct-project"
              : isAuthenticatedFavoritePane
                ? "authenticated-favorite"
                : "authenticated-direct-project"
          }
        />
      </SidebarHoverPopover>
    </li>
  );
}

function SidebarRecentIssueList({
  idPrefix,
  isLeftSidebar,
  onSearchQueryChange,
  searchQuery,
  workspace,
}: {
  idPrefix?: string;
  isLeftSidebar: boolean;
  onSearchQueryChange: (query: string) => void;
  searchQuery: string;
  workspace: YoramRecord;
}) {
  const { t } = useLegacyMessages();
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const issues = recordArray(workspace.issueItems);
  const normalizedQuery = normalizedSidebarQuery(searchQuery);
  const visibleIssues = issues.filter((issue) => sidebarIssueMatches(issue, normalizedQuery));
  const isAuthenticatedSidenav = !isLeftSidebar && idPrefix === undefined;

  return (
    <div>
      <div className="search-result">
        <div
          className="tab-pane myproject-list-wrap"
          data-owner={
            isAuthenticatedSidenav
              ? "authenticated-sidenav-recent-shell"
              : isLeftSidebar
                ? "left-sidebar-recent-shell"
                : undefined
          }
        >
          <div className={"group recent-shell-group"}>
            <input
              className={"search-input project-search recent-shell-input"}
              type="text"
              id={sidebarDomId(idPrefix, "recent-issue-query")}
              autoComplete="off"
              onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
              onBlur={() => setIsSearchFocused(false)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder={t("title.type.name")}
              value={searchQuery}
            />
            <span className={"bar recent-shell-bar"}></span>
          </div>
          <div className={"tab-content recent-shell-content"}>
            {issues.length === 0 ? (
              <div
                id={sidebarDomId(idPrefix, "recentlyVisitedIssues")}
                className={
                  "no-result tab-pane user-ul active recent-shell-result recent-shell-empty-result"
                }
              >
                {t("title.no.results")}
              </div>
            ) : (
              <ul
                className={"tab-pane user-ul active recent-shell-result"}
                id={sidebarDomId(idPrefix, "recentlyVisitedIssues")}
              >
                {visibleIssues.map((issue) => (
                  <SidebarRecentIssueItem
                    isAuthenticatedSidenav={isAuthenticatedSidenav}
                    isLeftSidebar={isLeftSidebar}
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

function SidebarRecentIssueItem({
  isAuthenticatedSidenav,
  isLeftSidebar,
  issue,
}: {
  isAuthenticatedSidenav: boolean;
  isLeftSidebar: boolean;
  issue: YoramRecord;
}) {
  const ownerName = valueString(issue.ownerName ?? issue.owner_name ?? issue.owner, "");
  const projectName = valueString(issue.projectName ?? issue.project_name ?? issue.project, "");
  const issueNumber = valueString(issue.issueNumber ?? issue.issue_number ?? issue.number, "");
  const issueNumberLabel = issueNumber ? `${projectName} #${issueNumber}` : "";
  const title = valueString(issue.title, "");
  const issueContent = (
    <div className={"issue-item projectName-owner flex-item"}>
      <div className={"issue-title-start"}>-</div>
      <div className={"issue-title flex-item"}>{title}</div>
    </div>
  );

  return (
    <li
      className={"user-li"}
      data-owner={
        isAuthenticatedSidenav
          ? "authenticated-sidenav-recent-issue-rows"
          : isLeftSidebar
            ? "left-sidebar-recent-issue-rows"
            : undefined
      }
    >
      <SidebarHoverPopover
        content={issueNumberLabel}
        variant={
          isAuthenticatedSidenav
            ? "authenticated-recent-issue"
            : isLeftSidebar
              ? "left-recent-issue"
              : "legacy"
        }
      >
        {isAuthenticatedSidenav ? (
          <div className={"project-item project-item-container"}>
            <Link
              params={{ issueNumber, ownerName, projectName }}
              to="/$ownerName/$projectName/issue/$issueNumber"
            >
              {issueContent}
            </Link>
          </div>
        ) : (
          <Link
            className={"project-item project-item-container sidebar-row-link"}
            params={{ issueNumber, ownerName, projectName }}
            to="/$ownerName/$projectName/issue/$issueNumber"
          >
            {issueContent}
          </Link>
        )}
      </SidebarHoverPopover>
    </li>
  );
}

function SidebarHoverPopover({
  children,
  content,
  rootClassName,
  variant = "legacy",
}: {
  children: React.ReactNode;
  content: string;
  rootClassName?: string;
  variant?:
    | "authenticated-favorite-project"
    | "authenticated-recent-issue"
    | "left-favorite-nested-project"
    | "left-recent-issue"
    | "legacy";
}) {
  const [isVisible, setIsVisible] = React.useState(false);
  const showPopover = () => setIsVisible(Boolean(content));
  const hidePopover = () => setIsVisible(false);
  const isAuthenticatedFavoriteProjectRow = variant === "authenticated-favorite-project";
  const isAuthenticatedRecentIssueRow = variant === "authenticated-recent-issue";
  const isLeftSidebarFavoriteNestedProjectRow = variant === "left-favorite-nested-project";
  const isLeftSidebarRecentIssueRow = variant === "left-recent-issue";
  const ownsPopoverPresentation = variant !== "legacy";

  return (
    <div
      className={
        rootClassName ??
        (isLeftSidebarFavoriteNestedProjectRow ? undefined : "project-list project-flex-container")
      }
      onMouseEnter={showPopover}
      onMouseLeave={hidePopover}
      {...(isVisible && !ownsPopoverPresentation ? {} : {})}
    >
      {children}
      {isVisible ? (
        <div
          className={`${ownsPopoverPresentation ? "" : "popover right"}`}
          data-owner={
            isAuthenticatedFavoriteProjectRow
              ? "authenticated-sidenav-favorite-project-popover"
              : isAuthenticatedRecentIssueRow
                ? "authenticated-sidenav-recent-issue-popover"
                : isLeftSidebarFavoriteNestedProjectRow
                  ? "left-sidebar-favorite-nested-project-popover"
                  : isLeftSidebarRecentIssueRow
                    ? "left-sidebar-recent-issue-popover"
                    : undefined
          }
          role="tooltip"
          {...(ownsPopoverPresentation ? {} : {})}
          data-part={ownsPopoverPresentation ? undefined : "home-sidebar-legacy-popover"}
        >
          <div className={`${ownsPopoverPresentation ? "" : "arrow"}`} />
          <div className={`${ownsPopoverPresentation ? "" : "popover-content"}`}>{content}</div>
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
