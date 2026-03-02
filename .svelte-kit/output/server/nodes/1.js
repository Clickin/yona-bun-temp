export const index = 1;
let component_cache;
export const component = async () =>
  (component_cache ??= (await import("../entries/fallbacks/error.svelte.js")).default);
export const imports = [
  "_app/immutable/nodes/1.BGNDreia.js",
  "_app/immutable/chunks/BtzawNjK.js",
  "_app/immutable/chunks/CYuLPLop.js",
  "_app/immutable/chunks/CMWHeIi6.js",
  "_app/immutable/chunks/DVxR7C2P.js",
  "_app/immutable/chunks/6vG7ubTH.js",
  "_app/immutable/chunks/BD3U-b1t.js",
  "_app/immutable/chunks/D8M4Cgha.js",
];
export const stylesheets = [];
export const fonts = [];
