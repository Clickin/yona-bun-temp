import { expect, test } from "../wtr-compat.ts";

test("pointer focus defaults and native single-select comboboxes match browser behavior", async ({
  page,
}) => {
  await page.setContent(`
    <input id="field" aria-label="Date">
    <button id="keep-focus" type="button">Calendar</button>
    <button id="move-focus" type="button"><span>Another control</span></button>
    <div id="outside">Outside content</div>
    <div role="dialog" aria-label="Calendar">
      <select aria-label="Month" style="opacity: 0">
        <option value="6">July</option>
        <option value="7">August</option>
      </select>
      <select aria-label="Visible rows" size="4"><option>July</option></select>
      <select aria-label="Multiple months" multiple><option>July</option></select>
    </div>
  `);
  await page.evaluate(() => {
    document.getElementById("keep-focus")!.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
  });

  await page.locator("#field").focus();
  await page.locator("#keep-focus").click();
  await expect(page.locator("#field")).toBeFocused();

  await page.locator("#move-focus span").click();
  await expect(page.locator("#move-focus")).toBeFocused();

  await page.locator("#outside").click();
  await expect(page.locator("#move-focus")).not.toBeFocused();

  const calendar = page.getByRole("dialog", { name: "Calendar", exact: true });
  const month = calendar.getByRole("combobox", { name: "Month", exact: true });
  await expect(calendar.getByRole("combobox")).toHaveCount(1);
  await expect(page.getByRole("combobox")).toHaveCount(1);
  await month.selectOption("7");
  await expect(month).toHaveValue("7");
  await expect(page.getByRole("combobox", { name: "Month", exact: true })).toHaveValue("7");
});

test("focus and blur emit one native transition with the destination already active", async ({
  page,
}) => {
  await page.setContent(`
    <input id="first">
    <input id="second">
    <div id="content">Not focusable</div>
  `);
  await page.evaluate(() => {
    const transitions: Array<{
      type: string;
      target: string;
      relatedTarget: string | null;
      active: string;
    }> = [];
    for (const type of ["focusin", "focusout"]) {
      document.body.addEventListener(type, (event) => {
        transitions.push({
          type: event.type,
          target: (event.target as HTMLElement).id,
          relatedTarget: ((event as FocusEvent).relatedTarget as HTMLElement | null)?.id ?? null,
          active: document.activeElement?.id ?? "",
        });
        document.body.dataset.transitions = JSON.stringify(transitions);
      });
    }
  });

  await page.locator("#first").focus();
  await page.locator("#first").focus();
  await page.locator("#content").focus();
  await expect(page.locator("#first")).toBeFocused();
  await page.locator("#second").focus();
  await page.locator("#first").blur();
  await expect(page.locator("#second")).toBeFocused();
  await page.locator("#second").blur();
  await page.locator("#second").blur();
  expect(await page.evaluate(() => JSON.parse(document.body.dataset.transitions ?? "[]"))).toEqual([
    { type: "focusin", target: "first", relatedTarget: null, active: "first" },
    { type: "focusout", target: "first", relatedTarget: "second", active: "" },
    { type: "focusin", target: "second", relatedTarget: "first", active: "second" },
    { type: "focusout", target: "second", relatedTarget: null, active: "" },
  ]);
});
