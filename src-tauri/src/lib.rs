mod commands;
mod db;
mod final_document_commands;
mod folder_service;
mod models;
mod prompt_commands;
mod prompt_export_commands;
mod proposal_commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::initialize_database,
            commands::get_all_settings,
            commands::get_setting,
            commands::get_active_brands,
            commands::get_active_layouts,
            commands::get_default_layout,
            commands::get_active_pricing_rules,
            commands::get_pricing_rule_by_code,
            commands::create_proposal_folder_structure,
            proposal_commands::create_proposal,
            proposal_commands::get_proposals,
            proposal_commands::get_proposal_by_id,
            proposal_commands::add_proposal_item,
            proposal_commands::get_proposal_items,
            proposal_commands::update_proposal_total,
            prompt_commands::generate_proposal_prompt,
            prompt_commands::get_prompt_runs,
            prompt_commands::get_latest_prompt_run,
            prompt_commands::get_prompt_run_by_id,
            prompt_export_commands::export_prompt_run,
            prompt_export_commands::export_latest_prompt_run,
            final_document_commands::register_final_document,
            final_document_commands::get_final_documents,
            final_document_commands::get_latest_final_document,
            final_document_commands::ensure_final_documents_folder,
            final_document_commands::open_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Proposal Prompt Studio");
}
