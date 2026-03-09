# Phase 0B Provenance Home

This directory is the feature-level provenance home for Phase 0B core completion and the Phase 1 Org/Project CRU kickoff.

Canonical execution rules still live in [`SPEC.md`](/G:/programming/yona/SPEC.md). [`docs/agents/10-legacy-provenance-baseline.md`](/G:/programming/yona/docs/agents/10-legacy-provenance-baseline.md) remains the mirror summary. The files here hold the deeper feature traces used by Red to Green implementation work.

## Contents

- [`legacy-test-inventory.md`](/G:/programming/yona/docs/provenance/phase-0b/legacy-test-inventory.md): scan of `yona-original/test/**` grouped by capability, target layer, owner package, and current migration status.
- [`organization.md`](/G:/programming/yona/docs/provenance/phase-0b/organization.md): organization create/read/update provenance and deviations.
- [`project.md`](/G:/programming/yona/docs/provenance/phase-0b/project.md): project create/read/update, visibility, and recent-visit provenance.
- [`issue.md`](/G:/programming/yona/docs/provenance/phase-0b/issue.md): first issue edit-authorization exemplar only.
- [`fixture-strategy.md`](/G:/programming/yona/docs/provenance/phase-0b/fixture-strategy.md): canonical TS fixture names and factory mapping from `conf/test-data.yml`.

## Batch Boundary

- This batch does not claim full Phase 0B exit.
- This batch closes Phase 0B core provenance and traceability for Org/Project, then starts Phase 1 with a thin Org/Project CRU + visibility slice.
- Explicit blockers kept out of scope here:
  - org/project delete
  - project enrollment request/cancel
  - workspace recent/favorite/default landing implementation
  - PR exemplar implementation
  - search exemplar implementation
