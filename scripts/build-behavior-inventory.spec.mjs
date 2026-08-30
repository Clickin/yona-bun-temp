import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalActionKey,
  buildRouteActionIndex,
  mapInventoryActions,
  normalizeInventoryAction,
  parseRoutes,
  parseRouteActionRows,
  inferActor,
  templateTriggers,
  jsEffects,
  buildInventory,
} from "./build-behavior-inventory.mjs";

test("route action helpers normalize inventory and JaCoCo spellings", () => {
  assert.equal(normalizeInventoryAction("IssueApp.deleteIssue"), "IssueApp.deleteIssue");
  assert.equal(normalizeInventoryAction("controllers.IssueApp.deleteIssue"), "IssueApp.deleteIssue");
  assert.equal(canonicalActionKey("IssueApp.deleteIssue"), "controllers.IssueApp#deleteIssue");
  assert.equal(canonicalActionKey("controllers.IssueApp", "deleteIssue"), "controllers.IssueApp#deleteIssue");
});

test("route action index accepts route text and preserves deterministic source rows", () => {
  const index = buildRouteActionIndex(`
GET /b controllers.IssueApp.index()
GET /a controllers.IssueApp.index()
POST /users controllers.UserApp.saveUser()
`);
  assert.deepEqual(
    index.map((route) => [route.canonicalActionKey, route.path, route.line]),
    [
      ["controllers.IssueApp#index", "/b", 2],
      ["controllers.IssueApp#index", "/a", 3],
      ["controllers.UserApp#saveUser", "/users", 4],
    ],
  );
});

test("route action parser includes non-inventory HTTP verbs", () => {
  const routes = parseRouteActionRows(`
HEAD /svn/*path controllers.SvnApp.head(path)
OPTIONS /svn/*path controllers.SvnApp.options(path)
`);
  assert.deepEqual(routes.map(({ method, controllerClass, controllerMethod }) => [method, controllerClass, controllerMethod]), [
    ["HEAD", "SvnApp", "head"],
    ["OPTIONS", "SvnApp", "options"],
  ]);
});

test("inventory action mapping groups rows by canonical key without changing rows", () => {
  const rows = [
    { id: "B-0002", action: "controllers.IssueApp.index", route: "GET /b", trigger: "direct" },
    { id: "B-0001", action: "IssueApp.index", route: "GET /a", trigger: "link" },
  ];
  const mapped = mapInventoryActions(rows);
  assert.deepEqual(mapped.get("controllers.IssueApp#index"), [rows[1], rows[0]]);
  assert.equal(rows[0].action, "controllers.IssueApp.index");
});

test("parseRoutes extracts method, path, controller key with line numbers", () => {
  const routes = parseRoutes(`
# comment
GET            /search                                                                 controllers.SearchApp.searchInAll()
POST           /-_-api/v1/owners/:owner/projects/:projectName/issues                   controllers.api.IssueApi.newIssues(owner:String, projectName:String)
GET            /assets/*file                                                          controllers.Assets.at(path="/public", file)
`);
  assert.equal(routes.length, 2);
  assert.deepEqual(
    routes.map((r) => [r.method, r.path, r.key, r.line]),
    [
      ["GET", "/search", "SearchApp.searchInAll", 3],
      ["POST", "/-_-api/v1/owners/:owner/projects/:projectName/issues", "IssueApi.newIssues", 4],
    ],
  );
});

test("inferActor applies ordered rules", () => {
  const mk = (method, path, cls, m) => ({ method, path, controllerClass: cls, controllerMethod: m });
  assert.equal(inferActor(mk("GET", "/", "SiteApp", "userList")), "siteAdmin");
  assert.equal(inferActor(mk("GET", "/login_form", "UserApp", "loginForm")), "anonymous");
  assert.equal(inferActor(mk("GET", "/settings", "ProjectApp", "setting")), "manager");
  assert.equal(inferActor(mk("DELETE", "/u/p/issue/1/delete", "IssueApp", "deleteIssue")), "manager");
  assert.equal(inferActor(mk("GET", "/notifications", "Application", "notifications")), "member");
});

