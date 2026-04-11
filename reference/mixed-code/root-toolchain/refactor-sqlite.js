const fs = require("fs");
let code = fs.readFileSync("drizzle/sqlite/schema.ts", "utf8");

code = code.replace(
  /import\s*\{[^}]+\}\s*from\s*"drizzle-orm\/mysql-core";/,
  `import {
  sqliteTable as table,
  integer,
  text,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/sqlite-core";`,
);

code = code.replace(/mysqlTable/g, "table");
code = code.replace(/bigint\(([^)]*)\)/g, "integer($1)");
code = code.replace(/int\(([^)]*)\)/g, "integer($1)");
code = code.replace(/varchar\(\{ length: \d+ \}\)/g, "text()");
code = code.replace(/varchar\("([^"]+)",\s*\{ length: \d+ \}\)/g, 'text("$1")');
code = code.replace(/longtext\(\)/g, "text()");
code = code.replace(/longtext\("([^"]+)"\)/g, 'text("$1")');
code = code.replace(/tinyint\(\)/g, "integer()");
code = code.replace(/boolean\(\)/g, 'integer({ mode: "boolean" })');
code = code.replace(/boolean\("([^"]+)"\)/g, 'integer("$1", { mode: "boolean" })');
code = code.replace(/datetime\(\)/g, 'integer({ mode: "timestamp" })');
code = code.replace(/datetime\("([^"]+)"\)/g, 'integer("$1", { mode: "timestamp" })');
code = code.replace(/timestamp\("([^"]+)"\)/g, 'integer("$1", { mode: "timestamp" })');
code = code.replace(/date\(\)/g, 'integer({ mode: "timestamp" })');

code = code.replace(/\.autoincrement\(\)\.notNull\(\)/g, ".primaryKey({ autoIncrement: true })");

// The instruction for FK actions: SQLite application-level CASCADE
// In the schema definition, SQLite's foreignKey doesn't technically cleanly support `onUpdate: 'restrict'` out of the box with auto mappings if PRAGMA foreign_keys = OFF, but drizzle-orm/sqlite-core *does* accept `.onDelete("restrict").onUpdate("restrict")` on the builder.
// We will leave the builder as is, but we'll document that app-level cascading is needed depending on operations.

fs.writeFileSync("drizzle/sqlite/schema.ts", code, "utf8");
console.log("sqlite schema syntax replaced");
