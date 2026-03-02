const fs = require("fs");
const path = require("path");

const dirs = ["mysql", "pg", "sqlite"];
dirs.forEach((d) => fs.mkdirSync(path.join("drizzle", d), { recursive: true }));

const files = ["schema.ts", "relations.ts"];

for (const dir of dirs) {
  for (const file of files) {
    fs.copyFileSync(path.join("drizzle", file), path.join("drizzle", dir, file));
  }
}

for (const file of files) {
  fs.unlinkSync(path.join("drizzle", file));
}

console.log("Schema files successfully copied to all dialect directories and removed from root.");
