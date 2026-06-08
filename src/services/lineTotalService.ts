import type { LineTotalValidationResult, ProposalItem } from "../types";
import { roundMoney } from "./priceCalculationService";

export function calculateLineTotal(
  finalUnitPrice: number,
  quantity: number,
): number {
  return roundMoney(finalUnitPrice * quantity);
}

export function validateLineTotal(
  finalUnitPrice: number,
  quantity: number,
  lineTotal: number,
): LineTotalValidationResult {
  const expectedLineTotal = calculateLineTotal(finalUnitPrice, quantity);
  const actualLineTotal = roundMoney(lineTotal);
  const difference = roundMoney(actualLineTotal - expectedLineTotal);

  return {
    isValid: Math.abs(difference) <= 0.01,
    expectedLineTotal,
    actualLineTotal,
    difference,
  };
}

export function calculateSubtotal(
  items: Pick<ProposalItem, "lineTotal">[],
): number {
  return roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
}
