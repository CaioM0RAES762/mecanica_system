-- Migration: adiciona cobli_template_id e nome_checklist em checklist_item_weights
-- NULL = regra global; NOT NULL = regra específica do template
-- Registros existentes ficam com NULL (continuam funcionando como regras globais)

ALTER TABLE [dbo].[checklist_item_weights]
  ADD [cobli_template_id] NVARCHAR(200) NULL,
      [nome_checklist]    NVARCHAR(300) NULL;

CREATE INDEX [checklist_item_weights_tpl_idx]
  ON [dbo].[checklist_item_weights]([cobli_template_id], [nome_checklist]);

CREATE INDEX [checklist_item_weights_pattern_tpl_idx]
  ON [dbo].[checklist_item_weights]([field_title_pattern], [cobli_template_id], [nome_checklist]);
