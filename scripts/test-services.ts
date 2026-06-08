import { strict as assert } from "node:assert";
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
import type { AppSetting, PricingRule } from "../src/types";

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
