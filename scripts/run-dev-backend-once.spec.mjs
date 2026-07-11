import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  reconcileDefaultDevParitySeed,
  reconcileDefaultDevSiteAdmin,
} from "./run-dev-backend-once.mjs";

function withTempDatabase(setup) {
  const directory = mkdtempSync(join(tmpdir(), "run-dev-backend-once-"));
  const runtimeDirectory = join(directory, "runtime");
  const databasePath = join(directory, "dev.db");
  const database = new DatabaseSync(databasePath);

  try {
    setup(database, runtimeDirectory);
  } finally {
    database.close();
  }

  return {
    cleanup() {
      rmSync(directory, { force: true, recursive: true });
    },
    databasePath,
    runtimeDirectory,
  };
}

function seedParityFoundationFixture(database) {
  database.exec(`
    create table n4user (
      id integer primary key autoincrement,
      name varchar,
      login_id varchar unique,
      password varchar,
      password_salt varchar,
      email varchar,
      remember_me tinyint,
      state varchar,
      last_state_modified_date datetime_text,
      created_date datetime_text,
      lang varchar,
      token varchar unique,
      is_guest tinyint,
      english_name varchar
    );
    create table site_admin (
      id integer primary key autoincrement,
      admin_id bigint
    );
    create table project (
      id integer primary key autoincrement,
      name varchar,
      overview varchar,
      vcs varchar,
      siteurl varchar,
      owner varchar,
      created_date datetime_text,
      last_issue_number bigint,
      last_posting_number bigint,
      original_project_id bigint,
      last_pushed_date datetime_text,
      default_reviewer_count integer,
      is_using_reviewer_count smallint,
      organization_id bigint,
      project_scope varchar,
      previous_owner_login_id varchar,
      previous_name varchar,
      previous_name_changed_time bigint,
      is_code_accessible_member_only smallint
    );
    create table milestone (
      id integer primary key autoincrement,
      title varchar,
      due_date datetime_text,
      state integer,
      project_id bigint,
      contents text
    );
    create table assignee (
      id integer primary key autoincrement,
      user_id bigint,
      project_id bigint
    );
    create table issue_label_category (
      id integer primary key autoincrement,
      project_id bigint,
      name varchar,
      is_exclusive smallint
    );
    create table issue_label (
      id integer primary key autoincrement,
      category_id bigint,
      color varchar,
      name varchar,
      project_id bigint
    );
    create table issue_issue_label (
      issue_id bigint not null,
      issue_label_id bigint not null,
      primary key (issue_id, issue_label_id)
    );
    create table issue (
      id integer primary key autoincrement,
      title varchar,
      created_date datetime_text,
      updated_date datetime_text,
      author_id bigint,
      author_login_id varchar,
      author_name varchar,
      project_id bigint,
      number bigint,
      num_of_comments integer,
      state integer,
      due_date datetime_text,
      milestone_id bigint,
      assignee_id bigint,
      parent_id bigint,
      weight smallint,
      updated_by_author_id bigint,
      is_draft smallint,
      body text,
      history text
    );
    create table issue_comment (
      id integer primary key autoincrement,
      created_date datetime_text,
      author_id bigint,
      author_login_id varchar,
      author_name varchar,
      issue_id bigint,
      project_id bigint not null,
      parent_comment_id bigint,
      contents text
    );
    create table issue_event (
      id integer primary key autoincrement,
      created integer,
      sender_login_id text,
      sender_email text,
      issue_id integer,
      event_type text,
      old_value text,
      new_value text
    );
    create table posting (
      id integer primary key autoincrement,
      title varchar,
      created_date datetime_text,
      updated_date datetime_text,
      author_id bigint,
      author_login_id varchar,
      author_name varchar,
      project_id bigint,
      number bigint,
      num_of_comments integer,
      notice smallint,
      readme smallint,
      parent_id bigint,
      updated_by_author_id bigint,
      body text,
      history text
    );
    create table posting_comment (
      id integer primary key autoincrement,
      created_date datetime_text,
      author_id bigint,
      author_login_id varchar,
      author_name varchar,
      posting_id bigint,
      project_id bigint not null,
      parent_comment_id bigint,
      contents text
    );
    create table watch (
      id integer primary key autoincrement,
      user_id bigint,
      resource_type varchar,
      resource_id varchar
    );
  `);

  database.exec(`
    insert into n4user (id, name, login_id, email, state, created_date, lang, is_guest)
    values
      (1, 'Smoke User', 'smokeuser6250932', 'smoke@example.test', 'active', '2026-06-25 09:32:40.951055', 'ko-KR', 0),
      (2, 'Site Admin', 'admin', 'admin@example.com', 'active', '2026-06-26 06:46:12.255338', 'ko-KR', 0),
      (3, 'Alice', 'alice', 'alice@example.com', 'active', '2026-07-06 06:18:04.766594', 'ko-KR', 0),
      (4, 'Carol Lee', 'carol', 'carol@example.com', 'active', '2026-07-06 08:43:40.155504', 'ko-KR', 0);
    insert into project
      (id, name, overview, vcs, owner, created_date, last_issue_number, last_posting_number, project_scope)
    values
      (2, 'sample', 'Sample project', 'GIT', 'admin', '2026-07-06 00:00:00.000', 1, 0, 'public'),
      (3, 'portal', 'Group portal', 'GIT', 'weblabs', '2026-07-06 00:00:00.000', 1, 0, 'protected');
    insert into milestone (id, title, due_date, state, project_id, contents)
    values (1, 'Parity launch', '2026-07-31 23:59:59.999', 0, 2, 'Milestone for local legacy parity verification screens.');
    insert into issue
      (id, title, created_date, updated_date, author_id, author_login_id, author_name, project_id,
       number, num_of_comments, state, due_date, milestone_id, assignee_id, updated_by_author_id,
       is_draft, body, history)
    values
      (2, 'Sample issue', '2026-07-06 00:00:00.000', '2026-07-06 00:00:00.000', 2, 'admin',
       'Site Admin', 2, 1, 0, 1, null, 1, null, 2, 0, 'Sample issue body', null);
    insert into issue_event (created, sender_login_id, issue_id, event_type, old_value, new_value)
    values (1, 'admin', 2, 'milestone', null, '1');
  `);
}

