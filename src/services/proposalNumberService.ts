import type { AppSetting } from "../types";

export function suggestNextProposalNumber(settings: AppSetting[]): string {
  const prefix = findSetting(settings, "proposal_series_prefix") || "PROP";
  const year = findSetting(settings, "proposal_series_year") || String(new Date().getFullYear());
  const nextNumber = Number(findSetting(settings, "proposal_next_number") || "1");

  if (!Number.isInteger(nextNumber) || nextNumber < 1) {
    throw new Error("proposal_next_number must be a positive integer");
  }

  return `${prefix}-${year}-${String(nextNumber).padStart(3, "0")}`;
}

function findSetting(settings: AppSetting[], key: string): string | null {
  return settings.find((setting) => setting.key === key)?.value ?? null;
}
