import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { RestApiError } from "../api/rest-client";
import { prefixBasePath } from "../runtime-config";
import { useAppRuntime } from "../app-runtime-context";
import { useLegacyMessages } from "../i18n";

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

function normalizedIssueLabelColor(color: string | null | undefined) {
  const trimmed = (color ?? "").trim();
  const withoutHash = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (/^[0-9a-fA-F]{3}$/u.test(withoutHash)) {
    return `#${withoutHash
      .split("")
      .map((value) => `${value}${value}`)
      .join("")
      .toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/u.test(withoutHash)) {
    return `#${withoutHash.toLowerCase()}`;
  }
  return "#ffffff";
}

export function legacyIssueLabelTextClass(color: string | null | undefined) {
  const normalized = normalizedIssueLabelColor(color).slice(1);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const colorSpace = red * 0.21 + green * 0.72 + blue * 0.07;
  return colorSpace > 192 ? "dimgray" : "white";
}

export function legacyIssueLabelClassName(baseClassName: string, color: string | null | undefined) {
  return `${baseClassName} ${legacyIssueLabelTextClass(color)}`;
}

export function useRequireAuthenticatedRoute(targetHref: string) {
  const { bootstrapping, currentSession, runtimeConfig } = useAppRuntime();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (bootstrapping || !currentSession?.isAnonymous) {
      return;
    }
    void navigate({
      href: prefixBasePath(
        runtimeConfig.basePath,
        `/users/loginform?redirectUrl=${encodeURIComponent(targetHref)}`,
      ),
    });
  }, [bootstrapping, currentSession, navigate, runtimeConfig.basePath, targetHref]);

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

function RouteStatusPage({
  buttonClassName = "ybtn ybtn-info",
  href,
  title,
}: {
  buttonClassName?: string;
  href: string;
  title: string;
}) {
  const messages = useLegacyMessages();
  const translatedTitle = messages.t(title, { fallback: title });
  const homeLabel = messages.t("menu.home", { fallback: "menu.home" });
  useDocumentTitle(translatedTitle);

  return (
    <main className="app-shell">
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="error-wrap">
            <i className="ico ico-err2"></i>
            <p>{translatedTitle}</p>
            <a className={buttonClassName} href={href}>
              {homeLabel}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

export function BadRequestPage({ href = "/" }: { href?: string }) {
  const messages = useLegacyMessages();
  const title = messages.t("error.badrequest", { fallback: "error.badrequest" });
  const homeLabel = messages.t("menu.home", { fallback: "menu.home" });
  useDocumentTitle(title);

  return (
    <main className="app-shell">
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="error-wrap">
            <i className="ico-404"></i>
            <p>{title}</p>
            <a className="ybtn ybtn-info" href={href}>
              {homeLabel}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

export function ForbiddenPage({ href }: { href: string }) {
  return (
    <RouteStatusPage buttonClassName="ybtn ybtn-primary" href={href} title="error.forbidden" />
  );
}

export function NotFoundPage({ href }: { href: string }) {
  return <RouteStatusPage href={href} title="error.notfound" />;
}

export function RedirectPage({
  basePath,
  preserveHash = false,
  preserveSearch = false,
  to,
}: {
  basePath: string;
  preserveHash?: boolean;
  preserveSearch?: boolean;
  to: string;
}) {
  const messages = useLegacyMessages();
  const navigate = useNavigate();

  React.useEffect(() => {
    const search = preserveSearch && typeof window !== "undefined" ? window.location.search : "";
    const hash = preserveHash && typeof window !== "undefined" ? window.location.hash : "";
    void navigate({ href: prefixBasePath(basePath, `${to}${search}${hash}`), replace: true });
  }, [basePath, navigate, preserveHash, preserveSearch, to]);

  return (
    <main className="app-shell">
      <h1>{messages.t("common.loading", { fallback: "common.loading" })}</h1>
    </main>
  );
}

export function useDocumentTitle(title: string) {
  const messages = useLegacyMessages();

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = messages.t(title, { fallback: title });
    }
  }, [messages, title]);
}
