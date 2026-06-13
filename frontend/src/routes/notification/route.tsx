import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { listNotificationsQueryOptions } from "../../api/notifications";
import { setDefaultLandingPathRest } from "../../api/workspace";
import { useAppRuntime } from "../../app-runtime-context";
import { prefixBasePath } from "../../runtime-config";
import { useDocumentTitle, useRequireAuthenticatedRoute } from "../-shared";

const NOTIFICATION_PAGE_SIZE = 20;

export const Route = createFileRoute("/notification")({
  component: () => <NotificationRouteComponent routePath="/notifications" />,
});

export function NotificationRouteComponent({
  routePath = "/notifications",
}: {
  routePath?: string;
}) {
  const {
    bootstrapping,
    csrfToken,
    currentSession,
    runtimeConfig,
    setErrorMessage,
    syncWorkspaceFromOverview,
  } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute(routePath);
  const [size, setSize] = React.useState(NOTIFICATION_PAGE_SIZE);
  const [expandedMessages, setExpandedMessages] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const notificationsQuery = useQuery({
    ...listNotificationsQueryOptions(runtimeConfig, { from: 0, size }),
    enabled: canRender,
  });

  useDocumentTitle("Notifications");

  React.useEffect(() => {
    if (notificationsQuery.error) {
      setErrorMessage(
        notificationsQuery.error instanceof Error
          ? notificationsQuery.error.message
          : "Read notifications failed.",
      );
    }
  }, [notificationsQuery.error, setErrorMessage]);

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell notification-page page-wrap-outer">
        <div className="page-wrap">
          <div className="warning-none">Loading…</div>
        </div>
      </main>
    );
  }

  const notifications = notificationsQuery.data;
  const items = notifications?.items ?? [];
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
  const normalizedRoutePath = routePath.startsWith("/") ? routePath : `/${routePath}`;
  const normalizedDefaultLandingPath = currentSession?.defaultLandingPath?.startsWith("/")
    ? currentSession.defaultLandingPath
    : currentSession?.defaultLandingPath
      ? `/${currentSession.defaultLandingPath}`
      : "";
  const canSetDefaultLoginPage =
    normalizedRoutePath !== "/" && normalizedDefaultLandingPath !== normalizedRoutePath;
  const setDefaultLoginPage = async () => {
    try {
      const overview = await setDefaultLandingPathRest(
        runtimeConfig,
        csrfToken,
        normalizedRoutePath,
      );
      await syncWorkspaceFromOverview(overview);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "set Default page failed.");
    }
  };

  return (
    <main className="app-shell notification-page page-wrap-outer">
      <div className="page-wrap">
        <div className="page on-fold-intro">
          <div className="row-fluid content-container">
            <div className="span8 main-stream">
              <MySeriesMenuTabs
                basePath={runtimeConfig.basePath}
                canSetDefaultLoginPage={canSetDefaultLoginPage}
                onSetDefaultLoginPage={setDefaultLoginPage}
                routePath={normalizedRoutePath}
              />
              <ul className="activity-streams notification-wrap unstyled">
                {notificationsQuery.isLoading ? (
                  <li className="warning-none">Loading…</li>
                ) : items.length === 0 ? (
                  <div className="warning-none">
                    <i className="yobicon-danger"></i> notification.none
                  </div>
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
                        >
                          <div className="stream-info">
                            <div className="title">
                              {item.targetHref ? (
                                <a href={item.targetHref}>{item.targetTitle || item.eventType}</a>
                              ) : (
                                <span>{item.targetTitle || item.eventType}</span>
                              )}
                            </div>
                            <button
                              aria-expanded={expanded}
                              className={`message-wrap${expanded ? "" : " nowrap"}`}
                              id={messageId}
                              onClick={() => toggleMessage(item.id)}
                              type="button"
                            >
                              <span className="message">{item.message}</span>
                            </button>
                            <div className="meta">
                              {item.actor.avatarUrl ? (
                                <a
                                  className="avatar-wrap smaller"
                                  href={actorHref(item.actor.loginId)}
                                >
                                  <img
                                    alt={`${item.actor.displayName} avatar`}
                                    src={item.actor.avatarUrl}
                                  />
                                </a>
                              ) : null}
                              {item.actor.loginId ? (
                                <a className="author" href={actorHref(item.actor.loginId)}>
                                  {item.actor.displayName || item.actor.loginId}
                                </a>
                              ) : null}
                              {item.actor.loginId ? <span>{`@${item.actor.loginId}`}</span> : null}
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
                      href="javascript:void(0);"
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
    </main>
  );
}

function MySeriesMenuTabs({
  basePath,
  canSetDefaultLoginPage,
  onSetDefaultLoginPage,
  routePath,
}: {
  basePath: string;
  canSetDefaultLoginPage: boolean;
  onSetDefaultLoginPage: () => void;
  routePath: string;
}) {
  return (
    <ul className="nav nav-tabs">
      <li className="active">
        <a href={prefixBasePath(basePath, "/notifications")}>notification</a>
      </li>
      <li>
        <a href={prefixBasePath(basePath, "/user/issues")}>issue.myIssue</a>
      </li>
      <li>
        <a href={prefixBasePath(basePath, "/user/files")}>user.files</a>
      </li>
      <li>
        {canSetDefaultLoginPage ? (
          <button
            className="ybtn hide-in-mobile"
            data-content="button.setDefaultLoginPage.desc"
            data-placement="bottom"
            data-toggle="popover"
            data-trigger="hover"
            data-url={routePath.replace(/^\//, "")}
            id="setDefaultLoginPage"
            onClick={onSetDefaultLoginPage}
            title="button.setDefaultLoginPage"
            type="button"
          >
            button.setDefaultLoginPage
          </button>
        ) : null}
      </li>
    </ul>
  );
}
