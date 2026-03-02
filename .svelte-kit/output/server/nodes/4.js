export const index = 4;
let component_cache;
export const component = async () =>
  (component_cache ??= (await import("../entries/pages/login/_page.svelte.js")).default);
export const imports = [
  "_app/immutable/nodes/4.n66HTiJ2.js",
  "_app/immutable/chunks/BtzawNjK.js",
  "_app/immutable/chunks/CYuLPLop.js",
  "_app/immutable/chunks/CMWHeIi6.js",
];
export const stylesheets = [];
export const fonts = [];
