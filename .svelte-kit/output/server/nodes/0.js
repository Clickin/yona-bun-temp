export const index = 0;
let component_cache;
export const component = async () =>
  (component_cache ??= (await import("../entries/pages/_layout.svelte.js")).default);
export const imports = [
  "_app/immutable/nodes/0.DTit13Uh.js",
  "_app/immutable/chunks/BtzawNjK.js",
  "_app/immutable/chunks/CYuLPLop.js",
  "_app/immutable/chunks/DVxR7C2P.js",
  "_app/immutable/chunks/DswxB6EI.js",
  "_app/immutable/chunks/BD3U-b1t.js",
  "_app/immutable/chunks/D8M4Cgha.js",
  "_app/immutable/chunks/6vG7ubTH.js",
];
export const stylesheets = ["_app/immutable/assets/0.BRMr9se_.css"];
export const fonts = [];
