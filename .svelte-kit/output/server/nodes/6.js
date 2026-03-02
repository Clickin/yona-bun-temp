export const index = 6;
let component_cache;
export const component = async () =>
  (component_cache ??= (await import("../entries/pages/projects/_page.svelte.js")).default);
export const imports = [
  "_app/immutable/nodes/6.BYGuT81j.js",
  "_app/immutable/chunks/BtzawNjK.js",
  "_app/immutable/chunks/CYuLPLop.js",
  "_app/immutable/chunks/CMWHeIi6.js",
];
export const stylesheets = [];
export const fonts = [];
