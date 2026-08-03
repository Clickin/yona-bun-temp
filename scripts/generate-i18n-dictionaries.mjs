// Generates frontend/src/i18n/messages/{en-US,ja-JP,ko-KR,ru-RU,uz-UZ}.json from the
// legacy yona-original/conf/messages* properties files.
//
// Parsing mirrors frontend/src/i18n.tsx parseLegacyMessages: split lines, skip
// empty/comment lines, split at the first `=`, trim both sides. Values are kept
// VERBATIM (no rebrand, no `''`/`\n` unescaping) — rebranding stays in i18n.tsx
// and the server applies Play unescaping itself. Object insertion order mirrors
// file order.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDirectory, "..");

const LOCALES = [
  ["en-US", "yona-original/conf/messages"],
  ["ja-JP", "yona-original/conf/messages.ja-JP"],
  ["ko-KR", "yona-original/conf/messages.ko-KR"],
  ["ru-RU", "yona-original/conf/messages.ru-RU"],
  ["uz-UZ", "yona-original/conf/messages.uz-UZ"],
];

function parseLegacyMessages(source) {
  const messages = {};
  for (const line of source.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    const messageMatch = /^([^=]+)=(.*)$/u.exec(trimmed);
    if (!messageMatch) {
      continue;
    }
    const key = messageMatch[1].trim();
    messages[key] = messageMatch[2].trim();
  }
  return messages;
}

for (const [locale, relativeSourcePath] of LOCALES) {
  const source = readFileSync(join(repoRoot, relativeSourcePath), "utf8");
  const dictionary = parseLegacyMessages(source);
  const outputDirectory = join(repoRoot, "frontend/src/i18n/messages");
  mkdirSync(outputDirectory, { recursive: true });
  const outputPath = join(outputDirectory, `${locale}.json`);
  writeFileSync(outputPath, `${JSON.stringify(dictionary, null, 2)}\n`);
  console.log(`${locale}: ${Object.keys(dictionary).length} messages -> ${outputPath}`);
}
