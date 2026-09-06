// Diff layer: API response normalization, DOM skeleton comparison, and the
// semantic value diff used by all three kinds (api/dom/db).

// Fields that are server-generated or legitimately differ between apps.
const VOLATILE_KEY =
  /(^|_)(id|number|userid|authorid|projectid|createdat|createddate|updatedat|updateddate|duedate|csrftoken|token|created_at|created_date|updated_at|updated_date|due_date|user_id|author_id|project_id)($|_)|(?:id|number|at|date)$/iu;
const VOLATILE_KEY_EXACT = new Set(["owner", "ownerName"]);

// Normalize any parsed JSON body into a comparable structure:
// volatile fields are replaced with "<volatile>", objects get stable key order.
export function normalizeApiValue(value, key = "") {
  if (Array.isArray(value)) return value.map((entry) => normalizeApiValue(entry, key));
  if (value && typeof value === "object") {
    const out = {};
    for (const [index, entryKey] of Object.keys(value).sort().entries()) {
      const normalizedKey =
        key === "labels" && /^\d+$/u.test(entryKey) ? `<volatile:${index}>` : entryKey;
      out[normalizedKey] = normalizeApiValue(value[entryKey], entryKey);
    }
    return out;
  }
  if (key && !VOLATILE_KEY_EXACT.has(key) && VOLATILE_KEY.test(key)) {
    return "<volatile>";
  }
  if (typeof value === "string") return collapseWhitespace(value);
  return value;
}

function collapseWhitespace(text) {
  return text.replace(/\s+/gu, " ").trim();
}

// Product-facing identity is intentionally different between the legacy Yona
// render and Yoram. Canonicalize only the exact approved identity tokens
// recorded in docs/provenance/frontend-yoram-rebrand-2026-07-13.md; classes,
// tags, counts, URLs outside the approved examples, and surrounding copy stay
// untouched. This removes copy-only identity noise before the structural diff
// without turning arbitrary user/project text into an allowlist.
const DOM_REBRAND_URL_REPLACEMENTS = Object.freeze([
  [/(?:https?:\/\/)(?:yobi\.io|repo\.yona\.io|demo\.yobi\.io|example\.com)(?![A-Za-z0-9.-])/gu, "<example-host>"],
]);
const DOM_REBRAND_COPY_REPLACEMENTS = Object.freeze([
  [/@(?:yobi|example)(?![A-Za-z0-9_.-])/gu, "@<example>"],
  [/\bNAVER(?: CLOUD PLATFORM| LABS| Corp\.)(?=$|\s)/gu, "<provider>"],
  [/\b(?:Yona|Yoram|Yobi)\b/giu, "<product>"],
  [/\bnaver\b/giu, "<product>"],
]);

function normalizeDomRebrandIdentity(entry) {
  const separator = entry.indexOf(":");
  if (separator < 0) return entry;
  const prefix = entry.slice(0, separator + 1);
  const source = entry.slice(separator + 1);
  let text = "";
  let cursor = 0;
  for (const match of source.matchAll(/https?:\/\/[^\s]+/gu)) {
    text += DOM_REBRAND_COPY_REPLACEMENTS.reduce(
      (value, [pattern, replacement]) => value.replace(pattern, replacement),
      source.slice(cursor, match.index),
    );
    text += DOM_REBRAND_URL_REPLACEMENTS.reduce(
      (value, [pattern, replacement]) => value.replace(pattern, replacement),
      match[0],
    );
    cursor = match.index + match[0].length;
  }
  text += DOM_REBRAND_COPY_REPLACEMENTS.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    source.slice(cursor),
  );
  return `${prefix}${text}`;
}

// The sanctioned DOM role translation: a legacy side-effect anchor marked
// `a#` by the skeleton extract (see sideEffectAnchorTag) is compared as a
// button. Class list and text still have to match exactly, and plain `a`
// (navigational) entries are never rewritten, so role changes on real links
// remain diffs.
export function normalizeSkeletonEntry(entry) {
  const normalized = normalizeDomRebrandIdentity(collapseWhitespace(String(entry)));
  return normalized.startsWith("a#") ? `button${normalized.slice(2)}` : normalized;
}

// Semantic projection of an issue-creation result from either side.
export function projectIssueMutation({ legacy, yoram }) {
  return {
    legacy: { title: legacy?.title ?? null, body: legacy?.body ?? null },
    yoram: { title: yoram?.title ?? yoram?.issue?.title ?? null, body: yoram?.bodyMarkdown ?? yoram?.issue?.bodyMarkdown ?? null },
  };
}

// --- DOM skeleton -----------------------------------------------------------
//
// Follows the e2e canonicalizer approach (frontend/tests/wtr/*.e2e.ts): drop
// React-owned attributes by keeping only tag + class list + own text. The
// extraction runs in-browser; this module owns normalization + comparison.

export function normalizeSkeletonEntries(entries) {
  return entries
    .map(normalizeSkeletonEntry)
    .filter(Boolean)
    .sort();
}

