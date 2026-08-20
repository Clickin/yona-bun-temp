// dom-parity lane setup: declare the React 19 act() environment so render
// updates inside act() don't warn (and unmounted updates do).
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// happy-dom's Window does not expose localStorage/sessionStorage under the
// vitest environment, and the node runtime's experimental `sessionStorage`
// global is not backed by a file. Provide a same-realm Storage shim so app
// code reading `localStorage`/`sessionStorage` behaves like a browser
// (persisted across goto, cleared per test in dom-compat teardown).
function createStorageShim(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

const shimLocalStorage = createStorageShim();
const shimSessionStorage = createStorageShim();

if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: shimLocalStorage,
    configurable: true,
  });
}
if (typeof globalThis.sessionStorage === "undefined") {
  Object.defineProperty(globalThis, "sessionStorage", {
    value: shimSessionStorage,
    configurable: true,
  });
}
try {
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", { value: shimLocalStorage, configurable: true });
    Object.defineProperty(window, "sessionStorage", {
      value: shimSessionStorage,
      configurable: true,
    });
  }
} catch {
  // window may not be definable in some environments — globalThis is enough
}
