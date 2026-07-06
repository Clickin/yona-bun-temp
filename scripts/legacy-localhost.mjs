import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { basename, resolve } from "node:path";
import process from "node:process";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const frontendRequire = createRequire(new URL("../frontend/package.json", import.meta.url));
const defaultVersion = process.env.YONA_LEGACY_VERSION ?? "1.16.0";
const defaultPort = numberValue(process.env.YONA_LEGACY_PORT, 19100);
const defaultHost = process.env.YONA_LEGACY_HOST ?? "127.0.0.1";
const defaultInstance = process.env.YONA_LEGACY_INSTANCE ?? "default";
const defaultReleaseUrl =
  process.env.YONA_LEGACY_RELEASE_URL ??
  `https://github.com/yona-projects/yona/releases/download/v${defaultVersion}/yona-h2-v${defaultVersion}-bin.zip`;
const defaultWorkspaceDir = resolve(repoRoot, ".agent/legacy-localhost");
const defaultAdminLoginId = process.env.YONA_LEGACY_ADMIN_LOGIN_ID ?? "admin";
const defaultAdminEmail = process.env.YONA_LEGACY_ADMIN_EMAIL ?? "admin@example.com";
const defaultAdminName = process.env.YONA_LEGACY_ADMIN_NAME ?? "Site Admin";
const defaultAdminPassword = process.env.YONA_LEGACY_ADMIN_PASSWORD ?? "admin";
const defaultSecret =
  "VA2v:_I=h9>?FYOH:@ZhW]01P<mWZAKlQ>kk>Bo`mdCiA>pDw64FcBuZdDh<47Ew";
const parityFoundationUsers = [
  {
    email: "alice@example.com",
    loginId: "alice",
    name: "Alice Kim",
    password: "alice",
  },
  {
    email: "carol@example.com",
    loginId: "carol",
    name: "Carol Lee",
    password: "carol",
  },
];
const parityFoundationOrganizations = [
  {
    descr: "Parity seed organization for localhost legacy verification",
    name: "weblabs",
  },
];
const parityFoundationOrganizationMembers = [
  {
    loginId: "carol",
    organizationName: "weblabs",
  },
];
const parityFoundationProjects = [
  {
    actorLoginId: defaultAdminLoginId,
    actorPassword: null,
    name: "sample",
    owner: defaultAdminLoginId,
    overview: "Parity seed project for the admin workspace",
    projectScope: "PUBLIC",
    vcs: "GIT",
  },
  {
    actorLoginId: defaultAdminLoginId,
    actorPassword: null,
    name: "svnplayground",
    owner: defaultAdminLoginId,
    overview: "Parity seed Subversion project for localhost checks",
    projectScope: "PUBLIC",
    vcs: "Subversion",
  },
  {
    actorLoginId: "alice",
    actorPassword: "alice",
    name: "sample",
    owner: "alice",
    overview: "Parity seed project for the alice workspace",
    projectScope: "PUBLIC",
    vcs: "GIT",
  },
  {
    actorLoginId: defaultAdminLoginId,
    actorPassword: null,
    name: "portal",
    owner: "weblabs",
    overview: "Protected organization project for localhost parity",
    projectScope: "PROTECTED",
    vcs: "GIT",
  },
];
const parityFoundationProjectMembers = [
  {
    loginId: "carol",
    owner: "weblabs",
    projectName: "portal",
  },
];
const parityFoundationRootPaths = [
  "/admin/sample",
  "/admin/svnplayground",
  "/alice/sample",
  "/organizations/weblabs",
  "/weblabs/portal",
];
const parityContentUsers = [
  {
    email: "bob@example.com",
    loginId: "bob",
    name: "Bob Park",
    password: "bob",
  },
];
const parityContentLabels = [
  {
    category: "type",
    categoryIsExclusive: false,
    color: "#f44336",
    name: "bug",
    owner: defaultAdminLoginId,
    projectName: "sample",
  },
  {
    category: "area",
    categoryIsExclusive: false,
    color: "#2196f3",
    name: "parity",
    owner: defaultAdminLoginId,
    projectName: "sample",
  },
];
const parityContentMilestone = {
  contents: "Milestone for local legacy parity verification screens.",
  dueDate: "2026-07-31",
  owner: defaultAdminLoginId,
  path: "/admin/sample/milestone/1",
  projectName: "sample",
  state: "OPEN",
  title: "Parity launch",
};
const parityContentIssue = {
  assigneeLoginId: "alice",
  body: "Use this issue to verify labels, assignee, milestone, and timeline rendering in the converted frontend.",
  dueDate: "2026-07-24",
  labelKeys: ["type::bug", "area::parity"],
  milestoneTitle: "Parity launch",
  owner: defaultAdminLoginId,
  path: "/admin/sample/issue/1",
  projectName: "sample",
  title: "Review rail parity check",
};
const parityContentIssueComment = {
  body: "I can reproduce the legacy issue view from this seed.",
  issueNumber: 1,
  issueOwner: defaultAdminLoginId,
  issueProjectName: "sample",
  loginId: "bob",
  password: "bob",
};
const parityContentPost = {
  body: "This board post exists to seed the legacy board list and detail flows.",
  notice: true,
  owner: defaultAdminLoginId,
  path: "/admin/sample/post/1",
  projectName: "sample",
  title: "Seed notes",
};
const parityContentPostComment = {
  body: "Board seed confirmed from the fork contributor side.",
  loginId: "alice",
  owner: defaultAdminLoginId,
  password: "alice",
  postNumber: 1,
  projectName: "sample",
};
const parityContentProjectWatchers = [
  {
    displayName: defaultAdminName,
    loginId: defaultAdminLoginId,
    owner: "weblabs",
    password: null,
    projectName: "portal",
  },
  {
    displayName: "Carol Lee",
    loginId: "carol",
    owner: "weblabs",
    password: "carol",
    projectName: "portal",
  },
];
const parityContentVerificationPages = [
  {
    path: "/admin/sample/milestones",
    texts: ["Parity launch", "Review rail parity check", "2026-07-31"],
  },
  {
    path: "/admin/sample/issue/1",
    texts: [
      "Review rail parity check",
      "Use this issue to verify labels, assignee, milestone, and timeline rendering in the converted frontend.",
      "I can reproduce the legacy issue view from this seed.",
      "Bob Park",
      "Alice Kim",
      "Parity launch",
      "bug",
      "parity",
    ],
  },
  {
    path: "/admin/sample/posts",
    texts: ["Seed notes"],
  },
  {
    path: "/admin/sample/post/1",
    texts: [
      "Seed notes",
      "This board post exists to seed the legacy board list and detail flows.",
      "Board seed confirmed from the fork contributor side.",
      "Alice Kim",
    ],
  },
  {
    path: "/weblabs/portal/watchers",
    texts: [defaultAdminName, "Carol Lee"],
  },
];

export async function main(argv = process.argv.slice(2)) {
  const [command = "help", ...rawArgs] = argv;
  const options = parseArgs(rawArgs);
  const layout = buildLayout({
    host: stringValue(options.host, defaultHost),
    instance: stringValue(options.instance, defaultInstance),
    port: numberValue(options.port, defaultPort),
    releaseUrl: stringValue(options.releaseUrl, defaultReleaseUrl),
    version: stringValue(options.version, defaultVersion),
    workspaceDir: stringValue(options.workspaceDir, defaultWorkspaceDir),
  });

  switch (command) {
    case "help":
      printHelp();
      break;
    case "prepare":
      await prepare(layout, options);
      break;
    case "start":
      await start(layout, options);
      break;
    case "stop":
      await stop(layout);
      break;
    case "status":
      await status(layout);
      break;
    case "seed-admin":
      await seedAdmin(layout, options);
      break;
    case "seed-parity-foundation":
      await seedParityFoundation(layout, options);
      break;
    case "seed-parity-content":
      await seedParityContent(layout, options);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
  }
}

