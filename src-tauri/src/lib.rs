mod commands;
mod db;
mod folder_service;
mod models;

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running Proposal Prompt Studio");
}
