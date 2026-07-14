import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

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
  await expect(
    page.locator('[data-stylex-owner="authenticated-home-notification-row"]'),
  ).toHaveCount(1);
  await expect(page.locator("#notification-more")).toBeVisible();
  await expect(
    page.locator(
      "[data-stylex-owner=global-gnb-outer], .page-wrap-outer, [data-stylex-owner=authenticated-home-main-stream], #setDefaultLoginPage",
    ),
  ).toHaveCount(0);

  expect(
    await canonicalizeSelector(page, '[data-stylex-owner="authenticated-home-notification-row"]'),
  ).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_AUTHENTICATED_NOTIFICATION_ITEM.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await canonicalizeSelector(page, "#notification-more")).toEqual(
    await canonicalizeHtml(
      page,
      '<button id="notification-more" class="ybtn" type="button">More</button>',
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
    page.locator('[data-stylex-owner="authenticated-home-notification-row"], #notification-more'),
  ).toHaveCount(0);
  await expect(
    page.locator(
      "[data-stylex-owner=global-gnb-outer], .page-wrap-outer, .siteintro-bg, #setDefaultLoginPage",
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
  options: { defaultLandingPath?: string; hasMore?: boolean } = {},
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
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        hasMore: options.hasMore ?? false,
        items,
        total: items.length,
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
      "[data-stylex-owner=global-gnb-outer], .page-wrap-outer, .siteintro-bg",
    );
    const main = document.querySelector<HTMLElement>("#main");
    const outletHost = main?.querySelector<HTMLElement>(":scope > div") ?? main;
    const firstFragmentNode =
      outletHost?.querySelector<HTMLElement>(
        ':scope > [data-stylex-owner="authenticated-home-notification-row"], :scope > .warning-none',
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
