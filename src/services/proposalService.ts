import type {
  CreateProposalInput,
  CreateProposalItemInput,
  ProposalDetail,
  ProposalItem,
  ProposalSummary,
  UpdateProposalInput,
  UpdateProposalItemInput,
} from "../types";
import { buildProposalFolderPath } from "./folderService";
import { calculateSubtotal, validateLineTotal } from "./lineTotalService";
import { previewPricingRules } from "./previewData";
import { callTauri, isTauriRuntime } from "./tauriClient";

const STORAGE_KEY = "proposal-prompt-studio.preview.proposals";

export function getProposals(): Promise<ProposalSummary[]> {
  if (isTauriRuntime()) {
    return callTauri<ProposalSummary[]>("get_proposals");
  }
  return Promise.resolve(readPreviewProposals().map(toSummary));
}

export function getProposalById(id: number): Promise<ProposalDetail | null> {
  if (isTauriRuntime()) {
    return callTauri<ProposalDetail | null>("get_proposal_by_id", { id });
  }
  return Promise.resolve(readPreviewProposals().find((proposal) => proposal.id === id) ?? null);
}

export function createProposal(input: CreateProposalInput): Promise<ProposalDetail> {
  validateCreateProposalInput(input);

  if (isTauriRuntime()) {
    return callTauri<ProposalDetail>("create_proposal", { input });
  }

  const proposals = readPreviewProposals();
  const id = nextPreviewId(proposals);
  const pricingRule = previewPricingRules.find(
    (rule) => rule.id === input.pricingRuleId,
  );
  const localFolderPath = buildProposalFolderPath({
    basePath: input.localWorkspacePath,
    year: new Date(input.proposalDate).getFullYear(),
    proposalNumber: input.proposalNumber ?? `PREVIEW-${id}`,
    clientName: input.clientNameSnapshot,
    projectName: input.projectName,
  });

  const proposal: ProposalDetail = {
    id,
    proposalNumber: input.proposalNumber ?? `PREVIEW-${id}`,
    title: input.title,
    clientNameSnapshot: input.clientNameSnapshot,
    projectName: input.projectName,
    projectLocation: input.projectLocation ?? null,
    proposalDate: input.proposalDate,
    status: "draft",
    totalAmount: calculateProposalTotal(input.items),
    language: input.language,
    currency: input.currency,
    vatMode: input.vatMode,
    validityText: input.validityText ?? null,
    commercialConditions: input.commercialConditions ?? null,
    proposalType: input.proposalType ?? null,
    layoutId: input.layoutId ?? null,
    layoutName: null,
    pricingRuleId: input.pricingRuleId ?? null,
    pricingRuleName: pricingRule?.name ?? null,
    pricingRuleCode: pricingRule?.code ?? null,
    pricingRuleFactor: pricingRule?.factor ?? null,
    pricingRuleRoundingMode: pricingRule?.roundingMode ?? null,
    localFolderPath,
    notes: input.notes ?? null,
    items: input.items.map(toPreviewItem),
  };

  writePreviewProposals([...proposals, proposal]);
  return Promise.resolve(proposal);
}

export async function duplicateProposal(sourceProposalId: number): Promise<ProposalDetail> {
  if (sourceProposalId <= 0) {
    throw new Error("Source proposal id must be greater than zero");
  }

  if (isTauriRuntime()) {
    return callTauri<ProposalDetail>("duplicate_proposal", { sourceProposalId });
  }

  const proposals = readPreviewProposals();
  const source = proposals.find((proposal) => proposal.id === sourceProposalId);
  if (!source) throw new Error("Source proposal not found");
  if (!source.items.length) throw new Error("Source proposal must have at least one item to duplicate");

  const copiedItems = source.items.map((item, index) => {
    validateProposalItemInput({
      brandId: item.brandId,
      brandNameSnapshot: item.brandNameSnapshot,
      optionGroup: item.optionGroup ?? undefined,
      reference: item.reference,
      description: item.description ?? undefined,
      finish: item.finish ?? undefined,
      quantity: item.quantity,
      originalUnitPrice: item.originalUnitPrice ?? 0,
      calculationRuleId: item.calculationRuleId,
      calculationFactor: item.calculationFactor,
      finalUnitPrice: item.finalUnitPrice,
      lineTotal: item.lineTotal,
      notes: item.notes ?? undefined,
      sortOrder: item.sortOrder ?? index + 1,
    });
    return {
      ...item,
      id: index + 1,
      proposalId: 0,
      sortOrder: item.sortOrder ?? index + 1,
    };
  });
  const id = nextPreviewId(proposals);
  const proposalNumber = nextPreviewProposalNumber(proposals);
  const proposalDate = new Date().toISOString().slice(0, 10);
  const workspaceBasePath = inferPreviewWorkspaceBasePath(source.localFolderPath);
  const localFolderPath = buildProposalFolderPath({
    basePath: workspaceBasePath,
    year: new Date(proposalDate).getFullYear(),
    proposalNumber,
    clientName: source.clientNameSnapshot ?? "client",
    projectName: source.projectName ?? "project",
  });
  const duplicateNote = `Duplicada a partir da proposta ${source.proposalNumber}.`;
  const proposal: ProposalDetail = {
    ...source,
    id,
    proposalNumber,
    title: `Copia de ${source.title}`,
    proposalDate,
    status: "draft",
    localFolderPath,
    totalAmount: calculateProposalTotal(copiedItems),
    notes: source.notes?.trim() ? `${source.notes.trim()}\n${duplicateNote}` : duplicateNote,
    items: copiedItems.map((item) => ({ ...item, proposalId: id })),
  };
  writePreviewProposals([...proposals, proposal]);
  return proposal;
}

