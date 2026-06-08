import type { PricingRule } from "../types";
import { previewPricingRules } from "./previewData";
import { callTauri } from "./tauriClient";

export function getActivePricingRules(): Promise<PricingRule[]> {
  return callTauri<PricingRule[]>("get_active_pricing_rules").catch((error) => {
    if (error instanceof Error && error.message === "Tauri runtime is not available") {
      return previewPricingRules;
    }
    throw error;
  });
}

export function getPricingRuleByCode(code: string): Promise<PricingRule | null> {
  return callTauri<PricingRule | null>("get_pricing_rule_by_code", { code }).catch(
    (error) => {
      if (error instanceof Error && error.message === "Tauri runtime is not available") {
        return previewPricingRules.find((rule) => rule.code === code) ?? null;
      }
      throw error;
    },
  );
}
