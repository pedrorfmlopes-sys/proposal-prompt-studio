export interface ProposalFolderInput {
  basePath: string;
  year: number | string;
  proposalNumber: string;
  clientName: string;
  projectName: string;
}

export const PROPOSAL_SUBFOLDERS = [
  "input-files",
  "prompts",
  "final-documents",
  "exports",
  "config",
] as const;

export function sanitizeFolderName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

export function buildProposalFolderPath(input: ProposalFolderInput): string {
  const folderName = [
    input.proposalNumber,
    sanitizeFolderName(input.clientName),
    sanitizeFolderName(input.projectName),
  ]
    .filter(Boolean)
    .join("_");

  return joinPath(input.basePath, "proposals", String(input.year), folderName);
}

export function buildProposalSubfolderPaths(
  input: ProposalFolderInput,
): string[] {
  const root = buildProposalFolderPath(input);
  return PROPOSAL_SUBFOLDERS.map((subfolder) => joinPath(root, subfolder));
}

function joinPath(...parts: string[]): string {
  return parts
    .map((part) => part.replace(/[\\/]+$/g, "").replace(/^[\\/]+/g, ""))
    .filter(Boolean)
    .join("/");
}
