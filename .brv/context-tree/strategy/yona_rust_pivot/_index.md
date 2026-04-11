---
children_hash: 595d5a030a65335b35011f9be5564ba6ba59dfcd9142b59fe48c840a7ff54307
compression_ratio: 0.8291187739463601
condensation_order: 1
covers: [context.md, rust_pivot_execution_governance.md]
covers_token_total: 1305
summary_level: d1
token_count: 1082
type: summary
---
# yona_rust_pivot Structural Summary

## Topics & Relationships
- **yona_rust_pivot/context.md**
  - Provides the overarching guidance for the Rust pivot: AGENTS/SPEC canonical execution, conversion principles, workspace and documentation boundaries, product scope, phase plan, and verification guardrails.
  - Highlights AGENTS conversion principles, SPEC canonical workspace/workflow, documentation governance for historical artifacts, and verification/recording of missing features.
  - Serves as the entry point for drilling into lower-level governance details detailed in `rust_pivot_execution_governance.md`.

- **rust_pivot_execution_governance.md**
  - Captures the execution governance story in detail, linking to AGENTS/SPEC/README/CLAUDE plus docs/agents and tools for enforcement.
  - **Raw Concept**
    - Task: Document AGENTS/SPEC canonical execution governance for the Rust+React pivot.
    - Changes: Promoted Rust pilot to top-level workspace, rewrote canonical docs, updated provenance owners, added historical status banners, categorized mixed code as reference-only, and enhanced `verify:agents`.
    - Files referenced span canonical docs (`AGENTS.md`, `SPEC.md`), extensive docs/agents chapters, provenance records, plans/workflow, and `tools/verify-agents-integrity.mjs`.
    - Flow outlines the chain from AGENTS conversion principles through SPEC, docs mirror, provenance, historical plans/workflow, to automated verification.
    - Timestamp 2026-04-07; author credited to Rust transformation leadership.
  - **Narrative**
    - Structure enforces AGENTS → SPEC → docs/agents → provenance/plan/workflow chain, bounds canonical workspace to `yona-rust/{frontend,proto,crates/*}`, and treats root mixed code as reference.
    - Product scope phases 0‑6 cover auth/workspace/org/project parity, issues/comments/repos/PRs, search/notifications/integrations, and deployment hardening with DoD tied to legacy parity.
    - Dependencies include canonical docs, docs/agents mirrors, provenance updates, historical banner workflows, and the verify guardrail script.
    - Highlights emphasize the Rust+React single workspace aligning with legacy UX while supporting deferred annotations; documentation governance is centered on status banners, missing-feature records, and verification via `pnpm verify:agents`.
    - Rules enforce no new abstractions outside SPEC, no legacy-improvement changes, no arbitrary UI/UX tweaks, restriction against outside- scope architecture discussion, mandatory historical status banners for docs/plans, and synchronized missing-feature recording across canonical/provenance/planning docs.
  - **Facts**
    - Conversion principle: feature parity first, no new structure proposals until parity achieved.
    - Canonical doc order chain: AGENTS → SPEC → docs/agents → provenance → plans/workflow with status banners.
    - Missing features must be recorded as deferred/gap/deviation across canonical, provenance, planning docs.
    - `verify:agents` script enforces AGENTS content and skip-worktree constraints.
    - Phase plan enumerates phases 0‑6 covering breadth of workspace parity and hardening.

## Summary
- The Rust pivot governance bundles AGENTS and SPEC as the canonical execution narrative, mirrors them through docs/agents chapters, anchors provenance/plans/workflow artifacts with historical banners, and enforces consistency via `verify:agents`.
- Canonical workspace boundaries are locked to `yona-rust/{frontend,proto,crates/*}`, with mixed legacy code treated as reference-only artifacts.
- The product scope spans auth, workspace, organization, projects, issues, repositories, PRs, search/notifications/integrations, admin, migration, and deployment hardening, sequenced across phases 0‑6 tied to legacy parity.
- Documentation governance mandates status banners for historical docs, synchronized missing-feature recording, and strict rules forbidding new abstractions, UI changes, or architecture discussions beyond the defined scope.
- Enforcement is automated via `pnpm verify:agents`, ensuring AGENTS content, absence of forbidden patterns, missing-feature guardrails, and skip-worktree compliance.

Drill down into `context.md` for the overview and `rust_pivot_execution_governance.md` for detailed governance actions, rules, facts, and file references.