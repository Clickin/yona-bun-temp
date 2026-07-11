import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizeBasePath } from "./dev-config.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const defaultAdminLoginId = process.env.YONA_DEV_DEFAULT_ADMIN_LOGIN_ID ?? "admin";
const parityCreatedAt = "2026-07-07 11:24:00.000";
const parityDueDate = "2026-07-24 23:59:59.999";
const parityMilestoneDueDate = "2026-07-31 23:59:59.999";
const parityProjectSeed = Object.freeze({
  issue: {
    body:
      "Use this issue to verify labels, assignee, milestone, and timeline rendering in the converted frontend.",
    commentBody: "I can reproduce the legacy issue view from this seed.",
    title: "Review rail parity check",
  },
  labels: [
    { categoryName: "type", color: "#f44336", isExclusive: 0, name: "bug" },
    { categoryName: "area", color: "#2196f3", isExclusive: 0, name: "parity" },
  ],
  milestone: {
    contents: "Milestone for local legacy parity verification screens.",
    title: "Parity launch",
  },
  post: {
    body: "This board post exists to seed the legacy board list and detail flows.",
    commentBody: "Board seed confirmed from the fork contributor side.",
    title: "Seed notes",
  },
  repositories: [
    {
      branches: [
        {
          files: {
            "README.md": "# Sample parity repository\n\nThis repository powers localhost parity checks.\n",
            "docs/parity-checklist.md":
              "- verify project header and menu\n- verify issue, board, and code shells\n",
            "src/main.rs": "fn main() {\n    println!(\"sample parity\");\n}\n",
          },
          message: "Seed sample parity repository",
          name: "main",
        },
        {
          files: {
            "docs/parity-checklist.md":
              "- verify project header and menu\n- verify issue, board, and code shells\n- verify pull request compare state\n",
            "src/ui.rs": "pub fn feature_flag() -> &'static str {\n    \"feature/ui\"\n}\n",
          },
          message: "Add feature branch parity fixture",
          name: "feature/ui",
        },
      ],
      owner: "admin",
      projectName: "sample",
    },
    {
      branches: [
        {
          files: {
            "README.md": "# Portal parity repository\n\nProtected project parity fixture.\n",
            "docs/onboarding.md":
              "## Portal\n\nThis repository exists to verify protected project code views.\n",
            "src/main.rs": "fn main() {\n    println!(\"portal parity\");\n}\n",
          },
          message: "Seed portal parity repository",
          name: "main",
        },
        {
          files: {
            "docs/onboarding.md":
              "## Portal\n\nThis repository exists to verify protected project code views.\n\n- group member visibility\n",
            "src/feature.rs": "pub const FEATURE: &str = \"portal\";\n",
          },
          message: "Add portal feature branch parity fixture",
          name: "feature/ui",
        },
      ],
      owner: "weblabs",
      projectName: "portal",
    },
  ],
});

function hasTable(database, tableName) {
  return Boolean(
    database
      .prepare("select 1 from sqlite_master where type = 'table' and name = ? limit 1")
      .get(tableName),
  );
}

function currentTimestampSql() {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

function runGit(args, cwd = repoRoot) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
  });
  if (result.status === 0) {
    return result;
  }
  throw new Error(
    `git ${args.join(" ")} failed (exit ${result.status ?? "unknown"})\nstdout: ${
      result.stdout ?? ""
    }\nstderr: ${result.stderr ?? ""}`,
  );
}

