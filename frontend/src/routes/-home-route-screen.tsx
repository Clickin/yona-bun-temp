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
import { globalBreakpoints, globalColors } from "../theme.stylex";
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
              className={`ybtn ${stylex.props(authenticatedHomeNotificationPaginationStyles.button).className}`}
              data-stylex-owner="authenticated-home-notification-pagination"
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
        <div
          {...stylex.props(authenticatedHomePageWrapStyles.outer)}
          data-stylex-owner="authenticated-home-page-wrap-outer"
        >
          <div
            {...stylex.props(authenticatedHomePageWrapStyles.inner)}
            data-stylex-owner="authenticated-home-page-wrap"
          >
            <div
              {...stylex.props(
                authenticatedHomeIntroGuideStyles.outer,
                !isIntroVisible && authenticatedHomeIntroGuideStyles.hidden,
              )}
              data-stylex-owner="authenticated-home-intro-guide"
            >
              <h3 {...stylex.props(authenticatedHomeIntroGuideStyles.heading)}>
                <span {...stylex.props(authenticatedHomeIntroGuideStyles.headingText)}>
                  {`${t("app.welcome", { args: [siteName] })} - ${t("app.description")}`}
                </span>
              </h3>
              <table
                className={`table ${stylex.props(authenticatedHomeIntroGuideStyles.table).className}`}
                data-stylex-owner="authenticated-home-intro-guide-table"
              >
                <tbody>
                  <tr>
                    <td {...stylex.props(authenticatedHomeIntroGuideStyles.cell)}>
                      <Link
                        to={LEGACY_GUIDE_NEW_PROJECT_PATH}
                        reloadDocument
                        className={`ybtn ybtn-success ${stylex.props(authenticatedHomeIntroGuideStyles.link).className}`}
                      >
                        {t("button.newProject")}
                      </Link>
                    </td>
                    <td {...stylex.props(authenticatedHomeIntroGuideStyles.cell)}>
                      {t("app.welcome.project.desc")}
                    </td>
                  </tr>
                  <tr>
                    <td {...stylex.props(authenticatedHomeIntroGuideStyles.cell)}>
                      <Link
                        to="/organizations/new"
                        className={`ybtn ybtn-success ${stylex.props(authenticatedHomeIntroGuideStyles.link).className}`}
                      >
                        {t("title.newOrganization")}
                      </Link>
                    </td>
                    <td {...stylex.props(authenticatedHomeIntroGuideStyles.cell)}>
                      {t("app.welcome.group.desc")}
                    </td>
                  </tr>
                  <tr>
                    <td {...stylex.props(authenticatedHomeIntroGuideStyles.cell)}>
                      <Link
                        to="/projects"
                        activeProps={LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS.activeProps}
                        className={`ybtn ybtn-success ${stylex.props(authenticatedHomeIntroGuideStyles.link).className}`}
                      >
                        {t("title.projectList")}
                      </Link>
                    </td>
                    <td {...stylex.props(authenticatedHomeIntroGuideStyles.cell)}>
                      {t("app.welcome.searchProject.desc")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div
              {...stylex.props(authenticatedHomeIntroGuideStyles.toggle)}
              data-stylex-owner="authenticated-home-intro-guide-toggle"
            >
              <button
                className={`btn-transparent ${stylex.props(authenticatedHomeIntroGuideStyles.toggleButton).className}`}
                id="toggleIntro"
                type="button"
                onClick={toggleIntro}
              >
                <i
                  className={`yobicon-resizev ${stylex.props(authenticatedHomeIntroGuideStyles.icon).className}`}
                />
              </button>
            </div>
            <div
              {...stylex.props(authenticatedHomeContentGridStyles.page)}
              data-stylex-owner="authenticated-home-content-page"
            >
              <div
                {...stylex.props(authenticatedHomeContentGridStyles.grid)}
                data-stylex-owner="authenticated-home-content-grid"
              >
                <div
                  {...stylex.props(authenticatedHomeContentGridStyles.main)}
                  data-stylex-owner="authenticated-home-main-stream"
                >
                  <ul
                    {...stylex.props(authenticatedHomeSeriesTabStyles.list)}
                    data-stylex-owner="authenticated-home-series-tabs"
                  >
                    <li
                      {...stylex.props(authenticatedHomeSeriesTabStyles.item)}
                      data-stylex-owner="authenticated-home-series-tab-item"
                    >
                      <Link
                        {...stylex.props(
                          authenticatedHomeSeriesTabStyles.link,
                          authenticatedHomeSeriesTabStyles.activeLink,
                        )}
                        {...LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS}
                        data-stylex-owner="authenticated-home-series-tab-link"
                        search={{ legacyTab: undefined }}
                        to="/notifications"
                      >
                        {t("notification")}
                      </Link>
                    </li>
                    <li
                      {...stylex.props(authenticatedHomeSeriesTabStyles.item)}
                      data-stylex-owner="authenticated-home-series-tab-item"
                    >
                      <Link
                        {...stylex.props(authenticatedHomeSeriesTabStyles.link)}
                        {...LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS}
                        data-stylex-owner="authenticated-home-series-tab-link"
                        to="/user/issues"
                        search={LEGACY_USER_ISSUES_LINK_SEARCH}
                      >
                        {t("issue.myIssue")}
                      </Link>
                    </li>
                    <li
                      {...stylex.props(authenticatedHomeSeriesTabStyles.item)}
                      data-stylex-owner="authenticated-home-series-tab-item"
                    >
                      <Link
                        {...stylex.props(authenticatedHomeSeriesTabStyles.link)}
                        {...LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS}
                        data-stylex-owner="authenticated-home-series-tab-link"
                        to="/user/files"
                      >
                        {t("user.files")}
                      </Link>
                    </li>
                    <li
                      {...stylex.props(
                        authenticatedHomeSeriesTabStyles.item,
                        authenticatedHomeSeriesTabStyles.actionItem,
                      )}
                      data-stylex-owner="authenticated-home-series-tab-action-item"
                    >
                      {shouldShowDefaultLandingButton ? (
                        <>
                          <button
                            {...stylex.props(
                              authenticatedHomeDefaultLoginActionStyles.button,
                              isDefaultLandingButtonHidden &&
                                authenticatedHomeDefaultLoginActionStyles.hidden,
                            )}
                            id="setDefaultLoginPage"
                            type="button"
                            data-stylex-owner="authenticated-home-default-login-action"
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
                              {...stylex.props(authenticatedHomeDefaultLoginActionStyles.popover)}
                              data-stylex-owner="authenticated-home-default-login-popover"
                              role="tooltip"
                            >
                              <div
                                {...stylex.props(authenticatedHomeDefaultLoginActionStyles.arrow)}
                                data-stylex-owner="authenticated-home-default-login-popover-arrow"
                              />
                              <h3
                                {...stylex.props(authenticatedHomeDefaultLoginActionStyles.title)}
                                data-stylex-owner="authenticated-home-default-login-popover-title"
                              >
                                {defaultLandingButtonTitle}
                              </h3>
                              <div
                                {...stylex.props(authenticatedHomeDefaultLoginActionStyles.content)}
                                data-stylex-owner="authenticated-home-default-login-popover-content"
                              >
                                {defaultLandingButtonContent}
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </li>
                  </ul>
                  <ul
                    {...stylex.props(authenticatedHomeNotificationStyles.list)}
                    data-stylex-owner="authenticated-home-notification-list"
                  >
                    {notificationItems.length === 0 ? (
                      <div
                        {...stylex.props(authenticatedHomeNotificationStyles.empty)}
                        data-stylex-owner="authenticated-home-notification-empty"
                      >
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
                          className={`ybtn ${stylex.props(authenticatedHomeNotificationPaginationStyles.button).className}`}
                          data-stylex-owner="authenticated-home-notification-pagination"
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
                  {...stylex.props(authenticatedHomeContentGridStyles.rail)}
                  data-stylex-owner="authenticated-home-index-rail"
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
  const notificationTypeTokens = notification.typeIcon.split(" ");
  const notificationGlyph = notificationTypeTokens[0] || "megaphone";
  const isUpdated =
    notification.eventType === "ISSUE_BODY_CHANGED" || notification.eventType === "COMMENT_UPDATED";
  const avatarClassName = `avatar-wrap smaller ${stylex.props(authenticatedHomeNotificationRowStyles.avatar).className}`;
  const authorClassName = stylex.props(authenticatedHomeNotificationRowStyles.author).className;

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
    <li
      {...stylex.props(authenticatedHomeNotificationRowStyles.row)}
      data-stylex-owner="authenticated-home-notification-row"
    >
      <div
        {...stylex.props(
          authenticatedHomeNotificationRowStyles.type,
          isUpdated && authenticatedHomeNotificationRowStyles.updated,
          !isUpdated &&
            notificationTypeTokens.includes("closed") &&
            authenticatedHomeNotificationRowStyles.closed,
          !isUpdated &&
            notificationTypeTokens.includes("changed") &&
            authenticatedHomeNotificationRowStyles.changed,
          !isUpdated &&
            notificationTypeTokens.includes("rejected") &&
            authenticatedHomeNotificationRowStyles.rejected,
          !isUpdated &&
            notificationTypeTokens.includes("warning") &&
            authenticatedHomeNotificationRowStyles.warning,
          !isUpdated &&
            notificationTypeTokens.includes("merged") &&
            authenticatedHomeNotificationRowStyles.merged,
          !isUpdated &&
            notificationTypeTokens.includes("comment2") &&
            authenticatedHomeNotificationRowStyles.comment,
          !isUpdated &&
            notificationTypeTokens.includes("info") &&
            authenticatedHomeNotificationRowStyles.info,
          !isUpdated &&
            notificationTypeTokens.includes("list-alt") &&
            authenticatedHomeNotificationRowStyles.list,
          !isUpdated &&
            notificationTypeTokens.includes("ellipsis-horizontal") &&
            authenticatedHomeNotificationRowStyles.ellipsis,
        )}
        data-stylex-owner="authenticated-home-notification-type"
      >
        {isUpdated ? "Edit" : <i className={`yobicon-${notificationGlyph}`} />}
      </div>
      {/* oxlint-disable jsx-a11y/click-events-have-key-events -- legacy partial_notifications.scala.html uses a clickable plain div here. */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- legacy partial_notifications.scala.html uses a clickable plain div here. */}
      <div
        {...stylex.props(authenticatedHomeNotificationRowStyles.desc)}
        data-stylex-owner="authenticated-home-notification-desc"
        onClick={handleLearnMoreClick}
      >
        <div data-stylex-owner="authenticated-home-notification-info">
          <div
            {...stylex.props(authenticatedHomeNotificationRowStyles.title)}
            data-stylex-owner="authenticated-home-notification-title"
          >
            {notification.targetHref ? (
              <Link to={notification.targetHref} {...LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS}>
                {notification.targetTitle}
              </Link>
            ) : (
              notification.targetTitle
            )}
          </div>
          <div
            {...stylex.props(
              authenticatedHomeNotificationRowStyles.messageWrap,
              !isExpanded && authenticatedHomeNotificationRowStyles.collapsedMessage,
            )}
            data-stylex-owner="authenticated-home-notification-message-wrap"
            id={`message-${notification.id}`}
            ref={messageWrapRef}
            style={expandedMinHeight ? { minHeight: expandedMinHeight } : undefined}
          >
            <div
              {...stylex.props(authenticatedHomeNotificationRowStyles.message)}
              data-stylex-owner="authenticated-home-notification-message"
              ref={messageRef}
            >
              <LegacyNotificationMessage message={notification.message} />
            </div>
          </div>
          {hasOverflow ? (
            <div
              {...stylex.props(
                authenticatedHomeNotificationRowStyles.more,
                isExpanded && authenticatedHomeNotificationRowStyles.hiddenMore,
              )}
              data-stylex-owner="authenticated-home-notification-more"
            >
              ...
            </div>
          ) : null}
          <div
            {...stylex.props(authenticatedHomeNotificationRowStyles.meta)}
            data-stylex-owner="authenticated-home-notification-meta"
          >
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
              className={authorClassName}
              data-stylex-owner="authenticated-home-notification-author"
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              activeProps={{
                "aria-current": undefined,
                className: authorClassName,
                "data-status": undefined,
              }}
            >
              {notification.actor.displayName}
            </Link>
            @{notification.actor.loginId}
            <span
              {...stylex.props(authenticatedHomeNotificationRowStyles.ago)}
              data-stylex-owner="authenticated-home-notification-ago"
              title={notification.createdAt}
            >
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

const globalGnbSearchSubmitStyles = stylex.create({
  submit: {
    appearance: globalColors.globalGnbSearchSubmitAppearance,
    backgroundColor: globalColors.globalGnbSearchSubmitBackground,
    borderColor: globalColors.globalGnbSearchSubmitColor,
    borderStyle: globalColors.globalGnbSearchSubmitBorderStyle,
    borderWidth: globalColors.globalGnbSearchSubmitZero,
    boxShadow: globalColors.globalGnbSearchSubmitShadow,
    boxSizing: globalColors.globalGnbSearchSubmitBoxSizing,
    color: globalColors.globalGnbSearchSubmitColor,
    cursor: globalColors.globalGnbSearchSubmitCursor,
    display: globalColors.globalGnbSearchSubmitDisplay,
    fontFamily: globalColors.globalGnbSearchSubmitFontFamily,
    fontSize: globalColors.globalGnbSearchSubmitFontSize,
    fontWeight: globalColors.globalGnbSearchSubmitFontWeight,
    lineHeight: globalColors.globalGnbSearchSubmitLineHeight,
    margin: globalColors.globalGnbSearchSubmitMargin,
    minHeight: globalColors.globalGnbSearchSubmitMinHeight,
    outlineStyle: globalColors.globalGnbSearchSubmitOutlineStyle,
    outlineWidth: globalColors.globalGnbSearchSubmitZero,
    padding: globalColors.globalGnbSearchSubmitPadding,
    textAlign: globalColors.globalGnbSearchSubmitTextAlign,
    verticalAlign: globalColors.globalGnbSearchSubmitVerticalAlign,
  },
});

const globalGnbSearchInputStyles = stylex.create({
  input: {
    backgroundColor: globalColors.globalGnbSearchInputBackground,
    borderBottomColor: {
      default: globalColors.globalGnbSearchInputColor,
      ":focus": globalColors.globalGnbSearchInputFocusBorderColor,
    },
    borderBottomLeftRadius: globalColors.globalGnbSearchInputRadius,
    borderBottomRightRadius: globalColors.globalGnbSearchInputRadius,
    borderBottomStyle: globalColors.globalGnbSearchInputBorderStyle,
    borderBottomWidth: globalColors.globalGnbSearchInputZero,
    borderLeftColor: {
      default: globalColors.globalGnbSearchInputColor,
      ":focus": globalColors.globalGnbSearchInputFocusBorderColor,
    },
    borderLeftStyle: globalColors.globalGnbSearchInputBorderStyle,
    borderLeftWidth: globalColors.globalGnbSearchInputZero,
    borderRightColor: {
      default: globalColors.globalGnbSearchInputColor,
      ":focus": globalColors.globalGnbSearchInputFocusBorderColor,
    },
    borderRightStyle: globalColors.globalGnbSearchInputBorderStyle,
    borderRightWidth: globalColors.globalGnbSearchInputZero,
    borderTopColor: {
      default: globalColors.globalGnbSearchInputColor,
      ":focus": globalColors.globalGnbSearchInputFocusBorderColor,
    },
    borderTopLeftRadius: globalColors.globalGnbSearchInputRadius,
    borderTopRightRadius: globalColors.globalGnbSearchInputRadius,
    borderTopStyle: globalColors.globalGnbSearchInputBorderStyle,
    borderTopWidth: globalColors.globalGnbSearchInputZero,
    boxShadow: globalColors.globalGnbSearchInputShadow,
    boxSizing: globalColors.globalGnbSearchInputBoxSizing,
    color: globalColors.globalGnbSearchInputColor,
    display: globalColors.globalGnbSearchInputDisplay,
    fontFamily: globalColors.globalGnbSearchInputFontFamily,
    fontSize: globalColors.globalGnbSearchInputFontSize,
    fontWeight: globalColors.globalGnbSearchInputFontWeight,
    height: globalColors.globalGnbSearchInputHeight,
    lineHeight: globalColors.globalGnbSearchInputLineHeight,
    marginBottom: globalColors.globalGnbSearchInputMarginBottom,
    marginLeft: globalColors.globalGnbSearchInputZero,
    marginRight: globalColors.globalGnbSearchInputZero,
    marginTop: globalColors.globalGnbSearchInputZero,
    maxWidth: {
      default: globalColors.globalGnbSearchInputMaxWidth,
      ":focus": globalColors.globalGnbSearchInputFocusMaxWidth,
    },
    minHeight: globalColors.globalGnbSearchInputMinHeight,
    outlineStyle: globalColors.globalGnbSearchInputOutlineStyle,
    outlineWidth: globalColors.globalGnbSearchInputZero,
    paddingBottom: globalColors.globalGnbSearchInputPaddingBlock,
    paddingLeft: globalColors.globalGnbSearchInputPaddingInline,
    paddingRight: globalColors.globalGnbSearchInputPaddingInline,
    paddingTop: globalColors.globalGnbSearchInputPaddingBlock,
    position: globalColors.globalGnbSearchInputPosition,
    transitionDuration: globalColors.globalGnbSearchInputTransitionDuration,
    transitionProperty: globalColors.globalGnbSearchInputTransitionProperty,
    transitionTimingFunction: globalColors.globalGnbSearchInputTransitionTiming,
    verticalAlign: globalColors.globalGnbSearchInputVerticalAlign,
    width: {
      default: globalColors.globalGnbSearchInputWidth,
      ":focus": globalColors.globalGnbSearchInputFocusWidth,
    },
    zIndex: {
      default: globalColors.globalGnbSearchInputZIndex,
      ":focus": globalColors.globalGnbSearchInputFocusZIndex,
    },
  },
});

const globalGnbSearchBoxStyles = stylex.create({
  box: {
    backgroundColor: globalColors.globalGnbSearchBoxSurface,
    borderBottomLeftRadius: globalColors.globalGnbSearchBoxRadius,
    borderBottomRightRadius: globalColors.globalGnbSearchBoxRadius,
    borderStyle: globalColors.globalGnbSearchBoxBorderStyle,
    borderTopLeftRadius: globalColors.globalGnbSearchBoxRadius,
    borderTopRightRadius: globalColors.globalGnbSearchBoxRadius,
    borderWidth: globalColors.globalGnbSearchBoxZero,
    boxSizing: globalColors.globalGnbSearchBoxBoxSizing,
    display: globalColors.globalGnbSearchBoxDisplay,
    height: globalColors.globalGnbSearchBoxHeight,
    verticalAlign: globalColors.globalGnbSearchBoxVerticalAlign,
  },
  scoped: {
    borderBottomLeftRadius: globalColors.globalGnbSearchBoxZero,
    borderBottomRightRadius: globalColors.globalGnbSearchBoxRadius,
    borderTopLeftRadius: globalColors.globalGnbSearchBoxZero,
    borderTopRightRadius: globalColors.globalGnbSearchBoxRadius,
  },
});

const globalGnbSearchScopeStyles = stylex.create({
  scope: {
    display: globalColors.globalGnbSearchScopeDisplay,
    fontSize: globalColors.globalGnbSearchScopeFontSize,
    position: globalColors.globalGnbSearchScopePosition,
    verticalAlign: globalColors.globalGnbSearchScopeVerticalAlign,
    whiteSpace: globalColors.globalGnbSearchScopeWhiteSpace,
  },
  toggle: {
    appearance: globalColors.globalGnbSearchScopeToggleAppearance,
    backgroundColor: {
      default: globalColors.globalGnbSearchScopeToggleSurface,
      ":hover": globalColors.globalGnbSearchScopeToggleInteractionSurface,
      ":focus": globalColors.globalGnbSearchScopeToggleInteractionSurface,
      ":active": globalColors.globalGnbSearchScopeToggleInteractionSurface,
    },
    borderBottomColor: {
      default: globalColors.globalGnbSearchScopeToggleBorder,
      ":hover": globalColors.globalGnbSearchScopeToggleInteractionBorder,
      ":focus": globalColors.globalGnbSearchScopeToggleInteractionBorder,
      ":active": globalColors.globalGnbSearchScopeToggleInteractionBorder,
    },
    borderBottomStyle: globalColors.globalGnbSearchScopeToggleBorderStyle,
    borderBottomWidth: globalColors.globalGnbSearchScopeToggleBorderWidth,
    borderLeftColor: {
      default: globalColors.globalGnbSearchScopeToggleBorder,
      ":hover": globalColors.globalGnbSearchScopeToggleInteractionBorder,
      ":focus": globalColors.globalGnbSearchScopeToggleInteractionBorder,
      ":active": globalColors.globalGnbSearchScopeToggleInteractionBorder,
    },
    borderLeftStyle: globalColors.globalGnbSearchScopeToggleBorderStyle,
    borderLeftWidth: globalColors.globalGnbSearchScopeToggleBorderWidth,
    borderRadius: globalColors.globalGnbSearchScopeToggleRadius,
    borderRightColor: {
      default: globalColors.globalGnbSearchScopeToggleBorder,
      ":hover": globalColors.globalGnbSearchScopeToggleInteractionBorder,
      ":focus": globalColors.globalGnbSearchScopeToggleInteractionBorder,
      ":active": globalColors.globalGnbSearchScopeToggleInteractionBorder,
    },
    borderRightStyle: globalColors.globalGnbSearchScopeToggleBorderStyle,
    borderRightWidth: globalColors.globalGnbSearchScopeToggleBorderWidth,
    borderTopColor: {
      default: globalColors.globalGnbSearchScopeToggleBorder,
      ":hover": globalColors.globalGnbSearchScopeToggleInteractionBorder,
      ":focus": globalColors.globalGnbSearchScopeToggleInteractionBorder,
      ":active": globalColors.globalGnbSearchScopeToggleInteractionBorder,
    },
    borderTopStyle: globalColors.globalGnbSearchScopeToggleBorderStyle,
    borderTopWidth: globalColors.globalGnbSearchScopeToggleBorderWidth,
    boxShadow: globalColors.globalGnbSearchScopeToggleShadow,
    boxSizing: globalColors.globalGnbSearchScopeToggleBoxSizing,
    color: {
      default: globalColors.globalGnbSearchScopeToggleText,
      ":hover": globalColors.globalGnbSearchScopeToggleInteractionText,
      ":focus": globalColors.globalGnbSearchScopeToggleInteractionText,
      ":active": globalColors.globalGnbSearchScopeToggleInteractionText,
    },
    cursor: globalColors.globalGnbSearchScopeToggleCursor,
    display: globalColors.globalGnbSearchScopeToggleDisplay,
    fontFamily: globalColors.globalGnbSearchScopeToggleFontFamily,
    fontSize: globalColors.globalGnbSearchScopeToggleFontSize,
    lineHeight: globalColors.globalGnbSearchScopeToggleLineHeight,
    margin: globalColors.globalGnbSearchScopeZero,
    outline: globalColors.globalGnbSearchScopeToggleOutline,
    paddingBlock: globalColors.globalGnbSearchScopeTogglePaddingBlock,
    paddingInline: globalColors.globalGnbSearchScopeTogglePaddingInline,
    position: globalColors.globalGnbSearchScopeTogglePosition,
    textAlign: globalColors.globalGnbSearchScopeToggleTextAlign,
    textDecoration: globalColors.globalGnbSearchScopeToggleTextDecoration,
    transitionDuration: globalColors.globalGnbSearchScopeToggleTransitionDuration,
    transitionProperty: globalColors.globalGnbSearchScopeToggleTransitionProperty,
    transitionTimingFunction: globalColors.globalGnbSearchScopeToggleTransitionTiming,
    verticalAlign: globalColors.globalGnbSearchScopeToggleVerticalAlign,
    whiteSpace: globalColors.globalGnbSearchScopeToggleWhiteSpace,
    zIndex: globalColors.globalGnbSearchScopeToggleZIndex,
    "::after": {
      borderBottomColor: globalColors.globalGnbSearchScopeTransparent,
      borderBottomStyle: globalColors.globalGnbSearchScopeToggleBorderStyle,
      borderBottomWidth: globalColors.globalGnbSearchScopeZero,
      borderLeftColor: globalColors.globalGnbSearchScopeTransparent,
      borderLeftStyle: globalColors.globalGnbSearchScopeToggleBorderStyle,
      borderLeftWidth: globalColors.globalGnbSearchScopeCaretSize,
      borderRightColor: globalColors.globalGnbSearchScopeTransparent,
      borderRightStyle: globalColors.globalGnbSearchScopeToggleBorderStyle,
      borderRightWidth: globalColors.globalGnbSearchScopeCaretSize,
      borderTopColor: globalColors.globalGnbSearchScopeCaretColor,
      borderTopStyle: globalColors.globalGnbSearchScopeToggleBorderStyle,
      borderTopWidth: globalColors.globalGnbSearchScopeCaretSize,
      content: globalColors.globalGnbSearchScopeCaretContent,
      display: globalColors.globalGnbSearchScopeCaretDisplay,
      height: globalColors.globalGnbSearchScopeZero,
      marginLeft: globalColors.globalGnbSearchScopeCaretMarginLeft,
      verticalAlign: globalColors.globalGnbSearchScopeCaretVerticalAlign,
      width: globalColors.globalGnbSearchScopeZero,
    },
  },
  openToggle: {
    backgroundColor: globalColors.globalGnbSearchScopeToggleInteractionSurface,
    borderBottomColor: globalColors.globalGnbSearchScopeToggleInteractionBorder,
    borderLeftColor: globalColors.globalGnbSearchScopeToggleInteractionBorder,
    borderRightColor: globalColors.globalGnbSearchScopeToggleInteractionBorder,
    borderTopColor: globalColors.globalGnbSearchScopeToggleInteractionBorder,
    boxShadow: globalColors.globalGnbSearchScopeToggleOpenShadow,
    color: globalColors.globalGnbSearchScopeToggleInteractionText,
  },
  menu: {
    backfaceVisibility: globalColors.globalGnbSearchScopeMenuBackfaceVisibility,
    backgroundClip: globalColors.globalGnbSearchScopeMenuBackgroundClip,
    backgroundColor: globalColors.globalGnbSearchScopeMenuSurface,
    borderBottomColor: globalColors.globalGnbSearchScopeMenuBorder,
    borderBottomStyle: globalColors.globalGnbSearchScopeMenuBorderStyle,
    borderBottomWidth: globalColors.globalGnbSearchScopeMenuBorderWidth,
    borderLeftColor: globalColors.globalGnbSearchScopeMenuBorder,
    borderLeftStyle: globalColors.globalGnbSearchScopeMenuBorderStyle,
    borderLeftWidth: globalColors.globalGnbSearchScopeMenuBorderWidth,
    borderRadius: globalColors.globalGnbSearchScopeMenuRadius,
    borderRightColor: globalColors.globalGnbSearchScopeMenuBorder,
    borderRightStyle: globalColors.globalGnbSearchScopeMenuBorderStyle,
    borderRightWidth: globalColors.globalGnbSearchScopeMenuBorderWidth,
    borderTopColor: globalColors.globalGnbSearchScopeMenuBorder,
    borderTopStyle: globalColors.globalGnbSearchScopeMenuBorderStyle,
    borderTopWidth: globalColors.globalGnbSearchScopeMenuBorderWidth,
    boxShadow: globalColors.globalGnbSearchScopeMenuShadow,
    boxSizing: globalColors.globalGnbSearchScopeMenuBoxSizing,
    color: globalColors.globalGnbSearchScopeMenuText,
    display: globalColors.globalGnbSearchScopeMenuDisplay,
    float: globalColors.globalGnbSearchScopeMenuFloat,
    fontSize: globalColors.globalGnbSearchScopeMenuFontSize,
    left: globalColors.globalGnbSearchScopeMenuLeft,
    listStyle: globalColors.globalGnbSearchScopeMenuListStyle,
    marginBottom: globalColors.globalGnbSearchScopeZero,
    marginLeft: globalColors.globalGnbSearchScopeZero,
    marginRight: globalColors.globalGnbSearchScopeZero,
    marginTop: globalColors.globalGnbSearchScopeMenuClosedMarginTop,
    minWidth: globalColors.globalGnbSearchScopeMenuMinWidth,
    opacity: globalColors.globalGnbSearchScopeMenuClosedOpacity,
    overflow: globalColors.globalGnbSearchScopeMenuOverflow,
    paddingBottom: globalColors.globalGnbSearchScopeMenuPaddingBottom,
    paddingLeft: globalColors.globalGnbSearchScopeZero,
    paddingRight: globalColors.globalGnbSearchScopeZero,
    paddingTop: globalColors.globalGnbSearchScopeMenuPaddingTop,
    position: globalColors.globalGnbSearchScopeMenuPosition,
    right: globalColors.globalGnbSearchScopeMenuRight,
    top: globalColors.globalGnbSearchScopeMenuTop,
    transitionDuration: globalColors.globalGnbSearchScopeMenuTransitionDuration,
    transitionProperty: globalColors.globalGnbSearchScopeMenuTransitionProperty,
    transitionTimingFunction: globalColors.globalGnbSearchScopeMenuTransitionTiming,
    visibility: globalColors.globalGnbSearchScopeMenuClosedVisibility,
    zIndex: globalColors.globalGnbSearchScopeMenuZIndex,
    "::before": {
      borderBottomColor: globalColors.globalGnbSearchScopeMenuBorder,
      borderBottomStyle: globalColors.globalGnbSearchScopeArrowBorderSolid,
      borderBottomWidth: globalColors.globalGnbSearchScopeArrowSideSize,
      borderLeftColor: globalColors.globalGnbSearchScopeTransparent,
      borderLeftStyle: globalColors.globalGnbSearchScopeArrowBorderDashed,
      borderLeftWidth: globalColors.globalGnbSearchScopeArrowSideSize,
      borderRightColor: globalColors.globalGnbSearchScopeTransparent,
      borderRightStyle: globalColors.globalGnbSearchScopeArrowBorderDashed,
      borderRightWidth: globalColors.globalGnbSearchScopeArrowSideSize,
      borderTopColor: globalColors.globalGnbSearchScopeTransparent,
      borderTopStyle: globalColors.globalGnbSearchScopeArrowBorderDashed,
      borderTopWidth: globalColors.globalGnbSearchScopeZero,
      content: globalColors.globalGnbSearchScopeCaretContent,
      height: globalColors.globalGnbSearchScopeZero,
      position: globalColors.globalGnbSearchScopeArrowPosition,
      right: globalColors.globalGnbSearchScopeArrowRight,
      top: globalColors.globalGnbSearchScopeArrowBeforeTop,
      width: globalColors.globalGnbSearchScopeZero,
      zIndex: globalColors.globalGnbSearchScopeArrowZIndex,
    },
    "::after": {
      borderBottomColor: globalColors.globalGnbSearchScopeMenuSurface,
      borderBottomStyle: globalColors.globalGnbSearchScopeArrowBorderSolid,
      borderBottomWidth: globalColors.globalGnbSearchScopeArrowSideSize,
      borderLeftColor: globalColors.globalGnbSearchScopeTransparent,
      borderLeftStyle: globalColors.globalGnbSearchScopeArrowBorderDashed,
      borderLeftWidth: globalColors.globalGnbSearchScopeArrowSideSize,
      borderRightColor: globalColors.globalGnbSearchScopeTransparent,
      borderRightStyle: globalColors.globalGnbSearchScopeArrowBorderDashed,
      borderRightWidth: globalColors.globalGnbSearchScopeArrowSideSize,
      borderTopColor: globalColors.globalGnbSearchScopeTransparent,
      borderTopStyle: globalColors.globalGnbSearchScopeArrowBorderDashed,
      borderTopWidth: globalColors.globalGnbSearchScopeZero,
      content: globalColors.globalGnbSearchScopeCaretContent,
      height: globalColors.globalGnbSearchScopeZero,
      position: globalColors.globalGnbSearchScopeArrowPosition,
      right: globalColors.globalGnbSearchScopeArrowRight,
      top: globalColors.globalGnbSearchScopeArrowAfterTop,
      width: globalColors.globalGnbSearchScopeZero,
      zIndex: globalColors.globalGnbSearchScopeArrowZIndex,
    },
  },
  openMenu: {
    marginTop: globalColors.globalGnbSearchScopeMenuOpenMarginTop,
    opacity: globalColors.globalGnbSearchScopeMenuOpenOpacity,
    visibility: globalColors.globalGnbSearchScopeMenuOpenVisibility,
  },
  item: {
    backgroundColor: globalColors.globalGnbSearchScopeMenuSurface,
    clear: globalColors.globalGnbSearchScopeItemClear,
    color: globalColors.globalGnbSearchScopeItemText,
    display: globalColors.globalGnbSearchScopeItemDisplay,
    float: globalColors.globalGnbSearchScopeItemFloat,
    marginBottom: globalColors.globalGnbSearchScopeItemMarginBottom,
    marginLeft: globalColors.globalGnbSearchScopeItemMarginInline,
    marginRight: globalColors.globalGnbSearchScopeItemMarginInline,
    marginTop: globalColors.globalGnbSearchScopeZero,
    position: globalColors.globalGnbSearchScopeItemPosition,
    whiteSpace: globalColors.globalGnbSearchScopeItemWhiteSpace,
  },
  button: {
    appearance: globalColors.globalGnbSearchScopeButtonAppearance,
    backgroundColor: {
      default: globalColors.globalGnbSearchScopeTransparent,
      ":hover": globalColors.globalGnbSearchScopeMenuInteractionSurface,
      ":focus": globalColors.globalGnbSearchScopeMenuInteractionSurface,
    },
    borderBottomStyle: globalColors.globalGnbSearchScopeButtonBorderStyle,
    borderBottomWidth: globalColors.globalGnbSearchScopeZero,
    borderLeftStyle: globalColors.globalGnbSearchScopeButtonBorderStyle,
    borderLeftWidth: globalColors.globalGnbSearchScopeZero,
    borderRadius: {
      default: globalColors.globalGnbSearchScopeButtonRadius,
      ":hover": globalColors.globalGnbSearchScopeButtonInteractionRadius,
      ":focus": globalColors.globalGnbSearchScopeButtonInteractionRadius,
      ":active": globalColors.globalGnbSearchScopeButtonInteractionRadius,
    },
    borderRightStyle: globalColors.globalGnbSearchScopeButtonBorderStyle,
    borderRightWidth: globalColors.globalGnbSearchScopeZero,
    borderTopStyle: globalColors.globalGnbSearchScopeButtonBorderStyle,
    borderTopWidth: globalColors.globalGnbSearchScopeZero,
    boxSizing: globalColors.globalGnbSearchScopeButtonBoxSizing,
    color: {
      default: globalColors.globalGnbSearchScopeItemText,
      ":hover": globalColors.globalGnbSearchScopeMenuInteractionText,
      ":focus": globalColors.globalGnbSearchScopeMenuInteractionText,
    },
    cursor: globalColors.globalGnbSearchScopeButtonCursor,
    display: globalColors.globalGnbSearchScopeButtonDisplay,
    fontFamily: globalColors.globalGnbSearchScopeButtonFontFamily,
    fontSize: globalColors.globalGnbSearchScopeButtonFontSize,
    lineHeight: globalColors.globalGnbSearchScopeButtonLineHeight,
    margin: globalColors.globalGnbSearchScopeZero,
    outline: globalColors.globalGnbSearchScopeButtonOutline,
    paddingLeft: globalColors.globalGnbSearchScopeButtonPaddingLeft,
    paddingRight: globalColors.globalGnbSearchScopeButtonPaddingRight,
    textAlign: globalColors.globalGnbSearchScopeButtonTextAlign,
    textDecoration: globalColors.globalGnbSearchScopeButtonTextDecoration,
    transitionDuration: globalColors.globalGnbSearchScopeButtonTransitionDuration,
    transitionProperty: globalColors.globalGnbSearchScopeButtonTransitionProperty,
    transitionTimingFunction: globalColors.globalGnbSearchScopeButtonTransitionTiming,
    width: globalColors.globalGnbSearchScopeButtonWidth,
  },
  middleButton: {
    paddingBottom: globalColors.globalGnbSearchScopeButtonMiddlePaddingBottom,
    paddingTop: globalColors.globalGnbSearchScopeButtonMiddlePaddingTop,
  },
  edgeButton: {
    paddingBottom: globalColors.globalGnbSearchScopeButtonEdgePaddingBottom,
    paddingTop: globalColors.globalGnbSearchScopeButtonEdgePaddingTop,
  },
});

const globalGnbSearchFormStyles = stylex.create({
  item: {
    float: globalColors.globalGnbNavItemFloat,
    position: globalColors.globalGnbNavItemPosition,
  },
  form: {
    display: globalColors.globalGnbSearchDisplay,
    fontSize: globalColors.globalGnbSearchFontSize,
    lineHeight: globalColors.globalGnbSearchLineHeight,
    marginBottom: globalColors.globalGnbSearchZero,
    marginLeft: globalColors.globalGnbSearchZero,
    marginRight: globalColors.globalGnbSearchZero,
    marginTop: globalColors.globalGnbSearchMarginTop,
    paddingBlock: globalColors.globalGnbSearchZero,
    paddingInline: globalColors.globalGnbBrandPaddingInline,
    verticalAlign: globalColors.globalGnbSearchVerticalAlign,
    whiteSpace: globalColors.globalGnbSearchWhiteSpace,
  },
});

const globalGnbFeedbackStyles = stylex.create({
  item: {
    float: globalColors.globalGnbNavItemFloat,
    position: globalColors.globalGnbNavItemPosition,
  },
  link: {
    color: globalColors.textMuted,
    display: globalColors.globalGnbFeedbackLinkDisplay,
    float: globalColors.globalGnbFeedbackLinkFloat,
    lineHeight: globalColors.globalGnbBrandHeight,
    padding: globalColors.globalGnbBrandPaddingInline,
    textDecoration: globalColors.globalGnbFeedbackTextDecoration,
    transitionDuration: globalColors.globalGnbBrandTransitionDuration,
    transitionProperty: globalColors.globalGnbFeedbackTransitionProperty,
    ":hover": {
      color: globalColors.textOnAccent,
      textDecoration: globalColors.globalGnbFeedbackTextDecoration,
    },
    ":focus": {
      color: globalColors.textOnAccent,
      textDecoration: globalColors.globalGnbFeedbackTextDecoration,
    },
  },
});

const globalGnbProjectListDividerStyles = stylex.create({
  root: {
    backgroundColor: globalColors.transparent,
    backgroundImage: "none",
    color: globalColors.textMuted,
    float: "left",
    fontSize: globalColors.globalGnbProjectListDividerFontSize,
    height: "auto",
    lineHeight: globalColors.globalGnbBrandHeight,
    position: "relative",
    width: "auto",
    "::after": {
      color: globalColors.textMuted,
      content: '"|"',
      opacity: globalColors.globalGnbProjectListDividerOpacity,
    },
  },
});

const globalGnbProjectListStyles = stylex.create({
  item: {
    color: globalColors.textMuted,
    float: "left",
    position: "relative",
  },
  activeItem: {
    color: globalColors.textOnAccent,
    "::before": {
      borderColor: globalColors.transparent,
      borderBottomColor: globalColors.textOnAccent,
      borderBottomStyle: "solid",
      borderLeftStyle: "outset",
      borderRightStyle: "outset",
      borderTopStyle: "outset",
      borderWidth: globalColors.globalGnbProjectListTriangleSize,
      bottom: globalColors.globalGnbProjectListTriangleBottom,
      content: '" "',
      height: globalColors.globalGnbProjectListTriangleZero,
      left: globalColors.globalGnbProjectListTrianglePosition,
      marginLeft: globalColors.globalGnbProjectListTriangleOffset,
      overflow: "hidden",
      position: "absolute",
      width: globalColors.globalGnbProjectListTriangleZero,
    },
  },
  link: {
    color: "inherit",
    display: "inline",
    float: "none",
    lineHeight: globalColors.globalGnbBrandHeight,
    padding: globalColors.globalGnbBrandPaddingInline,
    textDecoration: "none",
    transitionDuration: globalColors.globalGnbBrandTransitionDuration,
    transitionProperty: "color",
    ":hover": {
      color: globalColors.textOnAccent,
      textDecoration: "none",
    },
    ":focus": {
      color: "inherit",
      textDecoration: "none",
    },
  },
});

const globalGnbOuterStyles = stylex.create({
  root: {
    backgroundColor: globalColors.globalGnbOuterSurface,
    boxSizing: globalColors.globalGnbOuterBoxSizing,
    height: globalColors.globalGnbOuterHeight,
    minWidth: {
      default: globalColors.globalGnbOuterZero,
      "@media (max-width: 720px)": globalColors.globalGnbOuterMobileMinWidth,
    },
    paddingBlock: globalColors.globalGnbOuterZero,
    paddingInline: globalColors.globalGnbOuterPaddingInline,
  },
  project: {
    backgroundColor: globalColors.globalGnbOuterProjectSurface,
    paddingBlock: globalColors.globalGnbOuterZero,
    paddingInline: globalColors.globalGnbOuterZero,
    position: globalColors.globalGnbOuterProjectPosition,
    width: globalColors.globalGnbOuterProjectWidth,
    zIndex: globalColors.globalGnbOuterProjectZIndex,
  },
});

const globalGnbInnerStyles = stylex.create({
  root: {
    boxSizing: globalColors.globalGnbInnerBoxSizing,
    color: globalColors.globalGnbInnerText,
    height: globalColors.globalGnbInnerHeight,
    margin: globalColors.globalGnbInnerMargin,
    width: globalColors.globalGnbInnerWidth,
  },
});

const globalGnbNavStyles = stylex.create({
  nav: {
    boxSizing: globalColors.globalGnbNavBoxSizing,
    color: globalColors.globalGnbNavText,
    display: globalColors.globalGnbNavDisplay,
    float: globalColors.globalGnbNavFloat,
    fontSize: globalColors.globalGnbNavFontSize,
    fontWeight: globalColors.globalGnbNavFontWeight,
    lineHeight: globalColors.globalGnbNavLineHeight,
    listStyle: globalColors.globalGnbNavListStyle,
    marginBottom: globalColors.globalGnbNavZero,
    marginLeft: globalColors.globalGnbNavMarginLeft,
    marginRight: globalColors.globalGnbNavZero,
    marginTop: globalColors.globalGnbNavZero,
    padding: globalColors.globalGnbNavZero,
    position: globalColors.globalGnbNavPosition,
  },
  brandItem: {
    float: globalColors.globalGnbNavItemFloat,
    position: globalColors.globalGnbNavItemPosition,
  },
});

const globalGnbBrandLinkStyles = stylex.create({
  root: {
    backgroundColor: globalColors.globalGnbBrandSurface,
    backgroundPosition: globalColors.globalGnbBrandBackgroundPosition,
    backgroundRepeat: "no-repeat",
    borderRadius: globalColors.globalGnbBrandRadius,
    color: globalColors.globalGnbBrandText,
    display: "inline",
    float: "none",
    fontSize: globalColors.globalGnbBrandFontSize,
    fontWeight: globalColors.globalGnbBrandFontWeight,
    height: globalColors.globalGnbBrandHeight,
    lineHeight: globalColors.globalGnbBrandHeight,
    opacity: globalColors.globalGnbBrandOpacity,
    outlineStyle: "none",
    paddingBlock: globalColors.globalGnbBrandPaddingBlock,
    paddingInline: globalColors.globalGnbBrandPaddingInline,
    textDecoration: "none",
    transitionDuration: globalColors.globalGnbBrandTransitionDuration,
    transitionProperty: "color",
    width: globalColors.globalGnbBrandWidth,
    ":hover": {
      color: globalColors.textOnAccent,
      opacity: globalColors.globalGnbBrandInteractionOpacity,
      outlineStyle: "none",
      textDecoration: "none",
    },
    ":focus": {
      color: globalColors.globalGnbBrandText,
      opacity: globalColors.globalGnbBrandOpacity,
      outlineStyle: "none",
      textDecoration: "none",
    },
    "::before": {
      content: '" "',
      float: "left",
      height: globalColors.globalGnbBrandHeight,
      width: globalColors.globalGnbBrandPseudoWidth,
    },
    "::after": {
      content: '" "',
      float: "left",
      height: globalColors.globalGnbBrandHeight,
      marginLeft: {
        default: globalColors.globalGnbBrandPseudoAfterMargin,
        "@media (max-width: 720px)": globalColors.globalGnbBrandResponsivePseudoAfterMargin,
      },
      width: globalColors.globalGnbBrandPseudoWidth,
    },
  },
  projectHeader: {
    "::after": {
      display: "none",
    },
    "::before": {
      display: "none",
    },
  },
});

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
  const globalGnbBrandLinkClassName = stylex.props(
    globalGnbBrandLinkStyles.root,
    hasScopedSearch && globalGnbBrandLinkStyles.projectHeader,
  ).className;
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
    <div
      {...stylex.props(framedSiteShellStyles.shell, showLeftSidebar && framedSiteShellStyles.open)}
      data-sidebar-open={showLeftSidebar ? "true" : "false"}
      data-stylex-owner="framed-site-shell"
    >
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
      <div
        {...stylex.props(
          framedSiteShellStyles.main,
          showLeftSidebar && framedSiteShellStyles.mainOpen,
        )}
        data-stylex-owner="framed-site-main"
      >
        <div className="unsupported hidden">
          <div className="unsupported-inner">
            <p id="unsupported-content" />
          </div>
        </div>
        {shouldRenderSiteAdminAffix ? (
          <div {...stylex.props(siteAdminAffixStyles.root)} data-stylex-owner="site-admin-affix">
            {t("user.siteAdminLoggedInAffix")}{" "}
            <span {...stylex.props(siteAdminAffixStyles.detail)}>
              {t("user.siteAdminLoggedInAffix.maxim")}
            </span>
          </div>
        ) : null}
        <header
          {...stylex.props(
            globalGnbOuterStyles.root,
            hasScopedSearch && globalGnbOuterStyles.project,
          )}
          data-stylex-owner="global-gnb-outer"
        >
          <div {...stylex.props(globalGnbInnerStyles.root)} data-stylex-owner="global-gnb-inner">
            {!showLeftSidebar ? (
              <button
                {...stylex.props(globalSidebarOpenPinStyles.root)}
                aria-controls="sidebar"
                aria-expanded="false"
                data-stylex-owner="global-sidebar-open-pin"
                onClick={handleLeftSidebarOpen}
                title="Sidebar"
                type="button"
              >
                <i
                  className={`yobicon-arrow-left ${stylex.props(globalSidebarOpenPinStyles.icon).className}`}
                  aria-hidden="true"
                />
                <i
                  className={`yobicon-arrow-right ${stylex.props(globalSidebarOpenPinStyles.icon, globalSidebarOpenPinStyles.visibleIcon).className}`}
                  aria-hidden="true"
                />
              </button>
            ) : null}
            <ul {...stylex.props(globalGnbNavStyles.nav)} data-stylex-owner="global-gnb-nav">
              <li
                {...stylex.props(globalGnbNavStyles.brandItem)}
                data-stylex-owner="global-gnb-brand-item"
              >
                <Link
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  className={globalGnbBrandLinkClassName}
                  data-stylex-owner="global-gnb-brand-link"
                  to="/"
                >
                  Y
                </Link>
              </li>
              {shouldRenderProjectListingLink ? (
                <>
                  <li
                    {...stylex.props(
                      globalGnbProjectListStyles.item,
                      activeMenu === "projects" && globalGnbProjectListStyles.activeItem,
                    )}
                    data-stylex-owner="global-gnb-project-list-item"
                  >
                    <Link
                      activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                      activeProps={LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS.activeProps}
                      to="/projects"
                      search={LEGACY_PROJECTS_LINK_SEARCH}
                      {...stylex.props(globalGnbProjectListStyles.link)}
                      data-stylex-owner="global-gnb-project-list-link"
                    >
                      {t("title.list")}
                    </Link>
                  </li>
                  <li
                    {...stylex.props(globalGnbProjectListDividerStyles.root)}
                    data-stylex-owner="global-gnb-project-list-divider"
                  />
                </>
              ) : null}
              {feedbackUrl ? (
                <li
                  {...stylex.props(globalGnbFeedbackStyles.item)}
                  data-stylex-owner="global-gnb-feedback-item"
                >
                  <Link
                    href={feedbackUrl}
                    to={feedbackUrl}
                    target="_blank"
                    {...stylex.props(globalGnbFeedbackStyles.link)}
                    data-stylex-owner="global-gnb-feedback-link"
                  >
                    {t("title.yobi.feedback")}
                  </Link>
                </li>
              ) : null}
              <li
                {...stylex.props(globalGnbSearchFormStyles.item)}
                data-stylex-owner="global-gnb-search-item"
              >
                <form
                  action={gnbSearchAction}
                  className={`gnb-search-form ${stylex.props(globalGnbSearchFormStyles.form).className}`}
                  data-stylex-owner="global-gnb-search-form"
                  name="gnb-search-form"
                >
                  <input type="hidden" name="searchType" value="auto" />
                  {hasScopedSearch ? (
                    <div
                      {...stylex.props(globalGnbSearchScopeStyles.scope)}
                      data-stylex-owner="global-gnb-search-scope"
                      onBlur={handleSearchScopeBlur}
                    >
                      <button
                        {...stylex.props(
                          globalGnbSearchScopeStyles.toggle,
                          isSearchScopeMenuOpen && globalGnbSearchScopeStyles.openToggle,
                        )}
                        aria-expanded={isSearchScopeMenuOpen}
                        aria-haspopup="menu"
                        data-stylex-owner="global-gnb-search-scope-toggle"
                        id="gnb-search-scope-title"
                        onClick={handleSearchScopeToggleClick}
                        type="button"
                      >
                        {gnbSearchScopeTitle}{" "}
                      </button>
                      <ul
                        {...stylex.props(
                          globalGnbSearchScopeStyles.menu,
                          isSearchScopeMenuOpen && globalGnbSearchScopeStyles.openMenu,
                        )}
                        data-stylex-owner="global-gnb-search-scope-menu"
                      >
                        {projectSearchAction ? (
                          <li
                            {...stylex.props(globalGnbSearchScopeStyles.item)}
                            data-stylex-owner="global-gnb-search-scope-item"
                          >
                            <button
                              {...stylex.props(
                                globalGnbSearchScopeStyles.button,
                                globalGnbSearchScopeStyles.edgeButton,
                              )}
                              onClick={handleSearchScopeItemClick("project")}
                              type="button"
                            >
                              {t("search.scope.project")}
                            </button>
                          </li>
                        ) : null}
                        {projectSearchAction && groupSearchAction ? (
                          <li
                            {...stylex.props(globalGnbSearchScopeStyles.item)}
                            data-stylex-owner="global-gnb-search-scope-item"
                          >
                            <button
                              {...stylex.props(
                                globalGnbSearchScopeStyles.button,
                                shouldRenderAllProjectsSearchScope
                                  ? globalGnbSearchScopeStyles.middleButton
                                  : globalGnbSearchScopeStyles.edgeButton,
                              )}
                              onClick={handleSearchScopeItemClick("group")}
                              type="button"
                            >
                              {t("search.scope.group")}
                            </button>
                          </li>
                        ) : null}
                        {shouldRenderAllProjectsSearchScope ? (
                          <li
                            {...stylex.props(globalGnbSearchScopeStyles.item)}
                            data-stylex-owner="global-gnb-search-scope-item"
                          >
                            <button
                              {...stylex.props(
                                globalGnbSearchScopeStyles.button,
                                globalGnbSearchScopeStyles.edgeButton,
                              )}
                              onClick={handleSearchScopeItemClick("all")}
                              type="button"
                            >
                              {t("search.scope.all")}
                            </button>
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}
                  <div
                    {...stylex.props(
                      globalGnbSearchBoxStyles.box,
                      hasScopedSearch && globalGnbSearchBoxStyles.scoped,
                    )}
                    data-stylex-owner="global-gnb-search-box"
                  >
                    {/* oxlint-disable-next-line jsx-a11y/no-access-key -- legacy common/navbar.scala.html exposes accesskey="S". */}
                    <input
                      {...stylex.props(globalGnbSearchInputStyles.input)}
                      accessKey="S"
                      autoComplete="off"
                      data-stylex-owner="global-gnb-search-input"
                      name="keyword"
                      type="text"
                    />
                    <button
                      {...stylex.props(globalGnbSearchSubmitStyles.submit)}
                      data-stylex-owner="global-gnb-search-submit"
                      type="submit"
                    >
                      <i className="yobicon-search" data-stylex-owner="global-gnb-search-icon" />
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
        <footer {...stylex.props(siteFooterStyles.outer)} data-stylex-owner="site-footer">
          <div {...stylex.props(siteFooterStyles.inner)} data-stylex-owner="site-footer-inner">
            <span
              {...stylex.props(siteFooterStyles.provider)}
              data-stylex-owner="site-footer-provider"
            >
              Yoram authors
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

const framedSiteShellStyles = stylex.create({
  shell: {
    minWidth: globalColors.framedSiteMinWidth,
    width: globalColors.framedSiteWidth,
  },
  open: {
    display: {
      default: globalColors.framedSiteOpenDisplay,
      "@media (max-width: 720px)": globalColors.framedSiteMobileDisplay,
    },
    height: globalColors.framedSiteOpenHeight,
    overflow: globalColors.framedSiteOpenOverflow,
    position: {
      default: null,
      "@media (max-width: 720px)": globalColors.framedSiteMobilePosition,
    },
  },
  main: {
    backgroundColor: globalColors.framedSiteMainSurface,
    minWidth: globalColors.framedSiteMinWidth,
    width: globalColors.framedSiteWidth,
  },
  mainOpen: {
    flex: globalColors.framedSiteMainFlex,
    height: globalColors.framedSiteOpenHeight,
    overflowY: globalColors.framedSiteMainOverflowY,
    width: {
      default: globalColors.framedSiteMainAutoWidth,
      "@media (max-width: 720px)": globalColors.framedSiteWidth,
    },
  },
});

const authenticatedHomeIntroGuideStyles = stylex.create({
  outer: {
    margin: {
      default: globalColors.authenticatedHomeIntroGuideMargin,
      [globalBreakpoints.mobile]: globalColors.authenticatedHomeIntroGuideMobileMargin,
    },
  },
  hidden: {
    display: globalColors.authenticatedHomeIntroGuideHiddenDisplay,
    marginTop: {
      default: globalColors.authenticatedHomeIntroGuideHiddenMarginTop,
      [globalBreakpoints.mobile]: globalColors.authenticatedHomeIntroGuideHiddenMobileMarginTop,
    },
  },
  heading: {
    margin: globalColors.authenticatedHomeIntroGuideHeadingMargin,
    padding: globalColors.authenticatedHomeIntroGuideHeadingPadding,
  },
  headingText: {
    color: globalColors.authenticatedHomeIntroGuideHeadingText,
    fontSize: globalColors.authenticatedHomeIntroGuideHeadingFontSize,
    fontWeight: globalColors.authenticatedHomeIntroGuideHeadingFontWeight,
  },
  table: {
    borderBottomColor: globalColors.authenticatedHomeIntroGuideTableBorderBottomColor,
    borderBottomStyle: globalColors.authenticatedHomeIntroGuideTableBorderBottomStyle,
    borderBottomWidth: globalColors.authenticatedHomeIntroGuideTableBorderBottomWidth,
    marginBottom: globalColors.authenticatedHomeIntroGuideTableMarginBottom,
  },
  cell: {
    borderTopStyle: globalColors.authenticatedHomeIntroGuideCellBorderTopStyle,
    fontSize: globalColors.authenticatedHomeIntroGuideCellFontSize,
    verticalAlign: globalColors.authenticatedHomeIntroGuideCellVerticalAlign,
  },
  link: {
    width: globalColors.authenticatedHomeIntroGuideLinkWidth,
  },
  toggle: {
    textAlign: globalColors.authenticatedHomeIntroGuideToggleTextAlign,
  },
  toggleButton: {
    borderColor: globalColors.authenticatedHomeIntroGuideToggleBorderColor,
    borderRadius: globalColors.authenticatedHomeIntroGuideToggleRadius,
    borderStyle: globalColors.authenticatedHomeIntroGuideToggleBorderStyle,
    borderTopColor: globalColors.authenticatedHomeIntroGuideToggleBorderTopColor,
    borderTopWidth: globalColors.authenticatedHomeIntroGuideToggleBorderTopWidth,
    borderWidth: globalColors.authenticatedHomeIntroGuideToggleBorderWidth,
    color: globalColors.authenticatedHomeIntroGuideToggleText,
    display: globalColors.authenticatedHomeIntroGuideToggleDisplay,
    padding: globalColors.authenticatedHomeIntroGuideTogglePadding,
  },
  icon: {
    fontSize: globalColors.authenticatedHomeIntroGuideIconFontSize,
  },
});

const authenticatedHomePageWrapStyles = stylex.create({
  outer: {
    boxSizing: globalColors.authenticatedHomePageWrapOuterBoxSizing,
    marginTop: globalColors.authenticatedHomePageWrapOuterMarginTop,
    minHeight: globalColors.authenticatedHomePageWrapOuterMinHeight,
    minWidth: {
      default: globalColors.authenticatedHomePageWrapOuterZero,
      "@media (max-width: 720px)": globalColors.authenticatedHomePageWrapOuterMobileMinWidth,
    },
    paddingBlock: globalColors.authenticatedHomePageWrapOuterZero,
    paddingInline: {
      default: globalColors.authenticatedHomePageWrapOuterPaddingInline,
      "@media (max-width: 720px)": globalColors.authenticatedHomePageWrapOuterZero,
    },
    width: globalColors.authenticatedHomePageWrapOuterWidth,
  },
  inner: {
    backgroundColor: globalColors.authenticatedHomePageWrapSurface,
    boxSizing: globalColors.authenticatedHomePageWrapBoxSizing,
    margin: globalColors.authenticatedHomePageWrapMargin,
  },
});

const authenticatedHomeContentGridStyles = stylex.create({
  page: {
    borderBottomLeftRadius: globalColors.authenticatedHomeContentPageRadius,
    borderBottomRightRadius: globalColors.authenticatedHomeContentPageRadius,
    padding: globalColors.authenticatedHomeContentZero,
  },
  grid: {
    width: globalColors.authenticatedHomeContentGridWidth,
    "::before": {
      content: globalColors.authenticatedHomeContentGridPseudoContent,
      display: globalColors.authenticatedHomeContentGridPseudoDisplay,
      lineHeight: globalColors.authenticatedHomeContentZero,
    },
    "::after": {
      clear: globalColors.authenticatedHomeContentGridPseudoClear,
      content: globalColors.authenticatedHomeContentGridPseudoContent,
      display: globalColors.authenticatedHomeContentGridPseudoDisplay,
      lineHeight: globalColors.authenticatedHomeContentZero,
    },
  },
  main: {
    boxSizing: globalColors.authenticatedHomeContentColumnBoxSizing,
    display: globalColors.authenticatedHomeContentColumnDisplay,
    float: globalColors.authenticatedHomeContentColumnFloat,
    marginBottom: globalColors.authenticatedHomeContentMainMarginBottom,
    marginLeft: globalColors.authenticatedHomeContentZero,
    minHeight: globalColors.authenticatedHomeContentColumnMinHeight,
    width: {
      default: globalColors.authenticatedHomeContentMainWidth,
      [globalBreakpoints.mobile]: globalColors.authenticatedHomeContentMainMobileWidth,
    },
  },
  rail: {
    boxSizing: globalColors.authenticatedHomeContentColumnBoxSizing,
    display: globalColors.authenticatedHomeContentColumnDisplay,
    float: globalColors.authenticatedHomeContentColumnFloat,
    marginLeft: globalColors.authenticatedHomeContentRailMarginLeft,
    marginTop: globalColors.authenticatedHomeContentRailMarginTop,
    minHeight: globalColors.authenticatedHomeContentColumnMinHeight,
    minWidth: {
      default: globalColors.authenticatedHomeContentZero,
      [globalBreakpoints.mobile]: globalColors.authenticatedHomeContentRailMobileMinWidth,
    },
    width: globalColors.authenticatedHomeContentRailWidth,
  },
});

const authenticatedHomeSeriesTabStyles = stylex.create({
  list: {
    borderBottomColor: globalColors.authenticatedHomeSeriesTabsBorderColor,
    borderBottomStyle: globalColors.authenticatedHomeSeriesTabsBorderStyle,
    borderBottomWidth: globalColors.authenticatedHomeSeriesTabsBorderWidth,
    listStyle: globalColors.authenticatedHomeSeriesTabsListStyle,
    marginBottom: globalColors.authenticatedHomeSeriesTabsMarginBottom,
    marginLeft: globalColors.authenticatedHomeSeriesTabsZero,
    padding: globalColors.authenticatedHomeSeriesTabsZero,
    "::before": {
      content: globalColors.authenticatedHomeSeriesTabsPseudoContent,
      display: globalColors.authenticatedHomeSeriesTabsPseudoDisplay,
      lineHeight: globalColors.authenticatedHomeSeriesTabsZero,
    },
    "::after": {
      clear: globalColors.authenticatedHomeSeriesTabsPseudoClear,
      content: globalColors.authenticatedHomeSeriesTabsPseudoContent,
      display: globalColors.authenticatedHomeSeriesTabsPseudoDisplay,
      lineHeight: globalColors.authenticatedHomeSeriesTabsZero,
    },
  },
  item: {
    float: globalColors.authenticatedHomeSeriesTabItemFloat,
    marginBottom: globalColors.authenticatedHomeSeriesTabItemMarginBottom,
  },
  actionItem: {
    position: globalColors.authenticatedHomeSeriesTabActionPosition,
  },
  link: {
    backgroundColor: {
      default: null,
      ":hover": globalColors.authenticatedHomeSeriesTabLinkHoverSurface,
      ":focus": globalColors.authenticatedHomeSeriesTabLinkFocusSurface,
    },
    borderBlockEndColor: {
      default: globalColors.authenticatedHomeSeriesTabsTransparentBorder,
      ":hover": globalColors.authenticatedHomeSeriesTabLinkInteractionBorderBlockEnd,
      ":focus": globalColors.authenticatedHomeSeriesTabLinkInteractionBorderBlockEnd,
    },
    borderBlockStartColor: {
      default: globalColors.authenticatedHomeSeriesTabsTransparentBorder,
      ":hover": globalColors.authenticatedHomeSeriesTabLinkInteractionBorderBlockStart,
      ":focus": globalColors.authenticatedHomeSeriesTabLinkInteractionBorderBlockStart,
    },
    borderInlineColor: {
      default: globalColors.authenticatedHomeSeriesTabsTransparentBorder,
      ":hover": globalColors.authenticatedHomeSeriesTabLinkInteractionBorderInline,
      ":focus": globalColors.authenticatedHomeSeriesTabLinkInteractionBorderInline,
    },
    borderRadius: globalColors.authenticatedHomeSeriesTabLinkRadius,
    borderStyle: globalColors.authenticatedHomeSeriesTabsBorderStyle,
    borderWidth: globalColors.authenticatedHomeSeriesTabsBorderWidth,
    color: globalColors.authenticatedHomeSeriesTabLinkText,
    cursor: globalColors.authenticatedHomeSeriesTabLinkCursor,
    display: globalColors.authenticatedHomeSeriesTabLinkDisplay,
    fontWeight: globalColors.authenticatedHomeSeriesTabLinkFontWeight,
    lineHeight: globalColors.authenticatedHomeSeriesTabLinkLineHeight,
    marginRight: globalColors.authenticatedHomeSeriesTabLinkMarginRight,
    paddingBlock: globalColors.authenticatedHomeSeriesTabLinkPaddingBlock,
    paddingInline: {
      default: globalColors.authenticatedHomeSeriesTabLinkPaddingInline,
      [globalBreakpoints.mobile]: globalColors.authenticatedHomeSeriesTabLinkMobilePaddingInline,
    },
    textDecoration: {
      default: null,
      ":hover": globalColors.authenticatedHomeSeriesTabLinkTextDecoration,
      ":focus": globalColors.authenticatedHomeSeriesTabLinkTextDecoration,
    },
  },
  activeLink: {
    backgroundColor: {
      default: globalColors.authenticatedHomeSeriesTabActiveSurface,
      ":hover": globalColors.authenticatedHomeSeriesTabActiveSurface,
      ":focus": globalColors.authenticatedHomeSeriesTabActiveSurface,
    },
    borderBlockEndColor: {
      default: globalColors.authenticatedHomeSeriesTabsTransparentBorder,
      ":hover": globalColors.authenticatedHomeSeriesTabsTransparentBorder,
      ":focus": globalColors.authenticatedHomeSeriesTabsTransparentBorder,
    },
    borderBlockStartColor: {
      default: globalColors.authenticatedHomeSeriesTabsBorderColor,
      ":hover": globalColors.authenticatedHomeSeriesTabsBorderColor,
      ":focus": globalColors.authenticatedHomeSeriesTabsBorderColor,
    },
    borderInlineColor: {
      default: globalColors.authenticatedHomeSeriesTabsBorderColor,
      ":hover": globalColors.authenticatedHomeSeriesTabsBorderColor,
      ":focus": globalColors.authenticatedHomeSeriesTabsBorderColor,
    },
    color: {
      default: globalColors.authenticatedHomeSeriesTabActiveText,
      ":hover": globalColors.authenticatedHomeSeriesTabActiveText,
      ":focus": globalColors.authenticatedHomeSeriesTabActiveText,
    },
    cursor: globalColors.authenticatedHomeSeriesTabActiveCursor,
  },
});

const authenticatedHomeDefaultLoginActionStyles = stylex.create({
  button: {
    backgroundColor: {
      default: globalColors.authenticatedHomeDefaultLoginButtonSurface,
      ":hover": globalColors.authenticatedHomeDefaultLoginButtonInteractionSurface,
      ":focus": globalColors.authenticatedHomeDefaultLoginButtonInteractionSurface,
    },
    borderColor: {
      default: globalColors.authenticatedHomeDefaultLoginButtonBorderColor,
      ":hover": globalColors.authenticatedHomeDefaultLoginButtonInteractionBorderColor,
      ":focus": globalColors.authenticatedHomeDefaultLoginButtonInteractionBorderColor,
    },
    borderRadius: globalColors.authenticatedHomeDefaultLoginButtonRadius,
    borderStyle: globalColors.authenticatedHomeDefaultLoginButtonBorderStyle,
    borderWidth: globalColors.authenticatedHomeDefaultLoginButtonBorderWidth,
    boxShadow: globalColors.authenticatedHomeDefaultLoginButtonShadow,
    boxSizing: globalColors.authenticatedHomeDefaultLoginButtonBoxSizing,
    color: {
      default: globalColors.authenticatedHomeDefaultLoginButtonText,
      ":hover": globalColors.authenticatedHomeDefaultLoginButtonInteractionText,
      ":focus": globalColors.authenticatedHomeDefaultLoginButtonInteractionText,
    },
    cursor: globalColors.authenticatedHomeDefaultLoginButtonCursor,
    display: {
      default: globalColors.authenticatedHomeDefaultLoginButtonDisplay,
      [globalBreakpoints.mobile]: globalColors.authenticatedHomeDefaultLoginButtonMobileDisplay,
    },
    fontFamily: globalColors.authenticatedHomeDefaultLoginButtonFontFamily,
    fontSize: globalColors.authenticatedHomeDefaultLoginButtonFontSize,
    fontWeight: globalColors.authenticatedHomeDefaultLoginButtonFontWeight,
    lineHeight: globalColors.authenticatedHomeDefaultLoginButtonLineHeight,
    margin: globalColors.authenticatedHomeDefaultLoginZero,
    outline: globalColors.authenticatedHomeDefaultLoginButtonOutline,
    padding: globalColors.authenticatedHomeDefaultLoginButtonPadding,
    position: globalColors.authenticatedHomeDefaultLoginButtonPosition,
    textAlign: globalColors.authenticatedHomeDefaultLoginButtonTextAlign,
    textDecoration: {
      default: null,
      ":hover": globalColors.authenticatedHomeDefaultLoginButtonTextDecoration,
      ":focus": globalColors.authenticatedHomeDefaultLoginButtonTextDecoration,
    },
    textShadow: globalColors.authenticatedHomeDefaultLoginButtonTextShadow,
    transition: globalColors.authenticatedHomeDefaultLoginButtonTransition,
    verticalAlign: globalColors.authenticatedHomeDefaultLoginButtonVerticalAlign,
    whiteSpace: globalColors.authenticatedHomeDefaultLoginButtonWhiteSpace,
    zIndex: globalColors.authenticatedHomeDefaultLoginButtonZIndex,
  },
  hidden: {
    display: globalColors.authenticatedHomeDefaultLoginButtonMobileDisplay,
  },
  popover: {
    backgroundClip: globalColors.authenticatedHomeDefaultLoginPopoverBackgroundClip,
    backgroundColor: globalColors.authenticatedHomeDefaultLoginPopoverSurface,
    borderColor: globalColors.authenticatedHomeDefaultLoginPopoverBorderColor,
    borderRadius: globalColors.authenticatedHomeDefaultLoginPopoverRadius,
    borderStyle: globalColors.authenticatedHomeDefaultLoginButtonBorderStyle,
    borderWidth: globalColors.authenticatedHomeDefaultLoginButtonBorderWidth,
    boxShadow: globalColors.authenticatedHomeDefaultLoginPopoverShadow,
    boxSizing: globalColors.authenticatedHomeDefaultLoginButtonBoxSizing,
    color: globalColors.authenticatedHomeDefaultLoginPopoverText,
    display: globalColors.authenticatedHomeDefaultLoginPopoverDisplay,
    fontFamily: globalColors.authenticatedHomeDefaultLoginButtonFontFamily,
    fontSize: globalColors.authenticatedHomeDefaultLoginPopoverFontSize,
    fontWeight: globalColors.authenticatedHomeDefaultLoginPopoverFontWeight,
    left: globalColors.authenticatedHomeDefaultLoginPopoverLeft,
    lineHeight: globalColors.authenticatedHomeDefaultLoginPopoverLineHeight,
    marginTop: globalColors.authenticatedHomeDefaultLoginPopoverMarginTop,
    maxWidth: globalColors.authenticatedHomeDefaultLoginPopoverMaxWidth,
    opacity: globalColors.authenticatedHomeDefaultLoginPopoverOpacity,
    padding: globalColors.authenticatedHomeDefaultLoginPopoverPadding,
    position: globalColors.authenticatedHomeDefaultLoginPopoverPosition,
    textAlign: globalColors.authenticatedHomeDefaultLoginPopoverTextAlign,
    top: globalColors.authenticatedHomeDefaultLoginPopoverTop,
    transform: globalColors.authenticatedHomeDefaultLoginPopoverTransform,
    whiteSpace: globalColors.authenticatedHomeDefaultLoginPopoverWhiteSpace,
    // bootstrap.js:1187-1200 measures the temporary top/left-zero tip before placement.
    width: globalColors.authenticatedHomeDefaultLoginPopoverIntrinsicWidth,
    zIndex: globalColors.authenticatedHomeDefaultLoginPopoverZIndex,
  },
  arrow: {
    borderBottomColor: globalColors.authenticatedHomeDefaultLoginPopoverArrowBorderColor,
    borderColor: globalColors.authenticatedHomeDefaultLoginPopoverArrowTransparent,
    borderStyle: globalColors.authenticatedHomeDefaultLoginButtonBorderStyle,
    borderTopWidth: globalColors.authenticatedHomeDefaultLoginZero,
    borderWidth: globalColors.authenticatedHomeDefaultLoginPopoverArrowSize,
    display: globalColors.authenticatedHomeDefaultLoginPopoverDisplay,
    height: globalColors.authenticatedHomeDefaultLoginZero,
    left: globalColors.authenticatedHomeDefaultLoginPopoverArrowLeft,
    marginLeft: globalColors.authenticatedHomeDefaultLoginPopoverArrowMarginLeft,
    position: globalColors.authenticatedHomeDefaultLoginPopoverPosition,
    top: globalColors.authenticatedHomeDefaultLoginPopoverArrowTop,
    width: globalColors.authenticatedHomeDefaultLoginZero,
    "::after": {
      borderBottomColor: globalColors.authenticatedHomeDefaultLoginPopoverArrowInnerBorderColor,
      borderColor: globalColors.authenticatedHomeDefaultLoginPopoverArrowTransparent,
      borderStyle: globalColors.authenticatedHomeDefaultLoginButtonBorderStyle,
      borderTopWidth: globalColors.authenticatedHomeDefaultLoginZero,
      borderWidth: globalColors.authenticatedHomeDefaultLoginPopoverArrowInnerSize,
      content: globalColors.authenticatedHomeDefaultLoginPopoverArrowContent,
      display: globalColors.authenticatedHomeDefaultLoginPopoverDisplay,
      height: globalColors.authenticatedHomeDefaultLoginZero,
      marginLeft: globalColors.authenticatedHomeDefaultLoginPopoverArrowInnerMarginLeft,
      position: globalColors.authenticatedHomeDefaultLoginPopoverPosition,
      top: globalColors.authenticatedHomeDefaultLoginPopoverArrowInnerTop,
      width: globalColors.authenticatedHomeDefaultLoginZero,
    },
  },
  title: {
    backgroundColor: globalColors.authenticatedHomeDefaultLoginPopoverTitleSurface,
    borderBottomColor: globalColors.authenticatedHomeDefaultLoginPopoverTitleBorderColor,
    borderBottomStyle: globalColors.authenticatedHomeDefaultLoginButtonBorderStyle,
    borderBottomWidth: globalColors.authenticatedHomeDefaultLoginButtonBorderWidth,
    borderRadius: globalColors.authenticatedHomeDefaultLoginPopoverTitleRadius,
    fontSize: globalColors.authenticatedHomeDefaultLoginPopoverTitleFontSize,
    fontWeight: globalColors.authenticatedHomeDefaultLoginPopoverFontWeight,
    lineHeight: globalColors.authenticatedHomeDefaultLoginPopoverTitleLineHeight,
    margin: globalColors.authenticatedHomeDefaultLoginZero,
    padding: globalColors.authenticatedHomeDefaultLoginPopoverTitlePadding,
  },
  content: {
    lineHeight: globalColors.authenticatedHomeDefaultLoginPopoverContentLineHeight,
    padding: globalColors.authenticatedHomeDefaultLoginPopoverContentPadding,
  },
});

const authenticatedHomeNotificationStyles = stylex.create({
  list: {
    listStyle: globalColors.authenticatedHomeNotificationListStyle,
    margin: globalColors.authenticatedHomeNotificationZero,
    padding: globalColors.authenticatedHomeNotificationZero,
  },
  empty: {
    backgroundColor: globalColors.authenticatedHomeNotificationEmptySurface,
    borderRadius: globalColors.authenticatedHomeNotificationEmptyRadius,
    borderStyle: globalColors.authenticatedHomeNotificationEmptyBorderStyle,
    borderWidth: globalColors.authenticatedHomeNotificationEmptyBorderWidth,
    color: globalColors.authenticatedHomeNotificationEmptyText,
    fontSize: globalColors.authenticatedHomeNotificationEmptyFontSize,
    padding: globalColors.authenticatedHomeNotificationEmptyPadding,
    textAlign: globalColors.authenticatedHomeNotificationEmptyTextAlign,
  },
});

const authenticatedHomeNotificationPaginationStyles = stylex.create({
  button: {
    boxSizing: globalColors.authenticatedHomeNotificationPaginationBoxSizing,
    marginTop: globalColors.authenticatedHomeNotificationPaginationMarginTop,
    width: globalColors.authenticatedHomeNotificationPaginationWidth,
  },
});

const authenticatedHomeNotificationRowStyles = stylex.create({
  row: {
    borderBottomColor: globalColors.authenticatedHomeNotificationRowText,
    borderBottomStyle: globalColors.authenticatedHomeNotificationRowBorderStyle,
    borderBottomWidth: globalColors.authenticatedHomeNotificationRowBorder,
    clear: globalColors.authenticatedHomeNotificationRowClear,
    color: globalColors.authenticatedHomeNotificationRowText,
    cursor: globalColors.authenticatedHomeNotificationRowCursor,
    padding: globalColors.authenticatedHomeNotificationRowPadding,
    position: globalColors.authenticatedHomeNotificationRowPosition,
    backgroundColor: {
      default: null,
      ":hover": globalColors.authenticatedHomeNotificationRowHoverSurface,
    },
  },
  type: {
    color: globalColors.authenticatedHomeNotificationTypeBaseText,
    display: globalColors.authenticatedHomeNotificationTypeDisplay,
    fontSize: globalColors.authenticatedHomeNotificationTypeFontSize,
    fontWeight: globalColors.authenticatedHomeNotificationTypeFontWeight,
    lineHeight: globalColors.authenticatedHomeNotificationTypeLineHeight,
    marginTop: globalColors.authenticatedHomeNotificationTypeMarginTop,
    padding: globalColors.authenticatedHomeNotificationTypePadding,
    textAlign: globalColors.authenticatedHomeNotificationTypeTextAlign,
    verticalAlign: globalColors.authenticatedHomeNotificationTypeVerticalAlign,
  },
  updated: {
    backgroundColor: globalColors.authenticatedHomeNotificationUpdatedSurface,
    borderColor: globalColors.authenticatedHomeNotificationUpdatedText,
    borderRadius: globalColors.authenticatedHomeNotificationUpdatedRadius,
    borderStyle: globalColors.authenticatedHomeNotificationUpdatedBorderStyle,
    borderWidth: globalColors.authenticatedHomeNotificationUpdatedBorder,
    color: globalColors.authenticatedHomeNotificationUpdatedText,
    fontSize: globalColors.authenticatedHomeNotificationUpdatedFontSize,
    fontWeight: globalColors.authenticatedHomeNotificationTypeFontWeight,
    padding: globalColors.authenticatedHomeNotificationUpdatedPadding,
    width: globalColors.authenticatedHomeNotificationUpdatedWidth,
  },
  closed: { color: globalColors.authenticatedHomeNotificationTypeClosedText },
  changed: { color: globalColors.authenticatedHomeNotificationTypeChangedText },
  rejected: { color: globalColors.authenticatedHomeNotificationTypeRejectedText },
  warning: { color: globalColors.authenticatedHomeNotificationTypeWarningText },
  merged: { color: globalColors.authenticatedHomeNotificationTypeMergedText },
  comment: { color: globalColors.authenticatedHomeNotificationTypeCommentText },
  info: { color: globalColors.authenticatedHomeNotificationTypeInfoText },
  list: { color: globalColors.authenticatedHomeNotificationTypeListText },
  ellipsis: { color: globalColors.authenticatedHomeNotificationTypeEllipsisText },
  desc: {
    display: globalColors.authenticatedHomeNotificationTypeDisplay,
    padding: globalColors.authenticatedHomeNotificationDescPadding,
    width: globalColors.authenticatedHomeNotificationDescWidth,
  },
  title: {
    color: globalColors.authenticatedHomeNotificationTitleText,
    fontSize: globalColors.authenticatedHomeNotificationTitleFontSize,
    fontWeight: globalColors.authenticatedHomeNotificationTitleFontWeight,
    overflow: globalColors.authenticatedHomeNotificationTitleOverflow,
    textOverflow: globalColors.authenticatedHomeNotificationTitleTextOverflow,
    whiteSpace: globalColors.authenticatedHomeNotificationTitleWhiteSpace,
  },
  messageWrap: {
    color: globalColors.authenticatedHomeNotificationMessageText,
    fontSize: globalColors.authenticatedHomeNotificationMessageFontSize,
    lineHeight: globalColors.authenticatedHomeNotificationMessageLineHeight,
    marginTop: globalColors.authenticatedHomeNotificationMessageMarginTop,
    minHeight: globalColors.authenticatedHomeNotificationMessageMinHeight,
    overflow: globalColors.authenticatedHomeNotificationTitleOverflow,
    transition: globalColors.authenticatedHomeNotificationMessageTransition,
  },
  collapsedMessage: {
    maxHeight: globalColors.authenticatedHomeNotificationMessageMaxHeight,
  },
  message: {
    lineHeight: globalColors.authenticatedHomeNotificationMessageLineHeight,
    wordBreak: globalColors.authenticatedHomeNotificationMessageWordBreak,
  },
  more: {
    backgroundColor: globalColors.authenticatedHomeNotificationMoreSurface,
    borderRadius: globalColors.authenticatedHomeNotificationMoreRadius,
    color: globalColors.authenticatedHomeNotificationMessageText,
    display: globalColors.authenticatedHomeNotificationTypeDisplay,
    lineHeight: globalColors.authenticatedHomeNotificationMoreLineHeight,
    padding: globalColors.authenticatedHomeNotificationMorePadding,
  },
  hiddenMore: {
    display: globalColors.authenticatedHomeNotificationMoreHiddenDisplay,
  },
  meta: {
    color: globalColors.authenticatedHomeNotificationMetaText,
    fontSize: globalColors.authenticatedHomeNotificationMetaFontSize,
    marginTop: globalColors.authenticatedHomeNotificationMetaMarginTop,
  },
  avatar: {
    marginTop: globalColors.authenticatedHomeNotificationAvatarMarginTop,
  },
  author: {
    color: {
      default: globalColors.authenticatedHomeNotificationAuthorText,
      ":hover": globalColors.authenticatedHomeNotificationAuthorHoverText,
    },
    fontWeight: globalColors.authenticatedHomeNotificationTypeFontWeight,
  },
  ago: {
    float: globalColors.authenticatedHomeNotificationAgoFloat,
  },
});

const siteFooterStyles = stylex.create({
  outer: {
    backgroundColor: globalColors.siteFooterSurface,
    boxSizing: globalColors.siteFooterBoxSizing,
    minWidth: {
      default: globalColors.siteFooterZero,
      "@media (max-width: 720px)": globalColors.siteFooterMobileMinWidth,
    },
    padding: globalColors.siteFooterPadding,
  },
  inner: {
    boxSizing: globalColors.siteFooterBoxSizing,
    lineHeight: globalColors.siteFooterInnerLineHeight,
    margin: globalColors.siteFooterInnerMargin,
    textAlign: globalColors.siteFooterInnerTextAlign,
    width: globalColors.siteFooterInnerWidth,
  },
  provider: {
    color: globalColors.siteFooterProviderText,
    fontFamily: globalColors.siteFooterProviderFontFamily,
    fontSize: globalColors.siteFooterProviderFontSize,
    marginLeft: globalColors.siteFooterProviderMarginLeft,
  },
});

const leftSidebarOuterShellStyles = stylex.create({
  shell: {
    backgroundColor: globalColors.leftSidebarOuterSurface,
    borderRightColor: globalColors.leftSidebarOuterBorder,
    borderRightStyle: "solid",
    borderRightWidth: "1px",
    bottom: 0,
    boxSizing: "content-box",
    color: globalColors.leftSidebarOuterText,
    display: "block",
    flexBasis: "270px",
    flexGrow: 0,
    flexShrink: 0,
    height: "100vh",
    left: 0,
    position: {
      default: "sticky",
      "@media (max-width: 720px)": "absolute",
    },
    top: 0,
    width: {
      default: "270px",
      "@media (max-width: 720px)": "auto",
    },
    // The React main pane is a later sibling and otherwise paints over this absolute mobile shell.
    zIndex: {
      default: "auto",
      "@media (max-width: 720px)": 1001,
    },
  },
});

const leftSidebarAccountActionStyles = stylex.create({
  row: {
    boxSizing: "border-box",
    color: globalColors.leftSidebarAccountText,
    padding: "10px",
    width: "100%",
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
  menu: {
    padding: "5px",
  },
  link: {
    ":hover": {
      color: globalColors.leftSidebarAccountHoverText,
    },
  },
  logoutLink: {
    ":hover": {
      color: globalColors.leftSidebarAccountLogoutText,
    },
  },
  logoutLabel: {
    backgroundColor: globalColors.leftSidebarAccountLogoutSurface,
    borderRadius: "1px",
    color: globalColors.leftSidebarAccountLogoutText,
    display: "inline-block",
    fontSize: "11.844px",
    fontWeight: "normal",
    lineHeight: "14px",
    padding: "5px",
    textShadow: globalColors.leftSidebarAccountLogoutTextShadow,
    verticalAlign: "baseline",
    whiteSpace: "nowrap",
    ":hover": {
      backgroundColor: globalColors.leftSidebarAccountLogoutHoverSurface,
      color: globalColors.leftSidebarAccountLogoutText,
    },
  },
});

const leftSidebarProfileIdentityStyles = stylex.create({
  avatar: {
    backgroundColor: globalColors.leftSidebarProfileAvatarSurface,
    borderRadius: "3px",
    display: "inline-block",
    height: "20px",
    overflow: "hidden",
    verticalAlign: "middle",
    width: "20px",
  },
  image: {
    verticalAlign: "top",
    width: "100%",
  },
  label: {
    display: {
      default: "inline",
      "@media (max-width: 720px)": "none",
    },
  },
});

const leftSidebarClosePinStyles = stylex.create({
  button: {
    appearance: "none",
    backgroundColor: globalColors.leftSidebarClosePinSurface,
    borderBottomColor: globalColors.leftSidebarClosePinText,
    borderBottomStyle: "none",
    borderBottomWidth: 0,
    borderLeftColor: globalColors.leftSidebarClosePinText,
    borderLeftStyle: "none",
    borderLeftWidth: 0,
    borderRadius: "3px 0 0 3px",
    borderRightColor: globalColors.leftSidebarClosePinText,
    borderRightStyle: "none",
    borderRightWidth: 0,
    borderTopColor: globalColors.leftSidebarClosePinText,
    borderTopStyle: "none",
    borderTopWidth: 0,
    boxShadow: "none",
    boxSizing: "content-box",
    color: globalColors.leftSidebarClosePinText,
    cursor: {
      default: "auto",
      ":hover": "pointer",
    },
    display: "block",
    fontSize: "18px",
    lineHeight: "20px",
    margin: "0 5px 0 0",
    padding: "0 1px",
    position: "absolute",
    right: "-5px",
    top: "9px",
    ":hover": {
      backgroundColor: globalColors.leftSidebarClosePinSurface,
      color: globalColors.leftSidebarClosePinText,
    },
    ":focus": {
      backgroundColor: globalColors.leftSidebarClosePinSurface,
      boxShadow: "none",
      color: globalColors.leftSidebarClosePinInteractionText,
    },
  },
  icon: {
    cursor: {
      default: "auto",
      ":hover": "pointer",
    },
    display: "inline-block",
    fontSize: "18px",
    lineHeight: "18px",
    padding: "4px 2px",
    ":hover": {
      color: globalColors.leftSidebarClosePinInteractionText,
    },
  },
});

const leftSidebarFooterStyles = stylex.create({
  footer: {
    bottom: "8px",
    color: globalColors.leftSidebarFooterText,
    position: "absolute",
    right: "15px",
  },
  heart: {
    color: globalColors.leftSidebarFooterHeart,
    verticalAlign: "middle",
  },
});

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
    <aside
      aria-label="Sidebar"
      className={`sidebar ${stylex.props(leftSidebarOuterShellStyles.shell).className}`}
      data-stylex-owner="left-sidebar-outer-shell"
      id="sidebar"
    >
      <div
        {...stylex.props(leftSidebarAccountActionStyles.row)}
        data-stylex-owner="left-sidebar-account-actions"
      >
        <span {...stylex.props(leftSidebarAccountActionStyles.menu)}>
          <Link
            {...stylex.props(leftSidebarAccountActionStyles.link)}
            activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
            activeProps={{
              "aria-current": undefined,
              className: undefined,
              "data-status": undefined,
            }}
            data-stylex-owner="left-sidebar-profile-identity"
            params={{ user: loginId }}
            search={LEGACY_USER_LINK_SEARCH}
            to="/$user"
          >
            <span {...stylex.props(leftSidebarProfileIdentityStyles.avatar)}>
              <img
                {...stylex.props(leftSidebarProfileIdentityStyles.image)}
                alt=""
                src={avatarUrl}
              />
            </span>{" "}
            <span {...stylex.props(leftSidebarProfileIdentityStyles.label)}>{userLabel}</span>{" "}
          </Link>
        </span>
        <span {...stylex.props(leftSidebarAccountActionStyles.menu)}>
          <Link {...stylex.props(leftSidebarAccountActionStyles.link)} to="/user/editform">
            {t("userinfo.accountSetting")}
          </Link>
        </span>{" "}
        <Link
          {...stylex.props(leftSidebarAccountActionStyles.logoutLink)}
          reloadDocument
          to={LEGACY_AUTHENTICATED_LOGOUT_PATH}
        >
          <span {...stylex.props(leftSidebarAccountActionStyles.logoutLabel)}>
            {t("title.logout")}
          </span>
        </Link>
        <button
          {...stylex.props(leftSidebarClosePinStyles.button)}
          aria-controls="sidebar"
          aria-expanded="true"
          data-stylex-owner="left-sidebar-close-pin"
          onClick={onClose}
          title="Sidebar"
          type="button"
        >
          <i
            aria-hidden="true"
            className={`yobicon-arrow-left ${stylex.props(leftSidebarClosePinStyles.icon).className}`}
          />
        </button>
      </div>
      <ul {...stylex.props(leftSidebarTabStyles.tabs)} data-stylex-owner="left-sidebar-tabs">
        <li {...stylex.props(leftSidebarTabStyles.item)}>
          <button
            {...stylex.props(
              leftSidebarTabStyles.button,
              activeTab === "favorite" && leftSidebarTabStyles.activeButton,
            )}
            aria-pressed={activeTab === "favorite"}
            type="button"
            onClick={() => selectTab("favorite")}
          >
            {t("title.favorite")}
          </button>
        </li>
        <li {...stylex.props(leftSidebarTabStyles.item)}>
          <button
            {...stylex.props(
              leftSidebarTabStyles.button,
              activeTab === "project" && leftSidebarTabStyles.activeButton,
            )}
            aria-pressed={activeTab === "project"}
            type="button"
            onClick={() => selectTab("project")}
          >
            {t("title.project")}
          </button>
        </li>
        <li {...stylex.props(leftSidebarTabStyles.item)}>
          <button
            {...stylex.props(
              leftSidebarTabStyles.button,
              activeTab === "recent" && leftSidebarTabStyles.activeButton,
            )}
            aria-pressed={activeTab === "recent"}
            type="button"
            onClick={() => selectTab("recent")}
          >
            {t("title.recently.visited.issue")}
          </button>
        </li>
        <li {...stylex.props(leftSidebarTabStyles.item)}>
          <button
            {...stylex.props(leftSidebarTabStyles.refreshButton)}
            aria-label="Refresh"
            onClick={onRefresh}
            type="button"
          >
            <i aria-hidden="true" className="yobicon-refresh" />
          </button>
        </li>
      </ul>
      <div
        {...stylex.props(leftSidebarTabPanelStyles.panel)}
        data-stylex-owner="left-sidebar-tab-panel"
      >
        <div
          {...stylex.props(leftSidebarTabPanelStyles.content)}
          id="left-sidebar-tab-content-list"
        >
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
        <div
          {...stylex.props(leftSidebarFooterStyles.footer)}
          data-stylex-owner="left-sidebar-footer"
          id="sidebar-bottom"
        >
          Yoram, made by{" "}
          <i
            aria-hidden="true"
            className={`yobicon-hearts ${stylex.props(leftSidebarFooterStyles.heart).className}`}
          />
        </div>
      ) : null}
    </aside>
  );
}

const leftSidebarTabPanelStyles = stylex.create({
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

const leftSidebarTabStyles = stylex.create({
  tabs: {
    borderBottomStyle: "none",
    listStyle: "none",
    margin: 0,
    padding: 0,
    width: "270px",
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
    marginBottom: "-2px",
  },
  button: {
    appearance: "none",
    backgroundColor: {
      default: globalColors.transparent,
      ":hover": globalColors.leftSidebarTabSurface,
      ":focus": globalColors.leftSidebarTabSurface,
    },
    borderRadius: "4px 4px 0 0",
    borderStyle: "none",
    boxShadow: "none",
    color: {
      default: globalColors.leftSidebarTabText,
      ":hover": globalColors.leftSidebarTabAccent,
      ":focus": globalColors.leftSidebarTabAccent,
    },
    cursor: "pointer",
    display: "block",
    font: "inherit",
    fontWeight: "bold",
    lineHeight: "20px",
    marginRight: "2px",
    paddingBottom: "8px",
    paddingLeft: {
      default: "10px",
      "@media (max-width: 720px)": "5px",
    },
    paddingRight: {
      default: "10px",
      "@media (max-width: 720px)": "5px",
    },
    paddingTop: "8px",
  },
  activeButton: {
    backgroundColor: {
      default: globalColors.leftSidebarTabSurface,
      ":hover": globalColors.leftSidebarTabSurface,
      ":focus": globalColors.leftSidebarTabSurface,
    },
    color: {
      default: globalColors.leftSidebarTabAccent,
      ":hover": globalColors.leftSidebarTabAccent,
      ":focus": globalColors.leftSidebarTabAccent,
    },
    cursor: "default",
  },
  refreshButton: {
    appearance: "none",
    backgroundColor: globalColors.transparent,
    borderRadius: 0,
    borderStyle: "none",
    boxShadow: "none",
    boxSizing: "border-box",
    color: {
      default: "inherit",
      ":hover": globalColors.leftSidebarRefreshAccent,
      ":focus": globalColors.leftSidebarRefreshAccent,
    },
    cursor: "pointer",
    display: "block",
    font: "inherit",
    height: "29px",
    lineHeight: "13px",
    marginRight: 0,
    padding: "12px 0 0 6px",
  },
});

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

const leftSidebarFavoriteShellStyles = stylex.create({
  directFavoriteDivider: {
    borderTopColor: globalColors.leftSidebarFavoriteDividerBorder,
    borderTopStyle: "dashed",
    borderTopWidth: "1px",
  },
  group: {
    position: "relative",
  },
  input: {
    backgroundColor: globalColors.leftSidebarFavoriteSearchSurface,
    borderRadius: "unset",
    borderStyle: {
      default: "none",
      ":focus": "none",
    },
    boxSizing: "content-box",
    color: globalColors.leftSidebarFavoriteSearchText,
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
    "::before": {
      backgroundColor: globalColors.sidenavSearchFocusAccent,
      bottom: "1px",
      content: '""',
      height: "1px",
      left: "50%",
      position: "absolute",
      transition: "0.2s ease all",
      width: 0,
    },
    "::after": {
      backgroundColor: globalColors.sidenavSearchFocusAccent,
      bottom: "1px",
      content: '""',
      height: "1px",
      position: "absolute",
      right: "50%",
      transition: "0.2s ease all",
      width: 0,
    },
  },
  focusedBar: {
    "::before": {
      width: "50%",
    },
    "::after": {
      width: "50%",
    },
  },
  result: {
    display: "block",
    listStyle: "none",
    margin: "0 0 10px",
    maxHeight: "80vh",
    overflowX: "visible",
    overflowY: "auto",
    padding: 0,
    "::-webkit-scrollbar": {
      backgroundColor: globalColors.sidenavScrollbarTrack,
      height: "10px",
      width: "5px",
    },
    "::-webkit-scrollbar-thumb": {
      backgroundColor: globalColors.sidenavScrollbarThumb,
    },
  },
  noResult: {
    color: globalColors.sidenavNoResultText,
    fontSize: "16px",
    marginBottom: "25px",
    marginTop: "10px",
    textAlign: "center",
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
    "::before": {
      backgroundColor: globalColors.sidenavSearchFocusAccent,
      bottom: "1px",
      content: '""',
      height: "1px",
      left: "50%",
      position: "absolute",
      transition: "0.2s ease all",
      width: 0,
    },
    "::after": {
      backgroundColor: globalColors.sidenavSearchFocusAccent,
      bottom: "1px",
      content: '""',
      height: "1px",
      position: "absolute",
      right: "50%",
      transition: "0.2s ease all",
      width: 0,
    },
  },
  focusedBar: {
    "::before": {
      width: "50%",
    },
    "::after": {
      width: "50%",
    },
  },
  result: {
    listStyle: "none",
    margin: "0 0 10px",
    maxHeight: "80vh",
    overflowX: "visible",
    overflowY: "auto",
    padding: 0,
    "::-webkit-scrollbar": {
      backgroundColor: globalColors.sidenavScrollbarTrack,
      height: "10px",
      width: "5px",
    },
    "::-webkit-scrollbar-thumb": {
      backgroundColor: globalColors.sidenavScrollbarThumb,
    },
  },
  noResult: {
    color: globalColors.sidenavNoResultText,
    fontSize: "16px",
    marginBottom: "25px",
    marginTop: "10px",
    textAlign: "center",
  },
});

const leftSidebarFavoriteOrganizationRowStyles = stylex.create({
  row: {
    marginBottom: "8px",
    marginLeft: 0,
    marginTop: "3px",
    width: "270px",
  },
  header: {
    alignItems: "center",
    backgroundColor: {
      default: globalColors.transparent,
      ":hover": globalColors.leftSidebarFavoriteOrganizationHoverSurface,
    },
    cursor: {
      default: "auto",
      ":hover": "pointer",
    },
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-between",
    padding: "1px 0",
  },
  toggle: {
    alignItems: "center",
    appearance: "none",
    backgroundColor: globalColors.transparent,
    backgroundImage: "none",
    borderStyle: "none",
    boxShadow: "none",
    color: globalColors.leftSidebarFavoriteOrganizationText,
    cursor: "pointer",
    display: "flex",
    flexDirection: "row",
    flexGrow: 1,
    flexWrap: "nowrap",
    fontFamily: "inherit",
    fontSize: "14px",
    fontWeight: 400,
    justifyContent: "space-between",
    lineHeight: "inherit",
    margin: 0,
    minHeight: 0,
    overflow: "hidden",
    padding: 0,
    textAlign: "left",
    width: "auto",
  },
  logo: {
    color: globalColors.leftSidebarFavoriteOrganizationText,
    flexShrink: 0,
    marginLeft: "2px",
    overflow: "hidden",
    paddingTop: "3px",
    textAlign: "center",
    width: "26px",
  },
  nameOwner: {
    alignItems: "center",
    color: globalColors.leftSidebarFavoriteOrganizationText,
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
    color: globalColors.leftSidebarFavoriteOrganizationName,
    fontFamily: "Roboto, sans-serif",
    fontSize: "14px",
    maxWidth: "140px",
    minWidth: "50px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    WebkitFontSmoothing: "antialiased",
    whiteSpace: "nowrap",
  },
  count: {
    color: globalColors.leftSidebarFavoriteOrganizationCount,
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
  starPlaceholder: {
    flexShrink: 0,
    width: "29px",
  },
  starButton: {
    appearance: "none",
    backgroundColor: globalColors.transparent,
    borderStyle: "none",
    boxShadow: "none",
    boxSizing: "border-box",
    color: {
      default: globalColors.leftSidebarFavoriteOrganizationStarIdle,
      ":disabled": globalColors.leftSidebarFavoriteOrganizationStarIdle,
      ":focus": globalColors.leftSidebarFavoriteOrganizationStarActive,
      ":hover": globalColors.leftSidebarFavoriteOrganizationStarActive,
    },
    cursor: "pointer",
    flexShrink: 0,
    height: "16px",
    lineHeight: "normal",
    margin: 0,
    minHeight: 0,
    padding: 0,
    textAlign: "start",
    width: "29px",
  },
  starIcon: {
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
      default: globalColors.leftSidebarFavoriteOrganizationStarActive,
      ":hover": globalColors.leftSidebarFavoriteOrganizationStarActiveHover,
    },
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

const leftSidebarDirectProjectRowStyles = stylex.create({
  row: {
    color: globalColors.leftSidebarDirectProjectText,
    cursor: "pointer",
    lineHeight: "normal",
    marginLeft: 0,
  },
  list: {
    alignItems: "center",
    backgroundColor: {
      default: globalColors.transparent,
      ":hover": globalColors.leftSidebarDirectProjectHoverSurface,
    },
    cursor: "pointer",
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-between",
    padding: "4px 0",
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
    color: globalColors.leftSidebarDirectProjectAvatar,
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
      default: globalColors.leftSidebarDirectProjectText,
      ":focus": globalColors.leftSidebarDirectProjectText,
      ":hover": globalColors.leftSidebarDirectProjectText,
    },
    display: "contents",
    textDecoration: {
      default: "none",
      ":focus": "none",
      ":hover": "none",
    },
  },
  owner: {
    color: globalColors.leftSidebarDirectProjectOwnerText,
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
    color: globalColors.leftSidebarDirectProjectOwnerText,
    textDecoration: {
      default: "none",
      ":focus": "underline",
      ":hover": "underline",
    },
  },
  starButton: {
    appearance: "none",
    backgroundColor: globalColors.transparent,
    borderStyle: "none",
    boxShadow: "none",
    boxSizing: "border-box",
    color: {
      default: globalColors.leftSidebarDirectProjectStarIdle,
      ":disabled": globalColors.leftSidebarDirectProjectStarIdle,
      ":focus": globalColors.leftSidebarDirectProjectStarActive,
      ":hover": globalColors.leftSidebarDirectProjectStarActive,
    },
    cursor: "pointer",
    flexShrink: 0,
    height: "16px",
    lineHeight: "normal",
    margin: 0,
    minHeight: 0,
    padding: 0,
    textAlign: "start",
    width: "29px",
  },
  starIcon: {
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
      default: globalColors.leftSidebarDirectProjectStarActive,
      ":hover": globalColors.leftSidebarDirectProjectStarActiveHover,
    },
  },
});

const leftSidebarFavoriteNestedProjectRowStyles = stylex.create({
  hidden: { display: "none" },
  row: {
    color: globalColors.leftSidebarFavoriteNestedProjectText,
    cursor: "pointer",
    lineHeight: "normal",
    marginLeft: 0,
  },
  list: {
    alignItems: "center",
    backgroundColor: {
      default: globalColors.transparent,
      ":hover": globalColors.leftSidebarFavoriteNestedProjectHoverSurface,
    },
    cursor: "pointer",
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
    color: {
      default: globalColors.leftSidebarFavoriteNestedProjectText,
      ":focus": globalColors.leftSidebarFavoriteNestedProjectText,
      ":hover": globalColors.leftSidebarFavoriteNestedProjectText,
    },
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
  avatar: { color: globalColors.leftSidebarFavoriteNestedProjectAvatar },
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
  starButton: {
    appearance: "none",
    backgroundColor: globalColors.transparent,
    borderStyle: "none",
    boxShadow: "none",
    boxSizing: "border-box",
    color: {
      default: globalColors.leftSidebarFavoriteNestedProjectStarIdle,
      ":disabled": globalColors.leftSidebarFavoriteNestedProjectStarIdle,
      ":focus": globalColors.leftSidebarFavoriteNestedProjectStarActive,
      ":hover": globalColors.leftSidebarFavoriteNestedProjectStarActive,
    },
    cursor: "pointer",
    flexShrink: 0,
    height: "16px",
    lineHeight: "normal",
    margin: 0,
    minHeight: 0,
    padding: 0,
    textAlign: "start",
    width: "29px",
  },
  starIcon: {
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
      default: globalColors.leftSidebarFavoriteNestedProjectStarActive,
      ":hover": globalColors.leftSidebarFavoriteNestedProjectStarActiveHover,
    },
  },
  popover: {
    backgroundClip: "padding-box",
    backgroundColor: globalColors.leftSidebarFavoriteNestedProjectPopoverSurface,
    borderColor: globalColors.leftSidebarFavoriteNestedProjectPopoverBorder,
    borderRadius: "2px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: globalColors.leftSidebarFavoriteNestedProjectPopoverShadow,
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
    borderRightColor: globalColors.leftSidebarFavoriteNestedProjectPopoverArrowBorder,
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
      borderRightColor: globalColors.leftSidebarFavoriteNestedProjectPopoverSurface,
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
  popoverContent: { lineHeight: "120%", padding: "9px 10px" },
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

const authenticatedSidenavRecentIssueRowStyles = stylex.create({
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
    justifyContent: "space-between",
    overflow: "hidden",
    textDecoration: {
      default: "none",
      ":focus": "none",
      ":hover": "none",
    },
  },
  issue: {
    alignItems: "center",
    flexDirection: "row",
    flexGrow: 1,
    flexWrap: "nowrap",
    justifyContent: "space-between",
    overflow: "hidden",
    paddingBottom: "1px",
    paddingRight: 0,
    paddingTop: "1px",
  },
  marker: {
    color: globalColors.sidenavIssueTitleMarker,
    display: "inline-block",
    verticalAlign: "top",
    width: "10px",
  },
  title: {
    display: "inline-block",
    fontSize: "13px",
    maxWidth: "240px",
    whiteSpace: "break-spaces",
    wordBreak: "break-all",
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

const leftSidebarRecentIssueRowStyles = stylex.create({
  row: {
    cursor: "pointer",
    lineHeight: "normal",
  },
  list: {
    alignItems: "center",
    backgroundColor: {
      default: null,
      ":hover": globalColors.leftSidebarRecentIssueHoverSurface,
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
    color: globalColors.leftSidebarRecentIssueText,
    display: "flex",
    flexDirection: "row",
    flexGrow: 1,
    flexWrap: "nowrap",
    fontSize: "14px",
    fontWeight: 400,
    justifyContent: "space-between",
    overflow: "hidden",
    textDecoration: {
      default: "none",
      ":focus": "none",
      ":hover": "none",
    },
  },
  issue: {
    alignItems: "center",
    flexDirection: "row",
    flexGrow: 1,
    flexWrap: "nowrap",
    justifyContent: "space-between",
    overflow: "hidden",
    paddingBottom: "1px",
    paddingRight: 0,
    paddingTop: "1px",
  },
  marker: {
    color: globalColors.sidenavIssueTitleMarker,
    display: "inline-block",
    verticalAlign: "top",
    width: "10px",
  },
  title: {
    color: globalColors.leftSidebarRecentIssueText,
    display: "inline-block",
    fontSize: "13px",
    maxWidth: "240px",
    whiteSpace: "break-spaces",
    wordBreak: "break-all",
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
    textAlign: "right",
    width: "100%",
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
  menu: {
    color: globalColors.sidenavText,
    fontSize: "12px",
    marginLeft: "5px",
    marginRight: "5px",
    padding: "3px",
  },
  logout: {
    backgroundColor: globalColors.sidenavAccountLogoutSurface,
    borderRadius: "1px",
    color: globalColors.sidenavAccountLogoutText,
    display: "inline-block",
    fontWeight: "normal",
    lineHeight: "14px",
    textShadow: globalColors.sidenavAccountLogoutTextShadow,
    verticalAlign: "baseline",
    whiteSpace: "nowrap",
    ":hover": {
      backgroundColor: globalColors.sidenavLogoutHover,
    },
  },
});

const globalSidebarOpenPinStyles = stylex.create({
  root: {
    appearance: "none",
    backgroundColor: globalColors.globalSidebarOpenPinSurface,
    borderBottomColor: globalColors.globalSidebarOpenPinText,
    borderBottomStyle: "none",
    borderBottomWidth: globalColors.globalSidebarOpenPinBorderWidth,
    borderLeftColor: globalColors.globalSidebarOpenPinText,
    borderLeftStyle: "none",
    borderLeftWidth: globalColors.globalSidebarOpenPinBorderWidth,
    borderRadius: globalColors.globalSidebarOpenPinRadius,
    borderRightColor: globalColors.globalSidebarOpenPinText,
    borderRightStyle: "none",
    borderRightWidth: globalColors.globalSidebarOpenPinBorderWidth,
    borderTopColor: globalColors.globalSidebarOpenPinText,
    borderTopStyle: "none",
    borderTopWidth: globalColors.globalSidebarOpenPinBorderWidth,
    boxShadow: "none",
    boxSizing: "content-box",
    color: {
      default: globalColors.globalSidebarOpenPinText,
      ":focus": globalColors.globalSidebarOpenPinInteractionText,
    },
    cursor: {
      default: "auto",
      ":hover": "pointer",
    },
    display: "inline-block",
    fontSize: globalColors.globalSidebarOpenPinFontSize,
    left: globalColors.globalSidebarOpenPinLeft,
    lineHeight: globalColors.globalSidebarOpenPinLineHeight,
    margin: globalColors.globalSidebarOpenPinMargin,
    padding: globalColors.globalSidebarOpenPinPadding,
    position: "absolute",
    textAlign: "start",
    top: globalColors.globalSidebarOpenPinTop,
  },
  icon: {
    color: {
      default: "inherit",
      ":hover": globalColors.globalSidebarOpenPinInteractionText,
    },
    cursor: {
      default: "inherit",
      ":hover": "pointer",
    },
    display: "none",
    fontSize: globalColors.globalSidebarOpenPinFontSize,
    padding: globalColors.globalSidebarOpenPinIconPadding,
  },
  visibleIcon: {
    display: "block",
  },
});

const siteAdminAffixStyles = stylex.create({
  root: {
    backgroundColor: globalColors.siteAdminAffixSurface,
    boxSizing: "border-box",
    color: globalColors.siteAdminAffixText,
    fontSize: globalColors.siteAdminAffixFontSize,
    fontWeight: globalColors.siteAdminAffixFontWeight,
    padding: globalColors.siteAdminAffixPadding,
    textAlign: "center",
    width: {
      default: globalColors.siteAdminAffixWidth,
      "@media (max-width: 720px)": "auto",
    },
    zIndex: globalColors.siteAdminAffixZIndex,
  },
  detail: {
    fontSize: globalColors.siteAdminAffixDetailFontSize,
    fontWeight: globalColors.siteAdminAffixDetailFontWeight,
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
    top: globalColors.sidenavBaseTop,
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
  adminAffixTop: {
    top: globalColors.sidenavAdminAffixTop,
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
    backgroundColor: globalColors.transparent,
    borderStyle: "none",
    borderWidth: 0,
    color: "inherit",
    cursor: "pointer",
    display: "inline-block",
    font: "inherit",
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
  sidenavUsesAdminAffixTop,
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
        className={`${isSidebarOpen ? "sidenav sidenav-open" : "sidenav"} ${stylex.props(authenticatedSidenavShellStyles.shell, sidenavUsesAdminAffixTop && authenticatedSidenavShellStyles.adminAffixTop, isSidebarOpen && authenticatedSidenavShellStyles.open).className}`}
        data-stylex-owner="authenticated-site-sidenav-shell"
      >
        <div
          className={`span5 right-menu span-hard-wrap ${stylex.props(authenticatedSidenavContentFrameStyles.frame).className}`}
          data-stylex-owner="authenticated-sidenav-content-frame"
        >
          <div
            {...stylex.props(authenticatedSidenavAccountActionStyles.row)}
            data-stylex-owner="authenticated-sidenav-account-actions"
          >
            <span {...stylex.props(authenticatedSidenavAccountActionStyles.menu)}>
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
            <span {...stylex.props(authenticatedSidenavAccountActionStyles.menu)}>
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
              <span
                {...stylex.props(
                  authenticatedSidenavAccountActionStyles.menu,
                  authenticatedSidenavAccountActionStyles.logout,
                )}
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
            className={
              stylex.props(
                authenticatedSiteUserMenuStyles.dropdownButton,
                authenticatedSiteUserMenuStyles.dropdownToggle,
              ).className
            }
            title={`${t("user.menu")}, ${t("title.shortcut")} (F)`}
            aria-controls="mySidenav"
            aria-expanded={isSidebarOpen}
            onClick={handleSidebarToggleClick}
          >
            <span className="avatar-wrap smaller">
              <img src={avatarUrl} alt="" />
            </span>{" "}
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
            className={
              stylex.props(
                authenticatedSiteUserMenuStyles.dropdownButton,
                authenticatedSiteUserMenuStyles.dropdownToggle,
                authenticatedSiteUserMenuStyles.createButton,
              ).className
            }
            onClick={handleCreateMenuToggleClick}
          >
            <i className="yobicon-plus"></i>{" "}
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
      return `${tab === "recent" ? "user-project-list " : ""}${
        stylex.props(
          leftSidebarTabPanelStyles.pane,
          isActive && leftSidebarTabPanelStyles.activePane,
        ).className
      }`;
    }
    return `tab-pane user-project-list${isActive ? " active" : ""}${
      isAuthenticatedSidenav
        ? ` ${
            stylex.props(
              authenticatedSidenavTabPanelStyles.pane,
              isActive && authenticatedSidenavTabPanelStyles.activePane,
            ).className
          }`
        : ""
    }`;
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
      className={
        usesLeftFavoriteNestedProjectOwner
          ? stylex.props(leftSidebarFavoriteNestedProjectRowStyles.starButton).className
          : usesLeftFavoriteOrganizationOwner
            ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.starButton).className
            : usesLeftDirectProjectOwner
              ? stylex.props(leftSidebarDirectProjectRowStyles.starButton).className
              : `${target.type === "project" ? "star-project" : "star-org"} flex-item ${
                  stylex.props(
                    (usesAuthenticatedFavoriteOwner || usesAuthenticatedDirectProjectOwner) &&
                      authenticatedSidenavFavoriteStarStyles.button,
                  ).className
                }`.trimEnd()
      }
      data-stylex-owner={
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
      data-stylex-owner-state={
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
            ? stylex.props(
                leftSidebarFavoriteNestedProjectRowStyles.starIcon,
                isFavorited && leftSidebarFavoriteNestedProjectRowStyles.starredIcon,
              ).className
            : usesLeftFavoriteOrganizationOwner
              ? stylex.props(
                  leftSidebarFavoriteOrganizationRowStyles.starIcon,
                  isFavorited && leftSidebarFavoriteOrganizationRowStyles.starredIcon,
                ).className
              : usesLeftDirectProjectOwner
                ? stylex.props(
                    leftSidebarDirectProjectRowStyles.starIcon,
                    isFavorited && leftSidebarDirectProjectRowStyles.starredIcon,
                  ).className
                : `${isFavorited ? "star starred material-icons" : "star material-icons"} ${
                    stylex.props(
                      (usesAuthenticatedFavoriteOwner || usesAuthenticatedDirectProjectOwner) &&
                        authenticatedSidenavFavoriteStarStyles.icon,
                      (usesAuthenticatedFavoriteOwner || usesAuthenticatedDirectProjectOwner) &&
                        isFavorited &&
                        authenticatedSidenavFavoriteStarStyles.starredIcon,
                    ).className
                  }`.trimEnd()
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
  const favoriteShellGroupClass = isAuthenticatedSidenav
    ? ` ${stylex.props(authenticatedSidenavFavoriteShellStyles.group).className}`
    : "";
  const favoriteShellInputClass = isAuthenticatedSidenav
    ? ` ${stylex.props(authenticatedSidenavFavoriteShellStyles.input).className}`
    : "";
  const favoriteShellBarClass = isAuthenticatedSidenav
    ? ` ${
        stylex.props(
          authenticatedSidenavFavoriteShellStyles.bar,
          isSearchFocused && authenticatedSidenavFavoriteShellStyles.focusedBar,
        ).className
      }`
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
  const leftFavoriteShellGroupClass = stylex.props(
    isLeftSidebarFavoriteShell && leftSidebarFavoriteShellStyles.group,
  ).className;
  const leftFavoriteShellInputClass = stylex.props(
    isLeftSidebarFavoriteShell && leftSidebarFavoriteShellStyles.input,
  ).className;
  const leftFavoriteShellBarClass = stylex.props(
    isLeftSidebarFavoriteShell && leftSidebarFavoriteShellStyles.bar,
    isLeftSidebarFavoriteShell && isSearchFocused && leftSidebarFavoriteShellStyles.focusedBar,
  ).className;
  const leftFavoriteShellResultClass = stylex.props(
    isLeftSidebarFavoriteShell && leftSidebarFavoriteShellStyles.result,
  ).className;
  const leftFavoriteShellNoResultClass = stylex.props(
    isLeftSidebarFavoriteShell && leftSidebarFavoriteShellStyles.result,
    isLeftSidebarFavoriteShell && leftSidebarFavoriteShellStyles.noResult,
  ).className;

  if (
    ownProjects.length === 0 &&
    favoriteOrganizations.length === 0 &&
    organizations.length === 0 &&
    directFavoriteProjects.length === 0
  ) {
    return (
      <div
        className={isLeftSidebarFavoriteShell ? undefined : "search-result"}
        data-stylex-owner={favoriteShellOwner}
      >
        <div
          className={
            isLeftSidebarFavoriteShell
              ? leftFavoriteShellGroupClass
              : `group${favoriteShellGroupClass}`
          }
        >
          <input
            className={
              isLeftSidebarFavoriteShell
                ? leftFavoriteShellInputClass
                : `search-input org-search${favoriteShellInputClass}`
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
            className={
              isLeftSidebarFavoriteShell ? leftFavoriteShellBarClass : `bar${favoriteShellBarClass}`
            }
          ></span>
        </div>
        <div
          id={sidebarDomId(idPrefix, "organizations")}
          className={
            isLeftSidebarFavoriteShell
              ? leftFavoriteShellNoResultClass
              : `no-result tab-pane user-ul${favoriteShellNoResultClass}`
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
      data-stylex-owner={favoriteShellOwner}
    >
      <div
        className={
          isLeftSidebarFavoriteShell
            ? leftFavoriteShellGroupClass
            : `group${favoriteShellGroupClass}`
        }
      >
        <input
          className={
            isLeftSidebarFavoriteShell
              ? leftFavoriteShellInputClass
              : `search-input org-search${favoriteShellInputClass}`
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
          className={
            isLeftSidebarFavoriteShell ? leftFavoriteShellBarClass : `bar${favoriteShellBarClass}`
          }
        ></span>
      </div>
      <ul
        className={
          isLeftSidebarFavoriteShell
            ? leftFavoriteShellResultClass
            : `tab-pane user-ul${favoriteShellResultClass}`
        }
        id={sidebarDomId(idPrefix, "organizations")}
      >
        {ownProjects.length > 0 && showOwnProjects ? (
          <li
            className={
              isLeftSidebarFavoriteShell
                ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.row).className
                : `org-li ${
                    stylex.props(
                      isAuthenticatedSidenav &&
                        authenticatedSidenavFavoriteOrganizationRowStyles.row,
                    ).className
                  }`.trimEnd()
            }
            data-stylex-owner={
              isLeftSidebarFavoriteShell
                ? "left-sidebar-favorite-organization-rows"
                : isAuthenticatedSidenav
                  ? "authenticated-sidenav-favorite-organization-rows"
                  : undefined
            }
          >
            <div
              className={
                isLeftSidebarFavoriteShell
                  ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.header).className
                  : `org-list project-flex-container all-orgs ${
                      stylex.props(
                        isAuthenticatedSidenav &&
                          authenticatedSidenavFavoriteOrganizationRowStyles.header,
                      ).className
                    }`.trimEnd()
              }
            >
              <button
                aria-expanded={isOwnProjectsExpanded}
                className={
                  isLeftSidebarFavoriteShell
                    ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.toggle).className
                    : `project-item project-item-container organization-toggle ${
                        stylex.props(
                          isAuthenticatedSidenav &&
                            authenticatedSidenavFavoriteOrganizationRowStyles.projectItem,
                          isAuthenticatedSidenav &&
                            authenticatedSidenavFavoriteOrganizationRowStyles.itemContainer,
                          isAuthenticatedSidenav &&
                            authenticatedSidenavFavoriteOrganizationRowStyles.toggle,
                        ).className
                      }`.trimEnd()
                }
                onClick={() => setIsOwnProjectsExpanded((expanded) => !expanded)}
                type="button"
              >
                <div
                  className={
                    isLeftSidebarFavoriteShell
                      ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.logo).className
                      : `flex-item site-logo ${
                          stylex.props(
                            isAuthenticatedSidenav &&
                              authenticatedSidenavFavoriteOrganizationRowStyles.logo,
                          ).className
                        }`.trimEnd()
                  }
                >
                  <i className="yobicon-angle-right"></i>
                </div>
                <div
                  className={
                    isLeftSidebarFavoriteShell
                      ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.nameOwner).className
                      : `projectName-owner all-org-names flex-item ${
                          stylex.props(
                            isAuthenticatedSidenav &&
                              authenticatedSidenavFavoriteOrganizationRowStyles.nameOwner,
                          ).className
                        }`.trimEnd()
                  }
                >
                  <div
                    className={
                      isLeftSidebarFavoriteShell
                        ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.name).className
                        : `project-name org-name flex-item ${
                            stylex.props(
                              isAuthenticatedSidenav &&
                                authenticatedSidenavFavoriteOrganizationRowStyles.name,
                            ).className
                          }`.trimEnd()
                    }
                  >
                    {loginId}
                  </div>
                  <div
                    className={
                      isLeftSidebarFavoriteShell
                        ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.count).className
                        : `project-owner flex-item sub-project-counter ${
                            stylex.props(
                              isAuthenticatedSidenav &&
                                authenticatedSidenavFavoriteOrganizationRowStyles.owner,
                            ).className
                          }`.trimEnd()
                    }
                  >
                    {ownProjects.length}
                  </div>
                </div>
              </button>
              <div
                className={
                  isLeftSidebarFavoriteShell
                    ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.starPlaceholder)
                        .className
                    : `star-org flex-item ${
                        stylex.props(
                          isAuthenticatedSidenav &&
                            authenticatedSidenavFavoriteStarStyles.placeholder,
                        ).className
                      }`.trimEnd()
                }
                data-stylex-owner={
                  isLeftSidebarFavoriteShell
                    ? "left-sidebar-favorite-organization-rows"
                    : isAuthenticatedSidenav
                      ? "authenticated-sidenav-favorite-stars"
                      : undefined
                }
                data-stylex-owner-state={
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
        <ul
          className={
            isLeftSidebarFavoriteShell
              ? stylex.props(leftSidebarFavoriteShellStyles.directFavoriteDivider).className
              : "etc-favorites"
          }
        ></ul>
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
      className={
        isLeftSidebar
          ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.row).className
          : `org-li${isLast ? " favored" : ""} ${
              stylex.props(
                isAuthenticatedSidenav && authenticatedSidenavFavoriteOrganizationRowStyles.row,
              ).className
            }`.trimEnd()
      }
      data-stylex-owner={
        isLeftSidebar
          ? "left-sidebar-favorite-organization-rows"
          : isAuthenticatedSidenav
            ? "authenticated-sidenav-favorite-organization-rows"
            : undefined
      }
    >
      <div
        className={
          isLeftSidebar
            ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.header).className
            : `org-list project-flex-container all-orgs ${
                stylex.props(
                  isAuthenticatedSidenav &&
                    authenticatedSidenavFavoriteOrganizationRowStyles.header,
                ).className
              }`.trimEnd()
        }
      >
        <button
          aria-expanded={showNonFavoriteProjects}
          className={
            isLeftSidebar
              ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.toggle).className
              : `project-item project-item-container organization-toggle ${
                  stylex.props(
                    isAuthenticatedSidenav &&
                      authenticatedSidenavFavoriteOrganizationRowStyles.projectItem,
                    isAuthenticatedSidenav &&
                      authenticatedSidenavFavoriteOrganizationRowStyles.itemContainer,
                    isAuthenticatedSidenav &&
                      authenticatedSidenavFavoriteOrganizationRowStyles.toggle,
                    isAuthenticatedSidenav &&
                      authenticatedSidenavFavoriteOrganizationRowStyles.realOrganizationToggle,
                  ).className
                }`.trimEnd()
          }
          onClick={() => setShowNonFavoriteProjects((expanded) => !expanded)}
          type="button"
        >
          <div
            className={
              isLeftSidebar
                ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.logo).className
                : `flex-item site-logo ${
                    stylex.props(
                      isAuthenticatedSidenav &&
                        authenticatedSidenavFavoriteOrganizationRowStyles.logo,
                    ).className
                  }`.trimEnd()
            }
          >
            <i className="yobicon-angle-right"></i>
          </div>
          <div
            className={
              isLeftSidebar
                ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.nameOwner).className
                : `projectName-owner all-org-names flex-item ${
                    stylex.props(
                      isAuthenticatedSidenav &&
                        authenticatedSidenavFavoriteOrganizationRowStyles.nameOwner,
                    ).className
                  }`.trimEnd()
            }
          >
            <div
              className={
                isLeftSidebar
                  ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.name).className
                  : `project-name org-name flex-item ${
                      stylex.props(
                        isAuthenticatedSidenav &&
                          authenticatedSidenavFavoriteOrganizationRowStyles.name,
                      ).className
                    }`.trimEnd()
              }
            >
              {organizationName}
            </div>
            <div
              className={
                isLeftSidebar
                  ? stylex.props(leftSidebarFavoriteOrganizationRowStyles.count).className
                  : `project-owner flex-item ${
                      stylex.props(
                        isAuthenticatedSidenav &&
                          authenticatedSidenavFavoriteOrganizationRowStyles.owner,
                      ).className
                    }`.trimEnd()
              }
            >
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
          ? stylex.props(
              leftSidebarFavoriteNestedProjectRowStyles.row,
              !favored && !showNonFavorite && leftSidebarFavoriteNestedProjectRowStyles.hidden,
            ).className
          : `user-li${favored ? " show-always" : showNonFavorite ? "" : " hide"} ${
              stylex.props(
                isAuthenticatedSidenav && authenticatedSidenavFavoriteProjectRowStyles.row,
              ).className
            }`.trimEnd()
      }
      data-stylex-owner={
        isLeftSidebarFavorite
          ? "left-sidebar-favorite-nested-project-rows"
          : isAuthenticatedSidenav
            ? "authenticated-sidenav-favorite-project-rows"
            : undefined
      }
    >
      <SidebarHoverPopover
        content={overview}
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
              ? stylex.props(leftSidebarFavoriteNestedProjectRowStyles.link).className
              : `project-item project-item-container sidebar-project-link sidebar-row-link ${
                  stylex.props(
                    isAuthenticatedSidenav && authenticatedSidenavFavoriteProjectRowStyles.link,
                  ).className
                }`.trimEnd()
          }
          params={{ ownerName, projectName }}
          to="/$ownerName/$projectName"
        >
          <div
            className={
              isLeftSidebarFavorite
                ? stylex.props(leftSidebarFavoriteNestedProjectRowStyles.logo).className
                : `flex-item site-logo all-project-names ${stylex.props(isAuthenticatedSidenav && authenticatedSidenavFavoriteProjectRowStyles.logo).className}`.trimEnd()
            }
          >
            <i
              className={
                isLeftSidebarFavorite
                  ? stylex.props(leftSidebarFavoriteNestedProjectRowStyles.avatar).className
                  : `project-avatar ${stylex.props(isAuthenticatedSidenav && authenticatedSidenavFavoriteProjectRowStyles.avatar).className}`.trimEnd()
              }
            >
              {logoUrl ? (
                <img
                  alt=""
                  className={
                    isLeftSidebarFavorite
                      ? stylex.props(leftSidebarFavoriteNestedProjectRowStyles.image).className
                      : `logo ${stylex.props(isAuthenticatedSidenav && authenticatedSidenavFavoriteProjectRowStyles.image).className}`.trimEnd()
                  }
                  src={logoUrl}
                />
              ) : (
                <span className="dummy-25px"> </span>
              )}
            </i>
          </div>
          <div
            className={
              isLeftSidebarFavorite
                ? stylex.props(leftSidebarFavoriteNestedProjectRowStyles.nameOwner).className
                : `projectName-owner flex-item ${stylex.props(isAuthenticatedSidenav && authenticatedSidenavFavoriteProjectRowStyles.nameOwner).className}`.trimEnd()
            }
          >
            <div
              className={
                isLeftSidebarFavorite
                  ? stylex.props(leftSidebarFavoriteNestedProjectRowStyles.name).className
                  : `project-name flex-item ${stylex.props(isAuthenticatedSidenav && authenticatedSidenavFavoriteProjectRowStyles.name).className}`.trimEnd()
              }
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

const leftSidebarProjectShellStyles = stylex.create({
  group: {
    position: "relative",
  },
  input: {
    backgroundColor: globalColors.leftSidebarProjectSearchSurface,
    borderRadius: 0,
    borderStyle: "none",
    borderWidth: 0,
    boxSizing: "content-box",
    color: globalColors.leftSidebarProjectSearchText,
    display: "block",
    fontSize: "14px",
    height: "34px",
    marginBottom: 0,
    outline: "none",
    width: "99%",
    ":focus": {
      borderStyle: "none",
      borderWidth: 0,
      outline: "none",
    },
  },
  bar: {
    display: "block",
    position: "relative",
    "::before": {
      backgroundColor: globalColors.sidenavSearchFocusAccent,
      bottom: "1px",
      content: '""',
      height: "1px",
      left: "50%",
      position: "absolute",
      transition: "0.2s ease all",
      width: 0,
    },
    "::after": {
      backgroundColor: globalColors.sidenavSearchFocusAccent,
      bottom: "1px",
      content: '""',
      height: "1px",
      position: "absolute",
      right: "50%",
      transition: "0.2s ease all",
      width: 0,
    },
  },
  focusedBar: {
    "::before": {
      width: "50%",
    },
    "::after": {
      width: "50%",
    },
  },
  tabContent: {
    overflow: "hidden",
  },
  pane: {
    display: "none",
    listStyleType: "none",
    margin: "0 0 10px",
    maxHeight: "80vh",
    overflowX: "visible",
    overflowY: "auto",
    padding: 0,
    "::-webkit-scrollbar": {
      backgroundColor: globalColors.sidenavScrollbarTrack,
      height: "10px",
      width: "5px",
    },
    "::-webkit-scrollbar-thumb": {
      backgroundColor: globalColors.sidenavScrollbarThumb,
    },
  },
  activePane: {
    display: "block",
  },
  noResult: {
    color: globalColors.sidenavNoResultText,
    fontSize: "16px",
    marginBottom: "25px",
    marginTop: "10px",
    textAlign: "center",
  },
});

const authenticatedSidenavProjectShellStyles = stylex.create({
  group: {
    position: "relative",
  },
  input: {
    borderRadius: 0,
    borderStyle: "none",
    borderWidth: 0,
    boxSizing: "content-box",
    display: "block",
    fontSize: "14px",
    height: "34px",
    marginBottom: 0,
    outline: "none",
    width: "99%",
    ":focus": {
      borderStyle: "none",
      borderWidth: 0,
      outline: "none",
    },
  },
  bar: {
    display: "block",
    position: "relative",
    "::before": {
      backgroundColor: globalColors.sidenavSearchFocusAccent,
      bottom: "1px",
      content: '""',
      height: "1px",
      left: "50%",
      position: "absolute",
      transition: "0.2s ease all",
      width: 0,
    },
    "::after": {
      backgroundColor: globalColors.sidenavSearchFocusAccent,
      bottom: "1px",
      content: '""',
      height: "1px",
      position: "absolute",
      right: "50%",
      transition: "0.2s ease all",
      width: 0,
    },
  },
  focusedBar: {
    "::before": {
      width: "50%",
    },
    "::after": {
      width: "50%",
    },
  },
  tabContent: {
    overflow: "hidden",
  },
  pane: {
    display: "none",
    listStyleType: "none",
    margin: "0 0 10px",
    maxHeight: "80vh",
    overflowX: "visible",
    overflowY: "auto",
    padding: 0,
    "::-webkit-scrollbar": {
      backgroundColor: globalColors.sidenavScrollbarTrack,
      height: "10px",
      width: "5px",
    },
    "::-webkit-scrollbar-thumb": {
      backgroundColor: globalColors.sidenavScrollbarThumb,
    },
  },
  activePane: {
    display: "block",
  },
  noResult: {
    color: globalColors.sidenavNoResultText,
    fontSize: "16px",
    marginBottom: "25px",
    marginTop: "10px",
    textAlign: "center",
  },
});

const leftSidebarProjectSubtabStyles = stylex.create({
  wrap: {
    padding: "10px 0 5px",
  },
  list: {
    backgroundColor: globalColors.leftSidebarProjectSubtabSurface,
    color: globalColors.leftSidebarProjectSubtabText,
    display: "inline-block",
    listStyleType: "none",
    margin: 0,
    padding: 0,
  },
  item: {
    borderStyle: "none",
    borderWidth: 0,
    display: "inline-block",
    marginLeft: 0,
  },
  button: {
    appearance: "none",
    backgroundColor: globalColors.transparent,
    borderRadius: 0,
    borderStyle: "none",
    borderWidth: 0,
    boxShadow: "none",
    color: "inherit",
    cursor: "pointer",
    display: "block",
    font: "inherit",
    margin: 0,
    padding: "5px 8px",
    ":hover": {
      backgroundColor: globalColors.transparent,
      borderBottomColor: globalColors.leftSidebarProjectSubtabAccent,
      borderBottomStyle: "solid",
      borderBottomWidth: "1px",
      color: globalColors.leftSidebarProjectSubtabText,
      textDecoration: "none",
    },
    ":focus": {
      backgroundColor: globalColors.transparent,
      borderBottomColor: globalColors.leftSidebarProjectSubtabAccent,
      borderBottomStyle: "solid",
      borderBottomWidth: "1px",
      color: globalColors.leftSidebarProjectSubtabText,
      textDecoration: "none",
    },
  },
  activeButton: {
    backgroundColor: globalColors.leftSidebarProjectSubtabAccent,
    borderBottomColor: globalColors.leftSidebarProjectSubtabAccent,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    color: globalColors.leftSidebarProjectSubtabActiveText,
    textDecoration: "none",
    ":hover": {
      backgroundColor: globalColors.leftSidebarProjectSubtabAccent,
      color: globalColors.leftSidebarProjectSubtabActiveText,
    },
    ":focus": {
      backgroundColor: globalColors.leftSidebarProjectSubtabAccent,
      color: globalColors.leftSidebarProjectSubtabActiveText,
    },
  },
});

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
          data-stylex-owner={
            isLeftSidebar
              ? "left-sidebar-project-shell"
              : isAuthenticatedSidenav
                ? "authenticated-sidenav-project-shell"
                : undefined
          }
        >
          <div
            className={
              isLeftSidebar
                ? stylex.props(leftSidebarProjectShellStyles.group).className
                : `group ${
                    stylex.props(
                      isAuthenticatedSidenav && authenticatedSidenavProjectShellStyles.group,
                    ).className
                  }`.trimEnd()
            }
          >
            <input
              className={
                isLeftSidebar
                  ? stylex.props(leftSidebarProjectShellStyles.input).className
                  : `search-input project-search ${
                      stylex.props(
                        isAuthenticatedSidenav && authenticatedSidenavProjectShellStyles.input,
                      ).className
                    }`.trimEnd()
              }
              type="text"
              id={sidebarDomId(idPrefix, "query")}
              autoComplete="off"
              onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
              onBlur={() => setIsSearchFocused(false)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder={t("title.type.name")}
              value={searchQuery}
            />
            <span
              className={
                isLeftSidebar
                  ? stylex.props(
                      leftSidebarProjectShellStyles.bar,
                      isSearchFocused && leftSidebarProjectShellStyles.focusedBar,
                    ).className
                  : `bar ${
                      stylex.props(
                        isAuthenticatedSidenav && authenticatedSidenavProjectShellStyles.bar,
                        isAuthenticatedSidenav &&
                          isSearchFocused &&
                          authenticatedSidenavProjectShellStyles.focusedBar,
                      ).className
                    }`.trimEnd()
              }
            ></span>
          </div>
          <div
            className={
              isLeftSidebar
                ? stylex.props(leftSidebarProjectSubtabStyles.wrap).className
                : `subtab-wrap subtab-group${
                    isAuthenticatedSidenav
                      ? ` ${stylex.props(authenticatedSidenavProjectSubtabStyles.wrap).className}`
                      : ""
                  }`
            }
            data-stylex-owner={
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
                  ? stylex.props(leftSidebarProjectSubtabStyles.list).className
                  : `nav-subtab unstyled${
                      isAuthenticatedSidenav
                        ? ` ${stylex.props(authenticatedSidenavProjectSubtabStyles.list).className}`
                        : ""
                    }`
              }
            >
              {subtabs.map(([subtab, messageKey], index) => (
                <React.Fragment key={subtab}>
                  <li
                    className={
                      isLeftSidebar
                        ? stylex.props(leftSidebarProjectSubtabStyles.item).className
                        : `${activeSubtab === subtab ? "active" : ""}${
                            isAuthenticatedSidenav
                              ? ` ${stylex.props(authenticatedSidenavProjectSubtabStyles.item).className}`
                              : ""
                          }`.trim()
                    }
                  >
                    <button
                      type="button"
                      aria-pressed={isLeftSidebar ? activeSubtab === subtab : undefined}
                      className={
                        isLeftSidebar
                          ? stylex.props(
                              leftSidebarProjectSubtabStyles.button,
                              activeSubtab === subtab &&
                                leftSidebarProjectSubtabStyles.activeButton,
                            ).className
                          : isAuthenticatedSidenav
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
          <div
            className={
              isLeftSidebar
                ? stylex.props(leftSidebarProjectShellStyles.tabContent).className
                : `tab-content ${
                    stylex.props(
                      isAuthenticatedSidenav && authenticatedSidenavProjectShellStyles.tabContent,
                    ).className
                  }`.trimEnd()
            }
          >
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
        id={paneId}
        className={
          isLeftSidebar
            ? stylex.props(
                leftSidebarProjectShellStyles.pane,
                active && leftSidebarProjectShellStyles.activePane,
                leftSidebarProjectShellStyles.noResult,
              ).className
            : `no-result tab-pane user-ul ${active ? "active" : ""} ${
                stylex.props(
                  isAuthenticatedSidenav && authenticatedSidenavProjectShellStyles.pane,
                  isAuthenticatedSidenav &&
                    active &&
                    authenticatedSidenavProjectShellStyles.activePane,
                  isAuthenticatedSidenav && authenticatedSidenavProjectShellStyles.noResult,
                ).className
              }`.trimEnd()
        }
      >
        {t("title.no.results")}
      </div>
    );
  }
  return (
    <ul
      className={
        isLeftSidebar
          ? stylex.props(
              leftSidebarProjectShellStyles.pane,
              active && leftSidebarProjectShellStyles.activePane,
            ).className
          : `tab-pane user-ul ${active ? "active" : ""} ${
              stylex.props(
                isAuthenticatedSidenav && authenticatedSidenavProjectShellStyles.pane,
                isAuthenticatedSidenav &&
                  active &&
                  authenticatedSidenavProjectShellStyles.activePane,
              ).className
            }`.trimEnd()
      }
      id={paneId}
    >
      {visibleProjects.map((project) => (
        <SidebarProjectItem
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
  isLeftSidebar = false,
  project,
  runtimeConfig,
}: {
  isAuthenticatedFavoritePane?: boolean;
  isLeftSidebar?: boolean;
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
      className={
        isLeftSidebar
          ? stylex.props(leftSidebarDirectProjectRowStyles.row).className
          : `user-li ${stylex.props(authenticatedSidenavDirectProjectRowStyles.row).className}`
      }
      data-stylex-owner={
        isLeftSidebar
          ? "left-sidebar-direct-project-rows"
          : "authenticated-sidenav-direct-project-rows"
      }
    >
      <div
        className={
          isLeftSidebar
            ? stylex.props(leftSidebarDirectProjectRowStyles.list).className
            : `project-list project-flex-container ${stylex.props(authenticatedSidenavDirectProjectRowStyles.list).className}`
        }
      >
        <div
          className={
            isLeftSidebar
              ? stylex.props(leftSidebarDirectProjectRowStyles.item).className
              : `project-item project-item-container ${stylex.props(authenticatedSidenavDirectProjectRowStyles.item).className}`
          }
        >
          <div
            className={
              isLeftSidebar
                ? stylex.props(leftSidebarDirectProjectRowStyles.logo).className
                : `flex-item site-logo ${stylex.props(authenticatedSidenavDirectProjectRowStyles.logo).className}`
            }
          >
            <Link
              aria-label={`Open ${ownerName}/${projectName}`}
              className={
                stylex.props(
                  isLeftSidebar
                    ? leftSidebarDirectProjectRowStyles.projectLink
                    : authenticatedSidenavDirectProjectRowStyles.projectLink,
                ).className
              }
              params={{ ownerName, projectName }}
              to="/$ownerName/$projectName"
            >
              <i
                className={
                  isLeftSidebar
                    ? stylex.props(leftSidebarDirectProjectRowStyles.avatar).className
                    : `project-avatar ${stylex.props(authenticatedSidenavDirectProjectRowStyles.avatar).className}`
                }
              >
                {logoUrl ? (
                  <img
                    alt=""
                    className={
                      isLeftSidebar
                        ? stylex.props(leftSidebarDirectProjectRowStyles.image).className
                        : `logo ${stylex.props(authenticatedSidenavDirectProjectRowStyles.image).className}`
                    }
                    src={logoUrl}
                  />
                ) : (
                  <span className={isLeftSidebar ? undefined : "dummy-25px"}> </span>
                )}
              </i>
            </Link>
          </div>
          <div
            className={
              isLeftSidebar
                ? stylex.props(leftSidebarDirectProjectRowStyles.nameOwner).className
                : `projectName-owner flex-item ${stylex.props(authenticatedSidenavDirectProjectRowStyles.nameOwner).className}`
            }
          >
            <div
              className={
                isLeftSidebar
                  ? stylex.props(leftSidebarDirectProjectRowStyles.name).className
                  : `project-name flex-item ${stylex.props(authenticatedSidenavDirectProjectRowStyles.name).className}`
              }
            >
              <Link
                className={
                  stylex.props(
                    isLeftSidebar
                      ? leftSidebarDirectProjectRowStyles.projectLink
                      : authenticatedSidenavDirectProjectRowStyles.projectLink,
                  ).className
                }
                params={{ ownerName, projectName }}
                to="/$ownerName/$projectName"
              >
                {projectName} {isPrivate ? <i className="yobicon-lock yobicon-small"></i> : null}
              </Link>
            </div>
            <div
              className={
                isLeftSidebar
                  ? stylex.props(leftSidebarDirectProjectRowStyles.owner).className
                  : `project-owner flex-item ${stylex.props(authenticatedSidenavDirectProjectRowStyles.owner).className}`
              }
            >
              <Link
                className={
                  stylex.props(
                    isLeftSidebar
                      ? leftSidebarDirectProjectRowStyles.ownerLink
                      : authenticatedSidenavDirectProjectRowStyles.ownerLink,
                  ).className
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
      </div>
    </li>
  );
}

const authenticatedSidenavRecentShellStyles = stylex.create({
  group: {
    position: "relative",
  },
  input: {
    borderRadius: 0,
    borderStyle: "none",
    borderWidth: 0,
    boxSizing: "content-box",
    display: "block",
    fontSize: "14px",
    height: "34px",
    marginBottom: 0,
    outline: "none",
    width: "99%",
    ":focus": {
      borderStyle: "none",
      borderWidth: 0,
      outline: "none",
    },
  },
  bar: {
    display: "block",
    position: "relative",
    "::before": {
      backgroundColor: globalColors.sidenavSearchFocusAccent,
      bottom: "1px",
      content: '""',
      height: "1px",
      left: "50%",
      position: "absolute",
      transition: "0.2s ease all",
      width: 0,
    },
    "::after": {
      backgroundColor: globalColors.sidenavSearchFocusAccent,
      bottom: "1px",
      content: '""',
      height: "1px",
      position: "absolute",
      right: "50%",
      transition: "0.2s ease all",
      width: 0,
    },
  },
  focusedBar: {
    "::before": {
      width: "50%",
    },
    "::after": {
      width: "50%",
    },
  },
  tabContent: {
    overflow: "hidden",
  },
  pane: {
    display: "none",
    listStyleType: "none",
    margin: "0 0 10px",
    maxHeight: "80vh",
    overflowX: "visible",
    overflowY: "auto",
    padding: 0,
    "::-webkit-scrollbar": {
      backgroundColor: globalColors.sidenavScrollbarTrack,
      height: "10px",
      width: "5px",
    },
    "::-webkit-scrollbar-thumb": {
      backgroundColor: globalColors.sidenavScrollbarThumb,
    },
  },
  activePane: {
    display: "block",
  },
  noResult: {
    color: globalColors.sidenavNoResultText,
    fontSize: "16px",
    marginBottom: "25px",
    marginTop: "10px",
    textAlign: "center",
  },
});

const leftSidebarRecentShellStyles = stylex.create({
  group: {
    position: "relative",
  },
  input: {
    backgroundColor: globalColors.leftSidebarRecentSearchSurface,
    borderRadius: 0,
    borderStyle: "none",
    borderWidth: 0,
    boxSizing: "content-box",
    color: globalColors.leftSidebarRecentIssueText,
    display: "block",
    fontSize: "14px",
    height: "34px",
    marginBottom: 0,
    outline: "none",
    width: "99%",
    ":focus": {
      borderStyle: "none",
      borderWidth: 0,
      outline: "none",
    },
  },
  bar: {
    display: "block",
    position: "relative",
    "::before": {
      backgroundColor: globalColors.sidenavSearchFocusAccent,
      bottom: "1px",
      content: '""',
      height: "1px",
      left: "50%",
      position: "absolute",
      transition: "0.2s ease all",
      width: 0,
    },
    "::after": {
      backgroundColor: globalColors.sidenavSearchFocusAccent,
      bottom: "1px",
      content: '""',
      height: "1px",
      position: "absolute",
      right: "50%",
      transition: "0.2s ease all",
      width: 0,
    },
  },
  focusedBar: {
    "::before": {
      width: "50%",
    },
    "::after": {
      width: "50%",
    },
  },
  tabContent: {
    overflow: "hidden",
  },
  pane: {
    display: "none",
    listStyleType: "none",
    margin: "0 0 10px",
    maxHeight: "80vh",
    overflowX: "visible",
    overflowY: "auto",
    padding: 0,
    "::-webkit-scrollbar": {
      backgroundColor: globalColors.sidenavScrollbarTrack,
      height: "10px",
      width: "5px",
    },
    "::-webkit-scrollbar-thumb": {
      backgroundColor: globalColors.sidenavScrollbarThumb,
    },
  },
  activePane: {
    display: "block",
  },
  noResult: {
    color: globalColors.sidenavNoResultText,
    fontSize: "16px",
    marginBottom: "25px",
    marginTop: "10px",
    textAlign: "center",
  },
});

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
          data-stylex-owner={
            isAuthenticatedSidenav
              ? "authenticated-sidenav-recent-shell"
              : isLeftSidebar
                ? "left-sidebar-recent-shell"
                : undefined
          }
        >
          <div
            className={`group ${
              stylex.props(
                isAuthenticatedSidenav && authenticatedSidenavRecentShellStyles.group,
                isLeftSidebar && leftSidebarRecentShellStyles.group,
              ).className
            }`.trimEnd()}
          >
            <input
              className={`search-input project-search ${
                stylex.props(
                  isAuthenticatedSidenav && authenticatedSidenavRecentShellStyles.input,
                  isLeftSidebar && leftSidebarRecentShellStyles.input,
                ).className
              }`.trimEnd()}
              type="text"
              id={sidebarDomId(idPrefix, "recent-issue-query")}
              autoComplete="off"
              onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
              onBlur={() => setIsSearchFocused(false)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder={t("title.type.name")}
              value={searchQuery}
            />
            <span
              className={`bar ${
                stylex.props(
                  isAuthenticatedSidenav && authenticatedSidenavRecentShellStyles.bar,
                  isAuthenticatedSidenav &&
                    isSearchFocused &&
                    authenticatedSidenavRecentShellStyles.focusedBar,
                  isLeftSidebar && leftSidebarRecentShellStyles.bar,
                  isLeftSidebar && isSearchFocused && leftSidebarRecentShellStyles.focusedBar,
                ).className
              }`.trimEnd()}
            ></span>
          </div>
          <div
            className={`tab-content ${
              stylex.props(
                isAuthenticatedSidenav && authenticatedSidenavRecentShellStyles.tabContent,
                isLeftSidebar && leftSidebarRecentShellStyles.tabContent,
              ).className
            }`.trimEnd()}
          >
            {issues.length === 0 ? (
              <div
                id={sidebarDomId(idPrefix, "recentlyVisitedIssues")}
                className={`no-result tab-pane user-ul active ${
                  stylex.props(
                    isAuthenticatedSidenav && authenticatedSidenavRecentShellStyles.pane,
                    isAuthenticatedSidenav && authenticatedSidenavRecentShellStyles.activePane,
                    isAuthenticatedSidenav && authenticatedSidenavRecentShellStyles.noResult,
                    isLeftSidebar && leftSidebarRecentShellStyles.pane,
                    isLeftSidebar && leftSidebarRecentShellStyles.activePane,
                    isLeftSidebar && leftSidebarRecentShellStyles.noResult,
                  ).className
                }`.trimEnd()}
              >
                {t("title.no.results")}
              </div>
            ) : (
              <ul
                className={`tab-pane user-ul active ${
                  stylex.props(
                    isAuthenticatedSidenav && authenticatedSidenavRecentShellStyles.pane,
                    isAuthenticatedSidenav && authenticatedSidenavRecentShellStyles.activePane,
                    isLeftSidebar && leftSidebarRecentShellStyles.pane,
                    isLeftSidebar && leftSidebarRecentShellStyles.activePane,
                  ).className
                }`.trimEnd()}
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

  return (
    <li
      className={`user-li ${
        stylex.props(
          isAuthenticatedSidenav && authenticatedSidenavRecentIssueRowStyles.row,
          isLeftSidebar && leftSidebarRecentIssueRowStyles.row,
        ).className
      }`.trimEnd()}
      data-stylex-owner={
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
        <Link
          className={`project-item project-item-container sidebar-row-link ${
            stylex.props(
              isAuthenticatedSidenav && authenticatedSidenavRecentIssueRowStyles.link,
              isLeftSidebar && leftSidebarRecentIssueRowStyles.link,
            ).className
          }`.trimEnd()}
          params={{ issueNumber, ownerName, projectName }}
          to="/$ownerName/$projectName/issue/$issueNumber"
        >
          <div
            className={`issue-item projectName-owner flex-item ${
              stylex.props(
                isAuthenticatedSidenav && authenticatedSidenavRecentIssueRowStyles.issue,
                isLeftSidebar && leftSidebarRecentIssueRowStyles.issue,
              ).className
            }`.trimEnd()}
          >
            <div
              className={`issue-title-start ${
                stylex.props(
                  isAuthenticatedSidenav && authenticatedSidenavRecentIssueRowStyles.marker,
                  isLeftSidebar && leftSidebarRecentIssueRowStyles.marker,
                ).className
              }`.trimEnd()}
            >
              -
            </div>
            <div
              className={`issue-title flex-item ${
                stylex.props(
                  isAuthenticatedSidenav && authenticatedSidenavRecentIssueRowStyles.title,
                  isLeftSidebar && leftSidebarRecentIssueRowStyles.title,
                ).className
              }`.trimEnd()}
            >
              {title}
            </div>
          </div>
        </Link>
      </SidebarHoverPopover>
    </li>
  );
}

function SidebarHoverPopover({
  children,
  content,
  variant = "legacy",
}: {
  children: React.ReactNode;
  content: string;
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
        isLeftSidebarFavoriteNestedProjectRow
          ? stylex.props(leftSidebarFavoriteNestedProjectRowStyles.list).className
          : `project-list project-flex-container ${
              stylex.props(
                isAuthenticatedFavoriteProjectRow &&
                  authenticatedSidenavFavoriteProjectRowStyles.list,
                isAuthenticatedRecentIssueRow && authenticatedSidenavRecentIssueRowStyles.list,
                isLeftSidebarRecentIssueRow && leftSidebarRecentIssueRowStyles.list,
              ).className
            }`.trimEnd()
      }
      onMouseEnter={showPopover}
      onMouseLeave={hidePopover}
      style={isVisible && !ownsPopoverPresentation ? { position: "relative" } : undefined}
    >
      {children}
      {isVisible ? (
        <div
          className={`${ownsPopoverPresentation ? "" : "popover right"} ${
            stylex.props(
              isAuthenticatedFavoriteProjectRow &&
                authenticatedSidenavFavoriteProjectRowStyles.popover,
              isAuthenticatedRecentIssueRow && authenticatedSidenavRecentIssueRowStyles.popover,
              isLeftSidebarFavoriteNestedProjectRow &&
                leftSidebarFavoriteNestedProjectRowStyles.popover,
              isLeftSidebarRecentIssueRow && leftSidebarRecentIssueRowStyles.popover,
            ).className
          }`.trimEnd()}
          data-stylex-owner={
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
          style={ownsPopoverPresentation ? undefined : HOME_SIDEBAR_POPOVER_STYLE}
        >
          <div
            className={`${ownsPopoverPresentation ? "" : "arrow"} ${
              stylex.props(
                isAuthenticatedFavoriteProjectRow &&
                  authenticatedSidenavFavoriteProjectRowStyles.popoverArrow,
                isAuthenticatedRecentIssueRow &&
                  authenticatedSidenavRecentIssueRowStyles.popoverArrow,
                isLeftSidebarFavoriteNestedProjectRow &&
                  leftSidebarFavoriteNestedProjectRowStyles.popoverArrow,
                isLeftSidebarRecentIssueRow && leftSidebarRecentIssueRowStyles.popoverArrow,
              ).className
            }`.trimEnd()}
          />
          <div
            className={`${ownsPopoverPresentation ? "" : "popover-content"} ${
              stylex.props(
                isAuthenticatedFavoriteProjectRow &&
                  authenticatedSidenavFavoriteProjectRowStyles.popoverContent,
                isAuthenticatedRecentIssueRow &&
                  authenticatedSidenavRecentIssueRowStyles.popoverContent,
                isLeftSidebarFavoriteNestedProjectRow &&
                  leftSidebarFavoriteNestedProjectRowStyles.popoverContent,
                isLeftSidebarRecentIssueRow && leftSidebarRecentIssueRowStyles.popoverContent,
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
