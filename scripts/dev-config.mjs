export function normalizeBasePath(input) {
  const trimmed = (input ?? "").trim();
  if (trimmed === "" || trimmed === "/") {
    return "/";
  }

  const normalized = `/${trimmed}`.replace(/\/+/g, "/").replace(/\/$/, "");
  return normalized === "" ? "/" : normalized;
}

function normalizeOrigin(input, fallback) {
  const trimmed = (input ?? "").trim();
  if (trimmed === "") {
    return fallback;
  }

  return trimmed.replace(/\/+$/, "");
}

function entryPath(basePath) {
  return basePath === "/" ? "/" : `${basePath}/`;
}

function joinBasePath(basePath, leaf) {
  const trimmed = (leaf ?? "").trim();
  if (trimmed === "" || trimmed === "/") {
    return entryPath(basePath);
  }

  const normalizedLeaf = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return basePath === "/" ? normalizedLeaf : `${basePath}${normalizedLeaf}`;
}

export function resolveDevConfig(env = {}) {
  const basePath = normalizeBasePath(env.YONA_DEV_BASE_PATH);
  const backendTarget = normalizeOrigin(env.YONA_DEV_BACKEND_TARGET, "http://127.0.0.1:8089");
  const frontendOrigin = normalizeOrigin(env.YONA_DEV_PUBLIC_ORIGIN, "http://127.0.0.1:3101");

  return {
    backendSessionUrl: `${backendTarget}${joinBasePath(basePath, "api/auth/session")}`,
    backendTarget,
    basePath,
    frontendOrigin,
    frontendUrl: `${frontendOrigin}${entryPath(basePath)}`,
  };
}
