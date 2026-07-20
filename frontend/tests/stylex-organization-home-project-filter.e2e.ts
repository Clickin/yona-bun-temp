import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const routeSource = new URL("../src/routes/organizations/$organizationName.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/organizations/-organization-home.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/organization/view.scala.html",
  import.meta.url,
);
const pageLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const yobiUiSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_yobiUI.less",
  import.meta.url,
);
const variablesSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_variables.less",
  import.meta.url,
);
const bootstrapSource = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap.css",
  import.meta.url,
);

test("organization home project filter uses conditional StyleX visibility", async () => {
  const [route, style, legacy, pageLess, yobiUi, variables, bootstrap] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(pageLessSource, "utf8"),
    readFile(yobiUiSource, "utf8"),
    readFile(variablesSource, "utf8"),
    readFile(bootstrapSource, "utf8"),
  ]);
  expect(legacy).toContain("project");
  expect(route).toContain('data-stylex-owner="organization-home-project-filter-item"');
  expect(route).toContain("projectHidden");
  expect(route).not.toContain('style={hidden ? { display: "none" } : undefined}');
  expect(style).toContain('projectHidden: { display: "none" }');
  expect(route).toContain('borderBottomColor: "#DCDCDC"');
  expect(route).toContain('borderBottomStyle: "solid"');
  expect(route).toContain('borderBottomWidth: "1px"');
  expect(route).toContain('overflow: "hidden"');
  expect(route).toContain('padding: "15px 0 10px 0"');
  expect(route).toContain('data-stylex-owner="organization-home-project-card-owner-avatar"');
  expect(route).toContain('data-stylex-owner="organization-home-project-card-header"');
  expect(route).toContain('data-stylex-owner="organization-home-project-card-description"');
  expect(route).toContain('data-stylex-owner="organization-home-project-card-name-tag"');
  expect(route).toContain('data-stylex-owner="organization-home-project-card-stats"');
  expect(style).toContain("projectCardOwnerAvatar:");
  expect(style).toContain('overflow: "hidden"');
  expect(style).toContain('display: "inline"');
  expect(style).toContain('float: "left"');
  expect(style).toContain('width: "50px"');
  expect(style).toContain('height: "50px"');
  expect(style).toContain('marginRight: "10px"');
  expect(style).toContain('borderRadius: "3px"');
  expect(style).toContain('position: "relative"');
  expect(style).toContain("projectCardHeader:");
  expect(style).toContain('fontSize: "20px"');
  expect(style).toContain('fontWeight: "bold"');
  expect(style).toContain('marginBottom: "5px"');
  expect(style).toContain('marginLeft: "10px"');
  expect(style).toContain("projectCardDescription:");
  expect(style).toContain('overflowY: "auto"');
  expect(style).toContain('maxHeight: "100px"');
  expect(style).toContain('maxWidth: "647px"');
  expect(style).toContain('textOverflow: "ellipsis"');
  expect(style).toContain('color: "#bababa"');
  expect(style).toContain("projectCardNameTag:");
  expect(style).toContain('fontSize: "11px"');
  expect(style).toContain('color: "#999"');
  expect(style).toContain('projectCardStats: { marginTop: "0", textAlign: "right" }');
  expect(legacy).toContain('<div class="stats-wrap pull-right">');
  expect(bootstrap).toContain(".pull-right {\n  float: right;\n}");
  expect(style).toContain('projectCardStatsWrapper: { float: "right" }');
  expect(route).toContain("styles.projectCardStatsWrapper");
  expect(route).toContain('data-stylex-owner="organization-home-project-card-stats"');
  expect(pageLess).toContain("padding: 15px 0 10px 0;");
  expect(pageLess).toContain("overflow: hidden;");
  expect(pageLess).toContain("border-bottom: 1px solid #DCDCDC;");
  expect(pageLess).toContain(".members {");
  expect(pageLess).toContain("width:100%;");
  expect(pageLess).toContain("display:inline-block;");
  expect(pageLess).toContain("padding-left: 50px;");
  expect(pageLess).toContain("strong { color:@secondary; }");
  expect(variables).toContain("@blue2  : #51AACC;");
  expect(variables).toContain("@secondary       : @blue2;");
  expect(style).toContain('projectCardMembers: { width: "100%" }');
  expect(style).toContain('display: "inline-block"');
  expect(style).toContain('paddingLeft: "50px"');
  expect(style).toContain('overflow: "hidden"');
  expect(style).toContain('projectCardStatsCount: { color: "#51AACC" }');
  expect(route).toContain('data-stylex-owner="organization-home-project-card-members"');
  expect(route).toContain('data-stylex-owner="organization-home-project-card-members-list"');
  expect(route).toContain('data-stylex-owner="organization-home-project-card-count"');
  expect(route).toContain('data-stylex-owner="organization-home-search-bar"');
  expect(route).toContain('data-stylex-owner="organization-home-search-input"');
  expect(route).toContain('data-stylex-owner="organization-home-search-button"');
  expect(style).toContain("searchBar:");
  expect(style).toContain('backgroundColor: "#FFF"');
  expect(style).toContain('borderColor: "#ccc"');
  expect(style).toContain('borderRadius: "3px"');
  expect(style).toContain('height: "20px"');
  expect(style).toContain('lineHeight: "20px"');
  expect(style).toContain('padding: "4px 25px 4px 5px"');
  expect(style).toContain('position: "relative"');
  expect(style).toContain('"@media (max-width: 767px)": { margin: "5px 0" }');
  expect(style).toContain("searchTextbox:");
  expect(style).toContain('margin: "0 -5px"');
  expect(style).toContain('padding: "0 5px"');
  expect(style).toContain('width: "350px"');
  expect(style).toContain('searchTextboxFull: { width: "100%" }');
  expect(style).toContain("searchButton:");
  expect(style).toContain('backgroundColor: "transparent"');
  expect(style).toContain('position: "absolute"');
  expect(style).toContain('right: "5px"');
  expect(style).toContain('top: "5px"');
  expect(yobiUi).toContain(".search-bar {");
  expect(yobiUi).toContain("border:1px solid #ccc;");
  expect(yobiUi).toContain("padding:4px 25px 4px 5px;");
  expect(yobiUi).toContain(".textbox {");
  expect(yobiUi).toContain(".search-btn {");
  expect(legacy).toContain('<ul class="all-projects">');
  expect(pageLess).toContain(".all-projects {");
  expect(pageLess).toContain("margin: 0 0 20px;");
  expect(pageLess).toContain("list-style: none;");
  expect(pageLess).toContain("clear:both;");
  expect(style).toContain(
    'projects: { clear: "both", listStyle: "none", margin: "0 0 20px", minWidth: 0 }',
  );
  expect(route).toContain("className={`${stylex.props(styles.projects).className} all-projects`}");
  expect(route).toContain('data-stylex-owner="organization-home-projects"');
  expect(legacy).toContain('<div class="pull-right">');
  expect(bootstrap).toContain(".pull-right {");
  expect(bootstrap).toContain("float: right;");
  expect(style).toContain('createProjectWrapper: { float: "right" }');
  expect(route).toContain('data-stylex-owner="organization-home-create-project-wrapper"');
});

