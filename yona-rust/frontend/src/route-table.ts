import { normalizeBasePath } from "./runtime-config";

export type AppRoute =
  | { kind: "public-home"; href: "/" }
  | { kind: "public-projects"; href: string }
  | { kind: "public-organizations"; href: string }
  | { kind: "login"; href: string }
  | { kind: "register"; href: string }
  | { kind: "lost-password"; href: string }
  | { kind: "reset-password"; href: string }
  | { kind: "me"; href: "/me" }
  | {
      kind: "workspace-settings";
      href: string;
      section: "emails" | "notifications" | "password" | "profile" | "token";
    }
  | { kind: "organization-new"; href: "/organizations/new" }
  | { kind: "organization-detail"; href: string; organizationName: string }
  | { kind: "organization-settings"; href: string; organizationName: string }
  | { kind: "organization-issues"; href: string; organizationName: string }
  | { kind: "organization-boards"; href: string; organizationName: string }
  | { kind: "organization-pull-requests"; href: string; organizationName: string }
  | { kind: "project-new"; href: string }
  | { kind: "project-detail"; href: string; ownerName: string; projectName: string }
  | { kind: "project-settings"; href: string; ownerName: string; projectName: string }
  | { kind: "project-issues"; href: string; ownerName: string; projectName: string }
  | { kind: "issue-detail"; href: string; ownerName: string; projectName: string; issueNumber: number }
  | { kind: "project-boards"; href: string; ownerName: string; projectName: string }
  | { kind: "board-detail"; href: string; ownerName: string; projectName: string; postNumber: number }
  | { kind: "code-browser"; href: string; ownerName: string; projectName: string }
  | { kind: "pull-request-list"; href: string; ownerName: string; projectName: string }
  | {
      kind: "pull-request-detail";
      href: string;
      ownerName: string;
      projectName: string;
      pullRequestNumber: number;
    }
  | { kind: "search"; href: string }
  | { kind: "site-admin"; href: string; pageName: string }
  | { kind: "external"; href: string };

type RouteKind = AppRoute["kind"];
type DynamicTitleRouteKind = "organization-detail" | "project-detail" | "external";

const STATIC_ROUTE_TITLES = {
  "public-home": "Yona",
  "public-projects": "Project List",
  "public-organizations": "Organization List",
  login: "Login",
  register: "Sign Up",
  "lost-password": "Forgot Password",
  "reset-password": "Reset Password",
  me: "My Page",
  "workspace-settings": "Account Settings",
  "organization-new": "Create Organization",
  "organization-settings": "Organization Settings",
  "organization-issues": "Organization Issues",
  "organization-boards": "Organization Boards",
  "organization-pull-requests": "Organization Pull Requests",
  "project-new": "Create Project",
  "project-settings": "Project Settings",
  "project-issues": "Issues",
  "issue-detail": "Issue",
  "project-boards": "Boards",
  "board-detail": "Board",
  "code-browser": "Code",
  "pull-request-list": "Pull Requests",
  "pull-request-detail": "Pull Request",
  search: "Search",
  "site-admin": "Site Admin",
} satisfies Record<Exclude<RouteKind, DynamicTitleRouteKind>, string>;

const RESERVED_PROJECT_PREFIXES = new Set([
  "api",
  "assets",
  "favicon.ico",
  "forgot-password",
  "login",
  "lostpassword",
  "me",
  "notifications",
  "orgs",
  "organizations",
  "projectform",
  "projects",
  "register",
  "reset-password",
  "resetpassword",
  "search",
  "sites",
  "users",
]);

function splitPathAndQuery(href: string) {
  const trimmed = href.trim();
  const queryIndex = trimmed.indexOf("?");
  if (queryIndex < 0) {
    return { pathname: trimmed, query: "" };
  }

  return {
    pathname: trimmed.slice(0, queryIndex),
    query: trimmed.slice(queryIndex),
  };
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function parseSegments(pathname: string): string[] {
  return trimSlashes(pathname).split("/").filter(Boolean);
}

function canonicalHref(pathname: string, query: string): string {
  return `${pathname}${query}`;
}

function stripBasePath(pathname: string, basePath: string): string {
  if (basePath === "/" || pathname === basePath) {
    return pathname === basePath ? "/" : pathname;
  }

  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length) || "/";
  }

  return pathname;
}

