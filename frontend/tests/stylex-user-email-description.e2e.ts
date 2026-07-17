import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("../output/playwright/visual-sweep");
const owners = {
  description: "user-email-description",
  separator: "user-email-description-separator",
} as const;
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`);

test.use({ locale: "ko-KR" });

test("records the winning legacy cascade and exact two-owner description boundary", () => {
  const route = readFileSync("src/routes/user/editform/emails.tsx", "utf8");
  const theme = readFileSync("src/routes/user/editform/-emails.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/user/edit_emails.scala.html", "utf8");
  const layout = readFileSync("../yona-original/app/views/layout.scala.html", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");

  expect(template).toContain(
    '<hr>\n\n    <p>\n      @Messages("emails.main.email.descr")<br>\n      @Messages("emails.sub.email.descr")\n    </p>',
  );
  expect(bootstrap).toContain("p {\n  margin: 0 0 10px;\n}");
  expect(bootstrap).toContain(
    "hr {\n  margin: 20px 0;\n  border: 0;\n  border-top: 1px solid #eeeeee;\n  border-bottom: 1px solid #ffffff;\n}",
  );
  expect(common).toContain(
    "body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,form,fieldset,p,button{\n    margin:0;\n    padding:0",
  );
  expect(layout.indexOf("bootstrap/css/bootstrap.css")).toBeLessThan(
    layout.indexOf("stylesheets/yobi.css"),
  );

  for (const name of Object.values(owners)) {
    expect(route.match(new RegExp(`data-stylex-owner="${name}"`, "gu")) ?? []).toHaveLength(1);
  }
  expect(route).not.toContain("<hr className=");
  expect(route).not.toContain("<p className=");
  expect(route).not.toContain('data-stylex-owner="user-email-description-break"');

  const separatorStyle = route.slice(
    route.indexOf("descriptionSeparator: {"),
    route.indexOf("description: {"),
  );
  expect(separatorStyle).toContain(
    "borderBottomColor: emailDescriptionSeparatorColors.bottomBorder",
  );
  expect(separatorStyle).toContain('borderBottomStyle: "solid"');
  expect(separatorStyle).toContain('borderBottomWidth: "1px"');
  expect(separatorStyle).toContain('borderLeftStyle: "none"');
  expect(separatorStyle).toContain('borderLeftWidth: "0px"');
  expect(separatorStyle).toContain('borderRightStyle: "none"');
  expect(separatorStyle).toContain('borderRightWidth: "0px"');
  expect(separatorStyle).toContain("borderTopColor: emailDescriptionSeparatorColors.topBorder");
  expect(separatorStyle).toContain('borderTopStyle: "solid"');
  expect(separatorStyle).toContain('borderTopWidth: "1px"');
  expect(separatorStyle).toContain('margin: "20px 0px"');

  const descriptionStyle = route.slice(
    route.indexOf("description: {"),
    route.indexOf("primaryAvatar: {"),
  );
  expect(descriptionStyle).toContain('margin: "0px"');
  expect(descriptionStyle).toContain('padding: "0px"');
  expect(descriptionStyle).not.toMatch(/(?:display|font|lineHeight|width|height)/u);
  expect(descriptionStyle).not.toContain('margin: "0px 0px 10px"');

  const separatorTheme = theme.slice(theme.indexOf("export const emailDescriptionSeparatorColors"));
  expect(separatorTheme).toContain('bottomBorder: "#ffffff"');
  expect(separatorTheme).toContain('topBorder: "#eeeeee"');
  expect(separatorTheme.match(/#[0-9a-f]{3,8}/giu)).toEqual(["#ffffff", "#eeeeee"]);
  expect(separatorTheme).not.toMatch(
    /(?:margin|padding|width|height|font|lineHeight|borderWidth|borderStyle|borderRadius)/u,
  );
});

test("pins desktop and mobile description in one primary-only browser page state", async ({
  page,
}) => {
  await mockPrimaryEmailSettings(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    {
      description: { height: 40, left: 10, top: 278, width: 1346 },
      height: 900,
      name: "desktop",
      separator: { height: 2, left: 10, top: 256, width: 1346 },
      tableTop: 338,
      width: 1366,
    },
    {
      description: { height: 80, left: 0, top: 278, width: 390 },
      height: 844,
      name: "mobile",
      separator: { height: 2, left: 0, top: 256, width: 390 },
      tableTop: 378,
      width: 390,
    },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/user/editform/emails`);
    await page.evaluate(() => document.fonts.ready);

    const separator = owner(page, owners.separator);
    const description = owner(page, owners.description);
    const addForm = owner(page, "user-email-add-form");
    const table = owner(page, "user-email-table");
    await expect(separator).toBeVisible();
    await expect(description).toBeVisible();
    await expect(description).toHaveText(
      "대표 이메일로 설정한 이메일로 알림을 받거나 비밀번호 변경 요청을 받을 수 있습니다.여러 이메일을 사용할 경우 확인된 이메일로도 동일한 사용자로 인식할 수 있습니다.",
    );
    expect(
      await description.evaluate((element) =>
        Array.from(element.childNodes)
          .map((node) =>
            node.nodeType === Node.ELEMENT_NODE
              ? node.nodeName
              : node.textContent?.replace(/\s+/gu, " ").trim(),
          )
          .filter(Boolean),
      ),
    ).toEqual([
      "대표 이메일로 설정한 이메일로 알림을 받거나 비밀번호 변경 요청을 받을 수 있습니다.",
      "BR",
      "여러 이메일을 사용할 경우 확인된 이메일로도 동일한 사용자로 인식할 수 있습니다.",
    ]);
    await expect(description.locator(":scope > br")).toHaveCount(1);
    await expect(separator).toHaveCSS("margin", "20px 0px");
    await expect(separator).toHaveCSS("border-top", "1px solid rgb(238, 238, 238)");
    await expect(separator).toHaveCSS("border-right-style", "none");
    await expect(separator).toHaveCSS("border-right-width", "0px");
    await expect(separator).toHaveCSS("border-bottom", "1px solid rgb(255, 255, 255)");
    await expect(separator).toHaveCSS("border-left-style", "none");
    await expect(separator).toHaveCSS("border-left-width", "0px");
    await expect(description).toHaveCSS("margin", "0px");
    await expect(description).toHaveCSS("padding", "0px");

    const geometry = await page.evaluate(
      ({ addForm, separator, description, table }) => {
        const box = (element: Element) => {
          const rect = element.getBoundingClientRect();
          return {
            bottom: rect.bottom,
            height: rect.height,
            left: rect.left,
            top: rect.top,
            width: rect.width,
          };
        };
        return {
          addForm: box(addForm),
          description: box(description),
          order: Array.from(description.parentElement!.children)
            .filter((element) => [addForm, separator, description, table].includes(element))
            .map((element) => element.tagName),
          separator: box(separator),
          table: box(table),
        };
      },
      {
        addForm: await addForm.elementHandle(),
        description: await description.elementHandle(),
        separator: await separator.elementHandle(),
        table: await table.elementHandle(),
      },
    );
    expect(geometry.order).toEqual(["FORM", "HR", "P", "TABLE"]);
    expect(geometry.separator).toEqual({
      bottom: viewport.separator.top + viewport.separator.height,
      ...viewport.separator,
    });
    expect(geometry.description).toEqual({
      bottom: viewport.description.top + viewport.description.height,
      ...viewport.description,
    });
    expect(geometry.separator.top - geometry.addForm.bottom).toBe(20);
    expect(geometry.description.top - geometry.separator.bottom).toBe(20);
    expect(geometry.table.top).toBe(viewport.tableTop);
    expect(geometry.table.top - geometry.description.bottom).toBe(20);
    expect(await sameAncestryFallbackEvidence(separator)).toEqual({ equivalent: true });

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `stylex-user-email-description-${viewport.name}.png`),
    });
  }
});

