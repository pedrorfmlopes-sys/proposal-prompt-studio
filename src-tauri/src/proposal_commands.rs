use rusqlite::{params, Connection, OptionalExtension, Result};
use tauri::AppHandle;

use crate::db;
use crate::folder_service;
use crate::models::{
    CreateProposalInput, CreateProposalItemInput, ProposalDetail, ProposalFolderRequest,
    ProposalItem, ProposalSummary,
};

#[tauri::command]
pub fn create_proposal(app: AppHandle, input: CreateProposalInput) -> Result<ProposalDetail, String> {
    validate_proposal_input(&input)?;
    let mut conn = db::open_initialized(&app)?;
    let tx = conn.transaction().map_err(|error| error.to_string())?;
    let proposal_number = match input.proposal_number.clone() {
        Some(value) if !value.trim().is_empty() => value,
        _ => next_proposal_number(&tx).map_err(|error| error.to_string())?,
    };
    let year = input.proposal_date.chars().take(4).collect::<String>();
    let folder_request = ProposalFolderRequest {
        base_path: input.local_workspace_path.clone(),
        year,
        proposal_number: proposal_number.clone(),
        client_name: input.client_name_snapshot.clone(),
        project_name: input.project_name.clone(),
    };
    let local_folder_path = folder_service::build_proposal_folder_path(&folder_request)
        .to_string_lossy()
        .to_string();
    folder_service::create_proposal_folder_structure(folder_request)?;

    tx.execute(
        "INSERT INTO proposals (
            proposal_number, title, client_name_snapshot, project_name,
            project_location, proposal_date, language, currency, vat_mode,
            validity_text, commercial_conditions, proposal_type, layout_id,
            pricing_rule_id, status, local_folder_path, total_amount, notes
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
                 'draft', ?15, ?16, ?17)",
        params![
            proposal_number,
            input.title,
            input.client_name_snapshot,
            input.project_name,
            input.project_location,
            input.proposal_date,
            input.language,
            input.currency,
            input.vat_mode,
            input.validity_text,
            input.commercial_conditions,
            input.proposal_type,
            input.layout_id,
            input.pricing_rule_id,
            local_folder_path,
            input.total_amount,
            input.notes,
        ],
    )
    .map_err(|error| error.to_string())?;

    let proposal_id = tx.last_insert_rowid();
    for item in &input.items {
        insert_proposal_item(&tx, proposal_id, item).map_err(|error| error.to_string())?;
    }
    increment_next_number(&tx).map_err(|error| error.to_string())?;
    tx.commit().map_err(|error| error.to_string())?;

    get_proposal_by_id(app, proposal_id)?.ok_or_else(|| "Created proposal not found".to_string())
}

#[tauri::command]
pub fn get_proposals(app: AppHandle) -> Result<Vec<ProposalSummary>, String> {
    let conn = db::open_initialized(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, proposal_number, title, client_name_snapshot, project_name,
                    proposal_date, status, total_amount
             FROM proposals
             ORDER BY proposal_date DESC, id DESC",
        )
        .map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map([], map_proposal_summary)
        .map_err(|error| error.to_string())?;
    let result = rows
        .collect::<Result<Vec<_>>>()
        .map_err(|error| error.to_string())?;
    Ok(result)
}

#[tauri::command]
pub fn get_proposal_by_id(app: AppHandle, id: i64) -> Result<Option<ProposalDetail>, String> {
    let conn = db::open_initialized(&app)?;
    let mut detail = conn
        .query_row(
            "SELECT p.id, p.proposal_number, p.title, p.client_name_snapshot,
                    p.project_name, p.project_location, p.proposal_date, p.status,
                    p.total_amount, p.language, p.currency, p.vat_mode,
                    p.validity_text, p.commercial_conditions, p.proposal_type,
                    p.layout_id, l.name, p.pricing_rule_id, r.name,
                    r.code, r.factor, r.rounding_mode, p.local_folder_path,
                    p.notes
             FROM proposals p
             LEFT JOIN layouts l ON l.id = p.layout_id
             LEFT JOIN pricing_rules r ON r.id = p.pricing_rule_id
             WHERE p.id = ?1",
            params![id],
            map_proposal_detail,
        )
        .optional()
        .map_err(|error| error.to_string())?;

    if let Some(proposal) = detail.as_mut() {
        proposal.items = query_proposal_items(&conn, id).map_err(|error| error.to_string())?;
    }
    Ok(detail)
}

