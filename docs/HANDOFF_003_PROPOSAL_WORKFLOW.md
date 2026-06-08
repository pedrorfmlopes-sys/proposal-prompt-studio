# Handoff 003 - Proposal Creation Workflow

## Summary

Fase 003 added the first proposal creation workflow. The app now has navigation
between Dashboard, Nova proposta, Propostas guardadas, and a simple proposal
detail view. The frontend can calculate item prices, validate line totals,
calculate proposal subtotals, and save proposals through Tauri commands. In web
preview mode, proposals are stored in `localStorage` so the UI can be inspected
without the Tauri runtime.

## Files Created Or Altered

- `README.md`
- `scripts/test-services.ts`
- `src/styles.css`
- `src/types/index.ts`
- `src/services/previewData.ts`
- `src/services/proposalNumberService.ts`
- `src/services/proposalItemService.ts`
- `src/services/proposalService.ts`
- `src/services/settingsService.ts`
- `src/services/brandService.ts`
- `src/services/layoutService.ts`
- `src/services/pricingRuleService.ts`
- `src/ui/App.tsx`
- `src-tauri/src/lib.rs`
- `src-tauri/src/models.rs`
- `src-tauri/src/folder_service.rs`
- `src-tauri/src/proposal_commands.rs`
- `docs/HANDOFF_003_PROPOSAL_WORKFLOW.md`

## Tauri Commands Implemented

- `create_proposal`
- `get_proposals`
- `get_proposal_by_id`
- `add_proposal_item`
- `get_proposal_items`
- `update_proposal_total`

`create_proposal` validates the input, generates a proposal number when needed,
inserts the proposal and items in a SQLite transaction, increments
`proposal_next_number`, stores `local_folder_path`, and creates the local folder
structure through the existing folder service.

## Frontend Services Implemented

- `proposalNumberService.ts`
  - `suggestNextProposalNumber(settings)`
- `proposalItemService.ts`
  - `calculateProposalItem(...)`
  - `toCreateProposalItemInput(...)`
- `proposalService.ts`
  - `getProposals()`
  - `getProposalById(id)`
  - `createProposal(input)`
  - `addProposalItem(proposalId, input)`
  - `calculateProposalTotal(items)`
  - `validateCreateProposalInput(input)`
  - `validateProposalItemInput(item)`

Existing seed-backed services now return preview data in web mode when Tauri is
not available.

## UI Created

- Dashboard with database state, seeded counts, calculation example, and
  navigation actions.
- Nova proposta form with general data, layout, commercial rule, commercial
  conditions, notes, manual item entry, line calculation, subtotal review, and
  save action.
- Propostas guardadas table with number, client, project, date, status, total,
  and open action.
- Simple proposal detail view with metadata, chosen layout/rule identifiers,
  local folder path, items, and total.

## Tests Executed

```powershell
python scripts/validate-sqlite.py
npm run test:services
npm run build
```

The service tests cover:

- `PROP + 2026 + 1 => PROP-2026-001`
- `PROP + 2026 + 12 => PROP-2026-012`
- `52.33 / 0.85` with `ceil_2_decimals = 61.57`
- `61.57 * 220 = 13545.40`
- subtotal of two lines
- invalid line totals
- proposal input total mismatch validation

## Limitations

- Rust is not installed in the current environment, so `npm run tauri:dev` was
  not executed.
- Real SQLite writes and folder creation require the Tauri runtime.
- Web mode uses localStorage fallback for workflow preview only.
- No prompt generation, file upload, Excel import, OneDrive sync, final
  document upload, or proposal editing workflow was implemented.

## Next Steps

Fase 004 should generate and store the first structured prompt from a saved
proposal, using the selected layout, commercial conditions, items, totals, and
associated metadata.
