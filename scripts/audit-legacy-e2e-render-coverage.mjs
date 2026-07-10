import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const legacyAuditPath = resolve(repoRoot, ".agent/legacy-html-page-audit/latest.json");
const routeCoveragePath = resolve(repoRoot, ".agent/legacy-html-page-audit/route-coverage.json");
const frontendTests = resolve(repoRoot, "frontend/tests");
const outputPath = resolve(repoRoot, ".agent/legacy-html-page-audit/e2e-render-coverage.json");
const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const ts = require("typescript");

const selectorMethods = new Set([
  "$eval",
  "getByAltText",
  "getByLabel",
  "getByPlaceholder",
  "getByRole",
  "getByText",
  "locator",
  "waitForSelector",
]);
const domReadMethods = new Set([
  "allInnerTexts",
  "allTextContents",
  "evaluate",
  "getAttribute",
  "innerHTML",
  "innerText",
  "inputValue",
  "isChecked",
  "isDisabled",
  "isEditable",
  "isEnabled",
  "isHidden",
  "isVisible",
  "textContent",
]);
const matcherMethods = new Set([
  "toBeAttached",
  "toBeChecked",
  "toBeDisabled",
  "toBeEditable",
  "toBeEnabled",
  "toBeHidden",
  "toBeVisible",
  "toContain",
  "toContainEqual",
  "toContainText",
  "toEqual",
  "toHaveAttribute",
  "toHaveClass",
  "toHaveCount",
  "toHaveText",
  "toMatch",
  "toMatchObject",
  "toStrictEqual",
]);

export function routeKey(input) {
  const cleanPath =
    input
      .replace(/^https?:\/\/[^/]+/, "")
      .replace(/^\/yona(?=\/|$)/, "")
      .split(/[?#]/)[0]
      .replace(/\/$/, "") || "/";

  const projectMatch = cleanPath.match(/^\/[^/]+\/[^/]+(?<suffix>\/.*)?$/);
  if (
    projectMatch &&
    !cleanPath.startsWith("/user/") &&
    !cleanPath.startsWith("/users/") &&
    !cleanPath.startsWith("/sites/") &&
    !cleanPath.startsWith("/organizations/")
  ) {
    let suffix = projectMatch.groups.suffix ?? "";
    suffix = suffix.replace(/^\/issue\/\d+$/, "/issue/$issueNumber");
    return `/$ownerName/$projectName${suffix}`;
  }

  return cleanPath;
}

export function normalizePageGotoArgument(argument) {
  const quote = argument[0];
  if (!quote || quote !== argument.at(-1) || !['"', "'", "`"].includes(quote)) {
    return null;
  }
  let value = argument.slice(1, -1);
  if (quote === "`") {
    let invalid = false;
    value = value.replace(/\$\{([^{}]*)\}/gu, (_match, expression) => {
      const identifier = expression.trim();
      if (!/^[A-Za-z_$][\w$]*$/u.test(identifier)) {
        invalid = true;
        return "";
      }
      return identifier === "basePath" ? "" : `$${identifier}`;
    });
    if (invalid || value.includes("${")) {
      return null;
    }
  }
  value = value.replace(new RegExp(`\\\\${quote}`, "gu"), quote).replace(/\\\\\\\\/gu, "\\");
  return /^(?:https?:\/\/|\/)/u.test(value) ? value : null;
}

function propertyChain(node) {
  if (ts.isIdentifier(node)) {
    return [node.text];
  }
  if (ts.isPropertyAccessExpression(node)) {
    const parent = propertyChain(node.expression);
    return parent ? [...parent, node.name.text] : null;
  }
  return null;
}

function calledMethod(call) {
  if (ts.isPropertyAccessExpression(call.expression)) {
    return call.expression.name.text;
  }
  return ts.isIdentifier(call.expression) ? call.expression.text : "";
}

function staticGotoArgument(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return /^(?:https?:\/\/|\/)/u.test(node.text) ? node.text : null;
  }
  if (!ts.isTemplateExpression(node)) {
    return null;
  }

  let value = node.head.text;
  for (const span of node.templateSpans) {
    if (!ts.isIdentifier(span.expression)) {
      return null;
    }
    value += span.expression.text === "basePath" ? "" : `$${span.expression.text}`;
    value += span.literal.text;
  }
  return /^(?:https?:\/\/|\/)/u.test(value) ? value : null;
}

function callbackArgument(call) {
  const callback = call.arguments.at(-1);
  return callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
    ? callback
    : null;
}

function collectBindings(sourceFile) {
  const bindings = new Map();
  const ambiguous = new Set();
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      !ambiguous.has(node.name.text)
    ) {
      if (bindings.has(node.name.text)) {
        bindings.delete(node.name.text);
        ambiguous.add(node.name.text);
      } else {
        bindings.set(node.name.text, node.initializer);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return bindings;
}

function collectStaticStrings(node, bindings, output, resolving = new Set()) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    output.add(node.text);
    return;
  }
  if (ts.isTemplateExpression(node)) {
    output.add(node.getText().slice(1, -1));
    return;
  }
  if (ts.isIdentifier(node)) {
    const initializer = bindings.get(node.text);
    if (!initializer || resolving.has(node.text)) {
      return;
    }
    resolving.add(node.text);
    collectStaticStrings(initializer, bindings, output, resolving);
    resolving.delete(node.text);
    return;
  }
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) {
    return;
  }
  ts.forEachChild(node, (child) => collectStaticStrings(child, bindings, output, resolving));
}