function buildLayout(input) {
  const cacheDir = resolve(input.workspaceDir, "cache");
  const distRoot = resolve(input.workspaceDir, "dist", `yona-h2-v${input.version}`);
  const installDir = resolve(distRoot, `yona-${input.version}`);
  const instanceDir = resolve(input.workspaceDir, "instances", input.instance);
  const jdkCacheDir = resolve(cacheDir, "jdk");
  const jdkRootDir = resolve(input.workspaceDir, "jdks");
  const dataDir = resolve(instanceDir, "data");
  const confDir = resolve(dataDir, "conf");
  const dbDir = resolve(dataDir, "db");
  const logDir = resolve(dataDir, "logs");
  const runDir = resolve(instanceDir, "run");
  const zipPath = resolve(cacheDir, `yona-h2-v${input.version}-bin.zip`);
  const pidFile = resolve(runDir, "legacy-yona.pid");
  const logFile = resolve(runDir, "legacy-yona.log");
  const metadataFile = resolve(instanceDir, "metadata.json");
  const parityFoundationSeedFile = resolve(instanceDir, "parity-foundation.json");
  const parityContentSeedFile = resolve(instanceDir, "parity-content.json");
  const runningPidFile = resolve(installDir, "RUNNING_PID");
  return {
    ...input,
    cacheDir,
    confDir,
    dataDir,
    dbDir,
    distRoot,
    installDir,
    instanceDir,
    jdkCacheDir,
    jdkRootDir,
    logDir,
    logFile,
    metadataFile,
    parityContentSeedFile,
    parityFoundationSeedFile,
    pidFile,
    runDir,
    runningPidFile,
    zipPath,
  };
}

