# Handoff 007 - File Picker And Open Paths

## Summary

Fase 007 improves file workflow usability in the Tauri desktop app. Users can
choose a final document via file picker, open proposal folders, open
`final-documents/`, open registered final documents, and open exported prompt
files. Web/Vite mode keeps a clear no-filesystem fallback.

## Files Altered

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/capabilities/default.json`
- `src-tauri/src/lib.rs`
- `src-tauri/src/final_document_commands.rs`
- `src/services/fileDialogService.ts`
- `src/services/finalDocumentService.ts`
- `src/ui/App.tsx`
- `scripts/test-services.ts`
- `README.md`
- `docs/HANDOFF_007_FILE_PICKER_OPEN_PATHS.md`

## Plugins And Dependencies

- `@tauri-apps/plugin-dialog`
- `@tauri-apps/plugin-opener`
- `tauri-plugin-dialog`
- `tauri-plugin-opener`

Permissions added:

- `dialog:open`
- `opener:open-path`

## Tauri Commands

- `ensure_final_documents_folder(localFolderPath)`
- `open_path(path)`

The command creates `<proposal.localFolderPath>/final-documents/` and returns
the folder path. `open_path` validates a non-empty existing path and opens it
through `tauri-plugin-opener`, not shell commands. Dialog actions are handled by
the official Tauri dialog plugin.

## Frontend Services

`src/services/fileDialogService.ts` provides:

- `pickFinalDocumentFile()`
- `openPath(path)`
- `openProposalFolder(localFolderPath)`
- `openFinalDocumentsFolder(localFolderPath)`
- `validatePath(path)`

## UI

Proposal detail now includes:

- `Abrir pasta da proposta`;
- `Abrir exportacao` for exported prompts;
- `Escolher ficheiro` in `Documentos finais`;
- `Abrir pasta final-documents`;
- `Abrir` action for each registered final document.

## Web Behavior

Web/Vite mode does not open dialogs, files, or folders. The service throws:

```text
Esta acao so esta disponivel no runtime Tauri.
```

## Tests Executed

```powershell
python scripts/validate-sqlite.py
npm.cmd run test:services
npm.cmd run build
cargo check
npm.cmd run tauri:dev
```

## Limitations

- No internal preview for PDF/Word files.
- No OneDrive sync.
- No upload automation.
- The user still confirms manually that external apps/folders open correctly in
  the desktop environment.

## Next Step

The next phase can add document actions such as reveal-in-folder, remove record,
or richer status refresh after registering final documents.
