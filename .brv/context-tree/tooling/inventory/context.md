# Topic: inventory

## Overview
Covers the inventory generator that walks server code, extracts API surface and query keys, infers auth/error mappings, and outputs synchronized artifacts for the Go + Connect baseline.

## Key Concepts
- Surface inventory extraction from apps/app/src/lib
- Query key normalization plus invalidation tracking
- Legacy surface module generation and artifact writing
- Vitest semantic diff gate (inventory.spec.ts)

## Related Topics
- release/demo_ready_pr_merge_review - for artifact parity plans
- project_directory_parity/projects_parity_baseline - for surface coverage tracking
