import * as React from "react";
import { RestApiError } from "../api/rest-client";
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

function readHttpStatus(error: unknown): number | null {
  if (error instanceof RestApiError) {
    return error.status;
  }
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") {
    return status;
  }

  const nestedError = (error as { error?: unknown }).error;
  if (typeof nestedError === "object" && nestedError !== null) {
    const nestedStatus = (nestedError as { status?: unknown }).status;
    if (typeof nestedStatus === "number") {
      return nestedStatus;
    }
  }

  const response = (error as { response?: unknown }).response;
  if (typeof response === "object" && response !== null) {
    const responseStatus = (response as { status?: unknown }).status;
    if (typeof responseStatus === "number") {
      return responseStatus;
    }
  }

  return null;
}

export function classifyConnectFailure(error: unknown): null | RouteFailureKind {
  const status = readHttpStatus(error);
  if (status === 403) {
    return "forbidden";
  }
  if (status === 404) {
    return "not-found";
  }
  return null;
}

function RouteStatusPage({ href, lede, title }: { href: string; lede: string; title: string }) {
  useDocumentTitle(title);

  return (
    <main className="app-shell">
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="error-wrap">
            <i className="ico ico-err2"></i>
            <p>{title}</p>
            <p className="hide">{href}</p>
            <p className="lede">{lede}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

export function PlaceholderPage({ href, title }: { href: string; title: string }) {
  return (
    <RouteStatusPage
      href={href}
      lede="error.notfound"
      title={title}
    />
  );
}

export function BadRequestPage({ href = "/" }: { href?: string }) {
  useDocumentTitle("The request cannot be fulfilled due to bad syntax");

  return (
    <main className="app-shell">
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="error-wrap">
            <i className="ico-404"></i>
            <p>The request cannot be fulfilled due to bad syntax</p>
            <a className="ybtn ybtn-info" href={href}>
              Home
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

export function ForbiddenPage({ href }: { href: string }) {
  return (
    <RouteStatusPage
      href={href}
      lede="You do not have permission to view this page."
      title="error.forbidden"
    />
  );
}

export function NotFoundPage({ href }: { href: string }) {
  return (
    <RouteStatusPage
      href={href}
      lede="The requested page could not be found."
      title="error.notfound"
    />
  );
}

export function RedirectPage({ basePath, to }: { basePath: string; to: string }) {
  React.useEffect(() => {
    navigateToAppHref(basePath, to);
  }, [basePath, to]);

  return (
    <main className="app-shell">
      <h1>Redirecting…</h1>
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
