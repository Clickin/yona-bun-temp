import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const EXPECTED_AUTHENTICATED_NOTIFICATION_ITEM = `
<li class="notification-stream">
  <div class="stream-type comment2">
    <i class="yobicon-comment2"></i>
  </div>
  <div class="stream-desc" data-target="message-notification-1" data-toggle="learnmore">
    <div class="stream-info">
      <div class="title">
        <a href="__BASE_PATH__/admin/sample/post/1#comment-1">Re: [sample] Seed notes (1)</a>
      </div>
      <div class="message-wrap nowrap" id="message-notification-1">
        <div class="message">Board seed confirmed from the fork contributor side.</div>
      </div>
      <div class="meta">
        <a class="avatar-wrap smaller" href="__BASE_PATH__/alice">
          <img src="/assets/images/default-avatar-128.png">
        </a>
        <a href="__BASE_PATH__/alice" class="author">Alice Kim</a>@alice
        <span class="ago pull-right" title="2026-07-07 11:25:34 AM">12 minutes ago</span>
      </div>
    </div>
  </div>
</li>
`;

const EXPECTED_ANONYMOUS_NOTIFICATION_FRAGMENT = `
<div class="warning-none">
  <i class="yobicon-danger"></i>No notification has been received.
</div>
`;

test("legacy singular notification browser route renders the raw notification fragment", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedNotifications(
    page,
    [
      {
        actor: {
          avatarUrl: "/assets/images/default-avatar-128.png",
          displayName: "Alice Kim",
          loginId: "alice",
        },
        createdAt: "2026-07-07 11:25:34 AM",
        createdLabel: "12 minutes ago",
        eventType: "NEW_COMMENT",
        id: "notification-1",
        message: "Board seed confirmed from the fork contributor side.",
        targetHref: "/admin/sample/post/1#comment-1",
        targetTitle: "Re: [sample] Seed notes (1)",
        typeIcon: "comment2",
      },
    ],
    { hasMore: true },
  );

  await page.goto(`${basePath}/notification?from=0&limit=20`);

  await expect(page).toHaveURL(`${basePath}/notification?from=0&limit=20`);
  await expect(page.locator('[data-owner="authenticated-home-notification-row"]')).toHaveCount(1);
  await expect(
    page.locator('[data-owner="authenticated-home-notification-pagination"]'),
  ).toBeVisible();
  await expect(
    page.locator(
      "[data-owner=global-gnb-outer], .page-wrap-outer, [data-owner=authenticated-home-main-stream], #setDefaultLoginPage",
    ),
  ).toHaveCount(0);

  expect(
    await canonicalizeSelector(page, '[data-owner="authenticated-home-notification-row"]'),
  ).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_AUTHENTICATED_NOTIFICATION_ITEM.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await canonicalizeSelector(page, "#notification-more")).toEqual(
    await canonicalizeHtml(
      page,
      '<button id="notification-more" type="button" class="ybtn">More</button>',
    ),
  );
  const metrics = await readFragmentMetrics(page);
  expect(metrics.hasShell).toBe(false);
  expect(metrics.firstTag).toBe("LI");
  expect(metrics.firstTop).toBeLessThan(32);
  expect(metrics.firstLeft).toBeLessThan(32);
  expect(metrics.childTags.slice(0, 2)).toEqual(["LI", "LI"]);

  const routeSource = readFileSync("src/routes/notification.tsx", "utf8");
  expect(routeSource).toContain('createFileRoute("/notification")');
  expect(routeSource).toContain("notificationFragmentOnly");
});

test("legacy singular notification browser route keeps the anonymous warning fragment", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAnonymousSession(page);

  await page.goto(`${basePath}/notification?from=0&limit=20`);

  await expect(page).toHaveURL(`${basePath}/notification?from=0&limit=20`);
  await expect(page.locator(".warning-none")).toContainText("No notification has been received.");
  await expect(
    page.locator('[data-owner="authenticated-home-notification-row"], #notification-more'),
  ).toHaveCount(0);
  await expect(
    page.locator(
      "[data-owner=global-gnb-outer], .page-wrap-outer, .siteintro-bg, #setDefaultLoginPage",
    ),
  ).toHaveCount(0);
  expect(await canonicalizeSelector(page, ".warning-none")).toEqual(
    await canonicalizeHtml(page, EXPECTED_ANONYMOUS_NOTIFICATION_FRAGMENT),
  );

  const metrics = await readFragmentMetrics(page);
  expect(metrics.hasShell).toBe(false);
  expect(metrics.firstTag).toBe("DIV");
  expect(metrics.firstTop).toBeLessThan(32);
  expect(metrics.firstLeft).toBeLessThan(32);
  expect(metrics.childTags[0]).toBe("DIV");
});

