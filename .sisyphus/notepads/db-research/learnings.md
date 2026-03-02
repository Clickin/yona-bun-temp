# Bun SQL + Drizzle ORM - Authoritative Documentation & Examples

## Document Created

- Date: 2026-03-02
- Purpose: Comprehensive reference for Bun SQL URL formats, Drizzle bun-sql multi-dialect APIs, and drizzle-kit configuration

---

## 1. Bun SQL URL Formats

### PostgreSQL

**Connection URL Format:** `postgres://user:password@host:port/database` or `postgresql://user:password@host:port/database`

**Key Examples:**

```typescript
import { SQL } from 'bun';

// Standard format
const pg = new SQL("postgres://user:pass@localhost:5432/mydb");

// Environment variable (automatic detection)
import { sql } from 'bun';
await sql\`SELECT ...\`; // Uses DATABASE_URL if postgres:// URL

// Direct connection with explicit URL
const pgClient = new SQL(process.env.DATABASE_URL!);
```

**Reference:** https://bun.sh/docs/runtime/sql

---

### MySQL

**Connection URL Format:** `mysql://user:password@host:port/database` or `mysql2://user:password@host:port/database`

**Key Examples:**

```typescript
import { SQL } from "bun";

// Standard mysql:// protocol
const mysql = new SQL("mysql://user:pass@localhost:3306/database");

// mysql2:// protocol (mysql2 npm package compatibility)
const mysql2 = new SQL("mysql2://user:pass@localhost:3306/database");

// Using options object
const mysql3 = new SQL({
  adapter: "mysql",
  hostname: "localhost",
  port: 3306,
  database: "myapp",
  username: "dbuser",
  password: "secretpass",
});
```

**MySQL Connection String Variants:**

- `mysql://user:pass@localhost:3306/database` (standard)
- `mysql://user:pass@localhost/database` (default port 3306)
- `mysql2://user:pass@localhost:3306/database` (mysql2 protocol)
- `mysql://user:pass@localhost/db?ssl=true` (with query params)
- `mysql://user:pass@/database?socket=/var/run/mysqld/mysqld.sock` (Unix socket)

**Reference:** https://bun.sh/docs/runtime/sql

---

### SQLite

**Connection URL Format:** `sqlite://path/to/database.db` or `sqlite::memory:` (in-memory)

**Key Examples:**

```typescript
import { SQL } from "bun";

// File-based database
const sqlite = new SQL("sqlite://myapp.db");

// Relative path
const sqlite2 = new SQL("sqlite:./local.db");

// Absolute path
const sqlite3 = new SQL("sqlite:///absolute/path.db");

// In-memory database
const sqliteMem = new SQL("sqlite::memory:");

// Read-only mode
const sqliteRo = new SQL("sqlite://data.db?mode=ro");
```

**SQLite URL Variants:**

- `sqlite://myapp.db` (relative path)
- `sqlite::memory:` (in-memory)
- `sqlite://./local.db` (current directory)
- `sqlite://../parent/db.db` (relative path with parent)
- `sqlite:///absolute/path.db` (absolute path with triple slash)
- `sqlite://data.db?mode=ro` (read-only mode)

**Reference:** https://bun.sh/docs/runtime/sql

---

## 2. Drizzle bun-sql Multi-Dialect APIs

### Bun SQL Driver Import

```typescript
import "dotenv/config";
import { drizzle } from "drizzle-orm/bun-sql";
```

### Universal Connection Pattern

```typescript
// Method 1: Pass DATABASE_URL directly
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/bun-sql';

const db = drizzle(process.env.DATABASE_URL!);
const result = await db.select().from(...);
```

### Existing Bun SQL Client Pattern

```typescript
// Method 2: Use existing Bun SQL client instance
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/bun-sql';
import { SQL } from 'bun';

const client = new SQL(process.env.DATABASE_URL!);
const db = drizzle({ client });
const result = await db.select().from(...);
```

### SQLite-specific Pattern (Bun:SQLite)

```typescript
import "dotenv/config";
import { drizzle } from "drizzle-orm/bun-sqlite";

const db = drizzle(process.env.DB_FILE_NAME!);
```

### Synchronous Query Execution (Bun SQLite)

```typescript
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";

const sqlite = new Database("sqlite.db");
const db = drizzle({ client: sqlite });

// Synchronous query methods
const result = db.select().from(users).all(); // all results
const single = db.select().from(users).get(); // single result
const values = db.select().from(users).values(); // array of values
const executed = db.select().from(users).run(); // execute, get meta
```

