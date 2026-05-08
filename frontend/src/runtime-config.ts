export interface RuntimeConfig {
  apiBaseUrl: string;
  basePath: string;
}

declare global {
  interface ImportMetaEnv {
    readonly VITE_YONA_API_BASE_URL?: string;
    readonly VITE_YONA_BASE_PATH?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface Window {
    __YONA_RUNTIME_CONFIG__?: Partial<RuntimeConfig>;
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

export function resolveRuntimeConfig(input: Partial<RuntimeConfig> = {}): RuntimeConfig {
  const basePath = normalizeBasePath(input.basePath);

  return {
    apiBaseUrl: input.apiBaseUrl ?? joinBasePath(basePath, "api"),
    basePath,
  };
}

function readViteRuntimeConfig(): Partial<RuntimeConfig> {
  return {
    apiBaseUrl: import.meta.env.VITE_YONA_API_BASE_URL,
    basePath: import.meta.env.VITE_YONA_BASE_PATH,
  };
}

export function readRuntimeConfig(): RuntimeConfig {
  if (typeof window === "undefined") {
    return resolveRuntimeConfig(readViteRuntimeConfig());
  }

  if (window.__YONA_RUNTIME_CONFIG__) {
    return resolveRuntimeConfig(window.__YONA_RUNTIME_CONFIG__);
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
