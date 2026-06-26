/* eslint-disable jsx-a11y/anchor-is-valid, jsx-a11y/no-access-key -- legacy common/navbar.scala.html keeps accesskey=S and common/scripts.scala.html binds search-scope anchors with href="#" */
import * as React from "react";
import {
  Outlet,
  createRootRouteWithContext,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { readProjectContainerQueryOptions } from "../api/org-project";
import { siteUpdateQueryOptions } from "../api/site-admin";
import { RestApiError } from "../api/rest-client";
import { signInWithPassword, toggleFavoriteProject } from "../auth-workspace-client";
import { AppRuntimeProvider, useAppRuntime } from "../app-runtime-context";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { LegacyLoginDialog, resolvePostAuthHref } from "./-auth-views";
import { navigateToAppHref } from "./-shared";
import type { WorkspaceOverviewViewModel } from "./-view-models";

export interface AppRouterContext {
  runtimeConfig: RuntimeConfig;
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootRouteComponent,
});

function RootRouteComponent() {
  const { runtimeConfig } = Route.useRouteContext();
  const [loginDialogOpen, setLoginDialogOpen] = React.useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const appPathname = stripRuntimeBasePath(pathname, runtimeConfig.basePath);
  const framed = appPathname === "/sidebar";

  React.useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.id = "html-body";
    document.body.classList.toggle("framed-body", framed);
    return () => {
      document.body.classList.remove("framed-body");
    };
  }, [framed]);

  return (
    <YonaQueryProvider>
      <AppRuntimeProvider runtimeConfig={runtimeConfig}>
        {framed ? (
          <RootFramedShell />
        ) : (
          <div className="main" id="main">
            <RuntimeErrorBanner />
            <SiteAdminLoggedInAffix />
            <RootUpdateNotification />
            <RootHeader onOpenLoginDialog={() => setLoginDialogOpen(true)} />
            <RootSidebar />
            <Outlet />
            <RootFooter />
            <LegacyGlobalContainers />
            <LegacyCommonScriptsBridge />
            <RootLoginDialog open={loginDialogOpen} onClose={() => setLoginDialogOpen(false)} />
          </div>
        )}
      </AppRuntimeProvider>
    </YonaQueryProvider>
  );
}

const STANDALONE_FOOTER_PATHS = new Set(["/_UIKit", "/restart", "/secret"]);
const NON_PROJECT_TOP_LEVEL_PATHS = new Set([
  "_UIKit",
  "_import",
  "api",
  "assets",
  "authenticate",
  "files",
  "forgot-password",
  "images",
  "login",
  "lostPassword",
  "me",
  "migration",
  "notification",
  "notifications",
  "organizations",
  "projectform",
  "projects",
  "register",
  "reset-password",
  "resetPassword",
  "restart",
  "restricted",
  "search",
  "secret",
  "sites",
  "user",
  "users",
  "verify",
]);

type RootSearchScope =
  | { type: "global" }
  | { organizationName: string; type: "organization" }
  | { ownerName: string; projectName: string; type: "project" };
type RootMessageResolver = (key: string, options: { fallback: string }) => string;
type SidebarActiveMenu = "myOrganizationList" | "myProjectList" | "myRecentIssueList";
type LegacyFilesRuntimeConfig = {
  maxFileSize: number;
  sListURL: string;
  sUploadURL: string;
};

const DEFAULT_SIDEBAR_ACTIVE_MENU: SidebarActiveMenu = "myOrganizationList";
const LEGACY_DEFAULT_MAX_UPLOADED_FILE_SIZE = 2147483454;
const SIDEBAR_ACTIVE_MENUS = new Set<SidebarActiveMenu>([
  "myOrganizationList",
  "myProjectList",
  "myRecentIssueList",
]);

function RootFooter() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { runtimeConfig } = useAppRuntime();
  const appPathname = stripRuntimeBasePath(pathname, runtimeConfig.basePath);

  if (STANDALONE_FOOTER_PATHS.has(appPathname)) {
    return null;
  }

  return (
    <footer className="page-footer-outer">
      <div className="page-footer">
        <span className="provider">
          Copyright{" "}
          <a
            className="yona-author"
            href="https://github.com/yona-projects/yona/blob/master/AUTHORS"
            target="_blank"
          >
            Yona authors
          </a>{" "}
          &amp; ©{" "}
          <a href="https://navercorp.com" target="_blank">
            NAVER Corp.
          </a>{" "}
          &amp;{" "}
          <a className="naver-labs" href="https://naverlabs.com/" target="_blank">
            NAVER LABS
          </a>{" "}
          Supported by{" "}
          <a
            className="naver-cloud-platform"
            href="https://www.ncloud.com/?referer=yona"
            target="_blank"
          >
            NAVER CLOUD PLATFORM
          </a>
        </span>
      </div>
    </footer>
  );
}

function LegacyGlobalContainers() {
  const { messages } = useAppRuntime();

  return (
    <>
      <div aria-hidden="true" className="modal hide yobiDialog" id="yobiDialog" role="dialog">
        <div className="btn-dismiss">
          <button className="btn-transparent" data-dismiss="modal" type="button">
            &times;
          </button>
        </div>
        <div className="message">
          <div className="center-text">
            <p className="msg"></p>
            <p className="desc"></p>
          </div>
          <div className="center-txt buttons">
            <button className="ybtn ybtn-info" data-dismiss="modal" type="button">
              {messages("button.confirm", { fallback: "button.confirm" })}
            </button>
          </div>
        </div>
      </div>
      <div className="yobiToasts" id="yobiToasts"></div>
      <script id="tplYobiToast" type="text/x-jquery-tmpl">
        {
          '<div class="toast" tabindex="-1"><div class="btn-dismiss"><button type="button" class="btn-transparent">&times;</button></div><div class="center-text"><span class="v"></span><div class="msg"></div></div></div>'
        }
      </script>
    </>
  );
}

