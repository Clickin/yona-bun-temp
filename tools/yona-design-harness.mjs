import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const REQUIRED_DESIGN_ANCHORS = [
  "yona-original/app/views/**",
  "yona-original/app/assets/stylesheets/yobi.less",
  "yona-original/public/bootstrap/css/bootstrap.css",
  "_variables.less @orange",
  "#f5f1e8",
  "Georgia",
  "tools/yona-design-harness.mjs",
];

const REQUIRED_APP_CSS_PATTERNS = [
  /background(?:-color)?:\s*#fff\b/iu,
  /font-family:\s*[\s\S]*-apple-system[\s\S]*Segoe UI[\s\S]*Helvetica[\s\S]*Arial/iu,
  /#f36c22/iu,
  /#ff7332/iu,
  /\.ybtn\b/iu,
  /\.nav-tabs\b/iu,
];

const FORBIDDEN_UI_PATTERNS = [
  {
    pattern: /#f5f1e8/iu,
    reason: "temporary beige page background is not legacy Yona",
  },
  {
    pattern: /\bGeorgia\b|Times New Roman/iu,
    reason: "temporary serif typography is not legacy Yona",
  },
  {
    pattern: /linear-gradient\([^)]*(purple|violet|#7c3aed|#8b5cf6)/iu,
    reason: "purple marketing gradients are not legacy Yona application UI",
  },
];

function normalizePath(file) {
  return file.replace(/\\/gu, "/");
}

function isSpecOrGeneratedFile(file) {
  return (
    /(^|\/)(routeTree\.gen\.ts)$/iu.test(file) ||
    /\.spec\.[tj]sx?$/iu.test(file) ||
    /\.test-helpers\.[tj]sx?$/iu.test(file)
  );
}

function isFrontendDesignFile(file) {
  const normalized = normalizePath(file);
  if (isSpecOrGeneratedFile(normalized)) {
    return false;
  }
  if (normalized === "frontend/src/app.css" || normalized === "frontend/src/main.tsx") {
    return true;
  }
  if (/^frontend\/src\/routes\/.*\.[tj]sx?$/iu.test(normalized)) {
    return true;
  }
  if (/^frontend\/src\/components\/.*\.[tj]sx?$/iu.test(normalized)) {
    return true;
  }
  return false;
}

function readRepoFile(repoRoot, file) {
  return readFileSync(path.join(repoRoot, file), "utf8");
}

export function evaluateDesignHarness({ changedFiles, repoRoot }) {
  const normalizedFiles = changedFiles.map(normalizePath);
  const designFiles = normalizedFiles.filter(isFrontendDesignFile);
  const violations = [];
  const designPath = path.join(repoRoot, "DESIGN.md");

  if (designFiles.length === 0 && !normalizedFiles.includes("DESIGN.md")) {
    return {
      checkedFiles: [],
      required: false,
      violations,
    };
  }

  if (!existsSync(designPath)) {
    violations.push("DESIGN.md is required before frontend component design changes.");
    return {
      checkedFiles: designFiles,
      required: true,
      violations,
    };
  }

  const designSource = readFileSync(designPath, "utf8");
  for (const anchor of REQUIRED_DESIGN_ANCHORS) {
    if (!designSource.includes(anchor)) {
      violations.push(`DESIGN.md is missing required legacy design anchor: ${anchor}`);
    }
  }

  const mainSource = readRepoFile(repoRoot, "frontend/src/main.tsx");
  if (!mainSource.includes('import "./app.css";')) {
    violations.push('frontend/src/main.tsx must import "./app.css" for shared legacy styling.');
  }

  const appCssSource = readRepoFile(repoRoot, "frontend/src/app.css");
  for (const pattern of REQUIRED_APP_CSS_PATTERNS) {
    if (!pattern.test(appCssSource)) {
      violations.push(`frontend/src/app.css is missing required legacy design token: ${pattern}`);
    }
  }

  for (const file of designFiles) {
    const absolutePath = path.join(repoRoot, file);
    if (!existsSync(absolutePath)) {
      continue;
    }
    const source = readFileSync(absolutePath, "utf8");
    for (const { pattern, reason } of FORBIDDEN_UI_PATTERNS) {
      if (pattern.test(source)) {
        violations.push(`${file}: ${reason}`);
      }
    }
  }

  return {
    checkedFiles: designFiles,
    required: true,
    violations,
  };
}

export function formatDesignHarnessSummary(result) {
  if (!result.required) {
    return "[yona-design-harness] SKIP no staged frontend component design files";
  }
  if (result.violations.length === 0) {
    return `[yona-design-harness] PASS checked ${result.checkedFiles.length} frontend design file(s)`;
  }
  return [
    `[yona-design-harness] FAIL ${result.violations.length} violation(s)`,
    ...result.violations.map((violation) => `- ${violation}`),
  ].join("\n");
}

export function shouldBlockDesignHarness(result) {
  return result.violations.length > 0;
}
