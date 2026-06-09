import type { PromptExportFormat, PromptExportResult } from "../types";
import { getLatestPromptRun, PROMPT_RUN_STORAGE_KEY } from "./promptRunService";
import { callTauri, isTauriRuntime } from "./tauriClient";

export function exportPromptRun(
  promptRunId: number,
  format: PromptExportFormat,
): Promise<PromptExportResult> {
  validateExportFormat(format);

  if (isTauriRuntime()) {
    return callTauri<PromptExportResult>("export_prompt_run", {
      promptRunId,
      format,
    });
  }

  return Promise.resolve({
    promptRunId,
    proposalId: updatePreviewExportPath(promptRunId, resultPath(format)),
    format,
    fileName: buildPromptExportFileName(
      "Prompt_PREVIEW_Proposal",
      new Date("2026-06-09T14:30:00"),
      format,
    ),
    exportedPath: resultPath(format),
  });
}

export async function exportLatestPromptRun(
  proposalId: number,
  format: PromptExportFormat,
): Promise<PromptExportResult> {
  validateExportFormat(format);

  if (isTauriRuntime()) {
    return callTauri<PromptExportResult>("export_latest_prompt_run", {
      proposalId,
      format,
    });
  }

  const latest = await getLatestPromptRun(proposalId);
  if (!latest) throw new Error("No prompt run found for proposal");
  return {
    promptRunId: latest.id,
    proposalId,
    format,
    fileName: buildPromptExportFileName(latest.promptTitle, new Date(), format),
    exportedPath: setPreviewExportPath(latest.id, resultPath(format)),
  };
}

export function getPromptExportExtension(format: PromptExportFormat): ".md" | ".txt" {
  validateExportFormat(format);
  return format === "markdown" ? ".md" : ".txt";
}

export function buildPromptExportFileName(
  promptTitle: string,
  date: Date,
  format: PromptExportFormat,
): string {
  validateExportFormat(format);
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  const time = [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join("");
  return `${sanitizeFileName(promptTitle)}_${stamp}_${time}${getPromptExportExtension(format)}`;
}

export function sanitizeFileName(value: string): string {
  const sanitized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return sanitized || "prompt";
}

function validateExportFormat(format: string): asserts format is PromptExportFormat {
  if (format !== "markdown" && format !== "text") {
    throw new Error("Unsupported prompt export format");
  }
}

function resultPath(format: PromptExportFormat): string {
  return `Exportacao real ${getPromptExportExtension(format)} disponivel apenas no runtime Tauri. Em modo web, esta acao e apenas preview.`;
}

function updatePreviewExportPath(promptRunId: number, exportedPath: string): number {
  const raw = localStorage.getItem(PROMPT_RUN_STORAGE_KEY);
  if (!raw) return 0;
  const runs = JSON.parse(raw) as Array<{
    id: number;
    proposalId: number;
    exportedPath: string | null;
  }>;
  const run = runs.find((item) => item.id === promptRunId);
  if (!run) return 0;
  run.exportedPath = exportedPath;
  localStorage.setItem(PROMPT_RUN_STORAGE_KEY, JSON.stringify(runs));
  return run.proposalId;
}

function setPreviewExportPath(promptRunId: number, exportedPath: string): string {
  updatePreviewExportPath(promptRunId, exportedPath);
  return exportedPath;
}
