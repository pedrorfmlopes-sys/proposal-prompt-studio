PRAGMA foreign_keys = ON;

INSERT INTO app_settings (key, value, description) VALUES
  ('local_workspace_path', 'C:\Users\Pedro\Documents\ProposalPromptStudio', 'Local workspace root.'),
  ('onedrive_sync_path', 'OneDrive\Proposal Prompt Studio', 'OneDrive export and sync root.'),
  ('default_language', 'pt-PT', 'Default proposal language.'),
  ('default_currency', 'EUR', 'Default proposal currency.'),
  ('default_vat_mode', 'sem_iva', 'Default VAT mode.'),
  ('default_rounding', '2_decimals', 'Default money rounding mode.'),
  ('proposal_series_prefix', 'PROP', 'Proposal number prefix.'),
  ('proposal_series_year', '2026', 'Proposal number year.'),
  ('proposal_next_number', '1', 'Next proposal sequence number.')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  description = excluded.description;

INSERT INTO brands (name, display_name, supplier_name, is_active) VALUES
  ('FIMA Carlo Frattini', 'FIMA Carlo Frattini', 'FIMA Carlo Frattini', 1),
  ('AXA / Colavene', 'AXA / Colavene', 'AXA / Colavene', 1),
  ('Ritmonio', 'Ritmonio', 'Ritmonio', 1),
  ('Nicolazzi', 'Nicolazzi', 'Nicolazzi', 1),
  ('Profiltek', 'Profiltek', 'Profiltek', 1)
ON CONFLICT(name) DO UPDATE SET
  display_name = excluded.display_name,
  supplier_name = excluded.supplier_name,
  is_active = excluded.is_active;

INSERT INTO layouts (
  name,
  code,
  description,
  proposal_type,
  structure_json,
  prompt_instructions,
  is_default,
  is_active
) VALUES
  (
    'Technical summary with tables',
    'technical_summary_tables',
    'Technical proposal with an initial summary and item tables.',
    'technical',
    json('{
      "sections": [
        "header",
        "proposal_summary",
        "commercial_conditions",
        "items_by_brand_or_option",
        "technical_description",
        "final_notes"
      ],
      "table_columns": [
        "image",
        "reference",
        "description",
        "finish",
        "quantity",
        "unit_price",
        "line_total",
        "technical_links"
      ],
      "required_notes": [
        "Aos valores apresentados acresce IVA a taxa legal em vigor."
      ]
    }'),
    'Generate a clear technical proposal with a concise summary and organized tables.',
    1,
    1
  ),
  (
    'Update existing PDF',
    'update_existing_pdf',
    'Update an existing proposal while preserving the original structure.',
    'update',
    json('{
      "sections": [
        "existing_structure",
        "updated_items",
        "commercial_conditions",
        "final_notes"
      ],
      "required_notes": [
        "Preservar a estrutura da proposta anterior sempre que possivel."
      ]
    }'),
    'Use the uploaded base PDF as the reference structure and only change the requested content.',
    0,
    1
  ),
  (
    'Alternatives by brand or option',
    'alternatives_by_brand_option',
    'Proposal grouped by alternative brand or option.',
    'alternatives',
    json('{
      "sections": [
        "header",
        "proposal_summary",
        "options_overview",
        "items_by_brand_or_option",
        "comparison_notes",
        "commercial_conditions",
        "final_notes"
      ],
      "table_columns": [
        "option_group",
        "brand",
        "reference",
        "description",
        "finish",
        "quantity",
        "unit_price",
        "line_total",
        "technical_links"
      ]
    }'),
    'Present alternatives in clearly separated groups so the client can compare options.',
    0,
    1
  )
ON CONFLICT(code) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  proposal_type = excluded.proposal_type,
  structure_json = excluded.structure_json,
  prompt_instructions = excluded.prompt_instructions,
  is_default = excluded.is_default,
  is_active = excluded.is_active;

INSERT INTO pricing_rules (
  name,
  code,
  type,
  factor,
  rounding_mode,
  description,
  example_input,
  example_output,
  formula_text,
  is_active
) VALUES
  (
    'Keep price',
    'keep_price',
    'keep_price',
    NULL,
    '2_decimals',
    'Keep the original price unchanged.',
    '52.33',
    '52.33',
    'final price = original price',
    1
  ),
  (
    'Multiply by 1.15',
    'multiply_by_1_15',
    'multiply',
    1.15,
    '2_decimals',
    'Multiply the original price by 1.15.',
    '52.33',
    '60.18',
    'final price = original price * 1.15',
    1
  ),
  (
    'Divide by 0.85',
    'divide_by_0_85',
    'divide',
    0.85,
    '2_decimals',
    'Divide the original price by 0.85.',
    '52.33',
    '61.57',
    'final price = original price / 0.85',
    1
  ),
  (
    'Discount 10 percent',
    'discount_10_percent',
    'discount',
    0.90,
    '2_decimals',
    'Apply a 10 percent discount.',
    '52.33',
    '47.10',
    'final price = original price * 0.90',
    1
  )
ON CONFLICT(code) DO UPDATE SET
  name = excluded.name,
  type = excluded.type,
  factor = excluded.factor,
  rounding_mode = excluded.rounding_mode,
  description = excluded.description,
  example_input = excluded.example_input,
  example_output = excluded.example_output,
  formula_text = excluded.formula_text,
  is_active = excluded.is_active;
