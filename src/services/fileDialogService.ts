import { open } from "@tauri-apps/plugin-dialog";
import { ALLOWED_FINAL_DOCUMENT_EXTENSIONS } from "./finalDocumentService";
import { callTauri, isTauriRuntime } from "./tauriClient";

const TAURI_ONLY_MESSAGE = "Esta acao so esta disponivel no runtime Tauri.";

export async function pickFinalDocumentFile(): Promise<string | null> {
  if (!isTauriRuntime()) {
    throw new Error(TAURI_ONLY_MESSAGE);
  }

  const selected = await open({
    multiple: false,
    directory: false,
    title: "Escolher documento final",
    filters: [
      {
        name: "Documentos finais",
        extensions: [...ALLOWED_FINAL_DOCUMENT_EXTENSIONS],
      },
    ],
  });

  return Array.isArray(selected) ? selected[0] ?? null : selected;
}

export async function openPath(path: string): Promise<void> {
  validatePath(path);
  if (!isTauriRuntime()) {
    throw new Error(TAURI_ONLY_MESSAGE);
  }

  await callTauri<void>("open_path", { path: path.trim() });
}

export function openProposalFolder(localFolderPath: string | null): Promise<void> {
  if (!localFolderPath?.trim()) {
    return Promise.reject(new Error("A proposta nao tem pasta local definida."));
  }
  return openPath(localFolderPath);
}

export async function openFinalDocumentsFolder(
  localFolderPath: string | null,
): Promise<void> {
  if (!localFolderPath?.trim()) {
    throw new Error("A proposta nao tem pasta local definida.");
  }
  if (!isTauriRuntime()) {
    throw new Error(TAURI_ONLY_MESSAGE);
  }

  const finalDocumentsPath = await callTauri<string>("ensure_final_documents_folder", {
    localFolderPath,
  });
  await openPath(finalDocumentsPath);
}

export function validatePath(path: string): void {
  if (!path.trim()) {
    throw new Error("Indica um caminho valido.");
  }
}