async function prepare(layout, options) {
  mkdirSync(layout.cacheDir, { recursive: true });
  mkdirSync(layout.distRoot, { recursive: true });
  mkdirSync(layout.confDir, { recursive: true });
  mkdirSync(layout.dbDir, { recursive: true });
  mkdirSync(layout.jdkCacheDir, { recursive: true });
  mkdirSync(layout.jdkRootDir, { recursive: true });
  mkdirSync(layout.logDir, { recursive: true });
  mkdirSync(layout.runDir, { recursive: true });

  if (!existsSync(layout.zipPath) || options.forceDownload) {
    if (options.forceDownload && existsSync(layout.zipPath)) {
      rmSync(layout.zipPath);
    }
    runOrThrow("curl", ["-fL", layout.releaseUrl, "-o", layout.zipPath], {
      label: "download legacy Yona release",
    });
  }

  if (!existsSync(layout.installDir) || options.forceExtract) {
    if (options.forceExtract && existsSync(layout.distRoot)) {
      rmSync(layout.distRoot, { force: true, recursive: true });
      mkdirSync(layout.distRoot, { recursive: true });
    }
    runOrThrow("unzip", ["-q", layout.zipPath, "-d", layout.distRoot], {
      label: "extract legacy Yona release",
    });
  }

  const javaHome = ensureJava8Home(layout, options);
  const javaVersion = readJavaVersion(resolve(javaHome, "bin/java"));
  if (!javaVersion.startsWith("1.8") && !javaVersion.startsWith("8")) {
    throw new Error(`Expected Java 8, found ${javaVersion} at ${javaHome}`);
  }

  const forceConfig = Boolean(options.forceConfig);
  const applicationConfPath = resolve(layout.confDir, "application.conf");
  const loggerConfPath = resolve(layout.confDir, "application-logger.xml");
  const socialLoginConfPath = resolve(layout.confDir, "social-login.conf");

  if (forceConfig || !existsSync(applicationConfPath)) {
    const source = readBundledFile(layout, "application.conf.default");
    writeFileSync(applicationConfPath, rewriteApplicationConf(source, layout), "utf8");
  }
  if (forceConfig || !existsSync(loggerConfPath)) {
    writeFileSync(
      loggerConfPath,
      readBundledFile(layout, "application-logger.xml.default"),
      "utf8",
    );
  }
  if (forceConfig || !existsSync(socialLoginConfPath)) {
    writeFileSync(
      socialLoginConfPath,
      readBundledFile(layout, "social-login.conf.default"),
      "utf8",
    );
  }

  writeFileSync(
    layout.metadataFile,
    JSON.stringify(
      {
        preparedAt: new Date().toISOString(),
        host: layout.host,
        instance: layout.instance,
        javaHome,
        port: layout.port,
        releaseUrl: layout.releaseUrl,
        version: layout.version,
        paths: {
          applicationConfPath,
          dataDir: layout.dataDir,
          installDir: layout.installDir,
          logFile: layout.logFile,
          parityContentSeedFile: layout.parityContentSeedFile,
          parityFoundationSeedFile: layout.parityFoundationSeedFile,
          runningPidFile: layout.runningPidFile,
          socialLoginConfPath,
          zipPath: layout.zipPath,
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(JSON.stringify({
    applicationConfPath,
    host: layout.host,
    installDir: layout.installDir,
    javaHome,
    logFile: layout.logFile,
    port: layout.port,
    releaseUrl: layout.releaseUrl,
    version: layout.version,
  }, null, 2));
}

async function start(layout, options) {
  await prepare(layout, options);
  cleanupStalePidFiles(layout);
  const managedProcess = resolveManagedPid(layout);
  if (managedProcess) {
    console.log(`legacy localhost already running with pid ${managedProcess.pid}`);
    return;
  }

  if (!(await isPortAvailable(layout.host, layout.port))) {
    throw new Error(`Port ${layout.port} on ${layout.host} is already in use`);
  }

  const javaHome = ensureJava8Home(layout, options);
  const env = {
    ...process.env,
    YONA_DATA: layout.dataDir,
    YONA_HOME: layout.installDir,
  };
  mkdirSync(layout.runDir, { recursive: true });
  const logFd = openSync(layout.logFile, "a");
  const child = spawn(
    resolve(layout.installDir, "bin/yona"),
    ["-java-home", javaHome, `-Dhttp.address=${layout.host}`, `-Dhttp.port=${layout.port}`],
    {
      cwd: layout.installDir,
      detached: true,
      env,
      stdio: ["ignore", logFd, logFd],
    },
  );
  child.unref();
  writeFileSync(layout.pidFile, `${child.pid}\n`, "utf8");
  await waitForHttp(`http://${layout.host}:${layout.port}/users/loginform`, 30_000);
  const startedProcess =
    (await waitForManagedPid(layout, 10_000)) ??
    (isProcessAlive(child.pid) && commandMatchesLayout(readProcessCommand(child.pid), layout)
      ? { command: readProcessCommand(child.pid), pid: child.pid, source: "spawn" }
      : null);
  if (!startedProcess) {
    rmSync(layout.pidFile, { force: true });
    const listenerPid = findListenerPid(layout.port);
    if (listenerPid && !commandMatchesLayout(readProcessCommand(listenerPid), layout)) {
      throw new Error(
        `Port ${layout.port} is now served by pid ${listenerPid}, but it is not this harness-managed legacy instance.`,
      );
    }
    throw new Error(
      `Legacy localhost responded on http://${layout.host}:${layout.port}, but the harness could not resolve a managed pid.`,
    );
  }
  writeFileSync(layout.pidFile, `${startedProcess.pid}\n`, "utf8");
  console.log(
    `legacy localhost started at http://${layout.host}:${layout.port} (pid ${startedProcess.pid}); log: ${layout.logFile}`,
  );
}

async function stop(layout) {
  const managedProcess = resolveManagedPid(layout);
  if (!managedProcess) {
    const listenerPid = findListenerPid(layout.port);
    if (listenerPid) {
      console.log(
        `legacy localhost is reachable on ${layout.host}:${layout.port}, but pid ${listenerPid} is not managed by this harness`,
      );
      return;
    }
    console.log("legacy localhost is not running");
    return;
  }
  process.kill(managedProcess.pid, "SIGTERM");
  await waitForProcessExit(managedProcess.pid, 15_000);
  rmSync(layout.pidFile, { force: true });
  console.log(`stopped legacy localhost pid ${managedProcess.pid}`);
}

async function status(layout) {
  const managedProcess = resolveManagedPid(layout);
  const pidFilePid = readPid(layout.pidFile);
  const listenerPid = findListenerPid(layout.port);
  const javaHome = safeResolveJava8Home(layout);
  const baseUrl = `http://${layout.host}:${layout.port}`;
  const loginProbe = await probeHttp(`${baseUrl}/users/loginform`);
  const secretProbe = await probeSecretBootstrap(`${baseUrl}/secret`);
  const secretRotated = hasRotatedSecret(layout) || secretProbe.complete;
  console.log(
    JSON.stringify(
      {
        host: layout.host,
        installDir: layout.installDir,
        instance: layout.instance,
        javaHome,
        loginProbe,
        listenerManaged: listenerPid
          ? commandMatchesLayout(readProcessCommand(listenerPid), layout)
          : false,
        listenerPid,
        logFile: layout.logFile,
        managedPid: managedProcess?.pid ?? null,
        managedPidSource: managedProcess?.source ?? null,
        managedRunning: Boolean(managedProcess),
        parityContentSeedFile: layout.parityContentSeedFile,
        parityContentSeeded: existsSync(layout.parityContentSeedFile),
        parityFoundationSeedFile: layout.parityFoundationSeedFile,
        parityFoundationSeeded: existsSync(layout.parityFoundationSeedFile),
        pid: managedProcess?.pid ?? null,
        pidAlive: Boolean(managedProcess),
        pidFilePid,
        port: layout.port,
        prepared: existsSync(layout.metadataFile),
        running: Boolean(managedProcess) || loginProbe.ok,
        secretProbe,
        secretRotated,
        url: baseUrl,
      },
      null,
      2,
    ),
  );
}

async function seedAdmin(layout, options) {
  const { chromium } = frontendRequire("@playwright/test");
  const name = stringValue(options.name, defaultAdminName);
  const email = stringValue(options.email, defaultAdminEmail);
  const password = stringValue(options.password, defaultAdminPassword);
  const restartAfterSeed = Boolean(options.restart);
  const secretPageUrl = `http://${layout.host}:${layout.port}/secret`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  await page.goto(secretPageUrl, { waitUntil: "networkidle", timeout: 30_000 });

  if ((await page.locator("form input#loginId").count()) === 0) {
    const currentUrl = page.url();
    await browser.close();
    console.log(`admin seed step skipped; /secret is no longer active (${currentUrl})`);
    return;
  }

  await page.fill("#uname", name);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.fill("#retypedPassword", password);
  await Promise.all([
    page.waitForLoadState("networkidle").catch(() => {}),
    page.locator('button[type="submit"]').click(),
  ]);

  const restartNotice = page.locator(".secret-box");
  await restartNotice.waitFor({ state: "visible", timeout: 30_000 });
  const bodyText = await page.locator("body").innerText();
  await browser.close();

  if (!bodyText.includes("Server needs to be restarted")) {
    throw new Error("Expected restart notice after site-admin setup");
  }
  if (!hasRotatedSecret(layout)) {
    throw new Error("Expected application.secret to change after site-admin setup");
  }

  console.log("site-admin bootstrap submitted successfully; legacy Yona now requires a restart");
  if (restartAfterSeed) {
    await stop(layout);
    await start(layout, options);
  }
}

async function seedParityFoundation(layout, options) {
  const { chromium } = frontendRequire("@playwright/test");
  const adminPassword = stringValue(options.adminPassword, defaultAdminPassword);
  const baseUrl = `http://${layout.host}:${layout.port}`;
  await waitForHttp(`${baseUrl}/users/loginform`, 30_000);
  await assertBootstrapReady(layout, baseUrl);

  const report = {
    baseUrl,
    organizationMembers: [],
    organizations: [],
    projectMembers: [],
    projects: [],
    rootChecks: [],
    seededAt: new Date().toISOString(),
    users: [],
  };
  const browser = await chromium.launch({ headless: true });
  try {
    const adminSession = await createAuthenticatedSession(browser, baseUrl, {
      loginId: defaultAdminLoginId,
      password: adminPassword,
    });
    try {
      for (const organization of parityFoundationOrganizations) {
        report.organizations.push(
          await ensureParityFoundationOrganization(adminSession.page, baseUrl, organization),
        );
      }
      for (const member of parityFoundationOrganizationMembers) {
        if (!report.users.some((entry) => entry.loginId === member.loginId)) {
          const organizationMemberPath = `/organizations/${member.organizationName}/members`;
          await adminSession.page.goto(`${baseUrl}${organizationMemberPath}`, {
            timeout: 30_000,
            waitUntil: "networkidle",
          });
          if (!(await listContainsUserId(adminSession.page, ".member-id", member.loginId))) {
            const memberUser =
              parityFoundationUsers.find((entry) => entry.loginId === member.loginId) ?? {
                email: `${member.loginId}@example.com`,
                loginId: member.loginId,
                name: member.loginId,
                password: member.loginId,
              };
            report.users.push(await ensureParityFoundationUser(browser, baseUrl, memberUser));
          }
        }
        report.organizationMembers.push(
          await ensureParityFoundationOrganizationMember(adminSession.page, baseUrl, member),
        );
      }

      for (const project of parityFoundationProjects) {
        const projectPath = `/${project.owner}/${project.name}`;
        if (await legacyRouteExists(adminSession.page, `${baseUrl}${projectPath}`)) {
          report.projects.push({
            created: false,
            name: project.name,
            owner: project.owner,
            path: projectPath,
            projectScope: project.projectScope,
            type: "project",
            vcs: project.vcs,
          });
          if (project.actorLoginId !== defaultAdminLoginId) {
            report.users.push({
              authenticationVerified: false,
              created: false,
              loginId: project.actorLoginId,
              path: `/${project.actorLoginId}`,
              type: "user",
            });
          }
          continue;
        }

        const actorPassword =
          project.actorLoginId === defaultAdminLoginId ? adminPassword : project.actorPassword;
        if (project.actorLoginId !== defaultAdminLoginId) {
          const actorUser =
            parityFoundationUsers.find((entry) => entry.loginId === project.actorLoginId) ?? {
              email: `${project.actorLoginId}@example.com`,
              loginId: project.actorLoginId,
              name: project.actorLoginId,
              password: actorPassword,
            };
          report.users.push(await ensureParityFoundationUser(browser, baseUrl, actorUser));
        }
        const actorSession = await createAuthenticatedSession(browser, baseUrl, {
          loginId: project.actorLoginId,
          password: actorPassword,
        });
        try {
          report.projects.push(
            await ensureParityFoundationProject(actorSession.page, baseUrl, project),
          );
        } finally {
          await actorSession.close();
        }
      }

      for (const user of parityFoundationUsers) {
        if (report.users.some((entry) => entry.loginId === user.loginId)) {
          continue;
        }
        const adoptedExisting =
          report.organizationMembers.some((entry) => entry.loginId === user.loginId) ||
          report.projectMembers.some((entry) => entry.loginId === user.loginId) ||
          report.projects.some((entry) => entry.owner === user.loginId);
        if (adoptedExisting) {
          report.users.push({
            authenticationVerified: false,
            created: false,
            loginId: user.loginId,
            path: `/${user.loginId}`,
            type: "user",
          });
          continue;
        }
        report.users.push(await ensureParityFoundationUser(browser, baseUrl, user));
      }

      for (const member of parityFoundationProjectMembers) {
        report.projectMembers.push(
          await ensureParityFoundationProjectMember(adminSession.page, baseUrl, member),
        );
      }
      report.rootChecks = await verifyParityFoundationRoots(
        adminSession.page,
        baseUrl,
        parityFoundationRootPaths,
      );
    } finally {
      await adminSession.close();
    }

    writeFileSync(layout.parityFoundationSeedFile, JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

async function seedParityContent(layout, options) {
  const { chromium } = frontendRequire("@playwright/test");
  const adminPassword = stringValue(options.adminPassword, defaultAdminPassword);
  const baseUrl = `http://${layout.host}:${layout.port}`;
  await waitForHttp(`${baseUrl}/users/loginform`, 30_000);
  await assertBootstrapReady(layout, baseUrl);

  const report = {
    baseUrl,
    issue: null,
    issueComment: null,
    labels: [],
    milestone: null,
    post: null,
    postComment: null,
    seededAt: new Date().toISOString(),
    users: [],
    verificationPages: [],
    watchers: [],
  };
  const browser = await chromium.launch({ headless: true });
  try {
    const adminSession = await createAuthenticatedSession(browser, baseUrl, {
      loginId: defaultAdminLoginId,
      password: adminPassword,
    });
    try {
      await assertParityContentPrerequisiteRoots(adminSession.page, baseUrl);
      for (const label of parityContentLabels) {
        report.labels.push(await ensureParityContentLabel(adminSession.page, baseUrl, label));
      }
      report.milestone = await ensureParityContentMilestone(
        adminSession.page,
        baseUrl,
        parityContentMilestone,
      );
      report.issue = await ensureParityContentIssue(adminSession.page, baseUrl, parityContentIssue);
      report.post = await ensureParityContentPost(adminSession.page, baseUrl, parityContentPost);

      const issuePath = report.issue?.path ?? parityContentIssue.path;
      if (await legacyPathContainsTexts(adminSession.page, baseUrl, issuePath, [
        parityContentIssueComment.body,
        "Bob Park",
      ])) {
        report.issueComment = {
          body: parityContentIssueComment.body,
          created: false,
          issuePath,
          loginId: parityContentIssueComment.loginId,
          type: "issue-comment",
        };
        report.users.push({
          authenticationVerified: false,
          created: false,
          loginId: parityContentIssueComment.loginId,
          path: `/${parityContentIssueComment.loginId}`,
          type: "user",
        });
      } else {
        report.users.push(await ensureParityFoundationUser(browser, baseUrl, {
          ...parityContentUsers[0],
          loginId: parityContentIssueComment.loginId,
          password: parityContentIssueComment.password,
        }));
        const bobSession = await createAuthenticatedSession(browser, baseUrl, {
          loginId: parityContentIssueComment.loginId,
          password: parityContentIssueComment.password,
        });
        try {
          report.issueComment = await ensureParityContentIssueComment(bobSession.page, baseUrl, {
            ...parityContentIssueComment,
            issuePath,
          });
        } finally {
          await bobSession.close();
        }
      }

      const postPath = report.post?.path ?? parityContentPost.path;
      if (await legacyPathContainsTexts(adminSession.page, baseUrl, postPath, [
        parityContentPostComment.body,
        "Alice Kim",
      ])) {
        report.postComment = {
          body: parityContentPostComment.body,
          created: false,
          loginId: parityContentPostComment.loginId,
          postPath,
          type: "post-comment",
        };
      } else {
        const aliceSession = await createAuthenticatedSession(browser, baseUrl, {
          loginId: parityContentPostComment.loginId,
          password: parityContentPostComment.password,
        });
        try {
          report.postComment = await ensureParityContentPostComment(aliceSession.page, baseUrl, {
            ...parityContentPostComment,
            postPath,
          });
        } finally {
          await aliceSession.close();
        }
      }

      for (const watcher of parityContentProjectWatchers) {
        const watchersPath = `/${watcher.owner}/${watcher.projectName}/watchers`;
        if (await legacyPathContainsTexts(adminSession.page, baseUrl, watchersPath, [
          watcher.displayName,
        ])) {
          report.watchers.push({
            created: false,
            displayName: watcher.displayName,
            loginId: watcher.loginId,
            owner: watcher.owner,
            path: watchersPath,
            projectName: watcher.projectName,
            type: "watcher",
          });
          continue;
        }
        const session = await createAuthenticatedSession(browser, baseUrl, {
          loginId: watcher.loginId,
          password: watcher.password ?? adminPassword,
        });
        try {
          report.watchers.push(
            await ensureParityContentProjectWatcher(session.page, baseUrl, watcher),
          );
        } finally {
          await session.close();
        }
      }
    } finally {
      await adminSession.close();
    }

    const verifySession = await createAuthenticatedSession(browser, baseUrl, {
      loginId: defaultAdminLoginId,
      password: adminPassword,
    });
    try {
      report.verificationPages = await verifyParityContentPages(
        verifySession.page,
        baseUrl,
        buildParityContentVerificationPages(report),
      );
    } finally {
      await verifySession.close();
    }

    writeFileSync(layout.parityContentSeedFile, JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith("--")) {
      continue;
    }
    const key = current.slice(2);
    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      options[camelCase(key)] = next;
      index += 1;
    } else {
      options[camelCase(key)] = true;
    }
  }
  return options;
}

function printHelp() {
  console.log(`legacy-localhost usage

Commands:
  node scripts/legacy-localhost.mjs prepare
  node scripts/legacy-localhost.mjs start
  node scripts/legacy-localhost.mjs stop
  node scripts/legacy-localhost.mjs status
  node scripts/legacy-localhost.mjs seed-admin [--name NAME --email EMAIL --password PASSWORD] [--restart]
  node scripts/legacy-localhost.mjs seed-parity-foundation [--admin-password PASSWORD]
  node scripts/legacy-localhost.mjs seed-parity-content [--admin-password PASSWORD]

Options:
  --version <value>        Legacy Yona version. Default: ${defaultVersion}
  --release-url <value>    Release zip URL. Default: ${defaultReleaseUrl}
  --workspace-dir <path>   Working directory. Default: ${defaultWorkspaceDir}
  --instance <name>        Instance name under .agent/legacy-localhost/instances. Default: ${defaultInstance}
  --host <value>           Bind host. Default: ${defaultHost}
  --port <value>           Bind port. Default: ${defaultPort}
  --java-home <path>       Explicit Java 8 home. Overrides auto-detection.
  --java-url <value>       Portable Java 8 archive URL. Used when auto-detection misses.
  --force-download         Re-download the release zip.
  --force-extract          Re-extract the release zip.
  --force-java-download    Re-download the portable Java 8 archive.
  --force-java-extract     Re-extract the portable Java 8 archive.
  --force-config           Rewrite generated conf files.

Environment:
  YONA_LEGACY_VERSION
  YONA_LEGACY_RELEASE_URL
  YONA_LEGACY_INSTANCE
  YONA_LEGACY_HOST
  YONA_LEGACY_PORT
  YONA_LEGACY_JAVA_HOME
  YONA_LEGACY_JAVA_URL
  YONA_LEGACY_ADMIN_NAME
  YONA_LEGACY_ADMIN_LOGIN_ID
  YONA_LEGACY_ADMIN_EMAIL
  YONA_LEGACY_ADMIN_PASSWORD
`);
}

async function createAuthenticatedSession(browser, baseUrl, credentials) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  const loggedIn = await loginWithPassword(page, baseUrl, credentials.loginId, credentials.password);
  if (!loggedIn) {
    await context.close();
    throw new Error(
      `Failed to authenticate ${credentials.loginId} on ${baseUrl}. Check the seed credentials or reset the instance.`,
    );
  }
  return {
    context,
    async close() {
      await context.close();
    },
    page,
  };
}

async function ensureParityFoundationUser(browser, baseUrl, user) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  try {
    if (await loginWithPassword(page, baseUrl, user.loginId, user.password)) {
      return { created: false, loginId: user.loginId, path: `/${user.loginId}`, type: "user" };
    }

    await page.goto(`${baseUrl}/users/signupform`, {
      timeout: 30_000,
      waitUntil: "networkidle",
    });
    await requireLocator(page, "#loginId", "/users/signupform");
    await page.fill("#loginId", user.loginId);
    await page.fill("#uname", user.name);
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.fill("#retypedPassword", user.password);
    await submitFormAndWaitForNavigation(
      page,
      'form[name="signup"]',
      (url) => !url.pathname.endsWith("/users/signupform"),
    );

    const verifyContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const verifyPage = await verifyContext.newPage();
    try {
      const verified = await loginWithPassword(
        verifyPage,
        baseUrl,
        user.loginId,
        user.password,
      );
      if (!verified) {
        throw new Error(
          `Created ${user.loginId} but could not log in with the seeded password. The instance may require manual cleanup.`,
        );
      }
    } finally {
      await verifyContext.close();
    }

    return { created: true, loginId: user.loginId, path: `/${user.loginId}`, type: "user" };
  } finally {
    await context.close();
  }
}

async function ensureParityFoundationOrganization(page, baseUrl, organization) {
  const path = `/organizations/${organization.name}`;
  if (await legacyRouteExists(page, `${baseUrl}${path}`)) {
    return { created: false, name: organization.name, path, type: "organization" };
  }

  await page.goto(`${baseUrl}/organizations/new`, {
    timeout: 30_000,
    waitUntil: "networkidle",
  });
  await requireLocator(page, 'form[name="new-org"]', "/organizations/new");
  await page.fill("#name", organization.name);
  await page.fill("#descr", organization.descr);
  await submitFormAndWaitForNavigation(
    page,
    'form[name="new-org"]',
    (url) => url.pathname === path,
  );
  if (!(await legacyRouteExists(page, `${baseUrl}${path}`))) {
    throw new Error(`Expected organization ${organization.name} to exist after creation.`);
  }

  return { created: true, name: organization.name, path, type: "organization" };
}

async function ensureParityFoundationOrganizationMember(page, baseUrl, member) {
  const path = `/organizations/${member.organizationName}/members`;
  await page.goto(`${baseUrl}${path}`, {
    timeout: 30_000,
    waitUntil: "networkidle",
  });
  if (await listContainsUserId(page, ".member-id", member.loginId)) {
    return {
      created: false,
      loginId: member.loginId,
      organizationName: member.organizationName,
      path,
      type: "organization-member",
    };
  }

  await page.fill("form#addNewMember #loginId", member.loginId);
  await submitFormAndWaitForNavigation(
    page,
    "form#addNewMember",
    (url) => url.pathname === path,
  );
  if (!(await listContainsUserId(page, ".member-id", member.loginId))) {
    throw new Error(
      `Expected ${member.loginId} to appear in ${member.organizationName} members after creation.`,
    );
  }

  return {
    created: true,
    loginId: member.loginId,
    organizationName: member.organizationName,
    path,
    type: "organization-member",
  };
}

async function ensureParityFoundationProject(page, baseUrl, project) {
  const path = `/${project.owner}/${project.name}`;
  if (await legacyRouteExists(page, `${baseUrl}${path}`)) {
    return {
      created: false,
      name: project.name,
      owner: project.owner,
      path,
      projectScope: project.projectScope,
      type: "project",
      vcs: project.vcs,
    };
  }

  await page.goto(`${baseUrl}/projectform?owner=${project.owner}`, {
    timeout: 30_000,
    waitUntil: "networkidle",
  });
  await requireLocator(page, "#newProjectForm", "/projectform");
  await page.selectOption("#project-owner", project.owner);
  await page.fill("#project-name", project.name);
  await page.fill("#description", project.overview);
  await page.selectOption("#vcs", project.vcs);
  const scopeId = `#${project.projectScope.toLowerCase()}`;
  await page.locator(scopeId).check({ force: true });
  await submitFormAndWaitForNavigation(
    page,
    "#newProjectForm",
    (url) => url.pathname === path,
  );
  if (!(await legacyRouteExists(page, `${baseUrl}${path}`))) {
    throw new Error(`Expected project ${project.owner}/${project.name} to exist after creation.`);
  }

  return {
    created: true,
    name: project.name,
    owner: project.owner,
    path,
    projectScope: project.projectScope,
    type: "project",
    vcs: project.vcs,
  };
}

async function ensureParityFoundationProjectMember(page, baseUrl, member) {
  const path = `/${member.owner}/${member.projectName}/members`;
  await page.goto(`${baseUrl}${path}`, {
    timeout: 30_000,
    waitUntil: "networkidle",
  });
  if (await listContainsUserId(page, ".member-id", member.loginId)) {
    return {
      created: false,
      loginId: member.loginId,
      owner: member.owner,
      path,
      projectName: member.projectName,
      type: "project-member",
    };
  }

  await page.fill("form#addNewMember #loginId", member.loginId);
  await submitFormAndWaitForNavigation(
    page,
    "form#addNewMember",
    (url) => url.pathname === path,
  );
  if (!(await listContainsUserId(page, ".member-id", member.loginId))) {
    throw new Error(
      `Expected ${member.loginId} to appear in ${member.owner}/${member.projectName} members after creation.`,
    );
  }

  return {
    created: true,
    loginId: member.loginId,
    owner: member.owner,
    path,
    projectName: member.projectName,
    type: "project-member",
  };
}

async function verifyParityFoundationRoots(page, baseUrl, roots) {
  const checks = [];
  for (const path of roots) {
    const ok = await legacyRouteExists(page, `${baseUrl}${path}`);
    if (!ok) {
      throw new Error(`Expected parity foundation root ${path} to be reachable.`);
    }
    checks.push({ ok, path });
  }
  return checks;
}

async function assertParityContentPrerequisiteRoots(page, baseUrl) {
  const requiredPaths = [
    `/${parityContentMilestone.owner}/${parityContentMilestone.projectName}`,
    `/${parityContentProjectWatchers[0].owner}/${parityContentProjectWatchers[0].projectName}`,
  ];
  for (const path of requiredPaths) {
    if (!(await legacyRouteExists(page, `${baseUrl}${path}`))) {
      throw new Error(
        `Expected prerequisite root ${path} to be reachable before parity content seeding. Run seed-parity-foundation first.`,
      );
    }
  }
}

async function ensureParityContentLabel(page, baseUrl, label) {
  const path = `/${label.owner}/${label.projectName}/issue/labelsform`;
  const actionPath = `/${label.owner}/${label.projectName}/issue/labels`;
  await page.goto(`${baseUrl}${path}`, {
    timeout: 30_000,
    waitUntil: "networkidle",
  });
  const existing = await readLabelDescriptor(page, label.category, label.name);
  if (existing) {
    if (normalizeText(existing.color) !== normalizeText(label.color)) {
      throw new Error(
        `Expected label ${label.category}/${label.name} to use color ${label.color}, found ${existing.color}.`,
      );
    }
    return {
      category: label.category,
      color: label.color,
      created: false,
      name: label.name,
      owner: label.owner,
      path,
      projectName: label.projectName,
      type: "label",
    };
  }

  const response = await page.evaluate(async (requestData) => {
    const body = new URLSearchParams();
    body.set("categoryIsExclusive", String(requestData.categoryIsExclusive));
    body.set("categoryName", requestData.categoryName);
    body.set("labelColor", requestData.labelColor);
    body.set("labelName", requestData.labelName);
    const result = await fetch(requestData.path, {
      body,
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      method: "POST",
    });
    return {
      ok: result.ok,
      status: result.status,
      text: await result.text(),
    };
  }, {
    categoryIsExclusive: Boolean(label.categoryIsExclusive),
    categoryName: label.category,
    labelColor: label.color,
    labelName: label.name,
    path: actionPath,
  });
  if (!(response.ok || response.status === 204 || response.status === 201)) {
    throw new Error(
      `Failed to create label ${label.category}/${label.name}: HTTP ${response.status} ${response.text}`,
    );
  }
  await page.goto(`${baseUrl}${path}`, {
    timeout: 30_000,
    waitUntil: "networkidle",
  });
  const created = await readLabelDescriptor(page, label.category, label.name);
  if (!created) {
    throw new Error(`Expected label ${label.category}/${label.name} to exist after creation.`);
  }
  if (normalizeText(created.color) !== normalizeText(label.color)) {
    throw new Error(
      `Expected label ${label.category}/${label.name} to keep color ${label.color} after creation, found ${created.color}.`,
    );
  }
  return {
    category: label.category,
    color: label.color,
    created: true,
    name: label.name,
    owner: label.owner,
    path,
    projectName: label.projectName,
    type: "label",
  };
}

async function ensureParityContentMilestone(page, baseUrl, milestone) {
  const listPath = `/${milestone.owner}/${milestone.projectName}/milestones`;
  let detailPath = await findResourcePathByTitle(
    page,
    baseUrl,
    listPath,
    milestone.title,
    `/${milestone.owner}/${milestone.projectName}/milestone/`,
  );
  const created = !detailPath;
  if (!detailPath) {
    const createPath = `/${milestone.owner}/${milestone.projectName}/newMilestoneForm`;
    await page.goto(`${baseUrl}${createPath}`, {
      timeout: 30_000,
      waitUntil: "networkidle",
    });
    await requireLocator(page, "#milestone-form", createPath);
    await page.fill("#title", milestone.title);
    await page.fill('#milestone-form textarea[name="contents"]', milestone.contents);
    await page.locator("#milestone-open").check({ force: true });
    await page.fill("#dueDate", milestone.dueDate);
    await submitFormAndWaitForNavigation(
      page,
      "#milestone-form",
      (url) => url.pathname.startsWith(`/${milestone.owner}/${milestone.projectName}/milestone/`),
    );
    detailPath =
      relativePath(page.url()) ??
      (await findResourcePathByTitle(
        page,
        baseUrl,
        listPath,
        milestone.title,
        `/${milestone.owner}/${milestone.projectName}/milestone/`,
      ));
  }
  if (!detailPath) {
    throw new Error(`Expected milestone ${milestone.title} to exist after creation.`);
  }
  await page.goto(`${baseUrl}${detailPath}`, {
    timeout: 30_000,
    waitUntil: "domcontentloaded",
  });
  await assertPageContainsTexts(page, detailPath, [milestone.title, milestone.contents]);
  return {
    created,
    dueDate: milestone.dueDate,
    owner: milestone.owner,
    path: detailPath,
    projectName: milestone.projectName,
    state: milestone.state,
    title: milestone.title,
    type: "milestone",
  };
}

async function ensureParityContentIssue(page, baseUrl, issue) {
  const listPath = `/${issue.owner}/${issue.projectName}/issues`;
  let detailPath = await findResourcePathByTitle(
    page,
    baseUrl,
    listPath,
    issue.title,
    `/${issue.owner}/${issue.projectName}/issue/`,
  );
  const created = !detailPath;
  if (!detailPath) {
    const createPath = `/${issue.owner}/${issue.projectName}/issueform`;
    await page.goto(`${baseUrl}${createPath}`, {
      timeout: 30_000,
      waitUntil: "networkidle",
    });
    await requireLocator(page, "#issue-form", createPath);
    await page.fill("#title", issue.title);
    await page.fill('#issue-form textarea[name="body"]', issue.body);
    await page.locator("#assignee").evaluate((input, value) => {
      input.value = value;
    }, issue.assigneeLoginId);
    await page.selectOption("#milestoneId", { label: issue.milestoneTitle });
    await page.fill("#issueDueDate", issue.dueDate);
    await page.locator("#labelIds").evaluate((select, labelNames) => {
      if (!(select instanceof HTMLSelectElement)) {
        throw new Error("Expected #labelIds to be a select");
      }
      for (const option of Array.from(select.options)) {
        option.selected = labelNames.includes(option.text.trim());
      }
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }, issue.labelKeys.map(resolveParityContentLabelName));
    await submitFormAndWaitForNavigation(
      page,
      "#issue-form",
      (url) => url.pathname.startsWith(`/${issue.owner}/${issue.projectName}/issue/`),
    );
    detailPath =
      relativePath(page.url()) ??
      (await findResourcePathByTitle(
        page,
        baseUrl,
        listPath,
        issue.title,
        `/${issue.owner}/${issue.projectName}/issue/`,
      ));
  }
  if (!detailPath) {
    throw new Error(`Expected issue ${issue.title} to exist after creation.`);
  }
  await page.goto(`${baseUrl}${detailPath}`, {
    timeout: 30_000,
    waitUntil: "domcontentloaded",
  });
  await assertPageContainsTexts(page, detailPath, [
    issue.title,
    issue.body,
    issue.milestoneTitle,
    "Alice Kim",
    ...issue.labelKeys.map(resolveParityContentLabelName),
  ]);
  return {
    assigneeLoginId: issue.assigneeLoginId,
    created,
    dueDate: issue.dueDate,
    labelKeys: issue.labelKeys,
    milestoneTitle: issue.milestoneTitle,
    owner: issue.owner,
    path: detailPath,
    projectName: issue.projectName,
    title: issue.title,
    type: "issue",
  };
}

async function ensureParityContentIssueComment(page, baseUrl, comment) {
  await page.goto(`${baseUrl}${comment.issuePath}`, {
    timeout: 30_000,
    waitUntil: "domcontentloaded",
  });
  if (await pageIncludesAllTexts(page, [comment.body, "Bob Park"])) {
    return {
      body: comment.body,
      created: false,
      issuePath: comment.issuePath,
      loginId: comment.loginId,
      type: "issue-comment",
    };
  }
  await requireLocator(page, "form#comment-form", comment.issuePath);
  await page.fill('form#comment-form textarea[name="contents"]', comment.body);
  await submitFormAndWaitForNavigation(
    page,
    "form#comment-form",
    (url) => url.pathname === comment.issuePath,
  );
  await page.goto(`${baseUrl}${comment.issuePath}`, {
    timeout: 30_000,
    waitUntil: "domcontentloaded",
  });
  await assertPageContainsTexts(page, comment.issuePath, [comment.body, "Bob Park"]);
  return {
    body: comment.body,
    created: true,
    issuePath: comment.issuePath,
    loginId: comment.loginId,
    type: "issue-comment",
  };
}

async function ensureParityContentPost(page, baseUrl, post) {
  const listPath = `/${post.owner}/${post.projectName}/posts`;
  let detailPath = await findResourcePathByTitle(
    page,
    baseUrl,
    listPath,
    post.title,
    `/${post.owner}/${post.projectName}/post/`,
  );
  const created = !detailPath;
  if (!detailPath) {
    const createPath = `/${post.owner}/${post.projectName}/postform`;
    await page.goto(`${baseUrl}${createPath}`, {
      timeout: 30_000,
      waitUntil: "networkidle",
    });
    await requireLocator(page, "form[action$='/posts']", createPath);
    await page.fill("#title", post.title);
    await page.fill('form[action$="/posts"] textarea[name="body"]', post.body);
    if (post.notice) {
      await page.locator("#notice").check({ force: true });
    }
    await submitFormAndWaitForNavigation(
      page,
      "form[action$='/posts']",
      (url) => url.pathname.startsWith(`/${post.owner}/${post.projectName}/post/`),
    );
    detailPath =
      relativePath(page.url()) ??
      (await findResourcePathByTitle(
        page,
        baseUrl,
        listPath,
        post.title,
        `/${post.owner}/${post.projectName}/post/`,
      ));
  }
  if (!detailPath) {
    throw new Error(`Expected post ${post.title} to exist after creation.`);
  }
  await page.goto(`${baseUrl}${detailPath}`, {
    timeout: 30_000,
    waitUntil: "networkidle",
  });
  await assertPageContainsTexts(page, detailPath, [post.title, post.body]);
  return {
    created,
    notice: post.notice,
    owner: post.owner,
    path: detailPath,
    projectName: post.projectName,
    title: post.title,
    type: "post",
  };
}

async function ensureParityContentPostComment(page, baseUrl, comment) {
  await page.goto(`${baseUrl}${comment.postPath}`, {
    timeout: 30_000,
    waitUntil: "networkidle",
  });
  if (await pageIncludesAllTexts(page, [comment.body, "Alice Kim"])) {
    return {
      body: comment.body,
      created: false,
      loginId: comment.loginId,
      postPath: comment.postPath,
      type: "post-comment",
    };
  }
  await requireLocator(page, "form#comment-form", comment.postPath);
  await page.fill('form#comment-form textarea[name="contents"]', comment.body);
  await submitFormAndWaitForNavigation(
    page,
    "form#comment-form",
    (url) => url.pathname === comment.postPath,
  );
  await page.goto(`${baseUrl}${comment.postPath}`, {
    timeout: 30_000,
    waitUntil: "networkidle",
  });
  await assertPageContainsTexts(page, comment.postPath, [comment.body, "Alice Kim"]);
  return {
    body: comment.body,
    created: true,
    loginId: comment.loginId,
    postPath: comment.postPath,
    type: "post-comment",
  };
}

async function ensureParityContentProjectWatcher(page, baseUrl, watcher) {
  const projectPath = `/${watcher.owner}/${watcher.projectName}`;
  const watchersPath = `${projectPath}/watchers`;
  await page.goto(`${baseUrl}${watchersPath}`, {
    timeout: 30_000,
    waitUntil: "networkidle",
  });
  if (await pageIncludesAllTexts(page, [watcher.displayName])) {
    return {
      created: false,
      displayName: watcher.displayName,
      loginId: watcher.loginId,
      owner: watcher.owner,
      path: watchersPath,
      projectName: watcher.projectName,
      type: "watcher",
    };
  }

  await page.goto(`${baseUrl}${projectPath}`, {
    timeout: 30_000,
    waitUntil: "networkidle",
  });
  const watchPath = await page.locator(".watchBtn").evaluateAll((links) => {
    const first = links.find((link) => link.getAttribute("href"));
    return first?.getAttribute("href") ?? null;
  });
  if (!watchPath) {
    throw new Error(`Expected watchBtn on ${projectPath} for ${watcher.loginId}.`);
  }
  await page.evaluate(async (path) => {
    const response = await fetch(path, {
      credentials: "same-origin",
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`watch request failed: ${response.status}`);
    }
  }, watchPath);
  await page.goto(`${baseUrl}${watchersPath}`, {
    timeout: 30_000,
    waitUntil: "networkidle",
  });
  await assertPageContainsTexts(page, watchersPath, [watcher.displayName]);
  return {
    created: true,
    displayName: watcher.displayName,
    loginId: watcher.loginId,
    owner: watcher.owner,
    path: watchersPath,
    projectName: watcher.projectName,
    type: "watcher",
  };
}

function buildParityContentVerificationPages(report) {
  const issuePath = report.issue?.path ?? parityContentIssue.path;
  const postPath = report.post?.path ?? parityContentPost.path;
  return parityContentVerificationPages.map((page) => {
    if (page.path === parityContentIssue.path) {
      return { ...page, path: issuePath };
    }
    if (page.path === parityContentPost.path) {
      return { ...page, path: postPath };
    }
    return page;
  });
}

async function verifyParityContentPages(page, baseUrl, pages) {
  const checks = [];
  for (const entry of pages) {
    await page.goto(`${baseUrl}${entry.path}`, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });
    await assertPageContainsTexts(page, entry.path, entry.texts);
    checks.push({ ok: true, path: entry.path, texts: entry.texts });
  }
  return checks;
}

async function readLabelDescriptor(page, categoryName, labelName) {
  return page.locator(".category-wrap").evaluateAll((categories, expected) => {
    for (const category of categories) {
      const currentName = category.getAttribute("data-category-name")?.trim() ?? "";
      if (currentName !== expected.categoryName) {
        continue;
      }
      const label = category.querySelector(`[data-label-name="${expected.labelName}"]`);
      if (!label) {
        continue;
      }
      const row = label.closest("tr");
      const editButton = row?.querySelector("button[data-label-color]");
      return {
        color: editButton?.getAttribute("data-label-color") ?? "",
        labelId: label.getAttribute("data-label-id") ?? "",
        name: label.getAttribute("data-label-name") ?? label.textContent ?? "",
      };
    }
    return null;
  }, { categoryName, labelName });
}

async function findResourcePathByTitle(page, baseUrl, listPath, title, pathPrefix) {
  await page.goto(`${baseUrl}${listPath}`, {
    timeout: 30_000,
    waitUntil: "networkidle",
  });
  const path = await page.locator("a[href]").evaluateAll((anchors, expected) => {
    const normalize = (value) => value.replace(/\s+/g, " ").trim();
    for (const anchor of anchors) {
      const href = anchor.getAttribute("href");
      if (!href || !href.includes(expected.pathPrefix)) {
        continue;
      }
      const text = normalize(anchor.textContent ?? "");
      if (text.includes(expected.title)) {
        return href;
      }
    }
    return null;
  }, { pathPrefix, title });
  return path ? relativePath(new URL(path, `${baseUrl}${listPath}`).toString()) : null;
}

function resolveParityContentLabelName(key) {
  const label = parityContentLabels.find((entry) => parityContentLabelKey(entry) === key);
  if (!label) {
    throw new Error(`Unknown parity content label key: ${key}`);
  }
  return label.name;
}

function parityContentLabelKey(label) {
  return `${label.category}::${label.name}`;
}

async function pageIncludesAllTexts(page, texts) {
  const body = normalizeText(await page.locator("body").innerText());
  return texts.every((text) => body.includes(normalizeText(text)));
}

async function assertPageContainsTexts(page, pathLabel, texts) {
  const body = normalizeText(await page.locator("body").innerText());
  for (const text of texts) {
    if (!body.includes(normalizeText(text))) {
      throw new Error(`Expected ${pathLabel} to contain "${text}".`);
    }
  }
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function relativePath(value) {
  try {
    return new URL(value).pathname;
  } catch {
    return null;
  }
}

async function loginWithPassword(page, baseUrl, loginId, password) {
  await page.goto(`${baseUrl}/users/loginform`, {
    timeout: 30_000,
    waitUntil: "networkidle",
  });
  if ((await page.locator("#loginIdOrEmailD").count()) === 0) {
    return true;
  }
  await page.fill("#loginIdOrEmailD", loginId);
  await page.fill("#password", password);
  await submitFormAndWaitForNavigation(
    page,
    ".login-form-wrap form",
    (url) => !url.pathname.endsWith("/users/loginform"),
  );
  return (await page.locator("#loginIdOrEmailD").count()) === 0;
}

async function submitFormAndWaitForNavigation(page, formSelector, predicate) {
  const waitForNavigation = page
    .waitForNavigation({ timeout: 15_000, url: predicate })
    .catch(() => null);
  await page.locator(formSelector).evaluate((form) => {
    if (!(form instanceof HTMLFormElement)) {
      throw new Error("Expected a form element");
    }
    form.submit();
  });
  await waitForNavigation;
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => null);
}

async function requireLocator(page, selector, pathLabel) {
  const locator = page.locator(selector);
  if ((await locator.count()) === 0) {
    throw new Error(`Expected ${selector} on ${pathLabel}, but it was not present.`);
  }
  return locator;
}

async function listContainsUserId(page, selector, loginId) {
  const expected = `@${loginId}`;
  const texts = await page.locator(selector).allInnerTexts();
  return texts.some((text) => text.includes(expected));
}

async function legacyRouteExists(page, url) {
  const response = await page.goto(url, { timeout: 30_000, waitUntil: "networkidle" });
  return Boolean(response?.ok());
}

async function legacyPathContainsTexts(page, baseUrl, path, texts) {
  await page.goto(`${baseUrl}${path}`, {
    timeout: 30_000,
    waitUntil: "domcontentloaded",
  });
  return await pageIncludesAllTexts(page, texts);
}

function readBundledFile(layout, name) {
  const jarPath = resolve(layout.installDir, "lib", `yona.yona-${layout.version}.jar`);
  const result = spawnSync("unzip", ["-p", jarPath, name], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0 || !result.stdout) {
    throw new Error(`Failed to read ${name} from ${jarPath}: ${result.stderr}`);
  }
  return result.stdout;
}

function rewriteApplicationConf(source, layout) {
  const dbPath = resolve(layout.dbDir, "yona");
  return source.replace(
    /db\.default\.url="jdbc:h2:file:[^";]+(;[^"]*)"/,
    `db.default.url="jdbc:h2:file:${dbPath}$1"`,
  );
}

function ensureJava8Home(layout, options = {}) {
  const explicitHome = stringValue(options.javaHome, null);
  const existing = resolveAvailableJava8Home(layout, explicitHome);
  if (existing) {
    return existing;
  }
  if (options.noDownload) {
    throw new Error("Java 8 home is not available without downloading a portable archive.");
  }
  return ensurePortableJava8Home(layout, options);
}

function resolveAvailableJava8Home(layout, explicitHome) {
  const candidates = [];
  if (explicitHome) {
    candidates.push(explicitHome);
  }
  if (process.env.YONA_LEGACY_JAVA_HOME) {
    candidates.push(process.env.YONA_LEGACY_JAVA_HOME);
  }
  if (process.env.JAVA_HOME_8) {
    candidates.push(process.env.JAVA_HOME_8);
  }
  candidates.push(...findJavaHomeCandidates(layout.jdkRootDir));

  const brewOpenJdk8 = brewPrefix("openjdk@8");
  if (brewOpenJdk8) {
    candidates.push(resolve(brewOpenJdk8, "libexec/openjdk.jdk/Contents/Home"));
    candidates.push(resolve(brewOpenJdk8));
  }

  const jvmBase = "/Library/Java/JavaVirtualMachines";
  if (existsSync(jvmBase)) {
    const knownDirs = [
      "zulu-8.jdk",
      "temurin-8.jdk",
      "adoptopenjdk-8.jdk",
      "openjdk-8.jdk",
    ];
    for (const dir of knownDirs) {
      candidates.push(resolve(jvmBase, dir, "Contents/Home"));
    }
  }

  const javaFromPath = spawnSync("java", ["-XshowSettings:properties", "-version"], {
    encoding: "utf8",
  });
  if (javaFromPath.status === 0) {
    const home = /java\.home = (.+)/.exec(javaFromPath.stderr);
    if (home) {
      candidates.push(home[1].trim());
    }
  }

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const javaBin = resolve(candidate, "bin/java");
    if (!existsSync(javaBin)) {
      continue;
    }
    const version = readJavaVersion(javaBin);
    if (version.startsWith("1.8") || version.startsWith("8")) {
      return candidate;
    }
  }

  return null;
}

function ensurePortableJava8Home(layout, options) {
  const archiveUrl = resolvePortableJavaArchiveUrl(options.javaUrl);
  const archiveName = basename(new URL(archiveUrl).pathname);
  const archiveStem = stripArchiveSuffix(archiveName);
  const archivePath = resolve(layout.jdkCacheDir, archiveName);
  const extractDir = resolve(layout.jdkRootDir, archiveStem);

  if (!existsSync(archivePath) || options.forceJavaDownload) {
    if (options.forceJavaDownload && existsSync(archivePath)) {
      rmSync(archivePath, { force: true });
    }
    runOrThrow("curl", ["-fL", archiveUrl, "-o", archivePath], {
      label: "download portable Java 8",
    });
  }

  if (!existsSync(extractDir) || options.forceJavaExtract || options.forceJavaDownload) {
    rmSync(extractDir, { force: true, recursive: true });
    mkdirSync(extractDir, { recursive: true });
    extractArchive(archivePath, extractDir);
  }

  const javaHome = findJavaHomeCandidates(extractDir).find((candidate) => {
    const version = readJavaVersion(resolve(candidate, "bin/java"));
    return version.startsWith("1.8") || version.startsWith("8");
  });
  if (javaHome) {
    return javaHome;
  }

  throw new Error(
    `Unable to find a Java 8 home in ${extractDir}. Set YONA_LEGACY_JAVA_HOME or YONA_LEGACY_JAVA_URL explicitly.`,
  );
}

function safeResolveJava8Home(layout) {
  try {
    return ensureJava8Home(layout, { noDownload: true });
  } catch {
    return null;
  }
}

function resolvePortableJavaArchiveUrl(explicitUrl) {
  const value = stringValue(explicitUrl, process.env.YONA_LEGACY_JAVA_URL);
  if (value) {
    return value;
  }
  if (process.platform === "darwin" && process.arch === "arm64") {
    return "https://cdn.azul.com/zulu/bin/zulu8.94.0.17-ca-jdk8.0.492-macosx_aarch64.tar.gz";
  }
  if (process.platform === "darwin" && process.arch === "x64") {
    return "https://cdn.azul.com/zulu/bin/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64.tar.gz";
  }
  throw new Error(
    `No default portable Java 8 archive is configured for ${process.platform}/${process.arch}. Set YONA_LEGACY_JAVA_URL or YONA_LEGACY_JAVA_HOME.`,
  );
}

function stripArchiveSuffix(name) {
  return name
    .replace(/\.tar\.gz$/u, "")
    .replace(/\.tgz$/u, "")
    .replace(/\.zip$/u, "");
}

function extractArchive(archivePath, outputDir) {
  if (archivePath.endsWith(".zip")) {
    runOrThrow("unzip", ["-q", archivePath, "-d", outputDir], {
      label: "extract portable Java 8 archive",
    });
    return;
  }
  if (archivePath.endsWith(".tar.gz") || archivePath.endsWith(".tgz")) {
    runOrThrow("tar", ["-xzf", archivePath, "-C", outputDir], {
      label: "extract portable Java 8 archive",
    });
    return;
  }
  throw new Error(`Unsupported Java archive format: ${archivePath}`);
}

function findJavaHomeCandidates(rootDir, depth = 0) {
  if (!rootDir || !existsSync(rootDir)) {
    return [];
  }

  const directHome = resolve(rootDir, "bin/java");
  if (existsSync(directHome)) {
    return [rootDir];
  }

  const macBundleHome = resolve(rootDir, "Contents/Home/bin/java");
  if (existsSync(macBundleHome)) {
    return [resolve(rootDir, "Contents/Home")];
  }

  if (depth >= 4) {
    return [];
  }

  const nested = [];
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    nested.push(...findJavaHomeCandidates(resolve(rootDir, entry.name), depth + 1));
  }
  return [...new Set(nested)];
}

function readJavaVersion(javaBin) {
  const result = spawnSync(javaBin, ["-version"], { encoding: "utf8" });
  const output = `${result.stdout}\n${result.stderr}`;
  const match = /version "([^"]+)"/.exec(output);
  if (!match) {
    throw new Error(`Failed to read Java version from ${javaBin}`);
  }
  return match[1];
}

