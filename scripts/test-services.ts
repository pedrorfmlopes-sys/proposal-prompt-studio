import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { calculateFinalUnitPrice } from "../src/services/priceCalculationService";
import {
  calculateLineTotal,
  calculateSubtotal,
  validateLineTotal,
} from "../src/services/lineTotalService";
import {
  buildProposalFolderPath,
  buildProposalSubfolderPaths,
  sanitizeFolderName,
} from "../src/services/folderService";
import {
  calculateProposalItem,
  toCreateProposalItemInput,
} from "../src/services/proposalItemService";
import { suggestNextProposalNumber } from "../src/services/proposalNumberService";
import {
  calculateProposalTotal,
  validateCreateProposalInput,
} from "../src/services/proposalService";
import { generateStructuredPrompt } from "../src/services/promptGenerationService";
import {
  buildPromptExportFileName,
  getPromptExportExtension,
  sanitizeFileName,
} from "../src/services/promptExportService";
import {
  FINAL_DOCUMENT_STORAGE_KEY,
  buildFinalDocumentPreviewRecord,
  getFinalDocumentExtension,
  getFinalDocuments,
  isAllowedFinalDocumentExtension,
  registerFinalDocument,
  sanitizeFinalDocumentFileName,
  validateRegisterFinalDocumentInput,
} from "../src/services/finalDocumentService";
import {
  openPath,
  pickFinalDocumentFile,
  validatePath,
} from "../src/services/fileDialogService";
import type { AppSetting, PricingRule, ProposalDetail } from "../src/types";

function assertMoney(actual: number, expected: number) {
  assert.equal(actual.toFixed(2), expected.toFixed(2));
}

assertMoney(
  calculateFinalUnitPrice({
    originalPrice: 52.33,
    ruleType: "divide",
    factor: 0.85,
    roundingMode: "2_decimals",
  }).finalUnitPrice,
  61.56,
);

assertMoney(
  calculateFinalUnitPrice({
    originalPrice: 52.33,
    ruleType: "divide",
    factor: 0.85,
    roundingMode: "ceil_2_decimals",
  }).finalUnitPrice,
  61.57,
);

assertMoney(
  calculateFinalUnitPrice({
    originalPrice: 100,
    ruleType: "multiply",
    factor: 1.15,
    roundingMode: "2_decimals",
  }).finalUnitPrice,
  115.0,
);

assertMoney(
  calculateFinalUnitPrice({
    originalPrice: 100,
    ruleType: "divide",
    factor: 0.85,
    roundingMode: "2_decimals",
  }).finalUnitPrice,
  117.65,
);

assertMoney(
  calculateFinalUnitPrice({
    originalPrice: 100,
    ruleType: "divide",
    factor: 0.85,
    roundingMode: "ceil_2_decimals",
  }).finalUnitPrice,
  117.65,
);

assertMoney(
  calculateFinalUnitPrice({
    originalPrice: 100,
    ruleType: "discount",
    factor: 0.9,
    roundingMode: "2_decimals",
  }).finalUnitPrice,
  90.0,
);

assert.throws(
  () =>
    calculateFinalUnitPrice({
      originalPrice: 100,
      ruleType: "divide",
      factor: 0,
    }),
  /requires a non-zero factor/,
);

assert.throws(
  () =>
    calculateFinalUnitPrice({
      originalPrice: 100,
      ruleType: "multiply",
      factor: null,
    }),
  /requires a non-zero factor/,
);

assert.throws(
  () =>
    calculateFinalUnitPrice({
      originalPrice: 100,
      ruleType: "keep_price",
      roundingMode: "unknown" as never,
    }),
  /Unsupported rounding mode/,
);

assertMoney(calculateLineTotal(61.57, 220), 13545.4);
assert.equal(validateLineTotal(61.57, 220, 13545.4).isValid, true);
assert.equal(validateLineTotal(61.57, 220, 13544).isValid, false);
assertMoney(calculateSubtotal([{ lineTotal: 10 }, { lineTotal: 20.49 }]), 30.49);

assert.equal(sanitizeFolderName("Cliente / Projeto: Lisboa"), "Cliente_Projeto_Lisboa");
assert.equal(
  buildProposalFolderPath({
    basePath: "C:/ProposalPromptStudio",
    year: 2026,
    proposalNumber: "PROP-2026-001",
    clientName: "Cliente",
    projectName: "Projeto",
  }),
  "C:/ProposalPromptStudio/proposals/2026/PROP-2026-001_Cliente_Projeto",
);
assert.equal(
  buildProposalSubfolderPaths({
    basePath: "C:/ProposalPromptStudio",
    year: 2026,
    proposalNumber: "PROP-2026-001",
    clientName: "Cliente",
    projectName: "Projeto",
  }).length,
  5,
);

