import { createFileRoute } from "@tanstack/react-router";
import { HomeRouteScreen } from "./-home-route-screen";

export const Route = createFileRoute("/notification")({
  component: NotificationRoute,
});

function NotificationRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <HomeRouteScreen routePath="/notification" runtimeConfig={runtimeConfig} />;
}
