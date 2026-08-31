import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import test from "node:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  buildLegacyJacocoLauncherArg,
  classifySecretBootstrapResponse,
  commandMatchesLayout,
  commandMatchesPort,
  resolveLegacyJacocoConfig,
  rewriteApplicationConf,
} from "./legacy-localhost.mjs";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);

test("legacy-localhost help exposes parity foundation and content seeding", () => {
  const output = execFileSync("node", ["scripts/legacy-localhost.mjs", "help"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.match(output, /seed-parity-foundation/u);
  assert.match(output, /seed-parity-content/u);
  assert.match(output, /--admin-password PASSWORD/u);
});

test("legacy-localhost parity seed uses legacy Subversion form value", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/legacy-localhost.mjs"), "utf8");

  assert.match(source, /name: "svnplayground"[\s\S]*vcs: "Subversion"/u);
});

test("legacy-localhost package scripts expose parity content wrappers", () => {
  const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

  assert.equal(
    packageJson.scripts["legacy:localhost:seed-content"],
    "node scripts/legacy-localhost.mjs seed-parity-content --instance parity --port 9000",
  );
  assert.equal(
    packageJson.scripts["legacy:localhost:seed-content:parity"],
    "node scripts/legacy-localhost.mjs seed-parity-content --instance parity --port 9000",
  );
  assert.equal(
    packageJson.scripts["legacy:localhost:seed-content:sidecar"],
    "node scripts/legacy-localhost.mjs seed-parity-content --instance default --port 19100",
  );
});

test("legacy-localhost JaCoCo config is disabled unless explicitly enabled", () => {
  assert.equal(resolveLegacyJacocoConfig({}), null);
  assert.equal(resolveLegacyJacocoConfig({ YONA_LEGACY_JACOCO: "0" }), null);
});

test("legacy-localhost prefers the executable runtime JaCoCo agent", () => {
  const runtimeAgent = resolve(repoRoot, ".agent/legacy-jacoco/jacocoagent-runtime.jar");
  const libraryAgent = resolve(repoRoot, ".agent/legacy-jacoco/jacocoagent.jar");
  const config = resolveLegacyJacocoConfig({ YONA_LEGACY_JACOCO: "1" });
  assert.equal(config.agentPath, existsSync(runtimeAgent) ? runtimeAgent : libraryAgent);
});

test("legacy-localhost JaCoCo config produces exactly one launcher argument", () => {
  const directory = mkdtempSync(join(tmpdir(), "legacy-jacoco-agent-"));
  const agent = join(directory, "jacocoagent.jar");
  try {
    writeFileSync(agent, "test agent");
    const config = resolveLegacyJacocoConfig({
      YONA_LEGACY_JACOCO: "1",
      YONA_LEGACY_JACOCO_AGENT: agent,
      YONA_LEGACY_JACOCO_DESTFILE: join(directory, "yona.exec"),
    });
    assert.equal(
      buildLegacyJacocoLauncherArg(config),
      `-J-javaagent:${agent}=destfile=${join(directory, "yona.exec")},append=false`,
    );
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("legacy-localhost JaCoCo config honors agent and destination overrides", () => {
  const directory = mkdtempSync(join(tmpdir(), "legacy-jacoco-overrides-"));
  const agent = join(directory, "custom-agent.jar");
  const destination = join(directory, "coverage", "custom.exec");
  try {
    writeFileSync(agent, "test agent");
    const config = resolveLegacyJacocoConfig({
      YONA_LEGACY_JACOCO: "1",
      YONA_LEGACY_JACOCO_AGENT: agent,
      YONA_LEGACY_JACOCO_DESTFILE: destination,
    });
    assert.equal(config.agentPath, agent);
    assert.equal(config.destfile, destination);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("legacy-localhost JaCoCo classdump is opt-in and included in launcher args", () => {
  const directory = mkdtempSync(join(tmpdir(), "legacy-jacoco-classdump-"));
  const agent = join(directory, "jacocoagent.jar");
  const classdump = join(directory, "runtime-classes");
  try {
    writeFileSync(agent, "test agent");
    const config = resolveLegacyJacocoConfig({
      YONA_LEGACY_JACOCO: "1",
      YONA_LEGACY_JACOCO_AGENT: agent,
      YONA_LEGACY_JACOCO_DESTFILE: join(directory, "yona.exec"),
      YONA_LEGACY_JACOCO_CLASSDUMP_DIR: classdump,
    });
    assert.equal(config.classdumpdir, classdump);
    assert.equal(
      buildLegacyJacocoLauncherArg(config),
      `-J-javaagent:${agent}=destfile=${join(directory, "yona.exec")},append=false,classdumpdir=${classdump}`,
    );
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("legacy-localhost disabled JaCoCo path does not inspect classdump configuration", () => {
  assert.equal(resolveLegacyJacocoConfig({
    YONA_LEGACY_JACOCO: "0",
    YONA_LEGACY_JACOCO_CLASSDUMP_DIR: "",
  }), null);
});

test("legacy-localhost JaCoCo config rejects missing and non-file agents", () => {
  const directory = mkdtempSync(join(tmpdir(), "legacy-jacoco-errors-"));
  try {
    assert.throws(
      () => resolveLegacyJacocoConfig({
        YONA_LEGACY_JACOCO: "1",
        YONA_LEGACY_JACOCO_AGENT: join(directory, "missing.jar"),
      }),
      /JaCoCo agent not found/u,
    );
    const nonFile = join(directory, "agent-directory");
    mkdirSync(nonFile);
    assert.throws(
      () => resolveLegacyJacocoConfig({
        YONA_LEGACY_JACOCO: "1",
        YONA_LEGACY_JACOCO_AGENT: nonFile,
      }),
      /JaCoCo agent path is not a regular file/u,
    );
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("legacy-localhost classifies secret bootstrap states for live localhost adoption", () => {
  const active = classifySecretBootstrapResponse({
    body: `
      <form>
        <input id="loginId">
        <input id="password">
        <input id="retypedPassword">
      </form>
    `,
    status: 200,
  });
  assert.equal(active.active, true);
  assert.equal(active.complete, false);
  assert.equal(active.restartPending, false);

  const restartPending = classifySecretBootstrapResponse({
    body: "<div class='secret-box'>Server needs to be restarted</div>",
    status: 200,
  });
  assert.equal(restartPending.active, false);
  assert.equal(restartPending.complete, true);
  assert.equal(restartPending.restartPending, true);

  const complete = classifySecretBootstrapResponse({
    body: "<title>User exists not</title>",
    status: 404,
  });
  assert.equal(complete.active, false);
  assert.equal(complete.complete, true);
  assert.equal(complete.restartPending, false);
});

test("legacy-localhost only treats matching install or data paths as harness-managed pids", () => {
  const layout = {
    dataDir: "/Users/example/repo/.agent/legacy-localhost/instances/parity/data",
    installDir: "/Users/example/repo/.agent/legacy-localhost/dist/yona-h2-v1.16.0/yona-1.16.0",
  };

  assert.equal(
    commandMatchesLayout(
      "/Users/example/repo/.agent/legacy-localhost/jdks/zulu8/bin/java -Dyona.data=/Users/example/repo/.agent/legacy-localhost/instances/parity/data -Dapplication.home=/Users/example/repo/.agent/legacy-localhost/instances/parity/data",
      layout,
    ),
    true,
  );
  assert.equal(
    commandMatchesLayout(
      "/private/tmp/yona-legacy-local/runtime/jdk8/bin/java -Dyona.data=/private/tmp/yona-legacy-local/data",
      layout,
    ),
    false,
  );
});

test("legacy-localhost requires the managed pid to match the requested port", () => {
  assert.equal(
    commandMatchesPort("/usr/bin/java -Dhttp.port=9000 -Dyona.data=/tmp/yona", 9000),
    true,
  );
  assert.equal(
    commandMatchesPort("/usr/bin/java -Dhttp.port=19100 -Dyona.data=/tmp/yona", 9000),
    false,
  );
});

test("legacy-localhost rewrites H2 config to keep the DB open at VM shutdown", () => {
  const rewritten = rewriteApplicationConf(
    ' db.default.url="jdbc:h2:file:/tmp/yona;MODE=PostgreSQL;MV_STORE=FALSE;AUTO_SERVER=TRUE"\n',
    {
      dbDir: "/Users/example/repo/.agent/legacy-localhost/instances/default/data/db",
    },
  );

  assert.match(
    rewritten,
    /jdbc:h2:file:\/Users\/example\/repo\/\.agent\/legacy-localhost\/instances\/default\/data\/db\/yona;MODE=PostgreSQL;MV_STORE=FALSE;AUTO_SERVER=TRUE;DB_CLOSE_ON_EXIT=FALSE/u,
  );
});

test("legacy-localhost preserves an existing rotated application secret on force-config rewrites", () => {
  const rewritten = rewriteApplicationConf(
    'application.secret="default-secret"\n db.default.url="jdbc:h2:file:/tmp/yona;MODE=PostgreSQL"\n',
    {
      dbDir: "/Users/example/repo/.agent/legacy-localhost/instances/default/data/db",
    },
    'application.secret="rotated-secret"\n db.default.url="jdbc:h2:file:/old/yona;MODE=PostgreSQL"\n',
  );

  assert.match(rewritten, /application\.secret="rotated-secret"/u);
  assert.match(
    rewritten,
    /jdbc:h2:file:\/Users\/example\/repo\/\.agent\/legacy-localhost\/instances\/default\/data\/db\/yona;MODE=PostgreSQL;DB_CLOSE_ON_EXIT=FALSE/u,
  );
});
