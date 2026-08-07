import { readFileSync } from "../wtr-compat.ts";

// copy-level node:crypto shim: sync SHA-1/SHA-256 (browser has no node:crypto).
const createHash = (algorithm: string) => {
  const isSha1 = algorithm === "sha1";
  if (!isSha1 && algorithm !== "sha256") throw new Error("createHash shim: only sha1/sha256");
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  const K1 = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
  const K256 = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const chunks: number[] = [];
  let state: number[] = isSha1
    ? [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]
    : [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
      ];
  const api = {
    update(data: string | Uint8Array) {
      if (typeof data === "string") {
        const encoded = new TextEncoder().encode(data);
        for (let i = 0; i < encoded.length; i++) chunks.push(encoded[i]);
      } else {
        for (let i = 0; i < data.length; i++) chunks.push(data[i]);
      }
      return api;
    },
    digest() {
      const bitLen = chunks.length * 8;
      chunks.push(0x80);
      while (chunks.length % 64 !== 56) chunks.push(0);
      for (let i = 7; i >= 0; i--) chunks.push((bitLen / 2 ** (i * 8)) & 0xff);
      const view = new DataView(new Uint8Array(chunks).buffer);
      const w = new Uint32Array(80);
      const h = state.slice();
      for (let off = 0; off < chunks.length; off += 64) {
        for (let j = 0; j < 16; j++) w[j] = view.getUint32(off + j * 4);
        for (let j = 16; j < (isSha1 ? 80 : 64); j++) {
          if (isSha1) {
            w[j] = rotr(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 31);
          } else {
            const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
            const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
            w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
          }
        }
        let [a, b, c, d, e, f, g, hh] = h;
        for (let j = 0; j < (isSha1 ? 80 : 64); j++) {
          if (isSha1) {
            const k = K1[j < 20 ? 0 : j < 40 ? 1 : j < 60 ? 2 : 3];
            const fn =
              j < 20
                ? (b & c) | (~b & d)
                : j < 40
                  ? b ^ c ^ d
                  : j < 60
                    ? (b & c) | (b & d) | (c & d)
                    : b ^ c ^ d;
            const tmp = (rotr(a, 27) + fn + e + k + w[j]) | 0;
            e = d;
            d = c;
            c = rotr(b, 2);
            b = a;
            a = tmp;
          } else {
            const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const t2 = (s0 + maj) | 0;
            const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const t1 = (hh + s1 + ch + K256[j] + w[j]) | 0;
            hh = g;
            g = f;
            f = e;
            e = (d + t1) | 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) | 0;
          }
        }
        if (isSha1) {
          h[0] = (h[0] + a) | 0;
          h[1] = (h[1] + b) | 0;
          h[2] = (h[2] + c) | 0;
          h[3] = (h[3] + d) | 0;
          h[4] = (h[4] + e) | 0;
        } else {
          h[0] = (h[0] + a) | 0;
          h[1] = (h[1] + b) | 0;
          h[2] = (h[2] + c) | 0;
          h[3] = (h[3] + d) | 0;
          h[4] = (h[4] + e) | 0;
          h[5] = (h[5] + f) | 0;
          h[6] = (h[6] + g) | 0;
          h[7] = (h[7] + hh) | 0;
        }
      }
      return h.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
    },
  };
  return api;
};

// copy-level node:fs existsSync: sync XHR over the WTR fixture server.
// F6 copy-fix-current-dom: the original Playwright specs (frontend/tests/)
// were deleted at the WTR cutover (98bfa308c), so ./<spec>.e2e.ts now resolves
// to the WTR copy itself (tests/wtr/) — no remap needed.
const existsSync = (source: URL | string) => {
  const href = (
    source instanceof URL ? source.href : new URL(source, import.meta.url).href
  );
  const request = new XMLHttpRequest();
  request.open("GET", href, false);
  request.send();
  return request.status === 200;
};

import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const read = (path: string) =>
  readFileSync(
    new URL(
      // Browser harness: URL objects pass through readFileSync unmapped; route
      // ../public/ (frontend/public) onto the /tests/root/ fixture root.
      // F6 copy-fix-current-dom: the original Playwright specs (frontend/tests/)
      // were deleted at the WTR cutover (98bfa308c), so ./<spec>.e2e.ts now
      // resolves to the WTR copy itself (tests/wtr/) — no remap needed.
      new URL(path, import.meta.url).href.replace("/tests/public/", "/tests/root/public/"),
    ),
    "utf8",
  );
