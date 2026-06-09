import type { FinalDocument, RegisterFinalDocumentInput } from "../types";
import { callTauri, isTauriRuntime } from "./tauriClient";

export const FINAL_DOCUMENT_STORAGE_KEY =
  "proposal-prompt-studio.preview.finalDocuments";

const PREVIEW_MESSAGE =
  "Registo real de documentos finais disponivel apenas no runtime Tauri. Em modo web, esta acao e apenas preview.";

export const ALLOWED_FINAL_DOCUMENT_EXTENSIONS = [
  "pdf",
  "docx",
  "xlsx",
  "md",
  "txt",
  "pptx",
  "png",
  "jpg",
  "jpeg",
  "webp",
] as const;

export function registerFinalDocument(
  input: RegisterFinalDocumentInput,
): Promise<FinalDocument> {
  validateRegisterFinalDocumentInput(input);

  if (isTauriRuntime()) {
    return callTauri<FinalDocument>("register_final_document", {
      proposalId: input.proposalId,
      sourceFilePath: input.sourceFilePath,
      versionLabel: input.versionLabel,
    });
  }

  const documents = readPreviewFinalDocuments();
  const document = buildFinalDocumentPreviewRecord(input, documents);
  writePreviewFinalDocuments([...documents, document]);
  return Promise.resolve(document);
}

export function getFinalDocuments(proposalId: number): Promise<FinalDocument[]> {
  validateProposalId(proposalId);

  if (isTauriRuntime()) {
    return callTauri<FinalDocument[]>("get_final_documents", { proposalId });
  }

  return Promise.resolve(
    readPreviewFinalDocuments()
      .filter((document) => document.proposalId === proposalId)
      .sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? "")),
  );
}

export function getLatestFinalDocument(
  proposalId: number,
): Promise<FinalDocument | null> {
  validateProposalId(proposalId);

  if (isTauriRuntime()) {
    return callTauri<FinalDocument | null>("get_latest_final_document", { proposalId });
  }

  return getFinalDocuments(proposalId).then((documents) => documents[0] ?? null);
}

export function updateFinalDocumentVersion(
  documentId: number,
  versionLabel: string,
): Promise<FinalDocument> {
  validateDocumentId(documentId);

  if (isTauriRuntime()) {
    return callTauri<FinalDocument>("update_final_document_version", {
      documentId,
      versionLabel,
    });
  }

  const documents = readPreviewFinalDocuments();
  const document = documents.find((item) => item.id === documentId);
  if (!document) throw new Error("Final document not found");
  document.versionLabel = versionLabel.trim() || null;
  writePreviewFinalDocuments(documents);
  return Promise.resolve(document);
}

export function removeFinalDocumentRecord(documentId: number): Promise<void> {
  validateDocumentId(documentId);

  if (isTauriRuntime()) {
    return callTauri<void>("remove_final_document_record", { documentId });
  }

  const documents = readPreviewFinalDocuments();
  const document = documents.find((item) => item.id === documentId);
  if (!document) throw new Error("Final document not found");
  writePreviewFinalDocuments(documents.filter((item) => item.id !== documentId));
  return Promise.resolve();
}

export function validateRegisterFinalDocumentInput(
  input: RegisterFinalDocumentInput,
): void {
  validateProposalId(input.proposalId);
  if (!input.sourceFilePath.trim()) {
    throw new Error("Indica o caminho do ficheiro final.");
  }
  const extension = getFinalDocumentExtension(input.sourceFilePath);
  if (!isAllowedFinalDocumentExtension(extension)) {
    throw new Error("Tipo de ficheiro nao suportado.");
  }
}

export function getFinalDocumentExtension(sourceFilePath: string): string {
  const fileName = extractFinalDocumentFileName(sourceFilePath);
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return "";
  }
  return fileName.slice(dotIndex + 1).toLowerCase();
}

export function isAllowedFinalDocumentExtension(extension: string): boolean {
  return ALLOWED_FINAL_DOCUMENT_EXTENSIONS.includes(
    extension.toLowerCase() as (typeof ALLOWED_FINAL_DOCUMENT_EXTENSIONS)[number],
  );
}

export function extractFinalDocumentFileName(sourceFilePath: string): string {
  const normalized = sourceFilePath.trim().replace(/\\/g, "/");
  const fileName = normalized.split("/").filter(Boolean).pop() ?? "";
  return sanitizeFinalDocumentFileName(fileName);
}

export function sanitizeFinalDocumentFileName(value: string): string {
  const sanitized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return sanitized || "documento_final";
}

export function buildFinalDocumentPreviewRecord(
  input: RegisterFinalDocumentInput,
  existingDocuments: FinalDocument[] = [],
): FinalDocument {
  validateRegisterFinalDocumentInput(input);
  const fileName = extractFinalDocumentFileName(input.sourceFilePath);
  return {
    id: nextPreviewFinalDocumentId(existingDocuments),
    proposalId: input.proposalId,
    fileName,
    fileType: getFinalDocumentExtension(fileName),
    localPath: PREVIEW_MESSAGE,
    onedrivePath: null,
    versionLabel: input.versionLabel?.trim() || null,
    uploadedAt: new Date().toISOString(),
    notes: PREVIEW_MESSAGE,
  };
}

function validateProposalId(proposalId: number): void {
  if (proposalId <= 0) {
    throw new Error("Proposal id must be greater than zero.");
  }
}

function validateDocumentId(documentId: number): void {
  if (documentId <= 0) {
    throw new Error("Document id must be greater than zero.");
  }
}

function readPreviewFinalDocuments(): FinalDocument[] {
  const raw = localStorage.getItem(FINAL_DOCUMENT_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as FinalDocument[]) : [];
}

function writePreviewFinalDocuments(documents: FinalDocument[]): void {
  localStorage.setItem(FINAL_DOCUMENT_STORAGE_KEY, JSON.stringify(documents));
}

function nextPreviewFinalDocumentId(existingDocuments: FinalDocument[]): number {
  return existingDocuments.reduce((max, document) => Math.max(max, document.id), 0) + 1;
}