test("notifications list preserves authored metadata order and paginates rows", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const firstPage = [
    {
      actor: {
        avatarUrl: "/assets/images/default-avatar-128.png",
        displayName: "Alice Kim",
        loginId: "alice",
      },
      createdAt: "2026-07-07 11:25:34 AM",
      createdLabel: "12 minutes ago",
      eventType: "NEW_COMMENT",
      id: "notification-alice",
      message: "Board seed confirmed from Alice.",
      targetHref: "/admin/sample/post/1#comment-1",
      targetTitle: "Re: [sample] Review rail parity check (#1)",
      typeIcon: "comment2",
    },
    {
      actor: {
        avatarUrl: "/assets/images/default-avatar-128.png",
        displayName: "Bob Park",
        loginId: "bob",
      },
      createdAt: "2026-07-07 11:24:34 AM",
      createdLabel: "13 minutes ago",
      eventType: "NEW_COMMENT",
      id: "notification-bob",
      message: "Issue seed confirmed from Bob.",
      targetHref: "/admin/sample/issue/1#comment-1",
      targetTitle: "Re: [sample] Review rail parity check (#1)",
      typeIcon: "comment2",
    },
  ];
  const nextPage = {
    actor: {
      avatarUrl: "/assets/images/default-avatar-128.png",
      displayName: "Alice Kim",
      loginId: "alice",
    },
    createdAt: "2026-07-07 11:23:34 AM",
    createdLabel: "14 minutes ago",
    eventType: "NEW_COMMENT",
    id: "notification-next",
    message: "Next page notification.",
    targetHref: "/admin/sample/post/2#comment-2",
    targetTitle: "Re: [sample] Next page",
    typeIcon: "comment2",
  };

  await mockAuthenticatedNotifications(page, firstPage, {
    hasMore: true,
    nextItems: [nextPage],
  });
  await page.goto(`${basePath}/notifications`);

  const rows = page.locator('[data-owner="authenticated-home-notification-row"]');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator(".author")).toHaveText("Alice Kim");
  await expect(rows.nth(1).locator(".author")).toHaveText("Bob Park");
  await expect(rows.nth(0).locator(".meta")).toContainText("@alice");
  await expect(rows.nth(1).locator(".meta")).toContainText("@bob");
  await expect(rows.nth(0).locator(".avatar-wrap img")).toHaveAttribute(
    "src",
    "/assets/images/default-avatar-128.png",
  );
  await expect(rows.nth(0).locator(".title a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/post/1#comment-1`,
  );
  await expect(rows.nth(1).locator(".title a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/1#comment-1`,
  );

  const orderAndGeometry = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-owner="authenticated-home-notification-row"]')).map(
      (row) => {
        const element = row as HTMLElement;
        const childOrder = Array.from(element.children).map((child) => child.className);
        const meta = element.querySelector<HTMLElement>(".meta");
        const avatar = element.querySelector<HTMLElement>(".avatar-wrap");
        const author = element.querySelector<HTMLElement>(".author");
        const ago = element.querySelector<HTMLElement>(".ago");
        const box = (target: HTMLElement | null) => {
          const rect = target?.getBoundingClientRect();
          return rect ? { bottom: rect.bottom, left: rect.left, top: rect.top } : null;
        };
        return {
          childOrder,
          meta: box(meta),
          avatar: box(avatar),
          author: box(author),
          ago: box(ago),
        };
      },
    ),
  );
  expect(orderAndGeometry).toHaveLength(2);
  expect(orderAndGeometry[0]?.childOrder).toEqual(["stream-type comment2", "stream-desc"]);
  // Legacy _page.less: .stream-info .avatar-wrap has margin-top: 3px.
  expect(orderAndGeometry[0]?.avatar?.top).toBe(
    (orderAndGeometry[0]?.meta?.top ?? 0) + 3,
  );
  expect(orderAndGeometry[0]?.author?.left).toBeGreaterThan(
    orderAndGeometry[0]?.avatar?.left ?? -1,
  );
  expect(orderAndGeometry[0]?.ago?.left).toBeGreaterThan(
    orderAndGeometry[0]?.author?.left ?? -1,
  );

  await page.locator("#notification-more").click();
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(2).locator(".author")).toHaveText("Alice Kim");
  await expect(rows.nth(2).locator(".title a")).toHaveText("Re: [sample] Next page");
  await expect(page.locator("#notification-more")).toHaveCount(0);
});

async function mockAnonymousSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: null,
        defaultLandingPath: "/",
        emailAddress: "",
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
        loginId: "",
        userLabel: "",
      }),
    });
  });
}

