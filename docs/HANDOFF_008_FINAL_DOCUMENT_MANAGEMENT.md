# Handoff 008 - Final Document Management

## Summary

Fase 008 adds management actions for final documents already registered in the
app. Users can update the version label and remove a document record from the
app without deleting the physical file.

## Files Altered

- `README.md`
- `docs/HANDOFF_008_FINAL_DOCUMENT_MANAGEMENT.md`
- `scripts/test-services.ts`
- `src-tauri/src/final_document_commands.rs`
- `src-tauri/src/lib.rs`
- `src/services/finalDocumentService.ts`
- `src/ui/App.tsx`

## Tauri Commands

- `update_final_document_version(documentId, versionLabel)`
- `remove_final_document_record(documentId)`

Both commands validate `document_id > 0` and document existence. Updating a
blank version label stores `NULL`. Removing a record deletes only the database
row from `final_documents`.

## Frontend Services

- `updateFinalDocumentVersion(documentId, versionLabel)`
- `removeFinalDocumentRecord(documentId)`

Web/Vite fallback updates or removes preview records in `localStorage` only.

## UI

The `Documentos finais` table now includes:

- `Abrir`
- `Editar versao`
- `Remover registo`

`Editar versao` fills the existing version input. `Guardar versao` saves the
label for the selected document and refreshes the list.

## Decisions Taken

- Removing a record does not delete the physical file.
- Removing the last final document does not revert `proposals.status`.
- No schema changes were made.
- No advanced confirmation modal was added in this phase.

## Tests Executed

```powershell
python scripts/validate-sqlite.py
npm.cmd run test:services
npm.cmd run build
cargo check
npm.cmd run tauri:dev
```

TypeScript tests cover fallback update, fallback removal, invalid document id,
blank version label as `null`, and preservation of the file path outside the
list after record removal.

## Limitations

- No physical file deletion.
- No internal document preview.
- No OneDrive sync.
- No advanced version history.

## Next Step

The next phase can add a confirmation modal, reveal-in-folder action, or a more
complete document history if needed.
