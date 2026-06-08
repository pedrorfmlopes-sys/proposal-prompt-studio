import type {
  PriceCalculationInput,
  PriceCalculationResult,
  RoundingMode,
} from "../types";

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundMoneyUp(value: number): number {
  return Math.ceil((value - Number.EPSILON) * 100) / 100;
}

export function calculateFinalUnitPrice(
  input: PriceCalculationInput,
): PriceCalculationResult {
  const factor = input.factor ?? null;
  const roundingMode = input.roundingMode ?? "2_decimals";
  let rawValue: number;
  let finalUnitPrice: number;

  switch (input.ruleType) {
    case "keep_price":
      rawValue = input.originalPrice;
      finalUnitPrice = roundByMode(rawValue, roundingMode);
      break;
    case "multiply":
    case "discount":
      assertUsableFactor(factor, input.ruleType);
      rawValue = input.originalPrice * factor;
      finalUnitPrice = roundByMode(rawValue, roundingMode);
      break;
    case "divide":
    case "margin_division":
      assertUsableFactor(factor, input.ruleType);
      rawValue = input.originalPrice / factor;
      finalUnitPrice = roundByMode(rawValue, roundingMode);
      break;
    case "custom":
      rawValue = input.originalPrice;
      finalUnitPrice = roundByMode(rawValue, roundingMode);
      break;
    default:
      throw new Error(`Unsupported pricing rule: ${input.ruleType satisfies never}`);
  }

  return {
    originalPrice: input.originalPrice,
    ruleType: input.ruleType,
    factor,
    roundingMode,
    finalUnitPrice,
  };
}

function roundByMode(value: number, roundingMode: RoundingMode): number {
  switch (roundingMode) {
    case "2_decimals":
      return roundMoney(value);
    case "ceil_2_decimals":
      return roundMoneyUp(value);
    case "none":
      return value;
    default:
      throw new Error(`Unsupported rounding mode: ${roundingMode satisfies never}`);
  }
}

function assertUsableFactor(
  factor: number | null,
  ruleType: PriceCalculationInput["ruleType"],
): asserts factor is number {
  if (factor === null || factor === 0) {
    throw new Error(`Rule ${ruleType} requires a non-zero factor`);
  }
}