async function mockAuthenticatedNotifications(
  page: Page,
  items: unknown[],
  options: { defaultLandingPath?: string; hasMore?: boolean; nextItems?: unknown[] } = {},
) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        defaultLandingPath: options.defaultLandingPath ?? "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/notifications?*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const from = Number(requestUrl.searchParams.get("from") ?? "0");
    const responseItems = from > 0 ? (options.nextItems ?? []) : items;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        hasMore: from > 0 ? false : (options.hasMore ?? false),
        items: responseItems,
        total: responseItems.length,
      }),
    });
  });
  await page.route("**/api/v1/workspace/overview", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        favoriteOrganizations: [],
        ownProjects: [],
        recentProjects: [],
        recentIssues: [],
      }),
    });
  });
}

async function readFragmentMetrics(page: Page) {
  return page.evaluate(() => {
    const shell = document.querySelector(
      "[data-owner=global-gnb-outer], .page-wrap-outer, .siteintro-bg",
    );
    const main = document.querySelector<HTMLElement>("#main");
    const outletHost = main?.querySelector<HTMLElement>(":scope > div") ?? main;
    const firstFragmentNode =
      outletHost?.querySelector<HTMLElement>(
        ':scope > [data-owner="authenticated-home-notification-row"], :scope > .warning-none',
      ) ?? null;
    if (!firstFragmentNode || !main || !outletHost) {
      throw new Error("Expected singular notification fragment targets are missing.");
    }

    const firstBox = firstFragmentNode.getBoundingClientRect();
    const childTags = Array.from(outletHost.children)
      .filter(
        (element) =>
          element.id !== "yobiToasts" &&
          element.id !== "tplYobiToast" &&
          !element.classList.contains("modal-backdrop"),
      )
      .map((element) => element.tagName);

    return {
      childTags,
      firstLeft: Math.round(firstBox.left),
      firstTag: firstFragmentNode.tagName,
      firstTop: Math.round(firstBox.top),
      hasShell: Boolean(shell),
    };
  });
}

async function canonicalizeSelector(page: Page, selector: string) {
  return page.evaluate((targetSelector) => {
    const root = document.querySelector(targetSelector);
    if (!root) {
      throw new Error(`Missing selector: ${targetSelector}`);
    }
    return visit(root);

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
        "autocomplete",
        "accesskey",
        "placeholder",
        "href",
        "src",
        "target",
        "title",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => normalizeAttribute(current, name))
        .filter(Boolean)
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      const children = Array.from(current.childNodes)
        .map((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            return (child.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          if (child.nodeType === Node.ELEMENT_NODE) {
            return visit(child as Element);
          }
          return "";
        })
        .filter(Boolean)
        .join("");

      return `${open}${children}</${current.tagName.toLowerCase()}>`;
    }

    function normalizeAttribute(current: Element, name: string) {
      if (name === "class") {
        const className = (current.getAttribute(name) ?? "")
          .split(/\s+/)
          .filter(
            (value, index, values) =>
              value &&
              values.indexOf(value) === index &&
              (value === "avatar-wrap" ||
                value === "smaller" ||
                value === "ybtn" ||
                value === "warning-none" ||
                value.startsWith("yobicon-")),
          )
          .join(" ");
        return className ? `${name}=${JSON.stringify(className)}` : "";
      }
      return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
    }
  }, selector);
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      return Array.from(template.content.children)
        .map((root) => visit(root))
        .join("");

      function visit(current: Element): string {
        const stableAttributes = [
          "id",
          "class",
          "name",
          "type",
          "method",
          "action",
          "value",
          "autocomplete",
          "accesskey",
          "placeholder",
          "href",
          "src",
          "target",
          "title",
        ];
        const attrs = stableAttributes
          .filter((name) => current.hasAttribute(name))
          .map((name) => normalizeAttribute(current, name))
          .filter(Boolean)
          .join(" ");
        const open = attrs
          ? `<${current.tagName.toLowerCase()} ${attrs}>`
          : `<${current.tagName.toLowerCase()}>`;
        const children = Array.from(current.childNodes)
          .map((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
              return (child.textContent ?? "").replace(/\s+/g, " ").trim();
            }
            if (child.nodeType === Node.ELEMENT_NODE) {
              return visit(child as Element);
            }
            return "";
          })
          .filter(Boolean)
          .join("");

        return `${open}${children}</${current.tagName.toLowerCase()}>`;
      }

      function normalizeAttribute(current: Element, name: string) {
        if (name === "class") {
          const className = (current.getAttribute(name) ?? "")
            .split(/\s+/)
            .filter(
              (value, index, values) =>
                value &&
                values.indexOf(value) === index &&
                (value === "avatar-wrap" ||
                  value === "smaller" ||
                  value === "ybtn" ||
                  value === "warning-none" ||
                  value.startsWith("yobicon-")),
            )
            .join(" ");
          return className ? `${name}=${JSON.stringify(className)}` : "";
        }
        return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
      }
    },
    { markup: html },
  );
}
