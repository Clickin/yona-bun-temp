import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/project/partial_history.scala.html",
  import.meta.url,
);
const lessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const appCssSource = new URL("../src/app.css", import.meta.url);

test("project history header typography uses route-local StyleX ownership", async () => {
  const [route, legacy, less, appCss] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(lessSource, "utf8"),
    readFile(appCssSource, "utf8"),
  ]);

  expect(legacy).toContain('class="activity-desc"');
  expect(legacy).toContain('class="header-text"');
  expect(legacy).toContain('class="actor"');
  expect(less).toContain(".header-text");
  expect(less).toContain("text-overflow: ellipsis;");
  expect(less).toContain("word-break : break-all;");
  expect(route).toContain('data-stylex-owner="project-history-header"');
  expect(route).toContain('stylexOwner="project-history-actor"');
  expect(route).toContain('actor: { fontWeight: "bold" }');
  expect(route).toContain('overflow: "hidden"');
  expect(route).toContain('textOverflow: "ellipsis"');
  expect(route).toContain('whiteSpace: "nowrap"');
  expect(route).toContain('wordBreak: "break-all"');
  expect(appCss).not.toContain(
    ".content-container .main-stream .activity-streams .activity-stream .activity-desc .header-text",
  );
  expect(appCss).not.toContain(
    ".content-container .main-stream .activity-streams .activity-stream .activity-desc .whereis",
  );
  expect(appCss).not.toContain(".content-container .main-stream {");
  expect(appCss).not.toContain(".content-container .main-stream .activity-streams {");
  expect(appCss).toContain(
    ".content-container .main-stream .activity-streams .activity-stream:first-of-type",
  );
  expect(appCss).toContain(
    ".content-container .main-stream .activity-streams .activity-stream:last-child",
  );
});
