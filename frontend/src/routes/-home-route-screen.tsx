import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { listNotificationsQueryOptions, type NotificationItem } from "../api/notifications";
import { currentSessionQueryOptions } from "../api/session";
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
  children,
  runtimeConfig,
}: {
  children: React.ReactNode;
  runtimeConfig: RuntimeConfig;
}) {
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
