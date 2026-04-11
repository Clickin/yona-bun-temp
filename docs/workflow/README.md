# Workflow Artifacts

> Status: `historical`
> These workflow artifacts come from a prior orchestration/workflow toolchain and are not the current Yona execution source of truth. Use `AGENTS.md`, `SPEC.md`, and `docs/agents/*` for active guidance; keep this directory as historical record only.

Each completed task should have an atomic documentation artifact under this folder.

## Naming

- `T-###.md` (example: `T-025.md`)

## Purpose

Capture what was implemented for the task in a small, reviewable, and durable artifact.

## Suggested Template

- Title (`T-###: <short summary>`)
- Scope (what changed / what did not change)
- Files touched (key @paths)
- Behavior / UX notes (if user-visible)
- Verification (commands that were run, or how to validate locally)
- Follow-ups / known gaps (if any)
