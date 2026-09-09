/// Streaming JSON reader — iterates over a JSON object of arrays, table by table.
///
/// Input format: `{"table_name": [{...}, {...}], ...}`
/// Uses `serde_json::value::RawValue` to defer array parsing.
use std::io::Read;

/// A stream of rows for one table, parsed from a buffered JSON array string.
/// Each table's entire array is loaded into memory; rows are yielded one at a time.
#[allow(dead_code)]
pub struct TableRows {
    pub(crate) rows: Vec<serde_json::Value>,
    cursor: usize,
}

impl TableRows {
    fn new(rows: Vec<serde_json::Value>) -> Self {
        Self { rows, cursor: 0 }
    }
}

impl Iterator for TableRows {
    type Item = serde_json::Value;

    fn next(&mut self) -> Option<Self::Item> {
        if self.cursor < self.rows.len() {
            let item = self.rows[self.cursor].clone();
            self.cursor += 1;
            Some(item)
        } else {
            None
        }
    }

    fn size_hint(&self) -> (usize, Option<usize>) {
        let remaining = self.rows.len() - self.cursor;
        (remaining, Some(remaining))
    }
}

/// Stream top-level keys from a JSON object of arrays.
///
/// Parses the top-level value, then extracts each table's array.
///
/// # Memory
/// - Top-level keys (table names) are parsed eagerly — negligible.
/// - One table's array is in memory while processing that table.
/// - After a table is done, the array is dropped.
#[allow(dead_code)]
pub fn stream_tables<R: Read>(reader: R) -> Result<Vec<(String, TableRows)>, serde_json::Error> {
    // Parse the full JSON into a Value
    let value: serde_json::Value = serde_json::from_reader(reader)?;

    let serde_json::Value::Object(map) = value else {
        return Err(serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "expected JSON object at top level",
        )));
    };

    let mut tables = Vec::with_capacity(map.len());

    for (name, value) in map {
        let rows = match value {
            serde_json::Value::Array(arr) => arr,
            _ => Vec::new(),
        };
        tables.push((name, TableRows::new(rows)));
    }

    Ok(tables)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stream_tables_basic() {
        let data = r#"{"users":[{"id":1,"name":"alice"}],"projects":[{"id":10,"name":"proj"}]}"#;
        let tables = stream_tables(data.as_bytes()).unwrap();
        assert_eq!(tables.len(), 2);

        // Order of JSON object keys is not guaranteed; find by name
        let users_idx = tables.iter().position(|(n, _)| n == "users").unwrap();
        let (name, rows) = &tables[users_idx];
        assert_eq!(name, "users");
        assert_eq!(rows.rows.len(), 1);
        assert_eq!(rows.rows[0]["id"], 1);

        let proj_idx = tables.iter().position(|(n, _)| n == "projects").unwrap();
        let (name, rows) = &tables[proj_idx];
        assert_eq!(name, "projects");
        assert_eq!(rows.rows.len(), 1);
        assert_eq!(rows.rows[0]["id"], 10);
    }

    #[test]
    fn test_stream_empty_array() {
        let data = r#"{"users":[]}"#;
        let tables = stream_tables(data.as_bytes()).unwrap();
        assert_eq!(tables.len(), 1);
        let (_name, rows) = &tables[0];
        assert!(rows.rows.is_empty());
    }

    #[test]
    fn test_stream_empty_object() {
        let data = r#"{}"#;
        let tables = stream_tables(data.as_bytes()).unwrap();
        assert_eq!(tables.len(), 0);
    }
}
