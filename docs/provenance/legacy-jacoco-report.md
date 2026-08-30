# Legacy Yona JaCoCo report tooling

- **Legacy distribution:** `.agent/legacy-localhost/dist/yona-h2-v1.16.0/yona-1.16.0`; the Yona-owned application artifact is `lib/yona.yona-1.16.0.jar`.
- **Launcher:** `scripts/legacy-localhost.mjs` starts `<distribution>/bin/yona`.
- **Java process boundary:** `bin/yona` owns the JVM launch; the launcher adds the JaCoCo option to that child process's argument vector.
- **JVM option injection:** `-J-javaagent:<agent>=destfile:<exec>,append=false` is passed as one `bin/yona` argument, which the Play launcher forwards to the Java process.
- **Dump timing:** JaCoCo's default `dumponexit=true` writes the exec data during JVM shutdown; `legacy-localhost stop` sends the managed process `SIGTERM`, so report generation runs after that stop/dump boundary.
- **Verified JaCoCo 0.8.14 Gradle cache:** the agent is at `$HOME/.gradle/caches/modules-2/files-2.1/org.jacoco/org.jacoco.agent/0.8.14/bca1f6d49506da3ebd0d3b9acbcfdd1fb22c14e/org.jacoco.agent-0.8.14.jar`; the CLI is at `$HOME/.gradle/caches/modules-2/files-2.1/org.jacoco/org.jacoco.cli/0.8.14/67219de732252f3c289e267e24733147934132da/org.jacoco.cli-0.8.14.jar`. The report script discovers CLI jars below `$HOME/.gradle/caches/modules-2/files-2.1/org.jacoco/org.jacoco.cli` (and the equivalent Maven cache), while the launcher accepts the agent through `YONA_LEGACY_JACOCO_AGENT`.
- **Artifacts:** default exec/report outputs are under `.agent/legacy-jacoco/`. JaCoCo agent and CLI binaries are cache/user-provided inputs; no binary is committed to the repository.
- **Classfile overrides:** discovery follows the launcher's versioned install layout. Set `YONA_LEGACY_WORKSPACE_DIR` or `YONA_LEGACY_JACOCO_CLASSFILES` when the prepared distribution is elsewhere.
- **Runtime class dump:** set `YONA_LEGACY_JACOCO_CLASSDUMP_DIR` to opt in to
  JaCoCo's `classdumpdir` agent option. The launcher creates the directory
  before starting Yona; the disabled (`YONA_LEGACY_JACOCO` unset or `0`) path
  does not inspect this setting.
- **Identity diagnostics:** `pnpm legacy:jacoco:diagnostics identity` runs
  `jacococli execinfo` and verbose `classinfo`, persisting
  `diagnostic/execinfo.txt`, `diagnostic/classinfo-distribution.txt`, and
  `diagnostic/classinfo-runtime-dump.txt` when a runtime dump is available.
  It compares the target class IDs in `diagnostic/class-identity.json` and
  selects one canonical classfile source. A runtime-transformed result selects
  the runtime dump; a blocked result prevents report generation from silently
  falling back to distribution classfiles.
- **Deterministic probe:** after starting legacy Yona with
  `YONA_LEGACY_JACOCO=1` and `YONA_LEGACY_JACOCO_CLASSDUMP_DIR` set, run
  `pnpm legacy:jacoco:diagnostics probe` against the `GET /` route. This
  records the live HTTP request first; because `dumponexit` flushes only when
  the process stops, run `legacy:localhost:stop` and then
  `legacy:jacoco:diagnostics identity` to finalize `diagnostic/probe.json`
  with the non-empty exec and runtime dump checks. The probe is not considered
  passing unless identity has a target method and the generated report covers
  the invoked method.
- **Report diagnostics:** `pnpm legacy:jacoco:report` persists
  `diagnostic/report-command.log` and marks `coverageIdentityValid` false when
  JaCoCo emits a class-identity mismatch warning. Once identity diagnostics
  select runtime classfiles, the report command consumes that source on rerun
  through the generated `class-identity.json` artifact.
- **Evidence gate:** reconciliation writes `coverageEvidenceStatus` and
  `coverageEvidenceCode`. Source-backed classes with no method records are
  `INVALID`/`INVALID_EVIDENCE`, and the discovery queue is emitted as blocked
  rather than as a product backlog.

The extracted distribution and verified Gradle-cached JaCoCo 0.8.14 agent/CLI are present in the current workspace. Report generation remains opt-in via `YONA_LEGACY_JACOCO=1`; no binary is stored in the repository.

## Real phase-de-real-v2 result

The first real start used the default agent path and failed with
`Failed to find Premain-Class manifest attribute`; the prepared runtime agent
then started successfully. With a fresh exec/classdump directory, `GET /`
returned HTTP 200. Shutdown produced a 224472-byte exec file and 5663 dumped
classfiles. `controllers.Application` had the exact ID `a7315256794f49b5` in
execinfo, distribution classinfo, and runtime classinfo, but JaCoCo reported
`METH=0` in both classinfo records.

`javap` confirms `controllers.Application.index()` and the other methods exist.
The class-level `play/core/enhancers/PropertiesEnhancer$GeneratedAccessor`
annotation triggers JaCoCo's `GeneratedFilter`, so classinfo and the report
omit those methods. The `controllers.IssueApp` fallback has the same result.
The report therefore contains a self-closing `controllers/Application` class
with no method or covered-instruction counter: the method-count invariant is
unmet. No v2 full sweep or five-family validation ran. Preserve the invalid
baseline and investigate this filtering/analysis behavior without changing
JaCoCo versions or product code before any parity discovery.

## Differential representative runs

The differential runner supports the opt-in `--scenario ID` (repeatable) and
`--scenarios ID,ID,...` selectors. With neither option it still runs all 117
registered scenarios. The selector contract passes; a representative runtime
sweep still requires both the legacy endpoint and the Yoram endpoint to be
available. No coverage report is claimed here.
