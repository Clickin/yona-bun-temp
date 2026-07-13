import { createFileRoute } from "@tanstack/react-router";
import { HomeRouteScreen } from "./-home-route-screen";

export const Route = createFileRoute("/notification")({
  component: NotificationRoute,
});

function NotificationRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <HomeRouteScreen
      notificationFragmentOnly
      routePath="/notification"
      runtimeConfig={runtimeConfig}
    />
  );
}
