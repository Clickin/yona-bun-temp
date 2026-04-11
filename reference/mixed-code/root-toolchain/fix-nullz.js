const fs = require("fs");
const files = ["drizzle/mysql/schema.ts", "drizzle/pg/schema.ts", "drizzle/sqlite/schema.ts"];

files.forEach((file) => {
  let content = fs.readFileSync(file, "utf8");
  // replace .default(new Date("NULLZ")) with .default(sql`CURRENT_TIMESTAMP`) maybe?
  // wait, the imports might not have sql, but let's just remove the .default(new Date("NULLZ")) entirely or replace with .defaultNow() if it's a date/timestamp builder, wait: Drizzle integer({mode:"timestamp"}).defaultNow() doesn't exist.
  // just remove the .default(...) entirely if it means NULL
  content = content.replace(/\.default\(new Date\("NULLZ"\)\)/g, "");
  fs.writeFileSync(file, content, "utf8");
  console.log(`Cleaned up NULLZ into missing defaults for ${file}`);
});
