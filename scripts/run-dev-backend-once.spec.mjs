import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { reconcileDefaultDevSiteAdmin } from "./run-dev-backend-once.mjs";

function withTempDatabase(setup) {
  const directory = mkdtempSync(join(tmpdir(), "run-dev-backend-once-"));
  const databasePath = join(directory, "dev.db");
  const database = new DatabaseSync(databasePath);

  try {
    setup(database);
  } finally {
    database.close();
  }

  return {
    cleanup() {
      rmSync(directory, { force: true, recursive: true });
    },
    databasePath,
  };
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
