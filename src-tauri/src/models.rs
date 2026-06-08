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
