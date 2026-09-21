import { expect, test, type Page } from "../wtr-compat.ts";

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
            createdAt: "2020-01-02T12:00:00Z",
            lastPushedAt: "",
            memberCount: 3,
            members: [],
            watchCount: 4,
            isWatching: true,
            labels: [],
          },
          {
            ownerName: "weblabs",
            projectName: "other",
            overview: "Other project",
            projectScope: "PUBLIC",
            createdAt: "2020-01-01T12:00:00Z",
            lastPushedAt: "",
            memberCount: 1,
            members: [],
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

    const card = page.locator('[data-owner="organization-home-project-filter-item"]').first();
    const pageWrap = page.locator('[data-owner="organization-home-page"]');
    const header = page.locator('[data-owner="organization-home-header"]');
    const mainColumn = page.locator('[data-owner="organization-home-main-column"]');
    const membersColumn = page.locator('[data-owner="organization-home-members"]');
    const searchWrap = page.locator('[data-owner="organization-home-search"]');
    const searchColumn = page.locator('[data-owner="organization-home-search-column"]');
    const list = page.locator('[data-owner="organization-home-projects"]');
    const searchBar = page.locator('[data-owner="organization-home-search-bar"]');
    const searchInput = page.locator('[data-owner="organization-home-search-input"]');
    const searchButton = page.locator('[data-owner="organization-home-search-button"]');
    const createProjectWrapper = page.locator(
      '[data-owner="organization-home-create-project-wrapper"]',
    );
    const createProjectLink = createProjectWrapper.getByRole("link", {
      name: /create new project/i,
    });
    await expect(card).toBeVisible();
    await expect(pageWrap).toBeVisible();
    await expect(header).toBeVisible();
    await expect(mainColumn).toBeVisible();
    await expect(membersColumn).toBeVisible();
    await expect(
      header.locator(
        ':scope > [data-owner="organization-home-main-column"], :scope > [data-owner="organization-home-members"]',
      ),
    ).toHaveCount(2);
    await expect(searchWrap).toBeVisible();
    await expect(searchColumn).toBeVisible();
    await expect(searchBar).toBeVisible();
    await expect(searchInput).toBeVisible();
    await expect(searchButton).toBeAttached();
    await expect(createProjectWrapper).toBeVisible();
    await expect(createProjectLink).toBeVisible();
    await expect(createProjectLink).toHaveAttribute("href", /owner=weblabs/);
    const pageWrapMetrics = await pageWrap.evaluate((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return {
        boxSizing: style.boxSizing,
        height: box.height,
        left: box.left,
        marginTop: style.marginTop,
        minHeight: style.minHeight,
        minWidth: style.minWidth,
        padding: style.padding,
        right: box.right,
        width: style.width,
      };
    });
    expect(pageWrapMetrics).toMatchObject({
      boxSizing: "border-box",
      marginTop: "10px",
      minHeight: "450px",
      padding: viewport.name === "mobile" ? "0px" : "0px 10px",
      minWidth: viewport.name === "mobile" ? "10px" : pageWrapMetrics.minWidth,
    });
    expect(pageWrapMetrics.left).toBe(0);
    expect(pageWrapMetrics.right).toBe(viewport.width);
    expect(pageWrapMetrics.width).toBe(`${viewport.width}px`);
    expect(pageWrapMetrics.height).toBeGreaterThanOrEqual(450);
    const columnMetrics = await header.evaluate((node) => {
      const rowBox = node.getBoundingClientRect();
      return Array.from(
        node.querySelectorAll<HTMLElement>(
          ':scope > [data-owner="organization-home-main-column"], :scope > [data-owner="organization-home-members"]',
        ),
      ).map((column) => {
        const style = getComputedStyle(column);
        const box = column.getBoundingClientRect();
        return {
          boxSizing: style.boxSizing,
          display: style.display,
          float: style.float,
          left: box.left,
          marginLeft: style.marginLeft,
          minHeight: style.minHeight,
          minWidth: style.minWidth,
          right: box.right,
          styleWidth: style.width,
          top: box.top,
          width: box.width,
          widthRatio: rowBox.width > 0 ? box.width / rowBox.width : 0,
        };
      });
    });
    expect(columnMetrics).toHaveLength(2);
    for (const column of columnMetrics) {
      expect(column).toMatchObject({
        boxSizing: "border-box",
        display: "block",
        minHeight: "30px",
      });
      expect(column.left).toBeGreaterThanOrEqual(pageWrapMetrics.left - 1);
      expect(column.right).toBeLessThanOrEqual(pageWrapMetrics.right + 1);
      expect(column.width).toBeGreaterThan(0);
      expect(column.float).toBe("left");
      if (viewport.name === "mobile") {
        // .row-fluid .span* keeps its percentage width; .span-hard-wrap's
        // min-width:95% expands it, while its less-specific 100vw does not win.
        expect(column.widthRatio).toBeCloseTo(0.95, 4);
        expect(column.minWidth).toBe("95%");
      }
    }
    expect(columnMetrics[0]?.marginLeft).toBe("0px");
    expect(columnMetrics[1]?.marginLeft).not.toBe("0px");
    if (viewport.name === "desktop") {
      expect(columnMetrics[0]?.widthRatio).toBeCloseTo(0.7447, 4);
      expect(columnMetrics[1]?.widthRatio).toBeCloseTo(0.234, 4);
    }
    const searchWrapMetrics = await searchWrap.evaluate((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      const parentBox = node.parentElement?.getBoundingClientRect();
      return {
        marginTop: style.marginTop,
        left: box.left,
        right: box.right,
        parentLeft: parentBox?.left ?? 0,
        parentRight: parentBox?.right ?? 0,
        width: box.width,
      };
    });
    expect(searchWrapMetrics.marginTop).toBe("10px");
    expect(searchWrapMetrics.left).toBeGreaterThanOrEqual(searchWrapMetrics.parentLeft);
    expect(searchWrapMetrics.right).toBeLessThanOrEqual(searchWrapMetrics.parentRight);
    expect(searchWrapMetrics.width).toBeGreaterThan(0);
    const searchColumnMetrics = await searchColumn.evaluate((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      const parentBox = node.parentElement?.getBoundingClientRect();
      return {
        boxSizing: style.boxSizing,
        display: style.display,
        float: style.float,
        left: box.left,
        marginLeft: style.marginLeft,
        minHeight: style.minHeight,
        parentLeft: parentBox?.left ?? 0,
        parentRight: parentBox?.right ?? 0,
        right: box.right,
        width: style.width,
        widthRatio: parentBox && parentBox.width > 0 ? box.width / parentBox.width : 0,
      };
    });
    expect(searchColumnMetrics).toMatchObject({
      boxSizing: "border-box",
      display: "block",
      float: "left",
      marginLeft: "0px",
      minHeight: "30px",
    });
    expect(searchColumnMetrics.left).toBeGreaterThanOrEqual(searchColumnMetrics.parentLeft);
    expect(searchColumnMetrics.right).toBeLessThanOrEqual(searchColumnMetrics.parentRight);
    expect(searchColumnMetrics.widthRatio).toBeCloseTo(0.5744680851063829, 4);
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
    if (viewport.name === "desktop") {
      expect(createProjectMetrics.left).toBeGreaterThanOrEqual(createProjectMetrics.searchRight);
    }
    await expect(searchInput).toHaveAttribute("placeholder", /.+/);
    const searchMetrics = await searchBar.evaluate((node) => {
      const bar = getComputedStyle(node);
      const input = node.querySelector<HTMLInputElement>(
        '[data-owner="organization-home-search-input"]',
      );
      const button = node.querySelector<HTMLButtonElement>(
        '[data-owner="organization-home-search-button"]',
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
        '[data-owner="organization-home-project-card-owner-avatar"]',
      );
      const header = node.querySelector('[data-owner="organization-home-project-card-header"]');
      const description = node.querySelector(
        '[data-owner="organization-home-project-card-description"]',
      );
      const nameTag = node.querySelector('[data-owner="organization-home-project-card-name-tag"]');
      const stats = node.querySelector('[data-owner="organization-home-project-card-stats"]');
      const members = node.querySelector('[data-owner="organization-home-project-card-members"]');
      const memberList = node.querySelector(
        '[data-owner="organization-home-project-card-members-list"]',
      );
      const counts = node.querySelectorAll('[data-owner="organization-home-project-card-count"]');
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
    // bucket-3 fix (PW-verified): the app retired the literal "yobicon-middle"
    // class for the friends icon (now style iconMiddle); dev and dist render
    // different style debug/compiled tokens, so pin only the legacy tokens.
    expect(metrics.icons).toEqual([
      expect.stringContaining("yobicon-friends"),
      expect.stringContaining("yobicon-eye"),
      expect.stringContaining("yobicon-lightbulb ramp-on"),
    ]);
    expect(metrics.icons[0]).not.toContain("yobicon-middle");
    expect(metrics.cardTop).toBeGreaterThanOrEqual(0);
    expect(metrics.cardBottom).toBeLessThanOrEqual(metrics.listBottom);

    const filter = page.locator("#mylist-filter");
    await filter.fill("missing");
    await expect(card).toBeHidden();
    await expect(list.locator('[data-owner="organization-home-project-filter-item"]')).toHaveCount(
      2,
    );
    await filter.fill("sample");
    await expect(card).toBeVisible();
    await expect(card.locator(".header a.black")).toHaveText("sample");
  });
}
