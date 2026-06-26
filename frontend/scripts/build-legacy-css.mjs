import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import less from "less";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(frontendRoot, "..");

const entries = [
  {
    input: "yona-original/app/assets/stylesheets/yobi.less",
    output: "frontend/public/legacy-assets/stylesheets/yobi.css",
  },
  {
    input: "yona-original/app/assets/stylesheets/usermenu.less",
    output: "frontend/public/legacy-assets/stylesheets/usermenu.css",
  },
];

for (const entry of entries) {
  const inputPath = path.join(repoRoot, entry.input);
  const outputPath = path.join(repoRoot, entry.output);
  const source = await fs.readFile(inputPath, "utf8");
  const rendered = await less.render(source, {
    filename: inputPath,
    paths: [path.dirname(inputPath)],
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, rendered.css);
  console.log(`${entry.input} -> ${entry.output}`);
}
