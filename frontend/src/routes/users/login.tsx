import { createFileRoute } from "@tanstack/react-router";
import { HomeRouteScreen } from "../-home-route-screen";

export const Route = createFileRoute("/users/login")({
  component: UsersLoginRoute,
});

function UsersLoginRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <>
      <title>{runtimeConfig.siteName ?? "Yoram"}</title>
      <HomeRouteScreen routePath="/users/login" runtimeConfig={runtimeConfig} />
    </>
  );
}
