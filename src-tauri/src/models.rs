use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSetting {
    pub id: i64,
    pub key: String,
    pub value: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Brand {
    pub id: i64,
    pub name: String,
    pub display_name: Option<String>,
    pub supplier_name: Option<String>,
    pub website_url: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Layout {
    pub id: i64,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub proposal_type: Option<String>,
    pub structure_json: String,
    pub prompt_instructions: Option<String>,
    pub example_text: Option<String>,
    pub is_default: bool,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PricingRule {
    pub id: i64,
    pub name: String,
    pub code: String,
    #[serde(rename = "type")]
    pub rule_type: String,
    pub factor: Option<f64>,
    pub rounding_mode: String,
    pub description: Option<String>,
    pub example_input: Option<String>,
    pub example_output: Option<String>,
    pub formula_text: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardSummary {
    pub database_initialized: bool,
    pub settings_count: i64,
    pub brands_count: i64,
    pub layouts_count: i64,
    pub pricing_rules_count: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProposalFolderRequest {
    pub base_path: String,
    pub year: String,
    pub proposal_number: String,
    pub client_name: String,
    pub project_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProposalInput {
    pub proposal_number: Option<String>,
    pub title: String,
    pub client_name_snapshot: String,
    pub project_name: String,
    pub project_location: Option<String>,
    pub proposal_date: String,
    pub language: String,
    pub currency: String,
    pub vat_mode: String,
    pub validity_text: Option<String>,
    pub commercial_conditions: Option<String>,
    pub proposal_type: Option<String>,
    pub layout_id: Option<i64>,
    pub pricing_rule_id: Option<i64>,
    pub local_workspace_path: String,
    pub total_amount: f64,
    pub notes: Option<String>,
    pub items: Vec<CreateProposalItemInput>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProposalItemInput {
    pub brand_id: Option<i64>,
    pub brand_name_snapshot: Option<String>,
    pub option_group: Option<String>,
    pub reference: String,
    pub description: Option<String>,
    pub finish: Option<String>,
    pub quantity: f64,
    pub original_unit_price: f64,
    pub calculation_rule_id: Option<i64>,
    pub calculation_factor: Option<f64>,
    pub final_unit_price: f64,
    pub line_total: f64,
    pub technical_sheet_url: Option<String>,
    pub drawing2d_url: Option<String>,
    pub model3d_url: Option<String>,
    pub image_path: Option<String>,
    pub notes: Option<String>,
    pub sort_order: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProposalSummary {
    pub id: i64,
    pub proposal_number: String,
    pub title: String,
    pub client_name_snapshot: Option<String>,
    pub project_name: Option<String>,
    pub proposal_date: String,
    pub status: String,
    pub total_amount: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProposalDetail {
    pub id: i64,
    pub proposal_number: String,
    pub title: String,
    pub client_name_snapshot: Option<String>,
    pub project_name: Option<String>,
    pub project_location: Option<String>,
    pub proposal_date: String,
    pub status: String,
    pub total_amount: f64,
    pub language: String,
    pub currency: String,
    pub vat_mode: String,
    pub validity_text: Option<String>,
    pub commercial_conditions: Option<String>,
    pub proposal_type: Option<String>,
    pub layout_id: Option<i64>,
    pub layout_name: Option<String>,
    pub pricing_rule_id: Option<i64>,
    pub pricing_rule_name: Option<String>,
    pub local_folder_path: Option<String>,
    pub notes: Option<String>,
    pub items: Vec<ProposalItem>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProposalItem {
    pub id: i64,
    pub proposal_id: i64,
    pub brand_id: Option<i64>,
    pub brand_name_snapshot: Option<String>,
    pub option_group: Option<String>,
    pub reference: String,
    pub description: Option<String>,
    pub finish: Option<String>,
    pub quantity: f64,
    pub original_unit_price: Option<f64>,
    pub calculation_rule_id: Option<i64>,
    pub calculation_factor: Option<f64>,
    pub final_unit_price: f64,
    pub line_total: f64,
    pub notes: Option<String>,
    pub sort_order: i64,
}
