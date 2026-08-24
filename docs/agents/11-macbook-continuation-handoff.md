# MacBook Continuation Handoff

Status: superseded (2026-08-25). Current review and human-only checks are
tracked in `docs/provenance/human-verification-2026-08.md`; this handoff is
retained as historical onboarding context.

## Goal Prompt

Continue porting the legacy Play Framework based Yona application until functional parity is complete.

Use legacy Yona as the functional and UI source of truth. Parity means users can perform the same work with the same UI/UX, not that every Java/Play, JGit, or SVNKit implementation detail is reproduced. Markdown must be rendered on the React side, not server-rendered HTML. Git and SVN behavior must use local executable wrappers. For Git Smart HTTP behavior, use Gitea/Forgejo as implementation references where legacy behavior does not provide enough executable detail.

Keep working autonomously toward the full port. On every committed iteration, update the current status documents and self-diagnose remaining legacy parity gaps.

## Startup Instructions

1. Clone or update the repository:

   ```bash
   git clone https://github.com/Clickin/yona-bun-temp.git yona
   cd yona
   ```

   If the repo already exists:

   ```bash
   git pull --ff-only
   ```

2. Read the operating contract before editing:

   ```bash
   sed -n '1,220p' AGENTS.md
   sed -n '1,220p' SPEC.md
   sed -n '1,180p' docs/agents/06-phase-plan.md
   sed -n '1,140p' docs/provenance/legacy-porting-progress.md
   ```

3. Verify required local executables:

   ```bash
   git --version
   svn --version
   svnadmin --version
   svnlook --version
   pnpm --version
   cargo --version
   ```

4. Inspect current state:

   ```bash
   git status --short --branch
   git log -5 --oneline
   ```

## Current Milestone Status

At the time this note was created, the canonical progress counters were:

| Source | Done | Partial | Open | Left |
| --- | ---: | ---: | ---: | ---: |
| `docs/provenance/legacy-porting-progress.md` | 400 | 13 | 18 | 31 |
| `SPEC.md` | 199 | 4 | 7 | 11 |

The latest committed slices before this handoff were Markdown legacy Highlight.js parity increments, with the latest committed iterations covering Kotlin and Objective-C common-number literal highlighting.

## Next Work Selection

Use the smallest independently verifiable parity gap that moves a partial flag toward completion. Prefer gaps already listed in:

- `docs/provenance/legacy-porting-progress.md`
- `SPEC.md`
- `docs/agents/06-phase-plan.md`

Good next candidates after the Kotlin numeric slice:

- Continue legacy Highlight.js language coverage in React-side Markdown rendering.
- Pick a remaining Markdown/GFM edge case only when backed by `yona-original/` evidence.
- Resume broader functional gaps from the partial/open flag list when syntax-highlighting slices stop being the best small independent path.

## Iteration Rules

- Re-read the relevant legacy route/view/test/model in `yona-original/` before implementation.
- Use TDD for behavior changes: add the failing parity test first, verify RED, implement the minimal parity change, verify GREEN.
- Keep Markdown rendering React-side.
- Keep Git/SVN behavior executable-backed.
- Do not introduce UI improvements before 1:1 legacy parity is complete.
- Update current status docs in the same commit as the implementation.
- Commit with the Lore protocol from `AGENTS.md`.

## Standard Verification

For frontend Markdown renderer slices:

```bash
pnpm --dir frontend test -- markdown-renderer.spec.tsx
pnpm --dir frontend check
git diff --check
pnpm --dir frontend test
pnpm --dir frontend build
node tools/yona-parity-gate.mjs frontend/src/routes/-syntax-highlighting.tsx frontend/src/markdown-renderer.spec.tsx docs/provenance/legacy-porting-progress.md SPEC.md docs/agents/06-phase-plan.md --json
git diff --cached --check
node ./tools/precommit-verify.mjs
```

Use narrower or broader commands when the touched scope requires it, but do not claim completion without verification evidence.
