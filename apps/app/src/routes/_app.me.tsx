import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { ContentCard, WorkspaceShell } from "@app/components/parity-shells";
import { buildProtectedRedirect } from "@app/lib/auth";
import { useTranslate } from "@app/lib/i18n-react";
import {
  readMyFavorites,
  readMyNotifications,
  readMyRecentProjects,
  readMySidebar,
} from "@app/lib/me";

export const Route = createFileRoute("/_app/me")({
  beforeLoad: async ({ context, location }) => {
    const redirectTarget = buildProtectedRedirect(
      await context.authCaller.readCurrentSession(),
      location.href,
    );
    if (redirectTarget) {
      throw redirect(redirectTarget);
    }
  },
  loader: async () => {
    const [sidebar, favorites, recentProjects, notifications] = await Promise.all([
      readMySidebar(),
      readMyFavorites(),
      readMyRecentProjects(),
      readMyNotifications(),
    ]);

    return {
      sidebar,
      favorites,
      recentProjects,
      notifications,
    };
  },
  component: MeRouteComponent,
});

function MeRouteComponent() {
  const data = Route.useLoaderData();
  const t = useTranslate();

  return (
    <WorkspaceShell
      activeTab="overview"
      description={t("app.workspace.description")}
      sidebar={data.sidebar}
      title={t("app.workspace.title")}
    >
      <ContentCard title={t("app.workspace.dashboard")}>
        <div className="link-row">
          <Link className="link-text" to="/me/settings">
            {t("app.workspace.openSettings")}
          </Link>
        </div>
      </ContentCard>
      <div className="content-grid">
        <ContentCard title={t("app.sidebar.favorites")}>
          {data.favorites.length === 0 ? (
            <p className="note">{t("app.sidebar.noFavoriteProjects")}</p>
          ) : (
            data.favorites.map((entry) => (
              <p className="note" key={`${entry.ownerName}/${entry.projectName}`}>
                {entry.ownerName}/{entry.projectName}
              </p>
            ))
          )}
        </ContentCard>
        <ContentCard title={t("app.sidebar.recentProjects")}>
          {data.recentProjects.length === 0 ? (
            <p className="note">{t("app.sidebar.noRecentProjects")}</p>
          ) : (
            data.recentProjects.map((entry) => (
              <p className="note" key={`${entry.ownerName}/${entry.projectName}`}>
                {entry.ownerName}/{entry.projectName}
              </p>
            ))
          )}
        </ContentCard>
      </div>
      <ContentCard title={t("app.workspace.notifications")}>
        {data.notifications.length === 0 ? (
          <p className="note">{t("app.workspace.noNotifications")}</p>
        ) : (
          data.notifications.map((notification) => (
            <p className="note" key={notification.eventId}>
              {notification.title ?? notification.eventType ?? "Event"}
            </p>
          ))
        )}
      </ContentCard>
    </WorkspaceShell>
  );
}