// PullRequestApp's mergeability actor leaves the legacy detail in a pending
// state while Yoram renders its successful merge affordance. Keep this
// fingerprint separate from ordinary DOM comparison: a detail can contain
// this known legacy failure and unrelated observable differences at the same
// time, and those other differences must remain blocking.
export const PULL_REQUEST_MERGE_PENDING_SIGNATURE = Object.freeze([
  "button.ybtn.ybtn-disabled:코드 병합",
  "div.alert.alert-warnning:",
  "span:코드가 안전한지 확인하고 있습니다. 완료될때까지 잠시만 기다려주십시오.",
]);
export const PULL_REQUEST_MERGE_SUCCESS_SIGNATURE = Object.freeze([
  "button.ybtn.ybtn-success:코드 병합",
  "div.alert.alert-success:",
  "span:코드를 안전하게 자동으로 병합할 수 있습니다.",
]);

// Canonical decision for the sanctioned anchor->button translation
// (AGENTS.md: href="#" / javascript: anchors are behavior evidence, not exact
// DOM preservation targets — React re-owns them as buttons). An anchor is a
// side effect when its href cannot navigate (fragment-only, javascript:, empty
// or absent), or when legacy behavior attributes carry the action
// (data-request-method/-uri, or a behavioral data-toggle — tooltip/popover are
// presentational plugins and do NOT count). Pure and data-level so the
// contract is unit-testable; the browser-side skeleton extract in run.mjs
// inlines the same decision (sync-guarded by run.spec.mjs).
export function sideEffectAnchorTag(
  tagName,
  { href = "", dataToggle = null, hasRequestMethod = false, hasRequestUri = false } = {},
) {
  if (tagName !== "a") return tagName;
  const target = String(href ?? "").trim().toLowerCase();
  const navigational = target !== "" && !target.startsWith("#") && !target.startsWith("javascript:");
  const behavioralToggle = dataToggle !== null && !/^(tooltip|popover)$/iu.test(String(dataToggle));
  if (!navigational || hasRequestMethod || hasRequestUri || behavioralToggle) return "a#";
  return tagName;
}

// Compare two normalized skeletons. The comparison is complete by default;
// callers that need a human-readable preview must slice the result rather
// than asking the classifier to compare a truncated prefix.
export const DOM_DIFF_PREVIEW_LIMIT = 20;

export function diffSkeletons(legacyEntries, yoramEntries, limit = Infinity) {
  return diffNormalizedSkeletons(
    normalizeSkeletonEntries(legacyEntries),
    normalizeSkeletonEntries(yoramEntries),
    limit,
  );
}

// Produce the one DOM comparison payload shared by the runner and report
// classifier. Counts and diff entries are normalized from the same arrays, so
// a report cannot accidentally pair raw counts with a normalized diff.
export function compareSkeletons(
  legacyEntries,
  yoramEntries,
  previewLimit = DOM_DIFF_PREVIEW_LIMIT,
) {
  const legacy = normalizeSkeletonEntries(legacyEntries);
  const yoram = normalizeSkeletonEntries(yoramEntries);
  const fullDiffs = diffNormalizedSkeletons(legacy, yoram);
  const limit = Math.max(0, Number(previewLimit));
  return {
    legacyEntries: legacy,
    yoramEntries: yoram,
    legacyCount: legacy.length,
    yoramCount: yoram.length,
    fullDiffs,
    firstDiffs: fullDiffs.slice(0, limit),
    fullDiffSignature: domDiffSignature(fullDiffs),
  };
}

function diffNormalizedSkeletons(legacyEntries, yoramEntries, limit = Infinity) {
  const legacy = [...legacyEntries];
  const yoram = [...yoramEntries];
  const diffs = [];
  let i = 0;
  while ((i < legacy.length || i < yoram.length) && diffs.length < Math.max(0, Number(limit))) {
    const a = legacy[i];
    const b = yoram[i];
    if (a === b) {
      i += 1;
      continue;
    }
    if (a !== undefined && !yoram.includes(a)) {
      diffs.push({ side: "legacy-only", expected: a, actual: b ?? "<absent>" });
      legacy.splice(i, 1);
    } else if (b !== undefined && !legacy.includes(b)) {
      diffs.push({ side: "yoram-only", expected: a ?? "<absent>", actual: b });
      yoram.splice(i, 1);
    } else {
      diffs.push({ side: "order", expected: a, actual: b });
      i += 1;
    }
  }
  return diffs;
}

// Stable complete signature for a normalized DOM diff. Arrays are used rather
// than object serialization so an undefined field remains part of the tuple.
// A fingerprint may store this signature instead of repeating every diff.
export function domDiffSignature(diffs) {
  if (!Array.isArray(diffs)) return null;
  return JSON.stringify(
    diffs.map((diff) => [diff?.side, diff?.expected, diff?.actual]),
  );
}