function brewPrefix(name) {
  const result = spawnSync("brew", ["--prefix", name], { encoding: "utf8" });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.trim();
}

async function isPortAvailable(host, port) {
  const { createServer } = await import("node:net");
  return await new Promise((resolvePromise) => {
    const server = createServer();
    server.once("error", () => resolvePromise(false));
    server.once("listening", () => {
      server.close(() => resolvePromise(true));
    });
    server.listen(port, host);
  });
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.ok || response.status === 302 || response.status === 303) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(1000);
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function waitForProcessExit(pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for pid ${pid} to exit`);
}

async function probeHttp(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return {
      ok: response.ok || response.status === 302 || response.status === 303,
      status: response.status,
      url,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
      url,
    };
  }
}

async function probeSecretBootstrap(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    const body = await response.text();
    return {
      ...classifySecretBootstrapResponse({ body, status: response.status }),
      ok: response.ok,
      url,
    };
  } catch (error) {
    return {
      active: false,
      complete: false,
      error: error instanceof Error ? error.message : String(error),
      ok: false,
      restartPending: false,
      status: null,
      url,
    };
  }
}

async function assertBootstrapReady(layout, baseUrl) {
  if (hasRotatedSecret(layout)) {
    return { source: "local-config" };
  }

  const secretProbe = await probeSecretBootstrap(`${baseUrl}/secret`);
  if (secretProbe.active) {
    throw new Error(
      "The legacy first-run bootstrap is still active on /secret. Run seed-admin and restart the instance before seeding parity data.",
    );
  }
  if (secretProbe.restartPending) {
    throw new Error(
      "The legacy first-run bootstrap has been submitted, but the server still needs a restart before seeding parity data.",
    );
  }
  if (secretProbe.complete) {
    return { secretProbe, source: "live-secret-probe" };
  }

  throw new Error(
    "Could not confirm that the legacy bootstrap completed. Run seed-admin, restart the instance, or point the seed command at a fully initialized localhost legacy server.",
  );
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function runOrThrow(commandName, args, { label }) {
  const result = spawnSync(commandName, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed: ${result.stderr || result.stdout}`);
  }
}

