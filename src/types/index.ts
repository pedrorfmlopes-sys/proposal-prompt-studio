export type PricingRuleType =
  | "keep_price"
  | "multiply"
  | "divide"
  | "discount"
  | "margin_division"
  | "custom";

export type RoundingMode = "2_decimals" | "ceil_2_decimals" | "none";

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

export type ProposalStatus =
  | "draft"
  | "prompt_generated"
  | "sent_to_chatgpt"
  | "final_uploaded"
  | "archived";

export type ProposalType = "technical" | "update" | "alternatives" | string;

export type VatMode = "sem_iva" | "com_iva" | string;

export interface ProposalSummary {
  id: number;
  proposalNumber: string;
  title: string;
  clientNameSnapshot: string | null;
  projectName: string | null;
  proposalDate: string;
  status: ProposalStatus;
  totalAmount: number;
}

export interface ProposalDetail extends ProposalSummary {
  projectLocation: string | null;
  language: string;
  currency: string;
  vatMode: VatMode;
  validityText: string | null;
  commercialConditions: string | null;
  proposalType: ProposalType | null;
  layoutId: number | null;
  layoutName: string | null;
  pricingRuleId: number | null;
  pricingRuleName: string | null;
  pricingRuleCode?: string | null;
  pricingRuleFactor?: number | null;
  pricingRuleRoundingMode?: RoundingMode | null;
  localFolderPath: string | null;
  notes: string | null;
  items: ProposalItem[];
}

export interface CreateProposalInput {
  proposalNumber?: string;
  title: string;
  clientNameSnapshot: string;
  projectName: string;
  projectLocation?: string;
  proposalDate: string;
  language: string;
  currency: string;
  vatMode: VatMode;
  validityText?: string;
  commercialConditions?: string;
  proposalType?: ProposalType;
  layoutId?: number | null;
  pricingRuleId?: number | null;
  localWorkspacePath: string;
  totalAmount: number;
  notes?: string;
  items: CreateProposalItemInput[];
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
  brandNameSnapshot?: string | null;
  optionGroup?: string | null;
  reference: string;
  description: string | null;
  finish: string | null;
  quantity: number;
  originalUnitPrice: number | null;
  calculationRuleId?: number | null;
  calculationFactor?: number | null;
  finalUnitPrice: number;
  lineTotal: number;
  technicalSheetUrl?: string | null;
  drawing2dUrl?: string | null;
  model3dUrl?: string | null;
  imagePath?: string | null;
  notes?: string | null;
  sortOrder?: number;
}

export interface CreateProposalItemInput {
  brandId?: number | null;
  brandNameSnapshot?: string | null;
  optionGroup?: string;
  reference: string;
  description?: string;
  finish?: string;
  quantity: number;
  originalUnitPrice: number;
  calculationRuleId?: number | null;
  calculationFactor?: number | null;
  finalUnitPrice: number;
  lineTotal: number;
  technicalSheetUrl?: string;
  drawing2dUrl?: string;
  model3dUrl?: string;
  imagePath?: string;
  notes?: string;
  sortOrder: number;
}

export interface PromptRun {
  id: number;
  proposalId: number;
  promptTitle: string;
  promptText: string;
  promptFormat: "plain_text" | "markdown";
  generatedAt: string;
  copiedAt: string | null;
  exportedPath: string | null;
  notes: string | null;
}

export type PromptRunDetail = PromptRun;

export interface GeneratePromptResult {
  promptRun: PromptRunDetail;
  proposal: ProposalDetail | null;
}

export type PromptExportFormat = "markdown" | "text";

export interface PromptExportResult {
  promptRunId: number;
  proposalId: number;
  format: PromptExportFormat;
  fileName: string;
  exportedPath: string;
}

export interface FinalDocument {
  id: number;
  proposalId: number;
  fileName: string;
  fileType: string;
  localPath: string | null;
  onedrivePath: string | null;
  versionLabel: string | null;
  uploadedAt?: string;
  notes?: string | null;
}

export interface RegisterFinalDocumentInput {
  proposalId: number;
  sourceFilePath: string;
  versionLabel?: string;
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
