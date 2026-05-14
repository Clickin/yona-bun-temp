import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const DEFAULT_REPO_ROOT = path.resolve(SCRIPT_DIR, "..");

const GLOBAL_PROVENANCE_FILES = new Set([
  "docs/provenance/core-parity-audit.md",
  "docs/provenance/phase-0b/legacy-test-inventory.md",
  "docs/agents/10-legacy-provenance-baseline.md",
]);

const NON_IMPLEMENTATION_PREFIXES = [
  ".agents/",
  ".codex/",
  ".github/",
  ".husky/",
  ".omx/",
  ".brv/",
  ".sisyphus/",
  ".playwright-mcp/",
  ".pnpm-store/",
  ".tmp/",
  "%TEMP%/",
  "docs/",
  "tests/",
  "tools/",
  "bin/",
  "drizzle/",
  "reports/",
  "reference/mixed-code/",
  "reference/spikes/",
  "scripts/",
  "frontend/src/gen/",
];

const NON_IMPLEMENTATION_FILES = new Set([
  ".gitignore",
  "AGENTS.md",
  "Cargo.lock",
  "Cargo.toml",
  "CLAUDE.md",
  "DESIGN.md",
  "README.md",
  "SPEC.md",
  "buf.yaml",
  "buf.gen.yaml",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "frontend/README.md",
  "frontend/index.html",
  "frontend/package.json",
  "frontend/playwright.config.ts",
  "frontend/pnpm-lock.yaml",
  "frontend/tsconfig.json",
  "frontend/vite.config.ts",
]);

const TEST_FILE_PATTERN = /(^tests\/)|(\/tests\/)|(\.spec\.)|(\.test\.)/i;
const LEGACY_REFERENCE_PATTERN = /yona-original\//;

const PARITY_SLICES = [
  {
    id: "public-landing",
    label: "Public landing and global navigation",
    status: "parity",
    implementationPatterns: [/^frontend\/src\/routes\/index\.tsx$/i],
    testKeywords: ["public-landing", "home-route", "layout-parity"],
    provenanceDocs: ["docs/provenance/core-parity-audit.md"],
  },
  {
    id: "public-project-directory",
    label: "Public project directory",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/routes\/projects\/route\.tsx$/i,
      /^frontend\/src\/app\.css$/i,
    ],
    testKeywords: ["project-directory-route", "projects", "directory-parity"],
    provenanceDocs: ["docs/provenance/core-parity-audit.md"],
  },
  {
    id: "public-organization-directory",
    label: "Public organization directory",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/routes\/orgs\/route\.tsx$/i,
      /^frontend\/src\/app\.css$/i,
    ],
    testKeywords: ["organization-directory-route", "orgs", "directory-parity"],
    provenanceDocs: ["docs/provenance/core-parity-audit.md"],
  },
  {
    id: "issue-lifecycle",
    label: "Issue lifecycle",
    status: "gap",
    implementationPatterns: [
      /^frontend\/src\/app-view-models\.ts$/i,
      /^frontend\/src\/auth-workspace-client\.ts$/i,
      /^frontend\/src\/routes\/-view-models\.ts$/i,
      /^frontend\/src\/routes\/-milestone-views\.tsx$/i,
      /^frontend\/.*issues?/i,
      /^crates\/(?:domain|persistence|server)\/.*(?:issue|label|milestone)/i,
    ],
    testKeywords: ["issue", "issues", "label", "milestone"],
    provenanceDocs: ["docs/provenance/phase-0b/issue.md", "docs/provenance/core-parity-audit.md"],
  },
];

