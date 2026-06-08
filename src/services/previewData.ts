import type { AppSetting, Brand, Layout, PricingRule } from "../types";

const now = new Date().toISOString();

export const previewSettings: AppSetting[] = [
  setting(1, "local_workspace_path", "C:/Users/Pedro/Documents/ProposalPromptStudio"),
  setting(2, "onedrive_sync_path", "OneDrive/Proposal Prompt Studio"),
  setting(3, "default_language", "pt-PT"),
  setting(4, "default_currency", "EUR"),
  setting(5, "default_vat_mode", "sem_iva"),
  setting(6, "default_rounding", "2_decimals"),
  setting(7, "proposal_series_prefix", "PROP"),
  setting(8, "proposal_series_year", "2026"),
  setting(9, "proposal_next_number", "1"),
];

export const previewBrands: Brand[] = [
  brand(1, "FIMA Carlo Frattini"),
  brand(2, "AXA / Colavene"),
  brand(3, "Ritmonio"),
  brand(4, "Nicolazzi"),
  brand(5, "Profiltek"),
];

export const previewLayouts: Layout[] = [
  layout(1, "Technical summary with tables", "technical_summary_tables", true),
  layout(2, "Update existing PDF", "update_existing_pdf", false),
  layout(3, "Alternatives by brand or option", "alternatives_by_brand_option", false),
];

export const previewPricingRules: PricingRule[] = [
  rule(1, "Keep price", "keep_price", "keep_price", null, "2_decimals"),
  rule(2, "Multiply by 1.15", "multiply_by_1_15", "multiply", 1.15, "2_decimals"),
  rule(3, "Divide by 0.85", "divide_by_0_85", "divide", 0.85, "ceil_2_decimals"),
  rule(4, "Discount 10 percent", "discount_10_percent", "discount", 0.9, "2_decimals"),
];

function setting(id: number, key: string, value: string): AppSetting {
  return { id, key, value, description: null, createdAt: now, updatedAt: now };
}

function brand(id: number, name: string): Brand {
  return {
    id,
    name,
    displayName: name,
    supplierName: name,
    websiteUrl: null,
    notes: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

function layout(id: number, name: string, code: string, isDefault: boolean): Layout {
  return {
    id,
    name,
    code,
    description: null,
    proposalType: "technical",
    structureJson: "{}",
    promptInstructions: null,
    exampleText: null,
    isDefault,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

function rule(
  id: number,
  name: string,
  code: string,
  type: PricingRule["type"],
  factor: number | null,
  roundingMode: PricingRule["roundingMode"],
): PricingRule {
  return {
    id,
    name,
    code,
    type,
    factor,
    roundingMode,
    description: null,
    exampleInput: null,
    exampleOutput: null,
    formulaText: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}
