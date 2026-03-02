import { copyFileSync, mkdirSync, unlinkSync } from "fs";

["mysql", "pg", "sqlite"].forEach((dir) => mkdirSync(`drizzle/${dir}`, { recursive: true }));
copyFileSync("drizzle/schema.ts", "drizzle/mysql/schema.ts");
copyFileSync("drizzle/relations.ts", "drizzle/mysql/relations.ts");
copyFileSync("drizzle/schema.ts", "drizzle/pg/schema.ts");
copyFileSync("drizzle/relations.ts", "drizzle/pg/relations.ts");
copyFileSync("drizzle/schema.ts", "drizzle/sqlite/schema.ts");
copyFileSync("drizzle/relations.ts", "drizzle/sqlite/relations.ts");
unlinkSync("drizzle/schema.ts");
unlinkSync("drizzle/relations.ts");
console.log("Copied!");
