const reservedRootPaths = new Set([
  "/_help",
  "/_import",
  "/lostPassword",
  "/notification",
  "/notifications",
  "/orgs",
  "/projectform",
  "/projects",
  "/search",
]);

function normalizeProjectSuffix(suffix) {
  if (!suffix) {
    return "";
  }
  return suffix
    .replace(/^\/issue\/\d+$/, "/issue/$issueNumber")
    .replace(/^\/issue\/\d+\/editform$/, "/issue/$issueNumber/editform")
    .replace(/^\/post\/\d+$/, "/post/$postNumber")
    .replace(/^\/post\/\d+\/editform$/, "/post/$postNumber/editform")
    .replace(/^\/milestone\/\d+$/, "/milestone/$milestoneId")
    .replace(/^\/milestone\/\d+\/editform$/, "/milestone/$milestoneId/editform")
    .replace(/^\/pullRequest\/\d+$/, "/pullRequest/$pullRequestNumber")
    .replace(/^\/pullRequest\/\d+\/editform$/, "/pullRequest/$pullRequestNumber/editform")
    .replace(/^\/pullRequest\/\d+\/changes$/, "/pullRequest/$pullRequestNumber/changes")
    .replace(
      /^\/pullRequest\/\d+\/changes\/[^/]+$/,
      "/pullRequest/$pullRequestNumber/changes/$commitId",
    )
    .replace(/^\/commit\/[^/]+$/, "/commit/$commitId")
    .replace(/^\/compare\/[^/]+$/, "/compare/$revisionRange")
    .replace(/^\/commits\/[^/]+\/$/, "/commits/$branch/")
    .replace(/^\/commits\/[^/]+$/, "/commits/$branch")
    .replace(/^\/code\/[^/]+\/$/, "/code/$branch/")
    .replace(/^\/code\/[^/]+$/, "/code/$branch")
    .replace(/^\/commits\/[^/]+\/.+$/, "/commits/$branch/$")
    .replace(/^\/code\/[^/]+\/.+$/, "/code/$branch/$");
}

export function normalizeLegacyAuditPath(path, rustRoutes) {
  const cleanPath = path.split("?")[0].replace(/\/$/, "") || "/";
  if (rustRoutes.has(cleanPath)) {
    return cleanPath;
  }
  if (cleanPath.startsWith("/sites/")) {
    return "/sites/$pageName";
  }
  if (/^\/[^/]+$/.test(cleanPath) && !reservedRootPaths.has(cleanPath)) {
    return "/$user";
  }
  const projectMatch = cleanPath.match(/^\/[^/]+\/[^/]+(?<suffix>\/.*)?$/);
  if (projectMatch && !cleanPath.startsWith("/user/") && !cleanPath.startsWith("/users/")) {
    return `/$owner/$projectName${normalizeProjectSuffix(projectMatch.groups.suffix ?? "")}`;
  }
  return cleanPath;
}
