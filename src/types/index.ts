export type PricingRuleType =
  | "keep_price"
  | "multiply"
  | "divide"
  | "discount"
  | "margin_division"
  | "custom";

export type RoundingMode = "2_decimals" | string;

export interface AppSetting {
  id: number;
  key: string;
  value: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: number;
  name: string;
  displayName: string | null;
  supplierName: string | null;
  websiteUrl: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Layout {
  id: number;
  name: string;
  code: string;
  description: string | null;
  proposalType: string | null;
  structureJson: string;
  promptInstructions: string | null;
  exampleText: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PricingRule {
  id: number;
  name: string;
  code: string;
  type: PricingRuleType;
  factor: number | null;
  roundingMode: RoundingMode;
  description: string | null;
  exampleInput: string | null;
  exampleOutput: string | null;
  formulaText: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  id: number;
  proposalNumber: string;
  title: string;
  clientId: number | null;
  clientNameSnapshot: string | null;
  projectName: string | null;
  projectLocation: string | null;
  proposalDate: string;
  language: string;
  currency: string;
  vatMode: string;
  status: string;
  totalAmount: number;
}

export interface ProposalFile {
  id: number;
  proposalId: number;
  fileName: string;
  fileType: string;
  fileRole: string;
  localPath: string | null;
  onedrivePath: string | null;
  includeInPrompt: boolean;
}

export interface ProposalItem {
  id: number;
  proposalId: number;
  brandId: number | null;
  reference: string;
  description: string | null;
  finish: string | null;
  quantity: number;
  originalUnitPrice: number | null;
  finalUnitPrice: number;
  lineTotal: number;
}

export interface PromptRun {
  id: number;
  proposalId: number;
  promptTitle: string;
  promptText: string;
  promptFormat: "plain_text" | "markdown";
  generatedAt: string;
}

export interface FinalDocument {
  id: number;
  proposalId: number;
  fileName: string;
  fileType: string;
  localPath: string | null;
  onedrivePath: string | null;
  versionLabel: string | null;
}

export interface PriceCalculationInput {
  originalPrice: number;
  ruleType: PricingRuleType;
  factor?: number | null;
  roundingMode?: RoundingMode;
}

export interface PriceCalculationResult {
  originalPrice: number;
  ruleType: PricingRuleType;
  factor: number | null;
  roundingMode: RoundingMode;
  finalUnitPrice: number;
}

export interface LineTotalValidationResult {
  isValid: boolean;
  expectedLineTotal: number;
  actualLineTotal: number;
  difference: number;
}

export interface DashboardSummary {
  databaseInitialized: boolean;
  usingPreviewData?: boolean;
  settingsCount: number;
  brandsCount: number;
  layoutsCount: number;
  pricingRulesCount: number;
}
