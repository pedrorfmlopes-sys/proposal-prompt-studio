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

## Fase 003B - Proposal workflow hardening

### Problem Found

Review found two robustness risks in the initial proposal workflow:

- `create_proposal` committed SQLite changes before trying to create the local
  proposal folder, which could leave a saved proposal without its folder
  structure.
- Backend validation relied too much on SQLite constraints and did not return
  clear errors for all invalid proposal/item values.

### Correction Applied

- Adopted Option A: `create_proposal` now validates input, opens the SQLite
  transaction, resolves the proposal number and local folder path, creates the
  folder structure, and only then inserts/commits the proposal and items.
- Folder creation still uses `create_dir_all`, so it remains idempotent and
  does not delete existing folders.
- Folder names now use safe fallbacks when the proposal number, client name, or
  project name sanitizes to an empty value.
- Frontend/service validation was aligned with backend validation for negative
  prices, negative totals, required metadata, and line-total mismatches.

### Decision On Folder Creation vs SQLite Commit

The chosen approach is to create the folder before inserting and committing the
proposal. If folder creation fails, the command returns an error before any
proposal rows are committed. This avoids the known inconsistent state:

```text
proposal saved in SQLite
folder not created
```

### Reinforced Validations

Backend `validate_proposal_input` now checks:

- title, client, project, proposal date, language, currency, VAT mode, and local
  workspace path are required;
- items cannot be empty;
- proposal total cannot be negative;
- proposal total must match the subtotal within `0.01`.

Backend `validate_item_input` now checks:

- reference is required;
- quantity must be greater than zero;
- original unit price, final unit price, and line total cannot be negative;
- line total must match `round(final_unit_price * quantity, 2)` within `0.01`.

### Tests Executed

```powershell
python scripts/validate-sqlite.py
npm run test:services
npm run build
```

Service tests include negative original price, negative final price, negative
line total, negative proposal total, missing language, proposal total mismatch,
and invalid line total cases.

### Limitations

Rust is still not installed in the current environment, so the Rust/Tauri
commands were not compiled or executed locally. The hardening is covered by
TypeScript service tests and the frontend build; Rust validation should be
compiled once Rust is available.
