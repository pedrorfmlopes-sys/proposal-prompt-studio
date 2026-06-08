import type { AppSetting } from "../types";
import { previewSettings } from "./previewData";
import { callTauri } from "./tauriClient";

export function getAllSettings(): Promise<AppSetting[]> {
  return callTauri<AppSetting[]>("get_all_settings").catch(usePreviewSettings);
}

export function getSetting(key: string): Promise<AppSetting | null> {
  return callTauri<AppSetting | null>("get_setting", { key }).catch(() =>
    previewSettings.find((setting) => setting.key === key) ?? null,
  );
}

function usePreviewSettings(error: unknown): AppSetting[] {
  if (error instanceof Error && error.message === "Tauri runtime is not available") {
    return previewSettings;
  }
  throw error;
}
