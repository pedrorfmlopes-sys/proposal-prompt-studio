import type { Layout } from "../types";
import { previewLayouts } from "./previewData";
import { callTauri } from "./tauriClient";

export function getActiveLayouts(): Promise<Layout[]> {
  return callTauri<Layout[]>("get_active_layouts").catch((error) => {
    if (error instanceof Error && error.message === "Tauri runtime is not available") {
      return previewLayouts;
    }
    throw error;
  });
}

export function getDefaultLayout(): Promise<Layout | null> {
  return callTauri<Layout | null>("get_default_layout").catch((error) => {
    if (error instanceof Error && error.message === "Tauri runtime is not available") {
      return previewLayouts.find((layout) => layout.isDefault) ?? null;
    }
    throw error;
  });
}
