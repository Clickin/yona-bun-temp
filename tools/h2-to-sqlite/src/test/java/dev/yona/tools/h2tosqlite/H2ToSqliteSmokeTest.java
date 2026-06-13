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
                assertColumn(rs, "PROJECT_ID", 1, null, 1);
                assertColumn(rs, "LABEL_ID", 1, null, 2);
                assertColumn(rs, "ACTIVE", 1, "1", 0);
                assertColumn(rs, "NAME", 0, "'open'", 0);
            }
            try (ResultSet rs = statement.executeQuery("SELECT active, name FROM project_label WHERE project_id = 1 AND label_id = 2")) {
                rs.next();
                assertEquals(1, rs.getInt("active"));
                assertEquals("open", rs.getString("name"));
            }
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
