export const index = 5;
let component_cache;
export const component = async () =>
  (component_cache ??= (await import("../entries/pages/organizations/_page.svelte.js")).default);
export const imports = [
  "_app/immutable/nodes/5.DQtq-Wzm.js",
  "_app/immutable/chunks/BtzawNjK.js",
  "_app/immutable/chunks/CYuLPLop.js",
  "_app/immutable/chunks/CMWHeIi6.js",
];
export const stylesheets = [];
export const fonts = [];
