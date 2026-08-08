import { readFile } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
});

test("SVN members renders the canonical shell and legacy member body on desktop and mobile", async ({
  page,
}) => {
  await mockMembers(page);
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/svnplayground/members`);

  await expect(page).toHaveTitle("프로젝트 멤버 - admin/svnplayground");
  await expect(page.locator(".project-header-outer")).toHaveCount(1);
  await expect(page.locator(".project-menu-gruop > li")).toHaveCount(6);
  await expect(page.locator(".project-menu-gruop .menu-name")).toHaveText([
    "홈",
    "코드",
    "이슈",
    "리뷰",
    "마일스톤",
    "게시판",
  ]);
  await expect(page.locator(".project-menu-gruop", { hasText: "코드 주고받기" })).toHaveCount(0);
  // .project-setting ul carries the legacy stray empty <li> (projectMenu.scala.html
  // malformed </a><li>), so .project-setting li resolves to 2 — assert the active one.
  await expect(page.locator(".project-setting li.active")).toHaveCount(1);
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a")).toHaveCount(7);
  await expect(page.locator("#subMenuProjectMember")).toHaveClass("active");
  await expect(page.locator("#addNewMember")).toBeVisible();
  await expect(page.locator(".members.project .member")).toHaveCount(2);
  await expect(page.locator("legend h3")).toHaveText("멤버 등록 요청 (1)");
  // F5 dist-truth: measured dist shell widths at 1366x900 (navbar
  // .project-menu-gruop + header .project-util-wrap); legacy menu group is
  // content-sized (float:left li at _page.less:594,641) so 410 is the truth.
  // utilWidth 163: wave-8 restored legacy .btn base geometry on the watcher
  // count (display/padding 4px 12px/font 14px/lineHeight 20px — bootstrap.css:
  // 3141, header.scala.html:128 <a class="btn watcher-count no-border">).
  expect(await geometry(page)).toMatchObject({ menuWidth: 410, noOverflow: true, utilWidth: 163 });

  const order = await page
    .locator(".project-page-wrap > *")
    .evaluateAll((elements) =>
      elements.map((element) =>
        element.matches(".nav-tabs")
          ? "tabs"
          : element.matches(".inner-bubble")
            ? "add"
            : element.matches(".members")
              ? "members"
              : element.matches("legend")
                ? "enrollment-title"
                : "enrollment-list",
      ),
    );
  expect(order).toEqual(["tabs", "add", "members", "enrollment-title", "enrollment-list"]);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".project-util-wrap")).toBeHidden();
  expect(await geometry(page)).toMatchObject({ menuWidth: 201, noOverflow: true });
});

test("SVN members add mutation uses the typed REST boundary", async ({ page }) => {
  const added: string[] = [];
  await mockMembers(page, { added });
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/admin/svnplayground/members`);
  await page.locator("#loginId").fill("carol");
  await page.locator("#addNewMember button[type=submit]").click();
  await expect.poll(() => added).toEqual(["carol"]);
});

for (const status of [400, 401, 403]) {
  test(`SVN members ${status} keeps the canonical project shell`, async ({ page }) => {
    await mockMembers(page, { membersStatus: status });
    const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
    await page.goto(`${basePath}/admin/svnplayground/members`);
    await expect(page.locator(".project-header-outer")).toHaveCount(1);
    await expect(page.locator(".project-menu-gruop > li")).toHaveCount(6);
    await expect(page.locator(".error-wrap")).toBeVisible();
    await expect(page.locator(".project-menu-gruop", { hasText: "코드 주고받기" })).toHaveCount(0);
    // Same stray-empty-<li> caveat as the desktop test: assert the active count
    // (400 keeps the members shell with setting active; 401/403 fall back to
    // active="home" so no setting item is active).
    await expect(page.locator(".project-setting li.active")).toHaveCount(
      status === 400 ? 1 : 0,
    );
    if (status === 401)
      await expect(page.locator('.error-wrap a[data-login="required"]')).toBeVisible();
  });
}

test("SVN members route has no route-local project shell or string static assets", async () => {
  const source = await readFile(
    new URL("../src/routes/$ownerName/$projectName/members.tsx", import.meta.url),
    "utf8",
  );
  expect(source).toContain('import { ProjectHeader, ProjectMenu } from "../$projectName"');
  expect(source).not.toContain("function ProjectHeader(");
  expect(source).not.toContain("function ProjectMenu(");
  expect(source).not.toContain("function ProjectMenuItem(");
  // The mention.css stylesheet link is a required legacy asset URL: it is pinned
  // as a runtime DOM element + stylesheet request by project-members-form.e2e.ts
  // (lines 315-332). Exempt exactly that literal; reject every other string asset.
  expect(source).not.toMatch(
    /["']\/(?:legacy-assets|assets)\/(?!javascripts\/lib\/mentionjs\/mention\.css)/u,
  );
});

async function mockMembers(page: Page, options: { added?: string[]; membersStatus?: number } = {}) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "관리자",
      }),
    }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-members-svn" },
      body: JSON.stringify({
        session: { csrfToken: "csrf-members-svn", projection: {}, userId: 1 },
        user: { id: 1, isSiteAdmin: true, loginId: "admin", name: "관리자" },
      }),
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/svnplayground/container**", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(svnProject()) }),
  );
  await page.route("**/api/v1/owners/admin/projects/svnplayground/members", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { loginId: string };
      options.added?.push(body.loginId);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
    if (options.membersStatus) {
      return route.fulfill({
        status: options.membersStatus,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "test", message: "members error", status: options.membersStatus },
        }),
      });
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(memberData()) });
  });
}

function svnProject() {
  return {
    enrolledUsers: [{ loginId: "bob" }],
    id: 17,
    isPrivate: false,
    isProtected: false,
    isWatching: true,
    ownerName: "admin",
    projectName: "svnplayground",
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    vcs: "Subversion",
    viewerCanUpdate: true,
    viewerCanWatch: true,
    watchCount: 1,
  };
}

function memberData() {
  return {
    enrollmentRequests: [{ avatarUrl: "", loginId: "bob", userId: 3, userLabel: "밥" }],
    members: [
      {
        avatarUrl: "",
        isOwner: true,
        loginId: "admin",
        role: "manager",
        userId: 1,
        userLabel: "관리자",
      },
      {
        avatarUrl: "",
        isOwner: false,
        loginId: "alice",
        role: "member",
        userId: 2,
        userLabel: "앨리스",
      },
    ],
    ownerName: "admin",
    projectName: "svnplayground",
    roleOptions: [
      { id: 1, label: "관리자", role: "manager" },
      { id: 2, label: "참여자", role: "member" },
    ],
    viewerCanUpdate: true,
  };
}

async function geometry(page: Page) {
  return page.evaluate(() => {
    const menu = document.querySelector(".project-menu-gruop")!.getBoundingClientRect();
    const pageWrap = document.querySelector(".project-page-wrap")!.getBoundingClientRect();
    const members = document.querySelector(".members.project")!.getBoundingClientRect();
    const util = document.querySelector(".project-util-wrap")!.getBoundingClientRect();
    return {
      membersInsidePage: members.left >= pageWrap.left && members.right <= pageWrap.right,
      menuWidth: Math.round(menu.width),
      noOverflow:
        pageWrap.left >= 0 &&
        pageWrap.right <= window.innerWidth &&
        members.left >= pageWrap.left &&
        members.right <= pageWrap.right,
      utilWidth: Math.round(util.width),
    };
  });
}