const settingsBase: AppSetting[] = [
  setting("proposal_series_prefix", "PROP"),
  setting("proposal_series_year", "2026"),
  setting("proposal_next_number", "1"),
];
assert.equal(suggestNextProposalNumber(settingsBase), "PROP-2026-001");
assert.equal(
  suggestNextProposalNumber([
    setting("proposal_series_prefix", "PROP"),
    setting("proposal_series_year", "2026"),
    setting("proposal_next_number", "12"),
  ]),
  "PROP-2026-012",
);

const divideRule: PricingRule = {
  id: 3,
  name: "Divide by 0.85",
  code: "divide_by_0_85",
  type: "divide",
  factor: 0.85,
  roundingMode: "ceil_2_decimals",
  description: null,
  exampleInput: null,
  exampleOutput: null,
  formulaText: null,
  isActive: true,
  createdAt: "",
  updatedAt: "",
};

const workflowItem = calculateProposalItem(
  {
    brandId: 1,
    brandNameSnapshot: "FIMA Carlo Frattini",
    optionGroup: "",
    reference: "F3121WLX8CR",
    description: "Misturadora",
    finish: "Cromado",
    quantity: 220,
    originalUnitPrice: 52.33,
    pricingRuleId: divideRule.id,
    pricingRuleCode: divideRule.code,
    pricingRuleName: divideRule.name,
    calculationFactor: divideRule.factor,
    notes: "",
  },
  divideRule,
);
assertMoney(workflowItem.finalUnitPrice, 61.57);
assertMoney(workflowItem.lineTotal, 13545.4);

const createItem = toCreateProposalItemInput(workflowItem, 1);
assertMoney(calculateProposalTotal([createItem, { ...createItem, lineTotal: 10 }]), 13555.4);
assert.throws(
  () => toCreateProposalItemInput({ ...workflowItem, lineTotal: 1 }, 1),
  /Line total does not match/,
);
assert.throws(
  () =>
    validateCreateProposalInput({
      proposalNumber: "PROP-2026-001",
      title: "Teste",
      clientNameSnapshot: "Cliente",
      projectName: "Projeto",
      proposalDate: "2026-06-08",
      language: "pt-PT",
      currency: "EUR",
      vatMode: "sem_iva",
      localWorkspacePath: "C:/ProposalPromptStudio",
      totalAmount: 1,
      items: [createItem],
    }),
  /Proposal total must match/,
);
assert.throws(
  () => validateProposalLike({ ...createItem, originalUnitPrice: -1 }),
  /Original unit price cannot be negative/,
);
assert.throws(
  () => validateProposalLike({ ...createItem, finalUnitPrice: -1 }),
  /Final unit price cannot be negative/,
);
assert.throws(
  () => validateProposalLike({ ...createItem, lineTotal: -1 }),
  /Line total cannot be negative/,
);
assert.throws(
  () =>
    validateCreateProposalInput({
      proposalNumber: "PROP-2026-001",
      title: "Teste",
      clientNameSnapshot: "Cliente",
      projectName: "Projeto",
      proposalDate: "2026-06-08",
      language: "pt-PT",
      currency: "EUR",
      vatMode: "sem_iva",
      localWorkspacePath: "C:/ProposalPromptStudio",
      totalAmount: -1,
      items: [createItem],
    }),
  /Proposal total cannot be negative/,
);
assert.throws(
  () =>
    validateCreateProposalInput({
      proposalNumber: "PROP-2026-001",
      title: "Teste",
      clientNameSnapshot: "Cliente",
      projectName: "Projeto",
      proposalDate: "2026-06-08",
      language: "",
      currency: "EUR",
      vatMode: "sem_iva",
      localWorkspacePath: "C:/ProposalPromptStudio",
      totalAmount: createItem.lineTotal,
      items: [createItem],
    }),
  /Language is required/,
);

