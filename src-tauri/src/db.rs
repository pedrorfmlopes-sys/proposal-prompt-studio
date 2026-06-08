use std::fs;
use std::path::PathBuf;

use rusqlite::{Connection, Result};
use tauri::{AppHandle, Manager};

const SCHEMA_SQL: &str = include_str!("../../database/schema.sql");
const SEED_SQL: &str = include_str!("../../database/seed.sql");

pub fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {error}"))?;
    fs::create_dir_all(&dir)
        .map_err(|error| format!("Could not create app data directory: {error}"))?;
    Ok(dir.join("app.sqlite"))
}

pub fn open_initialized(app: &AppHandle) -> Result<Connection, String> {
    let path = database_path(app)?;
    let should_seed = !path.exists();
    let conn = Connection::open(path).map_err(|error| error.to_string())?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|error| error.to_string())?;

    if should_seed {
        conn.execute_batch(SCHEMA_SQL)
            .map_err(|error| format!("Schema failed: {error}"))?;
        conn.execute_batch(SEED_SQL)
            .map_err(|error| format!("Seed failed: {error}"))?;
    }

    Ok(conn)
}

pub fn count_rows(conn: &Connection, table: &str) -> Result<i64> {
    conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| row.get(0))
}
