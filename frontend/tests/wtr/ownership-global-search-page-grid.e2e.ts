import { expect, test } from "../wtr-compat.ts";

test("global search page grid stays bounded at desktop and mobile widths", async ({ page }) => {
  const session = {
    actorId: 1,
    defaultLandingPath: "/",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const path of ["**/api/auth/session", "**/api/v1/auth/session", "**/api/v1/session"]) {
    await page.route(path, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/search**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        context: { organizationName: "", ownerName: "", projectName: "" },
        counts: {
          issueComments: 0,
          issues: 1,
          milestones: 0,
          postComments: 0,
          posts: 0,
          projects: 0,
          reviews: 0,
          users: 0,
        },
        items: [
          {
            authorLabel: "Admin",
            authorLoginId: "admin",
            createdLabel: "today",
            href: "/admin/sample/issue/1",
            id: "1",
            number: "1",
            ownerName: "admin",
            projectName: "sample",
            snippets: [{ highlights: [], text: "Issue body" }],
            state: "OPEN",
            title: "Grid issue",
            type: "issue",
            updatedLabel: "",
          },
        ],
        keyword: "grid",
        pageNum: 1,
        pageSize: 20,
        requestedSearchType: "issue",
        scope: "global",
        searchType: "issue",
        totalCount: 1,
      },
    }),
  );

  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/yona/search?keyword=grid&searchType=issue", {
      waitUntil: "domcontentloaded",
    });
    await page.locator('[data-owner="global-search-grid-row"]').waitFor();
    const geometry = await page.evaluate(() => {
      const row = document.querySelector('[data-owner="global-search-grid-row"]');
      const category = document.querySelector('[data-owner="global-search-category"]');
      const results = document.querySelector('[data-owner="global-search-results-column"]');
      const form = document.querySelector("#searchInnerForm");
      const input = document.querySelector("#searchKeyword");
      const submit = form?.querySelector('button[type="submit"]');
      const breadcrumb = document.querySelector(".site-breadcrumb-outer");
      if (!row || !category || !results || !form || !input || !submit || !breadcrumb) return null;
      const rowRect = row.getBoundingClientRect();
      const categoryRect = category.getBoundingClientRect();
      const resultsRect = results.getBoundingClientRect();
      const formRect = form.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      const submitRect = submit.getBoundingClientRect();
      return {
        breadcrumbHeight: breadcrumb.getBoundingClientRect().height,
        categoryHeight: categoryRect.height,
        categoryLeft: categoryRect.left,
        categoryRight: categoryRect.right,
        resultsLeft: resultsRect.left,
        resultsRight: resultsRect.right,
        rowLeft: rowRect.left,
        rowRight: rowRect.right,
        formDisplay: getComputedStyle(form).display,
        formLeft: formRect.left,
        formWidth: formRect.width,
        inputBorder: getComputedStyle(input).border,
        inputDisplay: getComputedStyle(input).display,
        inputHeight: inputRect.height,
        inputLeft: inputRect.left,
        inputRight: inputRect.right,
        inputTop: inputRect.top,
        inputWidth: inputRect.width,
        submitLeft: submitRect.left,
        submitMarginLeft: getComputedStyle(submit).marginLeft,
        submitTop: submitRect.top,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry!.breadcrumbHeight).toBe(45);
    expect(geometry!.categoryHeight).toBeGreaterThan(0);
    expect(geometry!.rowRight).toBeLessThanOrEqual(geometry!.viewportWidth + 1);
    expect(geometry!.resultsRight).toBeLessThanOrEqual(geometry!.viewportWidth + 1);
    expect(geometry!.scrollWidth).toBeLessThanOrEqual(geometry!.viewportWidth);
    if (width <= 767) {
      expect(geometry!.categoryLeft).toBeCloseTo(geometry!.rowLeft, 0);
      expect(geometry!.resultsLeft).toBeCloseTo(geometry!.rowLeft, 0);
    } else {
      expect(geometry!.categoryRight).toBeLessThan(geometry!.resultsLeft);
      // Live legacy capture: 1014.242px input in a 1108.594px form at 1366px.
      // Preserve its inline bordered field and whitespace-separated submit, not flex sizing.
      expect(geometry!.formDisplay).toBe("block");
      expect(geometry!.inputDisplay).toBe("inline-block");
      expect(geometry!.inputBorder).toBe("1px solid rgb(204, 204, 204)");
      expect(geometry!.inputHeight).toBe(30);
      expect(geometry!.inputLeft).toBeCloseTo(geometry!.formLeft, 1);
      expect(
        Math.abs(geometry!.inputWidth - geometry!.formWidth * (1014.2421875 / 1108.59375)),
      ).toBeLessThanOrEqual(1);
      expect(geometry!.submitTop).toBeCloseTo(geometry!.inputTop, 1);
      expect(geometry!.submitMarginLeft).toBe("4.2px");
      expect(geometry!.submitLeft - geometry!.inputRight).toBeGreaterThan(0);
      expect(geometry!.submitLeft - geometry!.inputRight).toBeLessThanOrEqual(12);
    }
  }
});
