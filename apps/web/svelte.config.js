import adapter from "@sveltejs/adapter-auto";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
    // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
    // See https://svelte.dev/docs/kit/adapters for more information about adapters.
    adapter: adapter(),
    alias: {
      "@app": "../../apps/app/src",
      "@yona/core": "../../packages/core/src/index.ts",
      "@yona/core/*": "../../packages/core/src/*",
      "@yona/api": "../../packages/api/src/index.ts",
      "@yona/api/*": "../../packages/api/src/*",
      "@yona/infra": "../../packages/infra/src/index.ts",
      "@yona/infra/*": "../../packages/infra/src/*",
      "@yona/db": "../../packages/db/src/index.ts",
      "@yona/db/*": "../../packages/db/src/*",
      "@yona/vcs": "../../packages/vcs/src/index.ts",
      "@yona/vcs/*": "../../packages/vcs/src/*",
      "@web": "./src",
      "@core": "../../packages/core/src",
      "@api": "../../packages/api/src",
      "@infra": "../../packages/infra/src",
      "@drizzle": "../../drizzle",
    },
  },
};

export default config;

