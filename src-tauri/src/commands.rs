use rusqlite::{params, Connection, OptionalExtension, Result};
use tauri::AppHandle;

use crate::db;
use crate::folder_service;
use crate::models::{
    AppSetting, Brand, DashboardSummary, Layout, PricingRule, ProposalFolderRequest,
};

#[tauri::command]
pub fn initialize_database(app: AppHandle) -> Result<DashboardSummary, String> {
    let conn = db::open_initialized(&app)?;
    Ok(DashboardSummary {
        database_initialized: true,
        settings_count: db::count_rows(&conn, "app_settings").map_err(|error| error.to_string())?,
        brands_count: db::count_rows(&conn, "brands").map_err(|error| error.to_string())?,
        layouts_count: db::count_rows(&conn, "layouts").map_err(|error| error.to_string())?,
        pricing_rules_count: db::count_rows(&conn, "pricing_rules")
            .map_err(|error| error.to_string())?,
    })
}

#[tauri::command]
pub fn get_all_settings(app: AppHandle) -> Result<Vec<AppSetting>, String> {
    let conn = db::open_initialized(&app)?;
    query_settings(&conn).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_setting(app: AppHandle, key: String) -> Result<Option<AppSetting>, String> {
    let conn = db::open_initialized(&app)?;
    query_setting(&conn, &key).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_active_brands(app: AppHandle) -> Result<Vec<Brand>, String> {
    let conn = db::open_initialized(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, display_name, supplier_name, website_url, notes,
                    is_active, created_at, updated_at
             FROM brands
             WHERE is_active = 1
             ORDER BY name",
        )
        .map_err(|error| error.to_string())?;
    stmt.query_map([], map_brand)
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_active_layouts(app: AppHandle) -> Result<Vec<Layout>, String> {
    let conn = db::open_initialized(&app)?;
    query_layouts(&conn, "WHERE is_active = 1 ORDER BY is_default DESC, name")
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_default_layout(app: AppHandle) -> Result<Option<Layout>, String> {
    let conn = db::open_initialized(&app)?;
    let sql = layout_select_sql("WHERE is_active = 1 AND is_default = 1 LIMIT 1");
    conn.query_row(&sql, [], map_layout)
        .optional()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_active_pricing_rules(app: AppHandle) -> Result<Vec<PricingRule>, String> {
    let conn = db::open_initialized(&app)?;
    query_pricing_rules(&conn, "WHERE is_active = 1 ORDER BY name")
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_pricing_rule_by_code(
    app: AppHandle,
    code: String,
) -> Result<Option<PricingRule>, String> {
    let conn = db::open_initialized(&app)?;
    let sql = pricing_rule_select_sql("WHERE code = ?1 LIMIT 1");
    conn.query_row(&sql, params![code], map_pricing_rule)
        .optional()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn create_proposal_folder_structure(
    input: ProposalFolderRequest,
) -> Result<Vec<String>, String> {
    folder_service::create_proposal_folder_structure(input)
}

fn query_settings(conn: &Connection) -> Result<Vec<AppSetting>> {
    let mut stmt = conn.prepare(
        "SELECT id, key, value, description, created_at, updated_at
         FROM app_settings
         ORDER BY key",
    )?;
    stmt.query_map([], map_setting)?.collect()
}

fn query_setting(conn: &Connection, key: &str) -> Result<Option<AppSetting>> {
    conn.query_row(
        "SELECT id, key, value, description, created_at, updated_at
         FROM app_settings
         WHERE key = ?1
         LIMIT 1",
        params![key],
        map_setting,
    )
    .optional()
}

fn query_layouts(conn: &Connection, where_clause: &str) -> Result<Vec<Layout>> {
    let sql = layout_select_sql(where_clause);
    let mut stmt = conn.prepare(&sql)?;
    stmt.query_map([], map_layout)?.collect()
}

fn query_pricing_rules(conn: &Connection, where_clause: &str) -> Result<Vec<PricingRule>> {
    let sql = pricing_rule_select_sql(where_clause);
    let mut stmt = conn.prepare(&sql)?;
    stmt.query_map([], map_pricing_rule)?.collect()
}

fn layout_select_sql(where_clause: &str) -> String {
    format!(
        "SELECT id, name, code, description, proposal_type, structure_json,
                prompt_instructions, example_text, is_default, is_active,
                created_at, updated_at
         FROM layouts {where_clause}"
    )
}

fn pricing_rule_select_sql(where_clause: &str) -> String {
    format!(
        "SELECT id, name, code, type, factor, rounding_mode, description,
                example_input, example_output, formula_text, is_active,
                created_at, updated_at
         FROM pricing_rules {where_clause}"
    )
}

fn map_setting(row: &rusqlite::Row<'_>) -> Result<AppSetting> {
    Ok(AppSetting {
        id: row.get(0)?,
        key: row.get(1)?,
        value: row.get(2)?,
        description: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn map_brand(row: &rusqlite::Row<'_>) -> Result<Brand> {
    Ok(Brand {
        id: row.get(0)?,
        name: row.get(1)?,
        display_name: row.get(2)?,
        supplier_name: row.get(3)?,
        website_url: row.get(4)?,
        notes: row.get(5)?,
        is_active: row.get::<_, i64>(6)? == 1,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn map_layout(row: &rusqlite::Row<'_>) -> Result<Layout> {
    Ok(Layout {
        id: row.get(0)?,
        name: row.get(1)?,
        code: row.get(2)?,
        description: row.get(3)?,
        proposal_type: row.get(4)?,
        structure_json: row.get(5)?,
        prompt_instructions: row.get(6)?,
        example_text: row.get(7)?,
        is_default: row.get::<_, i64>(8)? == 1,
        is_active: row.get::<_, i64>(9)? == 1,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

fn map_pricing_rule(row: &rusqlite::Row<'_>) -> Result<PricingRule> {
    Ok(PricingRule {
        id: row.get(0)?,
        name: row.get(1)?,
        code: row.get(2)?,
        rule_type: row.get(3)?,
        factor: row.get(4)?,
        rounding_mode: row.get(5)?,
        description: row.get(6)?,
        example_input: row.get(7)?,
        example_output: row.get(8)?,
        formula_text: row.get(9)?,
        is_active: row.get::<_, i64>(10)? == 1,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}
