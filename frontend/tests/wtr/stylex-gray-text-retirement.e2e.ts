import { expect, test, readFileSync } from "../wtr-compat.ts";

test("retires gray-txt fallback with route-owned separators", async () => {
  const read = (path: string) => readFileSync(path, "utf8");
  const routes = [
    ["src/routes/__root.tsx", "root-login-dialog-separator"],
    [
      "src/routes/$ownerName/$projectName/pullRequests.tsx",
      "project-pullrequests-review-separator",
    ],
    [
      "src/routes/organizations/$organizationName/pullrequests.tsx",
      "organization-pullrequests-review-separator",
    ],
  ] as const;
  expect(read("src/app.css")).not.toContain(".gray-txt");
  for (const [route, owner] of routes) {
    const source = read(route);
    expect(source).not.toContain("gray-txt");
    expect(source).toContain(`data-stylex-owner=\"${owner}\"`);
  }
  expect(read("src/routes/-root.stylex.ts")).toContain('grayText: "#ccc"');
  expect(read("src/routes/$ownerName/$projectName/-pull-requests.stylex.ts")).toContain(
    'grayText: "#ccc"',
  );
  expect(
    read("src/routes/organizations/$organizationName/-organization-pullrequests.stylex.ts"),
  ).toContain('grayText: "#ccc"');
});
