import type { DashboardSummary } from "../types";
import { callTauri } from "./tauriClient";

export async function getDatabaseSummary(): Promise<DashboardSummary> {
  try {
    return await callTauri<DashboardSummary>("initialize_database");
  } catch (error) {
    if (error instanceof Error && error.message === "Tauri runtime is not available") {
      return {
        databaseInitialized: false,
        usingPreviewData: true,
        settingsCount: 9,
        brandsCount: 5,
        layoutsCount: 3,
        pricingRulesCount: 4,
      };
    }

    throw error;
  }
}