const promptProposal: ProposalDetail = {
  id: 1,
  proposalNumber: "PROP-2026-001",
  title: "Hotelaria Lisboa - Projeto Hotelaria Lisboa",
  clientNameSnapshot: "Hotelaria Lisboa",
  projectName: "Projeto Hotelaria Lisboa",
  projectLocation: "Lisboa",
  proposalDate: "2026-06-08",
  status: "draft",
  totalAmount: 13545.4,
  language: "pt-PT",
  currency: "EUR",
  vatMode: "sem_iva",
  validityText: "30 dias",
  commercialConditions: "Aos valores apresentados acresce IVA a taxa legal em vigor.",
  proposalType: "technical",
  layoutId: 1,
  layoutName: "Technical summary with tables",
  pricingRuleId: divideRule.id,
  pricingRuleName: divideRule.name,
  pricingRuleCode: divideRule.code,
  pricingRuleFactor: divideRule.factor,
  pricingRuleRoundingMode: divideRule.roundingMode,
  localFolderPath: "C:/ProposalPromptStudio/proposals/2026/PROP-2026-001",
  notes: "Notas de teste",
  items: [
    {
      id: 1,
      proposalId: 1,
      brandId: 1,
      brandNameSnapshot: "FIMA Carlo Frattini",
      optionGroup: "",
      reference: "F3121WLX8CR",
      description: "Misturadora",
      finish: "Cromado",
      quantity: 220,
      originalUnitPrice: 52.33,
      calculationRuleId: divideRule.id,
      calculationFactor: 0.85,
      finalUnitPrice: 61.57,
      lineTotal: 13545.4,
      notes: "",
      sortOrder: 1,
    },
  ],
};
const prompt = generateStructuredPrompt(promptProposal);
const requiredPromptSections = [
  "# Objetivo",
  "# Contexto da proposta",
  "# Dados do cliente e projeto",
  "# Layout a seguir",
  "# Condições comerciais",
  "# Regras de cálculo aplicadas",
  "# Artigos da proposta",
  "# Totais e validações",
  "# Instruções de preservação de layout",
  "# Notas obrigatórias",
  "# Resultado pretendido",
  "# Validações antes de terminar",
];
let previousSectionIndex = -1;
for (const section of requiredPromptSections) {
  const sectionIndex = prompt.indexOf(section);
  assert.ok(sectionIndex > previousSectionIndex, `Missing or out-of-order section: ${section}`);
  previousSectionIndex = sectionIndex;
}
assert.match(prompt, /PROP-2026-001/);
assert.match(prompt, /Hotelaria Lisboa/);
assert.match(prompt, /Projeto Hotelaria Lisboa/);
assert.match(prompt, /Aos valores apresentados acresce IVA/);
assert.match(prompt, /F3121WLX8CR/);
assert.match(prompt, /52\.33/);
assert.match(prompt, /61\.57/);
assert.match(prompt, /13545\.40/);
assert.match(prompt, /line_total = final_unit_price × quantity/);
assert.match(prompt, /Não inventar produtos, links, imagens/);
assert.match(prompt, /ceil_2_decimals/);
assert.match(prompt, /divisão por 0,85/);
assert.match(prompt, /Validação do total geral: OK/);
assert.match(prompt, /F3121WLX8CR: OK - 61\.57 x 220 = 13545\.40/);
assert.match(prompt, /Não confundir multiplicar por 1,15 com dividir por 0,85/);

const rustPromptGenerator = readFileSync(
  "src-tauri/src/prompt_commands.rs",
  "utf-8",
);
for (const section of requiredPromptSections) {
  assert.ok(
    rustPromptGenerator.includes(section),
    `Rust prompt generator missing section: ${section}`,
  );
}
assert.match(rustPromptGenerator, /Validação do total geral/);
assert.match(rustPromptGenerator, /Validações por linha/);
assert.match(rustPromptGenerator, /ceil_2_decimals/);
assert.match(rustPromptGenerator, /Não confundir multiplicar por 1,15 com dividir por 0,85/);
assert.match(rustPromptGenerator, /fn format_rule/);

