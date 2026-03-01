# agentctl quickstart

`python scripts/agentctl.py` is the only supported way to inspect/update `tasks.json` (manual edits break the checksum).

## Common commands

```bash
# produce a shared phase-0 planning packet for PLANNER/CODER/TESTER/DOCS/REVIEWER
python scripts/agentctl.py orchestrate kickoff --goal "..." --constraint "..."

# merge 5 per-agent planning payloads using priority:
# REVIEWER > PLANNER > CODER > TESTER > DOCS
python scripts/agentctl.py orchestrate merge \
  --planner planner.json \
  --coder coder.json \
  --tester tester.json \
  --docs docs.json \
  --reviewer reviewer.json

# list/show
python scripts/agentctl.py task list
python scripts/agentctl.py task show T-123

# validate tasks.json (schema/deps/checksum)
python scripts/agentctl.py task lint

# readiness gate (deps DONE)
python scripts/agentctl.py ready T-123

# build dependency-safe waves with path-conflict locking
python scripts/agentctl.py task waves --max-lanes 3
python scripts/agentctl.py task waves --json

# status transitions that require structured comments
python scripts/agentctl.py start T-123 --author CODER --body "Start: ... (why, scope, plan, risks)"
python scripts/agentctl.py block T-123 --author CODER --body "Blocked: ... (what blocks, next step, owner)"
python scripts/agentctl.py task approve T-123 --author HUMAN --body "Approval: Approve closure commit."

# run per-task verify commands (declared on the task)
python scripts/agentctl.py verify T-123

# before committing, validate staged allowlist + message quality
python scripts/agentctl.py guard commit T-123 -m "✨ T-123 Short meaningful summary" --allow <path-prefix>

# if you want a safe wrapper that also runs `git commit`
python scripts/agentctl.py commit T-123 -m "✨ T-123 Short meaningful summary" --allow <path-prefix>

# when closing a task: mark DONE + attach commit metadata (typically after implementation commit)
python scripts/agentctl.py finish T-123 --commit <git-rev> --author REVIEWER --body "Verified: ... (what ran, results, caveats)" --require-approval-comment
```

## Wave Validation Flow

Use this sequence when running parallel wave validation tasks like `T-002~T-004`.

```bash
# 1) inspect ready tasks and planned waves
python scripts/agentctl.py task next
python scripts/agentctl.py task waves --status TODO --max-lanes 3

# 2) run scenario-specific tests
python3 -m unittest discover -s tests -p 'test_wave_independent.py'
python3 -m unittest discover -s tests -p 'test_wave_dependency.py'
python3 -m unittest discover -s tests -p 'test_wave_conflict.py'

# 3) run combined suite used by hardening task verification
python3 -m unittest discover -s tests -p 'test_wave_*.py'

# 4) close each task only after explicit approval comment is recorded
python scripts/agentctl.py task approve T-123 --author HUMAN --body "Approval: ..."
python scripts/agentctl.py finish T-123 --commit <impl-rev> --author REVIEWER --body "Verified: ..." --require-approval-comment
```

## Ergonomics helpers

```bash
# find tasks that are ready to start (deps DONE)
python scripts/agentctl.py task next

# search tasks by text (title/description/tags/comments)
python scripts/agentctl.py task search agentctl

# scaffold a workflow artifact (docs/workflow/T-###.md)
python scripts/agentctl.py task scaffold T-123

# annotate or update path ownership used by `task waves`
python scripts/agentctl.py task update T-123 --parallel-path src/a --parallel-path tests/a

# suggest minimal --allow prefixes based on staged files
python scripts/agentctl.py guard suggest-allow
python scripts/agentctl.py guard suggest-allow --format args
```

## Workflow reminders

- `tasks.json` is canonical; do not edit it by hand.
- Keep work atomic: one task → one implementation commit (plus planning + closure commits if you use the 3-phase cadence).
- Prefer `start/block/finish` over `task set-status`.
- For closure safety, record explicit approval (`task approve`) before `finish --require-approval-comment`.
- For safe parallelism, keep each task's `parallel_paths` current so `task waves` can detect conflicts.
- Keep Python cache artifacts out of commit noise (`__pycache__/`, `*.pyc`, `.pytest_cache/` are ignored).
- Keep allowlists tight: pass only the path prefixes you intend to commit.
