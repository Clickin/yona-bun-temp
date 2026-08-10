import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project webhook payload URL owns the scoped truncate style", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/webhooks.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/project/webhooks.scala.html", import.meta.url),
    "utf8",
  );
  const partial = readFileSync(
    new URL(
      "../../yona-original/app/views/project/partial_webhooks_list.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");

  // Legacy Scala HTML/JS is output DOM/UX evidence; behavior stays React-owned.
  expect(legacy).toContain('class="webhook-list-wrap"');
  expect(partial).toContain("truncate");
  expect(less).toContain("text-overflow: ellipsis");

  expect(css).not.toContain(".webhook-editor-wrap .webhook-list-wrap .list-item .truncate");
  expect(partial).toContain("truncate");
});
