# Template-First UI Parity Goal Directive

Status: current `/goal` slash-command directive
Date: 2026-06-28

This document is the paste-ready directive for running the UI parity reset as a
long batch goal. It does not replace `AGENTS.md`, `SPEC.md`, or
`docs/plans/2026-06-26-template-first-ui-parity-reset.md`.

## Paste Into `/goal`

```text
Restore Yoram React SPA UI parity with legacy Yona through template-first
conversion. Do not redesign the UI.

Authoritative rules:
- Read AGENTS.md, SPEC.md Section 0-1 and UI-relevant sections,
  docs/agents/00-goals-and-fixed-decisions.md,
  docs/agents/01-frontend-architecture.md,
  docs/agents/05-agent-execution-guidelines.md,
  docs/agents/06-phase-plan.md, and
  docs/agents/10-legacy-provenance-baseline.md before editing.
- Treat yona-original/ as the only primary UI/UX/copy/deep-link source.
- Use docs/plans/2026-06-26-template-first-ui-parity-reset.md as the active
  UI parity strategy and docs/plans/2026-06-27-ui-parity-coordination.md as the
  current coordination log.
- Ignore reference/mixed-code/** for parity evidence.
- Do not introduce Tailwind, a new design system, a new CSS architecture, or
  speculative shared abstractions.

Work loop:
1. Pick one concrete packet/route/state from P0-P7 with gap or weak evidence.
2. Read the owning Scala template, every partial it calls, related legacy
   controller route, page JavaScript, LESS/CSS, and message keys.
3. Port the template into the existing React route/component as one large
   JSX/TSX skeleton first. Preserve DOM order, class names, labels, form field
   names, modal structure, hrefs, data-* hooks, and empty/error states.
4. Mechanically replace template variables and form submits with current REST
   JSON client/TanStack Query reads and mutations. If an endpoint is missing,
   add only the smallest /api/v1 endpoint/client/test needed for that form.
5. Keep server-rendered HTML fragments out of the React path. Convert fragment
   data to API-return plus React render while preserving the visible DOM shape.
6. Do not split the large JSX into smaller components until selector/copy/form
   interaction and desktop/mobile browser evidence match legacy. Extract only
   when at least two converted templates already share the same legacy markup.
7. Update the owning
   docs/provenance/ui-parity-reports/template-first-*.md row with legacy source,
   current source, defect class, status, and evidence.
8. Run the smallest focused checks for the touched packet. Use cargo wrappers
   outside the sandbox whenever Rust verification is needed.
9. Run the turn commit hook before ending a turn:
   pnpm agent:turn-commit -- -m "<concise summary>"

Close only when all active P0-P7 report rows are covered, deferred, or
not-applicable with evidence, and no gap/deviation/weak-evidence row remains for
current app-runtime UI parity.

If blocked, record the exact blocker, affected packet, legacy path, current
path, and smallest next write scope. Do not broaden into architecture work.
```

## Batch Notes

- The giant JSX file is allowed as an intermediate parity artifact.
- Component decomposition is follow-up cleanup, not a prerequisite for parity.
- A route is not closed by reachability alone; it needs visible legacy
  selector/copy/form/interaction evidence.
- Shared shell fixes should be root-cause fixes. Do not patch the same missing
  class or layout rule in each screen.
