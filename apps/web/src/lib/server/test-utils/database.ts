import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
/**
 * Sets up a PostgreSQL test database using TestContainers.
 * Starts a PostgreSQL container, returns connection URL and cleanup function.
 *
 * @returns Promise<{ url: string; cleanup: () => Promise<void> }>
 */
export async function setupPostgresTestDatabase(): Promise<{
  url: string;
  cleanup: () => Promise<void>;
}> {
  const container = await new PostgreSqlContainer().start();
  const url = container.getConnectionUri();

  return {
    url,
    cleanup: async () => {
      await container.stop();
    },
  };
}

/**
 * Sets up a MySQL test database using TestContainers.
 * Starts a MySQL container, returns connection URL and cleanup function.
 *
 * @returns Promise<{ url: string; cleanup: () => Promise<void> }>
 */
export async function setupMySQLTestDatabase(): Promise<{
  url: string;
  cleanup: () => Promise<void>;
}> {
  const container = await new MySqlContainer().start();
  const url = container.getConnectionUri();

  return {
    url,
    cleanup: async () => {
      await container.stop();
    },
  };
}

/**
 * Sets up an in-memory SQLite test database.
 * Returns connection URL (no cleanup needed for in-memory database).
 *
 * @returns Promise<{ url: string; cleanup: () => Promise<void> }>
 */
export async function setupSQLiteTestDatabase(): Promise<{
  url: string;
  cleanup: () => Promise<void>;
}> {
  const url = "sqlite::memory:";

  return {
    url,
    cleanup: async () => {
      // In-memory database is automatically cleaned up when connection is closed
    },
  };
}
