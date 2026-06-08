import type { Brand } from "../types";
import { previewBrands } from "./previewData";
import { callTauri } from "./tauriClient";

export function getActiveBrands(): Promise<Brand[]> {
  return callTauri<Brand[]>("get_active_brands").catch((error) => {
    if (error instanceof Error && error.message === "Tauri runtime is not available") {
      return previewBrands;
    }
    throw error;
  });
}