export function legacyYobiToastElement(message: string, documentRef: Document): HTMLElement {
  const toast = documentRef.createElement("div");
  toast.className = "toast";
  toast.tabIndex = -1;

  const dismiss = documentRef.createElement("div");
  dismiss.className = "btn-dismiss";
  const dismissButton = documentRef.createElement("button");
  dismissButton.className = "btn-transparent";
  dismissButton.type = "button";
  dismissButton.textContent = "×";
  dismiss.append(dismissButton);

  const centerText = documentRef.createElement("div");
  centerText.className = "center-text";
  const marker = documentRef.createElement("span");
  marker.className = "v";
  const messageNode = documentRef.createElement("div");
  messageNode.className = "msg";
  messageNode.textContent = message;
  centerText.append(marker, messageNode);
  toast.append(dismiss, centerText);
  dismissButton.addEventListener("click", () => toast.remove());
  return toast;
}

export function legacyRenderFlashNotifications(documentRef: Document): number {
  const container = documentRef.querySelector("#yobiToasts");
  if (!container) {
    return 0;
  }
  let renderedCount = 0;
  for (const source of Array.from(
    documentRef.querySelectorAll<HTMLElement>('[data-toggle="yobi-notify"]'),
  )) {
    if (source.dataset.yobiNotified === "true") {
      continue;
    }
    const message = source.textContent?.trim();
    if (!message) {
      continue;
    }
    container.append(legacyYobiToastElement(message, documentRef));
    source.dataset.yobiNotified = "true";
    renderedCount += 1;
  }
  return renderedCount;
}

export function legacyCommonScriptsExternalLinkTarget(
  href: string,
  origin: string,
): "_blank" | undefined {
  if (!href || !/^[^./#]/.test(href)) {
    return undefined;
  }
  return href.startsWith(`${origin}`) ? undefined : "_blank";
}

export function legacyApplyMarkdownExternalLinkTargets(documentRef: Document, origin: string) {
  for (const link of Array.from(
    documentRef.querySelectorAll<HTMLAnchorElement>(".markdown-wrap a[href]"),
  )) {
    const target = legacyCommonScriptsExternalLinkTarget(link.getAttribute("href") ?? "", origin);
    if (target) {
      link.target = target;
    }
  }
}

export function legacyApplyMarkdownViewerBehavior(documentRef: Document): number {
  let initializedCount = 0;
  for (const container of Array.from(documentRef.querySelectorAll<HTMLElement>(".markdown-wrap"))) {
    const images = Array.from(container.querySelectorAll<HTMLImageElement>("img"));
    if (images.length === 0) {
      continue;
    }
    container.dataset.legacyViewer = "true";
    for (const [index, image] of images.entries()) {
      image.style.cursor = "pointer";
      if (image.dataset.legacyViewerBound === "true") {
        continue;
      }
      image.dataset.legacyViewerBound = "true";
      image.addEventListener("click", () => {
        image.dispatchEvent(
          new CustomEvent("legacy:viewer:open", {
            bubbles: true,
            detail: {
              alt: image.alt,
              index,
              src: image.currentSrc || image.src,
            },
          }),
        );
      });
      initializedCount += 1;
    }
  }
  return initializedCount;
}

export function legacyFilesRuntimeConfig(runtimeConfig: RuntimeConfig): LegacyFilesRuntimeConfig {
  const filesUrl = prefixBasePath(runtimeConfig.basePath, "/files");
  return {
    maxFileSize: runtimeConfig.maxUploadedFileSize ?? LEGACY_DEFAULT_MAX_UPLOADED_FILE_SIZE,
    sListURL: filesUrl,
    sUploadURL: filesUrl,
  };
}

export function legacyApplyFilesRuntimeDefaults(
  documentRef: Document,
  windowRef: Window,
  runtimeConfig: RuntimeConfig,
): LegacyFilesRuntimeConfig {
  const filesConfig = legacyFilesRuntimeConfig(runtimeConfig);
  (
    windowRef as Window & {
      __YONA_LEGACY_FILES__?: LegacyFilesRuntimeConfig;
    }
  ).__YONA_LEGACY_FILES__ = filesConfig;
  documentRef.documentElement.dataset.yonaFilesListUrl = filesConfig.sListURL;
  documentRef.documentElement.dataset.yonaFilesUploadUrl = filesConfig.sUploadURL;
  documentRef.documentElement.dataset.yonaFilesMaxFileSize = String(filesConfig.maxFileSize);
  for (const uploadWrap of Array.from(documentRef.querySelectorAll<HTMLElement>(".upload-wrap"))) {
    uploadWrap.dataset.listUrl ||= filesConfig.sListURL;
    uploadWrap.dataset.uploadUrl ||= filesConfig.sUploadURL;
    uploadWrap.dataset.maxFileSize ||= String(filesConfig.maxFileSize);
  }
  return filesConfig;
}

export function legacyCommonScriptsShouldSubmitShortcut(event: {
  ctrlKey: boolean;
  key: string;
  metaKey?: boolean;
  target: EventTarget | null;
}): boolean {
  if ((!event.ctrlKey && !event.metaKey) || event.key !== "Enter") {
    return false;
  }
  const target = event.target;
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

export function legacyCommonScriptsShouldStartProgressForLink(element: Element): boolean {
  return Boolean(
    element.closest(
      ".logo, .title > a, .project-menu-nav > li > a, .show-progress-bar, .project-breadcrumb > span > a, .project-name > a, a.title",
    ),
  );
}

const LEGACY_SPA_EXCLUDED_PREFIXES = [
  "/api",
  "/assets",
  "/authenticate",
  "/files",
  "/images",
  "/logout",
  "/messages.js",
  "/users/logout",
];
const LEGACY_SPA_PROJECT_PAGE_SEGMENTS = new Set([
  "branches",
  "changeVCS",
  "closedPullRequests",
  "code",
  "commit",
  "commits",
  "compare",
  "deleteform",
  "issue",
  "issueform",
  "issues",
  "members",
  "milestone",
  "milestones",
  "newFork",
  "newMilestoneForm",
  "newPullRequestForm",
  "post",
  "postform",
  "posts",
  "pullRequest",
  "pullRequests",
  "reviews",
  "search",
  "sentPullRequests",
  "settingform",
  "statistics",
  "transfer",
  "watchers",
  "webhooks",
]);

function legacyNormalizeBasePath(basePath: string) {
  const trimmed = basePath.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }
  return trimmed.startsWith("/")
    ? trimmed.replace(/\/+$/u, "")
    : `/${trimmed.replace(/\/+$/u, "")}`;
}

function legacyAppPathFromUrlPathname(pathname: string, basePath: string) {
  const normalizedBasePath = legacyNormalizeBasePath(basePath);
  if (!normalizedBasePath) {
    return pathname || "/";
  }
  if (pathname === normalizedBasePath) {
    return "/";
  }
  if (pathname.startsWith(`${normalizedBasePath}/`)) {
    return pathname.slice(normalizedBasePath.length) || "/";
  }
  return null;
}

function legacyRouteOwnsAppPath(appPath: string) {
  if (appPath === "/") {
    return true;
  }
  if (
    LEGACY_SPA_EXCLUDED_PREFIXES.some(
      (prefix) => appPath === prefix || appPath.startsWith(`${prefix}/`),
    )
  ) {
    return false;
  }
  if (/\/(?:cancel|download|enroll|files|rawcode|unwatch|watch)(?:[/?#]|$)/u.test(appPath)) {
    return false;
  }
  if (
    /^\/(?:_UIKit|_help|_import|forgot-password|login|lostPassword|me|migration|notification|notifications|organizations|orgs|projectform|projects|register|reset-password|resetPassword|restart|restricted|search|secret|sites|user|users|verify)(?:\/|$)/u.test(
      appPath,
    )
  ) {
    return true;
  }

  const [, owner, projectName, pageSegment] = appPath.split("/");
  if (!owner) {
    return false;
  }
  if (!projectName) {
    return true;
  }
  if (!pageSegment) {
    return true;
  }
  return LEGACY_SPA_PROJECT_PAGE_SEGMENTS.has(pageSegment);
}

export function legacySpaNavigationPathFromHref(
  href: string,
  currentHref: string,
  basePath: string,
): string | null {
  if (!href || href.startsWith("#")) {
    return null;
  }

  const currentUrl = new URL(currentHref);
  const targetUrl = new URL(href, currentUrl);
  if (!["http:", "https:"].includes(targetUrl.protocol) || targetUrl.origin !== currentUrl.origin) {
    return null;
  }

  const appPath = legacyAppPathFromUrlPathname(targetUrl.pathname, basePath);
  if (!appPath || !legacyRouteOwnsAppPath(appPath)) {
    return null;
  }
  if (
    targetUrl.pathname === currentUrl.pathname &&
    targetUrl.search === currentUrl.search &&
    targetUrl.hash !== currentUrl.hash
  ) {
    return null;
  }
  return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
}

function legacySubmitClosestForm(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
    return false;
  }
  const form = target.closest("form");
  if (!form) {
    return false;
  }
  if (typeof form.requestSubmit === "function") {
    form.requestSubmit();
  } else {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }
  return true;
}

function LegacyCommonScriptsBridge() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const { runtimeConfig } = useAppRuntime();

  React.useEffect(() => {
    legacyRenderFlashNotifications(document);
    legacyApplyMarkdownExternalLinkTargets(document, window.location.origin);
    legacyApplyMarkdownViewerBehavior(document);
    legacyApplyFilesRuntimeDefaults(document, window, runtimeConfig);
  }, [pathname, runtimeConfig]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!legacyCommonScriptsShouldSubmitShortcut(event)) {
        return;
      }
      if (legacySubmitClosestForm(event.target)) {
        event.preventDefault();
      }
    };
    const onProgressLinkClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      if (legacyCommonScriptsShouldStartProgressForLink(event.target)) {
        window.dispatchEvent(new CustomEvent("legacy:nprogress:start"));
      }
    };
    const onSpaLinkClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const anchor = event.target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }
      if (
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self") ||
        anchor.dataset.requestMethod ||
        anchor.dataset.requestUri
      ) {
        return;
      }

      const navigationHref = legacySpaNavigationPathFromHref(
        anchor.getAttribute("href") ?? "",
        window.location.href,
        runtimeConfig.basePath,
      );
      if (!navigationHref) {
        return;
      }
      event.preventDefault();
      void navigate({ href: navigationHref });
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onSpaLinkClick);
    document.addEventListener("click", onProgressLinkClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onSpaLinkClick);
      document.removeEventListener("click", onProgressLinkClick);
    };
  }, [navigate, runtimeConfig.basePath]);

  return null;
}

