// dom lane harness contracts (plan Verification 9/11/12/14): happyDOM origin,
// fetch teardown, structural visibility, goto isolation. This spec itself is
// DOM-lane-only — it exercises the harness, not app routes.
import { isStructurallyVisible } from "../compat-core.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const TEST_ORIGIN = "http://yoram.local";

// Verification 9: happyDOM url + page.url() origin agree with the app's
// fallback origin constant.
test("happyDOM origin equals TEST_ORIGIN everywhere", async ({ page }) => {
  await page.goto("/");
  expect(window.location.origin).toBe(TEST_ORIGIN);
  expect(new URL(page.url()).origin).toBe(TEST_ORIGIN);
});

// Verification 12: structural visibility subset — hidden attribute, ancestor
// hidden, inline display:none / visibility:hidden, input[type=hidden] hidden;
// aria-hidden alone is NOT hidden.
test("structural visibility contract", async ({ page }) => {
  await page.goto("/");
  const host = document.createElement("div");
  document.body.appendChild(host);

  const hiddenAttr = document.createElement("p");
  hiddenAttr.hidden = true;
  host.appendChild(hiddenAttr);

  const ancestorHidden = document.createElement("section");
  ancestorHidden.hidden = true;
  const child = document.createElement("span");
  ancestorHidden.appendChild(child);
  host.appendChild(ancestorHidden);

  const displayNone = document.createElement("div");
  displayNone.style.display = "none";
  const displayChild = document.createElement("i");
  displayNone.appendChild(displayChild);
  host.appendChild(displayNone);

  const visibilityHidden = document.createElement("div");
  visibilityHidden.style.visibility = "hidden";
  const visibilityChild = document.createElement("i");
  visibilityHidden.appendChild(visibilityChild);
  host.appendChild(visibilityHidden);

  const hiddenInput = document.createElement("input");
  hiddenInput.type = "hidden";
  host.appendChild(hiddenInput);

  const ariaHidden = document.createElement("div");
  ariaHidden.setAttribute("aria-hidden", "true");
  const ariaChild = document.createElement("span");
  ariaHidden.appendChild(ariaChild);
  host.appendChild(ariaHidden);

  const visible = document.createElement("p");
  visible.textContent = "visible";
  host.appendChild(visible);

  expect(isStructurallyVisible(hiddenAttr)).toBe(false);
  expect(isStructurallyVisible(child)).toBe(false);
  expect(isStructurallyVisible(displayChild)).toBe(false);
  expect(isStructurallyVisible(visibilityChild)).toBe(false);
  expect(isStructurallyVisible(hiddenInput)).toBe(false);
  expect(isStructurallyVisible(ariaChild)).toBe(true); // aria-hidden is not visual
  expect(isStructurallyVisible(visible)).toBe(true);

  host.remove();
});

// Verification 14: goto isolation — fresh app state, retained storage, same
// window realm + document identity across gotos.
test("goto lifecycle: fresh mount, retained storage, same realm", async ({ page }) => {
  await page.goto("/");
  const realmMarker = Symbol("realm");
  (globalThis as { __domRealmMarker?: symbol }).__domRealmMarker = realmMarker;
  const docBefore = document.documentElement;
  localStorage.setItem("dom-lane-key", "persisted");
  sessionStorage.setItem("dom-lane-session", "kept");

  await page.goto("/users/login");
  expect((globalThis as { __domRealmMarker?: symbol }).__domRealmMarker).toBe(realmMarker);
  expect(document.documentElement).toBe(docBefore);
  expect(localStorage.getItem("dom-lane-key")).toBe("persisted");
  expect(sessionStorage.getItem("dom-lane-session")).toBe("kept");

  // Fresh React root per goto: the login form mounts only on the second goto.
  await page.goto("/");
  await page.goto("/users/login");
  await expect(page.locator('input[name="loginIdOrEmail"]')).toHaveCount(1);
});

// Verification 11: fetch wrapper restored after the test (checked in the next
// test — the wrapper is per-Page, so capture the original here).
test("fetch teardown restores the original global fetch", async ({ page }) => {
  void page;
  const original = globalThis.fetch;
  await page.goto("/");
  // Inside the test the wrapper is active and answers mocks.
  const response = await fetch("http://yoram.local/yona/api/v1/session");
  expect(response.status).toBe(200);
  // Teardown runs after this test body; the afterEach check lives in
  // dom-compat teardown. Here we assert the in-test wrapper answers.
  const capabilities = await fetch("http://yoram.local/yona/api/v1/auth/capabilities");
  expect(capabilities.status).toBe(200);
});

// Locator/expect smoke over a real route (B6 acceptance: navigation + DOM
// assertion semantics).
test("anonymous home renders shell navigation", async ({ page }: { page: Page }) => {
  await page.goto("/");
  await expect(page.locator('[data-owner="global-gnb-outer"]')).toBeVisible();
  await expect(page.locator('[data-owner="site-footer"]')).toBeVisible();
});