function containsDomRead(node, bindings, resolving = new Set()) {
  if (ts.isIdentifier(node)) {
    const initializer = bindings.get(node.text);
    if (!initializer || resolving.has(node.text)) {
      return false;
    }
    resolving.add(node.text);
    const result = containsDomRead(initializer, bindings, resolving);
    resolving.delete(node.text);
    return result;
  }
  if (ts.isCallExpression(node)) {
    const method = calledMethod(node);
    if (
      selectorMethods.has(method) ||
      domReadMethods.has(method) ||
      /canonical|renderedDom|snapshot/u.test(method)
    ) {
      return true;
    }
  }
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) {
    return false;
  }
  let result = false;
  ts.forEachChild(node, (child) => {
    result ||= containsDomRead(child, bindings, resolving);
  });
  return result;
}

function testCallKind(call) {
  const chain = propertyChain(call.expression);
  if (!chain || !["test", "it"].includes(chain[0])) {
    return null;
  }
  if (chain.includes("describe")) {
    return { kind: "suite", skipped: chain.some((part) => ["fixme", "skip"].includes(part)) };
  }
  if (chain.length === 1 || (chain.length === 2 && chain[1] === "only")) {
    return { kind: "test", skipped: false };
  }
  if (chain.some((part) => ["fixme", "skip"].includes(part))) {
    return { kind: "test", skipped: true };
  }
  return null;
}

