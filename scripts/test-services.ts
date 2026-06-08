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

function assertMoney(actual: number, expected: number) {
  assert.equal(actual.toFixed(2), expected.toFixed(2));
}

assertMoney(
  calculateFinalUnitPrice({
    originalPrice: 52.33,
    ruleType: "divide",
    factor: 0.85,
  }).finalUnitPrice,
  61.57,
);

assertMoney(
  calculateFinalUnitPrice({
    originalPrice: 100,
    ruleType: "multiply",
    factor: 1.15,
  }).finalUnitPrice,
  115.0,
);

assertMoney(
  calculateFinalUnitPrice({
    originalPrice: 100,
    ruleType: "divide",
    factor: 0.85,
  }).finalUnitPrice,
  117.65,
);

assertMoney(
  calculateFinalUnitPrice({
    originalPrice: 100,
    ruleType: "discount",
    factor: 0.9,
  }).finalUnitPrice,
  90.0,
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

console.log("Service tests passed.");
