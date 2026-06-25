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
    reason: "project Git import keeps the legacy direct form action as a fallback",
  },
  {
    file: "routes/sites/$pageName/route.tsx",
    marker: 'action={appHref(runtimeConfig, "/sites/import")}',
    reason: "site data import keeps the legacy direct multipart action as a fallback",
  },
];

const formPostPattern = /(?:^|\s)method\s*=\s*(?:"post"|'post'|\{\s*["']post["']\s*\})/gi;
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
const mutationDataHrefPattern =
  /data-href=[\s\S]{0,240}(?:delete|leave|member\/[^"'\s}]+\/(?:edit|delete)|resetPassword|toggleSiteAdminRole|watch|unwatch|enroll|cancel|transfer|changeVCS|pushedBranch)/;
const submitHandlerDefinitionPattern = /\b(?:function|const)\s+(\w+)\b/g;
const allowedIndirectSubmitHandlers = [
  { file: "routes/-code-views.tsx", handler: "submitInlineComment" },
  { file: "routes/-code-views.tsx", handler: "submitComment" },
  { file: "routes/-code-views.tsx", handler: "submitEdit" },
  { file: "routes/-code-views.tsx", handler: "submitReply" },
  { file: "routes/-pull-request-views.tsx", handler: "submitEdit" },
  { file: "routes/-pull-request-views.tsx", handler: "submitReply" },
  { file: "routes/-pull-request-views.tsx", handler: "submitBlockReview" },
  { file: "routes/-pull-request-views.tsx", handler: "submitInlineComment" },
  { file: "routes/-pull-request-views.tsx", handler: "submitNonRangedComment" },
  { file: "routes/sites/$pageName/route.tsx", handler: "handleSubmit" },
  { file: "routes/sites/$pageName/route.tsx", handler: "handleImportSubmit" },
];

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

function openingTagEnd(source: string, start: number) {
  let braceDepth = 0;
  let quote: '"' | "'" | "`" | null = null;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];
    if (quote) {
      if (char === quote && previous !== "\\") {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") {
      braceDepth += 1;
      continue;
    }
    if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }
    if (char === ">" && braceDepth === 0) {
      return index + 1;
    }
  }
  return source.length;
}

function blockEnd(source: string, start: number) {
  let braceDepth = 0;
  let quote: '"' | "'" | "`" | null = null;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];
    if (quote) {
      if (char === quote && previous !== "\\") {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") {
      braceDepth += 1;
      continue;
    }
    if (char === "}") {
      braceDepth -= 1;
      if (braceDepth === 0) {
        return index + 1;
      }
    }
  }
  return source.length;
}

function nextOpeningBrace(source: string, start: number) {
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "{") {
      return index;
    }
  }
  return -1;
}

function requestMethodElements() {
  return listRouteFiles().flatMap((file) => {
    const source = readRouteSource(file);
    return Array.from(source.matchAll(/data-request-(?:method|uri)=/g), (match) => {
      const index = match.index ?? 0;
      const anchorStart = source.lastIndexOf("<a", index);
      const buttonStart = source.lastIndexOf("<button", index);
      const start = Math.max(anchorStart, buttonStart);
      const tag = start === anchorStart ? "a" : "button";
      return {
        file,
        line: lineNumberForIndex(source, index),
        snippet: source.slice(start, index + 1400),
        tag,
      };
    });
  });
}

function formButtonElements() {
  return listRouteFiles().flatMap((file) => {
    const source = readRouteSource(file);
    return Array.from(source.matchAll(/<form\b/g)).flatMap((formMatch) => {
      const formStart = formMatch.index ?? 0;
      const formClose = source.indexOf("</form>", formStart);
      if (formClose < 0) {
        return [];
      }
      const formSource = source.slice(formStart, formClose);
      return Array.from(formSource.matchAll(/<button\b/g), (buttonMatch) => {
        const buttonStart = formStart + (buttonMatch.index ?? 0);
        const tag = source.slice(buttonStart, openingTagEnd(source, buttonStart));
        return {
          file,
          line: lineNumberForIndex(source, buttonStart),
          tag,
        };
      });
    });
  });
}

function legacyApiActionForms() {
  return listRouteFiles().flatMap((file) => {
    const source = readRouteSource(file);
    return Array.from(source.matchAll(/<form\b/g)).flatMap((formMatch) => {
      const formStart = formMatch.index ?? 0;
      const formClose = source.indexOf("</form>", formStart);
      if (formClose < 0) {
        return [];
      }
      const tag = source.slice(formStart, openingTagEnd(source, formStart));
      const body = source.slice(formStart, formClose);
      if (!body.includes("/-_-api/")) {
        return [];
      }
      return [
        {
          body,
          file,
          line: lineNumberForIndex(source, formStart),
          tag,
        },
      ];
    });
  });
}

