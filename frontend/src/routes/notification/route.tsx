import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { listNotificationsQueryOptions } from "../../api/notifications";
import { useAppRuntime } from "../../app-runtime-context";
import { prefixBasePath } from "../../runtime-config";
import { useDocumentTitle, useRequireAuthenticatedRoute } from "../-shared";

const NOTIFICATION_PAGE_SIZE = 20;

export const Route = createFileRoute("/notification")({
  component: NotificationRouteComponent,
});

function NotificationRouteComponent() {
  const { bootstrapping, runtimeConfig, setErrorMessage } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/notification");
  const [size, setSize] = React.useState(NOTIFICATION_PAGE_SIZE);
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
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }

  const notifications = notificationsQuery.data;
  const items = notifications?.items ?? [];
  const actorHref = (loginId: string) =>
    prefixBasePath(runtimeConfig.basePath, `/users/${encodeURIComponent(loginId)}`);

  return (
    <main className="app-shell notification-page">
      <p className="eyebrow">Yona Rust Notifications</p>
      <h1>Notifications</h1>
      {notificationsQuery.isLoading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <div className="warning-none">No notification has been received.</div>
      ) : (
        <ul className="activity-streams notification-wrap unstyled">
          {items.map((item) => (
            <li className="notification-stream" key={item.id}>
              <div className={`stream-type ${item.typeIcon}`}>
                <i className={`yobicon-${item.typeIcon}`} />
              </div>
              <div className="stream-desc">
                <div className="stream-info">
                  <div className="title">
                    {item.targetHref ? (
                      <a href={item.targetHref}>{item.targetTitle || item.eventType}</a>
                    ) : (
                      <span>{item.targetTitle || item.eventType}</span>
                    )}
                  </div>
                  <div className="message-wrap">
                    <div className="message">{item.message}</div>
                  </div>
                  <div className="meta">
                    {item.actor.avatarUrl ? (
                      <a className="avatar-wrap smaller" href={actorHref(item.actor.loginId)}>
                        <img alt={`${item.actor.displayName} avatar`} src={item.actor.avatarUrl} />
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
          ))}
          {notifications?.hasMore ? (
            <li>
              <button
                className="ybtn"
                disabled={notificationsQuery.isFetching}
                onClick={() => setSize((current) => current + NOTIFICATION_PAGE_SIZE)}
                type="button"
              >
                More
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </main>
  );
}