const DOMAIN_BUCKETS = [
  {
    id: "frontend-api-query-boundary",
    label: "Frontend API query boundary",
    status: "partial",
    implementationPatterns: [/^frontend\/src\/api\/query-keys\.ts$/i],
    testKeywords: [
      "api-query",
      "query",
      "issue",
      "milestone",
      "pull-request",
      "review",
      "project",
      "organization",
    ],
    provenanceDocs: [
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/phase-0b/issue.md",
      "docs/provenance/phase-0b/pull-request-review.md",
    ],
  },
  {
    id: "board-posting-core",
    label: "Board posting core",
    status: "partial",
    implementationPatterns: [
      /^frontend\/src\/api\/boards\.ts$/i,
      /^frontend\/src\/routes\/-board-views\.tsx$/i,
      /^frontend\/src\/routes\/\$owner\/\$projectName\/posts\/route\.tsx$/i,
      /^frontend\/src\/routes\/\$owner\/\$projectName\/post(?:form|\/)/i,
      /^frontend\/src\/routes\/organizations\/\$organizationName\/boards\/route\.tsx$/i,
      /^crates\/(?:persistence|server)\/.*(?:posting|board)/i,
    ],
    testKeywords: ["board", "posting", "post"],
    provenanceDocs: ["docs/provenance/core-parity-audit.md"],
  },
  {
    id: "canonical-schema-and-persistence-foundation",
    label: "Canonical schema and persistence foundation",
    status: "partial",
    implementationPatterns: [
      /^crates\/migration\//i,
      /^crates\/persistence\//i,
      /^proto\//i,
      /^crates\/integrations\//i,
    ],
    testKeywords: [
      "migration",
      "repo",
      "repository",
      "contract",
      "sqlite",
      "matrix",
      "auth",
      "project",
      "organization",
    ],
    provenanceDocs: [
      "docs/provenance/phase-0b/legacy-test-inventory.md",
      "docs/provenance/phase-0b/milestone.md",
      "docs/provenance/phase-0b/yona-export.md",
      "docs/agents/10-legacy-provenance-baseline.md",
    ],
  },
  {
    id: "auth-account-lifecycle",
    label: "Auth and account lifecycle",
    status: "gap",
    implementationPatterns: [
      /^frontend\/.*auth/i,
      /^crates\/(?:server|domain)\/.*(auth|session|password|account)/i,
      /^crates\/persistence\/.*(auth|user|session|workspace)/i,
    ],
    testKeywords: ["auth", "login", "register", "password", "session"],
    provenanceDocs: [
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/phase-0b/legacy-test-inventory.md",
    ],
  },
  {
    id: "acl-baseline",
    label: "ACL baseline",
    status: "gap",
    implementationPatterns: [
      /^crates\/domain\/.*(authorization|access-control|role|acl|policy)/i,
      /^crates\/server\/.*(authorization|access-control|acl|policy)/i,
    ],
    testKeywords: ["authorization", "access-control", "role", "acl"],
    provenanceDocs: [
      "docs/provenance/phase-0b/legacy-test-inventory.md",
      "docs/agents/10-legacy-provenance-baseline.md",
    ],
  },
  {
    id: "pull-request-and-review",
    label: "Pull request and review",
    status: "gap",
    implementationPatterns: [
      /^frontend\/.*(pulls|pull-requests?|pullrequests?|pull-request|reviews?)/i,
      /^crates\/(?:domain|server)\/.*(pull-requests?|pull_request|review)/i,
    ],
    testKeywords: ["pull-request", "pull_request", "pulls", "review", "reviews"],
    provenanceDocs: [
      "docs/provenance/phase-0b/pull-request-review.md",
      "docs/provenance/core-parity-audit.md",
    ],
  },
  {
    id: "organization-core-cru",
    label: "Organization core CRU",
    status: "partial",
    implementationPatterns: [
      /^frontend\/.*organization/i,
      /^crates\/(?:domain|persistence|server)\/.*organization/i,
    ],
    testKeywords: ["organization", "org", "route-parity"],
    provenanceDocs: [
      "docs/provenance/phase-0b/organization.md",
      "docs/provenance/core-parity-audit.md",
    ],
  },
  {
    id: "project-core-cru-and-enrollment",
    label: "Project core CRU and enrollment",
    status: "partial",
    implementationPatterns: [
      /^frontend\/.*project/i,
      /^crates\/(?:domain|persistence|server)\/.*(project|enrollment)/i,
    ],
    testKeywords: ["project", "projects", "enroll", "enrollment", "milestone", "route-parity"],
    provenanceDocs: [
      "docs/provenance/phase-0b/project.md",
      "docs/provenance/phase-0b/milestone.md",
      "docs/provenance/core-parity-audit.md",
    ],
  },
  {
    id: "workspace-recent-favorite-default-landing",
    label: "Workspace recent/favorite/default landing",
    status: "partial",
    implementationPatterns: [
      /^frontend\/.*\/me/i,
      /^frontend\/src\/api\/workspace\.ts$/i,
      /^crates\/(?:domain|persistence|server)\/.*(workspace|default-landing|favorite|recent)/i,
    ],
    testKeywords: ["workspace", "default-landing", "favorite", "recent", "me"],
    provenanceDocs: ["docs/provenance/phase-0b/project.md", "docs/provenance/core-parity-audit.md"],
  },
  {
    id: "notification-inbox-and-mail-staging",
    label: "Notification inbox and mail staging",
    status: "partial",
    implementationPatterns: [
      /^frontend\/src\/api\/notifications\.ts$/i,
      /^frontend\/src\/routes\/notifications?\/route\.tsx$/i,
      /^crates\/(?:server|persistence|integrations)\/.*notification/i,
    ],
    testKeywords: ["notification", "mail", "watch", "route-parity"],
    provenanceDocs: [
      "docs/provenance/phase-0b/issue.md",
      "docs/provenance/phase-0b/legacy-test-inventory.md",
      "docs/provenance/core-parity-audit.md",
    ],
  },
  {
    id: "issue-lifecycle",
    label: "Issue lifecycle",
    status: "gap",
    implementationPatterns: [
      /^frontend\/src\/app-view-models\.ts$/i,
      /^frontend\/src\/auth-workspace-client\.ts$/i,
      /^frontend\/src\/routes\/-view-models\.ts$/i,
      /^frontend\/src\/routes\/-milestone-views\.tsx$/i,
      /^frontend\/.*issues?/i,
      /^crates\/(?:domain|persistence|server)\/.*(?:issue|label|milestone)/i,
    ],
    testKeywords: ["issue", "issues", "label", "milestone"],
    provenanceDocs: ["docs/provenance/phase-0b/issue.md", "docs/provenance/core-parity-audit.md"],
  },
  {
    id: "search",
    label: "Search",
    status: "gap",
    implementationPatterns: [
      /^frontend\/.*search/i,
      /^crates\/(?:search|persistence|server|domain)\/.*search/i,
    ],
    testKeywords: ["search", "snippet"],
    provenanceDocs: ["docs/provenance/phase-0b/search.md", "docs/provenance/core-parity-audit.md"],
  },
  {
    id: "repository-and-smart-http",
    label: "Repository and smart HTTP",
    status: "gap",
    implementationPatterns: [
      /^frontend\/.*(repo|code|branches|commit)/i,
      /^crates\/(?:vcs|server|domain)\/.*(repo|code|branch|commit|smart-http|inline-edit)/i,
    ],
    testKeywords: ["repo", "code", "branch", "commit", "smart-http", "inline-edit"],
    provenanceDocs: [
      "docs/provenance/phase-0b/legacy-test-inventory.md",
      "docs/provenance/core-parity-audit.md",
    ],
  },
  {
    id: "attachment-and-asset-acl",
    label: "Attachment and asset ACL",
    status: "gap",
    implementationPatterns: [
      /^frontend\/.*(asset|upload|attachment|resource)/i,
      /^crates\/(?:server|persistence|domain)\/.*(asset|upload|attachment|resource)/i,
    ],
    testKeywords: ["asset", "upload", "attachment", "resource"],
    provenanceDocs: [
      "docs/provenance/phase-0b/legacy-test-inventory.md",
      "docs/provenance/core-parity-audit.md",
    ],
  },
  {
    id: "second-priority-deferred",
    label: "SVN, LDAP, import/export deferred scope",
    status: "deferred",
    implementationPatterns: [/(\/|^)(svn|ldap|import|export)(\/|\.|$)/i],
    testKeywords: ["svn", "ldap", "import", "export", "migration"],
    provenanceDocs: ["docs/provenance/core-parity-audit.md"],
  },
  {
    id: "rust-foundation-and-runtime-bootstrap",
    label: "Rust foundation and runtime bootstrap",
    status: "partial",
    implementationPatterns: [
      /^(?:\.gitignore|Cargo\.lock|Cargo\.toml|buf(?:\.gen)?\.yaml)$/i,
      /^frontend\/(?:README\.md|package\.json|pnpm-lock\.yaml|index\.html|tsconfig\.json|vite\.config\.ts)$/i,
      /^crates\/(?:server|domain|search|vcs)\//i,
      /^frontend\/src\/(?:main|router|runtime-config)\.tsx?$/i,
      /^frontend\/src\/routes\/__root\.tsx$/i,
      /^reports\//i,
      /^scripts\//i,
    ],
    testKeywords: [
      "runtime_config",
      "runtime-config",
      "auth",
      "project",
      "sqlite",
      "matrix",
      "contract",
      "foundation",
      "migration",
    ],
    provenanceDocs: [
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/phase-0b/milestone.md",
      "docs/provenance/phase-0b/yona-export.md",
      "docs/agents/10-legacy-provenance-baseline.md",
    ],
  },
];

