import { createFileRoute } from "@tanstack/react-router";
import { HomeRouteScreen } from "./-home-route-screen";

export const Route = createFileRoute("/notifications")({
  component: NotificationsRoute,
});

function NotificationsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <>
      <title>{runtimeConfig.siteName ?? "Yoram"}</title>
      <HomeRouteScreen routePath="/notifications" runtimeConfig={runtimeConfig} />
    </>
  );
}