function readPid(pidFile) {
  if (!existsSync(pidFile)) {
    return null;
  }
  const value = readFileSync(pidFile, "utf8").trim();
  if (!value) {
    return null;
  }
  return Number.parseInt(value, 10);
}

function resolveManagedPid(layout) {
  const candidates = [
    { path: layout.pidFile, source: "pid-file" },
    { path: layout.runningPidFile, source: "RUNNING_PID" },
  ];

  for (const candidate of candidates) {
    const pid = readPid(candidate.path);
    if (!pid || !isProcessAlive(pid)) {
      continue;
    }
    const command = readProcessCommand(pid);
    if (!commandMatchesLayout(command, layout) || !commandMatchesPort(command, layout.port)) {
      continue;
    }
    return { command, pid, source: candidate.source };
  }

  return null;
}

function cleanupStalePidFiles(layout) {
  for (const path of [layout.pidFile, layout.runningPidFile]) {
    const pid = readPid(path);
    if (!pid) {
      continue;
    }
    const command = readProcessCommand(pid);
    if (!isProcessAlive(pid) || !commandMatchesLayout(command, layout) || !commandMatchesPort(command, layout.port)) {
      rmSync(path, { force: true });
    }
  }
}

async function waitForManagedPid(layout, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const managedProcess = resolveManagedPid(layout);
    if (managedProcess) {
      return managedProcess;
    }
    await sleep(250);
  }
  return null;
}