function normalizePath(inputPath) {
  return inputPath.replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function isNonImplementationFile(filePath) {
  if (TEST_FILE_PATTERN.test(filePath)) {
    return true;
  }

  if (NON_IMPLEMENTATION_FILES.has(filePath)) {
    return true;
  }

  return NON_IMPLEMENTATION_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

function isImplementationFile(filePath) {
  return !isNonImplementationFile(filePath);
}

function hasLegacyRoot(repoRoot) {
  return existsSync(path.join(repoRoot, "yona-original"));
}

function readTextFileIfPresent(repoRoot, filePath) {
  const absolutePath = path.join(repoRoot, filePath);
  if (!existsSync(absolutePath)) {
    return "";
  }

  try {
    return readFileSync(absolutePath, "utf8");
  } catch {
    return "";
  }
}

function hasLegacyReference(repoRoot, changedFiles) {
  for (const filePath of changedFiles) {
    const fileText = readTextFileIfPresent(repoRoot, filePath);
    if (fileText && LEGACY_REFERENCE_PATTERN.test(fileText)) {
      return true;
    }
  }

  return false;
}

function matchesAnyPattern(filePath, patterns) {
  return patterns.some((pattern) => pattern.test(filePath));
}

function matchesKeyword(filePath, keywords) {
  const lowered = filePath.toLowerCase();
  return keywords.some((keyword) => lowered.includes(keyword.toLowerCase()));
}

function classifyCapability(filePath) {
  for (const slice of PARITY_SLICES) {
    if (matchesAnyPattern(filePath, slice.implementationPatterns)) {
      return slice;
    }
  }

  for (const bucket of DOMAIN_BUCKETS) {
    if (matchesAnyPattern(filePath, bucket.implementationPatterns)) {
      return bucket;
    }
  }

  return null;
}

function capabilityHasTestEvidence(capability, changedFiles) {
  return changedFiles.some(
    (filePath) =>
      TEST_FILE_PATTERN.test(filePath) && matchesKeyword(filePath, capability.testKeywords),
  );
}

function capabilityHasProvenanceEvidence(capability, changedFiles) {
  return changedFiles.some(
    (filePath) =>
      GLOBAL_PROVENANCE_FILES.has(filePath) || capability.provenanceDocs.includes(filePath),
  );
}

function evaluateCapability(capability, changedFiles, implementationFiles, repoRoot) {
  const matchedFiles = implementationFiles.filter((filePath) =>
    matchesAnyPattern(filePath, capability.implementationPatterns),
  );
  const evidence = {
    tests: capabilityHasTestEvidence(capability, changedFiles),
    provenance: capabilityHasProvenanceEvidence(capability, changedFiles),
    legacyReference: hasLegacyReference(repoRoot, changedFiles),
  };

  let verdict = "pass";
  let reason = `${capability.label} remains adequately evidenced for legacy parity.`;

  if (capability.status === "deferred") {
    verdict = "block";
    reason = `${capability.label} is explicitly deferred scope in this repository.`;
  } else if (capability.status === "parity") {
    if (!(evidence.tests || evidence.provenance || evidence.legacyReference)) {
      verdict = "block";
      reason = `${capability.label} is an already-parity slice, but this change lacks updated parity evidence.`;
    }
  } else if (evidence.tests && evidence.provenance) {
    verdict = "pass";
    reason = `${capability.label} has both verification and provenance updates for this parity change.`;
  } else if (evidence.tests || evidence.provenance || evidence.legacyReference) {
    verdict = "expected-nonparity";
    reason = `${capability.label} still tracks a legacy gap or partial slice and has not yet landed a full parity closure.`;
  } else {
    verdict = "block";
    reason = `${capability.label} changed without tests, provenance updates, or explicit legacy references.`;
  }

  return {
    id: capability.id,
    label: capability.label,
    status: capability.status,
    matchedFiles,
    evidence,
    verdict,
    reason,
  };
}

function collectImplementationChanges(changedFiles) {
  const implementationFiles = [];
  const nonImplementationFiles = [];

  for (const filePath of changedFiles) {
    if (isImplementationFile(filePath)) {
      implementationFiles.push(filePath);
      continue;
    }

    nonImplementationFiles.push(filePath);
  }

  return { implementationFiles, nonImplementationFiles };
}

export function evaluateParityGate({ changedFiles = [], repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const normalizedFiles = [...new Set(changedFiles.map(normalizePath).filter(Boolean))];

  if (!hasLegacyRoot(repoRoot)) {
    return {
      verdict: "block",
      summary: "Legacy parity gate could not find yona-original/ at the repository root.",
      changedFiles: normalizedFiles,
      implementationFiles: [],
      skippedFiles: normalizedFiles,
      capabilities: [],
      unmappedImplementationFiles: [],
    };
  }

  const { implementationFiles, nonImplementationFiles } =
    collectImplementationChanges(normalizedFiles);

  if (implementationFiles.length === 0) {
    return {
      verdict: "pass",
      summary: "No implementation files changed; legacy parity gate passed.",
      changedFiles: normalizedFiles,
      implementationFiles,
      skippedFiles: nonImplementationFiles,
      capabilities: [],
      unmappedImplementationFiles: [],
    };
  }

  const capabilitiesById = new Map();
  const unmappedImplementationFiles = [];

  for (const filePath of implementationFiles) {
    const capability = classifyCapability(filePath);
    if (!capability) {
      unmappedImplementationFiles.push(filePath);
      continue;
    }

    capabilitiesById.set(capability.id, capability);
  }

  const evaluatedCapabilities = [...capabilitiesById.values()].map((capability) =>
    evaluateCapability(capability, normalizedFiles, implementationFiles, repoRoot),
  );

  if (unmappedImplementationFiles.length > 0) {
    evaluatedCapabilities.push({
      id: "unmapped-implementation",
      label: "Unmapped implementation surface",
      status: "unknown",
      matchedFiles: unmappedImplementationFiles,
      evidence: {
        tests: false,
        provenance: false,
        legacyReference: false,
      },
      verdict: "block",
      reason: `No legacy parity mapping exists for: ${unmappedImplementationFiles.join(", ")}`,
    });
  }

  let verdict = "pass";
  if (evaluatedCapabilities.some((entry) => entry.verdict === "block")) {
    verdict = "block";
  } else if (evaluatedCapabilities.some((entry) => entry.verdict === "expected-nonparity")) {
    verdict = "expected-nonparity";
  }

  const blockingEntry = evaluatedCapabilities.find((entry) => entry.verdict === "block");
  const expectedEntry = evaluatedCapabilities.find(
    (entry) => entry.verdict === "expected-nonparity",
  );

  const summary =
    blockingEntry?.reason ??
    expectedEntry?.reason ??
    "All changed implementation files have legacy parity evidence.";

  return {
    verdict,
    summary,
    changedFiles: normalizedFiles,
    implementationFiles,
    skippedFiles: nonImplementationFiles,
    capabilities: evaluatedCapabilities,
    unmappedImplementationFiles,
  };
}

export function shouldBlockForStrictGate(result) {
  return result.verdict !== "pass";
}

export function formatParitySummary(result) {
  const prefix =
    result.verdict === "pass"
      ? "PASS"
      : result.verdict === "expected-nonparity"
        ? "EXPECTED-NONPARITY"
        : "BLOCK";

  return `[yona-legacy-parity] ${prefix}: ${result.summary}`;
}

export function collectGitChangedFiles(repoRoot, { staged = false } = {}) {
  const args = staged
    ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR"]
    : ["diff", "--name-only", "--diff-filter=ACMR"];
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || "Failed to collect changed files from git.");
  }

  return result.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseCliArgs(argv) {
  const options = {
    staged: false,
    json: false,
    requirePass: false,
    files: [],
  };

  for (const arg of argv) {
    if (arg === "--staged") {
      options.staged = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--require-pass") {
      options.requirePass = true;
      continue;
    }

    options.files.push(arg);
  }

  return options;
}

function main() {
  const cli = parseCliArgs(process.argv.slice(2));
  const changedFiles =
    cli.files.length > 0
      ? cli.files
      : collectGitChangedFiles(DEFAULT_REPO_ROOT, { staged: cli.staged });
  const result = evaluateParityGate({
    changedFiles,
    repoRoot: DEFAULT_REPO_ROOT,
  });

  if (cli.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatParitySummary(result)}\n`);
  }

  if (cli.requirePass) {
    process.exitCode = shouldBlockForStrictGate(result) ? 1 : 0;
    return;
  }

  process.exitCode = result.verdict === "block" ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main();
}
