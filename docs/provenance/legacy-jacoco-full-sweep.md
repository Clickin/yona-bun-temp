# Legacy Yona JaCoCo full sweep

- **Run ID:** `sweep-mtfoidbc`
- **Registered scenarios:** 117
- **Attempted scenarios:** 117
- **Global infrastructure errors:** 0
- **Scenarios with step errors:** 117 (legacy `scenario.errors` accounting)
- **Scenarios without step errors:** 0 (legacy `scenario.errors` accounting)
- **Total step errors:** 437 (legacy `scenario.errors` accounting)
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
- **Reconciliation:** 0 static-covered/runtime-executed, 284 static-covered/runtime-missed, 0 static-uncovered/runtime-executed, 0 static-uncovered/runtime-missed; 284 route-facing misses, all `COVERAGE_MAPPING_UNRESOLVED`
- **Coverage evidence:** `INVALID` (`INVALID_EVIDENCE`, reason `SOURCE_BACKED_METHODS_MISSING`)

## Status

The baseline is **INVALID FOR PARITY DISCOVERY**. It has no recorded global
infrastructure errors, but source-backed report classes have no method
records, so method-level mapping is unresolved. The final clean rerun used
the absolute extracted runtime agent path
`/Users/senghyunjo/github/yona-bun-temp/.agent/legacy-jacoco/jacocoagent-runtime.jar`
and the existing default 117-scenario command. It produced 117 report rows
and 313 covered behavior IDs, but those counts do not make the JaCoCo
evidence suitable for discovery. The 284 route-facing misses are therefore
not `UNREACHABLE_OR_INTERNAL` closure evidence, and the discovery queue is
blocked until a deterministic controller probe proves the class identity and
source-backed method invariant.

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

`controller-partials.json`, `controller-review.json`, `discovery-queue.json`,
`html/`, `methods.json`, `reconciliation.json`, `report.xml`,
`route-action-index.json`, `source-class-index.json`, `summary.json`,
`uncovered-methods.json`, and `yona.exec`. Identity diagnostics are written
under `diagnostic/` (`execinfo.txt`, `classinfo-distribution.txt`,
`classinfo-runtime-dump.txt` when a runtime dump exists, and
`class-identity.json`). The baseline sweep directory itself predates the
runtime-dump probe and has no runtime classdump; the separate
`phase-de-real-v2` diagnostic directory contains the real probe artifacts.

## Real phase-de-real-v2 follow-up

The fresh follow-up is not a replacement baseline and did not run the 117
scenario sweep or five-family validation. It recorded `GET /` as HTTP 200,
then after shutdown captured a 224472-byte exec and 5663 runtime classfiles.
All three `controllers.Application` identity IDs match
(`a7315256794f49b5`), but distribution/runtime classinfo both report
`METH=0`. The method-count invariant therefore remains invalid, and the
canonical source and discovery queue remain blocked. See
`.agent/legacy-jacoco/phase-de-real-v2/diagnostic/` for `probe.json`,
`execinfo.txt`, `classinfo-distribution.txt`, `classinfo-runtime-dump.txt`,
and `class-identity.json`. `javap` confirms `controllers.Application#index`
and its other methods exist; the class annotation
`play/core/enhancers/PropertiesEnhancer$GeneratedAccessor` causes JaCoCo's
`GeneratedFilter` to emit a methodless class/report. Do not alter JaCoCo
versions or product code; next investigate the filter/report input locally.

JaCoCo report generation used the cached JaCoCo 0.8.14 CLI and the prepared legacy Yona application jar. Generated `.agent` artifacts are ignored and are not committed.