function matchProjectRoute(
  ownerName: string,
  projectName: string,
  rest: string[],
  query: string,
): AppRoute {
  const lowerRest = rest.map((segment) => segment.toLowerCase());

  if (rest.length === 0) {
    return {
      kind: "project-detail",
      href: canonicalHref(`/${ownerName}/${projectName}`, query),
      ownerName,
      projectName,
    };
  }

  if (lowerRest[0] === "settingform" || lowerRest[0] === "settings") {
    return {
      kind: "project-settings",
      href: canonicalHref(`/${ownerName}/${projectName}/settingform`, query),
      ownerName,
      projectName,
    };
  }

  if (lowerRest[0] === "issues" && rest.length === 1) {
    return {
      kind: "project-issues",
      href: canonicalHref(`/${ownerName}/${projectName}/issues`, query),
      ownerName,
      projectName,
    };
  }

  if (lowerRest[0] === "issue" && rest.length >= 2) {
    const issueNumber = Number.parseInt(rest[1] ?? "", 10);
    if (Number.isInteger(issueNumber) && issueNumber > 0) {
      return {
        kind: "issue-detail",
        href: canonicalHref(`/${ownerName}/${projectName}/issue/${issueNumber}`, query),
        issueNumber,
        ownerName,
        projectName,
      };
    }
  }

  if (lowerRest[0] === "posts" && rest.length === 1) {
    return {
      kind: "project-boards",
      href: canonicalHref(`/${ownerName}/${projectName}/posts`, query),
      ownerName,
      projectName,
    };
  }

  if (lowerRest[0] === "post" && rest.length >= 2) {
    const postNumber = Number.parseInt(rest[1] ?? "", 10);
    if (Number.isInteger(postNumber) && postNumber > 0) {
      return {
        kind: "board-detail",
        href: canonicalHref(`/${ownerName}/${projectName}/post/${postNumber}`, query),
        ownerName,
        postNumber,
        projectName,
      };
    }
  }

  if (lowerRest[0] === "code") {
    return {
      kind: "code-browser",
      href: canonicalHref(`/${ownerName}/${projectName}/code`, query),
      ownerName,
      projectName,
    };
  }

  if (
    lowerRest[0] === "pullrequests" ||
    lowerRest[0] === "closedpullrequests" ||
    lowerRest[0] === "sentpullrequests"
  ) {
    return {
      kind: "pull-request-list",
      href: canonicalHref(`/${ownerName}/${projectName}/${rest[0]}`, query),
      ownerName,
      projectName,
    };
  }

  if (lowerRest[0] === "pullrequest" && rest.length >= 2) {
    const pullRequestNumber = Number.parseInt(rest[1] ?? "", 10);
    if (Number.isInteger(pullRequestNumber) && pullRequestNumber > 0) {
      return {
        kind: "pull-request-detail",
        href: canonicalHref(
          `/${ownerName}/${projectName}/pullRequest/${pullRequestNumber}`,
          query,
        ),
        ownerName,
        projectName,
        pullRequestNumber,
      };
    }
  }

  return {
    kind: "external",
    href: canonicalHref(`/${ownerName}/${projectName}/${rest.join("/")}`, query),
  };
}