function readGit(repoPath, ...args) {
  return execFileSync("git", ["--git-dir", repoPath, ...args], {
    encoding: "utf8",
  }).trim();
}

test("reconcileDefaultDevSiteAdmin inserts a missing site admin row for the default admin", () => {
  const fixture = withTempDatabase((database) => {
    database.exec(`
      create table n4user (
        id integer primary key autoincrement,
        login_id varchar unique
      );
      create table site_admin (
        id integer primary key autoincrement,
        admin_id bigint
      );
    `);
    database.prepare("insert into n4user (login_id) values (?)").run("smokeuser6250932");
    database.prepare("insert into n4user (login_id) values (?)").run("admin");
    database.prepare("insert into site_admin (admin_id) values (?)").run(1);
  });

  try {
    const result = reconcileDefaultDevSiteAdmin(fixture.databasePath);
    assert.deepEqual(result, {
      adminUserId: 2,
      loginId: "admin",
      status: "inserted",
    });

    const database = new DatabaseSync(fixture.databasePath);
    try {
      const rows = database
        .prepare("select admin_id from site_admin order by admin_id")
        .all()
        .map((row) => Number(row.admin_id));
      assert.deepEqual(rows, [1, 2]);
    } finally {
      database.close();
    }
  } finally {
    fixture.cleanup();
  }
});

test("reconcileDefaultDevSiteAdmin keeps an existing default admin site-admin row unchanged", () => {
  const fixture = withTempDatabase((database) => {
    database.exec(`
      create table n4user (
        id integer primary key autoincrement,
        login_id varchar unique
      );
      create table site_admin (
        id integer primary key autoincrement,
        admin_id bigint
      );
    `);
    database.prepare("insert into n4user (login_id) values (?)").run("admin");
    database.prepare("insert into site_admin (admin_id) values (?)").run(1);
  });

  try {
    const result = reconcileDefaultDevSiteAdmin(fixture.databasePath);
    assert.deepEqual(result, {
      adminUserId: 1,
      loginId: "admin",
      status: "unchanged",
    });

    const database = new DatabaseSync(fixture.databasePath);
    try {
      const count = database.prepare("select count(*) as count from site_admin").get().count;
      assert.equal(Number(count), 1);
    } finally {
      database.close();
    }
  } finally {
    fixture.cleanup();
  }
});

test("reconcileDefaultDevSiteAdmin skips databases that do not yet have the runtime schema", () => {
  const fixture = withTempDatabase(() => {});

  try {
    const result = reconcileDefaultDevSiteAdmin(fixture.databasePath);
    assert.deepEqual(result, {
      reason: "missing-schema",
      status: "skipped",
    });
  } finally {
    fixture.cleanup();
  }
});

