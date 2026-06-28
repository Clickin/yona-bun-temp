import * as React from "react";
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAppRuntime } from "../app-runtime-context";
import { prefixBasePath } from "../runtime-config";
import { HomePage } from "./-home-view";
import { NotificationRouteComponent } from "./notification/route";
import { useDocumentTitle } from "./-shared";

export const Route = createFileRoute("/")({
  component: IndexRouteComponent,
});

function IndexRouteComponent() {
  const { bootstrapping, currentSession, messages, runtimeConfig } = useAppRuntime();
  const navigate = useNavigate();
  useDocumentTitle(runtimeConfig.siteName ?? "Yona");
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const searchParams = new URL(locationHref, "http://localhost").searchParams;
  const defaultLandingPath = normalizeDefaultLandingPath(currentSession?.defaultLandingPath);

  React.useEffect(() => {
    if (bootstrapping || currentSession?.isAnonymous !== false || defaultLandingPath === "/") {
      return;
    }
    void navigate({
      href: prefixBasePath(runtimeConfig.basePath, defaultLandingPath),
      replace: true,
    });
  }, [
    bootstrapping,
    currentSession?.isAnonymous,
    defaultLandingPath,
    navigate,
    runtimeConfig.basePath,
  ]);

  if (bootstrapping) {
    return (
      <main className="app-shell home-page">
        <div className="page-wrap-outer">
          <div className="page-wrap">
            <div className="warning-none">
              {messages("common.loading", { fallback: "common.loading" })}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (currentSession?.isAnonymous === false) {
    if (defaultLandingPath !== "/") {
      return (
        <main className="app-shell home-page">
          <div className="page-wrap-outer">
            <div className="page-wrap">
              <div className="warning-none">
                {messages("common.loading", { fallback: "common.loading" })}
              </div>
            </div>
          </div>
        </main>
      );
    }
    return <NotificationRouteComponent routePath="/" />;
  }

  return (
    <HomePage flashMessageKey={homeFlashMessageKey(searchParams)} runtimeConfig={runtimeConfig} />
  );
}

function normalizeDefaultLandingPath(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "/";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
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