function SiteAdminLoggedInAffix() {
  const { currentSession, messages } = useAppRuntime();

  if (!currentSession?.isSiteAdmin) {
    return null;
  }

  return (
    <div className="admin-logged-in-affix" data-spy="affix" data-offset-top="30">
      {messages("user.siteAdminLoggedInAffix", { fallback: "user.siteAdminLoggedInAffix" })}{" "}
      <span className="small-font">
        {messages("user.siteAdminLoggedInAffix.maxim", {
          fallback: "user.siteAdminLoggedInAffix.maxim",
        })}
      </span>
    </div>
  );
}

function RootUpdateNotification() {
  const { bootstrapping, csrfToken, currentSession, messages, runtimeConfig, setErrorMessage } =
    useAppRuntime();
  const [dismissed, setDismissed] = React.useState(false);
  const query = useQuery({
    ...siteUpdateQueryOptions(runtimeConfig),
    enabled: !bootstrapping && Boolean(currentSession?.isSiteAdmin) && !dismissed,
  });
  const versionToUpdate = query.data?.versionToUpdate ?? null;
  const releaseUrl =
    query.data?.releaseUrl ?? prefixBasePath(runtimeConfig.basePath, "/sites/update");
  const unwatchUri = prefixBasePath(runtimeConfig.basePath, "/sites/unwatchUpdate");

  if (!currentSession?.isSiteAdmin || dismissed || !versionToUpdate) {
    return null;
  }

  return (
    <p className="center-txt">
      <a href={releaseUrl}>
        {messages("site.update.notification", {
          args: [versionToUpdate],
          fallback: "site.update.notification",
        })}
      </a>
      <button
        className="ybtn ybtn-small"
        data-request-method="post"
        data-request-uri={unwatchUri}
        onClick={async (event) => {
          event.preventDefault();
          try {
            const response = await fetch(unwatchUri, {
              credentials: "same-origin",
              headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
              method: "POST",
            });
            if (!response.ok) {
              throw new Error(`site.update.notification.hide.failed:${response.status}`);
            }
            setDismissed(true);
            setErrorMessage(null);
          } catch (error) {
            setErrorMessage(
              error instanceof Error ? error.message : "site.update.notification.hide.failed",
            );
          }
        }}
        type="button"
      >
        {messages("site.update.notification.hide", {
          args: [versionToUpdate],
          fallback: "site.update.notification.hide",
        })}
      </button>
    </p>
  );
}

