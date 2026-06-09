# Handoff 010 - Edit Proposals And Items

## Summary

Fase 010 adds editing for saved proposal metadata and existing proposal item
lines. It also adds item removal with subtotal recalculation and a guard that
prevents a proposal from being left without items.

## Files Altered

- `README.md`
- `docs/HANDOFF_010_EDIT_PROPOSALS_ITEMS.md`
- `scripts/test-services.ts`
- `src-tauri/src/lib.rs`
- `src-tauri/src/models.rs`
- `src-tauri/src/proposal_commands.rs`
- `src/services/proposalItemService.ts`
- `src/services/proposalService.ts`
- `src/styles.css`
- `src/types/index.ts`
- `src/ui/App.tsx`

## Tauri Commands

- `update_proposal(proposalId, input)`
- `update_proposal_item(itemId, input)`
- `delete_proposal_item(itemId)`

`update_proposal_total` already existed and remains available.

## Frontend Services

- `updateProposal(proposalId, input)`
- `updateProposalItem(itemId, input)`
- `deleteProposalItem(itemId)`

Tauri mode calls the Rust commands. Web/Vite mode updates `localStorage`,
recalculates proposal totals locally, and keeps behavior aligned with the
desktop path.

## UI Implemented

The proposal detail view now includes:

- `Editar proposta`;
- editable proposal metadata form;
- `Guardar alteracoes` and `Cancelar`;
- item table actions `Editar` and `Remover`;
- a simple item edit form for quantity, price, rule, text fields, notes, and
  technical links/paths.

## Validations

- required title, client, project, date, language, currency, and VAT mode;
- `quantity > 0`;
- `original_unit_price >= 0`;
- `final_unit_price >= 0`;
- `line_total >= 0`;
- `line_total = final_unit_price * quantity`;
- proposal total recalculated from item lines;
- deleting the last item is blocked with `A proposta deve manter pelo menos um artigo.`;
- physical files are not deleted.

## Tests Executed

```powershell
python scripts/validate-sqlite.py
npm.cmd run test:services
npm.cmd run build
cargo check
npm.cmd run tauri:dev
```

TypeScript service tests cover editing title/client/project, editing quantity,
editing price, recalculating totals, removing a line, blocking removal of the
last line, invalid line rejection, and preserving technical fields when editing.

## Limitations

- No advanced version history.
- No proposal comparison.
- No undo/redo.
- No Excel import or bulk editing.
- No physical file copying/deletion for technical references.
- No Word/PDF generation.

## Next Step

Add an explicit revision/version workflow if edited proposals need structured
change history.
