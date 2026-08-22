import { curatedAppCss, readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const resolve = (...parts) => parts.join("/");

test("anonymous Home feature block has complete global-theme Style ownership", () => {
  const route = readFileSync(resolve("src/routes/-home-route-screen.tsx"), "utf8");
  const theme = readFileSync(resolve("src/app.css"), "utf8");
  const appCss = readFileSync(resolve("src/app.css"), "utf8");
  const legacy = readFileSync(
    resolve("../yona-original/app/views/index/partial_intro.scala.html"),
    "utf8",
  );

  expect(legacy).toContain('<div class="feature">');
  expect(legacy).toContain('<ul class="feature-wrap row">');

  for (const owner of [
    "anonymous-home-feature",
    "anonymous-home-feature-heading",
    "anonymous-home-feature-heading-text",
    "anonymous-home-feature-list",
    "anonymous-home-feature-item",
    "anonymous-home-feature-icon",
    "anonymous-home-feature-info",
    "anonymous-home-feature-title",
    "anonymous-home-feature-description",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }

  expect(theme).not.toContain("anonymousHomeFeatureMobileItemWidth:");
  expect(route).not.toMatch(
    /className="(?:feature(?:-wrap|-image|-info|-title|-desc)?|row)(?:\s|")/u,
  );
  expect(curatedAppCss()).not.toMatch(/\.feature(?:\s|\{|\.)/u);
  expect(curatedAppCss()).not.toMatch(/\.feature-wrap/u);
});
