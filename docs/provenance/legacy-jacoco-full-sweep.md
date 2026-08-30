# Legacy Yona JaCoCo full sweep

- **Run ID:** `sweep-mtfoidbc`
- **Registered scenarios:** 117
- **Attempted scenarios:** 117
- **Completed without infrastructure or harness failure:** 0
- **Behavior IDs covered:** 313
- **Differential findings:** 12
- **JaCoCo execution data:** `.agent/legacy-jacoco/full-sweep/yona.exec`, 373,791 bytes
- **JaCoCo XML report:** generated at `.agent/legacy-jacoco/full-sweep/report.xml`
- **Reported classes:** 3,010
- **Reported methods:** 13,466 (851 fully covered, 458 partially covered, 12,157 fully missed)
- **Reported method coverage:** 851 covered, 12,157 missed
- **Reported branches:** 1,965 covered, 7,199 missed
- **Source-backed classes/methods:** 329 / 0
- **Generated or non-source classes/methods:** 2,681 / 13,466
- **Reconciliation:** 0 static-covered/runtime-executed, 284 static-covered/runtime-missed, 0 static-uncovered/runtime-executed, 0 static-uncovered/runtime-missed; 284 route-facing fully missed

## Status

The baseline is **complete with recorded scenario execution**, with no infrastructure errors in the final report. The final clean rerun used the absolute extracted runtime agent path `/Users/senghyunjo/github/yona-bun-temp/.agent/legacy-jacoco/jacocoagent-runtime.jar` and the existing default 117-scenario command. It produced 117 report rows and 313 covered behavior IDs. The sweep recorded 12 differential findings (and 437 step errors, which are retained in the differential report); these are findings from the run, not a reason to discard its coverage. The final execution data is 373,791 bytes. The prior mail-sink startup failure is superseded by this successful completion and is not present in the current `summary.json` `baseline.infraErrors`.

The reconciliation parser now treats paired and self-closing JaCoCo
`<class>` records as separate records. Before this fix, a self-closing source
class could consume the next closing class tag and inherit another class's
methods. The source-class index is not the cause of the controller totals:
it contains the expected controller declarations, while the current report
contains self-closing records with no method children for the eight major
controllers. This is also true when the report is regenerated from the
existing execution data and legacy jar; the jar's `controllers.IssueApp`
bytecode still declares controller methods (for example,
`organizationIssues` and `issues`). Therefore the corrected `totalMethods=0`
values describe the report data, not a claim that the Java sources have no
methods. The prior nonzero ProjectApp/PullRequestApp/SiteApp totals were
parser attribution artifacts.

Before the final run, inspection found `127.0.0.1:2525` held by PID 9127 running `scripts/differential/mail-sink.mjs`, consistent with the earlier startup failure being a stale mail-sink port conflict. PID 9127 was stopped, the port was verified free, and the final run was then started.

## Artifacts

The full-sweep directory contains **2,620 files** totaling **28,173,235 bytes** (including **2,609 HTML files** under `html/`). The top-level generated artifacts are:

`controller-partials.json`, `controller-review.json`, `discovery-queue.json`, `html/`, `methods.json`, `reconciliation.json`, `report.xml`, `route-action-index.json`, `source-class-index.json`, `summary.json`, `uncovered-methods.json`, and `yona.exec`.

JaCoCo report generation used the cached JaCoCo 0.8.14 CLI and the prepared legacy Yona application jar. Generated `.agent` artifacts are ignored and are not committed.