// Elements whose absence from the Yoram render is a user-visible loss, not a
// structural re-wrap: controls and form/nav affordances. Text-bearing entries
// are handled below regardless of tag.
const VISIBLE_LOSS_TAGS = new Set(["a", "button", "input", "select", "textarea", "label", "form"]);

function skeletonEntryOf(value) {
  return normalizeSkeletonEntries([String(value ?? "")])[0] ?? "";
}

// Does a skeleton diff indicate a VISIBLE loss on the Yoram side (missing
// text, button, link, form control, count/badge, validation message, nav
// label, modal content)? A legacy-only entry that also appears among the
// yoram-only entries is the same tuple re-wrapped in React-owned markup —
// structural drift, not a loss. Used by the DOM classification rules so no
// allow rule can ever accept a visible loss (plan Phase B3).
export function domVisibleLoss(detail) {
  // firstDiffs is a report preview and is deliberately insufficient evidence
  // for classification. A missing full comparison must fail closed.
  const diffs = detail?.actual?.fullDiffs;
  if (!Array.isArray(diffs)) return false;
  const yoramEntries = new Set(
    diffs.filter((diff) => diff.side === "yoram-only").map((diff) => skeletonEntryOf(diff.actual)).filter(Boolean),
  );
  return diffs.some((diff) => {
    if (diff.side !== "legacy-only") return false;
    const entry = skeletonEntryOf(diff.expected);
    if (!entry || yoramEntries.has(entry)) return false;
    const separator = entry.indexOf(":");
    const tag = (separator === -1 ? entry : entry.slice(0, separator)).split(".")[0].toLowerCase();
    const text = separator === -1 ? "" : entry.slice(separator + 1).trim();
    return text.length > 0 || VISIBLE_LOSS_TAGS.has(tag);
  });
}

// --- DB semantic projection -------------------------------------------------

function normalizeColumnKey(key) {
  return String(key).replaceAll(/[_\s-]/gu, "").toLowerCase();
}

function pick(row, ...names) {
  for (const name of names) {
    if (row[name] !== undefined) return row[name];
    const wanted = normalizeColumnKey(name);
    for (const key of Object.keys(row)) {
      if (normalizeColumnKey(key) === wanted) return row[key];
    }
  }
  return null;
}
// Legacy H2 and Yoram SQLite encode ISSUE.state differently by design
// (crates/persistence/src/repo/common.rs issue_state_to_raw): legacy H2 uses
// 1=open / 2=closed, Yoram SQLite uses 0=open / 1=closed. Projections
// normalize each side to semantic text before diffing; unknown values pass
// through unchanged.
export const ISSUE_STATE_ENCODINGS = {
  legacy: { 1: "open", 2: "closed" },
  yoram: { 0: "open", 1: "closed" },
};

export function projectIssueRows(rows, stateEncoding = {}) {
  return rows
    .map((row) => ({
      title: collapseWhitespace(String(pick(row, "title") ?? "")),
      author: pick(row, "authorLoginId"),
      state: stateEncoding[String(pick(row, "state") ?? "")] ?? String(pick(row, "state") ?? "").toLowerCase(),
    }))
    .sort((a, b) => (a.title < b.title ? -1 : a.title > b.title ? 1 : 0));
}

export function projectCommentRows(rows) {
  return rows
    .map((row) => ({
      author: pick(row, "authorLoginId"),
      body: collapseWhitespace(String(pick(row, "contents", "body") ?? "")),
    }))
    .sort((a, b) => (a.body < b.body ? -1 : a.body > b.body ? 1 : 0));
}

export function projectLabelRows(rows) {
  return rows
    .map((row) => ({
      // Name is required: color/category alone cannot distinguish two labels
      // of the same palette, and reconciliation keys on the full tuple.
      name: pick(row, "name", "labelName"),
      category: pick(row, "category", "categoryName"),
      color: String(pick(row, "color") ?? "").toLowerCase(),
    }))
    .sort((a, b) => `${a.category}/${a.name}`.localeCompare(`${b.category}/${b.name}`));
}
// ponytail: sweep-created rows carry the runId in title/body, so filtering
// both projections to the current run removes accumulated-run drift; swap to
// pre-sweep SQL cleanup only if untagged rows ever need comparing.
export function filterRowsByTag(rows, tag) {
  if (!tag) return rows;
  return rows.filter((row) => JSON.stringify(row).includes(tag));
}

export function diffProjections(legacyRows, yoramRows) {
  const legacy = JSON.stringify(legacyRows);
  const yoram = JSON.stringify(yoramRows);
  if (legacy === yoram) return [];
  const missing = legacyRows.filter((row) => !yoramRows.some((candidate) => JSON.stringify(candidate) === JSON.stringify(row)));
  const extra = yoramRows.filter((row) => !legacyRows.some((candidate) => JSON.stringify(candidate) === JSON.stringify(row)));
  return [
    ...missing.map((row) => ({ side: "legacy-only", row })),
    ...extra.map((row) => ({ side: "yoram-only", row })),
  ];
}
