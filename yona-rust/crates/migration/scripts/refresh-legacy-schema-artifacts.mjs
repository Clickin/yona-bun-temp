import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const persistenceRoot = path.join(repoRoot, "yona-rust", "crates", "persistence", "src");
const migrationRoot = path.join(repoRoot, "yona-rust", "crates", "migration");

const DIALECTS = [
  ["mysql", path.join(repoRoot, "drizzle", "mysql", "migrations")],
  ["postgres", path.join(repoRoot, "drizzle", "pg", "migrations")],
  ["sqlite", path.join(repoRoot, "drizzle", "sqlite", "migrations")],
];

const EXCLUDED_TABLES = new Set();

function readCanonicalModules() {
  const modRs = readFileSync(path.join(persistenceRoot, "mod.rs"), "utf8");
  return [...modRs.matchAll(/^pub mod ([a-z0-9_]+);$/gmu)]
    .map((match) => match[1])
    .filter((name) => !EXCLUDED_TABLES.has(name) && name !== "prelude");
}

function parseModel(moduleName) {
  const filePath = path.join(persistenceRoot, `${moduleName}.rs`);
  const text = readFileSync(filePath, "utf8");
  const tableName = text.match(/#\[sea_orm\(table_name = "([^"]+)"\)\]/u)?.[1] ?? moduleName;

  const modelBlock = text.match(/pub struct Model \{([\s\S]*?)\n\}/u)?.[1] ?? "";
  const columns = [];
  let pendingAttrs = [];
  let collectingAttr = false;
  let attrBuffer = [];

  for (const rawLine of modelBlock.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (collectingAttr) {
      attrBuffer.push(line);
      if (line.endsWith(")]")) {
        pendingAttrs.push(
          attrBuffer
            .join(" ")
            .replace(/^#\[sea_orm\(/u, "")
            .replace(/\)\]$/u, "")
            .replace(/\s+/gu, " ")
            .trim(),
        );
        collectingAttr = false;
        attrBuffer = [];
      }
      continue;
    }

    const attrMatch = line.match(/^#\[sea_orm\((.+)\)\]$/u);
    if (attrMatch) {
      pendingAttrs.push(attrMatch[1].replace(/\s+/gu, " ").trim());
      continue;
    }

    if (line.startsWith("#[sea_orm(")) {
      collectingAttr = true;
      attrBuffer = [line];
      continue;
    }

    const fieldMatch = line.match(/^pub ([a-zA-Z0-9_]+): ([^,]+),$/u);
    if (!fieldMatch) {
      continue;
    }

    const [, name, type] = fieldMatch;
    const attrs = pendingAttrs;
    pendingAttrs = [];

    columns.push({
      name,
      type,
      nullable: type.startsWith("Option<"),
      primaryKey: attrs.some((attr) => attr.includes("primary_key")),
      autoIncrement: attrs.some((attr) => attr.includes("primary_key"))
        ? !attrs.some((attr) => attr.includes("auto_increment = false"))
        : false,
      ignored: attrs.some((attr) => attr.includes("ignore")),
      unique:
        attrs.some((attr) => attr === "unique") ||
        attrs.some((attr) => attr.includes("unique_key = ")),
      attributes: attrs,
    });
  }

  const relationBlock = text.match(/pub enum Relation \{([\s\S]*?)\n\}/u)?.[1] ?? "";
  const relations = [];
  let pendingRelationAttrs = [];
  let collectingRelationAttr = false;
  let relationAttrBuffer = [];

  for (const rawLine of relationBlock.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (collectingRelationAttr) {
      relationAttrBuffer.push(line);
      if (line.endsWith(")]")) {
        pendingRelationAttrs.push(
          relationAttrBuffer
            .join(" ")
            .replace(/^#\[sea_orm\(/u, "")
            .replace(/\)\]$/u, "")
            .replace(/\s+/gu, " ")
            .trim(),
        );
        collectingRelationAttr = false;
        relationAttrBuffer = [];
      }
      continue;
    }

    const attrMatch = line.match(/^#\[sea_orm\(([\s\S]+)\)\]$/u);
    if (attrMatch) {
      pendingRelationAttrs.push(attrMatch[1].replace(/\s+/gu, " ").trim());
      continue;
    }

    if (line.startsWith("#[sea_orm(")) {
      collectingRelationAttr = true;
      relationAttrBuffer = [line];
      continue;
    }

    const relationMatch = line.match(/^([A-Za-z0-9_]+),$/u);
    if (!relationMatch) {
      continue;
    }

    relations.push({
      name: relationMatch[1],
      attributes: pendingRelationAttrs,
    });
    pendingRelationAttrs = [];
  }

  return {
    module: moduleName,
    name: tableName,
    columns,
    relations,
  };
}

function splitStatements(text) {
  return text
    .split(/-->\s*statement-breakpoint/gu)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function statementTargetTable(statement) {
  const patterns = [
    /CREATE TABLE(?: IF NOT EXISTS)? [`"]?([A-Za-z0-9_]+)[`"]?/iu,
    /ALTER TABLE(?: ONLY)? [`"]?([A-Za-z0-9_]+)[`"]?/iu,
    /CREATE(?: UNIQUE)? INDEX(?: IF NOT EXISTS)? [\s\S]+? ON [`"]?([A-Za-z0-9_]+)[`"]?/iu,
    /DROP INDEX(?: IF EXISTS)? [\s\S]+? ON [`"]?([A-Za-z0-9_]+)[`"]?/iu,
  ];

  for (const pattern of patterns) {
    const match = statement.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function collectCumulativeDialectSql(dialect, allowedTables, manifestTables) {
  const [, migrationsDir] = DIALECTS.find(([name]) => name === dialect);
  const directories = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted((left, right) => left.localeCompare(right));

  const keptStatements = [];

  for (const directory of directories) {
    const migrationPath = path.join(migrationsDir, directory, "migration.sql");
    if (!existsSync(migrationPath)) {
      continue;
    }
    const text = readFileSync(migrationPath, "utf8");

    for (const statement of splitStatements(text)) {
      const tableName = statementTargetTable(statement);
      if (!tableName || !allowedTables.has(tableName)) {
        continue;
      }

      keptStatements.push(statement);
    }
  }

  const normalizedStatements = normalizeStatementsForDialect(
    dialect,
    keptStatements,
    manifestTables,
  );

  return [
    `-- Generated by refresh-legacy-schema-artifacts.mjs`,
    `-- Source dialect: ${dialect}`,
    `-- Source root: ${path.relative(repoRoot, migrationsDir).replaceAll("\\", "/")}`,
    ...normalizedStatements.flatMap((statement) => [statement, "--> statement-breakpoint"]),
  ].join("\n");
}

function normalizeStatementsForDialect(dialect, statements, manifestTables) {
  const manifestByTable = new Map(manifestTables.map((table) => [table.name, table]));
  const uniqueStatements = [];
  const seenStatements = new Set();

  for (const statement of statements) {
    let normalizedStatement = normalizeCreateTableDefaults(statement);
    const createTableMatch = normalizedStatement.match(
      /^CREATE TABLE "([^"]+)"|^CREATE TABLE `([^`]+)`/mu,
    );
    if (createTableMatch) {
      const tableName = createTableMatch[1] ?? createTableMatch[2];
      const table = manifestByTable.get(tableName);
      if (table) {
        normalizedStatement = injectPrimaryKeyClause(normalizedStatement, table, dialect);
      }
    }

    if (seenStatements.has(normalizedStatement)) {
      continue;
    }
    seenStatements.add(normalizedStatement);
    uniqueStatements.push(normalizedStatement);
  }

  if (dialect !== "postgres") {
    return uniqueStatements;
  }

  const seenIndexNames = new Set();
  return uniqueStatements.map((statement) => {
    const indexMatch = statement.match(/^(CREATE(?: UNIQUE)? INDEX )"([^"]+)"( ON "([^"]+)")/mu);
    if (!indexMatch) {
      return statement;
    }

    const [, prefix, indexName, onClause, tableName] = indexMatch;
    if (!seenIndexNames.has(indexName)) {
      seenIndexNames.add(indexName);
      return statement;
    }

    let renamedIndex = `${indexName}_${tableName}`;
    let suffix = 2;
    while (seenIndexNames.has(renamedIndex)) {
      renamedIndex = `${indexName}_${tableName}_${suffix}`;
      suffix += 1;
    }
    seenIndexNames.add(renamedIndex);
    return statement.replace(
      /^(CREATE(?: UNIQUE)? INDEX )"([^"]+)"( ON "([^"]+)")/mu,
      `${prefix}"${renamedIndex}"${onClause}`,
    );
  });
}

function normalizeCreateTableDefaults(statement) {
  return statement
    .replace(/DEFAULT 'NULL'/gu, "DEFAULT NULL")
    .replace(/DEFAULT \(NULL\)/gu, "DEFAULT NULL")
    .replace(/DEFAULT NaN/gu, "DEFAULT NULL");
}

function injectPrimaryKeyClause(statement, table, dialect) {
  const quote = dialect === "postgres" ? '"' : "`";
  const primaryKeys = table.columns
    .filter((column) => column.primaryKey && !column.ignored)
    .map((column) => `${quote}${column.name}${quote}`);
  if (primaryKeys.length === 0 || statement.includes("PRIMARY KEY")) {
    return statement;
  }

  let normalized = statement;
  if (dialect === "postgres") {
    for (const column of table.columns) {
      if (!(column.type === "i8" || column.type === "Option<i8>")) {
        continue;
      }

      const columnPattern = new RegExp(`(^\\s+"${column.name}"\\s+)boolean(\\b)`, "mu");
      normalized = normalized.replace(columnPattern, `$1smallint$2`);
      normalized = normalized.replace(
        new RegExp(`(^\\s+"${column.name}"[^\\n]*DEFAULT )false`, "mu"),
        `$10`,
      );
      normalized = normalized.replace(
        new RegExp(`(^\\s+"${column.name}"[^\\n]*DEFAULT )true`, "mu"),
        `$11`,
      );
    }
  }

  return normalized.replace(/\n\);$/u, `,\n\tPRIMARY KEY (${primaryKeys.join(", ")})\n);`);
}

function buildCompatibilityMatrix() {
  return `# Dialect Compatibility Matrix

이 문서는 legacy MariaDB final schema를 canonical SeaORM baseline으로 정규화할 때 허용한 dialect 차이를 기록한다.

## Rules

- 보존 대상: table name, column name, nullability, PK/FK, unique/index semantics
- 정규화 허용 대상: vendor-specific physical type, boolean/date/time 표현, default syntax 차이
- canonical app schema 제외: framework bookkeeping table \`play_evolutions\`

## Matrix

### Auto-increment primary keys

- legacy MariaDB 표현: \`bigint PRIMARY KEY\`, 일부 table에서 auto-increment semantics 사용
- canonical SeaORM 표현: generated entity primary key + dialect-specific auto increment backend
- pg/mysql/sqlite 생성 결과: Postgres \`bigserial\`, MySQL \`bigint auto_increment\`, SQLite \`integer primary key autoincrement\`
- 허용 근거: identity syntax는 dialect physical representation 차이이며 logical PK/autoincrement 의미는 동일하다

### Boolean flags

- legacy MariaDB 표현: \`boolean\` 또는 tiny-int 계열 flag
- canonical SeaORM 표현: Rust side에서는 bool 또는 optional integer flag를 유지하고 migration SQL은 dialect native boolean 표현을 사용
- pg/mysql/sqlite 생성 결과: Postgres \`boolean\`, MySQL \`boolean/tinyint(1)\`, SQLite \`integer\`
- 허용 근거: legacy semantics는 truthy flag이며 dialect storage class 차이는 parity concern이 아니다

### Date and time columns

- legacy MariaDB 표현: \`datetime\`
- canonical SeaORM 표현: generated entity의 \`DateTime\` / nullable timestamp field 유지
- pg/mysql/sqlite 생성 결과: Postgres \`timestamp\`, MySQL \`datetime\`, SQLite \`integer\`
- 허용 근거: baseline은 logical timestamp presence를 보존하고 physical storage/encoding은 backend-specific normalization으로 허용한다

### Large text payloads

- legacy MariaDB 표현: \`longtext\`
- canonical SeaORM 표현: entity layer에서는 string/text column으로 유지
- pg/mysql/sqlite 생성 결과: Postgres \`text\`, MySQL \`longtext\`, SQLite \`text\`
- 허용 근거: issue/comment/posting payload의 semantic contract는 unbounded text이며 backend type name 차이는 허용 가능한 정규화다
`;
}

function main() {
  const modules = readCanonicalModules();
  const manifestTables = modules.map(parseModel);
  const allowedTables = new Set(manifestTables.map((table) => table.name));

  mkdirSync(migrationRoot, { recursive: true });
  mkdirSync(path.join(migrationRoot, "scripts"), { recursive: true });

  const manifest = {
    source: {
      canonicalEntityTree: "yona-rust/crates/persistence/src",
      supportingReference: "drizzle/* latest cumulative migrations",
      excludedTables: [...EXCLUDED_TABLES],
    },
    tables: manifestTables,
  };

  writeFileSync(
    path.join(migrationRoot, "legacy-final-schema-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  for (const [dialect] of DIALECTS) {
    const sql = collectCumulativeDialectSql(dialect, allowedTables, manifestTables);
    writeFileSync(path.join(migrationRoot, `legacy-final-schema.${dialect}.sql`), `${sql}\n`);
  }

  writeFileSync(
    path.join(migrationRoot, "dialect-compat-matrix.md"),
    `${buildCompatibilityMatrix()}\n`,
  );
}

main();

if (process.argv.includes("--print")) {
  process.stdout.write("legacy schema artifacts refreshed\n");
}
