export interface RuntimeConfig {
  apiBaseUrl: string;
  basePath: string;
  projectDefaultScope?: string;
  supportedLanguages?: string[];
}

type RuntimeConfigInput = Omit<Partial<RuntimeConfig>, "supportedLanguages"> & {
  supportedLanguages?: string[] | string | null;
};

declare global {
  interface ImportMetaEnv {
    readonly VITE_YONA_API_BASE_URL?: string;
    readonly VITE_YONA_BASE_PATH?: string;
    readonly VITE_YONA_LANGS?: string;
    readonly VITE_YONA_PROJECT_DEFAULT_SCOPE?: string;
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
    projectDefaultScope: normalizeProjectDefaultScope(input.projectDefaultScope),
    supportedLanguages: normalizeSupportedLanguages(input.supportedLanguages),
  };
}

function readViteRuntimeConfig(): RuntimeConfigInput {
  return {
    apiBaseUrl: import.meta.env.VITE_YONA_API_BASE_URL,
    basePath: import.meta.env.VITE_YONA_BASE_PATH,
    supportedLanguages: import.meta.env.VITE_YONA_LANGS,
    projectDefaultScope: import.meta.env.VITE_YONA_PROJECT_DEFAULT_SCOPE,
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

export function normalizeProjectDefaultScope(input: string | null | undefined): string {
  const normalized = (input ?? "").trim().toLowerCase();
  return ["public", "protected", "private"].includes(normalized) ? normalized : "public";
}

export function normalizeSupportedLanguages(input: string[] | string | null | undefined): string[] {
  const values = Array.isArray(input) ? input : (input ?? "").split(",");
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : ["en-US", "ko-KR", "ja-JP", "ru-RU", "uz-UZ"];
}
