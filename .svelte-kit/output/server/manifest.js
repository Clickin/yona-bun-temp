export const manifest = (() => {
  function __memo(fn) {
    let value;
    return () => (value ??= value = fn());
  }

  return {
    appDir: "_app",
    appPath: "_app",
    assets: new Set([
      "favicon.ico",
      "images/yona_logo.png",
      "robots.txt",
      "stylesheets/yobicon/Read Me.txt",
      "stylesheets/yobicon/fonts/yobicon.dev.svg",
      "stylesheets/yobicon/fonts/yobicon.eot",
      "stylesheets/yobicon/fonts/yobicon.svg",
      "stylesheets/yobicon/fonts/yobicon.ttf",
      "stylesheets/yobicon/fonts/yobicon.woff",
      "stylesheets/yobicon/index.html",
      "stylesheets/yobicon/license.txt",
      "stylesheets/yobicon/lte-ie7.js",
      "stylesheets/yobicon/style.css",
    ]),
    mimeTypes: {
      ".png": "image/png",
      ".txt": "text/plain",
      ".svg": "image/svg+xml",
      ".ttf": "font/ttf",
      ".woff": "font/woff",
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
    },
    _: {
      client: {
        start: "_app/immutable/entry/start.TFVsgrd0.js",
        app: "_app/immutable/entry/app.lTxHjv0E.js",
        imports: [
          "_app/immutable/entry/start.TFVsgrd0.js",
          "_app/immutable/chunks/BD3U-b1t.js",
          "_app/immutable/chunks/CYuLPLop.js",
          "_app/immutable/chunks/D8M4Cgha.js",
          "_app/immutable/entry/app.lTxHjv0E.js",
          "_app/immutable/chunks/DswxB6EI.js",
          "_app/immutable/chunks/CYuLPLop.js",
          "_app/immutable/chunks/DVxR7C2P.js",
          "_app/immutable/chunks/BtzawNjK.js",
          "_app/immutable/chunks/D8M4Cgha.js",
        ],
        stylesheets: [],
        fonts: [],
        uses_env_dynamic_public: false,
      },
      nodes: [
        __memo(() => import("./nodes/0.js")),
        __memo(() => import("./nodes/1.js")),
        __memo(() => import("./nodes/2.js")),
        __memo(() => import("./nodes/3.js")),
        __memo(() => import("./nodes/4.js")),
        __memo(() => import("./nodes/5.js")),
        __memo(() => import("./nodes/6.js")),
      ],
      remotes: {},
      routes: [
        {
          id: "/",
          pattern: /^\/$/,
          params: [],
          page: { layouts: [0], errors: [1], leaf: 2 },
          endpoint: null,
        },
        {
          id: "/api/repos/[repoId]/bootstrap",
          pattern: /^\/api\/repos\/([^/]+?)\/bootstrap\/?$/,
          params: [{ name: "repoId", optional: false, rest: false, chained: false }],
          page: null,
          endpoint: __memo(
            () => import("./entries/endpoints/api/repos/_repoId_/bootstrap/_server.ts.js"),
          ),
        },
        {
          id: "/api/repos/[repoId]/files",
          pattern: /^\/api\/repos\/([^/]+?)\/files\/?$/,
          params: [{ name: "repoId", optional: false, rest: false, chained: false }],
          page: null,
          endpoint: __memo(
            () => import("./entries/endpoints/api/repos/_repoId_/files/_server.ts.js"),
          ),
        },
        {
          id: "/api/repos/[repoId]/inline-edit",
          pattern: /^\/api\/repos\/([^/]+?)\/inline-edit\/?$/,
          params: [{ name: "repoId", optional: false, rest: false, chained: false }],
          page: null,
          endpoint: __memo(
            () => import("./entries/endpoints/api/repos/_repoId_/inline-edit/_server.ts.js"),
          ),
        },
        {
          id: "/api/repos/[repoId]/smart-http/[...gitPath]",
          pattern: /^\/api\/repos\/([^/]+?)\/smart-http(?:\/([^]*))?\/?$/,
          params: [
            { name: "repoId", optional: false, rest: false, chained: false },
            { name: "gitPath", optional: false, rest: true, chained: true },
          ],
          page: null,
          endpoint: __memo(
            () =>
              import("./entries/endpoints/api/repos/_repoId_/smart-http/_...gitPath_/_server.ts.js"),
          ),
        },
        {
          id: "/help",
          pattern: /^\/help\/?$/,
          params: [],
          page: { layouts: [0], errors: [1], leaf: 3 },
          endpoint: null,
        },
        {
          id: "/login",
          pattern: /^\/login\/?$/,
          params: [],
          page: { layouts: [0], errors: [1], leaf: 4 },
          endpoint: null,
        },
        {
          id: "/organizations",
          pattern: /^\/organizations\/?$/,
          params: [],
          page: { layouts: [0], errors: [1], leaf: 5 },
          endpoint: null,
        },
        {
          id: "/projects",
          pattern: /^\/projects\/?$/,
          params: [],
          page: { layouts: [0], errors: [1], leaf: 6 },
          endpoint: null,
        },
      ],
      prerendered_routes: new Set([]),
      matchers: async () => {
        return {};
      },
      server_assets: {},
    },
  };
})();