const route = (path: string) => read(`../src/routes/${path}`);

const bridgeSelectors = [
  ".error-wrap {",
  ".error-wrap .ico {",
  ".error-wrap .ico-err1 {",
  ".error-wrap .ico-err2 {",
  ".error-wrap p {",
] as const;

const reachableEmitters = [
  ["secret.tsx", ["secret-notfound-error-wrap"]],
  [
    "$ownerName/$projectName.tsx",
    ["project-members-error-wrap", "project-post-edit-internal-error-wrap"],
  ],
  ["$ownerName/$projectName/reviews.tsx", ["project-reviews-empty-state"]],
  ["$ownerName/$projectName/posts.tsx", ["project-posts-empty"]],
  ["$ownerName/$projectName/issue/$issueNumber.tsx", ["project-issue-detail-error-wrap"]],
  ["$ownerName/$projectName/issue/labelsform.tsx", ["project-labels-empty-error-wrap"]],
  [
    "$ownerName/$projectName/issue/$issueNumber/editform.tsx",
    ["project-issue-editform-error-wrap"],
  ],
  ["$ownerName/$projectName/members.tsx", ["project-members-error-wrap"]],
  ["$ownerName/$projectName/newPullRequestForm.tsx", ["new-pull-request-error-wrap"]],
  ["$ownerName/$projectName/issues.tsx", ["project-issues-empty-error-wrap"]],
  ["$ownerName/$projectName/code/$branch/$filePath.tsx", ["project-code-file-error-wrap"]],
  ["$ownerName/$projectName/milestone/$milestoneId.tsx", ["project-milestone-detail-error-wrap"]],
  ["$ownerName/$projectName/milestones.tsx", ["project-milestones-empty"]],
  ["$ownerName/$projectName/pullRequests.tsx", ["project-pullrequests-empty-error-wrap"]],
  ["$ownerName/$projectName/post/$postNumber.tsx", ["post-detail-error-wrap"]],
  [
    "$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
    ["pull-request-detail-error-wrap"],
  ],
  [
    "$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    ["pull-request-changes-error-wrap"],
  ],
  [
    "$ownerName/$projectName/pullRequest/$pullRequestNumber/editform.tsx",
    ["pull-request-edit-error-wrap"],
  ],
  ["$ownerName/$projectName/search.tsx", ["project-search-forbidden-wrap"]],
  ["$ownerName/$projectName/webhooks.tsx", ["project-webhooks-empty"]],
  [
    "$user.tsx",
    [
      "user-profile-notfound-error-wrap",
      "user-profile-open-issues-empty-wrap",
      "user-profile-closed-issues-empty-wrap",
      "user-profile-pull-requests-empty-wrap",
      "user-profile-projects-empty-wrap",
    ],
  ],
  ["-search-screen.tsx", ["search-error-wrap"]],
  ["__root.tsx", ["root-alias-notfound-error-wrap"]],
  ["user/issues.tsx", ["user-issues-empty-error-wrap"]],
  ["organizations/$organizationName/boards.tsx", ["organization-boards-empty"]],
  ["organizations/$organizationName/issues.tsx", ["organization-issues-empty"]],
  ["organizations/$organizationName/members.tsx", ["organization-members-error-wrap"]],
  ["organizations/$organizationName/pullrequests.tsx", ["organization-pullrequests-empty"]],
  ["organizations/$organizationName/search.tsx", ["organization-search-error-wrap"]],
  [
    "resetPassword.tsx",
    ["reset-password-bad-request-error-wrap", "reset-password-bad-request-message"],
  ],
] as const;

