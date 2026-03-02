import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const FILE_PATH = new URL("../AGENTS.md", import.meta.url);

const requiredSnippets = [
  "# AGENTS.md: Yona",
  "Git backend를 git executable로 변경",
  "Session을 in-memory로 변경",
  "Postgres/MySQL/SQLite",
  "Import 컨벤션",
  "Schema parity bar",
];

const forbiddenPatterns = [
  { pattern: /^\d+#\w+\|/m, message: "Found line-prefix corruption pattern (e.g. #XX|)." },
  { pattern: /AGENTS_SPEC:\s*v0\.2/m, message: "Found old Codex AGENTS spec header." },
  { pattern: /#\s*CODEX IDE CONTEXT/m, message: "Found old CODEX IDE CONTEXT block." },
];

const content = readFileSync(FILE_PATH, "utf8");
const failures = [];

try {
  const lsFiles = execSync("git ls-files -v AGENTS.md", { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();

  if (lsFiles.startsWith("S ")) {
    failures.push(
      "AGENTS.md is marked skip-worktree. Run: git update-index --no-skip-worktree AGENTS.md",
    );
  }
} catch {
  // Ignore git lookup failures for environments without git metadata.
}

for (const snippet of requiredSnippets) {
  if (!content.includes(snippet)) {
    failures.push(`Missing required content: ${snippet}`);
  }
}

for (const { pattern, message } of forbiddenPatterns) {
  if (pattern.test(content)) {
    failures.push(message);
  }
}

if (failures.length > 0) {
  console.error("AGENTS.md integrity check failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("AGENTS.md integrity check passed.");