function gitRefExists(repoPath, ref) {
  const result = spawnSync("git", ["--git-dir", repoPath, "show-ref", "--verify", "--quiet", ref], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return result.status === 0;
}

function ensureBareRepository(repoPath) {
  fs.mkdirSync(path.dirname(repoPath), { recursive: true });
  if (!fs.existsSync(repoPath)) {
    runGit(["init", "--bare", repoPath]);
    return "created";
  }
  return "existing";
}

function writeRepositoryFiles(worktreePath, files) {
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(worktreePath, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
  }
}

function seedRepositoryBranch(repoPath, branchSeed) {
  const tempRoot = fs.mkdtempSync(path.join(tmpdir(), "yona-dev-parity-repo-"));
  const worktreePath = path.join(tempRoot, "worktree");
  try {
    runGit(["clone", repoPath, worktreePath]);
    if (branchSeed.name === "main") {
      runGit(["checkout", "-B", "main"], worktreePath);
    } else {
      runGit(["checkout", "-B", branchSeed.name, "main"], worktreePath);
    }
    writeRepositoryFiles(worktreePath, branchSeed.files);
    runGit(["add", "."], worktreePath);
    runGit(
      [
        "-c",
        "user.email=parity@example.com",
        "-c",
        "user.name=Parity Seed",
        "commit",
        "-m",
        branchSeed.message,
      ],
      worktreePath,
    );
    runGit(["push", "origin", branchSeed.name], worktreePath);
  } finally {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  }
}

function ensureProjectRepositorySeed(runtimeDirectory, projectId, branchSeeds) {
  const repoPath = path.join(runtimeDirectory, "repo", `${projectId}.git`);
  const events = [];
  const repoStatus = ensureBareRepository(repoPath);
  if (repoStatus === "created") {
    events.push("created");
  }
  if (!gitRefExists(repoPath, "refs/heads/main")) {
    seedRepositoryBranch(repoPath, branchSeeds[0]);
    runGit(["--git-dir", repoPath, "symbolic-ref", "HEAD", "refs/heads/main"]);
    events.push("seeded-main");
  }
  for (const branchSeed of branchSeeds.slice(1)) {
    const ref = `refs/heads/${branchSeed.name}`;
    if (!gitRefExists(repoPath, ref)) {
      seedRepositoryBranch(repoPath, branchSeed);
      events.push(`seeded-${branchSeed.name}`);
    }
  }
  return {
    projectId,
    repoPath,
    status: events.length === 0 ? "unchanged" : events.join(","),
  };
}

export function reconcileDefaultDevSiteAdmin(databasePath, loginId = defaultAdminLoginId) {
  const normalizedLoginId = (loginId ?? "").trim();
  if (normalizedLoginId === "") {
    return { reason: "empty-login-id", status: "skipped" };
  }

  const database = new DatabaseSync(databasePath);
  try {
    if (!hasTable(database, "n4user") || !hasTable(database, "site_admin")) {
      return { reason: "missing-schema", status: "skipped" };
    }

    const adminUser = database
      .prepare("select id from n4user where login_id = ? limit 1")
      .get(normalizedLoginId);
    if (!adminUser?.id) {
      return { loginId: normalizedLoginId, reason: "missing-admin-user", status: "skipped" };
    }

    const existingSiteAdmin = database
      .prepare("select id from site_admin where admin_id = ? limit 1")
      .get(adminUser.id);
    if (existingSiteAdmin?.id) {
      return {
        adminUserId: Number(adminUser.id),
        loginId: normalizedLoginId,
        status: "unchanged",
      };
    }

    database.prepare("insert into site_admin (admin_id) values (?)").run(adminUser.id);
    return {
      adminUserId: Number(adminUser.id),
      loginId: normalizedLoginId,
      status: "inserted",
    };
  } finally {
    database.close();
  }
}

export function reconcileDefaultDevParitySeed(databasePath, runtimeDirectory) {
  const database = new DatabaseSync(databasePath);
  try {
    database.exec("pragma busy_timeout = 5000");
    const requiredTables = [
      "assignee",
      "issue",
      "issue_comment",
      "issue_issue_label",
      "issue_label",
      "issue_label_category",
      "milestone",
      "n4user",
      "notification_event",
      "notification_event_n4user",
      "posting",
      "posting_comment",
      "project",
      "watch",
    ];
    if (requiredTables.some((tableName) => !hasTable(database, tableName))) {
      return { reason: "missing-schema", status: "skipped" };
    }

    const sampleProject = database
      .prepare("select id from project where owner = ? and name = ? limit 1")
      .get("admin", "sample");
    if (!sampleProject?.id) {
      return { reason: "missing-sample-project", status: "skipped" };
    }

    const adminUser = database
      .prepare("select id, name from n4user where login_id = ? limit 1")
      .get("admin");
    const aliceUser = database
      .prepare("select id, name from n4user where login_id = ? limit 1")
      .get("alice");
    if (!adminUser?.id || !aliceUser?.id) {
      return { reason: "missing-parity-users", status: "skipped" };
    }

    const carolUser = database
      .prepare("select id from n4user where login_id = ? limit 1")
      .get("carol");
    const portalProject = database
      .prepare("select id from project where owner = ? and name = ? limit 1")
      .get("weblabs", "portal");
    const timestamp = currentTimestampSql();
    const report = {
      issue: "unchanged",
      issueComment: "unchanged",
      labels: [],
      milestone: "unchanged",
      notifications: [],
      post: "unchanged",
      postComment: "unchanged",
      repositories: [],
      status: "unchanged",
      watchers: [],
    };

    const ensureUser = (loginId, name, email) => {
      const existing = database
        .prepare("select id, name from n4user where login_id = ? limit 1")
        .get(loginId);
      if (existing?.id) {
        if ((existing.name ?? "") !== name) {
          database.prepare("update n4user set name = ? where id = ?").run(name, existing.id);
        }
        return Number(existing.id);
      }
      const inserted = database
        .prepare(
          `insert into n4user
            (name, login_id, email, state, created_date, lang, is_guest)
            values (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(name, loginId, email, "active", timestamp, "ko-KR", 0);
      return Number(inserted.lastInsertRowid);
    };

    const bobUserId = ensureUser("bob", "Bob Park", "bob@example.com");
    database.prepare("update n4user set name = ? where login_id = ?").run("Alice Kim", "alice");

    database.exec("begin");
    try {
      let milestone = database
        .prepare("select id, title, contents, due_date, state from milestone where project_id = ? limit 1")
        .get(sampleProject.id);
      if (milestone?.id) {
        if (
          milestone.title !== parityProjectSeed.milestone.title ||
          milestone.contents !== parityProjectSeed.milestone.contents ||
          milestone.due_date !== parityMilestoneDueDate ||
          Number(milestone.state ?? 0) !== 0
        ) {
          database
            .prepare("update milestone set title = ?, contents = ?, due_date = ?, state = ? where id = ?")
            .run(
              parityProjectSeed.milestone.title,
              parityProjectSeed.milestone.contents,
              parityMilestoneDueDate,
              0,
              milestone.id,
            );
          report.milestone = "updated";
        }
      } else {
        const inserted = database
          .prepare(
            "insert into milestone (title, due_date, state, project_id, contents) values (?, ?, ?, ?, ?)",
          )
          .run(
            parityProjectSeed.milestone.title,
            parityMilestoneDueDate,
            0,
            sampleProject.id,
            parityProjectSeed.milestone.contents,
          );
        milestone = { id: Number(inserted.lastInsertRowid) };
        report.milestone = "inserted";
      }

      let assignee = database
        .prepare("select id from assignee where user_id = ? and project_id = ? limit 1")
        .get(aliceUser.id, sampleProject.id);
      if (!assignee?.id) {
        const inserted = database
          .prepare("insert into assignee (user_id, project_id) values (?, ?)")
          .run(aliceUser.id, sampleProject.id);
        assignee = { id: Number(inserted.lastInsertRowid) };
      }

      const labelIds = [];
      for (const labelSeed of parityProjectSeed.labels) {
        let category = database
          .prepare("select id, is_exclusive from issue_label_category where project_id = ? and name = ? limit 1")
          .get(sampleProject.id, labelSeed.categoryName);
        if (!category?.id) {
          const inserted = database
            .prepare(
              "insert into issue_label_category (project_id, name, is_exclusive) values (?, ?, ?)",
            )
            .run(sampleProject.id, labelSeed.categoryName, labelSeed.isExclusive);
          category = { id: Number(inserted.lastInsertRowid), is_exclusive: labelSeed.isExclusive };
          report.labels.push(`${labelSeed.categoryName}/${labelSeed.name}:category`);
        } else if (Number(category.is_exclusive ?? 0) !== labelSeed.isExclusive) {
          database
            .prepare("update issue_label_category set is_exclusive = ? where id = ?")
            .run(labelSeed.isExclusive, category.id);
          report.labels.push(`${labelSeed.categoryName}/${labelSeed.name}:category-updated`);
        }

        let label = database
          .prepare(
            "select id, color from issue_label where project_id = ? and category_id = ? and name = ? limit 1",
          )
          .get(sampleProject.id, category.id, labelSeed.name);
        if (!label?.id) {
          const inserted = database
            .prepare(
              "insert into issue_label (category_id, color, name, project_id) values (?, ?, ?, ?)",
            )
            .run(category.id, labelSeed.color, labelSeed.name, sampleProject.id);
          label = { color: labelSeed.color, id: Number(inserted.lastInsertRowid) };
          report.labels.push(`${labelSeed.categoryName}/${labelSeed.name}:inserted`);
        } else if ((label.color ?? "") !== labelSeed.color) {
          database.prepare("update issue_label set color = ? where id = ?").run(labelSeed.color, label.id);
          report.labels.push(`${labelSeed.categoryName}/${labelSeed.name}:updated`);
        }
        labelIds.push(Number(label.id));
      }

      let issue = database
        .prepare("select id, title, body from issue where project_id = ? and number = ? limit 1")
        .get(sampleProject.id, 1);
      if (issue?.id) {
        database
          .prepare(
            `update issue
             set title = ?, updated_date = ?, author_id = ?, author_login_id = ?, author_name = ?,
                 num_of_comments = ?, state = ?, due_date = ?, milestone_id = ?, assignee_id = ?,
                 updated_by_author_id = ?, is_draft = ?, body = ?, history = null
             where id = ?`,
          )
          .run(
            parityProjectSeed.issue.title,
            parityCreatedAt,
            adminUser.id,
            "admin",
            adminUser.name ?? "Site Admin",
            1,
            0,
            parityDueDate,
            milestone.id,
            assignee.id,
            adminUser.id,
            0,
            parityProjectSeed.issue.body,
            issue.id,
          );
        report.issue =
          issue.title !== parityProjectSeed.issue.title || issue.body !== parityProjectSeed.issue.body
            ? "updated"
            : "unchanged";
      } else {
        const inserted = database
          .prepare(
            `insert into issue
              (title, created_date, updated_date, author_id, author_login_id, author_name, project_id,
               number, num_of_comments, state, due_date, milestone_id, assignee_id, updated_by_author_id,
               is_draft, body, history)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null)`,
          )
          .run(
            parityProjectSeed.issue.title,
            parityCreatedAt,
            parityCreatedAt,
            adminUser.id,
            "admin",
            adminUser.name ?? "Site Admin",
            sampleProject.id,
            1,
            1,
            0,
            parityDueDate,
            milestone.id,
            assignee.id,
            adminUser.id,
            0,
            parityProjectSeed.issue.body,
          );
        issue = { id: Number(inserted.lastInsertRowid) };
        report.issue = "inserted";
      }

      for (const labelId of labelIds) {
        const existingLink = database
          .prepare(
            "select 1 from issue_issue_label where issue_id = ? and issue_label_id = ? limit 1",
          )
          .get(issue.id, labelId);
        if (!existingLink) {
          database
            .prepare("insert into issue_issue_label (issue_id, issue_label_id) values (?, ?)")
            .run(issue.id, labelId);
          report.labels.push(`issue-link:${labelId}`);
        }
      }

      if (hasTable(database, "issue_event")) {
        const removedEvents = database
          .prepare("delete from issue_event where issue_id = ?")
          .run(issue.id).changes;
        if (removedEvents > 0) {
          report.issueEvents = `removed:${removedEvents}`;
        }
      }

      let issueComment = database
        .prepare(
          "select id, created_date from issue_comment where issue_id = ? and author_login_id = ? and contents = ? limit 1",
        )
        .get(issue.id, "bob", parityProjectSeed.issue.commentBody);
      if (!issueComment?.id) {
        const inserted = database
          .prepare(
            `insert into issue_comment
              (created_date, author_id, author_login_id, author_name, issue_id, project_id, parent_comment_id, contents)
             values (?, ?, ?, ?, ?, ?, null, ?)`,
          )
          .run(
            parityCreatedAt,
            bobUserId,
            "bob",
            "Bob Park",
            issue.id,
            sampleProject.id,
            parityProjectSeed.issue.commentBody,
          );
        issueComment = { created_date: parityCreatedAt, id: Number(inserted.lastInsertRowid) };
        report.issueComment = "inserted";
      }
      database
        .prepare("update issue_comment set created_date = ? where id = ?")
        .run(parityCreatedAt, issueComment.id);
      issueComment.created_date = parityCreatedAt;

      database
        .prepare(
          `update issue
              set created_date = (select min(created_date) from issue_comment where issue_id = ?)
            where id = ? and exists (select 1 from issue_comment where issue_id = ?)`,
        )
        .run(issue.id, issue.id, issue.id);

      let post = database
        .prepare("select id, title, body from posting where project_id = ? and number = ? limit 1")
        .get(sampleProject.id, 1);
      if (post?.id) {
        database
          .prepare(
            `update posting
             set title = ?, updated_date = ?, author_id = ?, author_login_id = ?, author_name = ?,
                 num_of_comments = ?, notice = ?, readme = ?, updated_by_author_id = ?, body = ?, history = null
             where id = ?`,
          )
          .run(
            parityProjectSeed.post.title,
            parityCreatedAt,
            adminUser.id,
            "admin",
            adminUser.name ?? "Site Admin",
            1,
            1,
            0,
            adminUser.id,
            parityProjectSeed.post.body,
            post.id,
          );
        report.post =
          post.title !== parityProjectSeed.post.title || post.body !== parityProjectSeed.post.body
            ? "updated"
            : "unchanged";
      } else {
        const inserted = database
          .prepare(
            `insert into posting
              (title, created_date, updated_date, author_id, author_login_id, author_name, project_id,
               number, num_of_comments, notice, readme, parent_id, updated_by_author_id, body, history)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?, null)`,
          )
          .run(
            parityProjectSeed.post.title,
            parityCreatedAt,
            parityCreatedAt,
            adminUser.id,
            "admin",
            adminUser.name ?? "Site Admin",
            sampleProject.id,
            1,
            1,
            1,
            0,
            adminUser.id,
            parityProjectSeed.post.body,
          );
        post = { id: Number(inserted.lastInsertRowid) };
        report.post = "inserted";
      }

      let postComment = database
        .prepare(
          "select id, created_date from posting_comment where posting_id = ? and author_login_id = ? and contents = ? limit 1",
        )
        .get(post.id, "alice", parityProjectSeed.post.commentBody);
      if (!postComment?.id) {
        const inserted = database
          .prepare(
            `insert into posting_comment
              (created_date, author_id, author_login_id, author_name, posting_id, project_id, parent_comment_id, contents)
             values (?, ?, ?, ?, ?, ?, null, ?)`,
          )
          .run(
            parityCreatedAt,
            aliceUser.id,
            "alice",
            "Alice Kim",
            post.id,
            sampleProject.id,
            parityProjectSeed.post.commentBody,
          );
        postComment = { created_date: parityCreatedAt, id: Number(inserted.lastInsertRowid) };
        report.postComment = "inserted";
      }
      database
        .prepare("update posting_comment set created_date = ? where id = ?")
        .run(parityCreatedAt, postComment.id);
      postComment.created_date = parityCreatedAt;

      const ensureNotification = ({
        createdAt,
        message,
        previous,
        resourceId,
        resourceType,
        senderId,
        title,
      }) => {
        let event = database
          .prepare(
            `select id from notification_event
              where sender_id = ? and resource_type = ? and resource_id = ? and event_type = ?
              limit 1`,
          )
          .get(senderId, resourceType, String(resourceId), "NEW_COMMENT");
        if (!event?.id) {
          const inserted = database
            .prepare(
              `insert into notification_event
                (title, sender_id, created, resource_type, resource_id, event_type, old_value, new_value)
               values (?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
              title,
              senderId,
              createdAt,
              resourceType,
              String(resourceId),
              "NEW_COMMENT",
              previous,
              message,
            );
          event = { id: Number(inserted.lastInsertRowid) };
          report.notifications.push(`${resourceType}:inserted`);
        } else {
          database
            .prepare(
              `update notification_event
                  set title = ?, created = ?, old_value = ?, new_value = ?
                where id = ?`,
            )
            .run(title, createdAt, previous, message, event.id);
        }
        if (
          !database
            .prepare(
              `select 1 from notification_event_n4user
                where notification_event_id = ? and n4user_id = ? limit 1`,
            )
            .get(event.id, adminUser.id)
        ) {
          database
            .prepare(
              `insert into notification_event_n4user (notification_event_id, n4user_id)
               values (?, ?)`,
            )
            .run(event.id, adminUser.id);
          report.notifications.push(`${resourceType}:admin-receiver`);
        }
      };

      ensureNotification({
        createdAt: issueComment.created_date,
        message: parityProjectSeed.issue.commentBody,
        previous: `\n\n<br />\n\n--- Original issue from @admin  at 11:24 오전 ---\n\n<br />\n\n${parityProjectSeed.issue.body}`,
        resourceId: issueComment.id,
        resourceType: "issue_comment",
        senderId: bobUserId,
        title: `Re: [sample] ${parityProjectSeed.issue.title} (#1)`,
      });
      ensureNotification({
        createdAt: postComment.created_date,
        message: parityProjectSeed.post.commentBody,
        previous: `\n\n<br />\n\n--- Original posting from @admin  at 11:24 오전 ---\n\n<br />\n\n${parityProjectSeed.post.body}`,
        resourceId: postComment.id,
        resourceType: "posting_comment",
        senderId: aliceUser.id,
        title: `Re: [sample] ${parityProjectSeed.post.title} (1)`,
      });

      database
        .prepare("update project set last_issue_number = ?, last_posting_number = ? where id = ?")
        .run(1, 1, sampleProject.id);

      const sampleWatch = database
        .prepare(
          "select id from watch where user_id = ? and resource_type = ? and resource_id = ? limit 1",
        )
        .get(adminUser.id, "PROJECT", String(sampleProject.id));
      if (!sampleWatch?.id) {
        database
          .prepare("insert into watch (user_id, resource_type, resource_id) values (?, ?, ?)")
          .run(adminUser.id, "PROJECT", String(sampleProject.id));
        report.watchers.push("admin:sample:inserted");
      }

      if (portalProject?.id && carolUser?.id) {
        for (const watcher of [
          { loginId: "admin", userId: Number(adminUser.id) },
          { loginId: "carol", userId: Number(carolUser.id) },
        ]) {
          const existingWatch = database
            .prepare(
              "select id from watch where user_id = ? and resource_type = ? and resource_id = ? limit 1",
            )
            .get(watcher.userId, "PROJECT", String(portalProject.id));
          if (!existingWatch?.id) {
            database
              .prepare("insert into watch (user_id, resource_type, resource_id) values (?, ?, ?)")
              .run(watcher.userId, "PROJECT", String(portalProject.id));
            report.watchers.push(`${watcher.loginId}:inserted`);
          }
        }
      }

      database.exec("commit");
    } catch (error) {
      database.exec("rollback");
      throw error;
    }

    for (const repositorySeed of parityProjectSeed.repositories) {
      const project = database
        .prepare("select id from project where owner = ? and name = ? limit 1")
        .get(repositorySeed.owner, repositorySeed.projectName);
      if (!project?.id) {
        continue;
      }
      report.repositories.push(
        ensureProjectRepositorySeed(runtimeDirectory, Number(project.id), repositorySeed.branches),
      );
      database
        .prepare("update project set last_pushed_date = ? where id = ?")
        .run(timestamp, project.id);
    }

    if (
      report.issue !== "unchanged" ||
      report.issueComment !== "unchanged" ||
      report.issueEvents !== undefined ||
      report.labels.length > 0 ||
      report.milestone !== "unchanged" ||
      report.post !== "unchanged" ||
      report.postComment !== "unchanged" ||
      report.repositories.some((entry) => entry.status !== "unchanged") ||
      report.watchers.length > 0
    ) {
      report.status = "updated";
    }
    return report;
  } finally {
    database.close();
  }
}

