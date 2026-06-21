package dev.yona.tools.h2tosqlite;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

final class H2ToSqliteSmokeTest {
    @TempDir
    Path tempDir;

    @Test
    void convertsTinyH2DatabaseToSqlite() throws Exception {
        Path h2Base = tempDir.resolve("tiny-h2");
        Path sqlite = tempDir.resolve("tiny.sqlite");

        try (Connection h2 = DriverManager.getConnection("jdbc:h2:" + h2Base, "sa", "");
             Statement statement = h2.createStatement()) {
            statement.execute("CREATE TABLE users (id BIGINT PRIMARY KEY, login_id VARCHAR(255) NOT NULL, active BOOLEAN NOT NULL)");
            statement.execute("CREATE TABLE issue (id BIGINT PRIMARY KEY, title VARCHAR(255), author_id BIGINT)");
            statement.execute("INSERT INTO users (id, login_id, active) VALUES (1, 'admin', TRUE)");
            statement.execute("INSERT INTO issue (id, title, author_id) VALUES (10, 'first issue', 1)");
        }

        H2ToSqlite.convert(new H2ToSqlite.Options(
            "jdbc:h2:" + h2Base,
            sqlite,
            "sa",
            "",
            "PUBLIC",
            true,
            false
        ));

        assertEquals(true, Files.exists(sqlite));
        try (Connection sqliteConnection = DriverManager.getConnection("jdbc:sqlite:" + sqlite);
             Statement statement = sqliteConnection.createStatement()) {
            try (ResultSet rs = statement.executeQuery("SELECT login_id, active FROM users WHERE id = 1")) {
                rs.next();
                assertEquals("admin", rs.getString("login_id"));
                assertEquals(1, rs.getInt("active"));
            }
            try (ResultSet rs = statement.executeQuery("SELECT title FROM issue WHERE id = 10")) {
                rs.next();
                assertEquals("first issue", rs.getString("title"));
            }
        }
    }

    @Test
    void preservesPrimaryKeysNotNullAndSimpleDefaults() throws Exception {
        Path h2Base = tempDir.resolve("schema-h2");
        Path sqlite = tempDir.resolve("schema.sqlite");

        try (Connection h2 = DriverManager.getConnection("jdbc:h2:" + h2Base, "sa", "");
             Statement statement = h2.createStatement()) {
            statement.execute("""
                CREATE TABLE project_label (
                    project_id BIGINT NOT NULL,
                    label_id BIGINT NOT NULL,
                    active BOOLEAN DEFAULT TRUE NOT NULL,
                    name VARCHAR(255) DEFAULT 'open',
                    PRIMARY KEY (project_id, label_id)
                )
                """);
            statement.execute("INSERT INTO project_label (project_id, label_id) VALUES (1, 2)");
        }

        H2ToSqlite.convert(new H2ToSqlite.Options(
            "jdbc:h2:" + h2Base,
            sqlite,
            "sa",
            "",
            "PUBLIC",
            true,
            false
        ));

        try (Connection sqliteConnection = DriverManager.getConnection("jdbc:sqlite:" + sqlite);
             Statement statement = sqliteConnection.createStatement()) {
            try (ResultSet rs = statement.executeQuery("PRAGMA table_info(project_label)")) {
                assertColumn(rs, "project_id", 1, null, 1);
                assertColumn(rs, "label_id", 1, null, 2);
                assertColumn(rs, "active", 1, "1", 0);
                assertColumn(rs, "name", 0, "'open'", 0);
            }
            try (ResultSet rs = statement.executeQuery("SELECT active, name FROM project_label WHERE project_id = 1 AND label_id = 2")) {
                rs.next();
                assertEquals(1, rs.getInt("active"));
                assertEquals("open", rs.getString("name"));
            }
        }
    }

