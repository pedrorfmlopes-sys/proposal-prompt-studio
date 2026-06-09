# Handoff 005 - Prompt Export To Files

## Summary

Fase 005 added prompt export support for generated prompts. The Tauri runtime
can export one prompt run at a time to `.md` or `.txt`, place the file inside
the proposal `prompts/` folder, and update `prompt_runs.exported_path`. The web
preview keeps a no-disk fallback message.

## Files Created Or Altered

- `README.md`
- `scripts/test-services.ts`
- `src/types/index.ts`
- `src/ui/App.tsx`
- `src/services/promptRunService.ts`
- `src/services/promptExportService.ts`
- `src-tauri/src/lib.rs`
- `src-tauri/src/prompt_export_commands.rs`
- `docs/HANDOFF_005_PROMPT_EXPORT.md`

## Tauri Commands

- `export_prompt_run(promptRunId, format)`
- `export_latest_prompt_run(proposalId, format)`
- `get_prompt_export_path(promptRunId, format)`

The backend validates prompt id, proposal id where applicable, format,
existence of prompt/proposal, non-empty prompt text, and populated
`local_folder_path`.

## Frontend Services

- `exportPromptRun(promptRunId, format)`
- `exportLatestPromptRun(proposalId, format)`
- `sanitizeFileName(value)`
- `buildPromptExportFileName(promptTitle, date, format)`
- `getPromptExportExtension(format)`

Supported formats:

- `markdown` -> `.md`
- `text` -> `.txt`

## UI

The proposal detail `Prompts geradas` section now includes:

- `Exportar .md`
- `Exportar .txt`

After export, the UI displays the returned path. In web/Vite mode, the path is
a preview message explaining that real disk export is only available in Tauri.

## Export Behavior

Option A was used: one export format per command call. After each successful
export, `prompt_runs.exported_path` stores the most recently exported file path.

The Tauri export writes files under:

```text
<proposal local_folder_path>/prompts/
```

File names are sanitized to avoid invalid Windows filename characters.

## Tests Executed

```powershell
python scripts/validate-sqlite.py
npm run test:services
npm run build
```

TypeScript tests cover filename sanitization, export filename construction,
format-to-extension mapping, and invalid format errors.

## Limitations

- Rust is not installed in the current environment, so Tauri commands were not
  compiled or run locally.
- Rust currently uses a simple UNIX timestamp suffix for export filenames to
  avoid adding a date/time dependency.
- Web/Vite mode does not write real files.
- No Word/PDF export, OneDrive sync, upload flow, or ChatGPT integration was
  implemented.

## Next Step

Fase 006 should add upload/registration of final proposal documents, stored
under each proposal's `final-documents/` folder and tracked in
`final_documents`.
