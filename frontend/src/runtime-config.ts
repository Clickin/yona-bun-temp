export interface RuntimeConfig {
  apiBaseUrl: string;
  basePath: string;
  navbarCustomLinkName?: string;
  navbarCustomLinkUrl?: string;
  projectDefaultMenus?: string[];
  projectDefaultScope?: string;
  showUserEmail?: boolean;
  siteName?: string;
  supportedLanguages?: string[];
}

type RuntimeConfigInput = Omit<
  Partial<RuntimeConfig>,
  | "navbarCustomLinkName"
  | "navbarCustomLinkUrl"
  | "projectDefaultMenus"
  | "showUserEmail"
  | "supportedLanguages"
> & {
  navbarCustomLinkName?: string | null;
  navbarCustomLinkUrl?: string | null;
  projectDefaultMenus?: string[] | string | null;
  showUserEmail?: boolean | string | null;
  supportedLanguages?: string[] | string | null;
};

declare global {
  interface ImportMetaEnv {
    readonly VITE_YONA_API_BASE_URL?: string;
    readonly VITE_YONA_BASE_PATH?: string;
    readonly VITE_YONA_LANGS?: string;
    readonly VITE_YONA_NAVBAR_CUSTOM_LINK_NAME?: string;
    readonly VITE_YONA_NAVBAR_CUSTOM_LINK_URL?: string;
    readonly VITE_YONA_PROJECT_DEFAULT_MENUS?: string;
    readonly VITE_YONA_PROJECT_DEFAULT_SCOPE?: string;
    readonly VITE_YONA_SITE_NAME?: string;
    readonly VITE_YONA_SHOW_USER_EMAIL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export function normalizeBasePath(input: string | null | undefined): string {
  const trimmed = (input ?? "").trim();

  if (trimmed === "" || trimmed === "/") {
    return "/";
  }

  const normalized = `/${trimmed}`.replace(/\/+/g, "/").replace(/\/$/, "");
  return normalized === "" ? "/" : normalized;
}

export function resolveRuntimeConfig(input: RuntimeConfigInput = {}): RuntimeConfig {
  const basePath = normalizeBasePath(input.basePath);

  return {
    apiBaseUrl: input.apiBaseUrl ?? joinBasePath(basePath, "api"),
    basePath,
    navbarCustomLinkName: normalizeOptionalString(input.navbarCustomLinkName),
    navbarCustomLinkUrl: normalizeOptionalString(input.navbarCustomLinkUrl),
    projectDefaultMenus: normalizeProjectDefaultMenus(input.projectDefaultMenus),
    projectDefaultScope: normalizeProjectDefaultScope(input.projectDefaultScope),
    showUserEmail: normalizeShowUserEmail(input.showUserEmail),
    siteName: normalizeSiteName(input.siteName),
    supportedLanguages: normalizeSupportedLanguages(input.supportedLanguages),
  };
}

function readViteRuntimeConfig(): RuntimeConfigInput {
  return {
    apiBaseUrl: import.meta.env.VITE_YONA_API_BASE_URL,
    basePath: import.meta.env.VITE_YONA_BASE_PATH,
    navbarCustomLinkName: import.meta.env.VITE_YONA_NAVBAR_CUSTOM_LINK_NAME,
    navbarCustomLinkUrl: import.meta.env.VITE_YONA_NAVBAR_CUSTOM_LINK_URL,
    projectDefaultMenus: import.meta.env.VITE_YONA_PROJECT_DEFAULT_MENUS,
    supportedLanguages: import.meta.env.VITE_YONA_LANGS,
    projectDefaultScope: import.meta.env.VITE_YONA_PROJECT_DEFAULT_SCOPE,
    siteName: import.meta.env.VITE_YONA_SITE_NAME,
    showUserEmail: import.meta.env.VITE_YONA_SHOW_USER_EMAIL,
  };
}

export function readRuntimeConfig(): RuntimeConfig {
  if (typeof window === "undefined") {
    return resolveRuntimeConfig(readViteRuntimeConfig());
  }

  const browserWindow = window as Window & {
    __YONA_RUNTIME_CONFIG__?: RuntimeConfigInput;
  };
  if (browserWindow.__YONA_RUNTIME_CONFIG__) {
    return resolveRuntimeConfig(browserWindow.__YONA_RUNTIME_CONFIG__);
  }

  return resolveRuntimeConfig(readViteRuntimeConfig());
}

export function joinBasePath(basePath: string, leaf: string): string {
  return basePath === "/" ? `/${leaf}` : `${basePath}/${leaf}`;
}

export function prefixBasePath(basePath: string, href: string): string {
  const trimmed = href.trim();
  if (trimmed === "" || trimmed === "/") {
    return basePath;
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const normalizedHref = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return basePath === "/" ? normalizedHref : `${basePath}${normalizedHref}`;
}

function normalizeOptionalString(input: string | null | undefined): string {
  return (input ?? "").trim();
}

export function normalizeProjectDefaultScope(input: string | null | undefined): string {
  const normalized = (input ?? "").trim().toLowerCase();
  return ["public", "protected", "private"].includes(normalized) ? normalized : "public";
}

export function normalizeProjectDefaultMenus(
  input: string[] | string | null | undefined,
): string[] {
  const values = Array.isArray(input) ? input : (input ?? "").split(",");
  const normalized = values
    .map((value) => normalizeProjectMenuKey(value))
    .filter((value): value is NonNullable<ReturnType<typeof normalizeProjectMenuKey>> =>
      Boolean(value),
    );
  return normalized.length > 0
    ? normalized
    : ["code", "issue", "pullRequest", "review", "milestone", "board"];
}

function normalizeProjectMenuKey(value: string): string | null {
  switch (value.replace(/[\s_-]+/g, "").toLowerCase()) {
    case "board":
      return "board";
    case "code":
      return "code";
    case "issue":
      return "issue";
    case "milestone":
      return "milestone";
    case "pullrequest":
      return "pullRequest";
    case "review":
      return "review";
    default:
      return null;
  }
}

export function normalizeSupportedLanguages(input: string[] | string | null | undefined): string[] {
  const legacyLanguageCodes = ["en-US", "ko-KR", "ja-JP", "ru-RU", "uz-UZ"];
  const values = Array.isArray(input) ? input : (input ?? "").split(",");
  const normalized = values.flatMap((value) => {
    const candidate = value.trim().replace(/_/g, "-").toLowerCase();
    if (candidate === "") {
      return [];
    }

    const exactMatch = legacyLanguageCodes.find((code) => code.toLowerCase() === candidate);
    if (exactMatch) {
      return [exactMatch];
    }

    const languageOnlyMatch = legacyLanguageCodes.find(
      (code) => code.slice(0, 2).toLowerCase() === candidate,
    );
    return languageOnlyMatch ? [languageOnlyMatch] : [];
  });
  const deduped = Array.from(new Set(normalized));
  return deduped.length > 0 ? deduped : legacyLanguageCodes;
}

export function normalizeShowUserEmail(input: boolean | string | null | undefined): boolean {
  if (typeof input === "boolean") {
    return input;
  }

  switch ((input ?? "").trim().toLowerCase()) {
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    default:
      return true;
  }
}

export function normalizeSiteName(input: string | null | undefined): string {
  const trimmed = (input ?? "").trim();
  return trimmed === "" ? "Yona" : trimmed;
}