function readProcessCommand(pid) {
  const result = spawnSync("ps", ["-p", String(pid), "-o", "command="], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return null;
  }
  const command = result.stdout.trim();
  return command.length > 0 ? command : null;
}

function findListenerPid(port) {
  const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return null;
  }
  const pid = result.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find(Boolean);
  return pid ? Number.parseInt(pid, 10) : null;
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function hasRotatedSecret(layout) {
  const applicationConfPath = resolve(layout.confDir, "application.conf");
  if (!existsSync(applicationConfPath)) {
    return false;
  }
  return !readFileSync(applicationConfPath, "utf8").includes(defaultSecret);
}

export function classifySecretBootstrapResponse({ status, body }) {
  const html = String(body ?? "");
  const normalized = normalizeText(html);
  const active =
    /id=["']loginId["']/u.test(html) &&
    /id=["']password["']/u.test(html) &&
    /id=["']retypedPassword["']/u.test(html);
  const restartPending = normalized.includes("Server needs to be restarted");
  const complete =
    restartPending ||
    status === 404 ||
    normalized.includes("User exists not") ||
    normalized.includes("user exists not");

  return {
    active,
    complete,
    restartPending,
    status,
  };
}

export function commandMatchesLayout(command, layout) {
  const normalizedCommand = String(command ?? "").trim().toLowerCase();
  const installDir = String(layout.installDir ?? "").trim().toLowerCase();
  const dataDir = String(layout.dataDir ?? "").trim().toLowerCase();

  if (!normalizedCommand) {
    return false;
  }

  return (
    (installDir.length > 0 && normalizedCommand.includes(installDir)) ||
    (dataDir.length > 0 && normalizedCommand.includes(dataDir))
  );
}

export function commandMatchesPort(command, port) {
  const normalizedCommand = String(command ?? "").trim().toLowerCase();
  return normalizedCommand.includes(`-dhttp.port=${String(port).toLowerCase()}`);
}

if (import.meta.url === new URL(process.argv[1], "file://").href) {
  await main();
}

function camelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function stringValue(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function numberValue(value, fallback) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}
