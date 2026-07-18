import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const verifier = await readFile(new URL("../frontend/scripts/verify-stylex-build.mjs", import.meta.url), "utf8");
assert.match(verifier, /@property\\s\+--x-\[\\w-\]\+/u);
assert.match(verifier, /:root,\\s\+\)\?\\\.x/u);
assert.match(verifier, /has an unlayered top-level rule/u);
