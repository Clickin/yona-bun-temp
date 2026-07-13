import { createFileRoute } from "@tanstack/react-router";
import { HomeRouteScreen } from "./-home-route-screen";

type IndexSearch = {
  signup?: string;
  verify?: string;
};

export const Route = createFileRoute("/")({
  component: IndexRoute,
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    signup: typeof search.signup === "string" ? search.signup : undefined,
    verify: typeof search.verify === "string" ? search.verify : undefined,
  }),
});

function IndexRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { signup, verify } = Route.useSearch();
  const flashKey =
    signup === "requested"
      ? "user.signup.requested"
      : verify === "sent"
        ? "user.verification.mail.sent"
        : "";

  return (
    <>
      <title>{runtimeConfig.siteName ?? "Yona"}</title>
      <HomeRouteScreen flashMessageKey={flashKey} runtimeConfig={runtimeConfig} />
    </>
  );
}
