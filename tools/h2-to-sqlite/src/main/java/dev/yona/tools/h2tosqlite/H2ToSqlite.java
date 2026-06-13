package dev.yona.tools.h2tosqlite;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.StringJoiner;

public final class H2ToSqlite {
    private static final int BATCH_SIZE = 500;

    private H2ToSqlite() {
    }

    public static void main(String[] args) throws Exception {
        Options options = Options.parse(args);
        if (options.help) {
            printUsage();
            return;
        }

        convert(options);
    }

    static void convert(Options options) throws Exception {
        Class.forName("org.h2.Driver");
        Class.forName("org.sqlite.JDBC");

        if (Files.exists(options.sqlitePath) && !options.overwrite) {
            throw new IllegalArgumentException("SQLite output already exists. Use --overwrite: " + options.sqlitePath);
        }
        if (Files.exists(options.sqlitePath) && options.overwrite) {
            Files.delete(options.sqlitePath);
        }
        Path parent = options.sqlitePath.toAbsolutePath().getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }

        try (Connection h2 = DriverManager.getConnection(options.h2Url, options.user, options.password);
             Connection sqlite = DriverManager.getConnection("jdbc:sqlite:" + options.sqlitePath.toAbsolutePath())) {
            configureSqlite(sqlite);
            h2.setAutoCommit(false);
            sqlite.setAutoCommit(false);

            List<Table> tables = readTables(h2, options.schema);
            for (Table table : tables) {
                createTable(h2, sqlite, table);
                copyRows(h2, sqlite, table);
            }

            sqlite.commit();
            System.out.printf(Locale.ROOT, "Converted %d tables to %s%n", tables.size(), options.sqlitePath);
        } catch (Exception error) {
            throw new RuntimeException("H2 to SQLite conversion failed", error);
        }
    }

    private static void configureSqlite(Connection sqlite) throws SQLException {
        try (Statement statement = sqlite.createStatement()) {
            statement.execute("PRAGMA foreign_keys = OFF");
            statement.execute("PRAGMA journal_mode = WAL");
            statement.execute("PRAGMA synchronous = NORMAL");
        }
    }

    private static List<Table> readTables(Connection h2, String schema) throws SQLException {
        DatabaseMetaData meta = h2.getMetaData();
        List<Table> tables = new ArrayList<>();
        try (ResultSet rs = meta.getTables(null, schema.toUpperCase(Locale.ROOT), "%", new String[]{"TABLE"})) {
            while (rs.next()) {
                String tableName = rs.getString("TABLE_NAME");
                if (!tableName.startsWith("SYS") && !"INFORMATION_SCHEMA".equalsIgnoreCase(rs.getString("TABLE_SCHEM"))) {
                    tables.add(new Table(rs.getString("TABLE_SCHEM"), tableName));
                }
            }
        }
        tables.sort((left, right) -> left.name.compareToIgnoreCase(right.name));
        return tables;
    }

    private static void createTable(Connection h2, Connection sqlite, Table table) throws SQLException {
        List<Column> columns = readColumns(h2, table);
        List<String> primaryKeys = readPrimaryKeys(h2, table);
        if (columns.isEmpty()) {
            System.out.printf(Locale.ROOT, "Skipping table without columns: %s%n", table.name);
            return;
        }

        StringJoiner joiner = new StringJoiner(", ");
        for (Column column : columns) {
            StringBuilder definition = new StringBuilder();
            definition.append(quoteIdentifier(column.name)).append(' ').append(sqliteType(column));
            if (!column.nullable) {
                definition.append(" NOT NULL");
            }
            if (column.defaultValue != null && !column.defaultValue.isBlank()) {
                String defaultValue = normalizeDefault(column.defaultValue);
                if (defaultValue != null) {
                    definition.append(" DEFAULT ").append(defaultValue);
                }
            }
            joiner.add(definition.toString());
        }
        if (!primaryKeys.isEmpty()) {
            StringJoiner pkJoiner = new StringJoiner(", ");
            for (String primaryKey : primaryKeys) {
                pkJoiner.add(quoteIdentifier(primaryKey));
            }
            joiner.add("PRIMARY KEY (" + pkJoiner + ")");
        }

        String sql = "CREATE TABLE " + quoteIdentifier(table.name) + " (" + joiner + ")";
        try (Statement statement = sqlite.createStatement()) {
            statement.execute(sql);
        }
    }

    private static List<Column> readColumns(Connection h2, Table table) throws SQLException {
        DatabaseMetaData meta = h2.getMetaData();
        List<Column> columns = new ArrayList<>();
        try (ResultSet rs = meta.getColumns(null, table.schema, table.name, "%")) {
            while (rs.next()) {
                columns.add(new Column(
                    rs.getString("COLUMN_NAME"),
                    rs.getInt("DATA_TYPE"),
                    rs.getString("TYPE_NAME"),
                    rs.getInt("COLUMN_SIZE"),
                    rs.getInt("DECIMAL_DIGITS"),
                    rs.getInt("NULLABLE") == DatabaseMetaData.columnNullable,
                    rs.getString("COLUMN_DEF"),
                    rs.getInt("ORDINAL_POSITION")
                ));
            }
        }
        columns.sort((left, right) -> Integer.compare(left.position, right.position));
        return columns;
    }

    private static List<String> readPrimaryKeys(Connection h2, Table table) throws SQLException {
        DatabaseMetaData meta = h2.getMetaData();
        List<PrimaryKeyColumn> columns = new ArrayList<>();
        try (ResultSet rs = meta.getPrimaryKeys(null, table.schema, table.name)) {
            while (rs.next()) {
                columns.add(new PrimaryKeyColumn(rs.getString("COLUMN_NAME"), rs.getShort("KEY_SEQ")));
            }
        }
        columns.sort((left, right) -> Short.compare(left.sequence, right.sequence));
        return columns.stream().map(PrimaryKeyColumn::name).toList();
    }

    private static void copyRows(Connection h2, Connection sqlite, Table table) throws SQLException {
        String selectSql = "SELECT * FROM " + h2QualifiedName(table);
        try (Statement select = h2.createStatement(ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY);
             ResultSet rows = select.executeQuery(selectSql)) {
            ResultSetMetaData meta = rows.getMetaData();
            int columnCount = meta.getColumnCount();
            String insertSql = insertSql(table.name, meta, columnCount);
            int rowCount = 0;
            try (PreparedStatement insert = sqlite.prepareStatement(insertSql)) {
                while (rows.next()) {
                    for (int index = 1; index <= columnCount; index++) {
                        bindValue(insert, index, rows.getObject(index), meta.getColumnType(index));
                    }
                    insert.addBatch();
                    rowCount++;
                    if (rowCount % BATCH_SIZE == 0) {
                        insert.executeBatch();
                    }
                }
                insert.executeBatch();
            }
            System.out.printf(Locale.ROOT, "Copied %d rows from %s%n", rowCount, table.name);
        }
    }

    private static String insertSql(String tableName, ResultSetMetaData meta, int columnCount) throws SQLException {
        StringJoiner columns = new StringJoiner(", ");
        StringJoiner placeholders = new StringJoiner(", ");
        for (int index = 1; index <= columnCount; index++) {
            columns.add(quoteIdentifier(meta.getColumnName(index)));
            placeholders.add("?");
        }
        return "INSERT INTO " + quoteIdentifier(tableName) + " (" + columns + ") VALUES (" + placeholders + ")";
    }

    private static void bindValue(PreparedStatement statement, int index, Object value, int jdbcType) throws SQLException {
        if (value == null) {
            statement.setObject(index, null);
            return;
        }

        switch (jdbcType) {
            case Types.BINARY, Types.VARBINARY, Types.LONGVARBINARY, Types.BLOB -> statement.setBytes(index, (byte[]) value);
            case Types.BOOLEAN, Types.BIT -> statement.setInt(index, Boolean.TRUE.equals(value) ? 1 : 0);
            case Types.DATE, Types.TIME, Types.TIME_WITH_TIMEZONE, Types.TIMESTAMP, Types.TIMESTAMP_WITH_TIMEZONE ->
                statement.setString(index, value.toString());
            case Types.NUMERIC, Types.DECIMAL -> statement.setBigDecimal(index, asBigDecimal(value));
            default -> statement.setObject(index, value);
        }
    }

    private static BigDecimal asBigDecimal(Object value) {
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        return new BigDecimal(value.toString());
    }

    private static String sqliteType(Column column) {
        return switch (column.jdbcType) {
            case Types.BIGINT, Types.INTEGER, Types.SMALLINT, Types.TINYINT, Types.BOOLEAN, Types.BIT -> "INTEGER";
            case Types.FLOAT, Types.REAL, Types.DOUBLE -> "REAL";
            case Types.NUMERIC, Types.DECIMAL -> column.scale == 0 ? "INTEGER" : "REAL";
            case Types.BINARY, Types.VARBINARY, Types.LONGVARBINARY, Types.BLOB -> "BLOB";
            default -> "TEXT";
        };
    }

    private static String normalizeDefault(String value) {
        String trimmed = value.trim();
        String upper = trimmed.toUpperCase(Locale.ROOT);
        if (upper.startsWith("NEXT VALUE FOR")) {
            return null;
        }
        if ("TRUE".equals(upper)) {
            return "1";
        }
        if ("FALSE".equals(upper)) {
            return "0";
        }
        if (upper.startsWith("CURRENT_TIMESTAMP") || upper.startsWith("CURRENT_DATE") || upper.startsWith("CURRENT_TIME")) {
            return upper;
        }
        return trimmed;
    }

    private static String h2QualifiedName(Table table) {
        return quoteIdentifier(table.schema) + "." + quoteIdentifier(table.name);
    }

    private static String quoteIdentifier(String identifier) {
        Objects.requireNonNull(identifier, "identifier");
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    private static void printUsage() {
        System.out.println("""
            Usage:
              java -jar target/h2-to-sqlite-0.1.0.jar --h2-url <jdbc:h2:...> --sqlite <output.db> [options]

            Options:
              --h2-url <url>      Source H2 JDBC URL. Example: jdbc:h2:/path/to/yona;AUTO_SERVER=FALSE
              --sqlite <path>     Output SQLite database path.
              --user <user>       H2 user. Defaults to sa.
              --password <value>  H2 password. Defaults to empty.
              --schema <name>     H2 schema. Defaults to PUBLIC.
              --overwrite         Delete existing SQLite output before conversion.
              --help              Show this help.
            """);
    }

    static final class Options {
        final String h2Url;
        final Path sqlitePath;
        final String user;
        final String password;
        final String schema;
        final boolean overwrite;
        final boolean help;

        Options(String h2Url, Path sqlitePath, String user, String password, String schema, boolean overwrite, boolean help) {
            this.h2Url = h2Url;
            this.sqlitePath = sqlitePath;
            this.user = user;
            this.password = password;
            this.schema = schema;
            this.overwrite = overwrite;
            this.help = help;
        }

        static Options parse(String[] args) {
            String h2Url = null;
            Path sqlitePath = null;
            String user = "sa";
            String password = "";
            String schema = "PUBLIC";
            boolean overwrite = false;
            boolean help = false;

            for (int index = 0; index < args.length; index++) {
                String arg = args[index];
                switch (arg) {
                    case "--h2-url" -> h2Url = requireValue(args, ++index, arg);
                    case "--sqlite" -> sqlitePath = Path.of(requireValue(args, ++index, arg));
                    case "--user" -> user = requireValue(args, ++index, arg);
                    case "--password" -> password = requireValue(args, ++index, arg);
                    case "--schema" -> schema = requireValue(args, ++index, arg);
                    case "--overwrite" -> overwrite = true;
                    case "--help", "-h" -> help = true;
                    default -> throw new IllegalArgumentException("Unknown argument: " + arg);
                }
            }

            if (!help && (h2Url == null || sqlitePath == null)) {
                throw new IllegalArgumentException("--h2-url and --sqlite are required. Use --help for usage.");
            }
            return new Options(h2Url, sqlitePath, user, password, schema, overwrite, help);
        }

        private static String requireValue(String[] args, int index, String arg) {
            if (index >= args.length || args[index].startsWith("--")) {
                throw new IllegalArgumentException("Missing value for " + arg);
            }
            return args[index];
        }
    }

    private record Table(String schema, String name) {
    }

    private record Column(
        String name,
        int jdbcType,
        String h2Type,
        int size,
        int scale,
        boolean nullable,
        String defaultValue,
        int position
    ) {
    }

    private record PrimaryKeyColumn(String name, short sequence) {
    }
}