function RootFramedShell() {
  const { currentSession } = useAppRuntime();
  const iframeSrc = useFramedIframeSrc();
  const [activeMenu, setActiveMenu] = useSidebarActiveMenu();

  return (
    <>
      <div className="sidebar hide-in-mobile" id="sidebar">
        {currentSession && !currentSession.isAnonymous ? (
          <RootSidebarContent activeMenu={activeMenu} framed onActiveMenuChange={setActiveMenu} />
        ) : null}
        <div
          className="sidebar-bottom"
          id="sidebar-bottom"
          style={{
            bottom: "8px",
            color: "gray",
            display: activeMenu === "myRecentIssueList" ? undefined : "none",
            position: "absolute",
            right: "15px",
          }}
        >
          Yona, made by{" "}
          <i
            className="yobicon-hearts"
            style={{
              color: "red",
              verticalAlign: "middle",
            }}
          ></i>
        </div>
      </div>
      <div className="show-in-mobile-100vh" id="mainFrame">
        <iframe
          className="mainFrame"
          frameBorder="0"
          height="100%"
          id="mainFrameId"
          name="mainFrame"
          src={iframeSrc}
          title="mainFrame"
          width="100%"
        ></iframe>
        <LegacyGlobalContainers />
      </div>
    </>
  );
}

function useFramedIframeSrc(): string {
  const { currentSession, runtimeConfig } = useAppRuntime();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const appPathname = stripRuntimeBasePath(pathname, runtimeConfig.basePath);
  const defaultPage = currentSession?.defaultLandingPath || "/notifications";

  return framedIframeSrcFromSearch(
    typeof window === "undefined" ? "" : window.location.search,
    appPathname,
    runtimeConfig.basePath,
    defaultPage,
  );
}

export function framedIframeSrcFromSearch(
  search: string,
  pathname: string,
  basePath: string,
  defaultPage: string,
): string {
  const searchParams = new URLSearchParams(search);
  const path = searchParams.get("path") || defaultPage;
  const hash = searchParams.get("hash") ?? "";
  const withHash = hash ? `${path}#${hash}` : path;

  if (withHash.startsWith("http://") || withHash.startsWith("https://")) {
    return prefixBasePath(basePath, defaultPage);
  }

  if (basePath !== "/" && (withHash === basePath || withHash.startsWith(`${basePath}/`))) {
    return withHash;
  }

  if (withHash.startsWith("/")) {
    return prefixBasePath(basePath, withHash);
  }

  return prefixBasePath(basePath, pathname === "/sidebar" ? `/${withHash}` : withHash);
}

