import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("issueform due-date control owns route-scoped geometry with StyleX", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/-issueform.stylex.ts", import.meta.url),
    "utf8",
  );
  const component = readFileSync(
    new URL("../src/components/issue-due-date-input.tsx", import.meta.url),
    "utf8",
  );
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/issue/create.scala.html", import.meta.url),
    "utf8",
  );
  const calendar = readFileSync(
    new URL("../../yona-original/public/javascripts/common/yobi.ui.Calendar.js", import.meta.url),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");

  // legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React state/events/components + TanStack Router/Query로 번역한다.
  expect(legacy).toContain('id="issueDueDate"');
  expect(legacy).toContain('name="dueDate"');
  expect(legacy).toContain('class="search search-bar"');
  expect(legacy).toContain('class="search-btn btn-calendar"');
  expect(calendar).toContain('targetElement.next(".btn-calendar")');
  expect(less).toContain(".search-bar");

  expect(route).toContain('data-stylex-owner="project-issue-form-due-date-search"');
  for (const suffix of ["-due-date-input", "-due-date-calendar", "-due-date-native-picker"]) {
    expect(component).toContain(suffix);
  }
  expect(component).toContain("ownerPrefix");
  for (const token of ["dueDateSearchBar", "dueDateInput", "dueDateCalendarButton"]) {
    expect(style).toContain(token);
  }

  for (const selector of [
    ".issue-form-page-wrap .issue-due-date-option .search-bar {",
    ".issue-form-page-wrap .issue-due-date-option #issueDueDate {",
    ".issue-form-page-wrap .issue-due-date-option .btn-calendar {",
    ".issue-form-page-wrap .issue-due-date-native-picker {",
  ]) {
    expect(css).not.toContain(selector);
  }
  expect(css).toContain(".issue-due-date-native-picker {");
  expect(css).toContain(".search-bar");
});
