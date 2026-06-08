import type {
  CreateProposalInput,
  CreateProposalItemInput,
  ProposalDetail,
  ProposalItem,
  ProposalSummary,
} from "../types";
import { buildProposalFolderPath } from "./folderService";
import { calculateSubtotal, validateLineTotal } from "./lineTotalService";
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
    pricingRuleName: null,
    localFolderPath,
    notes: input.notes ?? null,
    items: input.items.map(toPreviewItem),
  };

  writePreviewProposals([...proposals, proposal]);
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

export function calculateProposalTotal(items: Pick<ProposalItem, "lineTotal">[]): number {
  return calculateSubtotal(items);
}

export function validateCreateProposalInput(input: CreateProposalInput): void {
  if (!input.title.trim()) throw new Error("Proposal title is required");
  if (!input.clientNameSnapshot.trim()) throw new Error("Client name is required");
  if (!input.projectName.trim()) throw new Error("Project name is required");
  if (!input.proposalDate) throw new Error("Proposal date is required");
  if (!input.items.length) throw new Error("At least one proposal item is required");

  for (const item of input.items) {
    validateProposalItemInput(item);
  }

  const subtotal = calculateProposalTotal(input.items);
  if (Math.abs(subtotal - input.totalAmount) > 0.01) {
    throw new Error("Proposal total must match item subtotal");
  }
}

export function validateProposalItemInput(item: CreateProposalItemInput): void {
  if (!item.reference.trim()) throw new Error("Item reference is required");
  if (item.quantity <= 0) throw new Error("Item quantity must be greater than zero");
  if (item.originalUnitPrice < 0) throw new Error("Original unit price cannot be negative");

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
