import { expect, test, type Page } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

// Browser harness: fileURLToPath yields the served URL pathname so string
// mapping + .txt raw-suffix applies.
const fileURLToPath = (u: URL) => u.pathname;
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve(
  "output/playwright/style-project-code-browser-header-floats",
  "normal",
);
const source = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

test.use({ locale: "en-US" });

test("project code-browser header float ownership has legacy provenance", () => {
  const route = source("../src/routes/$ownerName/$projectName/code/$branch.tsx");
  const styles = source("../src/app.css");
  const legacyView = source("../../yona-original/app/views/code/view.scala.html");
  const bootstrap = source("../../yona-original/public/bootstrap/css/bootstrap.css");
  const pageLess = source("../../yona-original/app/assets/stylesheets/less/_page.less");
  const yobiLess = source("../../yona-original/app/assets/stylesheets/yobi.less");
  const messages = source("../../yona-original/conf/messages");

  expect(legacyView).toContain('<select id="branches" data-toggle="select2"');
  expect(legacyView).toContain(
    '<div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left">',
  );
  expect(legacyView).toContain('<div class="pull-right">');
  expect(legacyView).toContain('@Messages("code.download")');
  expect(legacyView).toContain('@Messages("code.new.file")');
  expect(bootstrap).toContain(".pull-right {\n  float: right;");
  expect(bootstrap).toContain(".pull-left {\n  float: left;");
  expect(pageLess).toContain(".code-browse-header");
  expect(pageLess).toContain(".code-breadcrumb-wrap");
  expect(yobiLess).toContain('@import "less/_page.less";');
  expect(messages).toContain("code.download = Download as .zip file");
  expect(messages).toContain("code.new.file = New file");

  expect(route).toContain('data-owner="project-code-branch-picker"');
  expect(route).toContain('data-owner="project-code-branch-breadcrumbs"');
  expect(route).toContain('data-owner="project-code-branch-download-action"');
  expect(route).toContain('data-owner="project-code-branch-new-file-action"');
  expect(route).toContain('className="pull-left select2-offscreen"');
  expect(route).toContain("booleanField(project.viewerCanUpdate)");
  expect(route).toContain("reloadDocument");

  expect(route).not.toMatch(/project-code-branch-picker[\s\S]{0,260}select2-container pull-left/u);
  expect(route).not.toMatch(/project-code-branch-download-action[\s\S]{0,180}pull-right/u);
  expect(route).not.toMatch(/project-code-branch-new-file-action[\s\S]{0,180}pull-right/u);
  expect(route).not.toContain('data-toggle="select2"');
});

test("project code-browser header preserves branch/actions and stays contained", async ({
  page,
}) => {
  await mockCodeBranch(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/admin/sample/code/main`, { waitUntil: "commit" });

    await expect
      .poll(async () =>
        JSON.stringify(
          await page.evaluate(() => {
            const snapshot = (selector: string) => {
              const element = document.querySelector<HTMLElement>(selector);
              if (!element) return null;
              return {
                className: element.className,
                float: getComputedStyle(element).float,
                tagName: element.tagName,
              };
            };
            const downloadLink = document.querySelector<HTMLAnchorElement>(
              '[data-owner="project-code-branch-download-action"] > a',
            );
            const newFileLink = document.querySelector<HTMLAnchorElement>(
              '[data-owner="project-code-branch-new-file-action"] > a',
            );
            return {
              breadcrumbs: snapshot('[data-owner="project-code-branch-breadcrumbs"]'),
              branchOptions: Array.from(
                document.querySelectorAll<HTMLElement>(
                  '[data-owner="project-code-branch-picker"] .select2-result-label',
                ),
                (option) => option.textContent?.replace(/\s+/gu, " ").trim(),
              ),
              download: snapshot('[data-owner="project-code-branch-download-action"]'),
              downloadLink: downloadLink
                ? {
                    className: downloadLink.className,
                    href: downloadLink.getAttribute("href"),
                    tagName: downloadLink.tagName,
                    text: downloadLink.textContent?.trim(),
                  }
                : null,
              nativeSelect: snapshot("#branches"),
              newFile: snapshot('[data-owner="project-code-branch-new-file-action"]'),
              newFileLink: newFileLink
                ? {
                    className: newFileLink.className,
                    href: newFileLink.getAttribute("href"),
                    tagName: newFileLink.tagName,
                    text: newFileLink.textContent?.trim(),
                  }
                : null,
              picker: snapshot('[data-owner="project-code-branch-picker"]'),
            };
          }),
        ),
      )
      .toBe(
        JSON.stringify({
          breadcrumbs: {
            className: "code-breadcrumb-wrap ml10 pull-left",
            float: "left",
            tagName: "DIV",
          },
          branchOptions: ["branch main", "branch feature/release"],
          download: {
            className: "pull-right",
            float: "right",
            tagName: "DIV",
          },
          downloadLink: {
            className: "ybtn",
            href: `${basePath}/admin/sample/archive/main.zip`,
            tagName: "A",
            text: "Download as .zip file",
          },
          nativeSelect: {
            className: "pull-left select2-offscreen",
            float: "none",
            tagName: "SELECT",
          },
          newFile: {
            className: "pull-right",
            float: "right",
            tagName: "DIV",
          },
          newFileLink: {
            className: "ybtn",
            href: `${basePath}/admin/sample/postform?path=&branch=main`,
            tagName: "A",
            text: "New file",
          },
          picker: {
            className: "select2-container",
            float: "left",
            tagName: "DIV",
          },
        }),
      );

    const headerMetrics = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>(
        '[data-owner="project-code-branch-header"]',
      );
      const owners = [
        document.querySelector<HTMLElement>('[data-owner="project-code-branch-picker"]'),
        document.querySelector<HTMLElement>('[data-owner="project-code-branch-breadcrumbs"]'),
        document.querySelector<HTMLElement>('[data-owner="project-code-branch-download-action"]'),
        document.querySelector<HTMLElement>('[data-owner="project-code-branch-new-file-action"]'),
      ];
      if (!header || owners.some((owner) => !owner)) return null;
      const headerBox = header.getBoundingClientRect();
      return {
        contained: owners.every((owner) => {
          const box = owner!.getBoundingClientRect();
          return box.left >= headerBox.left - 1 && box.right <= headerBox.right + 1;
        }),
        noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      };
    });
    expect(headerMetrics).toEqual({ contained: true, noOverflow: true });

    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockCodeBranch(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  const session = {
    actorId: "1",
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/code**", (route) => {
    const branch = new URL(route.request().url()).searchParams.get("branch") ?? "main";
    return route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }, { name: "feature/release" }],
        breadcrumbs: [{ name: "sample", path: "" }],
        entries: [
          {
            commitDate: "2026-07-20T10:00:00Z",
            commitMessage: "Initial README",
            commitShortId: "abcdef1",
            kind: "file",
            name: "README.md",
            path: "README.md",
          },
        ],
        file: null,
        noHead: false,
        ownerName: "admin",
        path: "",
        projectName: "sample",
        selectedBranch: branch,
      },
    });
  });
}
