# Legacy Yona JaCoCo report tooling

- **Legacy distribution:** `.agent/legacy-localhost/dist/yona-h2-v1.16.0/yona-1.16.0`; the Yona-owned application artifact is `lib/yona.yona-1.16.0.jar`.
- **Launcher:** `scripts/legacy-localhost.mjs` starts `<distribution>/bin/yona`.
- **Java process boundary:** `bin/yona` owns the JVM launch; the launcher adds the JaCoCo option to that child process's argument vector.
- **JVM option injection:** `-J-javaagent:<agent>=destfile:<exec>,append=false` is passed as one `bin/yona` argument, which the Play launcher forwards to the Java process.
- **Dump timing:** JaCoCo's default `dumponexit=true` writes the exec data during JVM shutdown; `legacy-localhost stop` sends the managed process `SIGTERM`, so report generation runs after that stop/dump boundary.
- **Verified JaCoCo 0.8.14 Gradle cache:** the agent is at `$HOME/.gradle/caches/modules-2/files-2.1/org.jacoco/org.jacoco.agent/0.8.14/bca1f6d49506da3ebd0d3b9acbcfdd1fb22c14e/org.jacoco.agent-0.8.14.jar`; the CLI is at `$HOME/.gradle/caches/modules-2/files-2.1/org.jacoco/org.jacoco.cli/0.8.14/67219de732252f3c289e267e24733147934132da/org.jacoco.cli-0.8.14.jar`. The report script discovers CLI jars below `$HOME/.gradle/caches/modules-2/files-2.1/org.jacoco/org.jacoco.cli` (and the equivalent Maven cache), while the launcher accepts the agent through `YONA_LEGACY_JACOCO_AGENT`.
- **Artifacts:** default exec/report outputs are under `.agent/legacy-jacoco/`. JaCoCo agent and CLI binaries are cache/user-provided inputs; no binary is committed to the repository.
- **Classfile overrides:** discovery follows the launcher's versioned install layout. Set `YONA_LEGACY_WORKSPACE_DIR` or `YONA_LEGACY_JACOCO_CLASSFILES` when the prepared distribution is elsewhere.

The extracted distribution and verified Gradle-cached JaCoCo 0.8.14 agent/CLI are present in the current workspace. Report generation remains opt-in via `YONA_LEGACY_JACOCO=1`; no binary is stored in the repository.

## Differential representative runs

The differential runner supports the opt-in `--scenario ID` (repeatable) and
`--scenarios ID,ID,...` selectors. With neither option it still runs all 117
registered scenarios. The selector contract passes; a representative runtime
sweep still requires both the legacy endpoint and the Yoram endpoint to be
available. No coverage report is claimed here.
