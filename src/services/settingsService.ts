import type { AppSetting } from "../types";
import { callTauri } from "./tauriClient";

export function getAllSettings(): Promise<AppSetting[]> {
  return callTauri<AppSetting[]>("get_all_settings");
}

export function getSetting(key: string): Promise<AppSetting | null> {
  return callTauri<AppSetting | null>("get_setting", { key });
}