export function runDevBackendOnce(env = process.env) {
  const runtimeDirectory = env.YONA_DEV_RUNTIME_DIR
    ? path.resolve(env.YONA_DEV_RUNTIME_DIR)
    : path.join(repoRoot, ".yona-data");
  const configPath = path.join(runtimeDirectory, "dev.toml");
  const databasePath = path.join(runtimeDirectory, "dev.db");
  const basePath = normalizeBasePath(env.YONA_DEV_BASE_PATH);
  const publicOrigin = env.YONA_DEV_PUBLIC_ORIGIN ?? "http://127.0.0.1:3101";

  fs.mkdirSync(runtimeDirectory, { recursive: true });
  const shouldSeed = !fs.existsSync(databasePath) || fs.statSync(databasePath).size === 0;
  fs.closeSync(fs.openSync(databasePath, "a"));

  let siteAdminReconcile = null;
  let paritySeedReconcile = null;
  if (!shouldSeed) {
    siteAdminReconcile = reconcileDefaultDevSiteAdmin(
      databasePath,
      env.YONA_DEV_DEFAULT_ADMIN_LOGIN_ID ?? defaultAdminLoginId,
    );
    if (siteAdminReconcile.status === "inserted") {
      console.log(
        `Reconciled dev site-admin ACL for ${siteAdminReconcile.loginId} in ${path.relative(
          repoRoot,
          databasePath,
        )}`,
      );
    }

    paritySeedReconcile = reconcileDefaultDevParitySeed(databasePath, runtimeDirectory);
    if (paritySeedReconcile.status === "updated") {
      console.log(
        `Reconciled dev parity seed in ${path.relative(repoRoot, databasePath)} and ${path.relative(
          repoRoot,
          path.join(runtimeDirectory, "repo"),
        )}`,
      );
    }
  }

  const relativeDatabasePath = path.relative(repoRoot, databasePath).replace(/\\/g, "/");
  const normalizedDatabasePath = relativeDatabasePath.startsWith(".")
    ? relativeDatabasePath
    : `./${relativeDatabasePath}`;

  const config = [
    `database_url = ${JSON.stringify(`sqlite://${normalizedDatabasePath}?mode=rwc`)}`,
    `public_origin = ${JSON.stringify(publicOrigin)}`,
    'schema_policy = "up"',
    `seed_pilot = ${shouldSeed ? "true" : "false"}`,
    "use_embedded_assets = false",
  ].join("\n");

  fs.writeFileSync(configPath, `${config}\n`);

  const child = spawn("cargo", ["run", "-p", "yoram-server", "--bin", "yoram"], {
    cwd: repoRoot,
    env: {
      ...env,
      YONA_BASE_PATH: basePath,
      YORAM_CONFIG_TOML: configPath,
    },
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });

  return {
    configPath,
    databasePath,
    paritySeedReconcile,
    runtimeDirectory,
    shouldSeed,
    siteAdminReconcile,
  };
}

const isMainModule =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  runDevBackendOnce();
}