assert.equal(
  sanitizeFileName('Prompt <PROP-2026-001> Cliente/Projeto: "Teste"'),
  "Prompt_PROP-2026-001_Cliente_Projeto_Teste",
);
assert.equal(sanitizeFileName(""), "prompt");
assert.equal(getPromptExportExtension("markdown"), ".md");
assert.equal(getPromptExportExtension("text"), ".txt");
assert.equal(
  buildPromptExportFileName(
    "Prompt - PROP-2026-001 - Cliente - Projeto",
    new Date("2026-06-09T14:30:00"),
    "markdown",
  ),
  "Prompt_-_PROP-2026-001_-_Cliente_-_Projeto_2026-06-09_1430.md",
);
assert.equal(
  buildPromptExportFileName(
    "Prompt - PROP-2026-001 - Cliente - Projeto",
    new Date("2026-06-09T14:30:00"),
    "text",
  ),
  "Prompt_-_PROP-2026-001_-_Cliente_-_Projeto_2026-06-09_1430.txt",
);
assert.throws(
  () => getPromptExportExtension("pdf" as never),
  /Unsupported prompt export format/,
);

assert.throws(
  () =>
    validateRegisterFinalDocumentInput({
      proposalId: 1,
      sourceFilePath: "",
    }),
  /Indica o caminho do ficheiro final/,
);
assert.throws(
  () =>
    validateRegisterFinalDocumentInput({
      proposalId: 0,
      sourceFilePath: "C:/Temp/Proposta_Final.pdf",
    }),
  /Proposal id must be greater than zero/,
);
assert.equal(getFinalDocumentExtension("C:/Temp/Proposta_Final.PDF"), "pdf");
assert.equal(getFinalDocumentExtension("C:\\Temp\\Proposta_Final.docx"), "docx");
assert.equal(isAllowedFinalDocumentExtension("pdf"), true);
assert.equal(isAllowedFinalDocumentExtension("docx"), true);
assert.equal(isAllowedFinalDocumentExtension("exe"), false);
assert.throws(
  () =>
    validateRegisterFinalDocumentInput({
      proposalId: 1,
      sourceFilePath: "C:/Temp/Proposta_Final.exe",
    }),
  /Tipo de ficheiro nao suportado/,
);
assert.equal(
  sanitizeFinalDocumentFileName('Proposta Final: Cliente/Projeto?.pdf'),
  "Proposta_Final_Cliente_Projeto_.pdf",
);
const previewFinalDocument = buildFinalDocumentPreviewRecord(
  {
    proposalId: 12,
    sourceFilePath: "C:/Temp/Proposta Final.pdf",
    versionLabel: "v1 cliente",
  },
  [],
);
assert.equal(previewFinalDocument.id, 1);
assert.equal(previewFinalDocument.proposalId, 12);
assert.equal(previewFinalDocument.fileName, "Proposta_Final.pdf");
assert.equal(previewFinalDocument.fileType, "pdf");
assert.equal(previewFinalDocument.versionLabel, "v1 cliente");
assert.match(
  previewFinalDocument.localPath ?? "",
  /Registo real de documentos finais disponivel apenas no runtime Tauri/,
);
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  value: {},
  configurable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => storage.clear(),
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() {
    return storage.size;
  },
  } as Storage,
  configurable: true,
});
localStorage.removeItem(FINAL_DOCUMENT_STORAGE_KEY);
const fallbackFinalDocument = await registerFinalDocument({
  proposalId: 12,
  sourceFilePath: "C:/Temp/Proposta_Final.docx",
});
assert.equal(fallbackFinalDocument.fileName, "Proposta_Final.docx");
assert.match(fallbackFinalDocument.localPath ?? "", /apenas preview/);
const fallbackDocuments = await getFinalDocuments(12);
assert.equal(fallbackDocuments.length, 1);
assert.equal(fallbackDocuments[0].fileType, "docx");
assert.throws(() => validatePath(""), /Indica um caminho valido/);
await assert.rejects(
  () => openPath("C:/Temp/Proposta_Final.pdf"),
  /Esta acao so esta disponivel no runtime Tauri/,
);
await assert.rejects(
  () => pickFinalDocumentFile(),
  /Esta acao so esta disponivel no runtime Tauri/,
);

console.log("Service tests passed.");

function setting(key: string, value: string): AppSetting {
  return {
    id: 1,
    key,
    value,
    description: null,
    createdAt: "",
    updatedAt: "",
  };
}

function validateProposalLike(item: typeof createItem): void {
  validateCreateProposalInput({
    proposalNumber: "PROP-2026-001",
    title: "Teste",
    clientNameSnapshot: "Cliente",
    projectName: "Projeto",
    proposalDate: "2026-06-08",
    language: "pt-PT",
    currency: "EUR",
    vatMode: "sem_iva",
    localWorkspacePath: "C:/ProposalPromptStudio",
    totalAmount: Math.max(item.lineTotal, 0),
    items: [item],
  });
}