test("templateTriggers classifies form, dataRequest, modal and link triggers", () => {
  const tpl = `
<a href="@routes.IssueApp.newIssueForm(project.owner)" class="ybtn">New</a>
<form action="@routes.IssueApp.massUpdate(project.owner, project.name)" method="post">
<button type="button" data-request-method="delete"
        data-request-uri="@routes.IssueApp.deleteIssue(project.owner, project.name, issue.getNumber)">Delete</button>
<a href="#" data-toggle="modal" data-target="#a">x</a>
`;
  const triggers = templateTriggers(tpl);
  const byKind = Object.groupBy(triggers, (t) => t.kind);
  assert.deepEqual(byKind.link.map((t) => t.key), ["IssueApp.newIssueForm"]);
  assert.deepEqual(byKind.form.map((t) => t.key), ["IssueApp.massUpdate"]);
  assert.deepEqual(byKind.dataRequest.map((t) => [t.key, t.method]), [["IssueApp.deleteIssue", "delete"]]);
  assert.ok(byKind.modal.length === 1);
});

test("templateTriggers drops a link whose key is already a form/dataRequest/modal target", () => {
  const triggers = templateTriggers(
    `<button data-request-method="post"\n        data-request-uri="@routes.WatchApp.watch(p)"></button>\n<a href="@routes.WatchApp.watch(p)">w</a>`,
  );
  assert.deepEqual(triggers.map((t) => t.kind), ["dataRequest"]);
});

test("jsEffects collects message keys from alert/confirm/notify calls and navigation", () => {
  const js = `
$yobi.alert(Messages("issue.error.emptyTitle"));
$yobi.confirm(Messages("label.confirm.delete"), fn);
$yobi.notify(Messages("issue.update." + fieldName), 3000);
location.href = vars.urls.nextState;
`;
  const effects = jsEffects(js);
  assert.deepEqual([...effects.alert].sort(), ["issue.error.emptyTitle", "issue.update.*", "label.confirm.delete"]);
});

test("buildInventory links route to template trigger evidence deterministically", () => {
  const routes = parseRoutes(`
DELETE         /:owner/:project/issues/:number   controllers.IssueApp.deleteIssue(owner, number)
`);
  const templates = new Map([
    [
      "yona-original/app/views/issue/view.scala.html",
      `<button data-request-method="delete" data-request-uri="@routes.IssueApp.deleteIssue(p, i)">del</button>\n`,
    ],
  ]);
  const jsFiles = new Map([
    ["yona-original/public/javascripts/service/yobi.issue.View.js", `$yobi.alert(Messages("issue.error.emptyTitle"));\n`],
    ["yona-original/public/javascripts/service/yobi.board.View.js", `$yobi.alert(Messages("board.error")); // other domain\n`],
  ]);

  const inv = buildInventory(routes, templates, jsFiles);
  assert.equal(inv.version, 1);
  assert.equal(inv.behaviors.length, 1);
  const b = inv.behaviors[0];
  assert.match(b.id, /^B-\d{4}$/);
  assert.equal(b.route, "DELETE /:owner/:project/issues/:number");
  assert.equal(b.actor, "manager");
  assert.equal(b.action, "IssueApp.deleteIssue");
  assert.equal(b.trigger, "dataRequest targeting IssueApp.deleteIssue");
  assert.deepEqual(b.legacyEvidence, [
    "yona-original/app/views/issue/view.scala.html:1",
    "yona-original/conf/routes:2",
  ]);
  assert.deepEqual(b.expectedEffects, { state: true, alert: ["issue.error.emptyTitle"] });
});

test("buildInventory emits a direct-http behavior for routes without template evidence", () => {
  const routes = parseRoutes(`POST /-_-api/v1/hello controllers.api.GlobalApi.hello()\n`);
  const inv = buildInventory(routes, new Map(), new Map());
  assert.equal(inv.behaviors.length, 1);
  assert.equal(inv.behaviors[0].trigger, "direct HTTP POST /-_-api/v1/hello");
  assert.deepEqual(inv.behaviors[0].expectedEffects, { state: true });
});

test("buildInventory is deterministic across runs (ids stable)", () => {
  const routes = parseRoutes(`GET /a controllers.IssueApp.issues()\nGET /b controllers.BoardApp.posts()\n`);
  const one = buildInventory(routes, new Map(), new Map());
  const two = buildInventory(routes, new Map(), new Map());
  assert.deepEqual(one, two);
});
