import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const FILE_PATH = new URL("../AGENTS.md", import.meta.url);

const requiredSnippets = [
  "# AGENTS.md: Yona",
  "`SPEC.md`는 이 저장소의 canonical execution spec이다.",
  "Yona를 `TanStack Start + React + Bun` 기반의 단일 애플리케이션으로 전면 재작성한다.",
  "내부 앱 read/mutation의 canonical backend boundary는 in-process `tRPC`다.",
  "TanStack Start `serverFunction`은 app-facing thin adapter이고, `Date` 같은 non-plain-JSON 타입은 `superjson`으로 처리한다.",
  "외부/프로토콜 endpoint는 server route가 canonical이다.",
  "인증 프레임워크는 `Better Auth`를 우선 사용하되",
  "DB session persistence는 금지한다. 기본은 in-memory session이며 `Redis/Valkey` secondary storage를 허용한다.",
  "`PostgreSQL`, `MySQL/MariaDB`, `SQLite`를 day 1부터 동등한 지원 대상으로 취급한다.",
  "Git/SVN 연동은 system executable만 사용한다.",
  "새 ownership은 `apps/app`, `packages/auth`, `packages/contracts`, `packages/db`, `packages/domain`, `packages/integrations`, `packages/i18n`, `packages/ui`, `packages/vcs`에 둔다.",
  "`apps/web`, `packages/api`, `packages/core`, `packages/infra`는 extraction/deletion 대상이므로 새 장기 ownership을 추가하지 않는다.",
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
