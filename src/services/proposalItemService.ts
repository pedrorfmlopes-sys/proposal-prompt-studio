import type { CreateProposalItemInput, PricingRule } from "../types";
import { calculateLineTotal, validateLineTotal } from "./lineTotalService";
import { calculateFinalUnitPrice } from "./priceCalculationService";

export interface DraftProposalItem {
  brandId: number | null;
  brandNameSnapshot: string;
  optionGroup: string;
  reference: string;
  description: string;
  finish: string;
  quantity: number;
  originalUnitPrice: number;
  pricingRuleId: number | null;
  pricingRuleCode: string;
  pricingRuleName: string;
  calculationFactor: number | null;
  finalUnitPrice: number;
  lineTotal: number;
  notes: string;
}

export function calculateProposalItem(
  draft: Omit<DraftProposalItem, "finalUnitPrice" | "lineTotal">,
  rule: PricingRule,
): DraftProposalItem {
  const finalUnitPrice = calculateFinalUnitPrice({
    originalPrice: draft.originalUnitPrice,
    ruleType: rule.type,
    factor: draft.calculationFactor,
    roundingMode: rule.roundingMode,
  }).finalUnitPrice;
  const lineTotal = calculateLineTotal(finalUnitPrice, draft.quantity);

  return {
    ...draft,
    finalUnitPrice,
    lineTotal,
  };
}

export function toCreateProposalItemInput(
  item: DraftProposalItem,
  sortOrder: number,
): CreateProposalItemInput {
  const validation = validateLineTotal(
    item.finalUnitPrice,
    item.quantity,
    item.lineTotal,
  );

  if (!validation.isValid) {
    throw new Error("Line total does not match final unit price times quantity");
  }

  return {
    brandId: item.brandId,
    brandNameSnapshot: item.brandNameSnapshot,
    optionGroup: item.optionGroup,
    reference: item.reference,
    description: item.description,
    finish: item.finish,
    quantity: item.quantity,
    originalUnitPrice: item.originalUnitPrice,
    calculationRuleId: item.pricingRuleId,
    calculationFactor: item.calculationFactor,
    finalUnitPrice: item.finalUnitPrice,
    lineTotal: item.lineTotal,
    notes: item.notes,
    sortOrder,
  };
}
