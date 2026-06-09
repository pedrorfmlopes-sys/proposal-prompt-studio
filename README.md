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
