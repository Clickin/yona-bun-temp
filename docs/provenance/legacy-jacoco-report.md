# Legacy Yona JaCoCo report tooling

- **Legacy distribution:** `.agent/legacy-localhost/dist/yona-h2-v1.16.0/yona-1.16.0`; the Yona-owned application artifact is `lib/yona.yona-1.16.0.jar`.
- **Launcher:** `scripts/legacy-localhost.mjs` starts `<distribution>/bin/yona`.
- **Java process boundary:** `bin/yona` owns the JVM launch; the launcher adds the JaCoCo option to that child process's argument vector.
- **JVM option injection:** `-J-javaagent:<agent>=destfile:<exec>,append=false` is passed as one `bin/yona` argument, which the Play launcher forwards to the Java process.
- **Dump timing:** JaCoCo's default `dumponexit=true` writes the exec data during JVM shutdown; `legacy-localhost stop` sends the managed process `SIGTERM`, so report generation runs after that stop/dump boundary.
- **Pinned JaCoCo toolchain:** version 0.8.14 is vendored under `tools/jacoco/0.8.14/`. `jacocoagent-runtime.jar` is the executable `-javaagent` runtime (its manifest contains `Premain-Class`); `jacococli.jar` is the standalone CLI. SHA-256 values are recorded in `tools/jacoco/0.8.14/SHA256SUMS`. `YONA_LEGACY_JACOCO_AGENT`, `YONA_LEGACY_JACOCO_CLI`, and compatibility dependency overrides remain supported.
- **Artifacts:** default exec/report outputs are under `.agent/legacy-jacoco/`. `.agent/` is generated output only; it is never a source for JaCoCo binaries.
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

Report generation remains opt-in via `YONA_LEGACY_JACOCO=1`; ordinary validation and sweep runs do not require Maven or Gradle caches. The eventual release repository may remove parity tooling, but this porting repository vendors the binaries for fresh-checkout reproducibility.

## Play 2.3 compatibility shim

`tools/legacy-jacoco-play-compat/` contains the JaCoCo 0.8.14
`AnnotationGeneratedFilter` source with one deliberate exception for
`Lplay/core/enhancers/PropertiesEnhancer$GeneratedAccessor;`. The helper
`pnpm legacy:jacoco:play-compat` compiles it with the vendored JaCoCo 0.8.14
core and ASM dependencies from `tools/jacoco/0.8.14/lib/` to the ignored
`.agent/tools/legacy-jacoco-play-compat/` directory. The JAR contains only
`org.jacoco.core.internal.analysis.filter.AnnotationGeneratedFilter`; it is
not committed.

The report path is unchanged unless `YONA_LEGACY_JACOCO_PLAY_COMPAT=1` is
explicitly set. In compatibility mode the shim JAR is first on the report
JVM classpath, and `diagnostic/filter-class-origin.txt` records the loaded
class origin. Report metadata identifies the analyzer as
`jacoco-0.8.14-play23-compat`, retains `upstreamVersion: 0.8.14`, and records
the exact descriptor exception. The default mode remains
`jacoco-0.8.14` with no exception.

The synthetic regression invokes the filter with a class-level Play
`GeneratedAccessor` descriptor and a class/method `SomeGenerated` descriptor:
the Play marker is visible while both other generated markers remain
filtered. Against the existing deterministic `GET /` exec and the unchanged
Yona distribution JAR, standard 0.8.14 reports
`controllers.Application` with 0 methods; compatibility mode reports 18
methods including `index`, with 19 covered instructions. The existing
identity artifact remains `a7315256794f49b5`; no agent, exec, classfile, or
Yona source changed.

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
