# Handoff 001 - SQLite Model

## Summary

Fase 001 created the initial local SQLite data model for Proposal Prompt Studio.
The active database is designed to live locally, while OneDrive is reserved for
proposal files, prompt exports, final documents, configuration packages, and
sync/export folders.

## Files Created

- `README.md`
- `database/schema.sql`
- `database/seed.sql`
- `database/.gitignore`
- `scripts/validate-sqlite.py`
- `docs/HANDOFF_001_SQLITE_MODEL.md`

## Technical Decisions

- SQLite is the active local database for V1.
- The live `app.sqlite` file must not be used as a shared OneDrive database by
  multiple users at the same time.
- Runtime database files are ignored by Git through `database/.gitignore`.
- JSON fields are stored as `TEXT` and protected with `json_valid(...)` checks.
- Monetary line totals are validated at database level before insert/update.
- V2 import and versioning tables are present, but not fully functional yet.

## Tables Implemented

- `app_settings`
- `clients`
- `brands`
- `layouts`
- `pricing_rules`
- `proposals`
- `proposal_files`
- `proposal_items`
- `prompt_runs`
- `final_documents`
- `proposal_versions`
- `import_profiles`
- `import_sessions`
- `import_rows`

## Important Constraints, Checks, And Triggers

- Foreign keys connect proposals to clients, layouts, pricing rules, files,
  items, prompt runs, final documents, versions, and import data.
- Status fields use `CHECK` constraints for allowed values.
- Boolean fields use integer `0` or `1` with `CHECK` constraints.
- JSON fields require valid JSON when populated.
- `pricing_rules.factor` is required for factor-based rules and cannot be zero.
- `proposal_items.line_total` must match
  `ROUND(final_unit_price * quantity, 2)` within a tolerance of `0.01`.
- `updated_at` triggers refresh modification timestamps.
- Prompt creation moves draft proposals to `prompt_generated`.
- Final document upload moves proposals to `final_uploaded`.

## Seed Data Included

- 9 app settings.
- 5 brands:
  - FIMA Carlo Frattini
  - AXA / Colavene
  - Ritmonio
  - Nicolazzi
  - Profiltek
- 3 layouts:
  - `technical_summary_tables`
  - `update_existing_pdf`
  - `alternatives_by_brand_option`
- 4 pricing rules:
  - `keep_price`
  - `multiply_by_1_15`
  - `divide_by_0_85`
  - `discount_10_percent`

## Tests Executed

Validation was automated in `scripts/validate-sqlite.py`.

The script checks that:

- `database/schema.sql` loads without errors.
- `database/seed.sql` loads without errors.
- Expected seed counts are present.
- A valid proposal item row is accepted.
- An invalid proposal item row is rejected by the line total trigger.

Command:

```powershell
python scripts/validate-sqlite.py
```

## Limitations And Pending Work

- No UI has been implemented.
- No React, Tauri, or desktop shell has been created.
- Excel import is prepared only at schema level.
- Prompt generation is not implemented.
- Package export/import is not implemented.
- Proposal version comparison is not implemented.

## Suggested Next Step

Fase 002 should define the application structure and first service layer for
creating proposals, calculating item prices, validating totals, and generating
proposal folders locally.
