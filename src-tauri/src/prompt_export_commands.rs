use std::fs;
use std::path::PathBuf;

use rusqlite::{params, OptionalExtension, Result};
use serde::Serialize;
use tauri::AppHandle;

use crate::db;
use crate::models::PromptRun;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptExportResult {
    pub prompt_run_id: i64,
    pub proposal_id: i64,
    pub format: String,
    pub file_name: String,
    pub exported_path: String,
}

#[tauri::command]
pub fn export_prompt_run(
    app: AppHandle,
    prompt_run_id: i64,
    format: String,
) -> Result<PromptExportResult, String> {
    if prompt_run_id <= 0 {
        return Err("prompt_run_id must be greater than zero".to_string());
    }
    validate_format(&format)?;

    let conn = db::open_initialized(&app)?;
    let prompt_run = query_prompt_run(&conn, prompt_run_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Prompt run not found".to_string())?;
    if prompt_run.prompt_text.trim().is_empty() {
        return Err("Prompt text cannot be empty".to_string());
    }

    let proposal = query_prompt_proposal(&conn, prompt_run.proposal_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Proposal not found".to_string())?;
    let local_folder_path = proposal
        .local_folder_path
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Proposal local_folder_path is required".to_string())?;

    let prompts_dir = PathBuf::from(local_folder_path).join("prompts");
    fs::create_dir_all(&prompts_dir).map_err(|error| error.to_string())?;

    let file_name = build_file_name(&prompt_run.prompt_title, &format);
    let export_path = prompts_dir.join(&file_name);
    fs::write(&export_path, prompt_run.prompt_text).map_err(|error| error.to_string())?;
    let exported_path = export_path.to_string_lossy().to_string();

    conn.execute(
        "UPDATE prompt_runs SET exported_path = ?1 WHERE id = ?2",
        params![exported_path, prompt_run_id],
    )
    .map_err(|error| error.to_string())?;

    Ok(PromptExportResult {
        prompt_run_id,
        proposal_id: prompt_run.proposal_id,
        format,
        file_name,
        exported_path,
    })
}

#[tauri::command]
pub fn export_latest_prompt_run(
    app: AppHandle,
    proposal_id: i64,
    format: String,
) -> Result<PromptExportResult, String> {
    if proposal_id <= 0 {
        return Err("proposal_id must be greater than zero".to_string());
    }
    validate_format(&format)?;
    let conn = db::open_initialized(&app)?;
    let prompt_run_id = conn
        .query_row(
            "SELECT id FROM prompt_runs
             WHERE proposal_id = ?1
             ORDER BY generated_at DESC, id DESC
             LIMIT 1",
            params![proposal_id],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "No prompt run found for proposal".to_string())?;
    export_prompt_run(app, prompt_run_id, format)
}

#[tauri::command]
pub fn get_prompt_export_path(
    app: AppHandle,
    prompt_run_id: i64,
    format: String,
) -> Result<String, String> {
    if prompt_run_id <= 0 {
        return Err("prompt_run_id must be greater than zero".to_string());
    }
    validate_format(&format)?;
    let conn = db::open_initialized(&app)?;
    let prompt_run = query_prompt_run(&conn, prompt_run_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Prompt run not found".to_string())?;
    let proposal = query_prompt_proposal(&conn, prompt_run.proposal_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Proposal not found".to_string())?;
    let local_folder_path = proposal
        .local_folder_path
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Proposal local_folder_path is required".to_string())?;
    Ok(PathBuf::from(local_folder_path)
        .join("prompts")
        .join(build_file_name(&prompt_run.prompt_title, &format))
        .to_string_lossy()
        .to_string())
}

struct PromptProposal {
    local_folder_path: Option<String>,
}

fn query_prompt_run(conn: &rusqlite::Connection, id: i64) -> Result<Option<PromptRun>> {
    conn.query_row(
        "SELECT id, proposal_id, prompt_title, prompt_text, prompt_format,
                generated_at, copied_at, exported_path, notes
         FROM prompt_runs
         WHERE id = ?1",
        params![id],
        |row| {
            Ok(PromptRun {
                id: row.get(0)?,
                proposal_id: row.get(1)?,
                prompt_title: row.get(2)?,
                prompt_text: row.get(3)?,
                prompt_format: row.get(4)?,
                generated_at: row.get(5)?,
                copied_at: row.get(6)?,
                exported_path: row.get(7)?,
                notes: row.get(8)?,
            })
        },
    )
    .optional()
}

fn query_prompt_proposal(
    conn: &rusqlite::Connection,
    proposal_id: i64,
) -> Result<Option<PromptProposal>> {
    conn.query_row(
        "SELECT local_folder_path FROM proposals WHERE id = ?1",
        params![proposal_id],
        |row| {
            Ok(PromptProposal {
                local_folder_path: row.get(0)?,
            })
        },
    )
    .optional()
}

fn validate_format(format: &str) -> Result<(), String> {
    match format {
        "markdown" | "text" => Ok(()),
        _ => Err("Unsupported prompt export format".to_string()),
    }
}

fn build_file_name(prompt_title: &str, format: &str) -> String {
    let extension = if format == "markdown" { "md" } else { "txt" };
    let stamp = chrono_like_timestamp();
    format!("{}_{}.{}", sanitize_file_name(prompt_title), stamp, extension)
}

fn sanitize_file_name(value: &str) -> String {
    let sanitized = value
        .chars()
        .map(|character| {
            if matches!(character, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*')
                || character.is_control()
                || character.is_whitespace()
            {
                '_'
            } else {
                character
            }
        })
        .collect::<String>()
        .split('_')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("_");
    if sanitized.is_empty() {
        "prompt".to_string()
    } else {
        sanitized
    }
}

fn chrono_like_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    seconds.to_string()
}
