# Handoff 006 - Final Documents

## Summary

Fase 006 adds manual registration of final proposal documents created outside
the app. In Tauri, the app copies the selected source file into the proposal
`final-documents/` folder, inserts a row in `final_documents`, and relies on
the existing SQLite trigger to move the proposal status to `final_uploaded`.

## Files Created Or Altered

- `README.md`
- `docs/HANDOFF_006_FINAL_DOCUMENTS.md`
- `scripts/test-services.ts`
- `src/types/index.ts`
- `src/services/finalDocumentService.ts`
- `src/ui/App.tsx`
- `src-tauri/src/final_document_commands.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/models.rs`

## Schema

`database/schema.sql` was inspected and not changed. The existing
`final_documents` table has:

- `proposal_id`
- `file_name`
- `file_type`
- `local_path`
- `onedrive_path`
- `version_label`
- `uploaded_at`
- `notes`

The existing trigger `trg_final_documents_status_after_insert` updates
`proposals.status` to `final_uploaded` after insert.

## Tauri Commands

- `register_final_document(proposalId, sourceFilePath, versionLabel)`
- `get_final_documents(proposalId)`
- `get_latest_final_document(proposalId)`

## Frontend Services

- `registerFinalDocument(input)`
- `getFinalDocuments(proposalId)`
- `getLatestFinalDocument(proposalId)`
- `validateRegisterFinalDocumentInput(input)`
- `buildFinalDocumentPreviewRecord(input)`
- `sanitizeFinalDocumentFileName(value)`

## UI

The proposal detail view now includes `Documentos finais` with:

- manual source file path input;
- optional version label input;
- `Registar documento final` button;
- table listing file name, type, version, local path, and OneDrive path.

## Tauri Behavior

The backend validates proposal id, source path, source file existence, file vs
folder, allowed extension, proposal existence, and populated
`local_folder_path`. It creates `<proposal.local_folder_path>/final-documents/`
and copies the source file there.

If the destination file already exists, the backend uses a simple suffix:

```text
Proposta_Final.pdf
Proposta_Final_2.pdf
Proposta_Final_3.pdf
```

## Web Behavior

Web/Vite mode never writes to disk. It stores preview records in `localStorage`
and uses a clear message explaining that real final document registration is
available only in the Tauri runtime.

## Supported File Types

- `pdf`
- `docx`
- `xlsx`
- `md`
- `txt`
- `pptx`
- `png`
- `jpg`
- `jpeg`
- `webp`

## Tests Executed

```powershell
python scripts/validate-sqlite.py
npm.cmd run test:services
npm.cmd run build
cargo check
npm.cmd run tauri:dev
```

TypeScript service tests cover empty input validation, invalid proposal id,
allowed and invalid extensions, filename sanitization, and preview record
construction.

## Limitations

- No file picker was added in this phase.
- No OneDrive sync was implemented.
- No file deletion was implemented.
- Web mode is preview only and does not access the real filesystem.

## Next Step

The next phase can add a file picker or final document preview/open actions,
while keeping OneDrive sync as a separate later workflow.