async function sameAncestryFallbackEvidence(separator: ReturnType<Page["locator"]>) {
  return separator.evaluate((actualSeparator) => {
    const actualWrap = actualSeparator.parentElement!;
    const clone = actualWrap.cloneNode(true) as HTMLElement;
    const fallbackSeparator = clone.querySelector<HTMLElement>(
      '[data-stylex-owner="user-email-description-separator"]',
    )!;
    const fallbackDescription = clone.querySelector<HTMLElement>(
      '[data-stylex-owner="user-email-description"]',
    )!;
    fallbackSeparator.removeAttribute("class");
    fallbackSeparator.removeAttribute("data-stylex-owner");
    fallbackDescription.removeAttribute("class");
    fallbackDescription.removeAttribute("data-stylex-owner");
    actualWrap.parentElement!.append(clone);

    const properties = [
      [
        "margin",
        "border-top-color",
        "border-top-style",
        "border-top-width",
        "border-right-style",
        "border-right-width",
        "border-bottom-color",
        "border-bottom-style",
        "border-bottom-width",
        "border-left-style",
        "border-left-width",
      ],
      ["margin", "padding"],
    ];
    const signature = (elements: Element[]) =>
      elements.map((element, index) => {
        const rect = element.getBoundingClientRect();
        const wrapRect = element.parentElement!.getBoundingClientRect();
        const computed = getComputedStyle(element);
        return {
          height: rect.height,
          left: rect.left - wrapRect.left,
          style: properties[index].map((property) => computed.getPropertyValue(property)),
          top: rect.top - wrapRect.top,
          width: rect.width,
        };
      });
    const actualDescription = actualWrap.querySelector<HTMLElement>(
      '[data-stylex-owner="user-email-description"]',
    )!;
    const equivalent =
      JSON.stringify(signature([actualSeparator, actualDescription])) ===
      JSON.stringify(signature([fallbackSeparator, fallbackDescription]));
    clone.remove();
    return { equivalent };
  });
}

async function mockPrimaryEmailSettings(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      json: session,
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, fulfillSession);
  }
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "",
          displayName: "Admin User",
          loginId: "admin",
          primaryEmailAddress: "admin@example.com",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      },
    }),
  );
}