**Key Constraint:** Bun SQL automatically detects database type from URL format:

- `postgres://` or `postgresql://` → PostgreSQL
- `mysql://` or `mysql2://` → MySQL
- `sqlite://` → SQLite
- No explicit URL → Falls back to PostgreSQL via environment variables

**References:**

- https://rqbv2.drizzle-orm-fe.pages.dev/docs/connect-bun-sql
- https://rqbv2.drizzle-orm-fe.pages.dev/docs/get-started/bun-sql-new

---

## 3. Drizzle Kit Configuration & Migration Setup

### Minimal drizzle.config.ts

```typescript
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Multi-Dialect Configuration Examples

#### PostgreSQL

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: "postgres://user:password@host:port/db",
  },
});
```

#### MySQL

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  dbCredentials: {
    url: "postgres://user:password@host:port/db",
  },
});

// OR via connection params
export default defineConfig({
  dialect: "mysql",
  dbCredentials: {
    host: "host",
    port: 5432,
    user: "user",
    password: "password",
    database: "dbname",
    ssl: "...", // string | SslOptions (mysql2 package)
  },
});
```

#### SQLite

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  dbCredentials: {
    url: ":memory:", // in-memory
    // OR
    url: "sqlite.db", // file
    // OR
    url: "file:sqlite.db", // file: prefix required by libsql
  },
});
```

### Multi-Database Configuration Files

```bash
# Generate using specific config
npx drizzle-kit generate --config=drizzle-dev.config.ts
npx drizzle-kit generate --config=drizzle-prod.config.ts

# Bun equivalent
bun drizzle-kit generate --config=drizzle-dev.config.ts
```

### Migration Folder Structure

```
📦 <project root>
 ├ 📂 drizzle
 │  ├ 📂 _meta            # Drizzle Kit metadata
 │  ├ 📜 0001_init.sql   # SQL migration files
 │  ├ 📜 0002_add_users.sql
 │  └ 📜 snapshot.json     # Schema snapshot
 ├ 📂 src
 │  └ 📜 schema.ts
 ├ 📜 drizzle.config.ts
 └ 📜 package.json
```

**Configuration Options:**

- `out`: Defines output folder for migrations (default: `./drizzle`)
- `schema`: Glob pattern or array pointing to schema files (`./src/db/*`, `["./src/schema/*.ts"]`)
- `dialect`: Database type (`"postgresql" | "mysql" | "sqlite" | "turso" | "singlestore"`)
- `dbCredentials`: Connection URL or driver-specific credentials

**Key Constraint:** `file:` prefix is REQUIRED for libsql (Turso/SQLite) connections

**References:**

- https://rqbv2.drizzle-orm-fe.pages.dev/docs/drizzle-config-file
- https://rqbv2.drizzle-orm-fe.pages.dev/docs/drizzle-kit-generate

---

## 4. Drizzle Kit CLI Commands

### Core Commands

```bash
# Generate migrations from schema
bun drizzle-kit generate --name=init
npx drizzle-kit generate --name=add_users

# Apply migrations to database
bun drizzle-kit migrate
npx drizzle-kit migrate

# Push schema directly (no migration files)
bun drizzle-kit push
npx drizzle-kit push

# Pull schema from existing database
bun drizzle-kit pull
npx drizzle-kit pull

# Check migrations for issues
bun drizzle-kit check
npx drizzle-kit check

# Launch Drizzle Studio (UI)
bun drizzle-kit studio
npx drizzle-kit studio

# Update migration snapshots
bun drizzle-kit up
npx drizzle-kit up

# Export schema
bun drizzle-kit export
npx drizzle-kit export
```

### Generate Workflow

1. Reads Drizzle schema files → creates JSON representation
2. Examines existing migration folders for differences
3. Compares current schema snapshot vs most recent
4. Generates SQL migrations (`migration.sql`) + JSON snapshots (`snapshot.json`)
5. Files marked with timestamps in migration directory

**Reference:** https://rqbv2.drizzle-orm-fe.pages.dev/docs/kit-overview

---

## 5. Environment Validation Constraints

### Critical Environment Variables

```dotenv
# .env file
DATABASE_URL=postgres://user:pass@localhost:5432/mydb
# OR
DB_FILE_NAME=sqlite.db
```

