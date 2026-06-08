PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  fiscal_number TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  supplier_name TEXT,
  website_url TEXT,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS layouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  proposal_type TEXT,
  structure_json TEXT NOT NULL CHECK (json_valid(structure_json)),
  prompt_instructions TEXT,
  example_text TEXT,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pricing_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN (
    'keep_price',
    'multiply',
    'divide',
    'discount',
    'margin_division',
    'custom'
  )),
  factor REAL,
  rounding_mode TEXT NOT NULL DEFAULT '2_decimals',
  description TEXT,
  example_input TEXT,
  example_output TEXT,
  formula_text TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    type IN ('keep_price', 'custom')
    OR (factor IS NOT NULL AND factor <> 0)
  )
);

CREATE TABLE IF NOT EXISTS proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  client_id INTEGER,
  client_name_snapshot TEXT,
  project_name TEXT,
  project_location TEXT,
  proposal_date TEXT NOT NULL DEFAULT CURRENT_DATE,
  language TEXT NOT NULL DEFAULT 'pt-PT',
  currency TEXT NOT NULL DEFAULT 'EUR',
  vat_mode TEXT NOT NULL DEFAULT 'sem_iva',
  validity_text TEXT,
  commercial_conditions TEXT,
  proposal_type TEXT,
  layout_id INTEGER,
  pricing_rule_id INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'prompt_generated',
    'sent_to_chatgpt',
    'final_uploaded',
    'archived'
  )),
  local_folder_path TEXT,
  onedrive_folder_path TEXT,
  total_amount REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (layout_id) REFERENCES layouts(id) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (pricing_rule_id) REFERENCES pricing_rules(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS proposal_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN (
    'pdf',
    'excel',
    'image',
    'technical_sheet',
    'catalogue',
    'final_proposal',
    'other'
  )),
  file_role TEXT NOT NULL CHECK (file_role IN (
    'base_pdf',
    'previous_proposal',
    'price_table',
    'product_image',
    'technical_document',
    'catalogue',
    'final_document',
    'support_file'
  )),
  local_path TEXT,
  onedrive_path TEXT,
  description TEXT,
  include_in_prompt INTEGER NOT NULL DEFAULT 1 CHECK (include_in_prompt IN (0, 1)),
  uploaded_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS proposal_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL,
  brand_id INTEGER,
  brand_name_snapshot TEXT,
  option_group TEXT,
  reference TEXT NOT NULL,
  description TEXT,
  finish TEXT,
  quantity REAL NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  original_unit_price REAL CHECK (original_unit_price IS NULL OR original_unit_price >= 0),
  calculation_rule_id INTEGER,
  calculation_factor REAL,
  final_unit_price REAL NOT NULL DEFAULT 0 CHECK (final_unit_price >= 0),
  line_total REAL NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  technical_sheet_url TEXT,
  drawing_2d_url TEXT,
  model_3d_url TEXT,
  image_path TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (calculation_rule_id) REFERENCES pricing_rules(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS prompt_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL,
  prompt_title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  prompt_format TEXT NOT NULL DEFAULT 'markdown' CHECK (prompt_format IN ('plain_text', 'markdown')),
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  copied_at TEXT,
  exported_path TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS final_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  local_path TEXT,
  onedrive_path TEXT,
  version_label TEXT,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS proposal_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  version_label TEXT,
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE (proposal_id, version_number)
);

