# Handoff 010B - Brand Validation And Prompt Output Mode

## Summary

Fase 010B prevents proposal items from being saved or prompted without an
explicitly selected brand. It also adds a prompt output mode so the generated
prompt can request chat text, Word, PDF, or Word + PDF.

## Files Altered

- `README.md`
- `docs/HANDOFF_010B_BRAND_VALIDATION_OUTPUT_MODE.md`
- `scripts/test-services.ts`
- `src-tauri/src/prompt_commands.rs`
- `src-tauri/src/proposal_commands.rs`
- `src/services/promptGenerationService.ts`
- `src/services/promptRunService.ts`
- `src/services/proposalItemService.ts`
- `src/services/proposalService.ts`
- `src/types/index.ts`
- `src/ui/App.tsx`

## Brand Validation

- Frontend item validation blocks missing, zero, or invalid `brandId`.
- Frontend item validation blocks empty `brandNameSnapshot`.
- Rust item validation blocks missing, non-positive, or empty brand data.
- Prompt generation in TypeScript and Rust aborts if any item has no valid
  brand.
- Editing an item no longer keeps an old brand snapshot when the brand select
  is cleared.

## Prompt Output Mode

The detail view exposes `Resultado pretendido` with:

- `Texto no chat`;
- `Documento Word`;
- `PDF final`;
- `Word + PDF`.

The selected mode is included in `# Resultado pretendido` in both preview and
Tauri-generated prompts. No schema change was made.

## Tests Executed

```powershell
python scripts/validate-sqlite.py
npm.cmd run test:services
npm.cmd run build
cargo check
npm.cmd run tauri:dev
```

## Limitations

- The app does not generate real Word/PDF files internally in this phase.
- Word/PDF creation depends on the capabilities of the chat where the generated
  prompt is executed.
- No catalog validation is performed between brand and reference.

## Next Step

Add a real document generation pipeline if Word/PDF output must be produced
inside Proposal Prompt Studio instead of being requested from another chat.