export function updateProposal(
  proposalId: number,
  input: UpdateProposalInput,
): Promise<ProposalDetail> {
  validateUpdateProposalInput(input);

  if (isTauriRuntime()) {
    return callTauri<ProposalDetail>("update_proposal", { proposalId, input });
  }

  const proposals = readPreviewProposals();
  const proposal = proposals.find((item) => item.id === proposalId);
  if (!proposal) {
    throw new Error("Proposal not found");
  }
  const pricingRule = previewPricingRules.find((rule) => rule.id === input.pricingRuleId);
  Object.assign(proposal, {
    title: input.title,
    clientNameSnapshot: input.clientNameSnapshot,
    projectName: input.projectName,
    projectLocation: input.projectLocation ?? null,
    proposalDate: input.proposalDate,
    language: input.language,
    currency: input.currency,
    vatMode: input.vatMode,
    validityText: input.validityText ?? null,
    commercialConditions: input.commercialConditions ?? null,
    proposalType: input.proposalType ?? null,
    layoutId: input.layoutId ?? null,
    pricingRuleId: input.pricingRuleId ?? null,
    pricingRuleName: pricingRule?.name ?? proposal.pricingRuleName,
    pricingRuleCode: pricingRule?.code ?? proposal.pricingRuleCode,
    pricingRuleFactor: pricingRule?.factor ?? proposal.pricingRuleFactor,
    pricingRuleRoundingMode: pricingRule?.roundingMode ?? proposal.pricingRuleRoundingMode,
    notes: input.notes ?? null,
  });
  writePreviewProposals(proposals);
  return Promise.resolve(proposal);
}

export function addProposalItem(
  proposalId: number,
  input: CreateProposalItemInput,
): Promise<ProposalItem> {
  validateProposalItemInput(input);

  if (isTauriRuntime()) {
    return callTauri<ProposalItem>("add_proposal_item", { proposalId, input });
  }

  const proposals = readPreviewProposals();
  const proposal = proposals.find((item) => item.id === proposalId);
  if (!proposal) {
    throw new Error("Proposal not found");
  }
  const item = toPreviewItem(input, proposal.items.length + 1);
  proposal.items.push(item);
  proposal.totalAmount = calculateSubtotal(proposal.items);
  writePreviewProposals(proposals);
  return Promise.resolve(item);
}

export function updateProposalItem(
  itemId: number,
  input: UpdateProposalItemInput,
): Promise<ProposalDetail> {
  if (itemId <= 0) throw new Error("Item id must be greater than zero");
  validateProposalItemInput(input);

  if (isTauriRuntime()) {
    return callTauri<ProposalDetail>("update_proposal_item", { itemId, input });
  }

  const proposals = readPreviewProposals();
  const proposal = proposals.find((item) => item.items.some((line) => line.id === itemId));
  if (!proposal) {
    throw new Error("Proposal item not found");
  }
  const index = proposal.items.findIndex((line) => line.id === itemId);
  proposal.items[index] = {
    ...toPreviewItem(input, itemId),
    proposalId: proposal.id,
  };
  proposal.totalAmount = calculateSubtotal(proposal.items);
  writePreviewProposals(proposals);
  return Promise.resolve(proposal);
}

export function deleteProposalItem(itemId: number): Promise<ProposalDetail> {
  if (itemId <= 0) throw new Error("Item id must be greater than zero");

  if (isTauriRuntime()) {
    return callTauri<ProposalDetail>("delete_proposal_item", { itemId });
  }

  const proposals = readPreviewProposals();
  const proposal = proposals.find((item) => item.items.some((line) => line.id === itemId));
  if (!proposal) {
    throw new Error("Proposal item not found");
  }
  if (proposal.items.length <= 1) {
    throw new Error("A proposta deve manter pelo menos um artigo.");
  }
  proposal.items = proposal.items.filter((line) => line.id !== itemId);
  proposal.totalAmount = calculateSubtotal(proposal.items);
  writePreviewProposals(proposals);
  return Promise.resolve(proposal);
}

export function calculateProposalTotal(items: Pick<ProposalItem, "lineTotal">[]): number {
  return calculateSubtotal(items);
}

