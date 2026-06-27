import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useAppRuntime } from "../app-runtime-context";
import { HomePage } from "./-home-view";
import { useDocumentTitle } from "./-shared";

export const Route = createFileRoute("/")({
  component: IndexRouteComponent,
});

function IndexRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  useDocumentTitle(runtimeConfig.siteName ?? "Yona");
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const searchParams = new URL(locationHref, "http://localhost").searchParams;
  return (
    <HomePage flashMessageKey={homeFlashMessageKey(searchParams)} runtimeConfig={runtimeConfig} />
  );
}

function homeFlashMessageKey(searchParams: URLSearchParams): string | null {
  if (searchParams.get("signup") === "requested") {
    return "user.signup.requested";
  }
  if (searchParams.get("verify") === "sent") {
    return "user.verification.mail.sent";
  }
  return null;
}