test("reconcileDefaultDevParitySeed seeds localhost parity content and repositories", () => {
  const fixture = withTempDatabase((database) => {
    seedParityFoundationFixture(database);
  });

  try {
    const result = reconcileDefaultDevParitySeed(fixture.databasePath, fixture.runtimeDirectory);
    assert.equal(result.status, "updated");

    const database = new DatabaseSync(fixture.databasePath);
    try {
      const alice = database.prepare("select name from n4user where login_id = 'alice'").get();
      const bob = database.prepare("select name from n4user where login_id = 'bob'").get();
      const issue = database
        .prepare(
          "select title, body, state, due_date, num_of_comments, assignee_id, created_date from issue where project_id = 2 and number = 1",
        )
        .get();
      const post = database
        .prepare(
          "select title, body, notice, num_of_comments from posting where project_id = 2 and number = 1",
        )
        .get();
      const issueComment = database
        .prepare(
          "select author_login_id, author_name, contents, created_date from issue_comment where issue_id = 2",
        )
        .get();
      const postComment = database
        .prepare("select author_login_id, author_name, contents from posting_comment")
        .get();
      const labelNames = database
        .prepare("select name from issue_label order by name")
        .all()
        .map((row) => row.name);
      const watcherLogins = database
        .prepare(
          `select n4user.login_id
             from watch join n4user on n4user.id = watch.user_id
            where watch.resource_type = 'PROJECT' and watch.resource_id = '3'
            order by n4user.login_id`,
        )
        .all()
        .map((row) => row.login_id);
      const sampleWatcherLogins = database
        .prepare(
          `select n4user.login_id
             from watch join n4user on n4user.id = watch.user_id
            where watch.resource_type = 'PROJECT' and watch.resource_id = '2'
            order by n4user.login_id`,
        )
        .all()
        .map((row) => row.login_id);

      assert.equal(alice.name, "Alice Kim");
      assert.equal(bob.name, "Bob Park");
      assert.equal(issue.title, "Review rail parity check");
      assert.equal(
        issue.body,
        "Use this issue to verify labels, assignee, milestone, and timeline rendering in the converted frontend.",
      );
      assert.equal(Number(issue.state), 0);
      assert.equal(issue.due_date, "2026-07-24 23:59:59.999");
      assert.equal(Number(issue.num_of_comments), 1);
      assert.ok(Number(issue.assignee_id) > 0);
      assert.equal(issue.created_date, issueComment.created_date);
      assert.equal(post.title, "Seed notes");
      assert.equal(post.body, "This board post exists to seed the legacy board list and detail flows.");
      assert.equal(Number(post.notice), 1);
      assert.equal(Number(post.num_of_comments), 1);
      assert.deepEqual({ ...issueComment }, {
        author_login_id: "bob",
        author_name: "Bob Park",
        contents: "I can reproduce the legacy issue view from this seed.",
        created_date: issue.created_date,
      });
      assert.deepEqual({ ...postComment }, {
        author_login_id: "alice",
        author_name: "Alice Kim",
        contents: "Board seed confirmed from the fork contributor side.",
      });
      assert.deepEqual(labelNames, ["bug", "parity"]);
      assert.deepEqual(watcherLogins, ["admin", "carol"]);
      assert.deepEqual(sampleWatcherLogins, ["admin"]);
      assert.equal(
        Number(database.prepare("select count(*) as count from issue_event").get().count),
        0,
      );
    } finally {
      database.close();
    }

    const sampleRepo = join(fixture.runtimeDirectory, "repo", "2.git");
    const portalRepo = join(fixture.runtimeDirectory, "repo", "3.git");
    const sampleRefs = readGit(sampleRepo, "show-ref");
    const portalRefs = readGit(portalRepo, "show-ref");
    const sampleMainFiles = readGit(sampleRepo, "ls-tree", "--name-only", "-r", "main").split("\n");
    const sampleFeatureFiles = readGit(sampleRepo, "ls-tree", "--name-only", "-r", "feature/ui").split(
      "\n",
    );

    assert.match(sampleRefs, /refs\/heads\/main/);
    assert.match(sampleRefs, /refs\/heads\/feature\/ui/);
    assert.match(portalRefs, /refs\/heads\/main/);
    assert.match(portalRefs, /refs\/heads\/feature\/ui/);
    assert.deepEqual(sampleMainFiles, ["README.md", "docs/parity-checklist.md", "src/main.rs"]);
    assert.deepEqual(sampleFeatureFiles, [
      "README.md",
      "docs/parity-checklist.md",
      "src/main.rs",
      "src/ui.rs",
    ]);
  } finally {
    fixture.cleanup();
  }
});

test("reconcileDefaultDevParitySeed is idempotent for already-seeded localhost data", () => {
  const fixture = withTempDatabase((database) => {
    seedParityFoundationFixture(database);
  });

  try {
    reconcileDefaultDevParitySeed(fixture.databasePath, fixture.runtimeDirectory);
    const second = reconcileDefaultDevParitySeed(fixture.databasePath, fixture.runtimeDirectory);
    assert.equal(second.status, "unchanged");
    assert.ok(second.repositories.every((entry) => entry.status === "unchanged"));

    const database = new DatabaseSync(fixture.databasePath);
    try {
      const counts = {
        issueComment: Number(
          database.prepare("select count(*) as count from issue_comment").get().count,
        ),
        issueLabels: Number(
          database.prepare("select count(*) as count from issue_issue_label").get().count,
        ),
        postComment: Number(
          database.prepare("select count(*) as count from posting_comment").get().count,
        ),
        users: Number(database.prepare("select count(*) as count from n4user").get().count),
        watchers: Number(
          database
            .prepare(
              "select count(*) as count from watch where resource_type = 'PROJECT' and resource_id = '3'",
            )
            .get().count,
        ),
        sampleWatchers: Number(
          database
            .prepare(
              "select count(*) as count from watch where resource_type = 'PROJECT' and resource_id = '2'",
            )
            .get().count,
        ),
      };
      assert.deepEqual(counts, {
        issueComment: 1,
        issueLabels: 2,
        postComment: 1,
        users: 5,
        watchers: 2,
        sampleWatchers: 1,
      });
    } finally {
      database.close();
    }
  } finally {
    fixture.cleanup();
  }
});
