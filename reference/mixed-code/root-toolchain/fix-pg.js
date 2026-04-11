const fs = require("fs");

let pgSchema = fs.readFileSync("drizzle/pg/schema.ts", "utf8");

// Replace import statement to remove duplicates and invalid exports
pgSchema = pgSchema.replace(
  /import\s*\{[^}]+\}\s*from\s*"drizzle-orm\/pg-core";/,
  `import {
  pgTable,
  bigint,
  varchar,
  timestamp,
  integer,
  text,
  boolean,
  smallint,
  date,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";`,
);

// Replace mysqlTable with pgTable
pgSchema = pgSchema.replace(/export const (\w+) = table\(/g, "export const $1 = pgTable(");
pgSchema = pgSchema.replace(/export const (\w+) = table\("/g, 'export const $1 = pgTable("');

// Replace data types
pgSchema = pgSchema.replace(/\bint\(/g, "integer(");
pgSchema = pgSchema.replace(/\btinyint\(/g, "smallint(");
pgSchema = pgSchema.replace(/\bdatetime\(/g, "timestamp(");
pgSchema = pgSchema.replace(/\blongtext\(/g, "text(");

fs.writeFileSync("drizzle/pg/schema.ts", pgSchema, "utf8");
console.log("Postgres schema fixed!");
