import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { buildProtectedRedirect } from "@app/lib/auth";
import {
  readMyFavorites,
  readMyNotifications,
  readMyRecentProjects,
  readMySidebar,
} from "@app/lib/me";

export const Route = createFileRoute("/me")({
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

  return (
    <section className="panel-grid">
      <article className="panel">
        <strong>My Workspace</strong>
        <p className="note">Personal dashboard APIs now map to canonical tRPC/domain services.</p>
        <div className="link-row">
          <Link className="link-text" to="/me/settings">
            Open settings
          </Link>
        </div>
      </article>
      <article className="panel">
        <strong>Sidebar</strong>
        <p className="note">
          favorites: {data.sidebar.favorites.length}, recent: {data.sidebar.recentProjects.length}
        </p>
      </article>
      <article className="panel">
        <strong>Favorites</strong>
        {data.favorites.length === 0 ? (
          <p className="note">No favorite projects yet.</p>
        ) : (
          data.favorites.map((entry) => (
            <p className="note" key={`${entry.ownerName}/${entry.projectName}`}>
              {entry.ownerName}/{entry.projectName}
            </p>
          ))
        )}
      </article>
      <article className="panel">
        <strong>Recent Projects</strong>
        {data.recentProjects.length === 0 ? (
          <p className="note">No recent projects yet.</p>
        ) : (
          data.recentProjects.map((entry) => (
            <p className="note" key={`${entry.ownerName}/${entry.projectName}`}>
              {entry.ownerName}/{entry.projectName}
            </p>
          ))
        )}
      </article>
      <article className="panel">
        <strong>Notifications</strong>
        {data.notifications.length === 0 ? (
          <p className="note">No notification events yet.</p>
        ) : (
          data.notifications.map((notification) => (
            <p className="note" key={notification.eventId}>
              {notification.title ?? notification.eventType ?? "Event"}
            </p>
          ))
        )}
      </article>
    </section>
  );
}
