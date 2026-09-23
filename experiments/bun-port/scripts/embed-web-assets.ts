import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const assetDirectory = "web/dist/client/assets";
const assets = (await readdir(assetDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .sort();
// ponytail: current Start builds emit JS/CSS; fail rather than omit new binary assets.
if (assets.length === 0 || assets.some((name) => !/\.(?:js|css)$/u.test(name))) {
  throw new Error("Expected generated JavaScript and CSS assets only");
}

const imports = assets.map(
  (name, index) =>
    `import asset${index} from ${JSON.stringify(`./client/assets/${name}`)} with { type: "text" };`,
);
const entries = assets.map((name, index) => `  ${JSON.stringify(name)}: asset${index},`);
await writeFile(
  join("web/dist", "embedded-assets.mjs"),
  `${imports.join("\n")}\nexport default {\n${entries.join("\n")}\n};\n`,
);
