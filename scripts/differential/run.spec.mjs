import { strict as assert } from "node:assert";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  alignParityLabelSeeds,
  alignParityBoardFixtures,
  allocateLoopbackPort,
  assertLoopbackPortAvailable,
  PARITY_POST_COMMENT,
  PARITY_LABEL_SEEDS,
  executeStep,
  buildLegacySequenceReconciliationSql,
  LEGACY_MODEL_SEQUENCE_TABLES,
  LEGACY_ORPHAN_PROJECT_MEMBERSHIP_CLEANUP_SQL,
  legacyH2Url,
  legacyUtcTimestampColumn,
  parseArgs,
  selectScenarios,
  PARITY_PULL_REQUEST,
  registrationStatusIsUsable,
  reconcileYoramFixturesPreboot,
  runtimeVerifiedBehaviorIds,
  waitForYoramProcess,
  renderSkeleton,
  ROUTE_CONTENT_READY,
  PULL_REQUEST_DETAIL_SETTLED,
  PULL_REQUEST_FORM_SETTLED,
  stepHelpers,
  SKELETON_EXTRACT,
  ensureDiffableRepoBranches,
} from "./run.mjs";
import { parityProjectSeed } from "../run-dev-backend-once.mjs";
import { diffSkeletons, domVisibleLoss } from "./diff.mjs";
import { HarnessError, classifyViolation, summarizeExecution } from "./report.mjs";
import { ACTION_DEFINITIONS } from "./scenarios/index.mjs";
import { buildBehaviorVerification, validateScenarios } from "./dsl.mjs";
import { launchWtrBrowser } from "../wtr-browser.mjs";
import { h2JarPath } from "./db-projection.mjs";
import { LegacySession, YoramSession } from "./adapters.mjs";

test("differential runner keeps all scenarios by default", () => {
  const options = parseArgs([]);
  const selected = selectScenarios(options.scenarioIds);
  assert.equal(options.scenarioIds.length, 0);
  assert.equal(selected.length, 117);
});

test("differential runner accepts repeated and comma-separated scenario IDs", () => {
  const options = parseArgs([
    "--scenario",
    "S1-login",
    "--scenarios",
    "I1-issue-detail,R1-pr-lists,P1-issue-labels",
  ]);
  assert.deepEqual(options.scenarioIds, [
    "S1-login",
    "I1-issue-detail",
    "R1-pr-lists",
    "P1-issue-labels",
  ]);
  assert.deepEqual(
    selectScenarios(options.scenarioIds).map(({ id }) => id),
    ["I1-issue-detail", "P1-issue-labels", "R1-pr-lists", "S1-login"],
  );
});

test("differential runner rejects unknown scenario IDs", () => {
  assert.throws(() => selectScenarios(["does-not-exist"]), /unknown scenario id/u);
});

