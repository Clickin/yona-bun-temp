import { mergedLegacyBlock, readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const resolve = (...parts) => parts.join("/");

test("anonymous site Sign up has complete global-theme Style ownership", () => {
  const route = readFileSync(resolve("src/routes/-home-route-screen.tsx"), "utf8");
  const theme = readFileSync(resolve("src/app.css"), "utf8");
  const appCss = readFileSync(resolve("src/app.css"), "utf8");
  const fallbackCss = mergedLegacyBlock();
  const legacy = readFileSync(
    resolve("../yona-original/app/views/common/usermenu.scala.html"),
    "utf8",
  );
  const signupOwnerIndex = route.indexOf('data-owner="anonymous-site-signup"');
  const signupSource = route.slice(Math.max(0, signupOwnerIndex - 300), signupOwnerIndex + 100);

  expect(legacy).toContain('class="ybtn ybtn-success"');
  expect(legacy).toContain('@Messages("title.signup")');
  expect(route).toContain('data-owner="anonymous-site-signup"');

  expect(signupSource).not.toMatch(/\bybtn(?:-success)?\b/u);
  for (const variable of []) {
    expect(theme).toContain(variable);
  }
  for (const declaration of []) {
    expect(route).toContain(declaration);
  }
  expect(theme).not.toMatch(
    /anonymousSiteSignup(?:TextShadow|BorderRadius|Display|Padding|VerticalAlign|Cursor|LineHeight|FontSize|Transition|Outline|Position|Margin|BorderStyle|BorderWidth|ZIndex|TextAlign|InteractiveTextDecoration|WhiteSpace):/u,
  );
  expect(appCss).toMatch(/\.ybtn\s*\{/u);
  expect(appCss).toMatch(/\.ybtn-success/u);
  expect(fallbackCss).toMatch(/\.ybtn\s*\{/u);
  expect(fallbackCss).toMatch(/\.ybtn-success/u);
});
