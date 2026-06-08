import type { PricingRule } from "../types";
import { callTauri } from "./tauriClient";

export function getActivePricingRules(): Promise<PricingRule[]> {
  return callTauri<PricingRule[]>("get_active_pricing_rules");
}

export function getPricingRuleByCode(code: string): Promise<PricingRule | null> {
  return callTauri<PricingRule | null>("get_pricing_rule_by_code", { code });
}