CREATE TABLE IF NOT EXISTS import_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand_id INTEGER,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'excel',
  mapping_json TEXT NOT NULL CHECK (json_valid(mapping_json)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS import_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER,
  source_file_id INTEGER,
  import_profile_id INTEGER,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN (
    'uploaded',
    'mapped',
    'validated',
    'imported',
    'failed'
  )),
  detected_columns_json TEXT CHECK (detected_columns_json IS NULL OR json_valid(detected_columns_json)),
  selected_rows_json TEXT CHECK (selected_rows_json IS NULL OR json_valid(selected_rows_json)),
  imported_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (source_file_id) REFERENCES proposal_files(id) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (import_profile_id) REFERENCES import_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS import_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_session_id INTEGER NOT NULL,
  row_number INTEGER NOT NULL CHECK (row_number > 0),
  raw_json TEXT NOT NULL CHECK (json_valid(raw_json)),
  mapped_json TEXT CHECK (mapped_json IS NULL OR json_valid(mapped_json)),
  selected INTEGER NOT NULL DEFAULT 0 CHECK (selected IN (0, 1)),
  validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN (
    'pending',
    'valid',
    'warning',
    'invalid'
  )),
  validation_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (import_session_id) REFERENCES import_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE (import_session_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_brands_active ON brands(is_active);
CREATE INDEX IF NOT EXISTS idx_layouts_active_default ON layouts(is_active, is_default);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_proposals_client ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_date ON proposals(proposal_date);
CREATE INDEX IF NOT EXISTS idx_proposal_files_proposal ON proposal_files(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal_sort ON proposal_items(proposal_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_prompt_runs_proposal ON prompt_runs(proposal_id);
CREATE INDEX IF NOT EXISTS idx_final_documents_proposal ON final_documents(proposal_id);
CREATE INDEX IF NOT EXISTS idx_import_sessions_proposal ON import_sessions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_import_rows_session_selected ON import_rows(import_session_id, selected);

CREATE TRIGGER IF NOT EXISTS trg_app_settings_updated_at
AFTER UPDATE ON app_settings
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE app_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_clients_updated_at
AFTER UPDATE ON clients
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE clients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_brands_updated_at
AFTER UPDATE ON brands
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE brands SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_layouts_updated_at
AFTER UPDATE ON layouts
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE layouts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_pricing_rules_updated_at
AFTER UPDATE ON pricing_rules
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE pricing_rules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_proposals_updated_at
AFTER UPDATE ON proposals
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE proposals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_proposal_files_updated_at
AFTER UPDATE ON proposal_files
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE proposal_files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_proposal_items_updated_at
AFTER UPDATE ON proposal_items
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE proposal_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_final_documents_updated_at
AFTER UPDATE ON final_documents
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE final_documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_import_profiles_updated_at
AFTER UPDATE ON import_profiles
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE import_profiles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_import_sessions_updated_at
AFTER UPDATE ON import_sessions
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE import_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_import_rows_updated_at
AFTER UPDATE ON import_rows
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE import_rows SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_proposal_items_validate_line_total_insert
BEFORE INSERT ON proposal_items
FOR EACH ROW
WHEN ABS(NEW.line_total - ROUND(NEW.final_unit_price * NEW.quantity, 2)) > 0.01
BEGIN
  SELECT RAISE(ABORT, 'proposal_items.line_total must equal final_unit_price * quantity');
END;

CREATE TRIGGER IF NOT EXISTS trg_proposal_items_validate_line_total_update
BEFORE UPDATE OF quantity, final_unit_price, line_total ON proposal_items
FOR EACH ROW
WHEN ABS(NEW.line_total - ROUND(NEW.final_unit_price * NEW.quantity, 2)) > 0.01
BEGIN
  SELECT RAISE(ABORT, 'proposal_items.line_total must equal final_unit_price * quantity');
END;

CREATE TRIGGER IF NOT EXISTS trg_prompt_runs_status_after_insert
AFTER INSERT ON prompt_runs
FOR EACH ROW
BEGIN
  UPDATE proposals
  SET status = CASE
    WHEN status = 'draft' THEN 'prompt_generated'
    ELSE status
  END
  WHERE id = NEW.proposal_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_final_documents_status_after_insert
AFTER INSERT ON final_documents
FOR EACH ROW
BEGIN
  UPDATE proposals
  SET status = 'final_uploaded'
  WHERE id = NEW.proposal_id;
END;