function RootHeader({ onOpenLoginDialog }: { onOpenLoginDialog: () => void }) {
  const { currentSession, messages, runtimeConfig, workspaceOverview } = useAppRuntime();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const appPathname = stripRuntimeBasePath(pathname, runtimeConfig.basePath);
  const isGuest = workspaceOverview?.profile?.isGuest ?? false;
  const showProjectListing = !runtimeConfig.hideProjectListing && !isGuest;
  const searchScope = rootSearchScopeFromPathname(appPathname);
  const searchAction = rootSearchAction(runtimeConfig.basePath, searchScope);
  const defaultSearchScopeLabel = rootSearchScopeLabel(messages, searchScope);
  const [selectedSearchAction, setSelectedSearchAction] = React.useState(searchAction);
  const [selectedSearchScopeLabel, setSelectedSearchScopeLabel] =
    React.useState(defaultSearchScopeLabel);
  const showGlobalSearchScope = showProjectListing || !!currentSession?.isSiteAdmin;
  const showOrganizationSearchScope =
    searchScope.type === "organization" &&
    (runtimeConfig.hideProjectListing || isGuest) &&
    isKnownOrganizationParticipant(searchScope.organizationName, workspaceOverview);
  const projectContainerQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, {
      ownerName: searchScope.type === "project" ? searchScope.ownerName : "",
      projectName: searchScope.type === "project" ? searchScope.projectName : "",
    }),
    enabled: searchScope.type === "project",
    retry: false,
  });
  const showProjectGroupSearchScope =
    searchScope.type === "project" && Boolean(projectContainerQuery.data?.organizationName?.trim());
  React.useEffect(() => {
    setSelectedSearchAction(searchAction);
    setSelectedSearchScopeLabel(defaultSearchScopeLabel);
  }, [defaultSearchScopeLabel, searchAction]);
  const handleSearchSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const searchParams = new URLSearchParams();
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string" && value.trim()) {
          searchParams.set(key, value);
        }
      }
      const query = searchParams.toString();
      void navigate({ href: query ? `${selectedSearchAction}?${query}` : selectedSearchAction });
    },
    [navigate, selectedSearchAction],
  );
  const handlePinClick = React.useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.parent === window) {
      window.localStorage.setItem("shallWeOpenLeftNavigation", "true");
      const hash = window.location.hash.replace(/^#/u, "");
      const searchParams = new URLSearchParams({
        path: window.location.pathname,
      });
      if (hash) {
        searchParams.set("hash", hash);
      }
      window.location.href = prefixBasePath(
        runtimeConfig.basePath,
        `/sidebar?${searchParams.toString()}`,
      );
    } else {
      window.localStorage.setItem("shallWeOpenLeftNavigation", "false");
      window.parent.location.href = window.location.href;
    }
  }, [runtimeConfig.basePath]);

  return (
    <header className={`gnb-outer${searchScope.type !== "global" ? " project-header" : ""}`}>
      <div className="gnb-inner">
        <button
          className="pin"
          data-placement="bottom"
          data-toggle="tooltip"
          onClick={handlePinClick}
          title="Sidebar"
          type="button"
        >
          <i className="yobicon-arrow-left"></i>
          <i className="yobicon-arrow-right"></i>
        </button>
        <ul className="gnb-nav">
          <li>
            <a className="logo logo-letter" href={prefixBasePath(runtimeConfig.basePath, "/")}>
              Y
            </a>
          </li>
          {showProjectListing ? (
            <>
              <li>
                <a
                  className="show-progress-bar"
                  href={prefixBasePath(runtimeConfig.basePath, "/projects")}
                >
                  {messages("title.list", { fallback: "title.list" })}
                </a>
              </li>
              <li className="divider"></li>
            </>
          ) : null}
          {runtimeConfig.feedbackUrl ? (
            <li>
              <a href={runtimeConfig.feedbackUrl} rel="noreferrer" target="_blank">
                {messages("title.yobi.feedback", { fallback: "title.yobi.feedback" })}
              </a>
            </li>
          ) : null}
          <li>
            <form
              action={selectedSearchAction}
              className="input-prepend gnb-search-form"
              name="gnb-search-form"
              onSubmit={handleSearchSubmit}
            >
              <input name="searchType" type="hidden" value="auto" />
              {searchScope.type !== "global" ? (
                <div className="btn-group">
                  <button
                    className="ybtn dropdown-toggle"
                    data-toggle="dropdown"
                    id="gnb-search-scope-title"
                    type="button"
                  >
                    {selectedSearchScopeLabel}
                  </button>
                  <ul className="dropdown-menu flat right">
                    {searchScope.type === "project" || showOrganizationSearchScope ? (
                      <li>
                        <a
                          data-action={searchAction}
                          data-toggle="search-scope"
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            setSelectedSearchAction(searchAction);
                            setSelectedSearchScopeLabel(
                              rootSearchScopeLabel(messages, searchScope),
                            );
                          }}
                        >
                          {rootSearchScopeLabel(messages, searchScope)}
                        </a>
                      </li>
                    ) : null}
                    {searchScope.type === "project" && showProjectGroupSearchScope ? (
                      <li>
                        <a
                          data-action={prefixBasePath(
                            runtimeConfig.basePath,
                            `/organizations/${encodeURIComponent(searchScope.ownerName)}/search`,
                          )}
                          data-toggle="search-scope"
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            setSelectedSearchAction(
                              prefixBasePath(
                                runtimeConfig.basePath,
                                `/organizations/${encodeURIComponent(searchScope.ownerName)}/search`,
                              ),
                            );
                            setSelectedSearchScopeLabel(
                              messages("search.scope.group", { fallback: "search.scope.group" }),
                            );
                          }}
                        >
                          {messages("search.scope.group", { fallback: "search.scope.group" })}
                        </a>
                      </li>
                    ) : null}
                    {showGlobalSearchScope ? (
                      <li>
                        <a
                          data-action={prefixBasePath(runtimeConfig.basePath, "/search")}
                          data-toggle="search-scope"
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            setSelectedSearchAction(
                              prefixBasePath(runtimeConfig.basePath, "/search"),
                            );
                            setSelectedSearchScopeLabel(
                              messages("search.scope.all", { fallback: "search.scope.all" }),
                            );
                          }}
                        >
                          {messages("search.scope.all", { fallback: "search.scope.all" })}
                        </a>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
              <div className={`search-box${searchScope.type !== "global" ? " select" : ""}`}>
                <input accessKey="S" autoComplete="off" name="keyword" type="text" />
                <button type="submit">
                  <i className="yobicon-search"></i>
                </button>
              </div>
            </form>
          </li>
        </ul>
        {currentSession && !currentSession.isAnonymous ? (
          <RootUserMenu />
        ) : (
          <RootAnonymousMenu onOpenLoginDialog={onOpenLoginDialog} />
        )}
      </div>
    </header>
  );
}

function stripRuntimeBasePath(pathname: string, basePath: string): string {
  const normalizedBasePath = basePath && basePath !== "/" ? basePath.replace(/\/+$/u, "") : "";
  if (!normalizedBasePath) {
    return pathname || "/";
  }
  if (pathname === normalizedBasePath) {
    return "/";
  }
  if (pathname.startsWith(`${normalizedBasePath}/`)) {
    return pathname.slice(normalizedBasePath.length) || "/";
  }
  return pathname || "/";
}

function isKnownOrganizationParticipant(
  organizationName: string,
  workspaceOverview: WorkspaceOverviewViewModel | null,
): boolean {
  if (!workspaceOverview) {
    return false;
  }

  return (
    workspaceOverview.memberProjects?.some((project) => project.ownerName === organizationName) ??
    false
  );
}

function rootSearchScopeFromPathname(pathname: string): RootSearchScope {
  const segments = pathname.split("/").flatMap((segment) => {
    const trimmed = segment.trim();
    return trimmed ? [trimmed] : [];
  });

  if (segments[0] === "organizations" && segments[1]) {
    return { organizationName: segments[1], type: "organization" };
  }

  if (
    segments.length >= 2 &&
    segments[0] &&
    segments[1] &&
    !NON_PROJECT_TOP_LEVEL_PATHS.has(segments[0])
  ) {
    return { ownerName: segments[0], projectName: segments[1], type: "project" };
  }

  return { type: "global" };
}

function rootSearchAction(basePath: string, scope: RootSearchScope): string {
  if (scope.type === "project") {
    return prefixBasePath(basePath, `/${scope.ownerName}/${scope.projectName}/search`);
  }

  if (scope.type === "organization") {
    return prefixBasePath(basePath, `/organizations/${scope.organizationName}/search`);
  }

  return prefixBasePath(basePath, "/search");
}

function rootSearchScopeLabel(messages: RootMessageResolver, scope: RootSearchScope): string {
  if (scope.type === "project") {
    return messages("search.scope.project", { fallback: "search.scope.project" });
  }
  if (scope.type === "organization") {
    return messages("search.scope.group", { fallback: "search.scope.group" });
  }
  return messages("search.scope.all", { fallback: "search.scope.all" });
}

