import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "en-US" });

test("project code-browser header preserves branch/actions and stays contained", async ({
  page,
}) => {
  await mockCodeBranch(page);

  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/admin/sample/code/main`, { waitUntil: "commit" });
    await page.locator('[data-owner="project-code-branch-picker"] .select2-choice').click();

    await expect
      .poll(async () =>
        JSON.stringify(
          await page.evaluate(() => {
            const snapshot = (selector: string) => {
              const element = document.querySelector<HTMLElement>(selector);
              if (!element) return null;
              return {
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
                    href: downloadLink.getAttribute("href"),
                    tagName: downloadLink.tagName,
                    text: downloadLink.textContent?.trim(),
                  }
                : null,
              newFile: snapshot('[data-owner="project-code-branch-new-file-action"]'),
              newFileLink: newFileLink
                ? {
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
            float: "left",
            tagName: "DIV",
          },
          branchOptions: ["branch main", "branch feature/release"],
          download: {
            float: "right",
            tagName: "DIV",
          },
          downloadLink: {
            href: `${basePath}/admin/sample/archive/main.zip`,
            tagName: "A",
            text: "Download as .zip file",
          },
          newFile: {
            float: "right",
            tagName: "DIV",
          },
          newFileLink: {
            href: `${basePath}/admin/sample/postform?path=&branch=main`,
            tagName: "A",
            text: "New file",
          },
          picker: {
            float: "left",
            tagName: "DIV",
          },
        }),
      );
    await page.locator('[data-owner="project-code-branch-picker"] .select2-input').press("Escape");

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
