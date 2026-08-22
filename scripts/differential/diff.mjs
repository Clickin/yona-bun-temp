// Diff layer: API response normalization, DOM skeleton comparison, and the
// semantic value diff used by all three kinds (api/dom/db).

// Fields that are server-generated or legitimately differ between apps.
const VOLATILE_KEY = /(^|_)(id|number|userId|authorId|projectId|createdAt|createdDate|updatedAt|updatedDate|dueDate|csrfToken|token)($|_)/i;
const VOLATILE_KEY_EXACT = new Set(["owner", "ownerName"]);

// Normalize any parsed JSON body into a comparable structure:
// volatile fields are replaced with "<volatile>", objects get stable key order.
export function normalizeApiValue(value, key = "") {
  if (Array.isArray(value)) return value.map((entry) => normalizeApiValue(entry, key));
  if (value && typeof value === "object") {
    const out = {};
    for (const entryKey of Object.keys(value).sort()) {
      out[entryKey] = normalizeApiValue(value[entryKey], entryKey);
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
    .map((entry) => collapseWhitespace(String(entry)))
    .filter(Boolean)
    .sort();
}

// Compare two normalized skeletons; returns [] when equal, else first diffs.
export function diffSkeletons(legacyEntries, yoramEntries, limit = 20) {
  const legacy = normalizeSkeletonEntries(legacyEntries);
  const yoram = normalizeSkeletonEntries(yoramEntries);
  const diffs = [];
  let i = 0;
  while ((i < legacy.length || i < yoram.length) && diffs.length < limit) {
    const a = legacy[i];
    const b = yoram[i];
    if (a === b) {
      i += 1;
      continue;
    }
    // multiset-aware: report whichever side has an extra entry
    if (a !== undefined && !yoram.includes(a)) {
      diffs.push({ side: "legacy-only", expected: a, actual: b ?? "<absent>" });
      legacy.splice(i, 1);
    } else if (b !== undefined && !legacy.includes(b)) {
      diffs.push({ side: "yoram-only", expected: a ?? "<absent>", actual: b });
      yoram.splice(i, 1);
    } else {
      // same entry exists on both sides but at different positions — order drift
      diffs.push({ side: "order", expected: a, actual: b });
      i += 1;
    }
  }
  return diffs;
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

export function projectIssueRows(rows) {
  return rows
    .map((row) => ({
      title: collapseWhitespace(String(pick(row, "title") ?? "")),
      author: pick(row, "authorLoginId"),
      state: String(pick(row, "state") ?? "").toLowerCase(),
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
      category: pick(row, "category", "categoryName"),
      color: String(pick(row, "color") ?? "").toLowerCase(),
    }))
    .sort((a, b) => `${a.category}/${a.name}`.localeCompare(`${b.category}/${b.name}`));
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
