# Handoff 002 - App Structure And Service Layer

## Summary

Fase 002 created the initial Tauri + React + TypeScript application structure
for Proposal Prompt Studio. The project now has a small dashboard, typed
frontend services, a Tauri command layer prepared for SQLite, and isolated
calculation, validation, and folder path services.

## Files Created Or Altered

- `.gitignore`
- `README.md`
- `package.json`
- `package-lock.json`
- `index.html`
- `tsconfig.json`
- `vite.config.ts`
- `src/main.tsx`
- `src/ui/App.tsx`
- `src/styles.css`
- `src/types/index.ts`
- `src/services/brandService.ts`
- `src/services/dashboardService.ts`
- `src/services/folderService.ts`
- `src/services/layoutService.ts`
- `src/services/lineTotalService.ts`
- `src/services/priceCalculationService.ts`
- `src/services/pricingRuleService.ts`
- `src/services/settingsService.ts`
- `src/services/tauriClient.ts`
- `scripts/test-services.ts`
- `src-tauri/Cargo.toml`
- `src-tauri/build.rs`
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/db.rs`
- `src-tauri/src/commands.rs`
- `src-tauri/src/folder_service.rs`
- `src-tauri/src/models.rs`
- `docs/HANDOFF_002_APP_STRUCTURE_SERVICES.md`

## Technical Decisions

- Kept the Fase 001 SQLite schema and seed unchanged.
- Used React + TypeScript with Vite for the frontend.
- Added a Tauri v2 backend structure with Rust commands and `rusqlite`.
- The backend initializes the local app data database from
  `database/schema.sql` and `database/seed.sql` when the database does not
  exist yet.
- Kept calculation and validation rules in pure TypeScript so they can be
  tested without launching the desktop shell.
- Division-based commercial rules round up to the next cent in order to satisfy
  the required business example `52.33 / 0.85 = 61.57`.
- Generated build output and local database/runtime files are ignored by Git.

## App Folder Structure

```text
src/
  services/
  types/
  ui/
src-tauri/
  capabilities/
  src/
database/
docs/
scripts/
```

## Services Created

- Settings:
  - `getAllSettings()`
  - `getSetting(key)`
- Brands:
  - `getActiveBrands()`
- Layouts:
  - `getActiveLayouts()`
  - `getDefaultLayout()`
- Pricing rules:
  - `getActivePricingRules()`
  - `getPricingRuleByCode(code)`
- Price calculation:
  - `calculateFinalUnitPrice(input)`
- Line totals:
  - `calculateLineTotal(finalUnitPrice, quantity)`
  - `validateLineTotal(finalUnitPrice, quantity, lineTotal)`
  - `calculateSubtotal(items)`
- Folder paths:
  - `sanitizeFolderName(value)`
  - `buildProposalFolderPath(input)`
  - `buildProposalSubfolderPaths(input)`
- Tauri folder creation command:
  - `createProposalFolderStructure(input)`

## Commands To Run

Install dependencies:

```powershell
npm install
```

Run the web dashboard:

```powershell
npm run dev
```

Run the Tauri desktop app after Rust is installed:

```powershell
npm run tauri:dev
```

## Commands To Test

```powershell
python scripts/validate-sqlite.py
npm run test:services
npm run build
```

## Limitations

- Rust is not installed in the current environment, so the Tauri desktop binary
  was scaffolded but not compiled here.
- In plain Vite browser mode, the dashboard shows preview counts because SQLite
  commands are only available inside the Tauri desktop runtime.
- The dashboard is intentionally minimal and only confirms app startup,
  database initialization, seeded counts, and the `/0.85` calculation.
- No full proposal wizard exists yet.
- No Excel import, prompt generation, upload flow, OneDrive sync, or document
  generation has been implemented.

## Suggested Next Steps

Fase 003 should add the first proposal creation workflow: create a proposal
record, choose client/layout/pricing rule, add proposal items, validate totals,
and create the local proposal folder structure.
