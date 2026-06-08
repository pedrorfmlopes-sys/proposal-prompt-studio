mod commands;
mod db;
mod folder_service;
mod models;
mod proposal_commands;

pub fn run() {
    tauri::Builder::default()
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running Proposal Prompt Studio");
}
