import * as React from "react";
import { Code, ConnectError } from "@connectrpc/connect";
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

export type RouteFailureKind = "forbidden" | "not-found";

function readConnectCode(error: unknown): null | Code {
  if (error instanceof ConnectError) {
    return error.code;
  }
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  if (typeof code === "number") {
    return code as Code;
  }
  if (code === "permission_denied") {
    return Code.PermissionDenied;
  }
  if (code === "not_found") {
    return Code.NotFound;
  }
  return null;
}

export function classifyConnectFailure(error: unknown): null | RouteFailureKind {
  const code = readConnectCode(error);
  if (code === Code.PermissionDenied) {
    return "forbidden";
  }
  if (code === Code.NotFound) {
    return "not-found";
  }
  return null;
}

function RouteStatusPage({
  href,
  lede,
  title,
}: {
  href: string;
  lede: string;
  title: string;
}) {
  useDocumentTitle(title);

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Route</p>
      <h1>{title}</h1>
      <p>{href}</p>
      <p className="lede">{lede}</p>
    </main>
  );
}

export function PlaceholderPage({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
  return (
    <RouteStatusPage
      href={href}
      lede="File-based route placeholder while the full screen body is being ported."
      title={title}
    />
  );
}

export function ForbiddenPage({ href }: { href: string }) {
  return (
    <RouteStatusPage
      href={href}
      lede="You do not have permission to view this page."
      title="Forbidden"
    />
  );
}

export function NotFoundPage({ href }: { href: string }) {
  return (
    <RouteStatusPage
      href={href}
      lede="The requested page could not be found."
      title="Not found"
    />
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
