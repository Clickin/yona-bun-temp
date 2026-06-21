/* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/prefer-tag-over-role */
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { listNotificationsQueryOptions } from "../../api/notifications";
import { setDefaultLandingPathRest } from "../../api/workspace";
import { useAppRuntime } from "../../app-runtime-context";
import type { LegacyI18nContextValue } from "../../i18n";
import { prefixBasePath } from "../../runtime-config";
import { BadRequestPage, useDocumentTitle, useRequireAuthenticatedRoute } from "../-shared";

const NOTIFICATION_PAGE_SIZE = 20;
type LegacyMessageLookup = LegacyI18nContextValue["t"];

export const Route = createFileRoute("/notification")({
  component: () => <NotificationRouteComponent routePath="/notifications" />,
});

function legacyMessage(messages: LegacyMessageLookup | undefined, key: string) {
  return messages ? messages(key, { fallback: key }) : key;
}

export function NotificationRouteComponent({
  routePath = "/notifications",
}: {
  routePath?: string;
}) {
  const {
    bootstrapping,
    csrfToken,
    currentSession,
    messages,
    runtimeConfig,
    setErrorMessage,
    syncWorkspaceFromOverview,
  } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute(routePath);
  const [size, setSize] = React.useState(NOTIFICATION_PAGE_SIZE);
  const [expandedMessages, setExpandedMessages] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [readFailed, setReadFailed] = React.useState(false);
  const notificationsQuery = useQuery({
    ...listNotificationsQueryOptions(runtimeConfig, { from: 0, size }),
    enabled: canRender,
  });

  useDocumentTitle(runtimeConfig.siteName ?? "Yona");

  React.useEffect(() => {
    if (!notificationsQuery.error) {
      setReadFailed(false);
      return;
    }
    setReadFailed(true);
  }, [notificationsQuery.error]);

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell notification-page">
        <div className="page-wrap-outer">
          <div className="page-wrap">
            <div className="warning-none">
              {messages("common.loading", { fallback: "common.loading" })}
            </div>
          </div>
        </div>
      </main>
    );
  }
  if (readFailed) {
    return <BadRequestPage href={routePath} />;
  }

  const notifications = notificationsQuery.data;
  const items = notifications?.items ?? [];
  const defaultAvatarUrl = prefixBasePath(
    runtimeConfig.basePath,
    "/assets/images/default-avatar-64.png",
  );
  const notificationStreamRole = "link";
  const actorHref = (loginId: string) =>
    prefixBasePath(runtimeConfig.basePath, `/${encodeURIComponent(loginId)}`);
  const toggleMessage = (id: string) => {
    setExpandedMessages((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const handleLearnMoreClick = (
    id: string,
    event: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLElement>,
  ) => {
    if (event.target instanceof Element && event.target.closest("a, img")) {
      return;
    }
    toggleMessage(id);
  };
  const normalizedRoutePath = routePath.startsWith("/") ? routePath : `/${routePath}`;
  const normalizedDefaultLandingPath = currentSession?.defaultLandingPath?.startsWith("/")
    ? currentSession.defaultLandingPath
    : currentSession?.defaultLandingPath
      ? `/${currentSession.defaultLandingPath}`
      : "";
  const canSetDefaultLoginPage =
    normalizedRoutePath !== "/" && normalizedDefaultLandingPath !== normalizedRoutePath;
  const locationHref = prefixBasePath(runtimeConfig.basePath, normalizedRoutePath);
  const setDefaultLoginPage = async () => {
    try {
      const overview = await setDefaultLandingPathRest(
        runtimeConfig,
        csrfToken,
        normalizedRoutePath,
      );
      await syncWorkspaceFromOverview(overview);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "set Default page failed: ");
    }
  };

  return (
    <main className="app-shell notification-page">
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <NotificationWelcomeGuide
            basePath={runtimeConfig.basePath}
            messages={messages}
            siteName={runtimeConfig.siteName}
          />
          <div className="page on-fold-intro">
            <div className="row-fluid content-container">
              <div className="span8 main-stream">
                <MySeriesMenuTabs
                  basePath={runtimeConfig.basePath}
                  canSetDefaultLoginPage={canSetDefaultLoginPage}
                  messages={messages}
                  onSetDefaultLoginPage={setDefaultLoginPage}
                  routePath={normalizedRoutePath}
                />
                <ul className="activity-streams notification-wrap unstyled">
                  {notificationsQuery.isLoading ? null : items.length === 0 ? (
                    <li className="warning-none">
                      <i className="yobicon-danger"></i>{" "}
                      {legacyMessage(messages, "notification.none")}
                    </li>
                  ) : (
                    items.map((item) => {
                      const messageId = `message-${item.id}`;
                      const expanded = expandedMessages.has(item.id);

                      return (
                        <li className="notification-stream" key={item.id}>
                          <div className={`stream-type ${item.typeIcon}`}>
                            <i className={`yobicon-${item.typeIcon}`} />
                          </div>
                          <div
                            className="stream-desc"
                            data-target={messageId}
                            data-toggle="learnmore"
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                handleLearnMoreClick(item.id, event);
                              }
                            }}
                            onClick={(event) => handleLearnMoreClick(item.id, event)}
                            role={notificationStreamRole}
                            tabIndex={0}
                          >
                            <div className="stream-info">
                              <div className="title">
                                {item.targetHref ? (
                                  <a href={item.targetHref}>{item.targetTitle || item.eventType}</a>
                                ) : (
                                  <span>{item.targetTitle || item.eventType}</span>
                                )}
                              </div>
                              <NotificationMessage
                                expanded={expanded}
                                id={messageId}
                                message={item.message}
                                onToggle={() => toggleMessage(item.id)}
                              />
                              <div className="meta">
                                {item.actor.loginId ? (
                                  <a
                                    className="avatar-wrap smaller"
                                    href={actorHref(item.actor.loginId)}
                                  >
                                    <img
                                      alt={`${item.actor.displayName} avatar`}
                                      src={item.actor.avatarUrl || defaultAvatarUrl}
                                    />
                                  </a>
                                ) : (
                                  <div className="smaller">
                                    <img alt="" height={42} src={defaultAvatarUrl} width={42} />
                                  </div>
                                )}
                                {item.actor.loginId ? (
                                  <a className="author" href={actorHref(item.actor.loginId)}>
                                    {item.actor.displayName || item.actor.loginId}
                                  </a>
                                ) : null}
                                {item.actor.loginId ? (
                                  <span>{`@${item.actor.loginId}`}</span>
                                ) : null}
                                <span className="ago" title={item.createdAt}>
                                  {item.createdLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })
                  )}
                  {notifications?.hasMore ? (
                    <li>
                      <a
                        className="ybtn"
                        href={locationHref}
                        id="notification-more"
                        onClick={() => setSize((current) => current + NOTIFICATION_PAGE_SIZE)}
                      >
                        More
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
              <div className="span4 index-menu right-menu span-hard-wrap" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function NotificationMessage({
  expanded,
  id,
  message,
  onToggle,
}: {
  expanded: boolean;
  id: string;
  message: string;
  onToggle: () => void;
}) {
  const wrapRef = React.useRef<HTMLButtonElement | null>(null);
  const [isOverflowing, setIsOverflowing] = React.useState(false);

  React.useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return undefined;
    }
    const updateOverflow = () => {
      setIsOverflowing(
        wrap.clientWidth < wrap.scrollWidth || wrap.clientHeight < wrap.scrollHeight,
      );
    };
    updateOverflow();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [message]);

  return (
    <>
      <button
        aria-expanded={expanded}
        className={`message-wrap${expanded ? "" : " nowrap"}`}
        id={id}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        ref={wrapRef}
        type="button"
      >
        <span className="message">{message}</span>
      </button>
      {!expanded && isOverflowing ? (
        <div
          className="more"
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          role="presentation"
        >
          ...
        </div>
      ) : null}
    </>
  );
}

export function NotificationWelcomeGuide({
  basePath,
  messages,
  siteName = "Yona",
}: {
  basePath: string;
  messages?: LegacyMessageLookup;
  siteName?: string;
}) {
  const [visible, setVisible] = React.useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.localStorage.getItem("yobi-intro") !== "false";
  });
  const toggle = () => {
    setVisible((current) => {
      const next = !current;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("yobi-intro", String(next));
      }
      return next;
    });
  };

  return (
    <>
      <div className={`site-guide-outer${visible ? "" : " hide"}`}>
        <h3>
          <span>{`Tada! Welcome to ${siteName}! - Web-based platform for collaborative software development`}</span>
        </h3>
        <table className="welcome-table table borderless">
          <tbody>
            <tr>
              <td>
                <a className="ybtn ybtn-success" href={prefixBasePath(basePath, "/projects/new")}>
                  {legacyMessage(messages, "button.newProject")}
                </a>
              </td>
              <td>{legacyMessage(messages, "app.welcome.project.desc")}</td>
            </tr>
            <tr>
              <td>
                <a
                  className="ybtn ybtn-success"
                  href={prefixBasePath(basePath, "/organizations/new")}
                >
                  {legacyMessage(messages, "title.newOrganization")}
                </a>
              </td>
              <td>{legacyMessage(messages, "app.welcome.group.desc")}</td>
            </tr>
            <tr>
              <td>
                <a className="ybtn ybtn-success" href={prefixBasePath(basePath, "/projects")}>
                  {legacyMessage(messages, "title.projectList")}
                </a>
              </td>
              <td>{legacyMessage(messages, "app.welcome.searchProject.desc")}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="guide-toggle">
        <button className="btn-transparent" id="toggleIntro" onClick={toggle} type="button">
          <i className="yobicon-resizev"></i>
        </button>
      </div>
    </>
  );
}