function indirectSubmitForms() {
  return listRouteFiles().flatMap((file) => {
    const source = readRouteSource(file);
    return Array.from(source.matchAll(/<form\b/g)).flatMap((formMatch) => {
      const formStart = formMatch.index ?? 0;
      const formClose = source.indexOf("</form>", formStart);
      if (formClose < 0) {
        return [];
      }
      const tag = source.slice(formStart, openingTagEnd(source, formStart));
      const body = source.slice(formStart, formClose);
      if (!tag.includes("onSubmit=") || body.includes("event.preventDefault()")) {
        return [];
      }
      const handler = tag.match(/onSubmit=\{(\w+)\}/)?.[1] ?? tag.match(/void\s+(\w+)\(/)?.[1];
      return [
        {
          file,
          handler,
          line: lineNumberForIndex(source, formStart),
          tag,
        },
      ];
    });
  });
}

function functionBodies(source: string, functionName: string) {
  const bodies: string[] = [];
  for (const match of source.matchAll(submitHandlerDefinitionPattern)) {
    if (match[1] !== functionName) {
      continue;
    }
    const blockStart = nextOpeningBrace(source, match.index ?? 0);
    if (blockStart >= 0) {
      bodies.push(source.slice(blockStart, blockEnd(source, blockStart)));
    }
  }
  return bodies;
}

function mutationDataHrefElements() {
  return listRouteFiles().flatMap((file) => {
    const source = readRouteSource(file);
    return Array.from(source.matchAll(/data-href=/g), (match) => {
      const index = match.index ?? 0;
      const anchorStart = source.lastIndexOf("<a", index);
      const buttonStart = source.lastIndexOf("<button", index);
      const divStart = source.lastIndexOf("<div", index);
      const liStart = source.lastIndexOf("<li", index);
      const start = Math.max(anchorStart, buttonStart, divStart, liStart);
      const snippet = source.slice(start, index + 1400);
      return {
        file,
        line: lineNumberForIndex(source, index),
        snippet,
      };
    }).filter((element) => mutationDataHrefPattern.test(element.snippet));
  });
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

  it("keeps legacy data-request mutation markers inside React event handlers", () => {
    for (const element of requestMethodElements()) {
      if (element.tag === "button") {
        expect(element.snippet, `${element.file}:${element.line}`).toContain('type="button"');
        continue;
      }
      expect(element.snippet, `${element.file}:${element.line}`).toContain(
        "event.preventDefault()",
      );
    }
  });

  it("keeps legacy mutation data-href markers inside React click handlers", () => {
    for (const element of mutationDataHrefElements()) {
      expect(element.snippet, `${element.file}:${element.line}`).toContain(
        "event.preventDefault()",
      );
    }
  });

  it("keeps form buttons explicit about native submit behavior", () => {
    for (const element of formButtonElements()) {
      expect(element.tag, `${element.file}:${element.line}`).toMatch(/\btype\s*=/);
    }
  });

  it("keeps legacy API action forms from native submit fallback", () => {
    for (const element of legacyApiActionForms()) {
      expect(element.tag, `${element.file}:${element.line}`).toContain("onSubmit=");
      expect(element.body, `${element.file}:${element.line}`).toContain("event.preventDefault()");
    }
  });

  it("keeps site data import on the React REST JSON primary boundary", () => {
    const source = readRouteSource("routes/sites/$pageName/route.tsx");
    const apiSource = fs.readFileSync(path.resolve(__dirname, "api/site-admin.ts"), "utf8");

    expect(source).toContain("importSiteDataRest");
    expect(apiSource).toContain('restFetch<SiteImportResponse>(runtimeConfig, "/site/import"');
    expect(source).toContain("JSON.parse(await data.text())");
    expect(source).toContain("onImportSiteData");
    expect(source).toContain("event.preventDefault()");
  });

  it("keeps project Git import on the React REST JSON primary boundary", () => {
    const routeSource = readRouteSource("routes/[_]import/route.tsx");
    const apiSource = fs.readFileSync(path.resolve(__dirname, "api/org-project.ts"), "utf8");

    expect(routeSource).toContain("importProjectRest");
    expect(apiSource).toContain(
      'restFetch<ProjectImportResponse>(runtimeConfig, "/projects/import"',
    );
    expect(routeSource).toContain("onImportProject");
    expect(routeSource).toContain("navigateToAppHref");
    expect(readRouteSource("routes/-project-views.tsx")).toContain("event.preventDefault()");
  });

  it("keeps indirect submit handlers from falling through to native form submit", () => {
    const actual = indirectSubmitForms().map((element) => ({
      file: element.file,
      handler: element.handler,
      line: element.line,
    }));

    expect(
      actual.map((element) => `${element.file}:${element.handler}`),
      `Update allowedIndirectSubmitHandlers when a form delegates submit prevention to a named handler.`,
    ).toEqual(allowedIndirectSubmitHandlers.map((element) => `${element.file}:${element.handler}`));

    for (const { file, handler } of allowedIndirectSubmitHandlers) {
      const bodies = functionBodies(readRouteSource(file), handler);
      expect(bodies, `${file}:${handler}`).not.toHaveLength(0);
      for (const body of bodies) {
        expect(body, `${file}:${handler}`).toContain("event.preventDefault()");
      }
    }
  });
});
