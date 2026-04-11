declare module "bun:test" {
  export const afterAll: typeof import("vitest").afterAll;
  export const beforeAll: typeof import("vitest").beforeAll;
  export const describe: typeof import("vitest").describe;
  export const expect: typeof import("vitest").expect;
  export const it: typeof import("vitest").it;
}