#[tauri::command]
pub fn add_proposal_item(
    app: AppHandle,
    proposal_id: i64,
    input: CreateProposalItemInput,
) -> Result<ProposalItem, String> {
    validate_item_input(&input)?;
    let conn = db::open_initialized(&app)?;
    insert_proposal_item(&conn, proposal_id, &input).map_err(|error| error.to_string())?;
    update_total_from_items(&conn, proposal_id).map_err(|error| error.to_string())?;
    let item_id = conn.last_insert_rowid();
    query_proposal_item(&conn, item_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_proposal_items(app: AppHandle, proposal_id: i64) -> Result<Vec<ProposalItem>, String> {
    let conn = db::open_initialized(&app)?;
    query_proposal_items(&conn, proposal_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_proposal_total(app: AppHandle, proposal_id: i64) -> Result<f64, String> {
    let conn = db::open_initialized(&app)?;
    update_total_from_items(&conn, proposal_id).map_err(|error| error.to_string())
}

fn next_proposal_number(conn: &Connection) -> Result<String> {
    let prefix = setting(conn, "proposal_series_prefix")?.unwrap_or_else(|| "PROP".to_string());
    let year = setting(conn, "proposal_series_year")?.unwrap_or_else(|| "2026".to_string());
    let next = setting(conn, "proposal_next_number")?
        .unwrap_or_else(|| "1".to_string())
        .parse::<i64>()
        .unwrap_or(1);
    Ok(format!("{prefix}-{year}-{next:03}"))
}

fn increment_next_number(conn: &Connection) -> Result<()> {
    conn.execute(
        "UPDATE app_settings
         SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)
         WHERE key = 'proposal_next_number'",
        [],
    )?;
    Ok(())
}

fn setting(conn: &Connection, key: &str) -> Result<Option<String>> {
    conn.query_row(
        "SELECT value FROM app_settings WHERE key = ?1 LIMIT 1",
        params![key],
        |row| row.get(0),
    )
    .optional()
}

fn insert_proposal_item(
    conn: &Connection,
    proposal_id: i64,
    item: &CreateProposalItemInput,
) -> Result<()> {
    conn.execute(
        "INSERT INTO proposal_items (
            proposal_id, brand_id, brand_name_snapshot, option_group, reference,
            description, finish, quantity, original_unit_price, calculation_rule_id,
            calculation_factor, final_unit_price, line_total, technical_sheet_url,
            drawing_2d_url, model_3d_url, image_path, notes, sort_order
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
                 ?15, ?16, ?17, ?18, ?19)",
        params![
            proposal_id,
            item.brand_id,
            item.brand_name_snapshot,
            item.option_group,
            item.reference,
            item.description,
            item.finish,
            item.quantity,
            item.original_unit_price,
            item.calculation_rule_id,
            item.calculation_factor,
            item.final_unit_price,
            item.line_total,
            item.technical_sheet_url,
            item.drawing2d_url,
            item.model3d_url,
            item.image_path,
            item.notes,
            item.sort_order,
        ],
    )?;
    Ok(())
}

fn query_proposal_items(conn: &Connection, proposal_id: i64) -> Result<Vec<ProposalItem>> {
    let mut stmt = conn.prepare(
        "SELECT id, proposal_id, brand_id, brand_name_snapshot, option_group,
                reference, description, finish, quantity, original_unit_price,
                calculation_rule_id, calculation_factor, final_unit_price,
                line_total, notes, sort_order
         FROM proposal_items
         WHERE proposal_id = ?1
         ORDER BY sort_order, id",
    )?;
    let rows = stmt.query_map(params![proposal_id], map_proposal_item)?;
    let result = rows.collect::<Result<Vec<_>>>()?;
    Ok(result)
}

fn query_proposal_item(conn: &Connection, item_id: i64) -> Result<ProposalItem> {
    conn.query_row(
        "SELECT id, proposal_id, brand_id, brand_name_snapshot, option_group,
                reference, description, finish, quantity, original_unit_price,
                calculation_rule_id, calculation_factor, final_unit_price,
                line_total, notes, sort_order
         FROM proposal_items
         WHERE id = ?1",
        params![item_id],
        map_proposal_item,
    )
}

fn update_total_from_items(conn: &Connection, proposal_id: i64) -> Result<f64> {
    let total = conn.query_row(
        "SELECT COALESCE(ROUND(SUM(line_total), 2), 0) FROM proposal_items WHERE proposal_id = ?1",
        params![proposal_id],
        |row| row.get::<_, f64>(0),
    )?;
    conn.execute(
        "UPDATE proposals SET total_amount = ?1 WHERE id = ?2",
        params![total, proposal_id],
    )?;
    Ok(total)
}

fn validate_proposal_input(input: &CreateProposalInput) -> Result<(), String> {
    if input.title.trim().is_empty() {
        return Err("Proposal title is required".to_string());
    }
    if input.client_name_snapshot.trim().is_empty() {
        return Err("Client name is required".to_string());
    }
    if input.project_name.trim().is_empty() {
        return Err("Project name is required".to_string());
    }
    if input.proposal_date.trim().is_empty() {
        return Err("Proposal date is required".to_string());
    }
    if input.language.trim().is_empty() {
        return Err("Language is required".to_string());
    }
    if input.currency.trim().is_empty() {
        return Err("Currency is required".to_string());
    }
    if input.vat_mode.trim().is_empty() {
        return Err("VAT mode is required".to_string());
    }
    if input.local_workspace_path.trim().is_empty() {
        return Err("Local workspace path is required".to_string());
    }
    if input.items.is_empty() {
        return Err("At least one proposal item is required".to_string());
    }
    if input.total_amount < 0.0 {
        return Err("Proposal total cannot be negative".to_string());
    }
    for item in &input.items {
        validate_item_input(item)?;
    }
    let subtotal = input.items.iter().map(|item| item.line_total).sum::<f64>();
    if (subtotal - input.total_amount).abs() > 0.01 {
        return Err("Proposal total must match item subtotal".to_string());
    }
    Ok(())
}

fn validate_item_input(item: &CreateProposalItemInput) -> Result<(), String> {
    if item.reference.trim().is_empty() {
        return Err("Item reference is required".to_string());
    }
    if item.quantity <= 0.0 {
        return Err("Item quantity must be greater than zero".to_string());
    }
    if item.original_unit_price < 0.0 {
        return Err("Original unit price cannot be negative".to_string());
    }
    if item.final_unit_price < 0.0 {
        return Err("Final unit price cannot be negative".to_string());
    }
    if item.line_total < 0.0 {
        return Err("Line total cannot be negative".to_string());
    }
    let expected = (item.final_unit_price * item.quantity * 100.0).round() / 100.0;
    if (expected - item.line_total).abs() > 0.01 {
        return Err("Line total must match final unit price times quantity".to_string());
    }
    Ok(())
}

fn map_proposal_summary(row: &rusqlite::Row<'_>) -> Result<ProposalSummary> {
    Ok(ProposalSummary {
        id: row.get(0)?,
        proposal_number: row.get(1)?,
        title: row.get(2)?,
        client_name_snapshot: row.get(3)?,
        project_name: row.get(4)?,
        proposal_date: row.get(5)?,
        status: row.get(6)?,
        total_amount: row.get(7)?,
    })
}

fn map_proposal_detail(row: &rusqlite::Row<'_>) -> Result<ProposalDetail> {
    Ok(ProposalDetail {
        id: row.get(0)?,
        proposal_number: row.get(1)?,
        title: row.get(2)?,
        client_name_snapshot: row.get(3)?,
        project_name: row.get(4)?,
        project_location: row.get(5)?,
        proposal_date: row.get(6)?,
        status: row.get(7)?,
        total_amount: row.get(8)?,
        language: row.get(9)?,
        currency: row.get(10)?,
        vat_mode: row.get(11)?,
        validity_text: row.get(12)?,
        commercial_conditions: row.get(13)?,
        proposal_type: row.get(14)?,
        layout_id: row.get(15)?,
        layout_name: row.get(16)?,
        pricing_rule_id: row.get(17)?,
        pricing_rule_name: row.get(18)?,
        pricing_rule_code: row.get(19)?,
        pricing_rule_factor: row.get(20)?,
        pricing_rule_rounding_mode: row.get(21)?,
        local_folder_path: row.get(22)?,
        notes: row.get(23)?,
        items: vec![],
    })
}

fn map_proposal_item(row: &rusqlite::Row<'_>) -> Result<ProposalItem> {
    Ok(ProposalItem {
        id: row.get(0)?,
        proposal_id: row.get(1)?,
        brand_id: row.get(2)?,
        brand_name_snapshot: row.get(3)?,
        option_group: row.get(4)?,
        reference: row.get(5)?,
        description: row.get(6)?,
        finish: row.get(7)?,
        quantity: row.get(8)?,
        original_unit_price: row.get(9)?,
        calculation_rule_id: row.get(10)?,
        calculation_factor: row.get(11)?,
        final_unit_price: row.get(12)?,
        line_total: row.get(13)?,
        notes: row.get(14)?,
        sort_order: row.get(15)?,
    })
}
