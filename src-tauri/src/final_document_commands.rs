use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::{params, OptionalExtension, Result};
use tauri::AppHandle;

use crate::db;
use crate::models::FinalDocument;

#[tauri::command]
pub fn register_final_document(
    app: AppHandle,
    proposal_id: i64,
    source_file_path: String,
    version_label: Option<String>,
) -> Result<FinalDocument, String> {
    if proposal_id <= 0 {
        return Err("proposal_id must be greater than zero".to_string());
    }
    if source_file_path.trim().is_empty() {
        return Err("Indica o caminho do ficheiro final.".to_string());
    }

    let source_path = PathBuf::from(source_file_path.trim());
    if !source_path.exists() {
        return Err("O ficheiro indicado nao existe.".to_string());
    }
    if !source_path.is_file() {
        return Err("O caminho indicado nao e um ficheiro.".to_string());
    }

    let file_name = source_path
        .file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Nome de ficheiro invalido.".to_string())?;
    let file_type = source_path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_lowercase())
        .filter(|value| is_allowed_file_type(value))
        .ok_or_else(|| "Tipo de ficheiro nao suportado.".to_string())?;

    let conn = db::open_initialized(&app)?;
    let proposal_folder = query_proposal_folder(&conn, proposal_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Proposal not found".to_string())?
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "A proposta nao tem pasta local definida.".to_string())?;

    let final_documents_dir = PathBuf::from(proposal_folder).join("final-documents");
    fs::create_dir_all(&final_documents_dir).map_err(|error| error.to_string())?;
    let destination_path = next_available_path(&final_documents_dir, file_name)?;
    fs::copy(&source_path, &destination_path).map_err(|error| error.to_string())?;

    let destination_file_name = destination_path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Nome de destino invalido.".to_string())?
        .to_string();
    let local_path = destination_path.to_string_lossy().to_string();
    let cleaned_version_label = version_label.and_then(|value| {
        let trimmed = value.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });

    conn.execute(
        "INSERT INTO final_documents (
            proposal_id, file_name, file_type, local_path, onedrive_path,
            version_label, notes
         )
         VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6)",
        params![
            proposal_id,
            destination_file_name,
            file_type,
            local_path,
            cleaned_version_label,
            "Registered manually in Proposal Prompt Studio.",
        ],
    )
    .map_err(|error| error.to_string())?;

    let id = conn.last_insert_rowid();
    query_final_document_by_id(&conn, id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_final_documents(app: AppHandle, proposal_id: i64) -> Result<Vec<FinalDocument>, String> {
    if proposal_id <= 0 {
        return Err("proposal_id must be greater than zero".to_string());
    }
    let conn = db::open_initialized(&app)?;
    query_final_documents(&conn, proposal_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_latest_final_document(
    app: AppHandle,
    proposal_id: i64,
) -> Result<Option<FinalDocument>, String> {
    if proposal_id <= 0 {
        return Err("proposal_id must be greater than zero".to_string());
    }
    let conn = db::open_initialized(&app)?;
    conn.query_row(
        "SELECT id, proposal_id, file_name, file_type, local_path, onedrive_path,
                version_label, uploaded_at, notes
         FROM final_documents
         WHERE proposal_id = ?1
         ORDER BY uploaded_at DESC, id DESC
         LIMIT 1",
        params![proposal_id],
        map_final_document,
    )
    .optional()
    .map_err(|error| error.to_string())
}

fn query_proposal_folder(
    conn: &rusqlite::Connection,
    proposal_id: i64,
) -> Result<Option<Option<String>>> {
    conn.query_row(
        "SELECT local_folder_path FROM proposals WHERE id = ?1",
        params![proposal_id],
        |row| row.get(0),
    )
    .optional()
}

fn query_final_documents(
    conn: &rusqlite::Connection,
    proposal_id: i64,
) -> Result<Vec<FinalDocument>> {
    let mut stmt = conn.prepare(
        "SELECT id, proposal_id, file_name, file_type, local_path, onedrive_path,
                version_label, uploaded_at, notes
         FROM final_documents
         WHERE proposal_id = ?1
         ORDER BY uploaded_at DESC, id DESC",
    )?;
    let rows = stmt.query_map(params![proposal_id], map_final_document)?;
    let result = rows.collect::<Result<Vec<_>>>()?;
    Ok(result)
}

fn query_final_document_by_id(conn: &rusqlite::Connection, id: i64) -> Result<FinalDocument> {
    conn.query_row(
        "SELECT id, proposal_id, file_name, file_type, local_path, onedrive_path,
                version_label, uploaded_at, notes
         FROM final_documents
         WHERE id = ?1",
        params![id],
        map_final_document,
    )
}

fn map_final_document(row: &rusqlite::Row<'_>) -> Result<FinalDocument> {
    Ok(FinalDocument {
        id: row.get(0)?,
        proposal_id: row.get(1)?,
        file_name: row.get(2)?,
        file_type: row.get(3)?,
        local_path: row.get(4)?,
        onedrive_path: row.get(5)?,
        version_label: row.get(6)?,
        uploaded_at: row.get(7)?,
        notes: row.get(8)?,
    })
}

fn next_available_path(directory: &Path, file_name: &str) -> Result<PathBuf, String> {
    let candidate = directory.join(file_name);
    if !candidate.exists() {
        return Ok(candidate);
    }

    let source = Path::new(file_name);
    let stem = source
        .file_stem()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Nome de ficheiro invalido.".to_string())?;
    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Tipo de ficheiro nao suportado.".to_string())?;

    for index in 2..=999 {
        let next_name = format!("{stem}_{index}.{extension}");
        let next_candidate = directory.join(next_name);
        if !next_candidate.exists() {
            return Ok(next_candidate);
        }
    }

    Err("Nao foi possivel criar um nome de ficheiro unico.".to_string())
}

fn is_allowed_file_type(file_type: &str) -> bool {
    matches!(
        file_type,
        "pdf" | "docx" | "xlsx" | "md" | "txt" | "pptx" | "png" | "jpg" | "jpeg" | "webp"
    )
}
