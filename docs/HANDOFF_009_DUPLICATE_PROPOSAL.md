# Handoff 009 - Duplicate Proposal

## Summary

Fase 009 adds `Duplicar proposta`, allowing an existing proposal to be reused
as a new draft proposal with a new number, new folder, copied main fields, and
copied item lines.

## Files Altered

- `README.md`
- `docs/HANDOFF_009_DUPLICATE_PROPOSAL.md`
- `scripts/test-services.ts`
- `src-tauri/src/lib.rs`
- `src-tauri/src/proposal_commands.rs`
- `src/services/proposalService.ts`
- `src/ui/App.tsx`

## Tauri Command

- `duplicate_proposal(sourceProposalId)`

The command validates the source id, loads the source proposal, validates all
copied lines, creates a new proposal number, creates a new folder structure,
copies item rows, increments `proposal_next_number`, and returns the duplicated
proposal detail.

## Frontend Service

- `duplicateProposal(sourceProposalId)`

Tauri mode calls the backend command. Web/Vite mode duplicates preview proposals
in `localStorage`.

## UI

The proposal detail view includes `Duplicar proposta`. It uses a simple
`window.confirm` message before duplicating. After success, the UI opens the new
proposal detail and refreshes the proposal list.

## Data Copied

- main proposal metadata;
- client/project snapshots;
- commercial conditions;
- layout/pricing rule references;
- notes, with an automatic duplicate note appended;
- all `proposal_items`;
- totals, validated from copied lines.

## Data Not Copied

- `prompt_runs`;
- exported prompt files;
- `final_documents`;
- `proposal_files`;
- physical files from old proposal folders.

## Decisions Taken

- `database/schema.sql` was inspected and not changed.
- `proposal_versions` was not used in this phase.
- The duplicated proposal always starts as `draft`.
- The title uses `Copia de <original title>`.

## Tests Executed

```powershell
python scripts/validate-sqlite.py
npm.cmd run test:services
npm.cmd run build
cargo check
npm.cmd run tauri:dev
```

TypeScript tests cover fallback duplication with new id, new number, draft
status, copied item lines, preserved total, no prompt/final document copying,
deep-cloned item objects, and invalid line failure.

## Limitations

- No advanced version history.
- No proposal comparison.
- No copying of physical files, prompts, exports, or final documents.
- No editing workflow beyond what already exists.

## Fase 009B - Preserve Technical Item Fields

The duplicate flow now preserves item technical references stored in
`proposal_items`: `technical_sheet_url`, `drawing_2d_url`, `model_3d_url`, and
`image_path`.

The fix keeps the schema unchanged. Rust now reads those columns into
`ProposalItem`, maps them back into `CreateProposalItemInput` during
duplication, and TypeScript preview tests assert that the copied item retains
the same technical links/paths.

Physical technical files are still not copied in this phase; only the stored
references are preserved.

## Next Step

Add editing of existing proposal/item details or an explicit revision workflow
if duplicate proposals need structured version labels.
