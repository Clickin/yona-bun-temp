import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("user edit avatar visibility uses conditional StyleX", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/user/edit.scala.html", "utf8"),
    readFile("src/routes/user/editform.tsx", "utf8"),
    readFile("src/routes/user/-editform.stylex.ts", "utf8"),
  ]);
  expect(legacy).toContain('<div class="upload-progress avatar" style="display:none;">');
  expect(legacy).toContain('id="avatarCropWrap" class="modal hide"');
  expect(route).toContain('data-stylex-owner="user-settings-avatar-progress"');
  expect(route).toContain('data-stylex-owner="user-settings-avatar-progress-bar"');
  expect(route).toContain('data-stylex-owner="user-settings-avatar-crop"');
  expect(route).toContain("userSettingsAvatarStyles.hidden");
  expect(route).toContain("userSettingsAvatarStyles.progressFull");
  expect(route).toContain("userSettingsAvatarStyles.cropVisible");
  expect(route).not.toMatch(/style=\{[^}]*display|style=\{[^}]*width/gu);
  expect(style).toContain('hidden: { display: "none" }');
  expect(style).toContain('progressFull: { width: "100%" }');
  expect(style).toContain('cropVisible: { display: "block" }');
});