    @Test
    void emitsSqliteShapeExpectedByCurrentAdoptReleaseGate() throws Exception {
        Path h2Base = tempDir.resolve("adopt-handoff-h2");
        Path sqlite = tempDir.resolve("adopt-handoff.sqlite");

        try (Connection h2 = DriverManager.getConnection("jdbc:h2:" + h2Base + ";MODE=PostgreSQL", "sa", "");
             Statement statement = h2.createStatement()) {
            statement.execute("""
                CREATE TABLE n4user (
                    id BIGINT PRIMARY KEY,
                    login_id VARCHAR(255) NOT NULL,
                    email VARCHAR(255),
                    is_guest BOOLEAN DEFAULT FALSE NOT NULL,
                    created_date BIGINT
                )
                """);
            statement.execute("""
                CREATE TABLE project (
                    id BIGINT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    owner VARCHAR(255) NOT NULL,
                    project_scope VARCHAR(255) DEFAULT 'public' NOT NULL
                )
                """);
            statement.execute("""
                CREATE TABLE issue (
                    id BIGINT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    project_id BIGINT NOT NULL,
                    number BIGINT NOT NULL,
                    is_draft BOOLEAN DEFAULT FALSE NOT NULL
                )
                """);
            statement.execute("""
                CREATE TABLE play_evolutions (
                    id INT PRIMARY KEY,
                    hash VARCHAR(255) NOT NULL,
                    applied_at BIGINT NOT NULL,
                    apply_script CLOB,
                    revert_script CLOB,
                    state VARCHAR(255),
                    last_problem CLOB
                )
                """);
            statement.execute("INSERT INTO n4user (id, login_id, email, is_guest, created_date) VALUES (1, 'admin', 'admin@example.com', FALSE, 1700000000000)");
            statement.execute("INSERT INTO project (id, name, owner, project_scope) VALUES (1, 'projectYobi', 'admin', 'public')");
            statement.execute("INSERT INTO issue (id, title, project_id, number, is_draft) VALUES (1, 'Existing DB adopt issue', 1, 1, FALSE)");
            statement.execute("INSERT INTO play_evolutions (id, hash, applied_at, apply_script, revert_script, state, last_problem) VALUES (32, 'legacy-final-evolution-hash', 1700000050000, '-- legacy apply', '-- legacy revert', 'applied', NULL)");
        }

        H2ToSqlite.convert(new H2ToSqlite.Options(
            "jdbc:h2:" + h2Base + ";MODE=PostgreSQL",
            sqlite,
            "sa",
            "",
            "PUBLIC",
            true,
            false
        ));

        try (Connection sqliteConnection = DriverManager.getConnection("jdbc:sqlite:" + sqlite);
             Statement statement = sqliteConnection.createStatement()) {
            assertEquals(false, tableExists(statement, "seaql_migrations"));
            assertEquals(true, tableExists(statement, "play_evolutions"));

            try (ResultSet rs = statement.executeQuery("PRAGMA table_info(n4user)")) {
                assertColumn(rs, "id", 1, null, 1);
                assertColumn(rs, "login_id", 1, null, 0);
                assertColumn(rs, "email", 0, null, 0);
                assertColumn(rs, "is_guest", 1, "0", 0);
                assertColumn(rs, "created_date", 0, null, 0);
            }
            try (ResultSet rs = statement.executeQuery("PRAGMA table_info(issue)")) {
                assertColumn(rs, "id", 1, null, 1);
                assertColumn(rs, "title", 1, null, 0);
                assertColumn(rs, "project_id", 1, null, 0);
                assertColumn(rs, "number", 1, null, 0);
                assertColumn(rs, "is_draft", 1, "0", 0);
            }
            try (ResultSet rs = statement.executeQuery("SELECT title, is_draft FROM issue WHERE id = 1")) {
                rs.next();
                assertEquals("Existing DB adopt issue", rs.getString("title"));
                assertEquals(0, rs.getInt("is_draft"));
            }
            try (ResultSet rs = statement.executeQuery("SELECT hash FROM play_evolutions WHERE id = 32")) {
                rs.next();
                assertEquals("legacy-final-evolution-hash", rs.getString("hash"));
            }
        }
    }

    private static boolean tableExists(Statement statement, String tableName) throws Exception {
        try (ResultSet rs = statement.executeQuery(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '" + tableName + "'"
        )) {
            return rs.next();
        }
    }

    private static void assertColumn(ResultSet rs, String name, int notNull, String defaultValue, int primaryKey) throws Exception {
        rs.next();
        assertEquals(name, rs.getString("name"));
        assertEquals(notNull, rs.getInt("notnull"));
        assertEquals(defaultValue, rs.getString("dflt_value"));
        assertEquals(primaryKey, rs.getInt("pk"));
    }
}