export function validateCreateProposalInput(input: CreateProposalInput): void {
  if (!input.title.trim()) throw new Error("Proposal title is required");
  if (!input.clientNameSnapshot.trim()) throw new Error("Client name is required");
  if (!input.projectName.trim()) throw new Error("Project name is required");
  if (!input.proposalDate) throw new Error("Proposal date is required");
  if (!input.language.trim()) throw new Error("Language is required");
  if (!input.currency.trim()) throw new Error("Currency is required");
  if (!input.vatMode.trim()) throw new Error("VAT mode is required");
  if (!input.localWorkspacePath.trim()) {
    throw new Error("Local workspace path is required");
  }
  if (!input.items.length) throw new Error("At least one proposal item is required");
  if (input.totalAmount < 0) throw new Error("Proposal total cannot be negative");

  for (const item of input.items) {
    validateProposalItemInput(item);
  }

  const subtotal = calculateProposalTotal(input.items);
  if (Math.abs(subtotal - input.totalAmount) > 0.01) {
    throw new Error("Proposal total must match item subtotal");
  }
}

export function validateUpdateProposalInput(input: UpdateProposalInput): void {
  if (!input.title.trim()) throw new Error("Proposal title is required");
  if (!input.clientNameSnapshot.trim()) throw new Error("Client name is required");
  if (!input.projectName.trim()) throw new Error("Project name is required");
  if (!input.proposalDate) throw new Error("Proposal date is required");
  if (!input.language.trim()) throw new Error("Language is required");
  if (!input.currency.trim()) throw new Error("Currency is required");
  if (!input.vatMode.trim()) throw new Error("VAT mode is required");
}

export function validateProposalItemInput(item: CreateProposalItemInput): void {
  if (!item.brandId || item.brandId <= 0 || !item.brandNameSnapshot?.trim()) {
    throw new Error("Marca do artigo obrigatoria");
  }
  if (!item.reference.trim()) throw new Error("Item reference is required");
  if (item.quantity <= 0) throw new Error("Item quantity must be greater than zero");
  if (item.originalUnitPrice < 0) throw new Error("Original unit price cannot be negative");
  if (item.finalUnitPrice < 0) throw new Error("Final unit price cannot be negative");
  if (item.lineTotal < 0) throw new Error("Line total cannot be negative");

  const validation = validateLineTotal(
    item.finalUnitPrice,
    item.quantity,
    item.lineTotal,
  );
  if (!validation.isValid) {
    throw new Error("Line total must match final unit price times quantity");
  }
}

function toSummary(proposal: ProposalDetail): ProposalSummary {
  return {
    id: proposal.id,
    proposalNumber: proposal.proposalNumber,
    title: proposal.title,
    clientNameSnapshot: proposal.clientNameSnapshot,
    projectName: proposal.projectName,
    proposalDate: proposal.proposalDate,
    status: proposal.status,
    totalAmount: proposal.totalAmount,
  };
}

function toPreviewItem(input: CreateProposalItemInput, id = input.sortOrder): ProposalItem {
  return {
    id,
    proposalId: 0,
    brandId: input.brandId ?? null,
    brandNameSnapshot: input.brandNameSnapshot ?? null,
    optionGroup: input.optionGroup ?? null,
    reference: input.reference,
    description: input.description ?? null,
    finish: input.finish ?? null,
    quantity: input.quantity,
    originalUnitPrice: input.originalUnitPrice,
    calculationRuleId: input.calculationRuleId ?? null,
    calculationFactor: input.calculationFactor ?? null,
    finalUnitPrice: input.finalUnitPrice,
    lineTotal: input.lineTotal,
    technicalSheetUrl: input.technicalSheetUrl ?? null,
    drawing2dUrl: input.drawing2dUrl ?? null,
    model3dUrl: input.model3dUrl ?? null,
    imagePath: input.imagePath ?? null,
    notes: input.notes ?? null,
    sortOrder: input.sortOrder,
  };
}

function readPreviewProposals(): ProposalDetail[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as ProposalDetail[]) : [];
}

function writePreviewProposals(proposals: ProposalDetail[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
}

function nextPreviewId(proposals: ProposalDetail[]): number {
  return proposals.reduce((max, proposal) => Math.max(max, proposal.id), 0) + 1;
}

function nextPreviewProposalNumber(proposals: ProposalDetail[]): string {
  const nextNumber = proposals.reduce((max, proposal) => {
    const match = proposal.proposalNumber.match(/(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;
  return `PREVIEW-${String(nextNumber).padStart(3, "0")}`;
}

function inferPreviewWorkspaceBasePath(localFolderPath: string | null): string {
  if (!localFolderPath) return "C:/ProposalPromptStudio";
  const normalized = localFolderPath.replace(/\\/g, "/");
  const marker = "/proposals/";
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex <= 0) return "C:/ProposalPromptStudio";
  return normalized.slice(0, markerIndex);
}
