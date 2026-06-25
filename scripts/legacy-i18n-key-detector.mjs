import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);

function escapeRegExp(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

export function parseLegacyMessageKeys(source) {
  const keys = [];
  for (const line of source.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    const messageMatch = /^([^=]+)=/u.exec(trimmed);
    if (messageMatch) {
      keys.push(messageMatch[1].trim());
    }
  }
  return [...new Set(keys)].sort();
}

export function buildRawLegacyI18nKeyPattern(keys) {
  const escapedKeys = [...keys].sort((left, right) => right.length - left.length).map(escapeRegExp);
  return new RegExp(`(?<![A-Za-z0-9_.-])(?:${escapedKeys.join("|")})(?![A-Za-z0-9_.-])`, "gu");
}

export function rawLegacyI18nKeys(text, keys = loadLegacyMessageKeys()) {
  const pattern = buildRawLegacyI18nKeyPattern(keys);
  return [...new Set(text.match(pattern) ?? [])].sort();
}

export function hasRawLegacyI18nKey(text, keys = loadLegacyMessageKeys()) {
  return rawLegacyI18nKeys(text, keys).length > 0;
}

export function loadLegacyMessageKeys() {
  return parseLegacyMessageKeys(
    readFileSync(resolve(repoRoot, "yona-original/conf/messages"), "utf8"),
  );
}