const ownerE2Es = [
  "stylex-secret-notfound-error-wrap.e2e.ts",
  "stylex-project-internal-error-wrap.e2e.ts",
  "stylex-project-reviews.e2e.ts",
  "stylex-project-posts.e2e.ts",
  "stylex-project-issue-detail-error-wrap.e2e.ts",
  "stylex-project-labels-error-wrap.e2e.ts",
  "stylex-project-issue-editform-error-wrap.e2e.ts",
  "stylex-project-members-error-wrap.e2e.ts",
  "stylex-project-new-pullrequest-error-wrap.e2e.ts",
  "stylex-project-issues-error-wrap.e2e.ts",
  "stylex-project-code-file-error-wrap.e2e.ts",
  "stylex-project-milestone-error-wrap.e2e.ts",
  "stylex-project-milestones-error-wrap.e2e.ts",
  "stylex-project-pullrequests-error-wrap.e2e.ts",
  "stylex-project-post-detail-error-wrap.e2e.ts",
  "stylex-project-pullrequest-detail-error-wrap.e2e.ts",
  "stylex-project-pullrequest-changes-error-wrap.e2e.ts",
  "stylex-project-pullrequest-editform-error-wrap.e2e.ts",
  "stylex-project-search-error-wrap.e2e.ts",
  "stylex-project-webhooks-error-wrap.e2e.ts",
  "stylex-user-profile-notfound-error-wrap.e2e.ts",
  "stylex-user-issues-error-wrap.e2e.ts",
  "stylex-root-notfound-error-wrap.e2e.ts",
  "stylex-search-error-wrap.e2e.ts",
  "stylex-organization-boards.e2e.ts",
  "stylex-organization-members-error-wrap.e2e.ts",
  "stylex-organization-pullrequests.e2e.ts",
  "stylex-organization-search-error-wrap.e2e.ts",
  "stylex-reset-password-bad-request.e2e.ts",
] as const;

test("shared error-wrap fallback bridge is retired without changing emitters", () => {
  const appCss = read("../src/app.css");
  for (const selector of bridgeSelectors) expect(appCss).not.toContain(selector);
  for (const selector of [
    ".reset-password-bad-request > .project-page-wrap {",
    ".reset-password-bad-request .ico-404 {",
    ".reset-password-bad-request .ybtn-info {",
  ]) {
    expect(appCss).toContain(selector);
  }

  for (const [file, owners] of reachableEmitters) {
    const source = route(file);
    expect(source).toContain("error-wrap");
    for (const owner of owners)
      expect(source).toContain(
        `data-stylex-${owner.includes("reset-password") ? "part" : "owner"}="${owner}"`,
      );
  }

  const deadProducer = route("$ownerName/$projectName/post/$postNumber.tsx");
  expect(deadProducer).toContain("function ProjectPostEditNotFoundBody");
  const deadStart = deadProducer.indexOf("function ProjectPostEditNotFoundBody");
  const deadEnd = deadProducer.indexOf("function ProjectPostDetailBody", deadStart);
  const deadBody = deadProducer.slice(deadStart, deadEnd);
  expect(deadBody).toContain('<div className="error-wrap">');
  // This plain-class producer is unreachable and is intentionally excluded from the owner graph.
  expect(deadBody).not.toContain("data-stylex-owner");

  const fallback = read("../public/legacy-assets/stylesheets/legacy-fallback.css");
  expect(fallback).toContain(".error-wrap {");
  expect(fallback).toContain(".error-wrap p {");
  expect(fallback).toContain(".ico-err1 {");
  expect(fallback).toContain(".ico-err2 {");

  const frozen = [
    [
      "../../yona-original/app/assets/stylesheets/less/_page.less",
      "6e8fa41b50f508d747e8dd58797014eabdfb9908",
    ],
    [
      "../../yona-original/app/assets/stylesheets/less/_sprites.less",
      "ef7f7268dff82f7140628c4ec064f7203d3d0957",
    ],
  ] as const;
  for (const [path, hash] of frozen) {
    expect(createHash("sha1").update(read(path)).digest("hex")).toBe(hash);
  }
  expect(read("../../yona-original/app/assets/stylesheets/less/_page.less")).toContain(
    "padding:100px 0px;",
  );
  expect(read("../../yona-original/app/assets/stylesheets/less/_sprites.less")).toContain(
    "background-position: -80px -160px;",
  );

  for (const file of ownerE2Es) {
    expect(existsSync(new URL(`./${file}`, import.meta.url))).toBe(true);
    expect(read(`./${file}`)).toContain("data-stylex");
  }
});

test("StyleX error-wrap behavior and fallback stylesheet presence follow the runtime flag", async ({
  page,
}) => {
  await page.goto(`${basePath}/missing-legacy-route/unknown/root-stylex-notfound`, {
    waitUntil: "networkidle",
  });
  const wrap = page.locator('[data-stylex-owner="root-alias-notfound-error-wrap"]');
  await expect(wrap).toBeVisible();
  await expect(wrap).toHaveCSS("padding-top", "100px");
  await expect(wrap).toHaveCSS("text-align", "center");
  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
});
