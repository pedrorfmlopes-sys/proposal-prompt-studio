import type { GeneratePromptResult, PromptRunDetail } from "../types";
import { buildPromptTitle, generateStructuredPrompt } from "./promptGenerationService";
import { getProposalById } from "./proposalService";
import { callTauri, isTauriRuntime } from "./tauriClient";

const STORAGE_KEY = "proposal-prompt-studio.preview.promptRuns";

export async function generateProposalPrompt(
  proposalId: number,
): Promise<GeneratePromptResult> {
  if (isTauriRuntime()) {
    const promptRun = await callTauri<PromptRunDetail>("generate_proposal_prompt", {
      proposalId,
    });
    const proposal = await getProposalById(proposalId);
    return { promptRun, proposal };
  }

  const proposal = await getProposalById(proposalId);
  if (!proposal) throw new Error("Proposal not found");
  const promptRun: PromptRunDetail = {
    id: nextPromptId(),
    proposalId,
    promptTitle: buildPromptTitle(proposal),
    promptText: generateStructuredPrompt(proposal),
    promptFormat: "markdown",
    generatedAt: new Date().toISOString(),
    copiedAt: null,
    exportedPath: null,
    notes: "Preview mode: stored in localStorage.",
  };
  const runs = readPromptRuns();
  writePromptRuns([...runs, promptRun]);
  return {
    promptRun,
    proposal: { ...proposal, status: "prompt_generated" },
  };
}

export function getPromptRuns(proposalId: number): Promise<PromptRunDetail[]> {
  if (isTauriRuntime()) {
    return callTauri<PromptRunDetail[]>("get_prompt_runs", { proposalId });
  }
  return Promise.resolve(
    readPromptRuns()
      .filter((run) => run.proposalId === proposalId)
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
  );
}

export function getLatestPromptRun(
  proposalId: number,
): Promise<PromptRunDetail | null> {
  if (isTauriRuntime()) {
    return callTauri<PromptRunDetail | null>("get_latest_prompt_run", { proposalId });
  }
  return getPromptRuns(proposalId).then((runs) => runs[0] ?? null);
}

export async function copyPromptToClipboard(promptText: string): Promise<void> {
  await navigator.clipboard.writeText(promptText);
}

function readPromptRuns(): PromptRunDetail[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as PromptRunDetail[]) : [];
}

function writePromptRuns(runs: PromptRunDetail[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

function nextPromptId(): number {
  return readPromptRuns().reduce((max, run) => Math.max(max, run.id), 0) + 1;
}
