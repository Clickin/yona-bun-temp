import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("organization pull-request header owns the server logo background through Dynamic Style", () => {
  const template = readFileSync(
    "../yona-original/app/views/organization/header.scala.html",
    "utf8",
  );
  const listTemplate = readFileSync(
    "../yona-original/app/views/organization/group_pullrequest_list.scala.html",
    "utf8",
  );

  expect(template).toContain('class="project-header-outer" style="background-image:url');
  expect(listTemplate).toContain("@header(organization)");
});
