import adapter from "@sveltejs/adapter-auto";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    alias: {
      "@app": "../../apps/app/src",
      "@yona/core": "../../packages/core/src/index.ts",
      "@yona/core/*": "../../packages/core/src/*",
      "@yona/infra": "../../packages/infra/src/index.ts",
      "@yona/infra/*": "../../packages/infra/src/*",
      "@yona/db": "../../packages/db/src/index.ts",
      "@yona/db/*": "../../packages/db/src/*",
      "@yona/vcs": "../../packages/vcs/src/index.ts",
      "@yona/vcs/*": "../../packages/vcs/src/*",
      "@web": "./src",
      "@core": "../../packages/core/src",
      "@infra": "../../packages/infra/src",
      "@drizzle": "../../drizzle",
    },
  },
};

export default config;
