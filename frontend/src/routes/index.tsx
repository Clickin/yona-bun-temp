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
  const browserSearch =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const signupState = signup || browserSearch.get("signup") || "";
  const verifyState = verify || browserSearch.get("verify") || "";
  const flashKey =
    signupState === "requested"
      ? "user.signup.requested"
      : verifyState === "sent"
        ? "user.verification.mail.sent"
        : "";

  return <HomeRouteScreen flashMessageKey={flashKey} runtimeConfig={runtimeConfig} />;
}
