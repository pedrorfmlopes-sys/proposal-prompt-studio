# Handoff 004 - Structured Prompt Generation

## Summary

Fase 004 added structured prompt generation from saved proposals. The app can
generate a Markdown prompt, store it in `prompt_runs`, show it in the proposal
detail view, copy it to the clipboard, and list previous prompts for the same
proposal.

## Files Created Or Altered

- `README.md`
- `scripts/test-services.ts`
- `src/types/index.ts`
- `src/styles.css`
- `src/ui/App.tsx`
- `src/services/promptGenerationService.ts`
- `src/services/promptRunService.ts`
- `src/services/proposalService.ts`
- `src-tauri/src/lib.rs`
- `src-tauri/src/models.rs`
- `src-tauri/src/proposal_commands.rs`
- `src-tauri/src/prompt_commands.rs`
- `docs/HANDOFF_004_PROMPT_GENERATION.md`

## Tauri Commands Implemented

- `generate_proposal_prompt`
- `get_prompt_runs`
- `get_latest_prompt_run`
- `get_prompt_run_by_id`

`generate_proposal_prompt` loads the proposal, builds a structured Markdown
prompt, inserts it into `prompt_runs`, and relies on the existing SQLite trigger
to move draft proposals to `prompt_generated`.

## Frontend Services Implemented

- `promptGenerationService.ts`
  - `buildPromptTitle(proposal)`
  - `generateStructuredPrompt(proposal)`
- `promptRunService.ts`
  - `generateProposalPrompt(proposalId)`
  - `getPromptRuns(proposalId)`
  - `getLatestPromptRun(proposalId)`
  - `copyPromptToClipboard(promptText)`

Web/Vite preview mode stores prompt runs in `localStorage`; real persistence is
handled by Tauri/SQLite.

## Prompt Structure

The generated Markdown prompt includes:

- `# Objetivo`
- `# Contexto da proposta`
- `# Dados do cliente e projeto`
- `# Layout a seguir`
- `# Condições comerciais`
- `# Regras de cálculo aplicadas`
- `# Artigos da proposta`
- `# Totais e validações`
- `# Instruções de preservação de layout`
- `# Notas obrigatórias`
- `# Resultado pretendido`
- `# Validações antes de terminar`

The item section uses a Markdown table with brand, group/option, reference,
description, finish, quantity, original price, rule/factor, final price, line
total, and notes.

## Tests Executed

```powershell
python scripts/validate-sqlite.py
npm run test:services
npm run build
```

Prompt-generation tests check that the prompt contains:

- proposal number;
- client and project;
- VAT note;
- item reference;
- original price, final price, and line total;
- total validation instruction;
- instruction not to invent references, images, or links;
- `ceil_2_decimals`;
- the `/0.85` commercial rounding example.

## Limitations

- Rust is not installed in the current environment, so Tauri commands were not
  compiled or run locally.
- Real SQLite prompt persistence requires Tauri runtime.
- No real `.txt` or `.md` export was implemented.
- No prompt editor, file upload, final document upload, Excel import, or
  OneDrive sync was implemented.

## Next Step

Fase 005 should add prompt export to local files, for example `.md` and `.txt`,
inside each proposal folder.

## Fase 004B - Frontend/backend prompt alignment

### Problem Found

Fase 004 introduced two prompt generators:

- TypeScript preview generator in `src/services/promptGenerationService.ts`;
- Rust/Tauri runtime generator in `src-tauri/src/prompt_commands.rs`.

The TypeScript generator was more complete than the Rust generator. This could
make the prompt tested in web preview diverge from the prompt actually saved in
SQLite in the Tauri runtime.

### Correction Applied

- The Rust generator now uses the same main section order as the TypeScript
  generator.
- The Rust `# Totais e validações` section now includes:
  - subtotal calculated from line totals;
  - proposal total;
  - `Validação do total geral: OK/ERRO`;
  - per-line validation entries like
    `- F3121WLX8CR: OK - 61.57 x 220 = 13545.40`.
- The Rust generator now mentions rule name, code, id, factor, and
  `roundingMode`.
- The Rust item table no longer shows `÷ 0` when no factor exists; it shows `-`.
- The Rust prompt keeps explicit instructions not to invent products, links,
  images, or technical sheets, and not to alter prices, quantities, or totals.

### Temporary Dual-Generator Decision

The project still keeps two generators for now. This is acceptable temporarily
because:

- web/Vite preview needs a TypeScript generator;
- Tauri/SQLite runtime needs a Rust generator to persist real prompt runs;
- Rust is not available in the current environment, so a full single-generator
  refactor would be premature.

### Functional Equivalence Rule

Both generators must keep equivalent:

- section order;
- item table columns;
- line-total validation language;
- proposal-total validation language;
- `/0.85` and `ceil_2_decimals` commercial rounding explanation;
- instruction not to confuse multiplying by `1,15` with dividing by `0,85`;
- instruction not to invent references, products, links, images, or technical
  sheets.

### Tests Executed

```powershell
python scripts/validate-sqlite.py
npm run test:services
npm run build
```

TypeScript tests now assert all required prompt sections, line validation,
overall total validation, `ceil_2_decimals`, the `1,15` vs `0,85` warning, and
key static markers in the Rust prompt generator.

### Limitations

Rust is still not installed in the current environment, so the Rust generator
was checked heuristically through static tests and not compiled/executed.