async function mockOrganizationHome(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        description: "Web labs group",
        logoUrl: "",
        viewerCanUpdate: true,
        viewerCanLeave: true,
        viewerCanLeaveAfterValidation: true,
        viewerCanCreateProject: true,
        visibleProjects: [
          {
            ownerName: "weblabs",
            projectName: "sample",
            overview: "Sample project",
            projectScope: "PUBLIC",
            createdLabel: "today",
            memberCount: 3,
            watchCount: 4,
            isWatching: true,
            labels: [],
          },
          {
            ownerName: "weblabs",
            projectName: "other",
            overview: "Other project",
            projectScope: "PUBLIC",
            createdLabel: "yesterday",
            memberCount: 1,
            watchCount: 2,
            isWatching: false,
            labels: [],
          },
        ],
        adminMembers: [],
        memberMembers: [],
      },
    }),
  );
}

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`organization project card owns frozen geometry and filtering on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockOrganizationHome(page);
    await page.goto("/yona/organizations/weblabs");

    const card = page
      .locator('[data-stylex-owner="organization-home-project-filter-item"]')
      .first();
    const list = page.locator('[data-stylex-owner="organization-home-projects"]');
    const searchBar = page.locator('[data-stylex-owner="organization-home-search-bar"]');
    const searchInput = page.locator('[data-stylex-owner="organization-home-search-input"]');
    const searchButton = page.locator('[data-stylex-owner="organization-home-search-button"]');
    const createProjectWrapper = page.locator(
      '[data-stylex-owner="organization-home-create-project-wrapper"]',
    );
    const createProjectLink = createProjectWrapper.getByRole("link", {
      name: /create new project/i,
    });
    await expect(card).toBeVisible();
    await expect(searchBar).toBeVisible();
    await expect(searchInput).toBeVisible();
    await expect(searchButton).toBeAttached();
    await expect(createProjectWrapper).toBeVisible();
    await expect(createProjectLink).toBeVisible();
    await expect(createProjectLink).toHaveAttribute("href", /owner=weblabs/);
    const createProjectMetrics = await createProjectWrapper.evaluate((node) => {
      const style = getComputedStyle(node);
      const wrapperBox = node.getBoundingClientRect();
      const searchBox = node.parentElement?.querySelector(".search-bar")?.getBoundingClientRect();
      return {
        float: style.float,
        left: wrapperBox.left,
        right: wrapperBox.right,
        parentRight: node.parentElement?.getBoundingClientRect().right ?? 0,
        searchRight: searchBox?.right ?? 0,
      };
    });
    expect(createProjectMetrics.float).toBe("right");
    expect(createProjectMetrics.right).toBeLessThanOrEqual(createProjectMetrics.parentRight);
    expect(createProjectMetrics.left).toBeGreaterThanOrEqual(createProjectMetrics.searchRight);
    await expect(searchInput).toHaveAttribute("placeholder", /.+/);
    const searchMetrics = await searchBar.evaluate((node) => {
      const bar = getComputedStyle(node);
      const input = node.querySelector<HTMLInputElement>(
        '[data-stylex-owner="organization-home-search-input"]',
      );
      const button = node.querySelector<HTMLButtonElement>(
        '[data-stylex-owner="organization-home-search-button"]',
      );
      const inputStyle = input ? getComputedStyle(input) : null;
      const buttonStyle = button ? getComputedStyle(button) : null;
      const barBox = node.getBoundingClientRect();
      const inputBox = input?.getBoundingClientRect();
      const buttonBox = button?.getBoundingClientRect();
      return {
        bar: {
          backgroundColor: bar.backgroundColor,
          border: `${bar.borderTopWidth} ${bar.borderTopStyle} ${bar.borderTopColor}`,
          borderRadius: bar.borderRadius,
          height: bar.height,
          lineHeight: bar.lineHeight,
          margin: bar.margin,
          padding: bar.padding,
          position: bar.position,
        },
        input: inputStyle
          ? {
              borderStyle: inputStyle.borderStyle,
              height: inputStyle.height,
              margin: inputStyle.margin,
              padding: inputStyle.padding,
              width: inputStyle.width,
            }
          : null,
        button: buttonStyle
          ? {
              backgroundColor: buttonStyle.backgroundColor,
              borderStyle: buttonStyle.borderStyle,
              height: buttonStyle.height,
              outlineStyle: buttonStyle.outlineStyle,
              position: buttonStyle.position,
              right: buttonStyle.right,
              top: buttonStyle.top,
              visibility: buttonStyle.visibility,
            }
          : null,
        containment:
          inputBox && buttonBox
            ? inputBox.left >= barBox.left &&
              inputBox.right <= barBox.right &&
              buttonBox.top >= barBox.top &&
              buttonBox.bottom <= barBox.bottom &&
              buttonBox.right <= barBox.right
            : false,
      };
    });
    expect(searchMetrics.bar).toEqual({
      backgroundColor: "rgb(255, 255, 255)",
      border: "1px solid rgb(204, 204, 204)",
      borderRadius: "3px",
      height: "20px",
      lineHeight: "20px",
      margin: viewport.name === "mobile" ? "5px 0px" : "0px",
      padding: "4px 25px 4px 5px",
      position: "relative",
    });
    expect(searchMetrics.input).toMatchObject({
      borderStyle: "none",
      height: "20px",
      margin: "0px -5px",
      padding: "0px 5px",
    });
    expect(searchMetrics.input?.width).toMatch(/px$/);
    expect(Number.parseFloat(searchMetrics.input?.width ?? "0")).toBeGreaterThan(0);
    expect(searchMetrics.button).toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      borderStyle: "none",
      height: "20px",
      outlineStyle: "none",
      position: "absolute",
      right: "5px",
      top: "5px",
      visibility: "visible",
    });
    expect(searchMetrics.containment).toBe(true);
    await expect(card.locator(".header a.black")).toHaveText("sample");
    await expect(card.locator(".desc")).toHaveText("Sample project");

    const metrics = await card.evaluate((node) => {
      const ownerAvatar = node.querySelector(
        '[data-stylex-owner="organization-home-project-card-owner-avatar"]',
      );
      const header = node.querySelector(
        '[data-stylex-owner="organization-home-project-card-header"]',
      );
      const description = node.querySelector(
        '[data-stylex-owner="organization-home-project-card-description"]',
      );
      const nameTag = node.querySelector(
        '[data-stylex-owner="organization-home-project-card-name-tag"]',
      );
      const stats = node.querySelector(
        '[data-stylex-owner="organization-home-project-card-stats"]',
      );
      const members = node.querySelector(
        '[data-stylex-owner="organization-home-project-card-members"]',
      );
      const memberList = node.querySelector(
        '[data-stylex-owner="organization-home-project-card-members-list"]',
      );
      const counts = node.querySelectorAll(
        '[data-stylex-owner="organization-home-project-card-count"]',
      );
      const style = getComputedStyle(node);
      const cardBox = node.getBoundingClientRect();
      const listBox = node.parentElement?.getBoundingClientRect();
      const ownerStyle = ownerAvatar ? getComputedStyle(ownerAvatar) : null;
      const headerStyle = header ? getComputedStyle(header) : null;
      const descriptionStyle = description ? getComputedStyle(description) : null;
      const nameTagStyle = nameTag ? getComputedStyle(nameTag) : null;
      const statsStyle = stats ? getComputedStyle(stats) : null;
      const membersStyle = members ? getComputedStyle(members) : null;
      const memberListStyle = memberList ? getComputedStyle(memberList) : null;
      return {
        borderBottom: `${style.borderBottomWidth} ${style.borderBottomStyle} ${style.borderBottomColor}`,
        cardBottom: cardBox.bottom,
        cardTop: cardBox.top,
        listBottom: listBox?.bottom ?? 0,
        overflow: style.overflow,
        padding: style.padding,
        ownerAvatar: ownerStyle
          ? {
              borderRadius: ownerStyle.borderRadius,
              display: ownerStyle.display,
              float: ownerStyle.float,
              height: ownerStyle.height,
              marginRight: ownerStyle.marginRight,
              overflow: ownerStyle.overflow,
              position: ownerStyle.position,
              width: ownerStyle.width,
            }
          : null,
        header: headerStyle
          ? {
              fontSize: headerStyle.fontSize,
              fontWeight: headerStyle.fontWeight,
              marginBottom: headerStyle.marginBottom,
              marginLeft: headerStyle.marginLeft,
            }
          : null,
        description: descriptionStyle
          ? {
              color: descriptionStyle.color,
              marginLeft: descriptionStyle.marginLeft,
              maxHeight: descriptionStyle.maxHeight,
              maxWidth: descriptionStyle.maxWidth,
              overflowY: descriptionStyle.overflowY,
              textOverflow: descriptionStyle.textOverflow,
            }
          : null,
        nameTag: nameTagStyle
          ? {
              color: nameTagStyle.color,
              fontSize: nameTagStyle.fontSize,
              margin: nameTagStyle.margin,
              marginLeft: nameTagStyle.marginLeft,
            }
          : null,
        stats: statsStyle
          ? {
              float: statsStyle.float,
              marginTop: statsStyle.marginTop,
              textAlign: statsStyle.textAlign,
              width: statsStyle.width,
            }
          : null,
        statsGeometry: stats
          ? (() => {
              const box = stats.getBoundingClientRect();
              const parentBox = node.getBoundingClientRect();
              return {
                left: box.left,
                right: box.right,
                parentLeft: parentBox.left,
                parentRight: parentBox.right,
              };
            })()
          : null,
        members: membersStyle ? { width: membersStyle.width } : null,
        memberList: memberListStyle
          ? {
              display: memberListStyle.display,
              overflow: memberListStyle.overflow,
              paddingLeft: memberListStyle.paddingLeft,
            }
          : null,
        counts: Array.from(counts, (count) => ({
          color: getComputedStyle(count).color,
          text: count.textContent?.trim() ?? "",
        })),
        icons: Array.from(
          node.querySelectorAll(".stats-wrap .members i"),
          (icon) => icon.className,
        ),
      };
    });
    const listMetrics = await list.evaluate((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return {
        bottom: box.bottom,
        clear: style.clear,
        listStyle: style.listStyleType,
        margin: style.margin,
        top: box.top,
      };
    });
    expect(listMetrics.clear).toBe("both");
    expect(listMetrics.listStyle).toBe("none");
    expect(listMetrics.margin).toBe("0px 0px 20px");
    expect(listMetrics.bottom).toBeGreaterThan(listMetrics.top);
    expect(metrics.padding).toBe("15px 0px 10px");
    expect(metrics.overflow).toBe("hidden");
    expect(metrics.borderBottom).toBe("1px solid rgb(220, 220, 220)");
    expect(metrics.ownerAvatar).toEqual({
      borderRadius: "3px",
      display: viewport.name === "desktop" ? "block" : "none",
      float: "left",
      height: "50px",
      marginRight: "10px",
      overflow: "hidden",
      position: "relative",
      width: "50px",
    });
    expect(metrics.header).toEqual({
      fontSize: "20px",
      fontWeight: "700",
      marginBottom: "5px",
      marginLeft: "10px",
    });
    expect(metrics.description).toEqual({
      color: "rgb(186, 186, 186)",
      marginLeft: "10px",
      maxHeight: "100px",
      maxWidth: "647px",
      overflowY: "auto",
      textOverflow: "ellipsis",
    });
    expect(metrics.nameTag).toEqual({
      color: "rgb(153, 153, 153)",
      fontSize: "11px",
      margin: "0px 0px 0px 10px",
      marginLeft: "10px",
    });
    expect(metrics.stats?.marginTop).toBe("0px");
    expect(metrics.stats?.textAlign).toBe("right");
    expect(metrics.stats?.float).toBe("right");
    expect(metrics.statsGeometry?.left).toBeGreaterThanOrEqual(
      metrics.statsGeometry?.parentLeft ?? 0,
    );
    expect(metrics.statsGeometry?.right).toBeLessThanOrEqual(
      metrics.statsGeometry?.parentRight ?? 0,
    );
    expect(metrics.members?.width).toBe(metrics.stats?.width);
    expect(metrics.memberList).toEqual({
      display: "inline-block",
      overflow: "hidden",
      paddingLeft: "50px",
    });
    expect(metrics.counts).toEqual([
      { color: "rgb(81, 170, 204)", text: "3" },
      { color: "rgb(81, 170, 204)", text: "4" },
    ]);
    expect(metrics.icons).toEqual([
      "yobicon-friends yobicon-middle",
      "yobicon-eye",
      "yobicon-lightbulb ramp-on",
    ]);
    expect(metrics.cardTop).toBeGreaterThanOrEqual(0);
    expect(metrics.cardBottom).toBeLessThanOrEqual(metrics.listBottom);

    const filter = page.locator("#mylist-filter");
    await filter.fill("missing");
    await expect(card).toBeHidden();
    await expect(
      list.locator('[data-stylex-owner="organization-home-project-filter-item"]'),
    ).toHaveCount(2);
    await filter.fill("sample");
    await expect(card).toBeVisible();
    await expect(card.locator(".header a.black")).toHaveText("sample");
  });
}