function MySeriesMenuTabs({
  basePath,
  canSetDefaultLoginPage,
  messages,
  onSetDefaultLoginPage,
  routePath,
}: {
  basePath: string;
  canSetDefaultLoginPage: boolean;
  messages?: LegacyMessageLookup;
  onSetDefaultLoginPage: () => void;
  routePath: string;
}) {
  return (
    <ul className="nav nav-tabs">
      <li className="active">
        <a href={prefixBasePath(basePath, "/notifications")}>
          {legacyMessage(messages, "notification")}
        </a>
      </li>
      <li>
        <a href={prefixBasePath(basePath, "/user/issues")}>
          {legacyMessage(messages, "issue.myIssue")}
        </a>
      </li>
      <li>
        <a href={prefixBasePath(basePath, "/user/files")}>
          {legacyMessage(messages, "user.files")}
        </a>
      </li>
      <li>
        {canSetDefaultLoginPage ? (
          <button
            className="ybtn hide-in-mobile"
            data-content={legacyMessage(messages, "button.setDefaultLoginPage.desc")}
            data-placement="bottom"
            data-toggle="popover"
            data-trigger="hover"
            data-url={routePath.replace(/^\//, "")}
            id="setDefaultLoginPage"
            onClick={onSetDefaultLoginPage}
            title={legacyMessage(messages, "button.setDefaultLoginPage")}
            type="button"
          >
            {legacyMessage(messages, "button.setDefaultLoginPage")}
          </button>
        ) : null}
      </li>
    </ul>
  );
}
