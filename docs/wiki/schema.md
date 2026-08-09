---
title: Yoram repository wiki schema
kind: schema
status: active
updated: 2026-08-09
---

# Schema

`docs/wiki/` is a small, git-native knowledge layer for the repository. It is
not a replacement for the project rules and it is not a second implementation
source.

## Source boundaries

- `AGENTS.md` is the execution authority.
- `SPEC.md` is the Rust-pivot technical specification.
- `yona-original/` is the feature, UX, copy, route, and legacy-CSS evidence.
- `docs/provenance/` records gaps, deviations, and parity evidence.
- `docs/wiki/` contains compressed navigation, working conclusions, and the
  chronological log only.

Never rewrite `AGENTS.md`, `SPEC.md`, legacy files, or provenance to make a
wiki conclusion look true. If evidence conflicts, record the conflict and
follow the canonical order above.

## Page rules

Every page has YAML frontmatter with `title`, `kind`, `status`, and `updated`.
Use `[[page-name]]` links for wiki navigation and ordinary repository links for
canonical source files. Every StyleX or parity claim names the legacy source,
React owner, focused WTR, and provenance row/document when available.

Use these dispositions for unfinished work:

- `deferred`: intentionally moved out of the current phase;
- `gap`: current behavior still differs from legacy;
- `deviation`: intentional, documented product or platform difference.

## Sweep contract

1. Read `[[index]]` and `[[overview]]`.
2. Search only the linked route/spec/provenance files relevant to the task.
3. Implement the smallest parity-preserving change in the canonical owner.
4. Run the focused fallback-off check at desktop and 390px where applicable.
5. Record the result, failure family, metrics, and commit in `[[log]]`.

The wiki is maintained by the agent, but source files remain the evidence.
