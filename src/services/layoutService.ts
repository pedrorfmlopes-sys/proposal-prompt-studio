import type { Layout } from "../types";
import { callTauri } from "./tauriClient";

export function getActiveLayouts(): Promise<Layout[]> {
  return callTauri<Layout[]>("get_active_layouts");
}

export function getDefaultLayout(): Promise<Layout | null> {
  return callTauri<Layout | null>("get_default_layout");
}
