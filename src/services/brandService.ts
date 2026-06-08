import type { Brand } from "../types";
import { callTauri } from "./tauriClient";

export function getActiveBrands(): Promise<Brand[]> {
  return callTauri<Brand[]>("get_active_brands");
}