### TypeScript Environment Validation Pattern

```typescript
// db/index.ts
import { SQL } from "bun";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const db = new SQL(url);
export { db };
```

### Connection URL Format Validation

**For PostgreSQL:**

- Must start with `postgres://` or `postgresql://`
- Format: `postgres://[user[:password]@]host[:port][/database][?params]`
- Default port: 5432

**For MySQL:**

- Must start with `mysql://` or `mysql2://`
- Format: `mysql://[user[:password]@]host[:port][/database][?params]`
- Default port: 3306

**For SQLite:**

- Must start with `sqlite://`
- Format: `sqlite://[file_path]` or `sqlite::memory:`
- Supports relative/absolute paths, in-memory databases

**Reference:** https://rqbv2.drizzle-orm-fe.pages.dev/docs/get-started/bun-sql-new

---

## 6. Real-World Usage Examples

### Example 1: PostgreSQL + Drizzle (Production)

```typescript
// src/db/index.ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const db = drizzle(DATABASE_URL, { schema });

// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Example 2: Multi-Database Setup (Dev vs Prod)

```typescript
// drizzle.dev.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: ":memory:",
  },
});

// drizzle.prod.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Example 3: Drizzle with Multi-Schema Setup

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/*", // Glob pattern for multiple schema files
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

## 7. Key Constraints & Gotchas

### Bun SQL Constraints

1. **PostgreSQL is default fallback** when URL doesn't match SQLite/MySQL patterns
2. **MySQL 5.7+ and 8.0+ supported**
3. **Binary protocol** for better performance with prepared statements
4. **Automatic prepared statements** for parameterized queries with caching
5. **Connection pooling** supported (Bun SQL `max` option)

### Drizzle Constraints

1. **file: prefix required** for SQLite/libsql connections in Drizzle Kit config
2. **Dialect must match** connection URL format (`postgresql` vs `mysql` vs `sqlite`)
3. **Multiple config files supported** via `--config` flag
4. **Migration folder structure** must have `_meta` folder for Drizzle Kit metadata
5. **Timestamp-based migration files** (e.g., `0001_init.sql`)

### Environment Validation

1. **Always validate environment variables** at application startup
2. **Use TypeScript non-null assertion** (`!`) only after validation
3. **Support multiple database types** via conditional logic based on URL format
4. **Document required environment variables** in README.md

---

## 8. Authoritative Links

### Bun SQL Documentation

- **Main Docs:** https://bun.sh/docs/runtime/sql
- **Bun GitHub:** https://github.com/oven-sh/bun

### Drizzle ORM Documentation

- **Bun SQL Driver:** https://rqbv2.drizzle-orm-fe.pages.dev/docs/connect-bun-sql
- **Get Started (Bun SQL):** https://rqbv2.drizzle-orm-fe.pages.dev/docs/get-started/bun-sql-new
- **Bun SQLite Driver:** https://rqbv2.drizzle-orm-fe.pages.dev/docs/connect-bun-sqlite
- **Drizzle Kit Config:** https://rqbv2.drizzle-orm-fe.pages.dev/docs/drizzle-config-file
- **Drizzle Kit Overview:** https://rqbv2.drizzle-orm-fe.pages.dev/docs/kit-overview
- **Generate Command:** https://rqbv2.drizzle-orm-fe.pages.dev/docs/drizzle-kit-generate

### Drizzle GitHub Examples

- **Bun SQL Integration Tests:** https://github.com/drizzle-team/drizzle-orm/blob/main/integration-tests/tests/bun/bun-sql.test.ts
- **Bun SQL Driver Source:** https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/bun-sql/driver.ts

---

## Summary for Yona Porting Project

For Yona's **SvelteKit SSR (Bun) + Hono** architecture:

1. **Use Bun SQL as primary driver** for all database connections
2. **Support PostgreSQL/MySQL/SQLite** via connection URL format detection
3. **Validate DATABASE_URL** at startup with clear error messages
4. **Use Drizzle bun-sql** for type-safe ORM queries
5. **Configure drizzle-kit** with proper dialect and migration folder
6. **Generate migrations** with descriptive names (`--name=add_projects_table`)
7. **Apply migrations** via `bun drizzle-kit migrate` in deployment pipeline
8. **Support multi-config** for dev/test/prod environments

---

**Document Version:** v1.0
**Last Updated:** 2026-03-02