export function resolveCurrentPath(
  href: string,
  options: { basePath?: string } = {},
): AppRoute {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(href.trim())) {
    return { kind: "external", href };
  }

  const { pathname, query } = splitPathAndQuery(href);
  const normalizedPathname = stripBasePath(pathname, normalizeBasePath(options.basePath));
  const segments = parseSegments(normalizedPathname);
  const routeParts = segments[0] === "yona" ? segments.slice(1) : segments;
  const lowerRouteParts = routeParts.map((segment) => segment.toLowerCase());

  if (routeParts.length === 0) {
    return { kind: "public-home", href: "/" };
  }

  if (
    (lowerRouteParts[0] === "users" && lowerRouteParts[1] === "loginform") ||
    lowerRouteParts[0] === "login"
  ) {
    return {
      kind: "login",
      href: canonicalHref("/users/loginform", query),
    };
  }

  if (
    (lowerRouteParts[0] === "users" && lowerRouteParts[1] === "signupform") ||
    lowerRouteParts[0] === "register"
  ) {
    return {
      kind: "register",
      href: canonicalHref("/users/signupform", query),
    };
  }

  if (lowerRouteParts[0] === "lostpassword" || lowerRouteParts[0] === "forgot-password") {
    return {
      kind: "lost-password",
      href: canonicalHref("/lostPassword", query),
    };
  }

  if (lowerRouteParts[0] === "resetpassword" || lowerRouteParts[0] === "reset-password") {
    return {
      kind: "reset-password",
      href: canonicalHref("/resetPassword", query),
    };
  }

  if (lowerRouteParts[0] === "projects" && routeParts.length === 1) {
    return {
      kind: "public-projects",
      href: canonicalHref("/projects", query),
    };
  }

  if (lowerRouteParts[0] === "orgs" && routeParts.length === 1) {
    return {
      kind: "public-organizations",
      href: canonicalHref("/orgs", query),
    };
  }

  if (lowerRouteParts[0] === "me" && routeParts.length === 1) {
    return { kind: "me", href: "/me" };
  }

  if (lowerRouteParts[0] === "user" && lowerRouteParts[1] === "editform") {
    const section = lowerRouteParts[2] ?? "profile";
    if (["profile", "password", "notifications", "emails", "token"].includes(section)) {
      return {
        kind: "workspace-settings",
        href: section === "profile" ? "/user/editform" : `/user/editform/${section}`,
        section: section as "emails" | "notifications" | "password" | "profile" | "token",
      };
    }
  }

  if (
    lowerRouteParts[0] === "me" &&
    lowerRouteParts[1] === "settings" &&
    ["profile", "password", "notifications", "emails", "token"].includes(
      lowerRouteParts[2] ?? "",
    )
  ) {
    return {
      kind: "workspace-settings",
      href:
        lowerRouteParts[2] === "profile"
          ? "/user/editform"
          : canonicalHref(`/user/editform/${lowerRouteParts[2]}`, query),
      section: lowerRouteParts[2] as "emails" | "notifications" | "password" | "profile" | "token",
    };
  }

  if (lowerRouteParts[0] === "search") {
    return {
      kind: "search",
      href: canonicalHref("/search", query),
    };
  }

  if (lowerRouteParts[0] === "sites") {
    return {
      kind: "site-admin",
      href: canonicalHref(`/${routeParts.join("/")}`, query),
      pageName: routeParts[1] ?? "index",
    };
  }

  if (lowerRouteParts[0] === "organizations") {
    if (routeParts.length === 2 && lowerRouteParts[1] === "new") {
      return { kind: "organization-new", href: "/organizations/new" };
    }

    if (routeParts.length === 2) {
      return {
        kind: "organization-detail",
        href: canonicalHref(`/organizations/${routeParts[1]}`, query),
        organizationName: routeParts[1],
      };
    }

    if (
      routeParts.length === 3 &&
      (lowerRouteParts[2] === "settingform" || lowerRouteParts[2] === "settings")
    ) {
      return {
        kind: "organization-settings",
        href: canonicalHref(`/organizations/${routeParts[1]}/settingform`, query),
        organizationName: routeParts[1],
      };
    }

    if (routeParts.length === 3 && lowerRouteParts[2] === "issues") {
      return {
        kind: "organization-issues",
        href: canonicalHref(`/organizations/${routeParts[1]}/issues`, query),
        organizationName: routeParts[1],
      };
    }

    if (routeParts.length === 3 && lowerRouteParts[2] === "boards") {
      return {
        kind: "organization-boards",
        href: canonicalHref(`/organizations/${routeParts[1]}/boards`, query),
        organizationName: routeParts[1],
      };
    }

    if (
      routeParts.length === 3 &&
      (lowerRouteParts[2] === "pullrequests" || lowerRouteParts[2] === "closedpullrequests")
    ) {
      return {
        kind: "organization-pull-requests",
        href: canonicalHref(`/organizations/${routeParts[1]}/${routeParts[2]}`, query),
        organizationName: routeParts[1],
      };
    }
  }

  if (lowerRouteParts[0] === "projectform") {
    return {
      kind: "project-new",
      href: canonicalHref("/projectform", query),
    };
  }

  if (lowerRouteParts[0] === "projects" && lowerRouteParts[1] === "new") {
    return {
      kind: "project-new",
      href: canonicalHref("/projectform", query),
    };
  }

  if (routeParts.length >= 2 && !RESERVED_PROJECT_PREFIXES.has(lowerRouteParts[0] ?? "")) {
    return matchProjectRoute(routeParts[0], routeParts[1], routeParts.slice(2), query);
  }

  return { kind: "external", href };
}

export function routeHref(route: AppRoute): string {
  return route.href;
}

export function routeDocumentTitle(route: AppRoute): string {
  switch (route.kind) {
    case "organization-detail":
      return route.organizationName;
    case "project-detail":
      return `${route.ownerName}/${route.projectName}`;
    case "external":
      return "Yona Rust Frontend";
    default:
      return STATIC_ROUTE_TITLES[route.kind];
  }
}
