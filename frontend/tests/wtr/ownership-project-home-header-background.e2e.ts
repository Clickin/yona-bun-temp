import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/project/header.scala.html",
  import.meta.url,
);

test("project home header background uses Dynamic Style", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("project-header-outer");
  expect(legacy).toContain("urlToProjectBG(project)");
  expect(route).toContain('data-owner="project-home-header-background"');

  expect(route).toContain("backgroundImageUrl");
});
