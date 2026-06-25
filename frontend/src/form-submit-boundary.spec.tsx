import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type AllowedFormPost = {
  file: string;
  marker: string;
  reason: string;
};

const allowedFormPosts: AllowedFormPost[] = [
  {
    file: "routes/-project-views.tsx",
    marker: 'id="importGit"',
    reason: "project Git import still uses the direct multipart import route",
  },
  {
    file: "routes/sites/$pageName/route.tsx",
    marker: 'action={appHref(runtimeConfig, "/sites/import")}',
    reason: "site data import still uses the direct multipart import route",
  },
];

const formPostPattern = /(?:^|\s)method="post"/g;
const forbiddenReactOwnedLegacyActions = [
  "/users/login",
  "/users/signup",
  "/lostPassword",
  "/resetPassword",
  "/user/edit",
  "/user/resetVisitedList",
  "/user/resetPassword",
  "/user/email",
  "/user/editform/token_reset",
];
const propsSubmitFallbackPattern =
  /if \(!props\.on(?:Submit|CreateComment|UpdateComment|CommentSubmit|CommentUpdate|ThreadCommentSubmit|InlineCommentSubmit)\) \{/;
const memberSubmitFallbackPattern = /if \(!props\.on(?:AddMember|UpdateMemberRole)\) \{/;
const createSettingsSubmitFallbackPattern =
  /if \(!props\.on(?:CreateProject|CreateOrganization|UpdateProjectSettings|UpdateOrganization)\) \{/;
const projectActionSubmitFallbackPattern = /if \(!props\.on(?:CreateWebhook|Fork)\) \{/;
const clickMutationFallbackPattern =
  /if \(!props\.on(?:LeaveOrganization|ToggleProjectWatch|LeaveProject)\) \{/;

function readRouteSource(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
}

function listRouteFiles(directory = path.resolve(__dirname, "routes")): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listRouteFiles(entryPath);
    }
    if (!entry.isFile() || !entry.name.endsWith(".tsx")) {
      return [];
    }
    return [path.relative(__dirname, entryPath)];
  });
}

function lineNumberForIndex(source: string, index: number) {
  return source.slice(0, index).split("\n").length;
}

describe("React form submit boundary", () => {
  it("allows native POST only for documented direct multipart import forms", () => {
    const actual = listRouteFiles().flatMap((file) => {
      const source = readRouteSource(file);
      return Array.from(source.matchAll(formPostPattern), (match) => ({
        file,
        index: match.index ?? 0,
        line: lineNumberForIndex(source, match.index ?? 0),
        source,
      }));
    });

    expect(
      actual.map((item) => `${item.file}:${item.line}`),
      `Update allowedFormPosts with a concrete reason when a native POST form is intentionally kept.`,
    ).toHaveLength(allowedFormPosts.length);

    for (const allowed of allowedFormPosts) {
      const source = readRouteSource(allowed.file);
      const [beforeMarker, ...afterMarker] = source.split(allowed.marker);
      expect(afterMarker, allowed.reason).not.toHaveLength(0);
      const markerIndex = beforeMarker.length;
      const window = source.slice(Math.max(0, markerIndex - 700), markerIndex + 900);
      expect(window, allowed.reason).toMatch(formPostPattern);
    }
  });

  it("keeps REST-owned create/settings/member/milestone forms free of native POST fallback", () => {
    const restOwnedFiles = [
      "routes/-auth-views.tsx",
      "routes/-board-views.tsx",
      "routes/-code-views.tsx",
      "routes/-issue-views.tsx",
      "routes/-organization-views.tsx",
      "routes/-pull-request-views.tsx",
      "routes/-workspace-settings-view.tsx",
      "routes/-milestone-views.tsx",
      "routes/$owner/$projectName/issue/labelsform/route.tsx",
    ];

    for (const file of restOwnedFiles) {
      const source = readRouteSource(file);
      expect(source, file).not.toMatch(formPostPattern);
    }
  });

  it("keeps auth and user settings forms inside the React REST JSON boundary", () => {
    const formComponentFiles = ["routes/-auth-views.tsx", "routes/-workspace-settings-view.tsx"];
    const sourceByFile = [
      ...formComponentFiles,
      "routes/users/loginform/route.tsx",
      "routes/users/signupform/route.tsx",
      "routes/lostPassword/route.tsx",
      "routes/resetPassword/route.tsx",
      "routes/user/editform/index.tsx",
      "routes/user/editform/password/route.tsx",
      "routes/user/editform/emails/route.tsx",
      "routes/user/editform/token/route.tsx",
      "routes/user/editform/notifications/route.tsx",
    ].map((file) => [file, readRouteSource(file)] as const);

    for (const file of formComponentFiles) {
      expect(readRouteSource(file), file).toContain("event.preventDefault()");
    }

    for (const [file, source] of sourceByFile) {
      for (const action of forbiddenReactOwnedLegacyActions) {
        expect(source, `${file} must not render legacy direct form action ${action}`).not.toContain(
          `action={appHref(runtimeConfig, "${action}")}`,
        );
        expect(source, `${file} must not render legacy direct form action ${action}`).not.toContain(
          `action={appHref(props.runtimeConfig, "${action}")}`,
        );
        expect(source, `${file} must not render legacy direct form action ${action}`).not.toContain(
          `action="${action}"`,
        );
      }
    }
  });

  it("keeps React-owned markdown editor forms off native submit fallback guards", () => {
    const editorFormFiles = [
      "routes/-board-views.tsx",
      "routes/-code-views.tsx",
      "routes/-issue-views.tsx",
      "routes/-milestone-views.tsx",
      "routes/-pull-request-views.tsx",
    ];

    for (const file of editorFormFiles) {
      const source = readRouteSource(file);
      expect(source, file).toContain("event.preventDefault()");
      expect(source, file).not.toMatch(propsSubmitFallbackPattern);
    }
  });

  it("keeps React-owned member management forms inside the callback boundary", () => {
    const memberFormFiles = ["routes/-project-views.tsx", "routes/-organization-views.tsx"];

    for (const file of memberFormFiles) {
      const source = readRouteSource(file);
      expect(source, file).toContain('id="addNewMember"');
      expect(source, file).not.toMatch(memberSubmitFallbackPattern);
      expect(source, file).not.toContain('id="addNewMember"\n              method="post"');
    }
  });

  it("keeps React-owned create and settings forms inside the callback boundary", () => {
    const createSettingsFiles = ["routes/-project-views.tsx", "routes/-organization-views.tsx"];

    for (const file of createSettingsFiles) {
      const source = readRouteSource(file);
      expect(source, file).toContain("event.preventDefault()");
      expect(source, file).not.toMatch(createSettingsSubmitFallbackPattern);
    }
  });

  it("keeps React-owned project action forms inside the callback boundary", () => {
    const source = readRouteSource("routes/-project-views.tsx");

    expect(source).toContain('id="formNewWebhook"');
    expect(source).toContain('className="form-horizontal nm"');
    expect(source).not.toMatch(projectActionSubmitFallbackPattern);
    expect(source).not.toContain('className="form-horizontal nm"\n              method="post"');
  });

  it("keeps React-owned leave and watch click mutations inside the callback boundary", () => {
    const actionFiles = ["routes/-project-views.tsx", "routes/-organization-views.tsx"];

    for (const file of actionFiles) {
      const source = readRouteSource(file);
      expect(source, file).toContain("event.preventDefault()");
      expect(source, file).not.toMatch(clickMutationFallbackPattern);
    }
  });
});
