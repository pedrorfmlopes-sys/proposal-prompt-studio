# Proposal Prompt Studio

Proposal Prompt Studio is a local tool for preparing proposal prompts,
organizing proposal files, storing proposal metadata, and exporting/syncing
finished material to OneDrive.

The active SQLite database should be kept local. Do not use the live
`app.sqlite` file as a shared OneDrive database for multiple users at the same
time, because sync conflicts can corrupt or fork the working state.

## Files

- `database/schema.sql` defines the V1 tables and V2-ready tables.
- `database/seed.sql` inserts initial app settings, layouts, brands, and pricing rules.
- `database/.gitignore` keeps generated SQLite runtime files out of Git.
- `scripts/validate-sqlite.py` validates the schema, seed data, and critical
  line total trigger.
- `src/` contains the React + TypeScript dashboard and service layer.
- `src-tauri/` contains the Tauri desktop shell and SQLite command layer.

## Install Dependencies

```powershell
npm install
```

If npm reports certificate errors on this Windows environment, run the install
with strict SSL disabled only for that command:

```powershell
$env:npm_config_strict_ssl='false'; npm install
```

The Tauri desktop command also requires Rust to be installed locally.

## Validate SQLite

From the project root:

```powershell
python scripts/validate-sqlite.py
```

The validation script uses only Python standard library modules.

## Test Services

```powershell
npm run test:services
```

This validates the required price calculations, line total validation, subtotal
calculation, proposal numbering, proposal input validation, item calculation,
and proposal folder path helpers.

## Rounding Modes

- `2_decimals`: normal rounding to 2 decimal places.
- `ceil_2_decimals`: commercial rounding up to the next cent.
- `none`: no rounding.

## Run In Development

For the web dashboard shell:

```powershell
npm run dev
```

The web mode uses preview/fallback data when Tauri is not available. It can be
used to inspect the workflow UI, but real SQLite writes and local folder
creation are handled by the Tauri runtime.

For the desktop Tauri app, after installing Rust:

```powershell
npm.cmd run tauri:dev
```

## Tauri Local Setup And Smoke Test

Use `npm.cmd` on Windows to avoid PowerShell script execution blocking:

```powershell
rustc --version
cargo --version
npm.cmd install
npm.cmd run tauri:dev
```

The desktop app uses a local SQLite database in the app data folder. Exported
prompt files are written to each proposal's local folder, under `prompts/`.
OneDrive can store proposal files, configuration packages, and exports, but the
active SQLite database should stay local.

## Proposal Workflow

Use the app navigation to move between:

- `Dashboard`
- `Nova proposta`
- `Propostas guardadas`

In `Nova proposta`, fill the proposal metadata, choose a layout and commercial
rule, add manual items, review totals, and save. In desktop mode, the proposal
is stored in SQLite and the local proposal folder structure is created.

## Generate A Structured Prompt

Open a saved proposal from `Propostas guardadas` and use the `Prompts geradas`
section in the detail view.

- `Gerar prompt` creates a structured Markdown prompt.
- `Ver ultima prompt` loads the latest prompt for that proposal.
- `Copiar prompt` copies the visible prompt to the clipboard.

In desktop/Tauri mode, prompts are saved in SQLite through `prompt_runs` and the
existing trigger updates draft proposals to `prompt_generated`. In web/Vite
preview mode, prompts are stored in `localStorage`.

Prompt generation exists in both TypeScript preview mode and Rust/Tauri runtime.
Both generators must keep the same section order, validation rules, commercial
rounding language, and "do not invent data" instructions.

## Export Prompts

In a proposal detail view, generate or select a visible prompt and use:

- `Exportar .md`
- `Exportar .txt`

Desktop/Tauri mode writes the file to the proposal folder under `prompts/`,
returns the real exported path from the write operation, and updates
`prompt_runs.exported_path`. Web/Vite mode does not write to disk; it returns a
preview message because real export depends on the Tauri runtime.

## Register Final Documents

Final proposals are created outside the app, for example as `.pdf` or `.docx`.
In the proposal detail view, use `Documentos finais` to enter the local file
path and an optional version label.

Desktop/Tauri mode copies the file to:

```text
<proposal local_folder_path>/final-documents/
```

The copy is registered in `final_documents`. If a file with the same name
already exists, the app adds a suffix such as `_2` or `_3` instead of replacing
it silently. Web/Vite mode does not access the real filesystem; it stores a
preview record in `localStorage`.

## File Picker And Opening Files

The desktop/Tauri runtime supports:

- choosing a final document with a file picker;
- opening the proposal folder;
- opening the proposal `final-documents/` folder;
- opening registered final documents;
- opening exported prompt files.

These actions use Tauri plugins and are only available in the desktop runtime.
Web/Vite mode remains preview-only and does not try to open real files or
folders.

## Final Document Management

Registered final documents can have their version label edited from the
proposal detail view. A document record can also be removed from the app.

Removing a record does not delete the physical file from disk. Physical file
deletion is intentionally left for a future phase, if it is ever needed.

## Duplicate Proposals

An existing proposal can be duplicated from the proposal detail view. The new
proposal gets a fresh proposal number, starts as `draft`, copies the general
proposal data and item lines, and creates a new local folder structure.

Generated prompts, exported prompts, proposal files, and final document records
are not copied. The duplicated proposal starts as a clean working version.

## Create The Local Database

If `sqlite3` is installed, run:

```powershell
New-Item -ItemType Directory -Force -Path database
sqlite3 database/app.sqlite ".read database/schema.sql"
sqlite3 database/app.sqlite ".read database/seed.sql"
```

## Suggested Folder Layout

```text
ProposalPromptStudio/
  database/
    app.sqlite
  proposals/
    2026/
      PROP-2026-001_Client_Project/
        input-files/
        prompts/
        final-documents/
        exports/
        config/
```

OneDrive should be used for exported/synchronized proposal folders and config
packages, not for direct concurrent access to the active database.
