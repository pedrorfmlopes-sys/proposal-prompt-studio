import { invoke } from "@tauri-apps/api/core";

export function callTauri<T>(command: string, args?: Record<string, unknown>) {
  if (!isTauriRuntime()) {
    return Promise.reject(new Error("Tauri runtime is not available"));
  }

  return invoke<T>(command, args);
}

export function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}