function analyzeTestCallback(callback, bindings) {
  const navigations = [];
  const signals = new Set();
  let runtimeSkipped = false;
  const visit = (node) => {
    if (node !== callback.body && ts.isFunctionLike(node)) {
      return;
    }
    if (ts.isCallExpression(node)) {
      const chain = propertyChain(node.expression);
      const method = calledMethod(node);
      if (chain?.[0] === "test" && chain.some((part) => part === "fixme" || part === "skip")) {
        runtimeSkipped = true;
        return;
      }
      if (chain?.length === 2 && chain[0] === "page" && method === "goto") {
        const url = node.arguments[0] ? staticGotoArgument(node.arguments[0]) : null;
        if (url !== null) {
          navigations.push(url);
        }
      }
      if (selectorMethods.has(method)) {
        for (const argument of node.arguments) {
          collectStaticStrings(argument, bindings, signals);
        }
      }
      if (matcherMethods.has(method) && ts.isPropertyAccessExpression(node.expression)) {
        const expectCall = node.expression.expression;
        if (
          ts.isCallExpression(expectCall) &&
          propertyChain(expectCall.expression)?.at(-1) === "expect" &&
          expectCall.arguments[0] &&
          containsDomRead(expectCall.arguments[0], bindings)
        ) {
          collectStaticStrings(expectCall.arguments[0], bindings, signals);
          for (const argument of node.arguments) {
            collectStaticStrings(argument, bindings, signals);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
  return runtimeSkipped ? { navigations: [], signals: [] } : { navigations, signals: [...signals] };
}

export function extractRenderedE2eEvidence(source) {
  const sourceFile = ts.createSourceFile(
    "coverage.e2e.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  if (sourceFile.parseDiagnostics.length > 0) {
    return [];
  }
  const bindings = collectBindings(sourceFile);
  const evidence = [];
  const visit = (node, skippedSuite = false) => {
    if (ts.isCallExpression(node)) {
      const kind = testCallKind(node);
      const callback = kind ? callbackArgument(node) : null;
      if (kind?.kind === "suite" && callback) {
        visit(callback.body, skippedSuite || kind.skipped);
        return;
      }
      if (kind?.kind === "test") {
        if (!skippedSuite && !kind.skipped && callback) {
          const testEvidence = analyzeTestCallback(callback, bindings);
          if (testEvidence.signals.length > 0) {
            for (const url of testEvidence.navigations) {
              evidence.push({ signals: testEvidence.signals, url });
            }
          }
        }
        return;
      }
    }
    ts.forEachChild(node, (child) => visit(child, skippedSuite));
  };
  visit(sourceFile);
  return evidence;
}

export function extractPageGotoNavigations(source) {
  return extractRenderedE2eEvidence(source).map((evidence) => evidence.url);
}

function runAudit() {
  if (!existsSync(legacyAuditPath)) {
    throw new Error(`missing legacy HTML audit output: ${legacyAuditPath}`);
  }

  if (!existsSync(routeCoveragePath)) {
    throw new Error(`missing route coverage output: ${routeCoveragePath}`);
  }

  const legacyAudit = JSON.parse(readFileSync(legacyAuditPath, "utf8"));
  const routeCoverage = JSON.parse(readFileSync(routeCoveragePath, "utf8"));
  if (!Array.isArray(legacyAudit.results) || !Array.isArray(routeCoverage.entries)) {
    const summary = {
      checkedAt: new Date().toISOString(),
      routeCoverageCheckedAt: routeCoverage.checkedAt,
      status: "legacy-audit-unavailable",
      error:
        legacyAudit.error ??
        routeCoverage.error ??
        "legacy audit results or route coverage entries are unavailable",
      total: 0,
      withRenderedE2eEvidence: 0,
      missingRenderedE2eEvidence: 0,
      withRenderedLegacySignalEvidence: 0,
      missingRenderedLegacySignalEvidence: 0,
      entries: [],
    };
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
    return 1;
  }
  const e2eNavigations = new Map();
  const legacySignals = new Map(
    legacyAudit.results.map((result) => [
      result.path,
      [...new Set([...(result.checkedAnchors ?? []), ...(result.checkedStructuralTokens ?? [])])],
    ]),
  );

  for (const fileName of readdirSync(frontendTests).filter((file) => file.endsWith(".e2e.ts"))) {
    const filePath = resolve(frontendTests, fileName);
    const relativeFile = filePath.replace(`${repoRoot}/`, "");
    const source = readFileSync(filePath, "utf8");
    for (const evidence of extractRenderedE2eEvidence(source)) {
      const key = routeKey(evidence.url);
      const matches = e2eNavigations.get(key) ?? [];
      matches.push({
        file: relativeFile,
        signals: evidence.signals,
        url: evidence.url,
      });
      e2eNavigations.set(key, matches);
    }
  }

  const entries = routeCoverage.entries.map((entry) => {
    const coverageKey = routeKey(entry.legacyPath);
    const matches = e2eNavigations.get(coverageKey) ?? [];
    const expectedSignals = legacySignals.get(entry.legacyPath) ?? [];
    const missingSignals = expectedSignals.filter(
      (signal) => !matches.some((match) => match.signals.some((value) => value.includes(signal))),
    );
    const matchedNavigationsByKey = new Map();
    for (const match of matches) {
      const key = `${match.file}\0${match.url}`;
      const matchedSignals = matchedNavigationsByKey.get(key)?.matchedSignals ?? new Set();
      for (const signal of expectedSignals) {
        if (match.signals.some((value) => value.includes(signal))) {
          matchedSignals.add(signal);
        }
      }
      matchedNavigationsByKey.set(key, {
        file: match.file,
        matchedSignals,
        url: match.url,
      });
    }
    const matchedE2eNavigations = [...matchedNavigationsByKey.values()].map((match) => ({
      ...match,
      matchedSignals: [...match.matchedSignals],
    }));
    return {
      legacyPath: entry.legacyPath,
      coverageKey,
      rustRoute: entry.rustRoute,
      expectedSignals,
      missingSignals,
      matchedE2eCount: matchedE2eNavigations.length,
      matchedE2eNavigations,
    };
  });

  const summary = {
    checkedAt: new Date().toISOString(),
    routeCoverageCheckedAt: routeCoverage.checkedAt,
    total: entries.length,
    withRenderedE2eEvidence: entries.filter((entry) => entry.matchedE2eCount > 0).length,
    missingRenderedE2eEvidence: entries.filter((entry) => entry.matchedE2eCount === 0).length,
    withRenderedLegacySignalEvidence: entries.filter((entry) => entry.missingSignals.length === 0)
      .length,
    missingRenderedLegacySignalEvidence: entries.filter((entry) => entry.missingSignals.length > 0)
      .length,
    entries,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  return summary.missingRenderedE2eEvidence > 0 || summary.missingRenderedLegacySignalEvidence > 0
    ? 1
    : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runAudit();
}