function readSidebarActiveMenu(): SidebarActiveMenu {
  if (typeof window === "undefined") {
    return DEFAULT_SIDEBAR_ACTIVE_MENU;
  }

  const stored = window.localStorage.getItem("sidebarActiveMenu");
  return SIDEBAR_ACTIVE_MENUS.has(stored as SidebarActiveMenu)
    ? (stored as SidebarActiveMenu)
    : DEFAULT_SIDEBAR_ACTIVE_MENU;
}

function useSidebarActiveMenu(): [SidebarActiveMenu, (nextMenu: SidebarActiveMenu) => void] {
  const [activeMenu, setActiveMenu] = React.useState<SidebarActiveMenu>(readSidebarActiveMenu);
  const selectActiveMenu = React.useCallback((nextMenu: SidebarActiveMenu) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sidebarActiveMenu", nextMenu);
    }
    setActiveMenu(nextMenu);
  }, []);

  return [activeMenu, selectActiveMenu];
}

function RootSidebar() {
  const { currentSession } = useAppRuntime();

  if (!currentSession || currentSession.isAnonymous) {
    return null;
  }

  return (
    <div id="mySidenav" className="sidenav">
      <RootSidebarContent />
    </div>
  );
}

function RootSidebarContent({
  activeMenu,
  framed = false,
  onActiveMenuChange,
}: {
  activeMenu?: SidebarActiveMenu;
  framed?: boolean;
  onActiveMenuChange?: (nextMenu: SidebarActiveMenu) => void;
}) {
  const {
    csrfToken,
    currentSession,
    messages,
    refreshWorkspace,
    runtimeConfig,
    setErrorMessage,
    workspaceOverview,
  } = useAppRuntime();
  const [internalActiveMenu, setInternalActiveMenu] = useSidebarActiveMenu();
  const toggleSidebarProjectFavorite = React.useCallback(
    async (ownerName: string, projectName: string, starElement: HTMLElement) => {
      if (!csrfToken || !currentSession || currentSession.isAnonymous) {
        return;
      }
      try {
        const result = await toggleFavoriteProject(
          runtimeConfig,
          csrfToken,
          ownerName,
          projectName,
        );
        const favored = legacyUsermenuFavoredFromResponse(result);
        if (favored !== null) {
          starElement.classList.toggle("starred", favored);
        }
        await refreshWorkspace(currentSession);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Update failed: favorite project");
      }
    },
    [csrfToken, currentSession, refreshWorkspace, runtimeConfig, setErrorMessage],
  );

  if (!currentSession || currentSession.isAnonymous) {
    return null;
  }

  const selectedActiveMenu = activeMenu ?? internalActiveMenu;
  const selectActiveMenu = onActiveMenuChange ?? setInternalActiveMenu;
  const profileHref = prefixBasePath(runtimeConfig.basePath, `/${currentSession.loginId}`);
  const accountHref = prefixBasePath(runtimeConfig.basePath, "/user/editform");
  const logoutHref = prefixBasePath(runtimeConfig.basePath, "/users/logout");
  const target = framed ? "mainFrame" : undefined;
  const handleSidebarPinClick = framed
    ? () => {
        if (typeof window === "undefined") {
          return;
        }
        window.localStorage.setItem("shallWeOpenLeftNavigation", "false");
        window.location.reload();
      }
    : undefined;

  return (
    <>
      <div className={framed ? "" : "span5 right-menu span-hard-wrap"}>
        <div className="row-fluid user-menu-wrap">
          <span className="user-menu">
            <a href={profileHref} target={target}>
              {framed ? (
                <span className="avatar-wrap smaller">
                  <img
                    alt={currentSession.userLabel || currentSession.loginId}
                    src={
                      workspaceOverview?.profile?.avatarUrl ||
                      prefixBasePath(runtimeConfig.basePath, "/assets/images/default-avatar-64.png")
                    }
                  />
                </span>
              ) : null}
              {messages("userinfo.profile", { fallback: "userinfo.profile" })}
            </a>
          </span>
          <span className="user-menu">
            <a href={accountHref} target={target}>
              {messages("userinfo.accountSetting", { fallback: "userinfo.accountSetting" })}
            </a>
          </span>
          <a href={logoutHref}>
            <span className="user-menu logout label">
              {messages("title.logout", { fallback: "title.logout" })}
            </span>
          </a>
          {framed ? (
            <button
              className="pin-in-sidebar"
              data-placement="bottom"
              data-toggle="tooltip"
              onClick={handleSidebarPinClick}
              title="Sidebar"
              type="button"
            >
              <i className="yobicon-arrow-left"></i>
            </button>
          ) : null}
        </div>
        <ul className="nav nav-tabs nm">
          <li
            className={`myOrganizationList${selectedActiveMenu === "myOrganizationList" ? " active" : ""}`}
          >
            <a
              data-toggle="tab"
              href="#myOrganizationList"
              onClick={() => selectActiveMenu("myOrganizationList")}
            >
              {messages("title.favorite", { fallback: "title.favorite" })}
            </a>
          </li>
          <li className={`myProjectList${selectedActiveMenu === "myProjectList" ? " active" : ""}`}>
            <a
              data-toggle="tab"
              href="#myProjectList"
              onClick={() => selectActiveMenu("myProjectList")}
            >
              {messages("title.project", { fallback: "title.project" })}
            </a>
          </li>
          <li
            className={`myRecentIssueList${selectedActiveMenu === "myRecentIssueList" ? " active" : ""}`}
          >
            <a
              data-toggle="tab"
              href="#myRecentIssueList"
              onClick={() => selectActiveMenu("myRecentIssueList")}
            >
              {messages("title.recently.visited.issue", {
                fallback: "title.recently.visited.issue",
              })}
            </a>
          </li>
          {framed ? (
            <li>
              <button
                className="btn-transparent"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.location.reload();
                  }
                }}
                type="button"
              >
                <i className="yobicon-refresh refresh-button"></i>
              </button>
            </li>
          ) : null}
        </ul>
        <div className="tab-content tab-box user-project-list">
          <div id="usermenu-tab-content-list" className="tab-content">
            <SidebarProjectList
              active={selectedActiveMenu === "myOrganizationList"}
              id="myOrganizationList"
              noResultsLabel={messages("title.no.results", { fallback: "title.no.results" })}
              onToggleFavorite={toggleSidebarProjectFavorite}
              projects={workspaceOverview?.favoriteProjects ?? []}
              runtimeConfig={runtimeConfig}
            />
            <SidebarProjectList
              active={selectedActiveMenu === "myProjectList"}
              id="myProjectList"
              noResultsLabel={messages("title.no.results", { fallback: "title.no.results" })}
              onToggleFavorite={toggleSidebarProjectFavorite}
              projects={[
                ...(workspaceOverview?.recentProjects ?? []),
                ...(workspaceOverview?.watchedProjects ?? []),
              ]}
              runtimeConfig={runtimeConfig}
            />
            <SidebarIssueList
              active={selectedActiveMenu === "myRecentIssueList"}
              issues={workspaceOverview?.issueItems ?? []}
              noResultsLabel={messages("title.no.results", { fallback: "title.no.results" })}
              runtimeConfig={runtimeConfig}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function SidebarProjectList({
  active = false,
  id,
  noResultsLabel,
  onToggleFavorite,
  projects,
  runtimeConfig,
}: {
  active?: boolean;
  id: string;
  noResultsLabel: string;
  onToggleFavorite?: (
    ownerName: string,
    projectName: string,
    starElement: HTMLElement,
  ) => Promise<void>;
  projects: Array<{ ownerName: string; projectName: string }>;
  runtimeConfig: RuntimeConfig;
}) {
  if (projects.length === 0) {
    return (
      <div className={`no-result tab-pane user-ul ${active ? "active" : ""}`} id={id}>
        {noResultsLabel}
      </div>
    );
  }

  return (
    <ul className={`tab-pane user-ul ${active ? "active" : ""}`} id={id}>
      {projects.map((project) => {
        const projectHref = prefixBasePath(
          runtimeConfig.basePath,
          `/${project.ownerName}/${project.projectName}`,
        );
        const ownerHref = prefixBasePath(runtimeConfig.basePath, `/${project.ownerName}`);
        return (
          <li className="user-li " data-location={projectHref} key={`${id}:${projectHref}`}>
            <div className="project-list project-flex-container">
              <div className="project-item project-item-container">
                <div className="flex-item site-logo">
                  <i className="project-avatar">
                    <span className="dummy-25px"> </span>
                  </i>
                </div>
                <div className="projectName-owner flex-item">
                  <div className="project-name flex-item">
                    <a href={projectHref}>{project.projectName}</a>
                  </div>
                  <div className="project-owner flex-item">
                    <a href={ownerHref}>{project.ownerName}</a>
                  </div>
                </div>
              </div>
              <button
                className="star-project flex-item"
                data-owner-name={project.ownerName}
                data-project-id={`${project.ownerName}/${project.projectName}`}
                data-project-name={project.projectName}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const star = event.currentTarget.querySelector<HTMLElement>("i");
                  if (!star || !onToggleFavorite) {
                    return;
                  }
                  void onToggleFavorite(project.ownerName, project.projectName, star);
                }}
                type="button"
              >
                <i className="star material-icons">star</i>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function legacyUsermenuFavoredFromResponse(
  response: Record<string, unknown>,
): boolean | null {
  const favored = response.favored ?? response.favorite ?? response.isFavorite;
  if (typeof favored === "boolean") {
    return favored;
  }
  if (typeof favored === "number") {
    return favored > 0;
  }
  if (typeof favored === "string") {
    if (favored === "true" || favored === "1") {
      return true;
    }
    if (favored === "false" || favored === "0") {
      return false;
    }
  }
  return null;
}

function SidebarIssueList({
  active = false,
  issues,
  noResultsLabel,
  runtimeConfig,
}: {
  active?: boolean;
  issues: NonNullable<WorkspaceOverviewViewModel["issueItems"]>;
  noResultsLabel: string;
  runtimeConfig: RuntimeConfig;
}) {
  if (issues.length === 0) {
    return (
      <div
        className={`no-result tab-pane user-ul ${active ? "active" : ""}`}
        id="myRecentIssueList"
      >
        {noResultsLabel}
      </div>
    );
  }

  return (
    <ul className={`tab-pane user-ul ${active ? "active" : ""}`} id="myRecentIssueList">
      {issues.map((issue) => {
        const href = prefixBasePath(
          runtimeConfig.basePath,
          `/${issue.ownerName}/${issue.projectName}/issue/${issue.issueNumber}`,
        );
        return (
          <li className="user-li" data-location={href} key={href}>
            <a href={href}>{issue.title}</a>
          </li>
        );
      })}
    </ul>
  );
}

function RootUserMenu() {
  const { currentSession, messages, runtimeConfig, workspaceOverview } = useAppRuntime();
  const [createMenuOpen, setCreateMenuOpen] = React.useState(false);

  if (!currentSession || currentSession.isAnonymous) {
    return null;
  }

  const customLinkName = runtimeConfig.navbarCustomLinkName?.trim();
  const avatarUrl =
    workspaceOverview?.profile?.avatarUrl ||
    prefixBasePath(runtimeConfig.basePath, "/assets/images/default-avatar-64.png");
  const isGuest = workspaceOverview?.profile?.isGuest ?? false;

  return (
    <ul className="gnb-usermenu">
      {customLinkName ? (
        <li className="gnb-usermenu-item">
          <a
            className="user-item-btn loggged-in"
            href={prefixBasePath(runtimeConfig.basePath, runtimeConfig.navbarCustomLinkUrl || "/")}
          >
            {customLinkName}
          </a>
        </li>
      ) : null}
      <li
        className="gnb-usermenu-item"
        data-placement="bottom"
        data-toggle="tooltip"
        title={`${messages("title.shortcut", { fallback: "title.shortcut" })} (A)`}
      >
        <a
          className="user-item-btn loggged-in"
          href={prefixBasePath(runtimeConfig.basePath, "/user/issues")}
        >
          {messages("issue.myIssue", { fallback: "issue.myIssue" })}
        </a>
      </li>
      <li className="divider"></li>
      {currentSession.isSiteAdmin ? (
        <li className="gnb-usermenu-item">
          <a
            className="usermenu-icon-button show-progress-bar"
            data-placement="bottom"
            data-toggle="tooltip"
            href={prefixBasePath(runtimeConfig.basePath, "/sites/userList")}
            title={messages("menu.siteAdmin", { fallback: "menu.siteAdmin" })}
          >
            <i className="yobicon-wrench"></i>
          </a>
        </li>
      ) : null}
      {currentSession.isSiteAdmin ? <li className="divider"></li> : null}
      <li className="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn">
        <a
          className="gnb-dropdown-toggle"
          data-placement="bottom"
          data-toggle="tooltip"
          href="#mySidenav"
          title={`${messages("user.menu", { fallback: "user.menu" })}, ${messages(
            "title.shortcut",
            {
              fallback: "title.shortcut",
            },
          )} (F)`}
        >
          <span className="avatar-wrap smaller">
            <img alt={currentSession.userLabel || currentSession.loginId} src={avatarUrl} />
          </span>
          <span className="caret"></span>
        </a>
      </li>
      <li className={createMenuOpen ? "gnb-usermenu-dropdown open" : "gnb-usermenu-dropdown"}>
        <a
          className="gnb-dropdown-toggle dropdwon-box-btn"
          data-toggle="dropdown"
          href="#gnb-create-menu"
          onClick={(event) => {
            event.preventDefault();
            setCreateMenuOpen((current) => !current);
          }}
        >
          <i className="yobicon-plus"></i>
          <span className="caret"></span>
        </a>
        <ul className="dropdown-menu flat right" id="gnb-create-menu">
          <li>
            <a href={prefixBasePath(runtimeConfig.basePath, "/user/issues/new")}>
              {messages("issue.menu.new", { fallback: "issue.menu.new" })}
            </a>
          </li>
          <li>
            <a href={prefixBasePath(runtimeConfig.basePath, "/user/issues/new/mine")}>
              {messages("issue.menu.new.mine", { fallback: "issue.menu.new.mine" })}
            </a>
          </li>
          <li>
            <hr className="no-margin" />
          </li>
          <li>
            <a href={prefixBasePath(runtimeConfig.basePath, "/projects/new")}>
              {messages("button.newProject", { fallback: "button.newProject" })}
            </a>
          </li>
          {!isGuest ? (
            <li>
              <a href={prefixBasePath(runtimeConfig.basePath, "/organizations/new")}>
                {messages("title.newOrganization", { fallback: "title.newOrganization" })}
              </a>
            </li>
          ) : null}
        </ul>
      </li>
    </ul>
  );
}

function RootAnonymousMenu({ onOpenLoginDialog }: { onOpenLoginDialog: () => void }) {
  const { messages, runtimeConfig } = useAppRuntime();

  return (
    <ul className="gnb-usermenu">
      <li className="gnb-usermenu-item" id="required-logged-in">
        <a
          className="user-item-btn"
          data-login="required"
          href={prefixBasePath(runtimeConfig.basePath, "/users/loginform")}
          onClick={(event) => {
            event.preventDefault();
            onOpenLoginDialog();
          }}
        >
          {messages("button.login", { fallback: "button.login" })}
        </a>
      </li>
      <li className="divider"></li>
      <li>
        <a
          className="ybtn ybtn-success"
          href={prefixBasePath(runtimeConfig.basePath, "/users/signupform")}
        >
          {messages("title.signup", { fallback: "title.signup" })}
        </a>
      </li>
    </ul>
  );
}

function RootLoginDialog({ onClose, open }: { onClose: () => void; open: boolean }) {
  const {
    authUiCapabilities,
    csrfToken,
    currentSession,
    refreshWorkspace,
    runtimeConfig,
    setCurrentSession,
    setErrorMessage,
  } = useAppRuntime();
  const [pending, setPending] = React.useState(false);
  const [dialogErrorMessage, setDialogErrorMessage] = React.useState<string | null>(null);

  if (currentSession && !currentSession.isAnonymous) {
    return null;
  }

  return (
    <LegacyLoginDialog
      authUiCapabilities={authUiCapabilities}
      csrfToken={csrfToken}
      errorMessage={dialogErrorMessage}
      open={open}
      onClose={() => {
        setDialogErrorMessage(null);
        onClose();
      }}
      runtimeConfig={runtimeConfig}
      onSignIn={async (input) => {
        if (pending) {
          return;
        }
        setPending(true);
        setDialogErrorMessage(null);
        setErrorMessage(null);
        try {
          const session = await signInWithPassword(runtimeConfig, csrfToken, input);
          setCurrentSession(session);
          await refreshWorkspace(session);
          navigateToAppHref(
            runtimeConfig.basePath,
            resolvePostAuthHref(null, session.defaultLandingPath),
          );
        } catch (error) {
          setDialogErrorMessage(legacyLoginFailureMessage(error));
        } finally {
          setPending(false);
        }
      }}
    />
  );
}

function legacyLoginFailureMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "user.login.failed.network";
  }
  if (error instanceof RestApiError) {
    if (error.code !== "http_error" && error.message) {
      return error.message;
    }
    if (error.status >= 400 && error.status < 500) {
      return "user.login.failed.client";
    }
    if (error.status >= 500 && error.status < 600) {
      return "user.login.failed.server";
    }
    return "user.login.failed";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "user.login.failed";
}

function RuntimeErrorBanner() {
  const { errorMessage, messages, setErrorMessage } = useAppRuntime();

  if (!errorMessage) {
    return null;
  }

  const translatedErrorMessage = messages(errorMessage, { fallback: errorMessage });
  const closeLabel = messages("button.close", { fallback: "button.close" });

  return (
    <div className="runtime-error-banner" role="alert">
      <span>{translatedErrorMessage}</span>
      <button onClick={() => setErrorMessage(null)} type="button">
        {closeLabel}
      </button>
    </div>
  );
}