for (const captureFails of [false, true]) {
  test(`legacy test bootstrap restores Git/SVN data when capture ${captureFails ? "fails" : "succeeds"}`, async (t) => {
    const directory = mkdtempSync(path.join(tmpdir(), "yona-init-isolation-"));
    const root = path.join(directory, "repo");
    const gitHead = path.join(root, "git/admin/sample.git/HEAD");
    const svnRevision = path.join(root, "svn/admin/sample/db/revs/0");
    mkdirSync(path.dirname(gitHead), { recursive: true });
    mkdirSync(path.dirname(svnRevision), { recursive: true });
    writeFileSync(gitHead, "ref: refs/heads/main\n");
    writeFileSync(svnRevision, "retained svn revision");
    t.mock.method(LegacySession.prototype, "request", async () => {
      assert.equal(existsSync(gitHead), false);
      mkdirSync(path.dirname(gitHead), { recursive: true });
      writeFileSync(gitHead, "ref: refs/heads/master\n");
      return { status: 303 };
    });
    t.mock.method(YoramSession.prototype, "request", async () => ({ status: 200 }));
    const context = {
      legacyRepositoryRoot: root,
      options: { legacyUrl: "http://127.0.0.1:9011" },
      yoramBaseUrl: "http://127.0.0.1:19095",
      step: { action: "view-init-page" },
      entry: { errors: [], violations: [] },
      helpers: {
        async renderDomTarget() {
          writeFileSync(path.join(root, "created-by-bootstrap"), "temporary");
          if (captureFails) throw new Error("capture failed");
        },
      },
    };
    try {
      const execution = ACTION_DEFINITIONS["view-init-page"].handler(context);
      if (captureFails) await assert.rejects(execution, /capture failed/);
      else await execution;
      assert.equal(readFileSync(gitHead, "utf8"), "ref: refs/heads/main\n");
      assert.equal(readFileSync(svnRevision, "utf8"), "retained svn revision");
      assert.equal(existsSync(path.join(root, "created-by-bootstrap")), false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}

function listenOnLoopback() {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = createServer();
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => resolvePromise(server));
  });
}

test("default Yoram port allocation avoids an unrelated loopback server", async () => {
  const unrelatedServer = await listenOnLoopback();
  try {
    const occupiedPort = unrelatedServer.address().port;
    const allocatedPort = await allocateLoopbackPort();
    assert.notEqual(allocatedPort, occupiedPort);
    await assert.doesNotReject(assertLoopbackPortAvailable(allocatedPort));
  } finally {
    await new Promise((resolvePromise) => unrelatedServer.close(resolvePromise));
  }
});

test("explicit occupied Yoram port fails before a child can start", async () => {
  const unrelatedServer = await listenOnLoopback();
  try {
    const occupiedPort = unrelatedServer.address().port;
    await assert.rejects(
      assertLoopbackPortAvailable(occupiedPort),
      /Yoram loopback port \d+ is already in use; stop the existing server or omit --yoram-port/u,
    );
  } finally {
    await new Promise((resolvePromise) => unrelatedServer.close(resolvePromise));
  }
});

test("Yoram readiness rejects a dead child even when an HTTP server is available", async () => {
  const child = { exitCode: 1, signalCode: null };
  await assert.rejects(
    waitForYoramProcess(child, 31_001, 0, 1),
    /Yoram process exited before listening on 127\.0\.0\.1:31001/u,
  );
});

test("parity fixture identity alignment preserves projects and issue/PR references without history projects", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "yona-parity-identities-"));
  const databasePath = path.join(directory, "yoram.db");
  const database = new DatabaseSync(databasePath);
  const legacyCreatedDates = [
    ["user:admin", "2012-10-31 23:00:00.000"],
    ["user:alice", "2026-09-18 18:25:17.699"],
    ["user:bob", "2026-09-18 18:25:18.123"],
    ["user:carol", "2026-09-18 18:25:19.456"],
    ["project:admin/sample", "2026-09-18 18:26:00.001"],
    ["project:admin/svnplayground", "2026-09-18 18:26:01.002"],
    ["project:alice/sample", "2026-09-18 18:26:02.003"],
    ["project:weblabs/portal", "2026-09-18 18:26:03.004"],
    ["organization:weblabs", "2026-09-18 18:25:59.999"],
  ];
  const legacyProjectWatches = [
    ["admin", "admin", "svnplayground"],
    ["alice", "alice", "sample"],
    ["admin", "weblabs", "portal"],
    ["carol", "weblabs", "portal"],
    ["admin", "admin", "sample"],
  ];
  const reconcile = (dates = legacyCreatedDates) =>
    reconcileYoramFixturesPreboot(databasePath, dates, legacyProjectWatches);
  try {
    database.exec(`
      pragma foreign_keys = on;
      create table n4user (
        id integer primary key, login_id text, name text, email text,
        state text, english_name text, lang text, created_date text
      );
      insert into n4user (id, login_id, state) values
        (1, 'admin', 'active'), (2, 'alice', 'active'),
        (3, 'bob', 'active'), (4, 'carol', 'active');
      insert into n4user (id, login_id, state, created_date)
        values (9, 'unrelated', 'deleted', '2020-01-02 03:04:05.006');
      update n4user set created_date = '2026-09-18 18:33:17.699' where id <> 9;
      create table attachment (container_type text, owner_login_id text);
      create table organization (id integer primary key, name text, created text, descr text);
      create table role (id integer primary key, name text, active integer);
      insert into role values (11, 'manager', 1), (12, 'member', 1), (13, 'sitemanager', 1),
        (16, 'org_admin', 1), (17, 'org_member', 1);
      create table organization_user (user_id integer, organization_id integer, role_id integer);
      insert into organization values (1, 'weblabs', null, null);
      insert into organization values (9, 'unrelated', '2020-02-03 04:05:06.007', 'Keep me');
      insert into organization_user values (1, 1, 17), (4, 1, 16);
      create table project (
        id integer primary key, name text, overview text, vcs text, owner text,
        created_date text, last_issue_number integer, last_posting_number integer,
        default_reviewer_count integer, is_using_reviewer_count integer,
        project_scope text, is_code_accessible_member_only integer,
        original_project_id integer references project(id),
        last_pushed_date text, organization_id integer, previous_owner_login_id text,
        previous_name text, previous_name_changed_time integer,
        unique (owner, name)
      );
      insert into project (id, owner, name, last_issue_number, project_scope) values
        (1, 'pilot', 'yona', 1, 'public'), (2, 'admin', 'sample', 7, 'public'),
        (8, 'alice', 'sample', 3, 'public'), (9, 'unrelated', 'keep-me', 12, 'public');
      update project set overview = 'Yona project', last_posting_number = 0,
        default_reviewer_count = 1, is_using_reviewer_count = 0,
        is_code_accessible_member_only = 0 where id = 1;
      update project set original_project_id = 2 where id = 8;
      update project set created_date = '2020-03-04 05:06:07.008' where id = 9;
      create table project_user (
        user_id integer references n4user(id), project_id integer references project(id),
        role_id integer references role(id)
      );
      create table issue (
        id integer primary key autoincrement, project_id integer references project(id),
        number integer, title text, body text, created_date text, updated_date text,
        author_id integer, author_login_id text, author_name text, num_of_comments integer,
        state integer, due_date text, milestone_id integer, assignee_id integer, history text,
        parent_id integer, weight integer, updated_by_author_id integer, is_draft integer,
        unique (project_id, number)
      );
      insert into issue (id, project_id, number, title) values
        (1, 1, 1, 'Pilot issue'), (2, 2, 1, 'Original sample issue'),
        (3, 8, 1, 'Alice issue'), (4, 9, 1, 'Unrelated issue');
      update issue set num_of_comments = 0, state = 0, weight = 0, is_draft = 0 where id = 1;
      insert into issue (id, project_id, number, title) values (70, 9, 2, 'Deleted real issue');
      delete from issue where id = 70;
      update issue set created_date = '2020-04-05 06:07:08.009' where id <> 1;
      create table pull_request (
        id integer primary key, from_project_id integer references project(id),
        to_project_id integer references project(id), title text
      );
      insert into pull_request values (1, 8, 2, 'Original pull request'), (2, 2, 8, 'Reverse pull request');
      create table watch (id integer primary key, user_id integer, resource_type text, resource_id text);
      insert into watch values (1, 1, 'PROJECT', '2'), (2, 1, 'ISSUE', '2'),
        (3, 9, 'PROJECT', '9');
    `);
    const pilotProject = database.prepare("select * from project where id = 1").get();
    const pilotIssue = database.prepare("select * from issue where id = 1").get();
    const unrelatedUser = database.prepare("select * from n4user where id = 9").get();
    const unrelatedProject = database.prepare("select * from project where id = 9").get();
    const unrelatedOrganization = database.prepare("select * from organization where id = 9").get();
    const unrelatedIssue = database.prepare("select * from issue where id = 4").get();
    for (const dates of [
      legacyCreatedDates.slice(1),
      [...legacyCreatedDates, legacyCreatedDates[0]],
      legacyCreatedDates.map(([key, created]) => [key, key === "user:admin" ? "" : created]),
    ]) {
      assert.throws(() => reconcile(dates), /legacy parity creation/u);
      assert.deepEqual(database.prepare("select * from project where id = 1").get(), pilotProject);
      assert.equal(database.prepare("select name from n4user where id = 1").get().name, null);
    }
    for (const mutation of [
      "delete from n4user where login_id = 'bob'",
      "insert into n4user (id, login_id) values (10, 'bob')",
    ]) {
      database.exec("begin");
      database.exec(mutation);
      database.exec("commit");
      assert.throws(() => reconcile(), /parity user bob expected one row/u);
      assert.deepEqual(database.prepare("select * from project where id = 1").get(), pilotProject);
      database.exec("delete from n4user where login_id = 'bob'");
      database.exec("insert into n4user (id, login_id, state) values (3, 'bob', 'active')");
    }
    const numericRepository = path.join(directory, "repo", "2.git");
    mkdirSync(numericRepository, { recursive: true });
    writeFileSync(path.join(numericRepository, "HEAD"), "ref: refs/heads/retained\n");
    const before = database.prepare("select * from project order by id").all();
    assert.throws(() => reconcile(), /fresh output directory/u);
    assert.deepEqual(database.prepare("select * from project order by id").all(), before);
    assert.equal(
      readFileSync(path.join(numericRepository, "HEAD"), "utf8"),
      "ref: refs/heads/retained\n",
    );
    rmSync(numericRepository, { recursive: true });
    const untouchedIssues = database.prepare("select * from issue order by id").all();
    database.exec("update issue set body = 'User-authored content' where id = 1");
    assert.throws(() => reconcile(), /fresh output directory/u);
    assert.equal(
      database.prepare("select body from issue where id = 1").get().body,
      "User-authored content",
    );
    database.exec("update issue set body = null where id = 1");
    database.exec(
      "insert into watch (user_id, resource_type, resource_id) values (1, 'ISSUE', '1')",
    );
    assert.throws(() => reconcile(), /fresh output directory/u);
    assert.deepEqual(database.prepare("select * from issue order by id").all(), untouchedIssues);
    database.exec("delete from watch where resource_type = 'ISSUE' and resource_id = '1'");

    reconcile();
    reconcile();

    const rows = (sql) =>
      database
        .prepare(sql)
        .all()
        .map((row) => ({ ...row }));
    assert.deepEqual(rows("select id, owner, name, project_scope from project order by id"), [
      { id: 1, owner: "admin", name: "sample", project_scope: "public" },
      { id: 2, owner: "admin", name: "svnplayground", project_scope: "public" },
      { id: 3, owner: "alice", name: "sample", project_scope: "public" },
      { id: 4, owner: "weblabs", name: "portal", project_scope: "protected" },
      { id: 9, owner: "unrelated", name: "keep-me", project_scope: "public" },
    ]);
    assert.deepEqual(rows("select id, project_id, title from issue order by id"), [
      { id: 2, project_id: 1, title: "Original sample issue" },
      { id: 3, project_id: 3, title: "Alice issue" },
      { id: 4, project_id: 9, title: "Unrelated issue" },
    ]);
    assert.deepEqual(rows("select * from pull_request order by id"), [
      { id: 1, from_project_id: 3, to_project_id: 1, title: "Original pull request" },
      { id: 2, from_project_id: 1, to_project_id: 3, title: "Reverse pull request" },
    ]);
    assert.equal(
      database.prepare("select last_issue_number from project where id = 1").get()
        .last_issue_number,
      7,
    );
    assert.equal(
      database.prepare("select original_project_id from project where id = 3").get()
        .original_project_id,
      1,
    );
    assert.deepEqual(rows("select resource_id from watch where resource_type = 'ISSUE'"), [
      { resource_id: "2" },
    ]);
    assert.deepEqual(
      rows(`
        select u.login_id, p.owner, p.name from watch w
        join n4user u on u.id = w.user_id
        join project p on cast(p.id as text) = w.resource_id
        where w.resource_type = 'PROJECT' order by w.id
      `).map(({ login_id, owner, name }) => [login_id, owner, name]),
      [["unrelated", "unrelated", "keep-me"], ...legacyProjectWatches],
    );
    assert.equal(
      database
        .prepare("select count(distinct project_id) as n from project_user where user_id = 1")
        .get().n,
      4,
    );
    assert.equal(
      database.prepare("select organization_id from project where id = 4").get().organization_id,
      1,
    );
    assert.deepEqual(
      rows(`
      select p.owner, p.name, u.login_id, r.name as role
      from project_user pu join project p on p.id = pu.project_id
      join n4user u on u.id = pu.user_id join role r on r.id = pu.role_id
      order by p.id, u.login_id
    `),
      [
        { owner: "admin", name: "sample", login_id: "admin", role: "manager" },
        { owner: "admin", name: "svnplayground", login_id: "admin", role: "manager" },
        { owner: "alice", name: "sample", login_id: "admin", role: "sitemanager" },
        { owner: "alice", name: "sample", login_id: "alice", role: "manager" },
        { owner: "weblabs", name: "portal", login_id: "admin", role: "manager" },
        { owner: "weblabs", name: "portal", login_id: "carol", role: "member" },
      ],
    );
    assert.deepEqual(
      rows(`
      select u.login_id, r.name as role from organization_user ou
      join n4user u on u.id = ou.user_id join role r on r.id = ou.role_id
      where ou.organization_id = 1 order by u.login_id
    `),
      [
        { login_id: "admin", role: "org_admin" },
        { login_id: "carol", role: "org_member" },
      ],
    );
    assert.deepEqual(
      rows(`
        select 'user:' || login_id as fixture, created_date as created from n4user where id <> 9
        union all select 'project:' || owner || '/' || name, created_date from project where id <> 9
        union all select 'organization:' || name, created from organization where id <> 9
        order by fixture
      `),
      legacyCreatedDates
        .map(([fixture, created]) => ({ fixture, created }))
        .sort((a, b) => a.fixture.localeCompare(b.fixture)),
    );
    assert.deepEqual(database.prepare("select * from n4user where id = 9").get(), unrelatedUser);
    assert.deepEqual(
      database.prepare("select * from project where id = 9").get(),
      unrelatedProject,
    );
    assert.deepEqual(
      database.prepare("select * from organization where id = 9").get(),
      unrelatedOrganization,
    );
    assert.deepEqual(database.prepare("select * from issue where id = 4").get(), unrelatedIssue);
    assert.equal(
      database
        .prepare("insert into issue (project_id, number, title) values (9, 2, 'Runtime issue')")
        .run().lastInsertRowid,
      71,
    );
    assert.deepEqual(rows("pragma foreign_key_check"), []);

    for (const staleProject of [
      "insert into project (id, owner, name) values (1000, 'admin', 'sample-history-1000')",
      "update project set owner = 'unrelated', name = 'do-not-replace' where id = 1",
    ]) {
      database.exec("begin");
      database.exec(staleProject);
      database.exec("commit");
      const before = rows("select * from project order by id");
      assert.throws(() => reconcile(), /fresh output directory/u);
      assert.deepEqual(rows("select * from project order by id"), before);
      database.exec("delete from project where id = 1000");
    }

    // Reuse the same schema to exercise the fresh pilot-only database, without
    // deleting a real issue sequence while testing the nonempty case above.
    database.exec(`
      delete from pull_request; delete from watch; delete from project_user;
      delete from organization_user where organization_id = 1;
      delete from organization where id = 1;
      delete from issue; delete from project;
    `);
    for (const [table, row] of [
      ["project", pilotProject],
      ["issue", pilotIssue],
    ]) {
      const columns = Object.keys(row);
      database
        .prepare(
          `insert into ${table} (${columns.join(", ")}) values (${columns.map(() => "?").join(", ")})`,
        )
        .run(...Object.values(row));
    }
    reconcile();
    assert.equal(
      database.prepare("select created from organization where name = 'weblabs'").get().created,
      "2026-09-18 18:25:59.999",
    );
    assert.equal(
      database
        .prepare("insert into issue (project_id, number, title) values (1, 1, 'First real issue')")
        .run().lastInsertRowid,
      1,
    );
  } finally {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("parity repository alignment mirrors canonical trees and commit messages", () => {
  const root = mkdtempSync(path.join(tmpdir(), "yona-parity-repo-"));
  const repoPath = path.join(root, "sample.git");
  const runGit = (args) => {
    const result = spawnSync("git", ["--git-dir", repoPath, ...args], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const runGitRaw = (args) => {
    const result = spawnSync("git", ["--git-dir", repoPath, ...args], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  try {
    const init = spawnSync("git", ["init", "--bare", repoPath], { encoding: "utf8" });
    assert.equal(init.status, 0, init.stderr);
    ensureDiffableRepoBranches(repoPath);
    const seed = parityProjectSeed.repositories.find(
      (repository) => repository.owner === "admin" && repository.projectName === "sample",
    );
    assert.ok(seed);
    const main = seed.branches.find((branch) => branch.name === "main");
    const feature = seed.branches.find((branch) => branch.name === "feature/ui");
    assert.ok(main);
    assert.ok(feature);
    const featureFiles = { ...main.files, ...feature.files };
    assert.deepEqual(
      runGit(["ls-tree", "-r", "--name-only", "main"]).split("\n"),
      Object.keys(main.files).sort(),
    );
    assert.deepEqual(
      runGit(["ls-tree", "-r", "--name-only", "feature/ui"]).split("\n"),
      Object.keys(featureFiles).sort(),
    );
    for (const [branch, files] of [
      ["main", main.files],
      ["feature/ui", featureFiles],
    ]) {
      for (const [filePath, contents] of Object.entries(files)) {
        assert.equal(runGitRaw(["show", `${branch}:${filePath}`]), contents);
      }
    }
    assert.equal(runGit(["show", "-s", "--format=%s", "main"]), main.message);
    assert.equal(runGit(["show", "-s", "--format=%s", "feature/ui"]), feature.message);
    assert.notEqual(runGit(["rev-parse", "main"]), runGit(["rev-parse", "feature/ui"]));
    // Legacy branch association compares the stored PR source to the full ref.
    const branchRefs = runGit(["for-each-ref", "--format=%(refname)", "refs/heads"]).split("\n");
    assert.ok(branchRefs.includes(PARITY_PULL_REQUEST.fromBranch));
    assert.ok(branchRefs.includes(PARITY_PULL_REQUEST.toBranch));
    assert.equal(
      runGit(["merge-base", PARITY_PULL_REQUEST.toBranch, PARITY_PULL_REQUEST.fromBranch]),
      runGit(["rev-parse", PARITY_PULL_REQUEST.toBranch]),
    );
    assert.equal(
      runGit([
        "rev-list",
        "--count",
        `${PARITY_PULL_REQUEST.toBranch}..${PARITY_PULL_REQUEST.fromBranch}`,
      ]),
      "1",
    );
    for (const scenario of ["r13", "r16"]) {
      assert.equal(runGit(["rev-list", "--count", `${scenario}-target..${scenario}-source`]), "1");
    }
    runGit(["update-ref", "refs/heads/r13-target", runGit(["rev-parse", "r13-source"])]);
    assert.equal(runGit(["rev-list", "--count", "r16-target..r16-source"]), "1");
    assert.equal(runGit(["rev-list", "--count", "main..feature/ui"]), "1");
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

function skeletonElement(
  tagName,
  { id = "", className = "", text = "", children = [], attrs = {}, rendered = true } = {},
) {
  const attributes = new Map(Object.entries({ ...attrs, ...(id ? { id } : {}) }));
  return {
    tagName: tagName.toUpperCase(),
    className,
    childNodes: text ? [{ nodeType: 3, textContent: text }] : [],
    children,
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
    checkVisibility() {
      return rendered;
    },
  };
}

function extractTestSkeleton(root, selector) {
  const previousDocument = globalThis.document;
  const previousGetComputedStyle = globalThis.getComputedStyle;
  globalThis.getComputedStyle = () => ({
    display: "block",
    visibility: "visible",
    opacity: "1",
    position: "static",
    clip: "auto",
  });
  globalThis.document = {
    body: root,
    querySelector: () => root,
  };
  try {
    return SKELETON_EXTRACT(selector);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousGetComputedStyle === undefined) delete globalThis.getComputedStyle;
    else globalThis.getComputedStyle = previousGetComputedStyle;
  }
}

test("skeleton extraction distinguishes navigation from side-effect anchors", () => {
  const body = skeletonElement("body", {
    children: [
      skeletonElement("a", { text: "Open", attrs: { href: "/issue/1", "data-toggle": "tooltip" } }),
      skeletonElement("a", {
        text: "Delete",
        attrs: { href: "/issue/1", "data-request-method": "delete" },
      }),
      skeletonElement("a", {
        text: "Update",
        attrs: { href: "/issue/1", "data-request-uri": "/issue/1/update" },
      }),
      skeletonElement("a", { text: "Comment", attrs: { href: "#comment-1" } }),
      skeletonElement("a", { text: "Action", attrs: { href: "#" } }),
      skeletonElement("a", {
        text: "Expand",
        attrs: { href: "#details", "data-toggle": "collapse" },
      }),
    ],
  });
  assert.deepEqual(extractTestSkeleton(body), [
    "a:Open",
    "a#:Delete",
    "a#:Update",
    "a:Comment",
    "a#:Action",
    "a#:Expand",
  ]);
});

test("rendered skeleton keeps open controls and scrollable content, not hidden backing DOM", async () => {
  const browser = await launchWtrBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <style>${readFileSync(new URL("../../frontend/public/legacy-assets/javascripts/lib/select2/select2.css", import.meta.url), "utf8")}</style>
      <div id="yobiDialog" class="modal" aria-hidden="false" style="display:none">
        <button>Confirm</button>
      </div>
      <div id="help" class="markdown-help" style="display:none">
        <button>Header</button><pre>Hidden syntax</pre>
      </div>
      <div id="choice" class="select2-container">
        <a class="select2-choice" href="#"><span class="select2-chosen">main</span>
          <abbr class="select2-search-choice-close"></abbr>
        </a>
      </div>
      <input class="select2-focusser select2-offscreen">
      <select class="select2-offscreen"><option>refs/heads/main</option></select>
      <div id="dropdown" class="select2-drop select2-display-none">
        <input class="select2-input"><div class="select2-result-label">feature/ui</div>
      </div>
      <div class="select2-container-multi"><ul class="select2-choices">
        <li class="select2-search-choice"><span>Selected label</span>
          <a class="select2-search-choice-close" href="#"></a>
        </li>
      </ul></div>
      <div style="opacity:0"><button>Transparent control</button></div>
      <div style="visibility:hidden"><button>Invisible control</button>
        <button style="visibility:visible">Visible override</button>
      </div>
      <div style="display:contents"><button>Contents child</button></div>
      <select id="native"><option>Visible selection</option><option>Other selection</option></select>
      <button style="position:absolute;top:3000px">Below fold</button>
      <div style="height:20px;overflow:auto"><button style="margin-top:500px">Scrollable control</button></div>
      <div style="position:absolute;clip:rect(0px,0px,0px,0px)">
        <button id="clipped-child">Clipped control</button>
      </div>
      <div id="collapsed-flow" style="height:0;overflow:hidden">
        <button id="clipped-flow-child">Collapsed help</button>
      </div>
      <div style="height:0;overflow:hidden">
        <button style="position:fixed;left:0;top:0">Escaped fixed control</button>
      </div>
    `);
    const closed = await page.evaluate(SKELETON_EXTRACT);
    assert.deepEqual(await page.evaluate(SKELETON_EXTRACT, "#help"), []);
    assert.deepEqual(await page.evaluate(SKELETON_EXTRACT, "#yobiDialog"), []);
    assert.deepEqual(await page.evaluate(SKELETON_EXTRACT, "#clipped-child"), []);
    assert.deepEqual(await page.evaluate(SKELETON_EXTRACT, "#clipped-flow-child"), []);
    for (const entry of [
      "button:Confirm",
      "button:Header",
      "pre:Hidden syntax",
      "abbr.select2-search-choice-close:",
      "input.select2-focusser.select2-offscreen:",
      "select.select2-offscreen:",
      "option:refs/heads/main",
      "input.select2-input:",
      "div.select2-result-label:feature/ui",
      "button:Transparent control",
      "button:Invisible control",
      "button:Clipped control",
      "button:Collapsed help",
      "option:Other selection",
    ])
      assert.equal(closed.includes(entry), false, entry);
    for (const entry of [
      "span.select2-chosen:main",
      "span:Selected label",
      "a#.select2-search-choice-close:",
      "button:Visible override",
      "button:Contents child",
      "button:Below fold",
      "button:Scrollable control",
      "button:Escaped fixed control",
      "select:Visible selection",
    ])
      assert.ok(closed.includes(entry), entry);

    await page.evaluate(() => {
      document.querySelector("#help").style.display = "block";
      document.querySelector("#yobiDialog").style.display = "block";
      document.querySelector("#yobiDialog").setAttribute("aria-hidden", "true");
      document.querySelector("#dropdown").classList.remove("select2-display-none");
      document.querySelector("#choice").classList.add("select2-allowclear");
      document.querySelector("#native").selectedIndex = 1;
      document.querySelector("#collapsed-flow").style.height = "auto";
    });
    const open = await page.evaluate(SKELETON_EXTRACT);
    for (const entry of [
      "button:Confirm",
      "button:Header",
      "pre:Hidden syntax",
      "input.select2-input:",
      "div.select2-result-label:feature/ui",
      "abbr.select2-search-choice-close:",
      "select:Other selection",
      "button:Collapsed help",
    ])
      assert.ok(open.includes(entry), entry);
    assert.ok(
      diffSkeletons(closed, open).some(
        (diff) => diff.side === "yoram-only" && diff.actual === "button:Header",
      ),
    );
    await page.evaluate(() => document.querySelector(".select2-search-choice a").remove());
    assert.ok(
      diffSkeletons(open, await page.evaluate(SKELETON_EXTRACT)).some(
        (diff) =>
          diff.side === "legacy-only" && diff.expected === "button.select2-search-choice-close:",
      ),
    );
  } finally {
    await browser.close();
  }
});

test("generic skeleton extraction excludes only the exact global shell IDs", () => {
  const sidebar = skeletonElement("div", {
    id: "mySidenav",
    className: "excluded-sidenav",
    text: "Sidebar must be shell-owned",
    children: [
      skeletonElement("button", { className: "excluded-control", text: "Hidden control" }),
    ],
  });
  const dialog = skeletonElement("div", {
    id: "loginDialog",
    className: "excluded-dialog",
    text: "Dialog must be shell-owned",
    children: [skeletonElement("input", { className: "excluded-input" })],
  });
  const body = skeletonElement("body", {
    children: [
      skeletonElement("header", { className: "gnb-outer", text: "Navbar" }),
      sidebar,
      dialog,
      skeletonElement("main", {
        className: "route-body",
        text: "Route content",
        children: [skeletonElement("button", { className: "route-action", text: "Save" })],
      }),
      skeletonElement("div", {
        id: "mySidenav-copy",
        className: "kept-sidenav-copy",
        text: "Near-match sidebar stays in route content",
      }),
      skeletonElement("div", {
        id: "loginDialogExtra",
        className: "kept-dialog-copy",
        text: "Near-match dialog stays in route content",
      }),
      skeletonElement("footer", { className: "page-footer", text: "Footer" }),
    ],
  });

  const skeleton = extractTestSkeleton(body);
  assert.ok(skeleton.includes("header.gnb-outer:Navbar"));
  assert.ok(skeleton.includes("main.route-body:Route content"));
  assert.ok(skeleton.includes("button.route-action:Save"));
  assert.ok(skeleton.includes("footer.page-footer:Footer"));
  assert.ok(skeleton.includes("div.kept-sidenav-copy:Near-match sidebar stays in route content"));
  assert.ok(skeleton.includes("div.kept-dialog-copy:Near-match dialog stays in route content"));
  assert.equal(
    skeleton.some((entry) => entry.includes("excluded-sidenav")),
    false,
  );
  assert.equal(
    skeleton.some((entry) => entry.includes("excluded-control")),
    false,
  );
  assert.equal(
    skeleton.some((entry) => entry.includes("excluded-dialog")),
    false,
  );
  assert.equal(
    skeleton.some((entry) => entry.includes("excluded-input")),
    false,
  );

  const explicitSidebarSkeleton = extractTestSkeleton(sidebar, "#mySidenav");
  const explicitDialogSkeleton = extractTestSkeleton(dialog, "#loginDialog");
  assert.ok(explicitSidebarSkeleton.includes("div.excluded-sidenav:Sidebar must be shell-owned"));
  assert.ok(explicitSidebarSkeleton.includes("button.excluded-control:Hidden control"));
  assert.ok(explicitDialogSkeleton.includes("div.excluded-dialog:Dialog must be shell-owned"));
  assert.ok(explicitDialogSkeleton.includes("input.excluded-input:"));
});

test("generic shell exclusions do not turn route-body losses into accepted diffs", () => {
  const shell = [
    skeletonElement("header", { className: "gnb-outer", text: "Navbar" }),
    skeletonElement("div", { id: "mySidenav", className: "excluded-sidenav", text: "Sidebar" }),
    skeletonElement("div", { id: "loginDialog", className: "excluded-dialog", text: "Dialog" }),
    skeletonElement("footer", { className: "page-footer", text: "Footer" }),
  ];
  const expected = extractTestSkeleton(
    skeletonElement("body", {
      children: [
        ...shell,
        skeletonElement("main", {
          className: "route-body",
          children: [skeletonElement("button", { className: "route-action", text: "Save" })],
        }),
      ],
    }),
  );
  const actual = extractTestSkeleton(
    skeletonElement("body", {
      children: [...shell, skeletonElement("main", { className: "route-body" })],
    }),
  );
  const firstDiffs = diffSkeletons(expected, actual);
  const detail = {
    expected: { skeletonEntries: expected.length },
    actual: { skeletonEntries: actual.length, fullDiffs: firstDiffs, firstDiffs },
  };
  assert.ok(
    firstDiffs.some(
      (diff) => diff.side === "legacy-only" && diff.expected.includes("route-action"),
    ),
  );
  assert.equal(domVisibleLoss(detail), true);
  assert.equal(
    classifyViolation("dom", "/admin/sample/route", detail).classification,
    "UNVERIFIED",
  );
});

test("SPA readiness rejects a progress-only or failed blank route until content settles", async () => {
  const browser = await launchWtrBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <div id="root"><div id="nprogress" aria-hidden="true">
        <div role="presentation" class="bar"><div class="peg"></div></div>
      </div></div>
    `);
    assert.equal(await page.evaluate(ROUTE_CONTENT_READY), false);
    await page.evaluate(() => document.querySelector("#nprogress").remove());
    assert.equal(
      await page.evaluate(ROUTE_CONTENT_READY),
      false,
      "blank failed routes are not ready",
    );
    await page.evaluate(() => {
      document.querySelector("#root").innerHTML =
        '<main class="page-wrap-outer" aria-busy="true"><div data-wireframe>Loading</div></main>';
    });
    assert.equal(await page.evaluate(ROUTE_CONTENT_READY), false);
    await page.evaluate(() => {
      const root = document.querySelector("main");
      root.removeAttribute("aria-busy");
      root.innerHTML = '<form id="issue-form"><input name="title"><button>Create</button></form>';
    });
    assert.equal(await page.evaluate(ROUTE_CONTENT_READY), true);
    assert.equal(await page.evaluate(ROUTE_CONTENT_READY, "#missing"), false);
    await page.evaluate(() => {
      document.querySelector("main").innerHTML = '<p role="alert">Request failed</p>';
    });
    assert.equal(
      await page.evaluate(ROUTE_CONTENT_READY),
      true,
      "settled errors remain observable",
    );
    assert.ok((await page.evaluate(SKELETON_EXTRACT)).includes("p:Request failed"));
    await page.setContent(`
      <div data-owner="framed-site-main">
        <header><form><input name="keyword"><button>Search</button></form><div id="usermenu-tab-content-list">Loading...</div></header>
        <footer>Yoram</footer>
      </div>
    `);
    assert.equal(
      await page.evaluate(ROUTE_CONTENT_READY),
      false,
      "navigation alone is not route content",
    );
    await page.evaluate(() => {
      const content = document.createElement("div");
      content.className = "page full";
      content.innerHTML = '<form><input name="loginIdOrEmail"><button>Login</button></form>';
      document.querySelector("footer").before(content);
    });
    assert.equal(
      await page.evaluate(ROUTE_CONTENT_READY),
      true,
      "site screens need no project-only wrapper",
    );
    await page.setContent('<div id="root"><div class="warning-none">No notifications</div></div>');
    assert.equal(
      await page.evaluate(ROUTE_CONTENT_READY),
      true,
      "settled fragments need no page shell",
    );
    await page.setContent(
      '<div id="status" class="alert">Checking</div><div id="__commits"></div>',
    );
    assert.equal(await page.evaluate(PULL_REQUEST_FORM_SETTLED), false);
    await page.evaluate(() => document.querySelector("#status").classList.add("alert-success"));
    assert.equal(await page.evaluate(PULL_REQUEST_FORM_SETTLED), true);
    await page.evaluate(() => (document.querySelector("#status").className = "alert alert-error"));
    assert.equal(
      await page.evaluate(PULL_REQUEST_FORM_SETTLED),
      true,
      "failed merge checks remain observable",
    );
    await page.evaluate(() => document.querySelector("#status").remove());
    assert.equal(
      await page.evaluate(PULL_REQUEST_FORM_SETTLED),
      true,
      "closed edit forms do not request a merge check",
    );
    await page.setContent(
      '<main data-owner="pull-request-detail-page"><div id="state"><div class="alert-warnning">Checking</div></div><div id="comments"></div></main>',
    );
    assert.equal(await page.evaluate(PULL_REQUEST_DETAIL_SETTLED), false);
    await page.evaluate(() => document.querySelector("#state").replaceChildren());
    assert.equal(
      await page.evaluate(PULL_REQUEST_DETAIL_SETTLED),
      true,
      "settled detail can have no commit events",
    );
    await page.evaluate(() => document.querySelector("#comments").remove());
    assert.equal(await page.evaluate(PULL_REQUEST_DETAIL_SETTLED), false);
  } finally {
    await browser.close();
  }
});

test("SPA readiness failure rejects capture instead of returning a loader skeleton", async () => {
  const failure = new Error("route content readiness timed out");
  await assert.rejects(
    renderSkeleton(
      {
        async goto() {},
        async waitForNetworkIdle() {},
        async waitForFunction() {
          throw failure;
        },
        async evaluate() {
          assert.fail("unsettled route must not be captured");
        },
      },
      "http://yoram.test/user/issues/new",
      { spa: true },
    ),
    (error) => error === failure,
  );
});

test("H2 fixture timestamps preserve the instant across local offsets and DST", () => {
  for (const [timezone, wallClock, expected] of [
    ["Asia/Seoul", "2026-09-19 03:25:17.699", "2026-09-18 18:25:17.699"],
    ["America/New_York", "2026-01-15 12:00:00.123", "2026-01-15 17:00:00.123"],
    ["America/New_York", "2026-07-15 12:00:00.123", "2026-07-15 16:00:00.123"],
  ]) {
    const result = spawnSync(
      "java",
      [
        `-Duser.timezone=${timezone}`,
        "-cp",
        h2JarPath(path.resolve(import.meta.dirname, "../..")),
        "org.h2.tools.Shell",
        "-url",
        "jdbc:h2:mem:parity-timestamps",
        "-user",
        "sa",
        "-password",
        "",
        "-sql",
        `SELECT ${legacyUtcTimestampColumn(`TIMESTAMP '${wallClock}'`)} AS INSTANT`,
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.split("\n")[1]?.trim(), expected);
  }
});

test("legacy live readback observes commits held by the application's H2 connection", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "legacy-live-readback-"));
  const database = path.join(directory, "yona");
  const jar = h2JarPath(path.resolve(import.meta.dirname, "../.."));
  const writer = spawn("java", [
    "-Dh2.bindAddress=127.0.0.1",
    "-cp",
    jar,
    "org.h2.tools.Shell",
    "-url",
    `jdbc:h2:${database};MODE=PostgreSQL;MV_STORE=FALSE;MVCC=FALSE;AUTO_SERVER=TRUE`,
    "-user",
    "sa",
    "-password",
    "",
  ]);
  try {
    await new Promise((resolve, reject) => {
      let output = "";
      const timer = setTimeout(
        () => reject(new Error(`H2 writer did not settle: ${output}`)),
        10_000,
      );
      writer.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      writer.once("exit", () => {
        clearTimeout(timer);
        reject(new Error(`H2 writer exited: ${output}`));
      });
      writer.stdout.on("data", (chunk) => {
        output += chunk;
        if (output.includes("WRITER_READY")) {
          clearTimeout(timer);
          resolve();
        }
      });
      writer.stdin.write(
        [
          "CREATE TABLE live_readback (id INT PRIMARY KEY, body VARCHAR);",
          "INSERT INTO live_readback VALUES (1, 'before');",
          "CHECKPOINT;",
          "UPDATE live_readback SET body = 'after' WHERE id = 1;",
          "SELECT 'WRITER_READY';",
          "",
        ].join("\n"),
      );
    });
    const reader = spawnSync(
      "java",
      [
        "-cp",
        jar,
        "org.h2.tools.Shell",
        "-url",
        legacyH2Url().replace(/^jdbc:h2:[^;]+/u, `jdbc:h2:${database}`),
        "-user",
        "sa",
        "-password",
        "",
        "-sql",
        "SELECT body FROM live_readback WHERE id = 1",
      ],
      { encoding: "utf8", timeout: 10_000 },
    );
    assert.equal(reader.status, 0, reader.stderr);
    assert.equal(reader.stdout.split("\n")[1]?.trim(), "after");
  } finally {
    if (writer.exitCode === null) {
      const exited = new Promise((resolve) => writer.once("exit", resolve));
      writer.kill();
      await exited;
    }
    rmSync(directory, { recursive: true, force: true });
  }
});

test("anonymous DOM renders clear shared cookies before applying fresh sessions", async () => {
  const pages = [];
  const makePage = (side) => {
    const calls = [];
    const page = {
      async cookies() {
        calls.push("cookies");
        return [{ name: `old-${side}`, value: "authenticated" }];
      },
      async deleteCookie(...cookies) {
        calls.push(["deleteCookie", cookies]);
      },
      async setCookie(cookie) {
        calls.push(["setCookie", cookie]);
      },
      async goto() {},
      async evaluate() {
        return [];
      },
    };
    pages.push({ calls, page });
    return page;
  };
  const entry = { behaviorIds: [], violations: [], errors: [] };
  await stepHelpers.renderDomTarget(
    {
      step: { action: "anonymous-page" },
      suffix: "anonymous-page",
      scenarioId: "S2-login-forms",
      entry,
      options: { legacyUrl: "http://legacy.test" },
      yoramBaseUrl: "http://yoram.test",
      legacyPage: makePage("legacy"),
      yoramPage: makePage("yoram"),
      legacySession: { cookies: "OLD=legacy" },
      yoramSession: { cookies: "OLD=yoram" },
    },
    {
      legacy: "http://legacy.test/users/loginform",
      yoram: "http://yoram.test/users/loginform",
      spa: false,
      anonymous: true,
      legacySession: { cookies: "ANON=legacy" },
      yoramSession: { cookies: "ANON=yoram" },
    },
  );
  assert.deepEqual(
    pages.map(({ calls }) => calls),
    [
      [
        "cookies",
        ["deleteCookie", [{ name: "old-legacy", value: "authenticated" }]],
        ["setCookie", { name: "ANON", value: "legacy", url: "http://legacy.test" }],
      ],
      [
        "cookies",
        ["deleteCookie", [{ name: "old-yoram", value: "authenticated" }]],
        ["setCookie", { name: "ANON", value: "yoram", url: "http://yoram.test" }],
      ],
    ],
  );
  assert.deepEqual(entry.violations, []);
  assert.deepEqual(entry.errors, []);
});

test("JSON route helper compares parsed normalized payloads without a DOM render", async () => {
  const entry = { behaviorIds: [], violations: [], errors: [] };
  const ctx = {
    step: { action: "json-probe" },
    entry,
    legacySession: {
      async request() {
        return { status: 200, body: '{"b":2,"a":"x"}', json: null };
      },
    },
    yoramSession: {
      async request() {
        return { status: 200, body: "", json: { a: "x", b: 2 } };
      },
    },
  };
  await stepHelpers.requestJsonBoth(
    ctx,
    { method: "GET", path: "/json" },
    { method: "GET", path: "/json" },
  );
  assert.deepEqual(entry.violations, []);
  assert.deepEqual(entry.errors, []);
});

test("fresh parity account bootstrap reuses an existing account on duplicate registration", () => {
  assert.equal(registrationStatusIsUsable(200), true);
  assert.equal(registrationStatusIsUsable(409), true);
  assert.equal(registrationStatusIsUsable(422), false);
  assert.equal(registrationStatusIsUsable(500), false);
});

test("legacy preboot cleanup removes memberships whose project row was deleted", () => {
  assert.match(LEGACY_ORPHAN_PROJECT_MEMBERSHIP_CLEANUP_SQL, /^DELETE FROM PROJECT_USER /u);
  assert.match(LEGACY_ORPHAN_PROJECT_MEMBERSHIP_CLEANUP_SQL, /NOT EXISTS/u);
  assert.match(
    LEGACY_ORPHAN_PROJECT_MEMBERSHIP_CLEANUP_SQL,
    /PROJECT\.ID = PROJECT_USER\.PROJECT_ID/u,
  );
});

test("parity label alignment seeds canonical legacy tuples into an empty Yoram fixture", async () => {
  const requests = [];
  const responseRows = PARITY_LABEL_SEEDS.map((seed, index) => ({
    category: seed.categoryName,
    categoryId: String(index + 1),
    categoryIsExclusive: false,
    color: seed.color,
    id: String(index + 1),
    name: seed.labelName,
  }));
  const responseBody = (request) =>
    request.method === "GET"
      ? JSON.stringify(responseRows)
      : JSON.stringify(responseRows.find(({ name }) => name === request.form.labelName));
  const aligned = await alignParityLabelSeeds(
    {
      request: async (request) => {
        requests.push(request);
        return { status: request.method === "GET" ? 200 : 201, body: responseBody(request) };
      },
    },
    "",
    [{ name: "parity-label-sweep-live", category: "runtime", color: "#000000", id: 99 }],
  );
  assert.deepEqual(aligned, responseRows);
  assert.deepEqual(
    requests
      .filter(({ method }) => method !== "GET")
      .map(({ method, path, form }) => ({ method, path, form })),
    PARITY_LABEL_SEEDS.map((seed) => ({
      method: "POST",
      path: "/admin/sample/issue/labels",
      form: { labelName: seed.labelName, categoryName: seed.categoryName, labelColor: seed.color },
    })),
  );
  assert.deepEqual(requests.at(-1), { method: "GET", path: "/admin/sample/issue/labels" });
});

test("parity label alignment rejects an unauthorized compat write", async () => {
  await assert.rejects(
    () =>
      alignParityLabelSeeds(
        {
          request: async ({ method }) =>
            method === "GET" ? { status: 200, body: "[]" } : { status: 401, body: "" },
        },
        "",
        [],
      ),
    /parity label create failed: HTTP 401/,
  );
});

test("parity board alignment is idempotent and verifies project watch plus nested comment", async () => {
  const requests = [];
  const comments = [
    {
      id: "1",
      authorLoginId: "alice",
      contentsMarkdown: "Board seed confirmed from the fork contributor side.",
    },
  ];
  const session = {
    request: async (request) => {
      requests.push(request);
      if (request.method === "POST" && request.path.endsWith("/watch")) {
        return { status: 200, json: { watchCount: 1 } };
      }
      if (request.method === "GET" && request.path === "/api/v1/projects/admin/sample/posts/1") {
        return { status: 200, json: { comments: [...comments] } };
      }
      if (request.method === "POST" && request.path.endsWith("/comments")) {
        comments.push({
          id: "2",
          authorLoginId: "admin",
          contentsMarkdown: request.json.contentsMarkdown,
          parentCommentId: request.json.parentCommentId,
        });
        return { status: 201, json: { comments: [...comments] } };
      }
      if (
        request.method === "GET" &&
        request.path === "/api/v1/owners/admin/projects/sample/container"
      ) {
        return { status: 200, json: { isWatching: true } };
      }
      throw new Error(`unexpected request ${request.method} ${request.path}`);
    },
  };

  await alignParityBoardFixtures(session);
  await alignParityBoardFixtures(session);

  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].path, "/api/v1/projects/admin/sample/posts/1");
  assert.equal(
    requests.some(
      ({ method, path }) => method === "POST" && path === "/api/v1/projects/admin/sample/posts",
    ),
    false,
  );
  assert.equal(
    comments.filter((comment) => comment.contentsMarkdown === PARITY_POST_COMMENT).length,
    1,
  );
  assert.deepEqual(
    requests
      .filter(({ method, path }) => method === "POST" && path.endsWith("/comments"))
      .map(({ json }) => json),
    [{ contentsMarkdown: PARITY_POST_COMMENT, parentCommentId: 1 }],
  );
  assert.equal(
    requests.filter(({ method, path }) => method === "POST" && path.endsWith("/watch")).length,
    2,
  );
});

test("parity board alignment creates a missing canonical posting before aligning its comment", async () => {
  const requests = [];
  const comments = [
    {
      id: "1",
      authorLoginId: "alice",
      contentsMarkdown: "Board seed confirmed from the fork contributor side.",
    },
  ];
  let postExists = false;
  const session = {
    request: async (request) => {
      requests.push(request);
      if (request.method === "GET" && request.path === "/api/v1/projects/admin/sample/posts/1") {
        return postExists
          ? { status: 200, json: { comments: [...comments] } }
          : { status: 404, json: null };
      }
      if (request.method === "POST" && request.path === "/api/v1/projects/admin/sample/posts") {
        postExists = true;
        return { status: 201, json: { postNumber: "1" } };
      }
      if (request.method === "POST" && request.path.endsWith("/watch")) {
        return { status: 200, json: { watchCount: 1 } };
      }
      if (
        request.method === "POST" &&
        request.path === "/api/v1/projects/admin/sample/posts/1/comments"
      ) {
        comments.push({
          id: "2",
          authorLoginId: "admin",
          contentsMarkdown: request.json.contentsMarkdown,
          parentCommentId: request.json.parentCommentId,
        });
        return { status: 201, json: { comments: [...comments] } };
      }
      if (
        request.method === "GET" &&
        request.path === "/api/v1/owners/admin/projects/sample/container"
      ) {
        return { status: 200, json: { isWatching: true } };
      }
      throw new Error(`unexpected request ${request.method} ${request.path}`);
    },
  };

  await alignParityBoardFixtures(session);

  assert.deepEqual(
    requests.slice(0, 3).map(({ method, path }) => ({ method, path })),
    [
      { method: "GET", path: "/api/v1/projects/admin/sample/posts/1" },
      { method: "POST", path: "/api/v1/projects/admin/sample/posts" },
      { method: "GET", path: "/api/v1/projects/admin/sample/posts/1" },
    ],
  );
  assert.equal(
    comments.filter((comment) => comment.contentsMarkdown === PARITY_POST_COMMENT).length,
    1,
  );
});

test("parity board alignment rejects a false watch readback despite HTTP 200", async () => {
  const comments = [{ id: "2", authorLoginId: "admin", contentsMarkdown: PARITY_POST_COMMENT }];
  const session = {
    request: async ({ method, path }) => {
      if (method === "GET" && path === "/api/v1/projects/admin/sample/posts/1") {
        return { status: 200, json: { comments } };
      }
      if (method === "POST" && path === "/api/v1/owners/admin/projects/sample/watch") {
        return { status: 200, json: {} };
      }
      if (method === "GET" && path === "/api/v1/owners/admin/projects/sample/container") {
        return { status: 200, json: { isWatching: false } };
      }
      throw new Error(`unexpected request ${method} ${path}`);
    },
  };

  await assert.rejects(
    () => alignParityBoardFixtures(session),
    /yoram project watch readback failed: HTTP 200/u,
  );
});

test("legacy H2 preboot keeps PostgreSQL mode and reconciles every exported model sequence", () => {
  assert.match(legacyH2Url(), /;MODE=PostgreSQL;/u);
  assert.deepEqual(
    LEGACY_MODEL_SEQUENCE_TABLES.map(([sequence]) => sequence).sort(),
    [
      "ASSIGNEE_SEQ",
      "ATTACHMENT_SEQ",
      "COMMENT_THREAD_SEQ",
      "COMMIT_COMMENT_SEQ",
      "EMAIL_SEQ",
      "ISSUE_SEQ",
      "ISSUE_COMMENT_SEQ",
      "ISSUE_EVENT_SEQ",
      "ISSUE_LABEL_SEQ",
      "ISSUE_LABEL_CATEGORY_SEQ",
      "LABEL_SEQ",
      "MENTION_SEQ",
      "MILESTONE_SEQ",
      "N4USER_SEQ",
      "NOTIFICATION_EVENT_SEQ",
      "NOTIFICATION_MAIL_SEQ",
      "ORGANIZATION_SEQ",
      "ORGANIZATION_USER_SEQ",
      "ORIGINAL_EMAIL_SEQ",
      "POSTING_SEQ",
      "POSTING_COMMENT_SEQ",
      "PROJECT_SEQ",
      "PROJECT_MENU_SETTING_SEQ",
      "PROJECT_PUSHED_BRANCH_SEQ",
      "PROJECT_TRANSFER_SEQ",
      "PROJECT_USER_SEQ",
      "PROJECT_VISITATION_SEQ",
      "PROPERTY_SEQ",
      "PULL_REQUEST_SEQ",
      "PULL_REQUEST_COMMIT_SEQ",
      "PULL_REQUEST_EVENT_SEQ",
      "RECENTLY_VISITED_PROJECTS_SEQ",
      "REVIEW_COMMENT_SEQ",
      "ROLE_SEQ",
      "SITE_ADMIN_SEQ",
      "UNWATCH_SEQ",
      "USER_PROJECT_NOTIFICATION_SEQ",
      "WATCH_SEQ",
    ].sort(),
  );
  assert.deepEqual(buildLegacySequenceReconciliationSql("ISSUE_SEQ", 245), [
    "CREATE SEQUENCE IF NOT EXISTS PUBLIC.ISSUE_SEQ START WITH 246",
    "ALTER SEQUENCE PUBLIC.ISSUE_SEQ RESTART WITH 246",
  ]);
});

test("behavior coverage excludes failed and skipped runtime steps", () => {
  assert.deepEqual(
    runtimeVerifiedBehaviorIds([
      { behaviorIds: ["B-executed"], stepResults: [{ status: "EXECUTED" }] },
      { behaviorIds: ["B-failed"], stepResults: [{ status: "FAILED" }] },
      { behaviorIds: ["B-skipped"], stepResults: [{ status: "SKIPPED" }] },
      { behaviorIds: ["B-partial"], stepResults: [{ status: "FAILED" }] },
      { behaviorIds: ["B-partial"], stepResults: [{ status: "EXECUTED" }] },
    ]),
    ["B-executed"],
  );
});

function stepContext(action, entry = { behaviorIds: [], violations: [], errors: [] }) {
  return { step: { action }, entry };
}

test("executeStep records a successful action as EXECUTED", async () => {
  const action = "__contract_success__";
  ACTION_DEFINITIONS[action] = { handler: async () => {} };
  try {
    const entry = { behaviorIds: [], violations: [], errors: [] };
    await executeStep(stepContext(action, entry));
    assert.deepEqual(entry.stepResults, [{ action, status: "EXECUTED", error: null }]);
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

test("executeStep records a dependent HarnessError action as SKIPPED", async () => {
  const action = "__contract_skip__";
  ACTION_DEFINITIONS[action] = {
    handler: async () => {
      throw new HarnessError("missing entity");
    },
  };
  try {
    const entry = { behaviorIds: [], violations: [], errors: [], harnessNoted: true };
    await executeStep(stepContext(action, entry));
    assert.equal(entry.stepResults[0].status, "SKIPPED");
    assert.equal(entry.stepResults[0].error, "missing entity");
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

test("executeStep records thrown action errors as FAILED", async () => {
  const action = "__contract_failure__";
  ACTION_DEFINITIONS[action] = {
    handler: async () => {
      throw new Error("boom");
    },
  };
  try {
    const entry = { behaviorIds: [], violations: [], errors: [] };
    await executeStep(stepContext(action, entry));
    assert.deepEqual(entry.stepResults, [{ action, status: "FAILED", error: "boom" }]);
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

test("executeStep records handler-added step errors as FAILED", async () => {
  const action = "__contract_recorded_error__";
  ACTION_DEFINITIONS[action] = {
    handler: async ({ entry }) => {
      entry.errors.push("HTTP 500");
    },
  };
  try {
    const entry = { behaviorIds: [], violations: [], errors: [] };
    await executeStep(stepContext(action, entry));
    assert.deepEqual(entry.stepResults, [{ action, status: "FAILED", error: "HTTP 500" }]);
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

function dispositionSignature(overrides = {}) {
  return {
    scenarioId: "S13-compat-default-login-page",
    action: "issue-api-probe",
    behaviorId: "B-0037",
    events: [
      {
        side: "legacy",
        request: {
          method: "GET",
          route: "/-_-api/v1/owners/admin/projects/sample/issues/1",
          payload: null,
        },
        response: { status: 401 },
      },
      {
        side: "yoram",
        request: {
          method: "GET",
          route: "/api/v1/owners/admin/projects/sample/issues/1",
          payload: null,
        },
        response: { status: 200 },
      },
    ],
    state: null,
    ...overrides,
  };
}

function fakeSession(result) {
  return {
    async request(translation) {
      return typeof result === "function" ? result(translation) : result;
    },
  };
}

function dispositionContext(
  step,
  legacyResult,
  yoramResult,
  entry = { behaviorIds: ["B-0037"], violations: [], errors: [] },
) {
  return {
    step,
    entry,
    scenarioId: "S13-compat-default-login-page",
    resolved: {},
    state: {},
    legacySession: fakeSession(legacyResult),
    yoramSession: fakeSession(yoramResult),
  };
}

test("built-in issue API probe accepts only its exact expected runtime disposition", async () => {
  const step = {
    action: "issue-api-probe",
    behaviorId: "B-0037",
    params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1" },
    expectedDisposition: {
      classification: "IMPLEMENTATION_DIFFERENCE",
      evidence: "test evidence",
      signature: dispositionSignature(),
    },
  };
  const entry = { behaviorIds: ["B-0037"], violations: [], errors: [] };
  await executeStep(dispositionContext(step, { status: 401 }, { status: 200 }, entry));
  assert.equal(entry.stepResults[0].status, "DISPOSITIONED");
  assert.deepEqual(entry.stepResults[0].disposition, {
    classification: "IMPLEMENTATION_DIFFERENCE",
    evidence: "test evidence",
  });
  assert.equal(entry.stepResults[0].dispositionVerified, true);
  assert.equal(
    buildBehaviorVerification([{ behaviorIds: ["B-0037"], stepResults: entry.stepResults }])[
      "B-0037"
    ].dispositionedSteps,
    1,
  );
});

test("built-in issue API probe preserves an exact legacy-bug disposition", async () => {
  const step = {
    action: "issue-api-probe",
    behaviorId: "B-0037",
    params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1" },
    expectedDisposition: {
      classification: "LEGACY_BUG_NOT_REPRODUCED",
      evidence: "test legacy evidence",
      signature: dispositionSignature(),
    },
  };
  const entry = { behaviorIds: ["B-0037"], violations: [], errors: [] };
  await executeStep(dispositionContext(step, { status: 401 }, { status: 200 }, entry));
  assert.equal(entry.stepResults[0].disposition?.classification, "LEGACY_BUG_NOT_REPRODUCED");
  assert.equal(entry.stepResults[0].dispositionVerified, true);
});

test("expected disposition rejects status, payload, identity, route, and exception drift", async () => {
  const expected = {
    classification: "IMPLEMENTATION_DIFFERENCE",
    evidence: "test evidence",
    signature: dispositionSignature(),
  };
  const variants = [
    {
      name: "yoram status",
      yoram: { status: 500 },
    },
    {
      name: "legacy status",
      legacy: { status: 200 },
    },
    {
      name: "request payload",
      step: {
        params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1?drift=1" },
      },
    },
    {
      name: "behavior identity",
      step: { behaviorId: "B-wrong" },
    },
    {
      name: "action identity",
      signature: { action: "another-action" },
    },
    {
      name: "scenario identity",
      signature: { scenarioId: "another-scenario" },
    },
    {
      name: "route",
      step: { params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/other" } },
    },
  ];
  for (const variant of variants) {
    const step = {
      action: "issue-api-probe",
      behaviorId: "B-0037",
      params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1" },
      expectedDisposition: variant.signature
        ? { ...expected, signature: dispositionSignature(variant.signature) }
        : expected,
      ...variant.step,
    };
    const entry = { behaviorIds: ["B-0037"], violations: [], errors: [] };
    await executeStep(
      dispositionContext(
        step,
        variant.legacy ?? { status: 401 },
        variant.yoram ?? { status: 200 },
        entry,
      ),
    );
    assert.equal(entry.stepResults[0].disposition, undefined, variant.name);
    assert.equal(entry.stepResults[0].status, "FAILED", variant.name);
  }

  const throwingStep = {
    action: "issue-api-probe",
    behaviorId: "B-0037",
    params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1" },
    expectedDisposition: expected,
  };
  const throwingEntry = { behaviorIds: ["B-0037"], violations: [], errors: [] };
  await executeStep({
    ...dispositionContext(throwingStep, { status: 401 }, { status: 200 }, throwingEntry),
    legacySession: {
      async request() {
        throw new Error("handler exception");
      },
    },
  });
  assert.equal(throwingEntry.stepResults[0].disposition, undefined);
  assert.equal(throwingEntry.stepResults[0].status, "FAILED");
});

test("expected disposition rejects an additional request payload key", async () => {
  const action = "__payload_contract__";
  ACTION_DEFINITIONS[action] = {
    async handler(ctx) {
      await ctx.helpers.requestBoth(
        ctx,
        { method: "POST", path: "/probe", json: { allowed: true, extra: true } },
        { method: "POST", path: "/probe", json: { allowed: true, extra: true } },
      );
    },
  };
  try {
    const entry = { behaviorIds: ["B-payload"], violations: [], errors: [] };
    await executeStep({
      ...dispositionContext(
        {
          action,
          behaviorId: "B-payload",
          expectedDisposition: {
            classification: "IMPLEMENTATION_DIFFERENCE",
            evidence: "test evidence",
            signature: {
              scenarioId: "payload-contract",
              action,
              behaviorId: "B-payload",
              events: [
                {
                  side: "legacy",
                  request: {
                    method: "POST",
                    route: "/probe",
                    payload: { json: { allowed: true } },
                  },
                  response: { status: 200 },
                },
                {
                  side: "yoram",
                  request: {
                    method: "POST",
                    route: "/probe",
                    payload: { json: { allowed: true } },
                  },
                  response: { status: 200 },
                },
              ],
              state: null,
            },
          },
        },
        { status: 200 },
        { status: 200 },
        entry,
      ),
      scenarioId: "payload-contract",
    });
    assert.equal(entry.stepResults[0].disposition, undefined);
    assert.equal(entry.stepResults[0].status, "FAILED");
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

test("malformed runtime signature factories remain blocking", async () => {
  const action = "__malformed_signature__";
  ACTION_DEFINITIONS[action] = { handler: async () => {} };
  try {
    const entry = { behaviorIds: ["B-malformed"], violations: [], errors: [] };
    await executeStep({
      ...stepContext(
        {
          action,
          behaviorId: "B-malformed",
          expectedDisposition: {
            classification: "IMPLEMENTATION_DIFFERENCE",
            evidence: "test evidence",
            signature: () => ({}),
          },
        },
        entry,
      ),
      scenarioId: "malformed-signature",
    });
    assert.equal(entry.stepResults[0].disposition, undefined);
    assert.equal(entry.stepResults[0].status, "FAILED");
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

test("scenario validation rejects legacy static dispositions and incomplete expected signatures", () => {
  const base = {
    id: "test",
    actions: [{ actor: "admin", action: "probe" }],
    behaviorMatcher: { action: /probe/u },
  };
  assert.match(
    validateScenarios(
      [
        {
          ...base,
          actions: [
            {
              ...base.actions[0],
              disposition: { classification: "IMPLEMENTATION_DIFFERENCE", evidence: "e" },
            },
          ],
        },
      ],
      ["probe"],
    ).join("\n"),
    /static disposition/u,
  );
  assert.match(
    validateScenarios(
      [
        {
          ...base,
          actions: [
            {
              ...base.actions[0],
              expectedDisposition: {
                classification: "IMPLEMENTATION_DIFFERENCE",
                evidence: "e",
                signature: {},
              },
            },
          ],
        },
      ],
      ["probe"],
    ).join("\n"),
    /signature/u,
  );
  const verification = buildBehaviorVerification([
    {
      behaviorIds: ["B-static"],
      stepResults: [
        {
          status: "FAILED",
          disposition: { classification: "IMPLEMENTATION_DIFFERENCE", evidence: "e" },
        },
      ],
    },
  ])["B-static"];
  assert.equal(verification.dispositionedSteps, 0);
  assert.equal(verification.failedSteps, 1);
});

test("summarizeExecution separates global infrastructure errors from step errors", () => {
  const summary = summarizeExecution(
    {
      infraErrors: ["yoram boot failed"],
      scenarios: [
        { stepResults: [{ status: "EXECUTED" }] },
        { stepResults: [{ status: "SKIPPED" }, { status: "FAILED" }, { status: "DISPOSITIONED" }] },
      ],
    },
    3,
  );
  assert.deepEqual(summary, {
    registeredScenarios: 3,
    attemptedScenarios: 2,
    globalInfraErrors: ["yoram boot failed"],
    scenariosWithStepErrors: 1,
    scenariosWithoutStepErrors: 1,
    totalStepErrors: 2,
    acceptedDispositions: 1,
  });
});
