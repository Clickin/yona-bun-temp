export const index = 2;
let component_cache;
export const component = async () =>
  (component_cache ??= (await import("../entries/pages/_page.svelte.js")).default);
export const imports = [
  "_app/immutable/nodes/2.NoH-WCMK.js",
  "_app/immutable/chunks/BtzawNjK.js",
  "_app/immutable/chunks/CYuLPLop.js",
  "_app/immutable/chunks/CMWHeIi6.js",
];
export const stylesheets = [];
export const fonts = [];
