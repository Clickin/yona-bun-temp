import * as React from "react";
import { prefixBasePath } from "../runtime-config";
import { useAppRuntime } from "../app-runtime-context";

export function useCurrentHref() {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.pathname}${window.location.search}`;
}

export function navigateToAppHref(basePath: string, href: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.location.assign(prefixBasePath(basePath, href));
}

export function useRequireAuthenticatedRoute(targetHref: string) {
  const { bootstrapping, currentSession, runtimeConfig } = useAppRuntime();

  React.useEffect(() => {
    if (bootstrapping || !currentSession?.isAnonymous) {
      return;
    }
    navigateToAppHref(
      runtimeConfig.basePath,
      `/users/loginform?redirectUrl=${encodeURIComponent(targetHref)}`,
    );
  }, [bootstrapping, currentSession, runtimeConfig.basePath, targetHref]);

  return !bootstrapping && !!currentSession && !currentSession.isAnonymous;
}

export function PlaceholderPage({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
  useDocumentTitle(title);

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Route</p>
      <h1>{title}</h1>
      <p>{href}</p>
      <p className="lede">File-based route placeholder while the full screen body is being ported.</p>
    </main>
  );
}

export function RedirectPage({
  basePath,
  to,
}: {
  basePath: string;
  to: string;
}) {
  React.useEffect(() => {
    navigateToAppHref(basePath, to);
  }, [basePath, to]);

  return (
    <main className="app-shell">
      <h1>Redirecting...</h1>
    </main>
  );
}

export function useDocumentTitle(title: string) {
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = title;
    }
  }, [title]);
}
