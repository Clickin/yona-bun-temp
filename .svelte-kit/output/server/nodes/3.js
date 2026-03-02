export const index = 3;
let component_cache;
export const component = async () =>
  (component_cache ??= (await import("../entries/pages/help/_page.svelte.js")).default);
export const imports = [
  "_app/immutable/nodes/3.PB2HDMVE.js",
  "_app/immutable/chunks/BtzawNjK.js",
  "_app/immutable/chunks/CYuLPLop.js",
  "_app/immutable/chunks/CMWHeIi6.js",
];
export const stylesheets = [];
export const fonts = [];
